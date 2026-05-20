import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, deleteDoc, query, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { google } from "googleapis";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { readFileSync } from "fs";

dotenv.config();

// Load Firebase Config
const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));

import { initializeWhatsAppClient, getWhatsAppStatus, getWhatsAppChats, getWhatsAppMessages, sendWhatsAppMessage, getRawMessage, currentSock } from "./whatsappService";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

initializeWhatsAppClient();

// Initialize Firebase Client SDK (since admin IAM is restricted in this env)
function ensureFirebaseApp() {
  if (getApps().length === 0) {
    console.log("Initializing Firebase Client SDK for Server uses");
    initializeApp(firebaseConfig);
    console.log("Firebase App Initialized.");
  }
}

function getDb() {
  ensureFirebaseApp();
  return getFirestore(getApp(), firebaseConfig.firestoreDatabaseId);
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Gemini Initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// SMTP Transporter Helper
async function getEmailTransporter() {
  const db = getDb();
  const docRef = doc(db, "config", "smtp");
  const configSnap = await getDoc(docRef);
  const smtp = configSnap.exists() ? configSnap.data() : null;

  const host = smtp?.host || process.env.SMTP_HOST;
  const port = parseInt(smtp?.port || process.env.SMTP_PORT || "587");
  const user = smtp?.user || process.env.SMTP_USER;
  const pass = smtp?.pass || process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendAlertEmail(subject: string, html: string) {
  try {
    const transporter = await getEmailTransporter();
    if (!transporter) {
      console.warn("SMTP not configured, skipping email alert.");
      return;
    }

    const db = getDb();
    const settingsSnap = await getDoc(doc(db, "config", "main"));
    const adminEmail = settingsSnap.data()?.adminEmail || process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"Nishan Transport Alerts" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject,
      html,
    });
    console.log("Alert email sent successfully");
  } catch (error) {
    console.error("Failed to send alert email:", error);
  }
}

// Helper for Google Sheets API
async function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

// API Routes

// Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "nishan";

  if (username === adminUser && password === adminPass || (username === "admin" && password === "nishan") || (username === "admin" && password === "admin")) {
    res.json({ success: true, token: "mock-session-token", user: { name: "Nishan Admin", role: "admin" } });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    res.json({ 
      status: "ok", 
      databaseId: firebaseConfig.firestoreDatabaseId || "(default)",
      projectId: firebaseConfig.projectId
    });
  } catch (error: any) {
    res.json({ 
      status: "error", 
      error: error.message,
      databaseId: firebaseConfig.firestoreDatabaseId || "(default)",
      projectId: firebaseConfig.projectId
    });
  }
});

// Google Sheets Proxy
app.post("/api/sheets/read", async (req, res) => {
  const { spreadsheetId, range, accessToken } = req.body;
  
  if (!accessToken) {
    // Return mock data for testing as requested by user to bypass auth
    return res.json({
      values: [
        ["PO #", "PB #", "Truck", "Trailer", "Division", "Req Temp", "Set Point", "Pulp Temp", "Status", "Last Update", "Mishaps", "Truck Notes", "Notes", "Summary"],
        ["mock-po", "mock-pb", "101", "5300", "OUTBOUND", "34", "34", "35", "In Transit", new Date().toISOString(), "", "", "Mock data mode enabled (no Google auth)", "Running mock test mode."]
      ]
    });
  }

  try {
    const sheets = await getSheetsClient(accessToken);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("Sheets Read Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/update", async (req, res) => {
  const { spreadsheetId, range, values, accessToken } = req.body;
  
  if (!accessToken) {
    // Return mock success for testing
    return res.json({ updatedCells: 1, mock: true });
  }

  try {
    const sheets = await getSheetsClient(accessToken);
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("Sheets Update Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets/append", async (req, res) => {
  const { spreadsheetId, range, values, accessToken } = req.body;
  
  if (!accessToken) {
    return res.json({ updates: { updatedRows: 1 }, mock: true });
  }

  try {
    const sheets = await getSheetsClient(accessToken);
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
    res.json(response.data);
  } catch (error: any) {
    console.error("Sheets Append Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Settings Routes
app.get("/api/settings", async (req, res) => {
  try {
    const db = getDb();
    const docSnap = await getDoc(doc(db, "config", "main"));
    if (docSnap.exists()) {
      res.json(docSnap.data());
    } else {
      // Return defaults if not set
      res.json({
        sheetId: '1xDv9ILIvINLnE5JdYIYu8mtO7hbG32gmThklqYY_v9A',
        whatsappNumber: '+1 513 429 8881',
        syncInterval: '5',
        aiModel: 'Gemini 3-Flash (Preview)',
        lowTempThreshold: '32',
        highTempThreshold: '45',
        notifications: true
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const db = getDb();
    await setDoc(doc(db, "config", "main"), req.body, { merge: true });
    res.json({ status: "ok" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/settings/smtp", async (req, res) => {
  try {
    const db = getDb();
    const docSnap = await getDoc(doc(db, "config", "smtp"));
    res.json(docSnap.exists() ? docSnap.data() : { host: '', port: '587', user: '', pass: '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/smtp", async (req, res) => {
  try {
    const db = getDb();
    await setDoc(doc(db, "config", "smtp"), req.body, { merge: true });
    res.json({ status: "ok" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Gemini AI Processing (OCR and Analysis)
app.post("/api/ai/process-message", async (req, res) => {
  const { content, mediaUrl, mimeType } = req.body;

  try {
    const db = getDb();
    // 1. Fetch "Memory" - Recent records to help AI understand patterns
    const nishanSnap = await getDocs(
      query(collection(db, "nishanRecords"), orderBy("lastSeen", "desc"), firestoreLimit(10))
    );
    
    const memory = nishanSnap.docs.map(doc => {
      const data = doc.data();
      // Remove timestamps and other noisy fields to focus on patterns
      const { lastSeen, ...cleanData } = data;
      return cleanData;
    });
    const memoryContext = memory.length > 0 
      ? `\nReference Memory (Recent Loads Patterns):\n${JSON.stringify(memory, null, 2)}`
      : "";

    const prompt = `
      Analyze this logistics message/image for Nishan Transport (powered by Wesrz).
      Nishan is a specialist in Canada-USA cross-border refrigerated transport.
      ${memoryContext}
      
      From logs or images, extract these specific fields:
      - Cust PO (Customer PO number)
      - Nishan PB
      - Truck number
      - Trailer number
      - Division (e.g., INBOND, OUTBOUND, CROSS-BORDER)
      - Required Temp (The target temperature from BOL or instruction)
      - Commodity (e.g., Produce, Frozen, General)
      - Set Point (The actual set point seen on the reefer screen)
      - Pulp Temp (The actual temperature of the product/cargo measured)
      - Mode (e.g., OFF, Continuous, Cycle)
      - Mishaps (Any delays, accidents, or technical failures reported)
      - Truck Notes (Specific instructions or conditions noted for this truck)
      - Notes (Any additional info, specifically note if Required Temp, Set Point, or Pulp Temp don't match)
      - Delivery Date
      - Check Time
      
      MISHAP DETECTION:
      - If required temp is 34F but reefer is at 40F, this is a HIGH ALERT.
      - If pulp temp is significantly higher than required temp, note "Hot Product Received".
      - Identify any damage mentions or delays.
      
      Return as JSON.
    `;

    const parts: any[] = [{ text: prompt }];
    if (content) parts.push({ text: `Message text: ${content}` });
    
    if (req.body.mediaBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: req.body.mediaBase64
        }
      });
    }

    const configSnap = await getDoc(doc(db, "config", "main"));
    const configData = configSnap.exists() ? configSnap.data() : {};
    const aiModelName = configData.aiModel === 'Gemini 1.5 Pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

    let aiClient = ai;
    if (configData.customApiKey) {
      aiClient = new GoogleGenAI({ apiKey: configData.customApiKey });
    }

    const result = await aiClient.models.generateContent({
      model: aiModelName,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            custPo: { type: Type.STRING, nullable: true },
            nishanPb: { type: Type.STRING, nullable: true },
            truck: { type: Type.STRING, nullable: true },
            trailer: { type: Type.STRING, nullable: true },
            division: { type: Type.STRING, nullable: true },
            requiredTemp: { type: Type.STRING, nullable: true },
            commodity: { type: Type.STRING, nullable: true },
            setPoint: { type: Type.STRING, nullable: true },
            pulpTemp: { type: Type.STRING, nullable: true },
            mode: { type: Type.STRING, nullable: true },
            mishaps: { type: Type.STRING, nullable: true },
            truckNotes: { type: Type.STRING, nullable: true },
            notes: { type: Type.STRING, nullable: true },
            deliveryDate: { type: Type.STRING, nullable: true },
            checkTime: { type: Type.STRING, nullable: true },
            initials: { type: Type.STRING, nullable: true },
            activeIncharge: { type: Type.STRING, nullable: true },
            currentTemp: { type: Type.STRING, nullable: true },
            summary: { type: Type.STRING }
          },
          required: ["status", "summary"]
        }
      }
    });

    const parsedData = JSON.parse(result.text || "{}");

    // 3. Alert Logic for Temperature Discrepancy (Set Point & Pulp)
    const target = parseFloat(parsedData.requiredTemp);
    const setPoint = parseFloat(parsedData.setPoint);
    const pulp = parseFloat(parsedData.pulpTemp);
    
    let alertSubject = "";
    let alertBody = "";

    if (!isNaN(target)) {
      if (!isNaN(setPoint) && Math.abs(target - setPoint) > 2) {
        alertSubject = `SET POINT ALERT: Truck ${parsedData.truck || 'Unknown'}`;
        alertBody += `<p>⚠️ <strong>Set Point Deviation:</strong> Reefer is set to ${setPoint}° but BOL requires ${target}°.</p>`;
      }
      if (!isNaN(pulp) && Math.abs(target - pulp) > 2) {
        alertSubject = alertSubject || `PULP TEMP ALERT: Truck ${parsedData.truck || 'Unknown'}`;
        alertBody += `<p>🚨 <strong>Pulp Temp Alert:</strong> Product pulp temp is ${pulp}° but BOL requires ${target}°.</p>`;
      }
    }

    if (alertBody) {
      const alertHtml = `
        <div style="font-family: sans-serif; color: #1e293b;">
          <h2 style="color: #dc2626;">TEMPERATURE DISCREPANCY DETECTED</h2>
          <p><strong>Nishan Transport Dispatch Alert</strong></p>
          <hr/>
          ${alertBody}
          <p><strong>Truck Info:</strong> #${parsedData.truck || 'N/A'} | PO: ${parsedData.custPo || 'N/A'}</p>
          <p><strong>Commodity:</strong> ${parsedData.commodity || 'N/A'}</p>
          <p><strong>Note:</strong> ${parsedData.notes || 'No additional notes'}</p>
          <br/>
          <p style="font-size: 11px; color: #64748b;">This is an automated message from the Nishan AI Systems.</p>
        </div>
      `;
      await sendAlertEmail(alertSubject, alertHtml);
    }

    // 2. Save to "Memory" (Nishan Database)
    if (parsedData.custPo || parsedData.nishanPb) {
      const db = getDb();
      const recordId = parsedData.custPo || parsedData.nishanPb || Date.now().toString();
      await setDoc(doc(db, "nishanRecords", recordId), {
        ...parsedData,
        lastSeen: new Date().toISOString()
      }, { merge: true });
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("AI Processing Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Nishan Database Routes
app.get("/api/nishan/records", async (req, res) => {
  try {
    const db = getDb();
    console.log("Fetching nishanRecords...");
    const snap = await getDocs(
      query(collection(db, "nishanRecords"), orderBy("lastSeen", "desc"), firestoreLimit(50))
    );
    console.log("Fetched records count:", snap.size);
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error: any) {
    console.error("Firestore Fetch error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    res.status(500).json({ 
      error: error.message, 
      code: error.code,
      hint: "This might be a permission issue with the named database. Ensure the project is correctly set up."
    });
  }
});

app.post("/api/nishan/sync-sheet", async (req, res) => {
  const { spreadsheetId, accessToken } = req.body;
  if (!spreadsheetId) {
    return res.status(400).json({ error: "Missing spreadsheetId" });
  }
  
  if (!accessToken) {
     return res.json({ success: true, mock: true, message: "Sync successful (mock mode, no auth)" });
  }

  try {
    const db = getDb();
    const snap = await getDocs(
      query(collection(db, "nishanRecords"), orderBy("lastSeen", "desc"), firestoreLimit(100))
    );
    
    const records = snap.docs.map(doc => doc.data());
    
    // Header
    const values = [
      ["PO #", "PB #", "Truck", "Trailer", "Division", "Req Temp", "Set Point", "Pulp Temp", "Status", "Last Update", "Mishaps", "Truck Notes", "Notes", "Summary"]
    ];

    records.forEach(r => {
      values.push([
        r.custPo || "",
        r.nishanPb || "",
        r.truck || "",
        r.trailer || "",
        r.division || "",
        r.requiredTemp || "",
        r.setPoint || "",
        r.pulpTemp || "",
        r.status || "",
        r.lastSeen || "",
        r.mishaps || "",
        r.truckNotes || "",
        r.notes || "",
        r.summary || ""
      ]);
    });

    const sheets = await getSheetsClient(accessToken);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values },
    });

    res.json({ success: true, count: records.length });
  } catch (error: any) {
    console.error("Master Sync Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Assets Management
app.get("/api/assets", async (req, res) => {
  try {
    const db = getDb();
    const snap = await getDocs(collection(db, "assets"));
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/assets", async (req, res) => {
  try {
    const db = getDb();
    const asset = req.body;
    const id = asset.id || Date.now().toString();
    await setDoc(doc(db, "assets", id), asset, { merge: true });
    res.json({ id, ...asset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/assets/:id", async (req, res) => {
  try {
    const db = getDb();
    await deleteDoc(doc(db, "assets", req.params.id));
    res.json({ status: "deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Agent Chat
app.post("/api/ai/chat", async (req, res) => {
  const { message, context } = req.body;

  try {
    const db = getDb();
    const memorySnap = await getDocs(
      query(collection(db, "nishanRecords"), orderBy("lastSeen", "desc"), firestoreLimit(10))
    );
    
    const memory = memorySnap.docs.map(doc => {
      const data = doc.data();
      const { lastSeen, ...cleanData } = data;
      return { id: doc.id, ...cleanData };
    });
    
    const systemInstruction = `
      You are the Nishan Transport Logistics AI Assistant (powered by Wesrz).
      Nishan Transport is a specialist in road transport (LTL and FTL) for general or refrigerated goods between Canada and the USA.
      
      Historical Data for context:
      ${JSON.stringify(memory, null, 2)}

      Your goals:
      1. Help dispatchers identify temperature discrepancies.
      2. Analyze load patterns for specific trucks or routes.
      3. Provide quick summaries of "mishaps" (delays, temp issues, damage).
      4. Use a professional, efficient tone.
    `;

    const configSnap = await getDoc(doc(db, "config", "main"));
    const configData = configSnap.exists() ? configSnap.data() : {};
    const aiModelName = configData.aiModel === 'Gemini 1.5 Pro' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

    let aiClient = ai;
    if (configData.customApiKey) {
      aiClient = new GoogleGenAI({ apiKey: configData.customApiKey });
    }

    const result = await aiClient.models.generateContent({
      model: aiModelName,
      contents: message,
      config: { systemInstruction }
    });

    res.json({ text: result.text });
  } catch (error: any) {
    console.error("AI Chat Error Details:", error);
    res.status(500).json({ error: error.message, details: error.toString() });
  }
});

// Meta Webhook Placeholder
app.get("/webhook/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Replace with your verify token
  if (mode && token === "shipping_ai_token") {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook/whatsapp", async (req, res) => {
  // Store incoming message in Firestore
  const data = req.body;
  console.log("Received WhatsApp Webhook:", JSON.stringify(data, null, 2));
  
  // Logic to parse Meta payload and save to 'messages' collection
  // ...
  
  res.sendStatus(200);
});

// WhatsApp Runtime Endpoints
app.get("/api/whatsapp/status", (req, res) => {
  res.json(getWhatsAppStatus());
});

app.post("/api/whatsapp/start", (req, res) => {
  const status = getWhatsAppStatus().status;
  if (status === "disconnected") {
    initializeWhatsAppClient().catch(console.error);
    res.json({ result: "started" });
  } else {
    res.json({ result: "already_running" });
  }
});

app.get("/api/whatsapp/chats", (req, res) => {
  res.json(getWhatsAppChats());
});

app.get("/api/whatsapp/chats/:chatId/messages", async (req, res) => {
    try {
        const messages = await getWhatsAppMessages(req.params.chatId);
        res.json(messages);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/whatsapp/chats/:chatId/messages", async (req, res) => {
    try {
        await sendWhatsAppMessage(req.params.chatId, req.body.text);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/whatsapp/chats/:chatId/messages/:messageId/media", async (req, res) => {
    try {
        const rawMessage = getRawMessage(req.params.chatId, req.params.messageId);
        if (!rawMessage || (!rawMessage.message?.imageMessage && !rawMessage.message?.documentMessage)) {
            return res.status(404).send("Media not found");
        }
        
        const buffer = await downloadMediaMessage(
            rawMessage,
            'buffer',
            {},
            { 
               logger: console as any,
               reuploadRequest: currentSock ? currentSock.updateMediaMessage : undefined
            }
        );
        
        const mimeType = rawMessage.message?.imageMessage?.mimetype || rawMessage.message?.documentMessage?.mimetype || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        res.send(buffer);
    } catch (e: any) {
        console.error("Media download error:", e);
        res.status(404).json({ error: "Media unavailable or expired", details: e.message });
    }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(`📦 Node Env: ${process.env.NODE_ENV}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
