import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CornerDownRight } from 'lucide-react';
import { api } from '../services/api';
import ReactMarkdown from 'react-markdown';

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your WESRZ Logistics Dispatch AI. I can help you track trucks, verify BOL receipts, or analyze recent delay reports. What would you like to check?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const context = {
        trucks: [
          { number: '204', driver: 'Michael Scott', status: 'In Transit', location: 'Gary, IN', reefer: '34F' },
          { number: '115', driver: 'Jim Halpert', status: 'Unloading', location: 'Detroit, MI' }
        ],
        alerts: ['Truck 402 inactive for 4 hours']
      };

      const response = await api.aiChat(userMsg, context);
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || 'Process interrupted. Please retry.' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection timed out. System kernel status: OFFLINE.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest">AI Dispatch Assistant</h2>
            <p className="text-[8px] text-slate-400 font-medium">NEURAL LINK v1.0.4</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[8px] font-bold uppercase text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Online
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center border ${
                msg.role === 'user' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-blue-600 border-blue-500 text-white'
              }`}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={`p-4 text-sm rounded-2xl shadow-sm border ${
                msg.role === 'user' 
                  ? 'bg-white border-slate-200 rounded-tr-none text-slate-700' 
                  : 'bg-slate-900 border-slate-800 rounded-tl-none text-slate-200'
              }`}>
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white"><Bot className="h-4 w-4" /></div>
                <div className="p-4 bg-slate-900 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <div className="flex gap-3">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about active shipments, truck status, or OCR results..."
            className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500/20 transition-all text-slate-600"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-blue-100"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
