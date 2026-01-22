
// services/api.ts
import { supabase, isConfigured as isSupabaseConfigured } from './supabaseClient';
import { ApiResponse, User, ReportType } from '../types';

// --- KONFIGURASI GOOGLE SHEETS ---
// Masukkan URL Web App dari Google Apps Script Deployment anda di sini
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwcxEIUZhQWOq3eaaahqaC4o3YolPSI9PTveU-Ebg44hd_RsN8zRxcOcLHQ5BQ6iIJekQ/exec'; 

// Tukar kepada 'true' jika anda sudah setup Google Sheet dan ingin menggunakannya
const USE_GOOGLE_SHEETS = true; 

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
if (!isSupabaseConfigured && mockDb.getUsers().length === 0) {
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

export const api = {

  keepAlive: async () => {
    // Keep alive function
    if (USE_GOOGLE_SHEETS) {
        // Optional: Ping sheet lightly if needed, but usually not required for GAS web app
    } else if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('profiles').select('id').limit(1).single();
        } catch (e) { }
    }
  },

  // Fungsi baru untuk menyemak status sambungan
  checkConnection: async (): Promise<boolean> => {
      // 1. Check Google Sheets (Priority)
      if (USE_GOOGLE_SHEETS) {
          try {
              // Hantar parameter 'ping' ringkas untuk elak load data besar
              const res = await api.callScript({ check: 'ping' }, 'GET');
              // Jika status success, bermakna script respons
              return res && res.status === 'success';
          } catch (e) {
              console.error("Google Sheet Check Failed:", e);
              return false;
          }
      }
      
      // 2. Check Supabase (Fallback)
      if (isSupabaseConfigured) {
          try {
              const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
              return !error;
          } catch (e) { 
              return false; 
          }
      }

      // 3. Jika tiada cloud config, anggap demo mode (return false supaya UI tunjuk status sebenar atau handle 'demo' di UI)
      return false;
  },

  // --- GOOGLE SHEETS HELPER ---
  callScript: async (payload: any = {}, method: 'GET' | 'POST' = 'POST') => {
      if (!USE_GOOGLE_SHEETS || GOOGLE_SCRIPT_URL.includes('MASUKKAN_URL')) return null;
      
      try {
          // Apps Script Web Apps often handle POST requests better for data transmission to avoid URL length limits
          // For GET requests, we can pass params in URL, but here we standardize on POST for simplicity or fetch via URL for GET.
          
          let response;
          if (method === 'GET') {
             const queryString = new URLSearchParams(payload).toString();
             response = await fetch(`${GOOGLE_SCRIPT_URL}?${queryString}`);
          } else {
             // Use 'no-cors' mode cautiously, but typically for GAS JSON return we need standard CORS or a proxy.
             // GAS 'ContentService' usually handles CORS if 'Who has access: Anyone' is set.
             response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                // Google Apps Script requires text/plain to avoid preflight OPTIONS check issues in some cases
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
             });
          }

          const json = await response.json();
          return json;
      } catch (error) {
          console.error("Google Sheet API Error:", error);
          throw error; // Throw error supaya checkConnection boleh tangkap
      }
  },

  // --- 1. AUTHENTICATION ---
  // (Auth dikekalkan menggunakan Supabase / Local Mock kerana Google Sheets bukan Auth Provider yang selamat)
  
  login: async (email: string, password: string): Promise<ApiResponse> => {
    // Demo Bypass
    if (email === 'admin@teman.com' && password === 'password') {
        return {
            status: 'success',
            user: { id: 'dev_admin', email, name: 'System Admin', role: 'superadmin', status: 'active' }
        };
    }

    if (!isSupabaseConfigured) {
        const users = mockDb.getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            if (user.status === 'inactive') return fail("Akaun tidak aktif.");
            return { status: 'success', user };
        }
        return fail("Pengguna tidak ditemui (Mod Demo).");
    }

    // Real Supabase Login
    try {
         const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password });
         if (error) throw error;
         
         // Fetch profile logic omitted for brevity, assumes standard Supabase flow
         return { status: 'success', user: { id: data.user.id, email: data.user.email!, name: 'User', role: 'user', status: 'active' } };
    } catch (e: any) {
        return fail(e.message);
    }
  },

  register: async (email: string, password: string, name: string): Promise<ApiResponse> => {
      // Registration logic (Standard Supabase / Local)
      if (!isSupabaseConfigured) {
          const users = mockDb.getUsers();
          if (users.find(u => u.email === email)) return fail("E-mel wujud.");
          const newUser: User = { id: `u_${Date.now()}`, email, name, role: 'viewer', status: 'active' };
          users.push(newUser);
          mockDb.saveUsers(users);
          return { status: 'success', user: newUser };
      }
      return fail("Sila hubungi admin untuk pendaftaran database sebenar.");
  },

  resetPassword: async (email: string) => success(null, 'Link dihantar (Simulasi)'),
  updatePassword: async (t: string, p: string) => success(null, 'Berjaya'),

  // --- 2. USER MANAGEMENT ---
  getAllUsers: async () => success(mockDb.getUsers()), // Simplified for now
  updateUserRole: async (userId: string, role: string, adminEmail: string, targetEmail?: string) => success(),
  updateUserStatus: async (userId: string, status: string, adminEmail: string) => success(),
  deleteUser: async (userId: string, adminEmail: string) => success(),
  getAdminStats: async () => success({ totalUsers: 5, activeUsers: 5, totalAdmins: 1, pendingUsers: 0 }),

  // --- 3. SYSTEM SETTINGS ---
  getSystemSettings: async () => success({ activeYear: 2025, maintenanceMode: false, availableYears: [] }),
  addYear: async (year: number, adminEmail: string) => success(),
  setActiveYear: async (year: number, adminEmail: string) => success(),
  toggleMaintenance: async (enabled: boolean, adminEmail: string) => success(),

  // --- 4. DATA CRUD (REPORTS - HYBRID: GOOGLE SHEETS / SUPABASE / LOCAL) ---

  getData: async (type: ReportType, year: number | string, date?: string) => {
    let docId = String(year);
    if (type === 'daily' && date) docId = date;
    
    // Construct unique ID for DB lookup
    const reportId = `${type}_${docId}`; 

    // A. Cuba Google Sheets dahulu jika diaktifkan
    if (USE_GOOGLE_SHEETS) {
        try {
            console.log(`Fetching from Sheet: ${reportId}`);
            const sheetRes = await api.callScript({ id: reportId }, 'GET');
            if (sheetRes && sheetRes.status === 'success' && sheetRes.data) {
                // Cache to local for speed next time
                const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
                localStorage.setItem(localKey, JSON.stringify(sheetRes.data));
                return sheetRes.data;
            }
        } catch (e) {
            console.warn("Sheet fetch failed", e);
        }
    }

    // B. Supabase Fallback
    if (isSupabaseConfigured) {
        try {
            const { data } = await supabase.from('reports').select('data').eq('id', reportId).single();
            if (data) {
                const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
                localStorage.setItem(localKey, JSON.stringify(data.data));
                return data.data;
            }
        } catch (e) {}
    }
    
    // C. Local Storage Fallback (Terakhir)
    const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
    const local = localStorage.getItem(localKey);
    return local ? JSON.parse(local) : null;
  },

  saveData: async (type: ReportType, year: number | string, data: any, date?: string) => {
    let docId = String(year);
    if (type === 'daily' && date) docId = date;
    const reportId = `${type}_${docId}`;

    // 1. Simpan Local (Optimistic)
    const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
    localStorage.setItem(localKey, JSON.stringify(data));

    // 2. Simpan ke Google Sheets
    if (USE_GOOGLE_SHEETS) {
        // Send payload: { action: 'SAVE', id, type, year, data }
        api.callScript({
            action: 'SAVE',
            id: reportId,
            type: type,
            year: Number(year),
            data: data
        }).then(res => console.log("Sheet Save Result:", res));
    }

    // 3. Simpan ke Supabase (Backup/Primary jika Sheets off)
    if (isSupabaseConfigured) {
        supabase.from('reports').upsert({
            id: reportId,
            type: type,
            year: Number(year),
            date: date || null,
            data: data
        }).then(({ error }) => {
            if (error) console.error("Supabase Save Error", error);
        });
    }
    return true;
  },

  deleteData: async () => true,

  // --- 5. UTILS ---
  logActivity: async (email: string, action: string, details: string) => {
      const log = {
          timestamp: new Date().toISOString(),
          user: email,
          action,
          details
      };
      mockDb.saveLog(log);
      return success();
  }, 
  getAuditLogs: async () => {
      return mockDb.getLogs();
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
