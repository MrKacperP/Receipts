import { Router } from 'express';
import dotenv from 'dotenv';
import db from '../db.js';
import { encryptJson } from '../crypto.js';
import { nanoid } from 'nanoid';

dotenv.config();
const DEV_POS_KEY = process.env.DEV_POS_KEY || 'dev_local_pos_key';

const router = Router();

async function storeReceiptAndToken({ payload }) {
  const { ciphertext, iv, tag } = await encryptJson(payload);
  const nonce = Buffer.concat([iv, tag]);
  const result = db.prepare('INSERT INTO receipts (user_id, merchant_id, payload_json, nonce) VALUES (?, ?, ?, ?)')
    .run(null, null, ciphertext, nonce);
  const receiptId = result.lastInsertRowid;
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  db.prepare('INSERT INTO receipt_tokens (token, receipt_id, expires_at) VALUES (?, ?, ?)')
    .run(token, receiptId, expiresAt.toISOString());
  return { receiptId, token };
}

router.post('/mint', async (req, res) => {
  const key = req.headers['x-dev-pos-key'];
  if (!DEV_POS_KEY || key !== DEV_POS_KEY) return res.status(401).json({ error: 'unauthorized' });
  const { receiptPayload } = req.body || {};
  if (!receiptPayload) return res.status(400).json({ error: 'missing_receipt_payload' });
  const { token } = await storeReceiptAndToken({ payload: receiptPayload });
  const shortUrl = `${req.protocol}://${req.get('host')}/r/${token}`;
  return res.json({ ok: true, shortUrl, token });
});

export default router;
