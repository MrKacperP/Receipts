import { Router } from 'express';
import db from '../db.js';
import { validateHmac } from '../middleware/hmac.js';
import { encryptJson } from '../crypto.js';
import { nanoid } from 'nanoid';

const router = Router();

async function storeReceiptAndToken({ userId, merchantId, payload }) {
  const { ciphertext, iv, tag } = await encryptJson(payload);
  const nonce = Buffer.concat([iv, tag]);
  // To keep MVP simple and avoid FK issues, store null for user/merchant here.
  const result = db.prepare('INSERT INTO receipts (user_id, merchant_id, payload_json, nonce) VALUES (?, ?, ?, ?)')
    .run(null, null, ciphertext, nonce);
  const receiptId = result.lastInsertRowid;
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  db.prepare('INSERT INTO receipt_tokens (token, receipt_id, expires_at) VALUES (?, ?, ?)')
    .run(token, receiptId, expiresAt.toISOString());
  return { receiptId, token };
}

router.post('/nfc', validateHmac, async (req, res) => {
  const verified = req.hmacVerified ? 1 : 0;
  db.prepare('INSERT INTO webhook_logs (payload, verified) VALUES (?, ?)')
    .run(JSON.stringify(req.body || {}), verified);
  if (!req.hmacVerified) return res.status(400).json({ error: 'invalid_signature' });

  const { receiptPayload, userId, merchantId } = req.body || {};
  if (!receiptPayload) return res.status(400).json({ error: 'missing_receipt_payload' });
  const { token } = await storeReceiptAndToken({ userId, merchantId, payload: receiptPayload });
  const shortUrl = `${req.protocol}://${req.get('host')}/r/${token}`;
  return res.json({ ok: true, shortUrl, token });
});

router.post('/qr', validateHmac, async (req, res) => {
  const verified = req.hmacVerified ? 1 : 0;
  db.prepare('INSERT INTO webhook_logs (payload, verified) VALUES (?, ?)')
    .run(JSON.stringify(req.body || {}), verified);
  if (!req.hmacVerified) return res.status(400).json({ error: 'invalid_signature' });

  const { receiptPayload, userId, merchantId } = req.body || {};
  if (!receiptPayload) return res.status(400).json({ error: 'missing_receipt_payload' });
  const { token } = await storeReceiptAndToken({ userId, merchantId, payload: receiptPayload });
  const shortUrl = `${req.protocol}://${req.get('host')}/r/${token}`;
  // For QR flow, client may render QR for this URL
  return res.json({ ok: true, shortUrl, token });
});

export default router;
