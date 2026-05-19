import { auth } from '../lib/firebase';

async function getAccessToken() {
  const user = auth.currentUser;
  if (!user) return null;
  // Note: For Google OAuth tokens, we usually get them from the credential result during sign in.
  // We should store them in memory. In AI Studio, we can use a global store or a context.
  return (window as any)._googleAccessToken || null;
}

export const api = {
  async sheetsRead(spreadsheetId: string, range: string) {
    const accessToken = await getAccessToken();
    const res = await fetch('/api/sheets/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, range, accessToken }),
    });
    return res.json();
  },

  async sheetsUpdate(spreadsheetId: string, range: string, values: any[][]) {
    const accessToken = await getAccessToken();
    const res = await fetch('/api/sheets/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, range, values, accessToken }),
    });
    return res.json();
  },

  async processAIMessage(content: string, mediaBase64?: string, mimeType?: string) {
    const res = await fetch('/api/ai/process-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mediaBase64, mimeType }),
    });
    return res.json();
  },

  async aiChat(message: string, context: any) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    });
    return res.json();
  },
  
  async getNishanRecords() {
    const res = await fetch('/api/nishan/records');
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async updateSettings(config: any) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  // SMTP Settings
  async getSmtpConfig() {
    const res = await fetch('/api/settings/smtp');
    return res.json();
  },

  async updateSmtpConfig(config: any) {
    const res = await fetch('/api/settings/smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  // Auth
  async login(credentials: any) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  // Assets
  async getAssets() {
    const res = await fetch('/api/assets');
    return res.json();
  },

  async addAsset(asset: any) {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asset),
    });
    return res.json();
  },

  async deleteAsset(id: string) {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  }
};
