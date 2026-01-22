
// components/Layout.tsx
import React, { useState, useEffect, useContext, createContext, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ReportGenerator from './ReportGenerator';
import { api } from '../services/api';
import { supabase, isConfigured } from '../services/supabaseClient';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Wallet, 
  HandCoins, 
  AlertTriangle, 
  Menu,
  Bell,
  X,
  Search,
  ChevronRight,
  Calendar,
  LogOut,
  User as UserIcon,
  Shield,
  Settings,
  Wifi,
  WifiOff,
  Database,
  Check,
  Info,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun
} from 'lucide-react';

// --- TYPES FOR NOTIFICATIONS ---
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  targetRoles: string[]; // 'all', 'admin', 'user', 'superadmin'
}

// Create Context for Global Year Selection
interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

export const YearContext = createContext<YearContextType>({
  selectedYear: new Date().getFullYear(),
  setSelectedYear: () => {},
});

// Create Context for Global Search
interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const SearchContext = createContext<SearchContextType>({
  searchQuery: '',
  setSearchQuery: () => {},
});

export const useYear = () => useContext(YearContext);
export const useSearch = () => useContext(SearchContext);

const SidebarLink = ({ to, icon: Icon, children }: { to: string; icon: React.ElementType; children?: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <NavLink
      to={to}
      className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
        isActive 
          ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/10' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-400 rounded-r-full" />
      )}
      <Icon size={20} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 text-brand-300' : 'group-hover:text-white'}`} />
      <span className="font-medium text-sm tracking-wide">{children}</span>
      {isActive && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </NavLink>
  );
};

// --- FOOTER COMPONENT ---
const Footer = () => (
  <div className="py-8 flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
    <div className="h-px w-32 bg-slate-200 dark:bg-slate-700 mb-4"></div>
    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tracking-[0.25em] uppercase text-center">
      © 2025 TEKUN NASIONAL • AZAM RAMLI
    </p>
  </div>
);

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'demo'>('demo');
  
  // Notification States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();

  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    // Reset search on route change
    setSearchQuery('');
  }, [location]);

  // Click outside listener for notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize Notifications based on Role
  useEffect(() => {
    if (!user) return;

    const baseNotifications: NotificationItem[] = [
      {
        id: '1',
        title: 'Sistem Dikemaskini',
        message: 'Versi 2.1 kini stabil dengan ciri AI baharu.',
        time: '2 jam lepas',
        type: 'info',
        read: false,
        targetRoles: ['all']
      },
      {
        id: '2',
        title: 'Peringatan Laporan Harian',
        message: 'Sila pastikan data semalam telah lengkap.',
        time: '5 jam lepas',
        type: 'warning',
        read: false,
        targetRoles: ['user', 'admin', 'superadmin']
      },
      {
        id: '3',
        title: 'Pendaftaran Pengguna Baru',
        message: '3 pengguna baru menunggu pengesahan anda.',
        time: '1 hari lepas',
        type: 'alert',
        read: false,
        targetRoles: ['admin', 'superadmin']
      },
      {
        id: '4',
        title: 'Sandaran Database Berjaya',
        message: 'Data selamat disimpan di Cloud.',
        time: 'Semalam',
        type: 'success',
        read: true,
        targetRoles: ['superadmin']
      }
    ];

    // Filter logic
    const filtered = baseNotifications.filter(n => 
      n.targetRoles.includes('all') || (user.role && n.targetRoles.includes(user.role))
    );
    setNotifications(filtered);
  }, [user]);

  // --- SUPABASE KEEP ALIVE (HEARTBEAT) & CONNECTION CHECK ---
  useEffect(() => {
    // Initial status check
    if (!isConfigured) {
        setConnectionStatus('demo');
    } else {
        const checkConnection = async () => {
            try {
                // Lightweight query to check connection
                const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
                if (error && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch'))) {
                    setConnectionStatus('offline');
                } else {
                    setConnectionStatus('online');
                }
            } catch (e) {
                setConnectionStatus('offline');
            }
        };

        checkConnection();
        // Jalankan ping/check setiap 10 saat
        const intervalId = setInterval(() => {
            api.keepAlive();
            checkConnection();
        }, 10 * 1000);

        return () => clearInterval(intervalId);
    }
  }, []);

  const handleLogout = () => {
      logout();
      navigate('/login');
  }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleNotif = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Notification counts
  const unreadCount = notifications.filter(n => !n.read).length;

  // Format date as DD/MM/YYYY
  const todayLong = new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

  // Role Checks
  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'superadmin';
  const roleLabel = user?.role === 'superadmin' ? 'Super Admin' : (user?.role === 'admin' ? 'Admin' : 'Viewer');

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
      <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0B1120] overflow-hidden transition-colors duration-300">
          {/* Mobile Sidebar Overlay */}
          <div 
            className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
              isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar */}
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-50 h-screen
            bg-[#0F172A] text-white 
            transform transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col shadow-2xl lg:shadow-none
            ${isSidebarOpen 
                ? 'translate-x-0 w-[280px]' 
                : '-translate-x-full w-[280px] lg:translate-x-0 lg:w-0 lg:overflow-hidden' 
            }
          `}>
            {/* Background Gradient Mesh */}
            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-brand-900/20 to-transparent pointer-events-none" />
            
            <div className="w-[280px] flex flex-col h-full shrink-0 relative z-10">
                <div className="p-6 flex justify-between items-center h-20 box-border">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50">
                            <span className="font-bold text-white text-lg">TC</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold tracking-tight text-white leading-none">TEMAN C.O.R.S</h1>
                            <span className="text-xs font-medium text-brand-300 tracking-wider">PRO DASHBOARD</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
                    <div className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Utama
                    </div>
                    <SidebarLink to="/" icon={LayoutDashboard}>Prestasi KPI</SidebarLink>
                    
                    <div className="px-4 py-3 mt-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Laporan
                    </div>
                    <SidebarLink to="/daily" icon={CalendarDays}>Laporan Harian</SidebarLink>
                    <SidebarLink to="/financing" icon={Wallet}>Pembiayaan</SidebarLink>
                    <SidebarLink to="/collection" icon={HandCoins}>Kutipan Bayaran</SidebarLink>
                    <SidebarLink to="/npf" icon={AlertTriangle}>Laporan NPF</SidebarLink>

                    {isAdminOrSuper && (
                      <>
                        <div className="px-4 py-3 mt-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                            Admin
                        </div>
                        <SidebarLink to="/admin" icon={Settings}>Admin Dashboard</SidebarLink>
                      </>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800/50 bg-[#0B1120] space-y-3">
                    {/* Mobile Settings Controls (Visible in sidebar on mobile only) */}
                    <div className="lg:hidden flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/50">
                        {/* Connection Status */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 ${
                            connectionStatus === 'online' ? 'bg-emerald-900/30 text-emerald-400' :
                            connectionStatus === 'offline' ? 'bg-red-900/30 text-red-400' :
                            'bg-amber-900/30 text-amber-400'
                        }`}>
                            {connectionStatus === 'online' && <Wifi size={12} />}
                            {connectionStatus === 'offline' && <WifiOff size={12} />}
                            {connectionStatus === 'demo' && <Database size={12} />}
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {connectionStatus === 'online' ? 'Connected' : 
                                 connectionStatus === 'offline' ? 'Offline' : 'Demo'}
                            </span>
                        </div>

                        {/* Theme Toggle */}
                        <button 
                            onClick={toggleTheme} 
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center shrink-0 ring-2 ring-slate-800">
                            {isAdminOrSuper ? <Shield size={16} className="text-emerald-400" /> : <UserIcon size={16} className="text-slate-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              {roleLabel}
                            </p>
                        </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                    >
                      <LogOut size={14} /> Log Keluar
                    </button>
                </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full transition-all duration-300 relative">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 h-20 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0 transition-colors">
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                  
                  {/* Search Bar (Desktop) */}
                  <div className="hidden md:flex items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-xl px-4 py-2 border border-transparent focus-within:border-brand-300 dark:focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-4 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/20 transition-all w-64 lg:w-96">
                    <Search size={18} className="text-slate-400 mr-2" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Carian pantas..." 
                        className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    />
                    {searchQuery && (
                       <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <X size={14} />
                       </button>
                    )}
                  </div>
              </div>
              
              <div className="flex items-center gap-4 md:gap-6">
                  
                  {/* Connection Status Indicator - Hidden on Mobile */}
                  <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                      connectionStatus === 'online' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' :
                      connectionStatus === 'offline' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' :
                      'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                  }`}>
                      {connectionStatus === 'online' && <Wifi size={14} />}
                      {connectionStatus === 'offline' && <WifiOff size={14} />}
                      {connectionStatus === 'demo' && <Database size={14} />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                          {connectionStatus === 'online' ? 'Connected' : 
                           connectionStatus === 'offline' ? 'Disconnected' : 'Mod Demo'}
                      </span>
                  </div>

                  {/* Dark Mode Toggle - Hidden on Mobile */}
                  <button 
                    onClick={toggleTheme} 
                    className="hidden md:block p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title={theme === 'dark' ? 'Tukar ke Mod Cerah' : 'Tukar ke Mod Gelap'}
                  >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  </button>

                  {/* PPT REPORT GENERATOR */}
                  <ReportGenerator currentYear={selectedYear} />

                  {/* Year Selector Dropdown */}
                  <div className="relative group hidden sm:block">
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600">
                          <Calendar size={16} className="text-brand-600 dark:text-brand-400"/>
                          <span className="text-sm font-bold">{selectedYear}</span>
                          <select 
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(Number(e.target.value))}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                          >
                              <option value={2026}>2026</option>
                              <option value={2025}>2025</option>
                              <option value={2024}>2024</option>
                              <option value={2023}>2023</option>
                          </select>
                      </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                  {/* Notification Bell */}
                  <div className="relative" ref={notifRef}>
                    <button 
                      onClick={() => setIsNotifOpen(!isNotifOpen)}
                      className={`relative p-2.5 rounded-xl transition-all ${
                          isNotifOpen 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400'
                      }`}
                    >
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {isNotifOpen && (
                      <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                         <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                               <h3 className="font-bold text-slate-800 dark:text-white">Notifikasi</h3>
                               <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} belum dibaca</p>
                            </div>
                            {unreadCount > 0 && (
                               <button 
                                 onClick={markAllRead}
                                 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                               >
                                 <Check size={12} /> Tanda Dibaca
                               </button>
                            )}
                         </div>
                         <div className="max-h-[350px] overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map((notif) => (
                                  <div 
                                    key={notif.id}
                                    onClick={() => toggleNotif(notif.id)}
                                    className={`p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer relative group ${
                                        !notif.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'dark:bg-slate-800'
                                    }`}
                                  >
                                    <div className="flex gap-3">
                                       <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                          ${notif.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                                            notif.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 
                                            notif.type === 'alert' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 
                                            'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                          }`}>
                                          {notif.type === 'success' ? <CheckCircle2 size={16} /> : 
                                           notif.type === 'warning' ? <AlertTriangle size={16} /> : 
                                           notif.type === 'alert' ? <AlertCircle size={16} /> : 
                                           <Info size={16} />}
                                       </div>
                                       <div>
                                          <h4 className={`text-sm ${!notif.read ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                                            {notif.title}
                                          </h4>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                            {notif.message}
                                          </p>
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-2 block">
                                            {notif.time}
                                          </span>
                                       </div>
                                       {!notif.read && (
                                         <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full"></div>
                                       )}
                                    </div>
                                  </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                                   <Bell size={32} className="mx-auto mb-2 opacity-20"/>
                                   <p className="text-sm">Tiada notifikasi baru</p>
                                </div>
                            )}
                         </div>
                         <div className="p-2 text-center bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
                            <button className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 w-full py-1">Lihat Semua</button>
                         </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right hidden sm:block">
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Tarikh Hari Ini</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{todayLong}</p>
                  </div>
              </div>
            </header>

            <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth flex flex-col">
              <div className="flex-1">
                 {children}
              </div>
              <Footer />
            </div>
          </main>
        </div>
      </SearchContext.Provider>
    </YearContext.Provider>
  );
};

export default Layout;
