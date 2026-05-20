import React, { useState } from 'react';
import { Power, Trash2, Edit2, Zap, CornerDownRight, Bot, Sparkles, Loader2, PlusCircle, CheckCircle, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Rules() {
  const [rules, setRules] = useState([
    { id: 1, name: 'Pickup Detection', trigger: 'contains "picked up"', action: 'Update Status to "LOADED"', active: true },
    { id: 2, name: 'Reefer OCR', trigger: 'has image with temperature', action: 'Extract Temp, Output to "Reefer Temp" Column', active: true },
    { id: 3, name: 'BOL Extraction', trigger: 'image recognized as Document/BOL', action: 'Extract PO/PB, Update Sheet', active: true },
    { id: 4, name: 'Temp Alert', trigger: 'Reefer Temp != Required Temp', action: 'Alert Admin immediately', active: true },
  ]);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingRule, setPendingRule] = useState<{ name: string, trigger: string, action: string, active: boolean } | null>(null);

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    
    // Simulate AI parsing rules from prompt
    setTimeout(() => {
      setPendingRule({
        name: 'AI Generated Rule',
        trigger: `When driver mentions: "${aiPrompt.substring(0, 20)}..."`,
        action: 'Update Sheet & Add Note',
        active: true
      });
      setIsGenerating(false);
    }, 1500);
  };

  const handleConfirmRule = () => {
    if (!pendingRule) return;
    setRules([{ ...pendingRule, id: Date.now() }, ...rules]);
    setPendingRule(null);
    setShowSuccess(true);
    setAiPrompt('');
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleCancelRule = () => {
    setPendingRule(null);
  };

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const deleteRule = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Automation Engine</h2>
            <p className="text-xs text-slate-500 font-medium">Logic mapping for incoming driver communications & image analysis</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
            <PlusCircle className="w-4 h-4" /> Manual Rule
          </button>
        </div>

        {/* In-built AI Rule Assistant */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <Bot className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
               <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                 <Sparkles className="w-4 h-4" />
               </div>
               <div>
                 <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Assistant Rule Creator</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Describe what you want to automate</p>
               </div>
            </div>
            
            <div className="flex gap-4">
              <input 
                type="text" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                placeholder="e.g., 'If a driver sends a picture of a POD, extract the signature and update the Google Sheet status to Delivered'"
                className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
              <button 
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiPrompt.trim()}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 whitespace-nowrap flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : showSuccess ? <CheckCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : showSuccess ? 'Rule Created' : 'Create AI Rule'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {pendingRule && (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 shadow-sm relative overflow-hidden ring-2 ring-indigo-500/20"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3 w-full">
                   <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                     <Sparkles className="w-4 h-4" />
                   </div>
                   <input 
                     type="text" 
                     value={pendingRule.name} 
                     onChange={(e) => setPendingRule({ ...pendingRule, name: e.target.value })}
                     className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                   />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-400">Review Trigger Condition</span>
                  <input 
                    type="text" 
                    value={pendingRule.trigger} 
                    onChange={(e) => setPendingRule({ ...pendingRule, trigger: e.target.value })}
                    className="text-xs font-mono bg-white px-3 py-2 rounded-lg border border-indigo-200 text-slate-700 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-400">Review Dispatch Action</span>
                  <textarea 
                    value={pendingRule.action} 
                    onChange={(e) => setPendingRule({ ...pendingRule, action: e.target.value })}
                    rows={2}
                    className="text-xs font-bold text-indigo-700 bg-white px-3 py-2 rounded-lg border border-indigo-200 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-indigo-100/50">
                <button 
                  onClick={handleCancelRule} 
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Discard
                </button>
                <button 
                  onClick={handleConfirmRule} 
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Confirm & Activate
                </button>
              </div>
            </motion.div>
          )}
          {rules.map((rule, i) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={`${rule.id}-${i}`} 
              className={`bg-white border rounded-xl p-6 transition-all ${rule.active ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-50'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${rule.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                     <Zap className="w-4 h-4" />
                   </div>
                   <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{rule.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteRule(rule.id)} className="p-2 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Trigger Condition (AI Prompt parsed)</span>
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
                <button onClick={() => toggleRule(rule.id)} className={`p-1.5 rounded-md transition-colors ${rule.active ? 'text-green-600 hover:bg-green-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
