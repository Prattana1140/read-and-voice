# Read and Voice

Frontend lives at the repo root and the API lives in [backend](</c:/Users/jikke/Read and Voice/backend/server.js:1>).

## Run locally

Start the full app with one command from the repo root:

```bash
npm run dev
```

This starts the Vue frontend and the Node backend together, picks free local ports automatically, points the frontend at the active API URL, and uses the local MySQL database configured in `backend/.env`.

For local development, `backend/.env` should use:

```env
DB_MODE=local
DB_SSL=false
DB_SSL_MODE=disable
```

The repo is prepared for a low-cost migration away from Railway:

- frontend on Vercel
- backend on Render
- MySQL on Aiven free tier

Deployment notes live in [docs/deploy-free-stack.md](</c:/Users/jikke/Read and Voice/docs/deploy-free-stack.md:1>).
