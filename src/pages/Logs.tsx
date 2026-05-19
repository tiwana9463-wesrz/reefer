import React from 'react';
import { Terminal, Bug, Clock, ShieldCheck, Activity } from 'lucide-react';

export default function Logs() {
  const systemLogs = [
    { type: 'error', code: 'SHEETS_403', message: 'Insufficient scope for write operation on TruckData!B12', time: '14:22:01' },
    { type: 'info', code: 'WHATSAPP_W200', message: 'Incoming webhook received from sandbox +12345678', time: '14:15:33' },
    { type: 'warn', code: 'GEMINI_TOW', message: 'Token threshold reached (85%). Consider optimization.', time: '13:58:12' },
    { type: 'info', code: 'SYSTEM_BOOT', message: 'Node.js Express instance initialized on port 3000', time: '13:00:00' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden font-mono">
      <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-sm shadow-red-500/20" />
            <div className="w-3 h-3 rounded-full bg-orange-500/80 shadow-sm shadow-orange-500/20" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-sm shadow-green-500/20" />
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-2">Kernel System Log</span>
        </div>
        <div className="flex gap-4 items-center">
           <span className="text-[10px] text-slate-500 flex items-center gap-1.5"><Activity className="w-3 h-3 text-green-500" /> FEED: ATTACHED</span>
           <button className="text-[10px] text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-sm bg-slate-800/50 transition-colors">CLEAR BUFFER</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-2 text-[11px] leading-relaxed">
        {systemLogs.map((log, i) => (
          <div key={i} className="group border-l border-slate-800 hover:bg-white/5 transition-all pl-4 py-1 flex items-center gap-4">
            <span className="text-slate-500 tabular-nums shrink-0">[{log.time}]</span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded-sm font-bold border ${
              log.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
              log.type === 'warn' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {log.code}
            </span>
            <span className="text-slate-300 truncate">{log.message}</span>
            {log.type === 'error' && <Bug className="w-3 h-3 text-red-500 ml-auto opacity-0 group-hover:opacity-100" />}
          </div>
        ))}
        <div className="pt-6 space-y-1 opacity-40">
           <div className="flex items-center gap-2 text-[10px] text-slate-500">
             <span className="text-blue-500">&gt;</span> LISTENING FOR INCOMING WEBHOOKS...
           </div>
           <div className="flex items-center gap-2 text-[10px] text-slate-500">
             <span className="text-blue-500">&gt;</span> AI PROCESSING QUEUE: IDLE
           </div>
           <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-4 bg-blue-500 animate-pulse" />
           </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">
        <div className="flex items-center gap-4">
          <span>Channel: 0x2A_SATA_WHATSAPP</span>
          <span className="flex items-center gap-1 text-green-500/50"><ShieldCheck className="w-3 h-3" /> Encrypted</span>
        </div>
        <span>Runtime: 04:22:15</span>
      </div>
    </div>
  );
}
