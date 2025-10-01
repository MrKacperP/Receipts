# Boleks Receipt App (MVP)

Minimal full-stack MVP to accept signed receipts from POS (Apple Pay / Google Pay flows), issue short-lived receipt links, and display/save receipts in a modern web UI.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express + better-sqlite3 (SQLite for dev)
- Auth: JWT (localStorage on frontend)
- Webhooks: HMAC signature validation
- Receipt storage: encrypted JSON (AES-256-GCM), immutable

## Monorepo Structure
```
/bol eks-receipt-app/
  backend/
  frontend/
  pos-sdk/
```
## Features added
- Admin quick login: on Login page, click "Admin quick login" (dev only). Backend accepts email=1, password=1 and creates an `admin@local` user.
- Google Sign-In: Login page has "Continue with Google" which redirects to `/auth/google/start`. Configure env vars below.
- POS can write NFC: After minting, click "Write to NFC tag" (supported on Android Chrome). The tag will contain the dynamic viewer link.


### Prerequisites
- Node.js 18+

### Environment
Create `backend/.env` based on `backend/.env.example`:
```
JWT_SECRET=supersecret
DB_URL=sqlite://./dev.sqlite
HMAC_SECRET=merchant_shared_secret
# Google OAuth
FRONTEND_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
PORT=5000
```

### Install & Run
```
# Backend
cd backend
npm install
npm run dev

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

Backend runs on http://localhost:5000
Frontend runs on http://localhost:5173

### Database
On first backend start, the SQLite DB is created and migrations are applied automatically.

## Testing
- Import `BoleksReceiptApp.postman_collection.json` into Postman/Insomnia
- Use `Auth > Signup` then `Auth > Login` to obtain JWT
- Use `Webhooks > Push NFC` to simulate a receipt push from a POS
- Open the returned short link in your browser or use the frontend `Receipt Viewer` route `/r/:token`

## POS/Terminal SDK
See `pos-sdk/index.js` for `sendReceipt()` example. It signs payloads with HMAC and POSTs to the backend `/webhook/nfc`. It can also generate a QR that encodes the short link when NFC is unavailable.

## Security Notes
- No raw PAN/card numbers are stored; only receipt details.
- Always use TLS in production.
- Secrets must be set via environment variables.

## Future
- Swap SQLite for PostgreSQL
- Optional Stripe/Adyen tokenization
