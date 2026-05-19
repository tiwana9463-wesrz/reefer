import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Truck, 
  MessageSquare, 
  Table as TableIcon, 
  Bot, 
  Settings as SettingsIcon, 
  FileText, 
  Zap,
  LogOut,
  Menu,
  X,
  AlertCircle,
  Database
} from 'lucide-react';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, onAuthStateChanged, User, signOut, GoogleAuthProvider } from 'firebase/auth';
import Overview from './pages/Overview';
import TruckGroups from './pages/TruckGroups';
import WhatsAppHub from './pages/WhatsAppHub';
import NishanMemory from './pages/NishanMemory';
import SheetManager from './pages/SheetManager';
import AIChat from './pages/AIChat';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Login from './pages/Login';
import { motion, AnimatePresence } from 'motion/react';

type Page = 'overview' | 'trucks' | 'whatsapp' | 'nishan' | 'sheets' | 'ai' | 'rules' | 'settings' | 'logs';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ token: string, user: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('overview');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Check for saved session
    const saved = localStorage.getItem('nishan_session');
    if (saved) {
      setSession(JSON.parse(saved));
    }
    
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleCustomLogin = (token: string, userData: any) => {
    const sess = { token, user: userData };
    setSession(sess);
    localStorage.setItem('nishan_session', JSON.stringify(sess));
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential: any = GoogleAuthProvider.credentialFromResult(result);
      (window as any)._googleAccessToken = credential.accessToken;
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setSession(null);
    localStorage.removeItem('nishan_session');
    (window as any)._googleAccessToken = null;
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-mono">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Combined Auth Gate: Requires Nishan Login (Google is now optional)
  if (!session) {
    return <Login onLogin={handleCustomLogin} />;
  }

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
    { id: 'trucks', label: 'Truck Groups', icon: Truck },
    { id: 'nishan', label: 'Nishan Database', icon: Database },
    { id: 'whatsapp', label: 'WhatsApp Hub', icon: MessageSquare },
    { id: 'sheets', label: 'Google Sheets', icon: TableIcon },
    { id: 'ai', label: 'AI Agent Assistant', icon: Bot },
    { id: 'rules', label: 'Automation Rules', icon: Zap },
    { id: 'logs', label: 'System Logs', icon: FileText },
    { id: 'settings', label: 'Configuration', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Nav */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-50 shrink-0">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-100">
             <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && (
            <span className="ml-3 font-black text-xs uppercase tracking-[0.2em] text-slate-800">Nishan Dispatch</span>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as Page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                activePage === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              } ${!isSidebarOpen && 'justify-center'}`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activePage === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
              {isSidebarOpen && <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50 space-y-4">
           {isSidebarOpen && (
             <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-400 tracking-tighter">
                   <span>System Health</span>
                   <span className="text-green-500 font-black">Online</span>
                </div>
                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                   <div className="h-full bg-green-500 w-full rounded-full"></div>
                </div>
             </div>
           )}
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
           >
             <LogOut className="w-5 h-5 shrink-0" />
             {isSidebarOpen && <span className="text-[11px] font-bold uppercase tracking-wider">Sign Out</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <h1 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                {navItems.find(n => n.id === activePage)?.label}
                <span className="h-1 w-1 bg-slate-300 rounded-full mx-1"></span>
                <span className="text-[10px] text-slate-400 font-medium">Global Operations</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
               <span className="text-xs font-bold text-slate-800">{user?.displayName || 'Operations Lead'}</span>
               <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter italic">Admin Secured</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
              {user?.photoURL ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" /> : <SettingsIcon className="w-5 h-5" />}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activePage === 'overview' && <Overview />}
                {activePage === 'trucks' && <TruckGroups />}
                {activePage === 'nishan' && <NishanMemory />}
                {activePage === 'whatsapp' && <WhatsAppHub />}
                {activePage === 'sheets' && <SheetManager />}
                {activePage === 'ai' && <AIChat />}
                {activePage === 'rules' && <Rules />}
                {activePage === 'logs' && <Logs />}
                {activePage === 'settings' && <Settings />}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
