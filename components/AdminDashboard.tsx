// components/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { User, SystemSettings, AdminStats } from '../types';
import { 
  Users, Settings, Shield, Activity, Trash2, Edit, CheckCircle, XCircle, 
  Plus, AlertTriangle, Calendar, Power, Search, RefreshCw, Loader2, FileClock, History
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'audit'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Action States
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersRes = await api.getAllUsers();
      if (usersRes.status === 'success' && usersRes.users) {
        setUsers(usersRes.users);
      } else {
        console.error("Failed to load users:", usersRes.error);
      }

      const statsRes = await api.getAdminStats();
      if (statsRes.status === 'success' && statsRes.stats) {
        setStats(statsRes.stats);
      }

      const logs = await api.getAuditLogs();
      setAuditLogs(logs);

      if (user?.role === 'superadmin') {
        const settingsRes = await api.getSystemSettings();
        if (settingsRes.status === 'success' && settingsRes.settings) {
          setSettings(settingsRes.settings);
        }
      }
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, targetEmail: string) => {
    if (!newRole || !user?.email) return;
    
    setActionLoading(userId);
    try {
      const res = await api.updateUserRole(userId, newRole, user.email, targetEmail);
      if (res.status === 'success') {
        alert("Peranan berjaya dikemaskini!");
        setEditingUser(null);
        await api.logActivity(user.email, 'UPDATE_ROLE', `Updated role for ${targetEmail} to ${newRole}`);
        await loadData();
      } else {
        alert(`Gagal: ${res.message || res.error || 'Ralat tidak diketahui'}`);
      }
    } catch (error) {
      alert("Ralat rangkaian semasa mengemaskini peranan.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (userId: string, currentStatus: string, targetEmail: string) => {
    if (!user?.email) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    setActionLoading(userId);
    try {
      const res = await api.updateUserStatus(userId, newStatus, user.email);
      if (res.status === 'success') {
        await api.logActivity(user.email, 'UPDATE_STATUS', `Changed status for ${targetEmail} to ${newStatus}`);
        await loadData();
      } else {
        alert(`Gagal: ${res.message || res.error}`);
      }
    } catch (error) {
      alert("Ralat rangkaian.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, targetEmail: string) => {
    if (!user?.email) return;
    if (!confirm("AMARAN: Pengguna akan dipadam selama-lamanya. Teruskan?")) return;

    setActionLoading(userId);
    try {
      const res = await api.deleteUser(userId, user.email);
      if (res.status === 'success') {
        alert("Pengguna berjaya dipadam.");
        await api.logActivity(user.email, 'DELETE_USER', `Deleted user ${targetEmail}`);
        await loadData();
      } else {
        alert(`Gagal memadam: ${res.message || res.error}`);
      }
    } catch (error) {
      alert("Ralat rangkaian.");
    } finally {
      setActionLoading(null);
    }
  };

  // System Settings Handlers
  const handleAddYear = async () => {
    if (!user?.email) return;
    setActionLoading('system');
    const res = await api.addYear(newYear, user.email);
    setActionLoading(null);
    
    if (res.status === 'success') {
      alert(res.message);
      await api.logActivity(user.email, 'ADD_YEAR', `Added new financial year: ${newYear}`);
      loadData();
    } else {
      alert(res.message || res.error);
    }
  };

  const handleSetActiveYear = async (year: number) => {
    if (!user?.email) return;
    if (!confirm(`Tukar tahun aktif sistem kepada ${year}?`)) return;

    setActionLoading('system');
    const res = await api.setActiveYear(year, user.email);
    setActionLoading(null);

    if (res.status === 'success') {
      alert(res.message);
      await api.logActivity(user.email, 'SET_ACTIVE_YEAR', `Changed active year to ${year}`);
      loadData();
    } else {
      alert(res.message || res.error);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!user?.email || !settings) return;
    const newState = !settings.maintenanceMode;
    if (!confirm(`Adakah anda pasti ingin ${newState ? 'MENGAKTIFKAN' : 'MEMATIKAN'} mod penyelenggaraan?`)) return;

    setActionLoading('system');
    const res = await api.toggleMaintenance(newState, user.email);
    setActionLoading(null);

    if (res.status === 'success') {
      alert(res.message);
      await api.logActivity(user.email, 'MAINTENANCE_MODE', `Toggled maintenance mode to ${newState}`);
      loadData();
    } else {
      alert(res.message || res.error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (isoString: string) => {
      try {
          return new Date(isoString).toLocaleString('ms-MY');
      } catch (e) {
          return isoString;
      }
  }

  // --- PRIVACY HELPER ---
  // Masks email if current user is not a superadmin
  const formatEmailDisplay = (email: string) => {
    if (user?.role === 'superadmin') return email; // Superadmin sees everything
    if (!email) return '-';
    
    const parts = email.split('@');
    if (parts.length < 2) return email; // Fallback if invalid format
    
    const name = parts[0];
    const domain = parts[1];
    
    // Show first 2 chars, mask the rest of the name
    const visibleName = name.length > 2 ? name.substring(0, 2) : name.substring(0, 1);
    return `${visibleName}****@${domain}`;
  };

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div className="p-10 text-center text-slate-500">Akses tidak dibenarkan.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="text-indigo-600" size={32} />
            Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Pusat kawalan sistem dan pengurusan pengguna.</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-medium transition-all disabled:opacity-70"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuatkan...' : 'Refresh Data'}
        </button>
      </div>

      {/* STATS CARDS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Jumlah Pengguna" value={stats.totalUsers} icon={Users} color="blue" />
          <StatCard title="Pengguna Aktif" value={stats.activeUsers} icon={CheckCircle} color="emerald" />
          <StatCard title="Admin / Superadmin" value={stats.totalAdmins} icon={Shield} color="indigo" />
          <StatCard title="Pending Approval" value={stats.pendingUsers} icon={AlertTriangle} color="amber" />
        </div>
      )}

      {/* TABS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
        <div className="border-b border-slate-200 px-6 pt-4 flex gap-6 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
              activeTab === 'users' 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Pengurusan Pengguna
          </button>
          <button 
              onClick={() => setActiveTab('audit')}
              className={`pb-4 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                activeTab === 'audit' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Jejak Audit
          </button>
          {user.role === 'superadmin' && (
            <button 
              onClick={() => setActiveTab('system')}
              className={`pb-4 text-sm font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                activeTab === 'system' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Tetapan Sistem
            </button>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cari pengguna..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div className="text-xs text-slate-400">
                  Menunjukkan {filteredUsers.length} daripada {users.length} pengguna
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">Nama / Email</th>
                      <th className="px-6 py-3 text-center">Peranan</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-center">Terakhir Log Masuk</th>
                      <th className="px-6 py-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{u.name}</div>
                          {/* APPLY PRIVACY FILTER */}
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {formatEmailDisplay(u.email)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {editingUser === u.id ? (
                            <div className="flex items-center gap-2 justify-center animate-in fade-in">
                              <select 
                                className="bg-white border border-indigo-300 ring-2 ring-indigo-100 rounded px-2 py-1 text-xs outline-none"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                disabled={actionLoading === u.id}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                              </select>
                              <button 
                                type="button"
                                onClick={() => handleUpdateRole(u.id!, u.email)} 
                                disabled={actionLoading === u.id}
                                className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                              >
                                {actionLoading === u.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                              </button>
                              <button 
                                type="button"
                                onClick={() => setEditingUser(null)} 
                                disabled={actionLoading === u.id}
                                className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              >
                                <XCircle size={14}/>
                              </button>
                            </div>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                              u.role === 'user' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${u.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500 text-xs">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          {/* ONLY SUPERADMIN CAN EDIT OTHERS, NOT THEMSELVES */}
                          {user.role === 'superadmin' && u.id !== user.id && (
                            <>
                              <button 
                                type="button"
                                onClick={() => { 
                                  if (!u.id) return;
                                  setEditingUser(u.id); 
                                  setNewRole((u.role || 'viewer').toLowerCase()); 
                                }}
                                disabled={actionLoading === u.id || editingUser !== null}
                                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition disabled:opacity-50" 
                                title="Tukar Peranan"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleUpdateStatus(u.id!, u.status || 'active', u.email)}
                                disabled={actionLoading === u.id}
                                className={`p-2 rounded-lg transition disabled:opacity-50 ${u.status === 'active' ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-emerald-50 text-emerald-600'}`}
                                title={u.status === 'active' ? 'Nyahaktifkan' : 'Aktifkan'}
                              >
                                {actionLoading === u.id ? <Loader2 size={16} className="animate-spin"/> : <Power size={16} />}
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleDeleteUser(u.id!, u.email)}
                                disabled={actionLoading === u.id}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition disabled:opacity-50"
                                title="Padam Pengguna"
                              >
                                {actionLoading === u.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16} />}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
              <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <History size={20} className="text-orange-600"/> Rekod Aktiviti
                      </h3>
                      <button onClick={loadData} className="text-xs text-indigo-600 hover:underline">Muat semula log</button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                              <tr>
                                  <th className="px-6 py-3 w-48">Tarikh / Masa</th>
                                  <th className="px-6 py-3 w-48">Pengguna</th>
                                  <th className="px-6 py-3 w-40">Aktiviti</th>
                                  <th className="px-6 py-3">Butiran</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {auditLogs.length > 0 ? auditLogs.map((log, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                      <td className="px-6 py-3 text-xs text-slate-500 font-mono">
                                          {formatDate(log.timestamp)}
                                      </td>
                                      <td className="px-6 py-3 text-xs font-bold text-slate-700 font-mono">
                                          {/* APPLY PRIVACY FILTER TO AUDIT LOGS TOO */}
                                          {formatEmailDisplay(log.user)}
                                      </td>
                                      <td className="px-6 py-3 text-xs">
                                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold uppercase text-[10px]">
                                              {log.action}
                                          </span>
                                      </td>
                                      <td className="px-6 py-3 text-xs text-slate-600">
                                          {log.details}
                                      </td>
                                  </tr>
                              )) : (
                                  <tr>
                                      <td colSpan={4} className="p-8 text-center text-slate-400">Tiada rekod aktiviti dijumpai.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in">
              {/* SYSTEM SETTINGS TAB (SUPER ADMIN ONLY) */}
              {settings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Year Management */}
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Calendar size={20} className="text-blue-600"/> Pengurusan Tahun Kewangan
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Tambah Tahun Baru</label>
                          <input 
                            type="number" 
                            value={newYear} 
                            onChange={(e) => setNewYear(Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-black font-medium"
                          />
                        </div>
                        <button 
                          onClick={handleAddYear}
                          disabled={actionLoading === 'system'}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-70 flex items-center gap-2"
                        >
                          {actionLoading === 'system' ? <Loader2 size={18} className="animate-spin"/> : <Plus size={18} />}
                        </button>
                      </div>

                      <div className="space-y-2 mt-6">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tahun Aktif Semasa</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {settings.availableYears.map(y => (
                            <div key={y.year} className={`flex justify-between items-center p-3 rounded-lg border ${y.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                              <span className={`font-bold ${y.isActive ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {y.year} {y.isActive && '(Aktif)'}
                              </span>
                              {!y.isActive && (
                                <button 
                                  onClick={() => handleSetActiveYear(y.year)}
                                  disabled={actionLoading === 'system'}
                                  className="text-xs bg-white border border-slate-300 px-3 py-1 rounded hover:bg-slate-100 disabled:opacity-50"
                                >
                                  Set Aktif
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Mode */}
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <Activity size={20} className="text-rose-600"/> Kawalan Sistem
                    </h3>
                    
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-800">Mod Penyelenggaraan</p>
                        <p className="text-xs text-slate-500 mt-1">Menghalang akses kepada semua pengguna kecuali Admin.</p>
                      </div>
                      <button 
                        onClick={handleToggleMaintenance}
                        disabled={actionLoading === 'system'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${settings.maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {settings.maintenanceMode && (
                      <div className="mt-4 p-3 bg-rose-100 text-rose-800 text-xs rounded-lg font-medium flex items-center gap-2">
                        <AlertTriangle size={14} /> Sistem kini dalam mod penyelenggaraan.
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) => (
  <div className={`bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 border-l-4 border-l-${color}-500`}>
    <div className={`p-3 rounded-full bg-${color}-50 text-${color}-600`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

export default AdminDashboard;