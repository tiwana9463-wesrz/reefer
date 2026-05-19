import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Key, 
  Globe, 
  Bell, 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  Smartphone, 
  Table, 
  Cpu,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

export default function Settings() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'smtp'>('general');

  // Configuration State
  const [config, setConfig] = useState({
    sheetId: '',
    whatsappNumber: '',
    syncInterval: '5',
    aiModel: '',
    lowTempThreshold: '',
    highTempThreshold: '',
    notifications: true,
    adminEmail: ''
  });

  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    user: '',
    pass: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settings, smtp] = await Promise.all([
          api.getSettings(),
          api.getSmtpConfig()
        ]);
        setConfig(settings);
        setSmtpConfig(smtp);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'general') {
        await api.updateSettings(config);
      } else {
        await api.updateSmtpConfig(smtpConfig);
      }
      setShowSavedMsg(true);
      setTimeout(() => setShowSavedMsg(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8 pb-12">
      <div className="bg-white p-2 border border-slate-200 rounded-2xl shadow-sm flex gap-1 w-fit">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          General Settings
        </button>
        <button 
          onClick={() => setActiveTab('smtp')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'smtp' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          SMTP & Alerts
        </button>
      </div>

      <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Master Control Center</h2>
            <p className="text-xs text-slate-500 font-medium font-medium">Configure API keys, Sheet IDs, and Automation Rules without code</p>
          </div>
        </div>
        
        <AnimatePresence>
          {showSavedMsg && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-xs font-bold border border-green-100"
            >
              <CheckCircle2 className="w-4 h-4" /> Configuration Updated
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Data & API */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'general' ? (
            <>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Table className="w-4 h-4 text-slate-400" />
                    <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Data Sync & Source</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-700 uppercase">Google Sheet ID</label>
                      <input 
                        type="text" 
                        value={config.sheetId}
                        onChange={(e) => setConfig({...config, sheetId: e.target.value})}
                        className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all font-mono text-slate-600"
                      />
                      <p className="text-[10px] text-slate-400">Target sheet for real-time load status updates and OCR logs.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-slate-700 uppercase">Sync Interval (Minutes)</label>
                          <select 
                            value={config.syncInterval}
                            onChange={(e) => setConfig({...config, syncInterval: e.target.value})}
                            className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20"
                          >
                            <option value="1">1 Minute (Live)</option>
                            <option value="5">5 Minutes (Recommended)</option>
                            <option value="15">15 Minutes</option>
                            <option value="60">Hourly</option>
                          </select>
                      </div>
                      <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold text-slate-700 uppercase">WhatsApp Primary Number</label>
                          <input 
                            type="text" 
                            value={config.whatsappNumber}
                            onChange={(e) => setConfig({...config, whatsappNumber: e.target.value})}
                            className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 font-mono"
                          />
                      </div>
                    </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-slate-400" />
                    <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Artificial Intelligence (Gemini)</h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-700 uppercase">Model Selection</label>
                      <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'Gemini 3-Flash (Preview)', desc: 'Fastest response, optimized for logistics extraction.' },
                            { id: 'Gemini 1.5 Pro', desc: 'Deepest analysis, best for complex BOL verification.' }
                          ].map((model) => (
                            <div 
                              key={model.id}
                              onClick={() => setConfig({...config, aiModel: model.id})}
                              className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                config.aiModel === model.id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <div className="text-xs font-bold text-slate-900 mb-1">{model.id}</div>
                              <p className="text-[10px] text-slate-500 leading-tight">{model.desc}</p>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-xl flex items-center justify-between text-white">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">API Gateway Status</div>
                          <div className="text-xs font-bold">SECURE & CONNECTED</div>
                        </div>
                      </div>
                      <button className="text-[10px] font-bold text-blue-400 hover:underline px-4 py-2 bg-white/5 rounded-lg">RE-VERIFY</button>
                    </div>

                    <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                       <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800">Dynamic WhatsApp Webhook</h4>
                       </div>
                       <div className="space-y-3">
                          <div>
                             <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Target URL (Point Meta/Twilio here)</p>
                             <div className="p-3 bg-white border border-blue-100 rounded-lg text-[11px] font-mono text-slate-600 break-all">
                                {window.location.origin}/webhook/whatsapp
                             </div>
                          </div>
                          <div className="flex gap-4">
                             <div className="flex-1">
                                <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Verify Token</p>
                                <div className="p-2 bg-white border border-blue-100 rounded-lg text-[10px] font-mono text-slate-600">
                                   shipping_ai_token
                                </div>
                             </div>
                             <div className="flex-1">
                                <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Status</p>
                                <div className="flex items-center gap-1.5 p-2 bg-white border border-blue-100 rounded-lg text-[10px] font-bold text-green-600">
                                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                   LIVE POLLING
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">SMTP Outbound Configuration</h3>
               </div>
               <div className="p-8 space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 flex flex-col gap-2">
                       <label className="text-xs font-bold text-slate-700 uppercase">SMTP Host</label>
                       <input 
                         type="text" 
                         value={smtpConfig.host}
                         onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                         placeholder="smtp.gmail.com"
                         className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all font-mono text-slate-600"
                       />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-xs font-bold text-slate-700 uppercase">Port</label>
                       <input 
                         type="text" 
                         value={smtpConfig.port}
                         onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
                         placeholder="587"
                         className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all font-mono text-slate-600"
                       />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">SMTP Username (Email)</label>
                    <input 
                      type="email" 
                      value={smtpConfig.user}
                      onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                      placeholder="notifications@domain.com"
                      className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all font-mono text-slate-600"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase">SMTP Password / App Password</label>
                    <input 
                      type="password" 
                      value={smtpConfig.pass}
                      onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                      placeholder="••••••••••••••••"
                      className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all font-mono text-slate-600"
                    />
                    <p className="text-[10px] text-slate-500 italic">For Gmail, use an "App Password" generated in your Google Account security settings.</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-4">
                    <label className="text-xs font-bold text-slate-700 uppercase">Admin Alert Recipient</label>
                    <input 
                      type="email" 
                      value={config.adminEmail}
                      onChange={(e) => setConfig({...config, adminEmail: e.target.value})}
                      placeholder="dispatch-admin@nishan.com"
                      className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all font-mono text-slate-600"
                    />
                    <p className="text-[10px] text-slate-400">All high-priority alerts (temp mismatch, etc.) will be sent to this email.</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Right Column: thresholds & Reset */}
        <div className="space-y-8">
           <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                 <Bell className="w-4 h-4 text-slate-400" />
                 <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-[0.2em]">Automated Alerts</h3>
              </div>
              <div className="p-6 space-y-6">
                 <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                       <label className="text-xs font-bold text-slate-700 uppercase">Low Temp Alert (°F)</label>
                       <input 
                         type="number" 
                         value={config.lowTempThreshold}
                         onChange={(e) => setConfig({...config, lowTempThreshold: e.target.value})}
                         className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none"
                       />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-xs font-bold text-slate-700 uppercase">High Temp Alert (°F)</label>
                       <input 
                         type="number" 
                         value={config.highTempThreshold}
                         onChange={(e) => setConfig({...config, highTempThreshold: e.target.value})}
                         className="p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none"
                       />
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 mt-6">
                    <div className="flex items-center gap-3">
                       <Smartphone className="w-4 h-4 text-slate-400" />
                       <span className="text-xs font-bold text-slate-700">Push Notifications</span>
                    </div>
                    <button 
                      onClick={() => setConfig({...config, notifications: !config.notifications})}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.notifications ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.notifications ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                 </div>
              </div>
           </div>

           <div className="bg-slate-900 rounded-xl p-6 text-white text-center">
              <h4 className="text-xs font-bold uppercase mb-2 tracking-widest text-blue-400">Need Customization?</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-6 px-4">Contact your dedicated AI Agent developer to add or remove sensors and integrations.</p>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-blue-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Processing...' : 'Commit Changes'}
              </button>
           </div>

           <button className="w-full flex items-center justify-center gap-2 px-6 py-4 text-slate-400 text-xs font-bold uppercase hover:text-red-500 transition-all border border-transparent hover:border-red-100 hover:bg-red-50 rounded-xl">
             <RotateCcw className="w-4 h-4" /> Reset Factory Defaults
           </button>
        </div>
      </div>
    </div>
  );
}


export function SettingsSub({ className }: { className?: string }) {
  return <SettingsIcon className={className} />
}
