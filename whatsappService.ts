import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import fs from "fs";
import { Boom } from "@hapi/boom";
import pino from "pino";

let qrCodeDataUrl: string | null = null;
let currentStatus = "disconnected";

// Custom in-memory store
const STORE_PATH = './baileys_store_multi.json';
const store = {
    chats: new Map<string, any>(),
    messages: new Map<string, any[]>(),
};

try {
    if (fs.existsSync(STORE_PATH)) {
        const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        if (data.chats) {
            for (const [k, v] of Object.entries(data.chats)) store.chats.set(k, v);
        }
        if (data.messages) {
            for (const [k, v] of Object.entries(data.messages)) store.messages.set(k, v as any[]);
        }
    }
} catch (e) {
    console.error("Failed to load store:", e);
}

setInterval(() => {
    try {
        const data = {
            chats: Object.fromEntries(store.chats),
            messages: Object.fromEntries(store.messages)
        };
        fs.writeFileSync(STORE_PATH, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save store:", e);
    }
}, 10_000);

// Make socket available globally internally
export let currentSock: any = null;

export async function initializeWhatsAppClient() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: true,
        logger: pino({ level: 'fatal' })
    });
    
    currentSock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messaging-history.set", (history) => {
        for (const chat of history.chats) {
            store.chats.set(chat.id, chat);
        }
        for (const msg of history.messages) {
            const chatId = msg.key.remoteJid;
            if (chatId) {
                const msgs = store.messages.get(chatId) || [];
                msgs.push(msg);
                store.messages.set(chatId, msgs);
            }
        }
    });

    sock.ev.on("contacts.upsert", (contacts) => {
        for (const contact of contacts) {
             const existingChat = store.chats.get(contact.id);
             if (existingChat) {
                 store.chats.set(contact.id, { ...existingChat, name: contact.name || contact.notify || existingChat.name });
             } else {
                 store.chats.set(contact.id, { id: contact.id, name: contact.name || contact.notify });
             }
        }
    });

    sock.ev.on("chats.upsert", (newChats) => {
        for (const c of newChats) {
            store.chats.set(c.id, c);
        }
    });

    sock.ev.on("chats.update", (updates) => {
        for (const update of updates) {
            if (update.id && store.chats.has(update.id)) {
                store.chats.set(update.id, { ...store.chats.get(update.id), ...update });
            }
        }
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeDataUrl = await QRCode.toDataURL(qr);
            currentStatus = "waiting_for_scan";
        }

        if (connection === "close") {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            currentStatus = "disconnected";
            qrCodeDataUrl = null;
            if (shouldReconnect) {
                console.log("Connection closed, reconnecting in 3s...", statusCode);
                setTimeout(() => {
                    initializeWhatsAppClient();
                }, 3000);
            } else {
                console.log("Logged out. Remove auth_info_baileys to reconnect.");
                try {
                    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                } catch(e) {}
            }
        } else if (connection === "open") {
            currentStatus = "connected";
            qrCodeDataUrl = null;
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        console.log("Messages upsert: ", m.messages.length);
        for (const msg of m.messages) {
            const chatId = msg.key.remoteJid;
            if (chatId) {
                const msgs = store.messages.get(chatId) || [];
                msgs.push(msg);
                store.messages.set(chatId, msgs);
            }
        }
    });
}

export function getWhatsAppStatus() {
    return { status: currentStatus, qrCode: qrCodeDataUrl };
}

export function getWhatsAppChats() {
    // Collect all chat IDs from the store.chats map AND store.messages keys
    const chatIds = new Set<string>();
    for (const key of store.chats.keys()) chatIds.add(key);
    for (const key of store.messages.keys()) chatIds.add(key);

    return Array.from(chatIds).map(chatId => {
        const chat = store.chats.get(chatId) || { id: chatId };
        let name = chat.name || chat.id;
        if (name.includes('@g.us')) name = "Group " + name.substring(0, 5);
        else if (name.includes('@s.whatsapp.net')) name = "+" + name.split('@')[0];

        const isGroup = chatId.endsWith('@g.us');
        
        // Find most recent message to derive timestamp if missing
        const msgs = store.messages.get(chatId) || [];
        let timestamp = chat.conversationTimestamp || 0;
        let lastMessageStr = "Active";
        if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            const msgTime = (lastMsg.messageTimestamp as number) || 0;
            if (msgTime > timestamp) timestamp = msgTime;
            
            lastMessageStr = lastMsg.message?.conversation || lastMsg.message?.extendedTextMessage?.text || (lastMsg.message?.imageMessage ? "Image received" : lastMessageStr);
        }

        return {
            id: chatId,
            name: name,
            lastMessage: lastMessageStr,
            unread: chat.unreadCount || 0,
            isGroup: isGroup,
            time: timestamp ? new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
            timestamp: timestamp
        };
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function sendWhatsAppMessage(chatId: string, text: string) {
    if (!currentSock) throw new Error("WhatsApp not connected");
    await currentSock.sendMessage(chatId, { text });
}

export function getRawMessage(chatId: string, messageId: string) {
    const messages = store.messages.get(chatId) || [];
    return messages.find(m => m.key.id === messageId);
}

export async function getWhatsAppMessages(chatId: string) {
    if (!currentSock) return [];
    const messages = store.messages.get(chatId) || [];
    return messages.map(m => {
        const isFromMe = m.key.fromMe || false;
        let text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.documentMessage?.fileName || "";
        let hasImage = !!m.message?.imageMessage;
        let hasDocument = !!m.message?.documentMessage;
        let mimeType = m.message?.imageMessage?.mimetype || m.message?.documentMessage?.mimetype || "";
        let sender = isFromMe ? "me" : "them";
        return {
            id: m.key.id,
            text,
            time: new Date((m.messageTimestamp as number) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender,
            hasImage,
            hasDocument,
            mimeType,
            status: 'read'
        };
    }).filter(m => m.text || m.hasImage || m.hasDocument);
}
