import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { decryptJson } from '../crypto.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const rows = db.prepare('SELECT id, merchant_id, created_at FROM receipts WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  return res.json({ receipts: rows });
});

router.get('/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT id, merchant_id, payload_json, nonce, created_at FROM receipts WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  try {
    const data = await decryptJson(row.payload_json, row.nonce.slice(0,12), row.nonce.slice(12));
    return res.json({ id: row.id, merchant_id: row.merchant_id, created_at: row.created_at, payload: data });
  } catch (e) {
    return res.status(500).json({ error: 'decrypt_failed' });
  }
});

export default router;
