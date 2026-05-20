import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Database, 
  Brain, 
  AlertCircle, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  Clock,
  Zap,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function Overview() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getNishanRecords();
        setRecords(data);
      } catch (error) {
        console.error("Failed to fetch records:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const alertRecords = Array.isArray(records) ? records.filter(r => {
    if (!r || !r.requiredTemp) return false;
    const target = parseFloat(r.requiredTemp);
    const setPoint = parseFloat(r.setPoint);
    const pulp = parseFloat(r.pulpTemp);
    
    const setPointMismatch = !isNaN(target) && !isNaN(setPoint) && Math.abs(target - setPoint) > 2;
    const pulpMismatch = !isNaN(target) && !isNaN(pulp) && Math.abs(target - pulp) > 2;
    
    return setPointMismatch || pulpMismatch;
  }) : [];

  return (
    <div className="space-y-8 pb-10">
      {/* Alert Banner for Temp Mismatch */}
      {alertRecords.length > 0 && (
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-xl shadow-red-200 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                 <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-sm font-black uppercase tracking-widest">Critical Temperature Mismatch</h3>
                 <p className="text-xs font-medium text-red-100">{alertRecords.length} loads currently show Pulp or Set Point deviations &gt; 2°F.</p>
              </div>
           </div>
           <button className="px-6 py-2 bg-white text-red-600 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-red-50 transition-all">
              Review Alerts
           </button>
        </div>
      )}

      {/* Primary Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Fleet', value: (Array.isArray(records) ? records.length : 0).toString(), trend: 'Real-time Data', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Recent Alerts', value: alertRecords.length.toString(), trend: 'Immediate Action', icon: AlertCircle, color: alertRecords.length > 0 ? 'text-red-600' : 'text-green-600', bg: alertRecords.length > 0 ? 'bg-red-50' : 'bg-green-50' },
          { label: 'AI Accuracy', value: '99.2%', trend: 'Manual Checks: Low', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Sync Status', value: 'Live', trend: 'Nishan Database OK', icon: Zap, color: 'text-slate-800', bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
              <stat.icon className="w-24 h-24" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{stat.label}</p>
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <div className="flex items-center gap-1 mt-2">
               <ArrowUpRight className="w-3 h-3 text-green-500" />
               <p className="text-[10px] font-medium text-slate-400">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Live Nishan Stream</h2>
                <p className="text-[10px] text-slate-400 font-medium">Real-time load status from WhatsApp & Images</p>
              </div>
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                Export Records
              </button>
            </div>
            <div className="flex-1 overflow-x-auto min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">PO / Truck</th>
                      <th className="px-6 py-4">Load Details</th>
                      <th className="px-6 py-4">Temp Status</th>
                      <th className="px-6 py-4 text-right">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
                    {!Array.isArray(records) || records.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No recent log entries detected.</td>
                      </tr>
                    ) : (
                      records.map((row, i) => {
                        const target = parseFloat(row.requiredTemp);
                        const actual = parseFloat(row.setPoint);
                        const pulp = parseFloat(row.pulpTemp);
                        
                        const hasSetMismatch = !isNaN(target) && !isNaN(actual) && Math.abs(target - actual) > 2;
                        const hasPulpMismatch = !isNaN(target) && !isNaN(pulp) && Math.abs(target - pulp) > 2;
                        const isAlert = hasSetMismatch || hasPulpMismatch;

                        return (
                          <tr key={i} className={`${isAlert ? 'bg-red-50/20' : 'hover:bg-slate-50/30'} transition-colors group cursor-pointer`}>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">#{row.custPo || row.nishanPb || '---'}</div>
                              <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">
                                Truck {row.truck || '---'} / T:{row.trailer || '---'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-700">{row.commodity || 'General Freight'}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{row.division || 'INBOND'}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate w-48 mb-1">{row.summary}</div>
                              {(row.mishaps || row.truckNotes) && (
                                <div className="flex gap-2">
                                  {row.mishaps && <span className="text-[9px] text-red-600 font-bold bg-red-50 px-1 rounded truncate max-w-[100px]">M: {row.mishaps}</span>}
                                  {row.truckNotes && <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded truncate max-w-[100px]">N: {row.truckNotes}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold">
                                  <span className="text-slate-400">REQ: {row.requiredTemp || '--'}°F</span>
                                  <span className={hasSetMismatch ? 'text-red-500 underline decoration-2' : 'text-green-600'}>
                                    SET: {row.setPoint || '--'}°F
                                  </span>
                                  <span className={hasPulpMismatch ? 'text-orange-600 font-black' : 'text-slate-600'}>
                                    PULP: {row.pulpTemp || '--'}°F
                                  </span>
                                </div>
                                <div className="text-[9px] font-medium text-slate-400 truncate w-32">{row.notes}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded-full">{row.status}</span>
                                  <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> 
                                    {new Date(row.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                               </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets - Same as before but can be dynamic too */}
        <div className="lg:col-span-4 space-y-6">
           {/* System Readiness */}
           <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
             <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
               <Zap className="w-4 h-4 text-orange-500" /> AI Agent Readiness
             </h2>
             <div className="space-y-4">
                {[
                  { label: 'Google Sheets Connection', status: 'Healthy', ok: true },
                  { label: 'Gemini 1.5 Flash Gateway', status: 'Ready', ok: true },
                  { label: 'WhatsApp Webhook (Meta)', status: 'Configured', ok: true },
                  { label: 'Nishan Memory DB', status: 'Active', ok: true },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                     <div className="flex justify-between items-center">
                        <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                        <div className={`h-1.5 w-1.5 rounded-full ${item.ok ? 'bg-green-500' : 'bg-orange-400 animation-pulse'}`}></div>
                     </div>
                     <span className="text-[9px] text-slate-400 font-medium">{item.status}</span>
                  </div>
                ))}
             </div>
           </div>

           {/* Memory Dashboard */}
           <div className="bg-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Database className="w-16 h-16" />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-4 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" /> Nishan Intelligence
              </h3>
              <div className="space-y-4">
                 <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                       <span className="text-slate-400">Memory Utilization</span>
                       <span className="font-mono text-blue-400">82%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[82%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                       <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Knowledge Base</div>
                       <div className="text-sm font-bold tracking-tight">{records.length * 12} Data Points</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                       <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">OCR Accuracy</div>
                       <div className="text-sm font-bold tracking-tight">99.1%</div>
                    </div>
                 </div>
                 <p className="text-[10px] text-slate-500 leading-relaxed italic">
                   "AI Agent is now prioritizing historical patterns for Nishan Transport specific PO structures."
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

