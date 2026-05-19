import React from 'react';
import { Power, Trash2, Edit2, Zap, CornerDownRight } from 'lucide-react';

export default function Rules() {
  const rules = [
    { id: 1, name: 'Pickup Detection', trigger: 'contains "picked up"', action: 'Update Status to "LOADED"', active: true },
    { id: 2, name: 'Reefer OCR', trigger: 'has image with temperature', action: 'Update column "Reefer Temp"', active: true },
    { id: 3, name: 'Delay Flagging', trigger: 'contains "waiting" or "delay"', action: 'Flag as Issue', active: true },
    { id: 4, name: 'BOL Verification', trigger: 'has BOL photo', action: 'Mark BOL Received', active: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Automation Engine</h2>
          <p className="text-xs text-slate-500 font-medium">Logic mapping for incoming driver communications</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
          <Zap className="w-4 h-4" /> Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map(rule => (
          <div key={rule.id} className={`bg-white border rounded-xl p-6 transition-all ${rule.active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-50'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${rule.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                   <Zap className="w-4 h-4" />
                 </div>
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{rule.name}</h3>
              </div>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600"><Edit2 className="w-3.5 h-3.5" /></button>
                <button className="p-2 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Trigger Condition</span>
                <p className="text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">{rule.trigger}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Dispatch Action</span>
                <p className="text-xs font-bold text-blue-700 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex items-center gap-2">
                   <CornerDownRight className="w-3 h-3" /> {rule.action}
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-50">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${rule.active ? 'text-green-600' : 'text-slate-300'}`}>
                {rule.active ? 'System Active' : 'Suspended'}
              </span>
              <button className={`p-1.5 rounded-md transition-colors ${rule.active ? 'text-green-600 hover:bg-green-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                <Power className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
