
// components/Login.tsx
import React, { useState } from 'react';
// Fix: Import routing hooks from 'react-router-dom' to resolve possible named export issues.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, LayoutDashboard, UserPlus, X, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

// --- FOOTER COMPONENT ---
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
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-append @gmail.com if no domain is specified
    const emailToProcess = username.includes('@') ? username : `${username}@gmail.com`;

    try {
      if (isRegistering) {
        await register(emailToProcess, password, name);
        navigate('/');
      } else {
        await login(emailToProcess, password);
        navigate('/');
      }
    } catch (err) {
      console.error("Auth failed", err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    // Auto-append @gmail.com if no domain is specified
    const emailToProcess = resetEmail.includes('@') ? resetEmail : `${resetEmail}@gmail.com`;

    setResetStatus('loading');
    setResetMessage('');

    try {
        const response = await api.resetPassword(emailToProcess);
        
        if (response.status === 'success') {
            setResetStatus('success');
            setResetMessage('Pautan untuk menetapkan semula kata laluan telah dihantar ke e-mel anda. Sila semak peti masuk atau spam.');
        } else {
            setResetStatus('error');
            // Check for common Google Script permission errors to give better advice
            const errorMsg = response.message || response.error || '';
            
            if (errorMsg.includes('permission') || errorMsg.includes('MailApp')) {
                 setResetMessage('Ralat Server: Skrip Google tidak mempunyai kebenaran menghantar e-mel. Sila hubungi admin untuk melakukan "Authorize" pada skrip.');
            } else if (errorMsg.includes('tidak ditemui')) {
                 setResetMessage('E-mel ini tidak berdaftar dalam sistem.');
            } else {
                 setResetMessage(errorMsg || 'Gagal menghantar e-mel. Sila cuba lagi.');
            }
        }
    } catch (err) {
        setResetStatus('error');
        setResetMessage('Ralat rangkaian. Sila pastikan sambungan internet anda stabil.');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0F172A] overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      {/* Left Panel - Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center items-start px-20 text-white">
        <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl inline-block border border-white/10 shadow-2xl">
           <LayoutDashboard size={48} className="text-brand-300" />
        </div>
        <h1 className="text-5xl font-extrabold mb-6 leading-tight tracking-tight">
          Selamat Datang ke <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-indigo-300">TEMAN C.O.R.S</span>
        </h1>
        <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
          Sistem Pengurusan Prestasi Korporat Pintar. Pemantauan KPI, Pembiayaan, Kutipan dan NPF Dengan Analisis Data Masa Nyata (Real Time).
        </p>
        
        <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-md">
           <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <ShieldCheck className="text-emerald-400 mb-2" size={24}/>
              <h3 className="font-bold text-sm mb-1">Data Selamat</h3>
              <p className="text-xs text-slate-400">Enkripsi tahap tinggi untuk keselamatan data.</p>
           </div>
           <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <LayoutDashboard className="text-blue-400 mb-2" size={24}/>
              <h3 className="font-bold text-sm mb-1">Analisis Pintar</h3>
              <p className="text-xs text-slate-400">Integrasi AI untuk ramalan prestasi.</p>
           </div>
        </div>
        
        {/* Footer for Left Panel */}
        <div className="absolute bottom-8 left-20">
             <p className="text-[10px] font-extrabold text-slate-500 tracking-[0.25em] uppercase">
                © {new Date().getFullYear()} TEKUN NASIONAL • AZAM RAMLI
             </p>
        </div>
      </div>

      {/* Right Panel - Login/Register Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-10 duration-500 relative mb-8">
            
            {/* Main Form */}
            <div className="p-8 md:p-10">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {isRegistering ? 'Daftar Akaun Baru' : 'Log Masuk'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-2">
                        {isRegistering ? 'Lengkapkan maklumat di bawah untuk akses.' : 'Masukkan kelayakan anda untuk akses.'}
                    </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <ShieldCheck size={16} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {isRegistering && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
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
                                placeholder="Cth: user (Auto @gmail.com)"
                                required
                            />
                            {/* Ghost Text for Default Domain */}
                            {!username.includes('@') && username.length > 0 && (
                                <span className="absolute right-4 top-3.5 text-slate-400 text-sm font-medium pointer-events-none select-none transition-opacity">
                                    @gmail.com
                                </span>
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
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                            </button>
                        </div>
                    </div>

                    {!isRegistering && (
                        <div className="flex justify-end">
                            <button 
                                type="button" 
                                onClick={() => setShowForgotPassword(true)}
                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                            >
                                Lupa kata laluan?
                            </button>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sedang Memproses...' : (
                            isRegistering ? <>Daftar Akaun <UserPlus size={20} /></> : <>Log Masuk <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-sm text-slate-500">
                        {isRegistering ? "Sudah mempunyai akaun?" : "Belum mempunyai akaun?"}
                        <button 
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="ml-2 font-bold text-brand-600 hover:text-brand-700 hover:underline transition-all"
                        >
                            {isRegistering ? "Log Masuk" : "Daftar Sekarang"}
                        </button>
                    </p>
                </div>
            </div>

            {/* Forgot Password Modal Overlay */}
            {showForgotPassword && (
                <div className="absolute inset-0 z-20 bg-white p-8 md:p-10 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-10 duration-300">
                    <button 
                        onClick={() => setShowForgotPassword(false)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X size={24} />
                    </button>
                    
                    <div className="text-center w-full max-w-sm">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Lupa Kata Laluan?</h3>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                            Masukkan e-mel anda di bawah dan kami akan menghantar pautan untuk menetapkan semula kata laluan anda.
                        </p>

                        {resetStatus === 'success' ? (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-6 rounded-xl text-center animate-in fade-in zoom-in">
                                <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-500" />
                                <h4 className="font-bold text-lg text-emerald-800 mb-2">E-mel Dihantar!</h4>
                                <p className="text-xs text-emerald-700/80 mb-6 leading-relaxed">{resetMessage}</p>
                                <button 
                                    onClick={() => setShowForgotPassword(false)}
                                    className="block w-full bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Kembali ke Log Masuk
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-5 w-full">
                                {resetStatus === 'error' && (
                                    <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 mb-4 flex gap-3 items-start text-left animate-in shake">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <div>{resetMessage}</div>
                                    </div>
                                )}
                                <div className="space-y-1.5 text-left">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mel Akaun</label>
                                    <div className="relative group text-left">
                                        <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                                        <input 
                                            type="text" 
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            className="w-full pl-10 pr-28 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                                            placeholder="user (Auto @gmail.com)"
                                            required
                                        />
                                        {/* Ghost Text for Reset */}
                                        {!resetEmail.includes('@') && resetEmail.length > 0 && (
                                            <span className="absolute right-4 top-3.5 text-slate-400 text-sm font-medium pointer-events-none select-none transition-opacity">
                                                @gmail.com
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={resetStatus === 'loading'}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {resetStatus === 'loading' ? <><Loader2 size={18} className="animate-spin"/> Menghantar...</> : 'Hantar Pautan Reset'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
        {/* Mobile Footer */}
        <div className="lg:hidden">
             <Footer />
        </div>
      </div>
    </div>
  );
};

export default Login;
