# DearCode AI

DearCode AI is a full-stack multi-persona chat app with account-based auth, persistent conversation history, persona-isolated memory, and real SSE streaming from the backend.

It is built as:
- a React + Vite client
- an Express + MongoDB server
- persona-specific chat logic for `girlfriend`, `bestfriend`, and `motivator`
- account + guest memory migration
- password reset email delivery through either Gmail SMTP or Resend

## What It Does

- Chat with separate AI personas that keep isolated histories
- Stream replies token-by-token over SSE via `POST /api/chat/stream`
- Persist conversations in MongoDB
- Store global memory and persona-specific emotional memory
- Support account auth with register, login, logout, session bootstrap, forgot-password, and reset-password
- Merge guest-local memory/workspace state into the authenticated account after sign-in
- Support lightweight file attachment context in chat input

## Current Status

Implemented:
- real backend SSE streaming
- auth flow on backend and frontend
- forgot-password and reset-password flow
- Gmail SMTP or Resend email delivery
- guest-to-account migration for memory and workspace preferences
- frontend E2E coverage for main auth/chat flows
- Mongo-backed server integration tests

Still intentionally optional or limited:
- live OpenRouter contract testing is opt-in, not part of normal local test runs
- Gmail SMTP is a temporary practical fallback; verified-domain email is still the cleaner long-term production setup

## Tech Stack

### Client
- React 19
- Vite 7
- Zustand
- Playwright

### Server
- Node.js 18+
- Express 4
- MongoDB + Mongoose
- bcryptjs
- helmet
- cors
- express-rate-limit
- nodemailer

## Project Structure

```text
DearCode-Ai/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── tests/e2e/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   └── package.json
└── README.md
```

## API Overview

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/memory`
- `POST /api/auth/sync-memory`

### Chat
- `POST /api/chat/stream`
- `GET /api/chat/models`

### Conversations
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id`
- `GET /api/conversations/:id/messages`
- `PATCH /api/conversations/:id`
- `DELETE /api/conversations/:id`

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure the server

Create `server/.env` with at least:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/dearcode-ai
OPENROUTER_API_KEY=your_openrouter_key
AUTH_SESSION_SECRET=use_a_long_random_secret_here
CLIENT_URL=http://localhost:5173
```

### Email setup

Use either Gmail SMTP or Resend.

#### Option A: Gmail SMTP

```env
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your_google_app_password
```

Notes:
- `GMAIL_APP_PASSWORD` is not your normal Gmail password
- you need Google 2-Step Verification enabled

#### Option B: Resend

```env
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

Notes:
- `RESEND_FROM_EMAIL` should be a verified sender/domain in Resend

### 3. Configure the client

If needed, create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

The client handles either:
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_API_URL=http://localhost:5000/api/chat`

### 4. Run the app

Server:

```bash
cd server
npm run dev
```

Client:

```bash
cd client
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Testing

### Server unit/integration tests

```bash
cd server
npm test
```

### Mongo-backed integration tests

These are implemented, but only run when enabled:

```bash
cd server
RUN_DB_TESTS=1 npm test
```

Why:
- normal test runs skip DB-backed suites in restricted environments
- the suites still exist and pass when Mongo memory server can bind locally

### Optional live OpenRouter contract test

This validates the real upstream streaming contract and is intentionally opt-in:

```bash
cd server
RUN_OPENROUTER_CONTRACT_TESTS=1 npm test
```

### Client checks

```bash
cd client
npm run lint
npm run build
```

### Frontend E2E tests

```bash
cd client
npx playwright test
```

Covered flows:
- signup + chat + logout
- login-only
- forgot-password + `/reset-password`
- attachment-only send
- persona switching + history restoration

## CI

There is a GitHub Actions workflow for provider-level OpenRouter contract testing:

```text
.github/workflows/openrouter-contract.yml
```

To use it:
- add `OPENROUTER_API_KEY` as a GitHub Actions secret
- optionally add `OPENROUTER_CONTRACT_MODEL` as a repo variable

It supports:
- manual runs via `workflow_dispatch`
- scheduled weekly runs

## Important Behavior Notes

### Password reset flow

The intended UX is:
1. User clicks `Forgot password`
2. Server sends reset email
3. User opens the mail
4. User clicks the secure reset link
5. App opens `/reset-password?resetToken=...`
6. User sets a new password

The reset form is meant to be entered through the email link, not manually as the normal user path.

### Guest-to-account migration

On successful login/signup/reset:
- guest global memory is merged into the user account
- guest workspace preferences are migrated to the account
- user-scoped memory/workspace snapshots are restored on future sessions

## Security Notes

The server includes:
- signed session cookies
- auth-specific rate limiting
- password reset throttling
- login lockout after repeated failed attempts
- production config validation for auth/email settings

Recommended for production:
- use a strong `AUTH_SESSION_SECRET`
- use HTTPS
- prefer a verified-domain sender over temporary Gmail SMTP

## Known Limitations

- OpenRouter live contract coverage is opt-in, not part of normal local tests
- Gmail SMTP is useful for temporary delivery, but Resend + verified domain is the cleaner long-term setup
- some deeper production concerns like CSRF strategy and broader monitoring can still be expanded further

## Scripts

### Server

```bash
npm run dev
npm run start
npm run lint
npm test
```

### Client

```bash
npm run dev
npm run build
npm run lint
npm run preview
npm run test:e2e
```
