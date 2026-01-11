# Project Setup

This repository contains a Node/Express backend and a Vite React frontend.

## Prerequisites

- Node.js 18+
- npm

## Install

```bash
# From repository root
npm install
npm --prefix frontend/vite-project install
```

## Environment

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

## Run (development)

```bash
# Start backend only
npm run dev

# Start frontend only
npm --prefix frontend/vite-project run dev

# Start both concurrently
npm run serve
```

Backend runs on http://localhost:5000. Frontend runs on http://localhost:5173 and proxies `/api` to the backend.

## Routes

- GET `/` → API server status
- GET `/api/health` → health check

## Build (frontend)

```bash
npm --prefix frontend/vite-project run build
```

Output is in `frontend/vite-project/dist`.

## Notes

- Routers, controllers, and models directories are scaffolded; add your routes under `routers/` and wire them in `index.js`.
- Adjust the Vite proxy in `frontend/vite-project/vite.config.js` if your backend port changes.
