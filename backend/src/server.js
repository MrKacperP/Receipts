import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import authRoutes from './routes/auth.js';
import receiptsRoutes from './routes/receipts.js';
import receiptTokenRoutes from './routes/receiptToken.js';
import webhookRoutes from './routes/webhooks.js';
import devposRoutes from './routes/devpos.js';

dotenv.config();

const app = express();

// Capture raw body for HMAC while still parsing JSON
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(cors({ origin: '*'}));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/receipts', receiptsRoutes);
app.use('/r', receiptTokenRoutes);
app.use('/webhook', webhookRoutes);
app.use('/devpos', devposRoutes);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Backend listening on http://${HOST}:${PORT}`);
});
