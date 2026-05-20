import React, { useState, useEffect } from 'react';
import { Settings, Plus, Phone, MessageSquare, X, Save, Trash2, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface Asset {
  id?: string;
  number: string;
  trailer: string;
  driver: string;
  phone: string;
  division: string;
  groupName: string;
  isMonitoring: boolean;
}

export default function TruckGroups() {
  const [trucks, setTrucks] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newAsset, setNewAsset] = useState<Asset>({
    number: '',
    trailer: '',
    driver: '',
    phone: '',
    division: 'INBOND',
    groupName: '',
    isMonitoring: true
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await api.getAssets();
      setTrucks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonitoring = async (asset: Asset) => {
    const updated = { ...asset, isMonitoring: !asset.isMonitoring };
    try {
      await api.addAsset(updated);
      setTrucks(prev => prev.map(t => t.id === asset.id ? updated : t));
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saved = await api.addAsset(newAsset);
      setTrucks(prev => [...prev, saved]);
      setModalOpen(false);
      setNewAsset({
        number: '',
        trailer: '',
        driver: '',
        phone: '',
        division: 'INBOND',
        groupName: '',
        isMonitoring: true
      });
    } catch (error) {
      console.error('Failed to add asset:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await api.deleteAsset(id);
      setTrucks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Nishan Fleet Monitoring</h2>
          <p className="text-xs text-slate-500 font-medium">Toggle "ACTIVE MONITORING" to enable AI Sheet automation for specific WhatsApp groups</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
        >
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Active Monitoring</th>
                <th className="px-6 py-4">Equip (Truck/Trailer)</th>
                <th className="px-6 py-4">WhatsApp Group</th>
                <th className="px-6 py-4">Assignee</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
              {trucks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No active assets. Click "Add Asset" to start monitoring fleet groups.
                  </td>
                </tr>
              ) : (
                trucks.map((truck, i) => (
                  <tr key={`${truck.id}-${i}`} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleMonitoring(truck)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${truck.isMonitoring ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${truck.isMonitoring ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">#{truck.number}</div>
                      <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">T: {truck.trailer}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-medium text-slate-700">
                        <MessageSquare className="w-3.5 h-3.5 text-green-500" /> {truck.groupName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">{truck.driver}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                         <Phone className="w-2.5 h-2.5" /> {truck.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDelete(truck.id!)}
                          className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"><Settings className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Add New Fleet Asset</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddAsset} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Truck Number</label>
                  <input 
                    required
                    value={newAsset.number}
                    onChange={e => setNewAsset({...newAsset, number: e.target.value})}
                    placeholder="e.g. 7149"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trailer Number</label>
                  <input 
                    required
                    value={newAsset.trailer}
                    onChange={e => setNewAsset({...newAsset, trailer: e.target.value})}
                    placeholder="e.g. 470"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">WhatsApp Group Name</label>
                <input 
                  required
                  value={newAsset.groupName}
                  onChange={e => setNewAsset({...newAsset, groupName: e.target.value})}
                  placeholder="e.g. Logistics 7149 - CHI"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver Name</label>
                  <input 
                    required
                    value={newAsset.driver}
                    onChange={e => setNewAsset({...newAsset, driver: e.target.value})}
                    placeholder="Michael Scott"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Division</label>
                  <select 
                    value={newAsset.division}
                    onChange={e => setNewAsset({...newAsset, division: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 ring-blue-500/20 outline-none transition-all"
                  >
                    <option value="INBOND">INBOND</option>
                    <option value="OUTBOUND">OUTBOUND</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver Phone (WhatsApp)</label>
                <input 
                  required
                  value={newAsset.phone}
                  onChange={e => setNewAsset({...newAsset, phone: e.target.value})}
                  placeholder="+1..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
