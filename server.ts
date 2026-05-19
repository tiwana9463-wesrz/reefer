import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Initialize Firebase Admin
function ensureFirebaseApp() {
  if (getApps().length === 0) {
    initializeApp();
  }
}

function getDb() {
  try {
    ensureFirebaseApp();
    return getFirestore();
  } catch (error) {
    console.error("Firestore initialization failed:", error);
    throw error;
  }
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
  const config = await db.collection("config").doc("smtp").get();
  const smtp = config.exists ? config.data() : null;

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
    const settings = await db.collection("config").doc("main").get();
    const adminEmail = settings.data()?.adminEmail || process.env.SMTP_USER;

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
  const adminPass = process.env.ADMIN_PASSWORD || "nishan123";

  if (username === adminUser && password === adminPass) {
    res.json({ success: true, token: "mock-session-token", user: { name: "Nishan Admin" } });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Google Sheets Proxy
app.post("/api/sheets/read", async (req, res) => {
  const { spreadsheetId, range, accessToken } = req.body;
  if (!accessToken) return res.status(401).json({ error: "No access token provided" });

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
  if (!accessToken) return res.status(401).json({ error: "No access token provided" });

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

// Settings Routes
app.get("/api/settings", async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection("config").doc("main").get();
    if (doc.exists) {
      res.json(doc.data());
    } else {
      // Return defaults if not set
      res.json({
        sheetId: '1PSZeYT99phUp_v7BRT_4nam9DQaR9lzxVryK-hLG_WY',
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
    await db.collection("config").doc("main").set(req.body, { merge: true });
    res.json({ status: "ok" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/settings/smtp", async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection("config").doc("smtp").get();
    res.json(doc.exists ? doc.data() : { host: '', port: '587', user: '', pass: '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/smtp", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("config").doc("smtp").set(req.body, { merge: true });
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
    const nishanSnap = await db.collection("nishanRecords")
      .orderBy("lastSeen", "desc")
      .limit(10)
      .get();
    
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
      
      From logs or images, extract these specific fields:
      - Cust PO (Customer PO number)
      - Nishan PB
      - Truck number
      - Trailer number
      - Division (e.g., INBOND, OUTBOUND)
      - Required Temp (The target temperature from BOL or instruction)
      - Commodity (e.g., CELERY, Tomato, Peppers, Corn)
      - Set Point (The actual set point seen on the reefer screen)
      - Mode (e.g., OFF, Continuous, Cycle)
      - Notes (Any additional info, specifically note if Required Temp and Set Point don't match)
      - Delivery Date
      - Check Time
      - Initials
      - Active Incharge
      - Current Temperature (Actual ambient temp seen on screen)
      
      CRITICAL ANALYSIS:
      - Compare "Required Temp" (from papers) and "Set Point" (on machine).
      - If they are different, add a clear warning in the "Notes" field.
      - Total Status (Arrived, Loaded, In Transit, etc.)
      
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

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
            mode: { type: Type.STRING, nullable: true },
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

    // 3. Alert Logic for Temperature Discrepancy
    if (parsedData.requiredTemp && parsedData.setPoint) {
      const target = parseFloat(parsedData.requiredTemp);
      const actual = parseFloat(parsedData.setPoint);
      if (!isNaN(target) && !isNaN(actual) && Math.abs(target - actual) > 1) {
        // Temperature Discrepancy!
        const alertHtml = `
          <h2>⚠️ TEMPERATURE DISCREPANCY ALERT</h2>
          <p><strong>Truck:</strong> ${parsedData.truck || 'Unknown'}</p>
          <p><strong>BOL Required Temp:</strong> ${parsedData.requiredTemp}°</p>
          <p><strong>Reefer Set Point:</strong> ${parsedData.setPoint}°</p>
          <p><strong>Difference:</strong> ${Math.abs(target - actual)}°</p>
          <p><strong>Note:</strong> ${parsedData.notes || 'No notes'}</p>
          <hr/>
          <p>This alert was generated automatically by Nishan AI Automation.</p>
        `;
        await sendAlertEmail(`TEMP ALERT: Truck ${parsedData.truck || 'Unknown'}`, alertHtml);
      }
    }

    // 2. Save to "Memory" (Nishan Database)
    if (parsedData.custPo || parsedData.nishanPb) {
      const db = getDb();
      const recordId = parsedData.custPo || parsedData.nishanPb || Date.now().toString();
      await db.collection("nishanRecords").doc(recordId).set({
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
    const snap = await db.collection("nishanRecords")
      .orderBy("lastSeen", "desc")
      .limit(50)
      .get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assets Management
app.get("/api/assets", async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection("assets").get();
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
    await db.collection("assets").doc(id).set(asset, { merge: true });
    res.json({ id, ...asset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/assets/:id", async (req, res) => {
  try {
    const db = getDb();
    await db.collection("assets").doc(req.params.id).delete();
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
    const memorySnap = await db.collection("nishanRecords")
      .orderBy("lastSeen", "desc")
      .limit(10)
      .get();
    
    const memory = memorySnap.docs.map(doc => {
      const data = doc.data();
      const { lastSeen, ...cleanData } = data;
      return { id: doc.id, ...cleanData };
    });
    
    const systemInstruction = `
      You are the Nishan Transport Logistics AI Assistant (powered by Wesrz).
      Historical Data (Nishan Memory) for pattern analysis:
      ${JSON.stringify(memory, null, 2)}

      Active Context:
      ${JSON.stringify(context, null, 2)}

      User will ask questions about shipments, truck status, or historical patterns. 
      Use the Historical Data to find similarities or trends if the user asks for patterns.
      Professional, concise, and helpful responses only. Use markdown tables for data.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: { systemInstruction }
    });

    res.json({ text: result.text });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error.message });
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
