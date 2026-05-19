import React, { useState } from 'react';
import { Send, Image as ImageIcon, Camera, UploadCloud, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';

interface Message {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  status: string;
  mediaUrl?: string;
}

export default function LiveMessages() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'Driver (204)', text: 'Arrived at pickup. Waiting for dock at Tyson.', timestamp: '10:00 AM', status: 'In Sheet' },
    { id: 2, sender: 'Driver (115)', text: 'Uploaded BOL for load #5521.', timestamp: '10:15 AM', status: 'OCR Active', mediaUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400' },
  ]);
  const [simText, setSimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!simText.trim() && !attachedMedia) return;
    setIsProcessing(true);
    
    try {
      const aiData = await api.processAIMessage(simText);
      const newMsg: Message = {
        id: Date.now(),
        sender: 'Simulator',
        text: simText || (attachedMedia ? 'Sent an image' : ''),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: `AI: ${aiData.status}`,
        mediaUrl: attachedMedia || undefined
      };
      setMessages(prev => [newMsg, ...prev]);
      
      const truckMatch = simText.match(/truck\s*(\d+)/i);
      const truckNumber = truckMatch ? truckMatch[1] : 'UNK';
      const sheetId = '1PSZeYT99phUp_v7BRT_4nam9DQaR9lzxVryK-hLG_WY';
      
      await api.sheetsUpdate(sheetId, 'Sheet1!A10:F10', [[
        truckNumber, 'Bot', aiData.status, aiData.reeferTemp || '-', newMsg.timestamp, aiData.summary
      ]]);

      setSimText('');
      setAttachedMedia(null);
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMockMedia = () => {
    if (attachedMedia) {
      setAttachedMedia(null);
    } else {
      setAttachedMedia('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=800');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 h-full relative">
      {/* Live Stream */}
      <div className="lg:col-span-6 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">WhatsApp Operations Stream</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {messages.map(msg => (
            <div key={msg.id} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-xs text-slate-900">{msg.sender}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{msg.timestamp}</span>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 italic leading-relaxed">
                {msg.text}
              </p>
              
              {msg.mediaUrl && (
                <div className="mt-3 relative group">
                  <img 
                    src={msg.mediaUrl} 
                    alt="Media Attachment" 
                    onClick={() => setSelectedImage(msg.mediaUrl!)}
                    className="w-full max-w-[200px] aspect-video object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                     <div className="flex items-center gap-1 text-[10px] text-white font-bold bg-black/50 w-fit px-2 py-0.5 rounded backdrop-blur-sm">
                        <ZoomIn className="w-3 h-3" /> View Large
                     </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    msg.status.includes('AI') ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-green-50 border-green-200 text-green-600'
                }`}>
                  {msg.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation & Review Panel */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-4">Device Emulator</h3>
          <div className="flex flex-col gap-4">
            <textarea 
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              placeholder="e.g. Truck 204 loaded and leaving for Chicago"
              className="w-full p-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-500/20 transition-all min-h-[120px]"
            />
            
            {attachedMedia && (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-blue-200 shadow-sm">
                <img src={attachedMedia} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setAttachedMedia(null)}
                  className="absolute top-1 right-1 p-1 bg-white/80 hover:bg-white rounded-full text-red-500 shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex gap-2">
               <button 
                onClick={toggleMockMedia}
                className={`flex-1 flex items-center justify-center p-2.5 rounded-lg transition-colors border ${
                  attachedMedia ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
               >
                 <ImageIcon className="w-5 h-5 mr-2" />
                 <span className="text-[10px] font-bold uppercase">Attach</span>
               </button>
               <button className="flex-1 bg-slate-50 border border-slate-200 flex items-center justify-center p-2.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                 <Camera className="w-5 h-5 mr-2" />
                 <span className="text-[10px] font-bold uppercase">Camera</span>
               </button>
            </div>
            
            <button 
              onClick={handleSimulate}
              disabled={isProcessing}
              className="w-full py-4 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-blue-100"
            >
              {isProcessing ? 'AI Agent Processing...' : <><Send className="w-4 h-4" /> Inject Message</>}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
           <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Latest OCR Extraction</h3>
           <div className="flex gap-4">
             <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-500 italic border border-slate-700 overflow-hidden">
               <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=100" alt="BOL" className="w-full h-full object-cover opacity-50" />
             </div>
             <div className="flex-1 space-y-2">
                <div className="bg-slate-800 p-2 rounded border border-slate-700 text-[10px] font-mono">
                  <span className="text-blue-400">STATUS:</span> LOADED
                </div>
                <div className="bg-slate-800 p-2 rounded border border-slate-700 text-[10px] font-mono">
                  <span className="text-blue-400">TEMP:</span> 34.2 F
                </div>
                <button className="w-full text-[9px] font-bold uppercase tracking-widest bg-blue-600 py-1.5 rounded hover:bg-blue-700 transition-colors">Validate</button>
             </div>
           </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedImage} alt="Full view" className="w-full h-full object-contain" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
