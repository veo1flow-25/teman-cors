
// components/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Lock, CheckCircle, XCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'verifying' | 'loading' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    // Check if we have an active session (user clicked email link)
    // or listen for the PASSWORD_RECOVERY event
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setSessionValid(true);
            setStatus('idle');
        } else {
            // Wait a moment for auth state to settle
            setStatus('verifying');
        }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
            setSessionValid(true);
            setStatus('idle');
        }
    });

    // Timeout fallback if no session is found after 3 seconds
    const timeout = setTimeout(() => {
        if (!sessionValid) {
             supabase.auth.getSession().then(({ data }) => {
                 if (!data.session) {
                     setStatus('error');
                     setMessage('Pautan tidak sah atau sesi telah tamat. Sila minta pautan baru.');
                 }
             });
        }
    }, 4000);

    return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Kata laluan tidak sepadan.');
      return;
    }
    
    setStatus('loading');
    try {
      // Just update the user. The session is already active from the link click.
      const res = await api.updatePassword('', newPassword);
      if (res.status === 'success') {
        setStatus('success');
        setMessage('Kata laluan berjaya dikemaskini!');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus('error');
        setMessage(res.message || res.error || 'Gagal mengemaskini kata laluan.');
      }
    } catch (e) {
      setStatus('error');
      setMessage('Ralat rangkaian. Sila cuba lagi.');
    }
  };

  if (status === 'verifying') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
             <div className="text-center text-white">
                 <Loader2 size={48} className="animate-spin mx-auto mb-4 text-indigo-500" />
                 <h2 className="text-xl font-bold">Mengesahkan Pautan...</h2>
             </div>
        </div>
      )
  }

  if (status === 'error' && !sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Pautan Tidak Sah</h2>
          <p className="text-slate-500 mb-6">{message || "Sila pastikan anda membuka pautan daripada e-mel yang terkini."}</p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition"
          >
            Kembali ke Log Masuk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Tetapkan Kata Laluan Baru</h2>
          <p className="text-slate-500 text-sm mt-2">Sila masukkan kata laluan baru anda untuk akaun ini.</p>
        </div>

        {status === 'success' ? (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-6 rounded-xl text-center animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle size={48} className="mx-auto mb-3 text-emerald-500" />
            <h3 className="font-bold text-lg mb-1">Berjaya!</h3>
            <p className="text-sm">{message}</p>
            <p className="text-xs text-emerald-600/80 mt-4">Mengalihkan ke halaman log masuk...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {status === 'error' && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2 animate-in shake">
                <XCircle size={18} /> {message}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Kata Laluan Baru</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">Sahkan Kata Laluan</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {status === 'loading' ? 'Mengemaskini...' : <>Tetapkan Kata Laluan <ArrowRight size={20} /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
