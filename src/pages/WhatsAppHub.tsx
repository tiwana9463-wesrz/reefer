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
  Clock
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
  aiStatus?: 'processing' | 'updated' | 'error' | 'verified' | 'out-of-range';
  aiResult?: string;
}

export default function WhatsAppHub() {
  const [chats, setChats] = useState<Chat[]>([
    { id: '1', name: 'Nishan 7149 - Chicago', lastMessage: 'Arrived at pickup. Waiting for dock.', time: '10:42 AM', unread: 2, isGroup: true, isMonitoring: true },
    { id: '2', name: 'Nishan Fleet 7139 - NY', lastMessage: 'Attached BOL for load #5521', time: '09:15 AM', unread: 0, isGroup: true, isMonitoring: false },
    { id: '3', name: 'Jim Halpert (Driver)', lastMessage: 'Copy that.', time: 'Yesterday', unread: 0, isGroup: false, isMonitoring: false },
    { id: '4', name: 'Nishan Group 7144', lastMessage: 'Leaving Miami now.', time: '07:20 AM', unread: 0, isGroup: true, isMonitoring: true },
  ]);

  const [activeChatId, setActiveChatId] = useState<string>('1');
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    '1': [
      { id: 'm1', text: 'Morning everyone, load #552611 is ready for pickup.', time: '08:00 AM', sender: 'them', status: 'read', aiStatus: 'updated', aiResult: 'Updated Sheet' },
      { id: 'm2', text: 'On my way to Tyson.', time: '08:15 AM', sender: 'them', status: 'read', aiStatus: 'updated', aiResult: 'Route Verified' },
      { id: 'm3', text: 'Arrived at pickup. Waiting for dock.', time: '10:42 AM', sender: 'them', status: 'read', aiStatus: 'processing' },
    ],
    '2': [
      { id: 'm4', text: 'Please send the BOL.', time: '09:00 AM', sender: 'me', status: 'read' },
      { id: 'm5', text: 'Attached BOL for load #5521', time: '09:15 AM', sender: 'them', status: 'read', hasImage: true, aiStatus: 'verified', aiResult: 'BOL Verified' },
    ]
  });

  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = messages[activeChatId] || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChatId, messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me',
      status: 'sent'
    };

    // Update messages state
    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));
    setInputText('');

    // Simulate AI response for monitored groups
    if (activeChat?.isMonitoring) {
        setTimeout(async () => {
            const replyMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Status Update: " + (inputText.toLowerCase().includes('bol') ? "Attached BOL for reference." : "Arrived at destination."),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sender: 'them',
                status: 'read',
                aiStatus: 'processing'
            };

            setMessages(prev => ({
                ...prev,
                [activeChatId]: [...(prev[activeChatId] || []), replyMsg]
            }));

            // Real AI & Sheet Integration Simulation
            try {
                // Call Gemini for extraction
                const extraction = await api.processAIMessage(replyMsg.text);
                
                // Master Sheet Update
                const masterSheetId = "1PSZeYT99phUp_v7BRT_4nam9DQaR9lzxVryK-hLG_WY";
                await api.sheetsUpdate(masterSheetId, "Sheet1!A50:Z50", [[
                    Date.now().toString(), 
                    extraction.custPo || 'AUTO', 
                    extraction.truck || '7149', 
                    extraction.status || 'Active', 
                    replyMsg.text
                ]]);

                // Success Indicator Transition
                setTimeout(() => {
                    setMessages(prev => {
                        const chatMsgs = [...(prev[activeChatId] || [])];
                        const msgIndex = chatMsgs.findIndex(m => m.id === replyMsg.id);
                        if (msgIndex !== -1) {
                            chatMsgs[msgIndex] = {
                                ...chatMsgs[msgIndex],
                                aiStatus: 'updated',
                                aiResult: 'Updated Sheet'
                            };
                        }
                        return { ...prev, [activeChatId]: chatMsgs };
                    });
                }, 1500);
            } catch (error) {
                console.error("AI Flow failed", error);
                setMessages(prev => {
                    const chatMsgs = [...(prev[activeChatId] || [])];
                    const msgIndex = chatMsgs.findIndex(m => m.id === replyMsg.id);
                    if (msgIndex !== -1) {
                        chatMsgs[msgIndex] = { ...chatMsgs[msgIndex], aiStatus: 'error', aiResult: 'Sync Failed' };
                    }
                    return { ...prev, [activeChatId]: chatMsgs };
                });
            }
        }, 1000);
    }
  };

  return (
    <div className="flex h-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-[350px] border-r border-slate-200 flex flex-col bg-white">
        <header className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
            <User className="h-6 w-6" />
          </div>
          <div className="flex gap-4 text-slate-500">
             <MessageSquare className="h-5 w-5 cursor-pointer hover:text-slate-900" />
             <MoreVertical className="h-5 w-5 cursor-pointer hover:text-slate-900" />
          </div>
        </header>

        <div className="p-3 bg-white border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search or start new chat" 
              className="w-full bg-slate-100 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-slate-50 ${
                activeChatId === chat.id ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 border border-slate-300">
                  {chat.isGroup ? <ImageIcon className="h-6 w-6" /> : <User className="h-6 w-6" />}
                </div>
                {chat.isMonitoring && (
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {chat.name}
                    {chat.isMonitoring && <span className="ml-2 text-[8px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded uppercase tracking-tighter">Monitoring</span>}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <span className="h-5 w-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
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
              <div className="flex gap-6 text-slate-500">
                <Video className="h-5 w-5 cursor-pointer hover:text-slate-900" />
                <Phone className="h-5 w-5 cursor-pointer hover:text-slate-900" />
                <Search className="h-5 w-5 cursor-pointer hover:text-slate-900 border-l border-slate-200 pl-4 ml-2" />
                <MoreVertical className="h-5 w-5 cursor-pointer hover:text-slate-900" />
              </div>
            </header>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 z-10"
            >
              <div className="flex justify-center mb-4">
                <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm uppercase tracking-widest border border-slate-200/50">Today</span>
              </div>

              {activeMessages.map((msg, i) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] min-w-[120px] p-2 rounded-lg shadow-sm relative group ${
                    msg.sender === 'me' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
                  }`}>
                    {msg.hasImage && (
                        <div className="mb-2 bg-slate-100 rounded border border-slate-200 aspect-video flex flex-col items-center justify-center gap-2 overflow-hidden">
                            <ImageIcon className="h-8 w-8 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BOL_EXTRACT.JPG</span>
                        </div>
                    )}
                    <p className="text-sm text-slate-800 leading-relaxed pr-8">{msg.text}</p>
                    
                    {/* AI Status Indicator */}
                    {msg.aiStatus && (
                      <div className={`mt-2 flex items-center gap-1.5 py-1 px-2 rounded border ${
                        msg.aiStatus === 'processing' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                        msg.aiStatus === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
                        'bg-green-50 border-green-100 text-green-600'
                      }`}>
                        <div className="shrink-0">
                          {msg.aiStatus === 'processing' ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">
                          {msg.aiStatus === 'processing' ? 'AI Processing...' : msg.aiResult || 'Processed'}
                        </span>
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
                    placeholder="Type a message" 
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
    </div>
  );
}
