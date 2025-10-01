import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const keyPromise = new Promise((resolve, reject) => {
  const secret = process.env.JWT_SECRET || 'supersecret';
  crypto.scrypt(secret, 'receipt_salt', 32, (err, key) => {
    if (err) reject(err); else resolve(key);
  });
});

export async function encryptJson(obj) {
  const key = await keyPromise;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export async function decryptJson(ciphertext, iv, tag) {
  const key = await keyPromise;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}
