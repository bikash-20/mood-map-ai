// backend/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(cors());
app.use(express.json());

// Middleware to verify Firebase ID token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // uid, email, etc.
    next();
  } catch (e) {
    logger.error(e);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Auth routes (email/password handled on client via Firebase JS SDK)
app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    // Insert user profile into Supabase
    const { error } = await supabase.from('users').insert({ id: userRecord.uid, email, created_at: new Date().toISOString() });
    if (error) throw error;
    const token = await admin.auth().createCustomToken(userRecord.uid);
    res.json({ token });
  } catch (e) {
    logger.error(e);
    res.status(400).json({ error: e.message });
  }
});

app.post('/auth/login', async (req, res) => {
  // In typical Firebase flow, client obtains ID token via JS SDK; this endpoint can be a placeholder.
  res.status(501).json({ error: 'Use Firebase client SDK for login' });
});

// Placeholder OAuth routes (to be implemented later)
app.get('/auth/google', (req, res) => res.status(501).json({ error: 'Google OAuth not implemented yet' }));
app.get('/auth/github', (req, res) => res.status(501).json({ error: 'GitHub OAuth not implemented yet' }));

// Chat endpoint
app.post('/chat', verifyToken, async (req, res) => {
  const { message } = req.body;
  const userId = req.user.uid;
  // Fetch recent conversation (last 3 messages) from Supabase
  const { data: history, error: histErr } = await supabase
    .from('check_ins')
    .select('user_message, ai_reply')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);
  if (histErr) {
    logger.error(histErr);
    return res.status(500).json({ error: 'DB error' });
  }
// Build chat context with user and assistant messages in correct order
 const context = history.reverse().flatMap(row => [
   { role: 'user', content: row.user_message },
   { role: 'assistant', content: row.ai_reply },
 ]);

  // Build OpenRouter payload
  const payload = {
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct',
    messages: [
      { role: 'system', content: process.env.SYSTEM_PROMPT },
      ...context,
      { role: 'user', content: message },
    ],
  };
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error('OpenRouter error');
    const json = await resp.json();
    const aiMessage = json.choices[0].message.content.trim();
    const data = JSON.parse(aiMessage); // expects { mood_score, reply }
    // Store check‑in
    const { error: insertErr } = await supabase.from('check_ins').insert({
      user_id: userId,
      timestamp: new Date().toISOString(),
      user_message: message,
      ai_reply: data.reply,
      mood_score: data.mood_score,
      gossip_triggered: data.mood_score <= 4,
      prompt_used: null,
    });
    if (insertErr) throw insertErr;
    res.json({ mood_score: data.mood_score, reply: data.reply });
  } catch (e) {
    logger.warn('OpenRouter failed, falling back to Cloudflare Worker');
    // Call fallback worker
    try {
      const fallbackResp = await fetch(process.env.CF_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: context }),
      });
      const fbJson = await fallbackResp.json();
      const { mood_score, reply } = fbJson;
      const { error: insertErr } = await supabase.from('check_ins').insert({
        user_id: userId,
        timestamp: new Date().toISOString(),
        user_message: message,
        ai_reply: reply,
        mood_score,
        gossip_triggered: mood_score <= 4,
        prompt_used: null,
      });
      if (insertErr) throw insertErr;
      res.json({ mood_score, reply });
    } catch (fallbackErr) {
      logger.error(fallbackErr);
      res.status(500).json({ error: 'Both primary and fallback LLM calls failed' });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Backend listening on port ${PORT}`));
