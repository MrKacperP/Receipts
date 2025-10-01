import { Router } from 'express';
import db from '../db.js';
import bcrypt from 'bcryptjs';
import { signJwt } from '../middleware/auth.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.HOST ? `http://${process.env.HOST}` : ''}${process.env.PORT ? `:${process.env.PORT}` : ''}/auth/google/callback`;

const router = Router();

router.post('/signup', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'email_in_use' });
  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, password_hash);
  const token = signJwt({ id: result.lastInsertRowid, email });
  return res.json({ token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  // DEV admin backdoor: allow email=1 and password=1 to login as admin
  if (email === '1' && password === '1') {
    // Ensure an admin user exists (idempotent)
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@local');
    let user = existing;
    if (!existing) {
      const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run('admin@local', bcrypt.hashSync('admin', 8));
      user = { id: result.lastInsertRowid, email: 'admin@local' };
    }
    const token = signJwt({ id: user.id, email: user.email, role: 'admin' });
    return res.json({ token, admin: true });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
  const token = signJwt({ id: user.id, email: user.email });
  return res.json({ token });
});

// ---- Google OAuth 2.0 (Authorization Code) ----
router.get('/google/start', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: 'google_oauth_not_configured' });
  }
  const state = encodeURIComponent('login');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    include_granted_scopes: 'true',
    access_type: 'online',
    state
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      return res.status(500).send('Google OAuth not configured');
    }
    // Exchange code for tokens
    const params = new URLSearchParams({
      code: String(code),
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      return res.status(400).send(`Token exchange failed: ${txt}`);
    }
    const tokens = await tokenResp.json();
    const accessToken = tokens.access_token;
    // Get user info
    const userResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!userResp.ok) {
      const txt = await userResp.text();
      return res.status(400).send(`Userinfo failed: ${txt}`);
    }
    const profile = await userResp.json();
    const email = profile.email || profile.sub || null;
    if (!email) return res.status(400).send('No email returned');
    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, 'oauth_google');
      user = { id: result.lastInsertRowid, email };
    }
    const token = signJwt({ id: user.id, email: user.email, provider: 'google' });
    // Redirect back to frontend to store token
    const redirect = `${FRONTEND_ORIGIN}/oauth/callback?token=${encodeURIComponent(token)}`;
    return res.redirect(302, redirect);
  } catch (e) {
    return res.status(500).send('Auth error');
  }
});

export default router;
