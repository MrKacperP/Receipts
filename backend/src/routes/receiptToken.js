import { Router } from 'express';
import db from '../db.js';
import { decryptJson } from '../crypto.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/:token', async (req, res) => {
  const { token } = req.params;
  const row = db.prepare('SELECT r.id, r.merchant_id, r.payload_json, r.nonce, r.created_at, t.expires_at FROM receipt_tokens t JOIN receipts r ON r.id = t.receipt_id WHERE t.token = ?').get(token);
  if (!row) return res.status(404).json({ error: 'invalid_token' });
  const now = new Date();
  if (new Date(row.expires_at) < now) return res.status(410).json({ error: 'token_expired' });
  try {
    const data = await decryptJson(row.payload_json, row.nonce.slice(0,12), row.nonce.slice(12));
    return res.json({ id: row.id, merchant_id: row.merchant_id, created_at: row.created_at, payload: data });
  } catch (e) {
    return res.status(500).json({ error: 'decrypt_failed' });
  }
});

// Claim a receipt to the authenticated user's inbox
router.post('/:token/claim', authRequired, (req, res) => {
  const { token } = req.params;
  const row = db.prepare('SELECT receipt_id, expires_at FROM receipt_tokens WHERE token = ?').get(token);
  if (!row) return res.status(404).json({ error: 'invalid_token' });
  if (new Date(row.expires_at) < new Date()) return res.status(410).json({ error: 'token_expired' });
  // Attach the receipt to the user
  db.prepare('UPDATE receipts SET user_id = ? WHERE id = ?').run(req.user.id, row.receipt_id);
  return res.json({ ok: true, receipt_id: row.receipt_id });
});

export default router;
