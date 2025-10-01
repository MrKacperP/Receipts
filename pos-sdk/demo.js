import { sendReceipt, generateReceiptQR } from './index.js'

async function main(){
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'
  const merchantPrivateKey = process.env.HMAC_SECRET || 'merchant_shared_secret'

  const receiptPayload = {
    merchant: 'Demo Coffee',
    items: [ { name: 'Americano', price: 350 }, { name: 'Croissant', price: 425 } ],
    total: 775,
    timestamp: new Date().toISOString()
  }

  const { shortUrl, token } = await sendReceipt({ backendUrl, merchantPrivateKey, receiptPayload, userId: null, merchantId: 1 })
  console.log('Short URL:', shortUrl)
  console.log('Token:', token)

  const qr = await generateReceiptQR(shortUrl)
  console.log('QR DataURL (paste into browser to view):')
  console.log(qr)
}

main().catch(err => { console.error(err); process.exit(1) })
