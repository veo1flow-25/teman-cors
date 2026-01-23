// components/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, LayoutDashboard, UserPlus, X, Mail, AlertCircle, CheckCircle2, Loader2, Globe } from 'lucide-react';

const Footer = () => (
    <div className="py-6 text-center w-full">
      <p className="text-[10px] font-extrabold text-slate-400 tracking-[0.25em] uppercase opacity-70">
        © {new Date().getFullYear()} TEKUN NASIONAL • AZAM RAMLI
      </p>
    </div>
);

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  const { login, register, loading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in via Netlify
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleNetlifyLogin = () => {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.open();
    } else {
      alert("Netlify Identity tidak dimuatkan. Sila pastikan anda mempunyai sambungan internet.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToProcess = username.includes('@') ? username : `${username}@gmail.com`;
    try {
      if (isRegistering) {
        await register(emailToProcess, password, name);
      } else {
        await login(emailToProcess, password);
      }
      navigate('/');
    } catch (err) {
      console.error("Auth failed", err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    const emailToProcess = resetEmail.includes('@') ? resetEmail : `${resetEmail}@gmail.com`;
    setResetStatus('loading');
    try {
        const response = await api.resetPassword(emailToProcess);
        if (response.status === 'success') {
            setResetStatus('success');
            setResetMessage('Pautan reset telah dihantar ke e-mel anda.');
        } else {
            setResetStatus('error');
            setResetMessage(response.message || 'Gagal menghantar e-mel.');
        }
    } catch (err) {
        setResetStatus('error');
        setResetMessage('Ralat rangkaian.');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0F172A] overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center items-start px-20 text-white">
        <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl inline-block border border-white/10 shadow-2xl">
           <LayoutDashboard size={48} className="text-brand-300" />
        </div>
        <h1 className="text-5xl font-extrabold mb-6 leading-tight tracking-tight">
          Selamat Datang ke <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-indigo-300">TEMAN C.O.R.S</span>
        </h1>
        <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
          Sistem Pengurusan Prestasi Korporat Pintar. Integrasi penuh dengan Netlify Identity untuk keselamatan maksimum.
        </p>
        
        <div className="absolute bottom-8 left-20">
             <p className="text-[10px] font-extrabold text-slate-500 tracking-[0.25em] uppercase">
                © {new Date().getFullYear()} TEKUN NASIONAL • AZAM RAMLI
             </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-10 duration-500 relative mb-8">
            <div className="p-8 md:p-10">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {isRegistering ? 'Daftar Akaun Baru' : 'Log Masuk'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-2">Pilih kaedah akses anda di bawah.</p>
                </div>

                {/* NETLIFY LOGIN BUTTON */}
                <button 
                  onClick={handleNetlifyLogin}
                  className="w-full mb-6 flex items-center justify-center gap-3 py-3.5 px-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  <Globe size={20} className="text-brand-300" />
                  Log Masuk dengan Netlify
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Atau Log Manual</span></div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <ShieldCheck size={16} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {isRegistering && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Nama Penuh</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all font-medium text-slate-800"
                                    placeholder="Nama Anda"
                                    required={isRegistering}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">E-mel / Pengguna</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-28 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all font-medium text-slate-800"
                                placeholder="Cth: user"
                                required
                            />
                            {!username.includes('@') && username.length > 0 && (
                                <span className="absolute right-4 top-3.5 text-slate-400 text-sm font-medium">@gmail.com</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Kata Laluan</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-brand-600 transition-colors" size={20} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all font-medium text-slate-800"
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">
                                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                    >
                        {loading ? 'Sedang Memproses...' : (isRegistering ? 'Daftar Akaun' : 'Log Masuk Manual')}
                        <ArrowRight size={20} />
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <button 
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm font-bold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                        {isRegistering ? "Sudah mempunyai akaun? Log Masuk" : "Belum mempunyai akaun? Daftar Sekarang"}
                    </button>
                </div>
            </div>
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Login;