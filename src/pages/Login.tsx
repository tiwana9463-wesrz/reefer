import React, { useState } from 'react';
import { Truck, Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await api.login({ username, password });
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-indigo-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex h-20 w-20 items-center justify-center bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-200 mb-6 group cursor-pointer overflow-hidden">
             <motion.div
               animate={{ x: [0, 40, -40, 0] }}
               transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
             >
               <Truck className="h-10 w-10" />
             </motion.div>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">NISHAN</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Logistics AI Automation</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl text-slate-900 text-sm outline-none transition-all placeholder:text-slate-300"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl text-slate-900 text-sm outline-none transition-all placeholder:text-slate-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Enter Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          Powered by Wesrz Technology
        </p>
      </motion.div>
    </div>
  );
}
