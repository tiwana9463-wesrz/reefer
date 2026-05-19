import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, FileSpreadsheet, MapPin } from 'lucide-react';
import { api } from '../services/api';

export default function SheetManager() {
  const [sheetId, setSheetId] = useState('');
  const [data, setData] = useState<any[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await api.getSettings();
        if (settings.sheetId) {
          setSheetId(settings.sheetId);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const fetchSheetData = async () => {
    if (!sheetId) return;
    setIsLoading(true);
    try {
      const response = await api.sheetsRead(sheetId, 'Sheet1!A1:Z100');
      if (response.values) {
        setData(response.values);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const pushDatabaseToSheet = async () => {
    if (!sheetId) return;
    setIsPushing(true);
    try {
      await api.syncMasterSheet(sheetId);
      await fetchSheetData();
      alert('Master Sheet Updated Successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to update Master Sheet. Check Google permissions.');
    } finally {
      setIsPushing(false);
    }
  };

  useEffect(() => {
    if (sheetId) {
      fetchSheetData();
    }
  }, [sheetId]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center border border-green-100 shadow-sm shadow-green-100">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Nishan Master Sheet</h2>
            <p className="text-sm font-bold text-slate-800 tracking-tight truncate w-64 uppercase">{sheetId || 'NOT CONFIGURED'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={pushDatabaseToSheet}
            disabled={isPushing || !sheetId}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isPushing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Map Database to Sheet
          </button>
          
          <button 
            onClick={fetchSheetData}
            disabled={isLoading || !sheetId}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading && 'animate-spin'}`} /> Reload
          </button>
          <a 
            href={`https://docs.google.com/spreadsheets/d/${sheetId}`} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <ExternalLink className="w-4 h-4" /> Open Editor
          </a>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-auto">
        {data.length > 0 ? (
          <table className="w-full text-left min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 sticky top-0 z-20">
                {data[0].map((header, i) => (
                  <th key={i} className="px-6 py-4 font-bold whitespace-nowrap bg-slate-50">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 divide-y divide-slate-50">
              {data.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors group">
                  {row.map((cell, colIndex) => (
                    <EditableCell 
                      key={`${rowIndex}-${colIndex}`}
                      initialValue={cell}
                      onUpdate={(val) => {
                        // row index in sheets is +2 (one for header, one for 0-based to 1-based)
                        const sheetRow = rowIndex + 2;
                        // Map column index to Excel-style (A, B... Z, AA, AB...)
                        const getColumnName = (n: number) => {
                          let name = '';
                          while (n >= 0) {
                            name = String.fromCharCode((n % 26) + 65) + name;
                            n = Math.floor(n / 26) - 1;
                          }
                          return name;
                        };
                        const sheetCol = getColumnName(colIndex);
                        api.sheetsUpdate(sheetId, `Sheet1!${sheetCol}${sheetRow}`, [[val]]);
                      }}
                    />
                  ))}
                  {/* Fill remaining empty columns if row is shorter than header */}
                  {Array.from({ length: Math.max(0, data[0].length - row.length) }).map((_, i) => {
                    const colIndex = row.length + i;
                    return (
                      <EditableCell 
                        key={`empty-${rowIndex}-${i}`}
                        initialValue=""
                        onUpdate={(val) => {
                           const sheetRow = rowIndex + 2;
                           const getColumnName = (n: number) => {
                             let name = '';
                             while (n >= 0) {
                               name = String.fromCharCode((n % 26) + 65) + name;
                               n = Math.floor(n / 26) - 1;
                             }
                             return name;
                           };
                           const sheetCol = getColumnName(colIndex);
                           api.sheetsUpdate(sheetId, `Sheet1!${sheetCol}${sheetRow}`, [[val]]);
                        }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-32 bg-slate-50/50">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4 animate-pulse">
               <RefreshCw className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Awaiting Data Synchronisation...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditableCell({ initialValue, onUpdate }: { initialValue: string, onUpdate: (val: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      onUpdate(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <td className="px-6 py-4 p-0">
        <input 
          autoFocus
          className="w-full h-full bg-blue-50 outline-none px-6 py-4 border-2 border-blue-500 rounded text-xs font-medium"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </td>
    );
  }

  return (
    <td 
      className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100/50 transition-colors"
      onClick={() => setIsEditing(true)}
    >
      {value || <span className="opacity-20 italic">empty</span>}
    </td>
  );
}
