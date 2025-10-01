import axios from 'axios'
import crypto from 'crypto'
import QRCode from 'qrcode'

/**
 * sendReceipt
 * @param {Object} opts
 * @param {string} opts.backendUrl - e.g. http://localhost:5000
 * @param {string} opts.merchantPrivateKey - shared HMAC secret
 * @param {Object} opts.receiptPayload - { merchant, items:[{name, price}], total, timestamp }
 * @param {number} opts.userId - user receiving the receipt (optional for public links)
 * @param {number} opts.merchantId - merchant id (optional)
 */
export async function sendReceipt({ backendUrl, merchantPrivateKey, receiptPayload, userId, merchantId }){
  const body = { receiptPayload, userId, merchantId }
  const raw = JSON.stringify(body)
  const signature = crypto.createHmac('sha256', merchantPrivateKey).update(raw).digest('hex')
  const { data } = await axios.post(`${backendUrl}/webhook/nfc`, body, { headers: { 'X-Signature': signature }})
  return data // { ok, shortUrl, token }
}

/**
 * generateReceiptQR
 * Generates a QR that encodes the short link, for terminals without NFC.
 * @param {string} shortUrl
 * @returns {Promise<string>} data URL PNG
 */
export async function generateReceiptQR(shortUrl){
  return QRCode.toDataURL(shortUrl, { margin: 1, width: 256 })
}
