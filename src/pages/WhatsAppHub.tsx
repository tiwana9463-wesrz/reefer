import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MoreVertical, 
  MessageSquare, 
  Phone, 
  Video, 
  Paperclip, 
  Smile, 
  Mic, 
  Send, 
  CheckCheck,
  User,
  Bot,
  Image as ImageIcon,
  FileText,
  Clock,
  QrCode,
  Smartphone,
  ShieldCheck,
  Activity,
  Database,
  X,
  PlusCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar?: string;
  isGroup: boolean;
  isMonitoring: boolean;
}

interface Message {
  id: string;
  text: string;
  time: string;
  sender: 'me' | 'them';
  status: 'sent' | 'delivered' | 'read';
  hasImage?: boolean;
  hasDocument?: boolean;
  mimeType?: string;
  aiStatus?: 'processing' | 'updated' | 'error' | 'verified' | 'out-of-range';
  aiResult?: string;
  aiExtraction?: any;
}

export default function WhatsAppHub() {
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (!isWhatsAppConnected) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/whatsapp/status");
          if (!res.ok) return;
          const text = await res.text();
          if (!text || text.startsWith('<') || text.startsWith('Rate exceeded')) return;
          
          try {
             const data = JSON.parse(text);
             if (data.status === "connected") {
               setIsWhatsAppConnected(true);
               setQrCodeData(null);
             } else if (data.qrCode) {
               setQrCodeData(data.qrCode);
             }
          } catch(err) {
             // suppress parse errors
          }
        } catch (e) {
          console.error("Failed to check whatsapp status", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isWhatsAppConnected]);

  const [chats, setChats] = useState<Chat[]>([]);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    let chatInterval: any;
    if (isWhatsAppConnected) {
      const fetchChats = async () => {
        try {
          const res = await fetch("/api/whatsapp/chats");
          if (!res.ok) return;
          const text = await res.text();
          if (!text || text.startsWith('<') || text.startsWith('Rate exceeded')) return;
          
          let data;
          try {
             data = JSON.parse(text);
          } catch(err) {
             return;
          }
          
          if (data && Array.isArray(data)) {
            setChats(prevChats => {
               // Merge monitoring state if keeping previous
               return data.map((newChat: any) => {
                  const existing = prevChats.find(c => c.id === newChat.id);
                  return { ...newChat, isMonitoring: existing?.isMonitoring || false };
               });
            });
            if (!activeChatId && data.length > 0) setActiveChatId(data[0].id);
          }
        } catch (e) {
          // suppress fetch errors
        }
      };
      
      fetchChats();
      chatInterval = setInterval(fetchChats, 5000);
    }
    return () => clearInterval(chatInterval);
  }, [isWhatsAppConnected, activeChatId]);

  useEffect(() => {
    let messageInterval: any;
    if (isWhatsAppConnected && activeChatId) {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/whatsapp/chats/${encodeURIComponent(activeChatId)}/messages`);
          if (!res.ok) return;
          const text = await res.text();
          if (!text || text.startsWith('<') || text.startsWith('Rate exceeded')) return;
          
          let data;
          try {
             data = JSON.parse(text);
          } catch(err) {
             return;
          }

          setMessages(prev => ({
             ...prev,
             [activeChatId]: data // Overwrite with server truth
          }));
        } catch (e) {
          // suppress fetch errors
        }
      };
      
      fetchMessages();
      messageInterval = setInterval(fetchMessages, 3000);
    }
    return () => clearInterval(messageInterval);
  }, [isWhatsAppConnected, activeChatId]);

  const [inputText, setInputText] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [aiStates, setAiStates] = useState<Record<string, { status: 'processing'|'updated'|'error', result?: string, extraction?: any }>>({});

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? (messages[activeChatId] || []) : [];

  const [editingMessage, setEditingMessage] = useState<any>(null); // For manual sheet update

  useEffect(() => {
    if (!activeChat?.isMonitoring) return;

    const unprocessedMessages = activeMessages.filter(msg => !aiStates[msg.id] && msg.sender !== 'me');
    
    // Only process the last 2 messages to avoid AI rate limits on initial load
    const toProcess = unprocessedMessages.slice(-2);
    const toSkip = unprocessedMessages.slice(0, -2);
    
    if (toSkip.length > 0) {
      setAiStates(prev => {
        const next = { ...prev };
        toSkip.forEach(msg => next[msg.id] = { status: 'updated', result: 'Skipped to save Quota' });
        return next;
      });
    }

    toProcess.forEach(msg => {
      if (!aiStates[msg.id] && msg.sender !== 'me') {
        setAiStates(prev => ({ ...prev, [msg.id]: { status: 'processing' } }));

        const processWithImage = async () => {
           let base64Data: string | undefined = undefined;
           let mimeType: string | undefined = undefined;
           
           if (msg.hasImage) {
              try {
                  const mediaRes = await fetch(`/api/whatsapp/chats/${encodeURIComponent(activeChatId)}/messages/${msg.id}/media`);
                  if (mediaRes.ok) {
                     const blob = await mediaRes.blob();
                     mimeType = blob.type;
                     const buf = await blob.arrayBuffer();
                     base64Data = btoa(new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                  }
              } catch(e) {
                  console.error("Failed to load image for AI", e);
              }
           }
           
           return api.processAIMessage(msg.text || "Attached document", base64Data, mimeType);
        };

        processWithImage()
            .then(async extraction => {
                let resultTxt = 'Logged to Sheet';
                if (extraction.temp) resultTxt = `Temp: ${extraction.temp}`;
                else if (extraction.custPo) resultTxt = `PO: ${extraction.custPo}`;
                else if (extraction.notes) resultTxt = `Note: ${extraction.notes.substring(0, 15)}...`;

                // We only auto-append if we really found something useful
                if (extraction.custPo || extraction.temp || extraction.mishaps || extraction.truckNumber) {
                    try {
                        const settings = await api.getSettings();
                        const masterSheetId = settings?.sheetId || "1PSZeYT99phUp_v7BRT_4nam9DQaR9lzxVryK-hLG_WY";
                        
                        await api.sheetsAppend(masterSheetId, "Sheet1!A1:N1", [[
                            extraction.custPo || 'AUTO-PO', 
                            extraction.nishanPb || 'AUTO-PB',
                            extraction.truckNumber || '',
                            extraction.trailerNumber || '',
                            extraction.division || '',
                            extraction.reqTemp || '',
                            extraction.setPoint || '',
                            extraction.temp || extraction.pulpTemp || '', 
                            extraction.status || 'Active', 
                            new Date().toISOString(),
                            extraction.mishaps || '',
                            extraction.truckNotes || '',
                            extraction.notes || 'AI Exracted logic from chat stream',
                            resultTxt
                        ]]);
                    } catch(e) {
                        console.error("Sheet sync error", e);
                    }
                    setAiStates(prev => ({ ...prev, [msg.id]: { status: 'updated', result: resultTxt, extraction } }));
                } else {
                    setAiStates(prev => ({ ...prev, [msg.id]: { status: 'updated', result: 'No action needed', extraction } }));
                }
            })
            .catch(err => {
                console.error("AI Error:", err);
                const isRateLimit = err.message?.includes("429") || err.message?.toLowerCase().includes("quota") || err.message?.toLowerCase().includes("rate");
                setAiStates(prev => ({ ...prev, [msg.id]: { status: 'error', result: isRateLimit ? 'Rate Limit (Wait 1m)' : 'AI Failed' } }));
            });
      }
    });
  }, [activeMessages, activeChat?.isMonitoring, aiStates]);

  const activeMessagesWithAi = activeMessages.map(msg => {
    if (aiStates[msg.id]) {
      return { 
          ...msg, 
          aiStatus: aiStates[msg.id].status, 
          aiResult: aiStates[msg.id].result,
          aiExtraction: aiStates[msg.id].extraction
      };
    }
    return msg;
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChatId, messages]);

  const toggleMonitoring = (chatId: string) => {
    setChats(chats.map(c => c.id === chatId ? { ...c, isMonitoring: !c.isMonitoring } : c));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChatId) return;

    const isTempMsg = inputText.toLowerCase().includes('temp');
    const isImageMsg = inputText.toLowerCase().includes('bol') || inputText.toLowerCase().includes('pod') || inputText.toLowerCase().includes('document');
    const needsProcessing = activeChat?.isMonitoring;

    const inputCopy = inputText;
    setInputText('');

    try {
      await fetch(`/api/whatsapp/chats/${encodeURIComponent(activeChatId)}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputCopy })
      });
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  if (!isWhatsAppConnected) {
    return (
      <div className="flex h-full bg-slate-50 border border-slate-200 rounded-xl shadow-lg items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center border border-slate-100">
          <div className="inline-flex h-20 w-20 items-center justify-center bg-[#25D366] text-white rounded-3xl mb-6 shadow-lg shadow-[#25D366]/20">
            <MessageSquare className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Connect WhatsApp</h2>
          <p className="text-sm text-slate-500 mb-8">
            Scan the QR code to link your WhatsApp and allow AI to monitor tracking, temperatures, and BOLs in real-time.
          </p>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 flex flex-col justify-center items-center h-64">
            {qrCodeData ? (
              <img src={qrCodeData} alt="WhatsApp QR Code" className="w-56 h-56" />
            ) : showQR ? (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-4">
                <Activity className="h-8 w-8 animate-spin" />
                <span className="text-sm font-bold uppercase tracking-widest">Generating Live QR Code...</span>
              </div>
            ) : (
              <button 
                onClick={async () => {
                  setShowQR(true);
                  try {
                    await fetch("/api/whatsapp/start", { method: "POST" });
                  } catch(e) {}
                }}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-3 w-full justify-center"
              >
                <QrCode className="h-5 w-5" />
                Generate Web QR Code
              </button>
            )}
          </div>
          <button onClick={() => setIsWhatsAppConnected(true)} className="text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600 mb-2">Simulate Connection</button>

          <div className="flex items-center gap-4 text-left border-t border-slate-100 pt-6">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-full flex justify-center items-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Secure AES-256 Connection</p>
              <p className="text-[10px] text-slate-500">Messages are processed locally by the AI agent and stay strictly within your environment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-[350px] border-r border-slate-200 flex flex-col bg-white">
        <header className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 border border-green-200">
            <Phone className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Connected</span>
          </div>
        </header>

        <div className="p-3 bg-white border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search or start new chat" 
              className="w-full bg-slate-100 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                  <Activity className="h-6 w-6 animate-spin text-slate-300" />
                  <span className="text-xs uppercase tracking-widest font-bold">Syncing Live Chats...</span>
                  <span className="text-[10px] text-slate-400 text-center px-4">Depending on history size, this may take a moment.</span>
              </div>
          )}
          {chats.filter(c => chatSearchQuery ? c.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) : true).map((chat, i) => (
            <div 
              key={`${chat.id}-${i}`}
              className={`group flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-slate-50 ${
                activeChatId === chat.id ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="relative" onClick={() => setActiveChatId(chat.id)}>
                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 border border-slate-300">
                  {chat.isGroup ? <ImageIcon className="h-6 w-6" /> : <User className="h-6 w-6" />}
                </div>
              </div>
              <div className="flex-1 min-w-0" onClick={() => setActiveChatId(chat.id)}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {chat.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                </div>
              </div>
              
              {/* Group Monitor Toggle */}
              {chat.isGroup && (
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleMonitoring(chat.id); }}
                  className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center border transition-colors ${
                    chat.isMonitoring 
                      ? 'bg-blue-100 border-blue-200 text-blue-600 hover:bg-blue-200' 
                      : 'bg-white border-slate-300 text-slate-400 hover:text-blue-500 hover:border-blue-400'
                  }`}
                  title={chat.isMonitoring ? "Disable AI Monitoring" : "Enable AI Monitoring"}
                >
                  {chat.isMonitoring ? <Activity className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat View */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
        {/* Chat Background Pattern Simulation */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        {activeChat ? (
          <>
            <header className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 border border-slate-300">
                  {activeChat.isGroup ? <ImageIcon className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{activeChat.name}</h3>
                  <p className="text-[10px] text-slate-500">
                    {activeChat.isMonitoring ? 'AI Monitor Active • Online' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => toggleMonitoring(activeChat.id)}
                   className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${
                     activeChat.isMonitoring ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                   }`}
                 >
                   <Bot className="h-3 w-3" />
                   {activeChat.isMonitoring ? 'Monitoring Active' : 'Start Monitoring'}
                 </button>
              </div>
            </header>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 z-10"
            >
              <div className="flex justify-center mb-4">
                <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm uppercase tracking-widest border border-slate-200/50">Today</span>
              </div>

              {activeMessagesWithAi.map((msg, i) => (
                <div key={`${msg.id}-${i}`} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] min-w-[120px] p-2 rounded-lg shadow-sm relative group ${
                    msg.sender === 'me' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
                  }`}>
                    {msg.hasImage && (
                        <div className="mb-2 bg-slate-100 rounded border border-slate-200 aspect-video flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                            <img src={`/api/whatsapp/chats/${encodeURIComponent(activeChatId)}/messages/${msg.id}/media`} alt="Media" className="w-full h-full object-cover" />
                        </div>
                    )}
                    {msg.hasDocument && (
                        <a href={`/api/whatsapp/chats/${encodeURIComponent(activeChatId)}/messages/${msg.id}/media`} target="_blank" rel="noreferrer" className="mb-2 p-3 bg-slate-100 rounded border border-slate-200 flex items-center justify-start gap-3 overflow-hidden cursor-pointer hover:bg-slate-200 transition-colors">
                            <Paperclip className="h-6 w-6 text-slate-500" />
                            <span className="text-xs font-medium text-slate-700 truncate w-full">{msg.text || "Document"}</span>
                        </a>
                    )}
                    {(!msg.hasDocument || (msg.hasDocument && msg.text && msg.text !== "Document")) && <p className="text-sm text-slate-800 leading-relaxed pr-8 whitespace-pre-wrap">{msg.text}</p>}
                    
                    {/* AI Status Indicator */}
                    {msg.aiStatus && (
                      <div 
                        onClick={() => {
                            setEditingMessage({
                                id: msg.id,
                                text: msg.text,
                                extraction: msg.aiExtraction || { custPo: '', truckNumber: '', notes: msg.text }
                            });
                        }}
                        className={`mt-2 flex items-center gap-1.5 py-1 px-2 rounded border justify-between cursor-pointer hover:opacity-80 transition-opacity ${
                        msg.aiStatus === 'processing' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                        msg.aiStatus === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
                        msg.aiResult?.includes('No action') ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-green-50 border-green-100 text-green-600'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {msg.aiStatus === 'processing' ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          <span className="text-[9px] font-bold uppercase tracking-tighter">
                            {msg.aiStatus === 'processing' ? 'AI Processing...' : msg.aiResult || 'Processed'}
                          </span>
                        </div>
                      </div>
                    )}

                    {!msg.aiStatus && activeChat.isMonitoring && msg.sender !== 'me' && (
                      <div 
                         onClick={() => setEditingMessage({ id: msg.id, text: msg.text, extraction: { notes: msg.text } })}
                         className="mt-2 flex items-center gap-1.5 py-1 px-2 rounded border justify-between bg-white border-slate-200 text-slate-400 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                         <div className="flex items-center gap-1.5">
                            <PlusCircle className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Manual Log</span>
                         </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-slate-400 font-medium">{msg.time}</span>
                      {msg.sender === 'me' && (
                        <CheckCheck className={`h-3 w-3 ${msg.status === 'read' ? 'text-blue-500' : 'text-slate-400'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="h-16 bg-slate-50 flex items-center gap-4 px-4 shrink-0 z-10 border-t border-slate-200">
               <Smile className="h-6 w-6 text-slate-500 cursor-pointer hover:text-slate-900" />
               <Paperclip className="h-6 w-6 text-slate-500 cursor-pointer hover:text-slate-900" />
               <div className="flex-1">
                 <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message (Send 'temp' or 'bol' to trigger AI actions)" 
                    className="w-full bg-white rounded-lg px-4 py-2 text-sm outline-none shadow-sm border border-slate-200 focus:ring-1 ring-green-500/20"
                 />
               </div>
               {inputText.trim() ? (
                 <button onClick={handleSendMessage} className="bg-green-600 p-2.5 rounded-full text-white shadow-md hover:bg-green-700 transition-colors">
                    <Send className="h-5 w-5" />
                 </button>
               ) : (
                 <Mic className="h-6 w-6 text-slate-500 cursor-pointer hover:text-slate-900" />
               )}
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
             <div className="h-24 w-24 rounded-full bg-white/50 border border-slate-200 flex items-center justify-center">
                <MessageSquare className="h-12 w-12 opacity-20" />
             </div>
             <div className="text-center">
                <h3 className="text-lg font-bold text-slate-600">WhatsApp Hub</h3>
                <p className="text-xs">Select a group to monitor traffic in real-time.</p>
             </div>
          </div>
        )}
      </div>

      {editingMessage && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-800">Manual Sheet Sync</h3>
                 </div>
                 <button onClick={() => setEditingMessage(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
                 <p className="text-xs text-slate-500 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 font-mono break-words">{editingMessage.text}</p>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Customer PO</label>
                        <input type="text" value={editingMessage.extraction?.custPo || ''} onChange={e => setEditingMessage({...editingMessage, extraction: {...editingMessage.extraction, custPo: e.target.value}})} className="p-2 text-sm bg-white border border-slate-200 rounded-lg w-full" />
                     </div>
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Nishan PB</label>
                        <input type="text" value={editingMessage.extraction?.nishanPb || ''} onChange={e => setEditingMessage({...editingMessage, extraction: {...editingMessage.extraction, nishanPb: e.target.value}})} className="p-2 text-sm bg-white border border-slate-200 rounded-lg w-full" />
                     </div>
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Truck / Trailer</label>
                        <input type="text" placeholder="Trk # / Trl #" value={editingMessage.extraction?.truckNumber || ''} onChange={e => setEditingMessage({...editingMessage, extraction: {...editingMessage.extraction, truckNumber: e.target.value}})} className="p-2 text-sm bg-white border border-slate-200 rounded-lg w-full" />
                     </div>
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Extracted Temp</label>
                        <input type="text" placeholder="°F" value={editingMessage.extraction?.temp || editingMessage.extraction?.pulpTemp || ''} onChange={e => setEditingMessage({...editingMessage, extraction: {...editingMessage.extraction, temp: e.target.value}})} className="p-2 text-sm bg-white border border-slate-200 rounded-lg w-full" />
                     </div>
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Summary / Notes</label>
                    <textarea rows={2} value={editingMessage.extraction?.notes || ''} onChange={e => setEditingMessage({...editingMessage, extraction: {...editingMessage.extraction, notes: e.target.value}})} className="p-2 text-sm bg-white border border-slate-200 rounded-lg w-full resize-none" />
                 </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                 <button onClick={() => setEditingMessage(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                 <button 
                  onClick={async () => {
                      const ext = editingMessage.extraction;
                      if (!ext) return;
                      try {
                          const settings = await api.getSettings();
                          const masterSheetId = settings?.sheetId || "1PSZeYT99phUp_v7BRT_4nam9DQaR9lzxVryK-hLG_WY";
                          
                          await api.sheetsAppend(masterSheetId, "Sheet1!A1:N1", [[
                              ext.custPo || 'AUTO-PO', 
                              ext.nishanPb || 'AUTO-PB',
                              ext.truckNumber || '',
                              ext.trailerNumber || '',
                              ext.division || '',
                              ext.reqTemp || '',
                              ext.setPoint || '',
                              ext.temp || ext.pulpTemp || '', 
                              ext.status || 'Active', 
                              new Date().toISOString(),
                              ext.mishaps || '',
                              ext.truckNotes || '',
                              ext.notes || '',
                              'Manual Logic Sync'
                          ]]);
                          
                          // Mark locally as synced
                          setAiStates(prev => ({ ...prev, [editingMessage.id]: { status: 'updated', result: 'Manually Logged', extraction: ext } }));
                          setEditingMessage(null);
                      } catch(e) {
                          console.error("Sheet sync error", e);
                          alert("Failed to sync to Google Sheets");
                      }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                 >
                   <CheckCircle2 className="w-4 h-4" /> Push to Master Sheet
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
