// services/api.ts
import { supabase, isConfigured } from './supabaseClient';
import { ApiResponse, User, ReportType } from '../types';

// Helper response functions
const success = (data?: any, message?: string): ApiResponse => ({ status: 'success', data, message });
const fail = (error: string): ApiResponse => ({ status: 'error', error });

// --- LOCAL STORAGE MOCK HELPERS (Fallback Mode) ---
const mockDb = {
    getUsers: (): User[] => JSON.parse(localStorage.getItem('mock_users') || '[]'),
    saveUsers: (users: User[]) => localStorage.setItem('mock_users', JSON.stringify(users)),
    getLogs: () => JSON.parse(localStorage.getItem('mock_logs') || '[]'),
    saveLog: (log: any) => {
        const logs = JSON.parse(localStorage.getItem('mock_logs') || '[]');
        logs.unshift(log);
        localStorage.setItem('mock_logs', JSON.stringify(logs.slice(0, 50)));
    }
};

// Initialize default admin if empty (Mock Mode)
if (!isConfigured && mockDb.getUsers().length === 0) {
    mockDb.saveUsers([{
        id: 'admin_1',
        email: 'admin@teman.com',
        name: 'Demo Admin',
        role: 'superadmin',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    }]);
}

/**
 * REQUIRED SUPABASE SCHEMA:
 * 1. profiles: (id uuid PK, email text, name text, role text, status text, created_at timestamptz, last_login timestamptz)
 * 2. reports: (id text PK, type text, year int, date date, data jsonb)
 * 3. system_settings: (key text PK, value jsonb)
 * 4. audit_logs: (id bigint PK, user_email text, action text, details text, timestamp timestamptz)
 */

export const api = {

  // --- SUPABASE KEEP ALIVE (HEARTBEAT) ---
  keepAlive: async () => {
    if (!isConfigured) return;
    try {
        // Lakukan query paling ringan untuk "mencuit" database
        const { error } = await supabase.from('profiles').select('id').limit(1).single();
        if (!error) {
            console.log(`[Supabase Keep-Alive] 💓 Jantung sistem berdenyut pada ${new Date().toLocaleTimeString()}`);
        }
    } catch (e) {
        console.warn("[Supabase Keep-Alive] Gagal menyambung ke server.", e);
    }
  },

  // --- 1. AUTHENTICATION ---

  login: async (email: string, password: string): Promise<ApiResponse> => {
    // FALLBACK MODE
    if (!isConfigured) {
        console.warn("Using Local Mock Auth (Supabase not configured)");
        const users = mockDb.getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            if (user.status === 'inactive') return fail("Akaun tidak aktif.");
            return { status: 'success', user };
        }
        return fail("Pengguna tidak ditemui atau salah kata laluan (Mod Demo).");
    }

    // REAL SUPABASE MODE
    try {
      // Timeout Promise Wrapper
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Tamat tempoh sambungan (Timeout). Sila semak internet anda.")), 5000)
      );

      const loginPromise = (async () => {
         const { data, error } = await (supabase.auth as any).signInWithPassword({
            email,
            password,
          });

          if (error) {
            if (error.message.includes('Email not confirmed')) {
                throw new Error("E-mel belum disahkan. Sila semak inbox anda atau matikan 'Confirm Email' di Supabase (Authentication -> Providers -> Email).");
            }
            if (error.message.includes('Email logins are disabled')) {
                throw new Error("Log masuk E-mel dimatikan. Sila aktifkan 'Email Provider' di Supabase Dashboard (Authentication -> Providers).");
            }
            if (error.message.includes('Invalid login credentials')) {
                throw new Error("E-mel atau kata laluan salah.");
            }
            throw error;
          }
          return data;
      })();

      // Race between login and timeout
      const data: any = await Promise.race([loginPromise, timeoutPromise]);
      
      if (!data.user) throw new Error("Tiada data pengguna.");

      // Fetch Profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Check specifically if table is missing during select
      if (profileError && (profileError.code === 'PGRST205' || profileError.message.includes('Could not find the table') || profileError.code === '42P01')) {
          return fail("RALAT KRITIKAL: Database belum disediakan. Sila jalankan skrip SQL di Supabase Dashboard (SQL Editor).");
      }

      // Handle missing profile (Auto-create fallback)
      if (!profile) {
          // Check if first user to assign superadmin
          const { count, error: countError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
          
          if (countError && (countError.code === 'PGRST205' || countError.message.includes('Could not find the table') || countError.code === '42P01')) {
             return fail("RALAT KRITIKAL: Table 'profiles' tiada. Sila jalankan SQL setup.");
          }

          const role = (count === 0) ? 'superadmin' : 'viewer';

          const newProfile = {
             id: data.user.id,
             email: data.user.email,
             name: data.user.user_metadata?.name || 'User',
             role: role,
             status: 'active',
             created_at: new Date().toISOString(),
             last_login: new Date().toISOString()
          };
          
          const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
          
          if (insertError) {
             console.error("Error auto-creating profile during login:", JSON.stringify(insertError));
             if (insertError.code === 'PGRST205' || insertError.code === '42P01' || insertError.message.includes('Could not find the table')) {
                 return fail("RALAT KRITIKAL: Database belum disediakan. Sila jalankan skrip SQL.");
             }
             return fail("Gagal mencipta profil pengguna: " + insertError.message);
          }
          profile = newProfile;
      } else {
          // Update last login
          await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
      }

      if (profile && profile.status === 'inactive') {
          await (supabase.auth as any).signOut();
          return fail('Akaun anda tidak aktif. Sila hubungi admin.');
      }

      return { 
        status: 'success', 
        user: { 
            id: data.user.id,
            email: data.user.email || '', 
            name: profile?.name || 'User',
            role: profile?.role || 'viewer',
            status: profile?.status || 'active'
        } 
      };

    } catch (error: any) {
      console.error("Login error:", error);
      return fail(error.message || "Log masuk gagal.");
    }
  },

  register: async (email: string, password: string, name: string): Promise<ApiResponse> => {
    // FALLBACK MODE
    if (!isConfigured) {
        const users = mockDb.getUsers();
        if (users.find(u => u.email === email)) return fail("E-mel sudah wujud.");
        const newUser: User = { id: `user_${Date.now()}`, email, name, role: 'viewer', status: 'active' };
        users.push(newUser);
        mockDb.saveUsers(users);
        return { status: 'success', user: newUser };
    }

    // REAL SUPABASE MODE
    try {
      const { data, error } = await (supabase.auth as any).signUp({
        email,
        password,
        options: { data: { name } }
      });

      if (error) {
         if (error.message.includes('Email logins are disabled')) {
             return fail("Pendaftaran E-mel dimatikan. Sila aktifkan 'Email Provider' di Supabase Dashboard (Authentication -> Providers).");
         }
         throw error;
      }

      if (data.user) {
          let userProfile = {
              id: data.user.id,
              email: email,
              name: name,
              role: 'viewer', // Default
              status: 'active'
          };

          // Only attempt to insert profile if we have an active session (authenticated)
          // If email confirmation is ON, session might be null here
          if (data.session) {
             // Check if first user to assign superadmin
             const { count, error: countError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
             
             if (countError && (countError.code === 'PGRST205' || countError.code === '42P01')) {
                 // Do not fail register, but warn in console. Login will catch this later.
                 console.warn("Table profiles not found during register.");
             } else {
                const role = (count === 0) ? 'superadmin' : 'viewer';

                const newProfile = {
                        id: data.user.id,
                        email: email,
                        name: name,
                        role: role,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        last_login: new Date().toISOString()
                };

                const { error: profileError } = await supabase.from('profiles').insert([newProfile]);
                if (profileError) {
                    console.error("Error creating profile during register:", JSON.stringify(profileError));
                } else {
                    userProfile = { ...userProfile, role: role } as any;
                }
             }
          }

          if (!data.session) {
              return fail("Pendaftaran berjaya! Sila semak e-mel anda untuk pengesahan sebelum log masuk.");
          }

          return { status: 'success', user: userProfile as User };
      }
      return fail("Pendaftaran berjaya, sila semak e-mel untuk pengesahan.");
    } catch (error: any) {
      return fail(error.message);
    }
  },

  resetPassword: async (email: string): Promise<ApiResponse> => {
    if (!isConfigured) return success(null, '(Mod Demo) Pautan simulasi dihantar.');
    try {
      const { error } = await (supabase.auth as any).resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/#/reset-password',
      });
      if (error) throw error;
      return success(null, 'Pautan set semula kata laluan telah dihantar.');
    } catch (error: any) {
      return fail(error.message);
    }
  },

  updatePassword: async (token: string, newPassword: string): Promise<ApiResponse> => {
    if (!isConfigured) return success(null, '(Mod Demo) Kata laluan dikemaskini.');
    try {
        const { error } = await (supabase.auth as any).updateUser({ password: newPassword });
        if (error) throw error;
        return success(null, 'Kata laluan berjaya dikemaskini.');
    } catch (error: any) {
        return fail(error.message);
    }
  },

  // --- 2. USER MANAGEMENT ---

  getAllUsers: async (): Promise<ApiResponse> => {
    if (!isConfigured) return { status: 'success', users: mockDb.getUsers() };
    
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { status: 'success', users: data as User[] };
    } catch (error: any) {
      return fail(error.message);
    }
  },

  updateUserRole: async (userId: string, newRole: string, adminEmail: string, targetEmail?: string): Promise<ApiResponse> => {
    if (!isConfigured) {
        const users = mockDb.getUsers();
        mockDb.saveUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
        return success();
    }
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      return success();
    } catch (error: any) {
      return fail(error.message);
    }
  },

  updateUserStatus: async (userId: string, status: string, adminEmail: string): Promise<ApiResponse> => {
    if (!isConfigured) {
        const users = mockDb.getUsers();
        mockDb.saveUsers(users.map(u => u.id === userId ? { ...u, status: status as any } : u));
        return success();
    }
    try {
      const { error } = await supabase.from('profiles').update({ status: status }).eq('id', userId);
      if (error) throw error;
      return success();
    } catch (error: any) {
      return fail(error.message);
    }
  },

  deleteUser: async (userId: string, adminEmail: string): Promise<ApiResponse> => {
    if (!isConfigured) {
        const users = mockDb.getUsers();
        mockDb.saveUsers(users.filter(u => u.id !== userId));
        return success();
    }
    try {
      // Deleting profile only. Auth user deletion requires Service Role key (backend).
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      return success(null, 'Profil pengguna dipadam.');
    } catch (error: any) {
      return fail(error.message);
    }
  },

  getAdminStats: async (): Promise<ApiResponse> => {
    if (!isConfigured) {
        const users = mockDb.getUsers();
        return {
            status: 'success',
            stats: {
                totalUsers: users.length,
                activeUsers: users.filter(u => u.status === 'active').length,
                totalAdmins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
                pendingUsers: 0
            }
        };
    }
    try {
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: activeUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: totalAdmins } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['admin', 'superadmin']);

      return {
          status: 'success',
          stats: {
              totalUsers: totalUsers || 0,
              activeUsers: activeUsers || 0,
              totalAdmins: totalAdmins || 0,
              pendingUsers: 0
          }
      }
    } catch (error) {
      return fail("Gagal mendapatkan statistik.");
    }
  },

  // --- 3. SYSTEM SETTINGS ---

  getSystemSettings: async (): Promise<ApiResponse> => {
    if (!isConfigured) {
        const local = localStorage.getItem('system_settings');
        if (local) return { status: 'success', settings: JSON.parse(local) };
        return { 
            status: 'success', 
            settings: { activeYear: 2025, maintenanceMode: false, availableYears: [{ year: 2025, isActive: true, createdAt: '', createdBy: '' }] } 
        };
    }
    try {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'config').single();
      if (data) {
        return { status: 'success', settings: data.value };
      }
      return { 
          status: 'success', 
          settings: {
            activeYear: new Date().getFullYear(),
            maintenanceMode: false,
            availableYears: [{ year: 2025, isActive: true, createdAt: new Date().toISOString(), createdBy: 'System' }]
          } 
      };
    } catch (error: any) {
      return fail(error.message);
    }
  },

  addYear: async (year: number, adminEmail: string): Promise<ApiResponse> => {
      const settingsRes = await api.getSystemSettings();
      const settings = settingsRes.settings!;
      const newEntry = { year, isActive: false, createdAt: new Date().toISOString(), createdBy: adminEmail };
      const newSettings = { ...settings, availableYears: [...(settings.availableYears || []), newEntry] };

      if (!isConfigured) {
          localStorage.setItem('system_settings', JSON.stringify(newSettings));
          return success(null, `Tahun ${year} ditambah (Local).`);
      }
      await supabase.from('system_settings').upsert({ key: 'config', value: newSettings });
      return success(null, `Tahun ${year} ditambah.`);
  },

  setActiveYear: async (year: number, adminEmail: string): Promise<ApiResponse> => {
    const settingsRes = await api.getSystemSettings();
    const settings = settingsRes.settings!;
    const newYears = settings.availableYears.map((y: any) => ({ ...y, isActive: y.year === year }));
    const newSettings = { ...settings, activeYear: year, availableYears: newYears };

    if (!isConfigured) {
        localStorage.setItem('system_settings', JSON.stringify(newSettings));
        return success(null, `Tahun aktif: ${year} (Local).`);
    }
    await supabase.from('system_settings').upsert({ key: 'config', value: newSettings });
    return success(null, `Tahun aktif: ${year}.`);
  },

  toggleMaintenance: async (enabled: boolean, adminEmail: string): Promise<ApiResponse> => {
    const settingsRes = await api.getSystemSettings();
    const newSettings = { ...settingsRes.settings!, maintenanceMode: enabled };

    if (!isConfigured) {
        localStorage.setItem('system_settings', JSON.stringify(newSettings));
        return success();
    }
    await supabase.from('system_settings').upsert({ key: 'config', value: newSettings });
    return success();
  },

  // --- 4. DATA CRUD (REPORTS) ---

  getData: async (type: ReportType, year: number | string, date?: string) => {
    let docId = String(year);
    if (type === 'daily' && date) docId = date;
    const reportId = `${type}_${docId}`;

    if (isConfigured) {
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('data')
                .eq('id', reportId)
                .single();
            
            if (data) {
                // Cache to local for performance
                const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
                localStorage.setItem(localKey, JSON.stringify(data.data));
                return data.data;
            }
        } catch (e) {
            console.error("Cloud fetch failed, using local fallback", e);
        }
    }
    
    // Local Fallback
    const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
    const local = localStorage.getItem(localKey);
    return local ? JSON.parse(local) : null;
  },

  saveData: async (type: ReportType, year: number | string, data: any, date?: string) => {
    let docId = String(year);
    if (type === 'daily' && date) docId = date;
    const reportId = `${type}_${docId}`;

    // Always Save Local First (Optimistic UI)
    const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
    localStorage.setItem(localKey, JSON.stringify(data));

    if (isConfigured) {
        try {
            await supabase.from('reports').upsert({
                id: reportId,
                type: type,
                year: Number(year),
                date: date || null,
                data: data
            });
        } catch (error) {
            console.error("Supabase Save Error:", error);
        }
    }
    return true;
  },

  deleteData: async (type: ReportType, year: number | string, date?: string) => {
    if (isConfigured) {
        let docId = String(year);
        if (type === 'daily' && date) docId = date;
        const reportId = `${type}_${docId}`;
        try {
            await supabase.from('reports').delete().eq('id', reportId);
        } catch (e) { return false; }
    }
    return true;
  },

  // --- 5. AUDIT & UTILITIES ---

  logActivity: async (userEmail: string, action: string, details: string) => {
      const logData = { timestamp: new Date().toISOString(), user_email: userEmail, action, details };
      
      // Local Log
      mockDb.saveLog({ ...logData, user: userEmail });

      if (isConfigured) {
          try {
              await supabase.from('audit_logs').insert([logData]);
          } catch (e) { console.error("Audit Cloud Error", e); }
      }
  },

  getAuditLogs: async (): Promise<any[]> => {
      if (!isConfigured) return mockDb.getLogs();

      try {
          const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(50);
          
          if (error) throw error;
          
          return data.map((log: any) => ({
              ...log,
              user: log.user_email
          }));
      } catch (e) {
          return mockDb.getLogs();
      }
  },

  exportTableToCSV: (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(cell => {
          if (cell === null || cell === undefined) return '""';
          return `"${String(cell).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};