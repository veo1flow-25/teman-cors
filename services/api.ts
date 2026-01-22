
// services/api.ts
import { supabase, isConfigured as isSupabaseConfigured } from './supabaseClient';
import { ApiResponse, User, ReportType } from '../types';

// --- KONFIGURASI GOOGLE SHEETS ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwcxEIUZhQWOq3eaaahqaC4o3YolPSI9PTveU-Ebg44hd_RsN8zRxcOcLHQ5BQ6iIJekQ/exec'; 
const USE_GOOGLE_SHEETS = true; 

// Helper response functions
const success = (data?: any, message?: string): ApiResponse => ({ status: 'success', data, message });
const fail = (error: string): ApiResponse => ({ status: 'error', error });

// --- UTILITY: SHA-256 HASHING ---
// Kita hash password di client-side supaya Google Sheet admin tidak nampak password sebenar.
async function hashPassword(password: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

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

  keepAlive: async () => {},

  checkConnection: async (): Promise<boolean> => {
      if (USE_GOOGLE_SHEETS) {
          try {
              const res = await api.callScript({ check: 'ping' }, 'GET');
              return res && res.status === 'success';
          } catch (e) {
              return false;
          }
      }
      return false;
  },

  callScript: async (payload: any = {}, method: 'GET' | 'POST' = 'POST') => {
      if (!USE_GOOGLE_SHEETS || GOOGLE_SCRIPT_URL.includes('MASUKKAN_URL')) return null;
      
      try {
          let response;
          if (method === 'GET') {
             const queryString = new URLSearchParams(payload).toString();
             response = await fetch(`${GOOGLE_SCRIPT_URL}?${queryString}`);
          } else {
             response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
             });
          }
          const json = await response.json();
          return json;
      } catch (error) {
          console.error("Google Sheet API Error:", error);
          throw error;
      }
  },

  // --- 1. AUTHENTICATION ---
  
  login: async (email: string, password: string): Promise<ApiResponse> => {
    // 1. Google Sheets Auth
    if (USE_GOOGLE_SHEETS) {
        try {
            const password_hash = await hashPassword(password);
            const res = await api.callScript({ 
                action: 'LOGIN', 
                email, 
                password_hash 
            });
            
            if (res.status === 'success') {
                return { status: 'success', user: res.user };
            } else {
                return fail(res.message || 'Log masuk gagal');
            }
        } catch (e) {
            return fail("Ralat rangkaian ke Google Sheet");
        }
    }

    // 2. Mock / Demo Fallback
    const users = mockDb.getUsers();
    const user = users.find(u => u.email === email);
    // Demo bypass
    if (email === 'admin@teman.com' && password === 'password') {
         return { status: 'success', user: { id: 'dev_admin', email, name: 'System Admin', role: 'superadmin', status: 'active' } };
    }
    if (user) {
        if (user.status === 'inactive') return fail("Akaun tidak aktif.");
        return { status: 'success', user };
    }
    return fail("Pengguna tidak ditemui (Mod Demo).");
  },

  register: async (email: string, password: string, name: string): Promise<ApiResponse> => {
      if (USE_GOOGLE_SHEETS) {
          try {
              const password_hash = await hashPassword(password);
              const res = await api.callScript({
                  action: 'REGISTER',
                  email,
                  password_hash,
                  name
              });
              
              if (res.status === 'success') {
                  return { status: 'success', user: res.user };
              } else {
                  return fail(res.message || 'Pendaftaran gagal');
              }
          } catch (e) {
              return fail("Ralat rangkaian pendaftaran");
          }
      }

      const users = mockDb.getUsers();
      if (users.find(u => u.email === email)) return fail("E-mel wujud.");
      const newUser: User = { id: `u_${Date.now()}`, email, name, role: 'viewer', status: 'active' };
      users.push(newUser);
      mockDb.saveUsers(users);
      return { status: 'success', user: newUser };
  },

  resetPassword: async (email: string) => {
      if (USE_GOOGLE_SHEETS) {
          try {
              // Construct Dynamic URL
              // Ini memastikan pautan e-mel sentiasa betul, sama ada di localhost atau production
              const currentBaseUrl = window.location.href.split('#')[0]; 
              const resetLink = `${currentBaseUrl}#/reset-password`;

              const res = await api.callScript({ 
                  action: 'RESET_REQUEST', 
                  email, 
                  resetLink // Hantar URL ini ke Google Script
              });
              return res || fail('Tiada respons server');
          } catch (e: any) {
              return fail(e.message || 'Ralat sambungan script');
          }
      }
      return success(null, 'Link dihantar (Simulasi)');
  },

  confirmResetPassword: async (email: string, token: string, newPassword: string) => {
       if (USE_GOOGLE_SHEETS) {
           const new_password_hash = await hashPassword(newPassword);
           const res = await api.callScript({ 
               action: 'RESET_CONFIRM', 
               email, 
               token, 
               new_password_hash 
           });
           return res || fail('Tiada respons server');
       }
       return success(null, 'Berjaya (Simulasi)');
  },

  // Dummy placeholder for interface compatibility if needed
  updatePassword: async (token: string, p: string) => success(),

  // --- 2. USER MANAGEMENT ---
  getAllUsers: async (): Promise<ApiResponse> => {
      if (USE_GOOGLE_SHEETS) {
          // Fetch users from sheet via GET action
          const res = await api.callScript({ action: 'GET_USERS' }, 'GET');
          if (res && res.status === 'success') return { status: 'success', users: res.users };
      }
      return { status: 'success', users: mockDb.getUsers() };
  },
  
  updateUserRole: async (userId: string, role: string, adminEmail: string, targetEmail?: string) => success(),
  updateUserStatus: async (userId: string, status: string, adminEmail: string) => success(),
  deleteUser: async (userId: string, adminEmail: string) => success(),
  getAdminStats: async () => success({ totalUsers: 5, activeUsers: 5, totalAdmins: 1, pendingUsers: 0 }),

  // --- 3. SYSTEM SETTINGS ---
  getSystemSettings: async () => success({ activeYear: 2025, maintenanceMode: false, availableYears: [] }),
  addYear: async (year: number, adminEmail: string) => success(),
  setActiveYear: async (year: number, adminEmail: string) => success(),
  toggleMaintenance: async (enabled: boolean, adminEmail: string) => success(),

  // --- 4. DATA CRUD (REPORTS) ---

  getData: async (type: ReportType, year: number | string, date?: string) => {
    let docId = String(year);
    if (type === 'daily' && date) docId = date;
    const reportId = `${type}_${docId}`; 

    if (USE_GOOGLE_SHEETS) {
        try {
            // console.log(`Fetching from Sheet: ${reportId}`);
            const sheetRes = await api.callScript({ id: reportId }, 'GET');
            if (sheetRes && sheetRes.status === 'success' && sheetRes.data) {
                const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
                localStorage.setItem(localKey, JSON.stringify(sheetRes.data));
                return sheetRes.data;
            }
        } catch (e) {
            console.warn("Sheet fetch failed", e);
        }
    }
    
    // Fallback Local
    const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
    const local = localStorage.getItem(localKey);
    return local ? JSON.parse(local) : null;
  },

  saveData: async (type: ReportType, year: number | string, data: any, date?: string) => {
    let docId = String(year);
    if (type === 'daily' && date) docId = date;
    const reportId = `${type}_${docId}`;

    const localKey = date ? `report_full_${date}` : `${type}_data_${year}`;
    localStorage.setItem(localKey, JSON.stringify(data));

    if (USE_GOOGLE_SHEETS) {
        api.callScript({
            action: 'SAVE',
            id: reportId,
            type: type,
            year: Number(year),
            data: data
        }).then(res => console.log("Sheet Save Result:", res));
    }
    return true;
  },

  deleteData: async () => true,

  // --- 5. UTILS ---
  logActivity: async (email: string, action: string, details: string) => {
      const log = { timestamp: new Date().toISOString(), user: email, action, details };
      mockDb.saveLog(log);
      return success();
  }, 
  getAuditLogs: async () => mockDb.getLogs(),
  
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
