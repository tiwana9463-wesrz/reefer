import React, { useState, useEffect } from 'react';
import { Database, Search, RefreshCw, Clock, Tag } from 'lucide-react';
import { api } from '../services/api';

interface NishanRecord {
  id: string;
  custPo?: string;
  nishanPb?: string;
  truck?: string;
  trailer?: string;
  commodity?: string;
  division?: string;
  lastSeen: string;
  summary?: string;
}

export default function NishanMemory() {
  const [records, setRecords] = useState<NishanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getNishanRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch Nishan records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = records.filter(r => 
    r.custPo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.commodity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.truck?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" /> Nishan Intelligence Database
          </h2>
          <p className="text-xs text-slate-500 font-medium">Historical "Memory" used by AI to fast-track load extraction</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchRecords}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Force Memory Sync
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search historical memory (PO, Commodity, Truck...)" 
              className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Cust PO / Nishan PB</th>
                <th className="px-6 py-4">Last Seen Info</th>
                <th className="px-6 py-4">Commodity</th>
                <th className="px-6 py-4">Asset Code</th>
                <th className="px-6 py-4">AI Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{record.custPo || 'N/A'}</div>
                      <div className="text-[10px] text-blue-600 font-bold uppercase">{record.nishanPb}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 opacity-40" /> 
                        {new Date(record.lastSeen).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(record.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase whitespace-nowrap">
                        <Tag className="w-2.5 h-2.5" /> {record.commodity || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-700">Truck: #{record.truck || '??'}</div>
                      <div className="text-[10px] text-slate-400">Trailer: {record.trailer || '??'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] text-slate-500 line-clamp-2 max-w-[200px]">
                        {record.summary || 'Patterns extracted and archived for dispatch fast-track.'}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Database className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-medium">No memory records found yet.</p>
                      <p className="text-[10px]">AI will populate this automatically as it processes loads.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
