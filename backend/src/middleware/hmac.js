import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const HMAC_SECRET = process.env.HMAC_SECRET || 'merchant_shared_secret';

export function validateHmac(req, res, next) {
  const signatureHeader = req.headers['x-signature'] || req.headers['x-hmac-signature'];
  if (!signatureHeader) return res.status(400).json({ error: 'missing_signature' });

  try {
    const body = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
    const expectedHex = crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex');
    // Decode as hex; if invalid hex, Buffer.from will throw, catch below
    const a = Buffer.from(expectedHex, 'hex');
    let b;
    try {
      b = Buffer.from(String(signatureHeader), 'hex');
    } catch {
      req.hmacVerified = false;
      return next();
    }
    // timingSafeEqual requires equal length
    if (a.length !== b.length) {
      req.hmacVerified = false;
      return next();
    }
    req.hmacVerified = crypto.timingSafeEqual(a, b);
    return next();
  } catch (e) {
    // On any error, mark as unverified but don't crash the request
    req.hmacVerified = false;
    return next();
  }
}
