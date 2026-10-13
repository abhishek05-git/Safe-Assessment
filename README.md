# SAFE Personality Assessment

A component-driven React application and secure Node.js API designed to administer the **SAFE (Sodhani Academy of Fintech Enablers Ltd.) Personality Assessment**. It maps participants across 5 psychological dimensions to assign one of 16 distinct personality profiles.

---

## 🔒 Security Architecture (Remediation Plan Implemented)

This repository includes both the React participant application and the Node.js Express security API designed for deployment on a single VPS behind Nginx.

- **Server-Side OTP (SEC 01):** Cryptographic 6-digit OTP generation, peppered HMAC-SHA256 hashing, 10-minute expiry, and a maximum of 5 attempts. Plaintext OTP is never exposed in browser responses or client storage.
- **Server-Side Admin Authentication (SEC 02):** Admin password verified using bcrypt hash (`ADMIN_PASSWORD_HASH`) with HttpOnly session cookies.
- **Private Data Relay (SEC 03):** Google Apps Script URL and secrets are completely removed from client-side bundles. Calls between Node and Apps Script validate `GOOGLE_SCRIPT_SHARED_SECRET` server-to-server.
- **Owner-Scoped Approvals (SEC 04):** Participants can only retrieve their own access status. The candidate approval list is strictly restricted to authenticated administrators.
- **Protected State Storage (SEC 05):** Sensitive PII, OTP state, answers, and results are kept out of browser `localStorage`.
- **Authoritative Scoring (SEC 06):** Final assessment calculation runs server-side on `/api/assessment/submit` using the scoring engine (`src/engine/scoring.js`).
- **Abuse Prevention & Audit Trail (SEC 07):** Rate limiting applied to API calls, OTP generation, and admin logins. Administrative events are logged with timestamps and source IPs.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` (never commit your real `.env`):
```bash
cp .env.example .env
```

Configure:
- `SESSION_SECRET`: Long random secret string (32+ chars)
- `OTP_PEPPER`: Long random secret string for OTP hashing
- `ADMIN_PASSWORD_HASH`: Generate with `npm run hash-password "YourAdminPassword"`
- `GOOGLE_SCRIPT_URL`: Private Apps Script deployment URL
- `GOOGLE_SCRIPT_SHARED_SECRET`: Shared secret matching your Apps Script configuration

### 3. Local Development
Run both the React frontend and Node backend:

```bash
# Terminal 1: Node API (runs on http://127.0.0.1:3000)
npm run server

# Terminal 2: Vite Dev Server (proxies /api to 127.0.0.1:3000)
npm run dev
```

### 4. Running Security Verification Tests
```bash
node server/scripts/testSecurityEndpoints.js
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## ☁️ Production Deployment (Hostinger VPS)

See [nginx.conf.example](file:///c:/Users/hp/Desktop/safe-assessment/nginx.conf.example) for the Nginx reverse proxy configuration and [google-sheets-setup.md](file:///c:/Users/hp/Desktop/safe-assessment/google-sheets-setup.md) for the Google Apps Script backend setup.
