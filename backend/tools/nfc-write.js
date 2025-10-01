#!/usr/bin/env node
import { NFC, NDEFWriter } from 'nfc-pcsc'

const url = process.argv[2]
if (!url) {
  console.error('Usage: node tools/nfc-write.js <url>')
  process.exit(1)
}

console.log('Bring an NFC tag close to the reader to write URL:', url)

const nfc = new NFC()

nfc.on('reader', reader => {
  console.log(`Reader detected: ${reader.reader.name}`)
  reader.aid = 'F222222222'

  reader.on('card', async card => {
    console.log('Card detected', card)
    try {
      // Build simple NDEF message with a single URL record
      const writer = new NDEFWriter()
      const message = [
        { tnf: 1, type: Buffer.from('U'), payload: encodeUrl(url) }
      ]
      await writer.write(message, { reader })
      console.log('Wrote URL to tag successfully.')
    } catch (err) {
      console.error('Write failed:', err)
    }
  })

  reader.on('error', err => console.error('Reader error', err))
  reader.on('end', () => console.log('Reader removed'))
})

nfc.on('error', err => console.error('NFC error', err))

function encodeUrl(urlStr){
  // NDEF RTD URI record: first byte is URI identifier code (0x00 = no prefix)
  const urlBuf = Buffer.from(urlStr, 'utf8')
  const payload = Buffer.alloc(1 + urlBuf.length)
  payload[0] = 0x00
  urlBuf.copy(payload, 1)
  return payload
}
