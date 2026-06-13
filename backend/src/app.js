// backend/src/app.js
// Production-ready Express API for Mood Map AI
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const pino = require('pino');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Coerce SYSTEM_PROMPT into a plain string, accepting either a bare string
// or a legacy JSON object of the form {"role":"system","content":"..."}.
function resolveSystemPrompt(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      if (typeof obj?.content === 'string') return obj.content;
    } catch {
      // fall through and use as plain text
    }
  }
  return trimmed;
}

const SYSTEM_PROMPT = resolveSystemPrompt(process.env.SYSTEM_PROMPT) ||
  'You are a compassionate mental-health companion. Listen carefully, respond briefly (1-2 sentences), and on the last line of your reply return ONLY a JSON object of the form {"mood_score": <0-10 integer>, "reply": "<your reply>"}. The reply field must contain ONLY the conversational text, with no JSON inside it.';

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ----------------------------------------------------------------------------
// Bootstrap external services
// ----------------------------------------------------------------------------
function loadFirebase() {
  // Two supported ways: inline JSON, or path to a file
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!fs.existsSync(path)) throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${path}`);
    const raw = fs.readFileSync(path, 'utf8');
    credential = admin.credential.cert(JSON.parse(raw));
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH is required');
  }
  admin.initializeApp({ credential });
}

try {
  loadFirebase();
} catch (e) {
  logger.error({ err: e.message }, 'Firebase init failed');
  process.exit(1);
}

if (!process.env.SUPABASE_URL) {
  logger.error('SUPABASE_URL is required');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ----------------------------------------------------------------------------
// App
// ----------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin / curl / mobile clients have no Origin header — allow
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
        return cb(null, true);
      }
      return cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
  })
);

// Trust proxy when behind nginx/load balancer
app.set('trust proxy', 1);

// Rate limiting: protects OpenRouter budget
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 chat requests / minute / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down a moment.' },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// ----------------------------------------------------------------------------
// Auth middleware
// ----------------------------------------------------------------------------
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // { uid, email, ... }
    return next();
  } catch (e) {
    logger.warn({ err: e.message }, 'Token verification failed');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ----------------------------------------------------------------------------
// Health & readiness
// ----------------------------------------------------------------------------
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ----------------------------------------------------------------------------
// Profile (auto-provision on first authenticated call)
// ----------------------------------------------------------------------------
app.get('/api/profile', verifyToken, async (req, res) => {
  const uid = req.user.uid;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, created_at')
      .eq('id', uid)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      const { data: created, error: insErr } = await supabase
        .from('profiles')
        .insert({
          id: uid,
          email: req.user.email,
          display_name: req.user.name || null,
        })
        .select('id, email, display_name, created_at')
        .single();
      if (insErr) throw insErr;
      return res.json(created);
    }
    return res.json(data);
  } catch (e) {
    logger.error({ err: e.message }, 'profile lookup failed');
    return res.status(500).json({ error: 'Could not load profile' });
  }
});

// ----------------------------------------------------------------------------
// History
// ----------------------------------------------------------------------------
app.get('/api/history', verifyToken, async (req, res) => {
  const uid = req.user.uid;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('timestamp, mood_score, ai_reply, user_message')
      .eq('user_id', uid)
      .order('timestamp', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return res.json(data || []);
  } catch (e) {
    logger.error({ err: e.message }, 'history fetch failed');
    return res.status(500).json({ error: 'Could not load history' });
  }
});

// ----------------------------------------------------------------------------
// Chat
// ----------------------------------------------------------------------------
app.post('/api/chat', verifyToken, chatLimiter, async (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'message too long (max 2000 chars)' });
  }

  const userId = req.user.uid;
  const cleanMessage = message.trim();

  // Load recent history (last 3 exchanges) for context
  let context = [];
  try {
    const { data: history, error: histErr } = await supabase
      .from('check_ins')
      .select('user_message, ai_reply')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(3);
    if (histErr) throw histErr;
    context = (history || [])
      .reverse()
      .flatMap((row) => [
        { role: 'user', content: row.user_message },
        { role: 'assistant', content: row.ai_reply },
      ]);
  } catch (e) {
    logger.warn({ err: e.message }, 'history load failed; continuing without context');
  }

  // Ensure profile row exists
  try {
    await supabase
      .from('profiles')
      .upsert(
        { id: userId, email: req.user.email, display_name: req.user.name || null },
        { onConflict: 'id', ignoreDuplicates: true }
      );
  } catch (e) {
    logger.warn({ err: e.message }, 'profile upsert failed');
  }

  const primary = process.env.OPENROUTER_API_KEY
    ? await tryOpenRouter({ cleanMessage, context })
    : null;

  if (primary) {
    return persistAndRespond(supabase, userId, cleanMessage, primary, res);
  }

  // Fallback to Cloudflare Worker
  if (process.env.CF_WORKER_URL) {
    try {
      const fb = await fetch(process.env.CF_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanMessage, history: context }),
      });
      if (!fb.ok) throw new Error(`CF worker ${fb.status}`);
      const fbJson = await fb.json();
      const parsed = parseLLMJson(fbJson.reply || JSON.stringify(fbJson));
      if (!parsed) throw new Error('CF worker returned unparseable reply');
      return persistAndRespond(supabase, userId, cleanMessage, parsed, res);
    } catch (e) {
      logger.error({ err: e.message }, 'fallback LLM failed');
    }
  }

  return res.status(503).json({ error: 'All LLM providers unavailable' });
});

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
async function tryOpenRouter({ cleanMessage, context }) {
  const payload = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...context,
      { role: 'user', content: cleanMessage },
    ],
  };
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:5173',
        'X-Title': 'Mood Map AI',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`openrouter ${resp.status}`);
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('openrouter: empty content');
    const parsed = parseLLMJson(content);
    if (!parsed) throw new Error('openrouter: could not parse JSON from reply');
    return parsed;
  } catch (e) {
    logger.warn({ err: e.message }, 'openrouter failed');
    return null;
  }
}

function parseLLMJson(text) {
  // Try direct parse, then extract {...} block
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(text);
  if (!parsed) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = tryParse(m[0]);
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const mood = Number(parsed.mood_score ?? parsed.moodScore ?? parsed.score);
  const reply = String(parsed.reply ?? parsed.response ?? '').trim();
  if (!Number.isFinite(mood) || mood < 0 || mood > 10) return null;
  if (!reply) return null;
  return { mood_score: Math.round(mood), reply };
}

async function persistAndRespond(supabase, userId, message, parsed, res) {
  try {
    const { error: insErr } = await supabase.from('check_ins').insert({
      user_id: userId,
      timestamp: new Date().toISOString(),
      user_message: message,
      ai_reply: parsed.reply,
      mood_score: parsed.mood_score,
      gossip_triggered: parsed.mood_score <= 4,
      prompt_used: OPENROUTER_MODEL,
    });
    if (insErr) throw insErr;
  } catch (e) {
    logger.error({ err: e.message }, 'check-in insert failed');
    // Still respond to the user; data persistence failure shouldn't block UX
  }
  return res.json(parsed);
}

// ----------------------------------------------------------------------------
// Error handlers
// ----------------------------------------------------------------------------
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error({ err: err.message, stack: err.stack }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => logger.info(`Backend listening on :${PORT} (${NODE_ENV})`));
