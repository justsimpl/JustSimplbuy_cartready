# JustSimplbuy CartReady

Full-stack e-commerce app: React frontend + FastAPI backend (MongoDB, Redis, Stripe).

## Quick start (local)

1. **Backend** (from repo root):
   ```bash
   cd backend
   cp .env.example .env   # edit with your MONGO_URL, DB_NAME, etc.
   pip install -r requirements.txt
   python -m uvicorn server:app --reload
   ```
   API: http://localhost:8000

2. **Frontend** (from repo root):
   ```bash
   cd frontend
   cp .env.example .env   # set REACT_APP_BACKEND_URL=http://localhost:8000
   npm install
   npm start
   ```
   App: http://localhost:3000

## Build for deployment

- **Frontend only** (static build):
  ```bash
  cd frontend
  npm install --legacy-peer-deps
  npm run build
  ```
  Output: `frontend/build/` — deploy to any static host (Vercel, Netlify, S3, Cloudflare Pages, etc.).

- **Cloudflare Workers** (optional full-stack): tooling lives in `deploy/`:
  ```bash
  cd deploy
  npm install
  npm run deploy
  ```

- **Backend (Railway / Render)**: use the root `Dockerfile` (FastAPI on port 8080). Set `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, and `CORS_ORIGINS` in the host dashboard.

### Railway API deploy

1. Create a service from this repo (branch `main`).
2. In **Settings → Build**, set **Builder** to **Dockerfile** and path `Dockerfile` (repo root).
3. If builds still show Railpack/Node, add service variable: `RAILWAY_DOCKERFILE_PATH=Dockerfile`.
4. Set variables: `MONGO_URL`, `DB_NAME=justsimplbuy`, `JWT_SECRET`, `ENV=production`, `CORS_ORIGINS=https://instabooks.digital,https://www.instabooks.digital`.
5. Health check path: `/api/health`. Railway sets `PORT` automatically.

Alternative: set **Root Directory** to `backend` and use `Dockerfile.prod` (see `backend/railway.toml`).

## Docker deployment

From repo root:

```bash
cp backend/.env.example backend/.env   # edit as needed
docker compose up -d
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000  
- MongoDB: localhost:27017, Redis: localhost:6379

For production, set env (e.g. real `MONGO_URL`, `REDIS_URL`, `JWT_SECRET`, `STRIPE_API_KEY`) and build the frontend with the correct `REACT_APP_BACKEND_URL` (e.g. in `docker-compose.yml` under `frontend.build.args`).

## Environment variables

| Location   | Variable                 | Description                          |
|-----------|--------------------------|--------------------------------------|
| Backend   | `MONGO_URL`              | MongoDB connection string (required) |
| Backend   | `DB_NAME`                | Database name (required)             |
| Backend   | `JWT_SECRET`             | JWT signing secret                   |
| Backend   | `REDIS_URL`              | Redis URL (optional)                 |
| Backend   | `STRIPE_API_KEY`         | Stripe API key (optional)            |
| Backend   | `CORS_ORIGINS`           | Allowed origins (comma-separated)    |
| Frontend  | `REACT_APP_BACKEND_URL`  | Backend API base URL (no trailing /) |

See `backend/.env.example` and `frontend/.env.example` for full lists.

## CI

- **Build** workflow (`.github/workflows/build.yml`): runs on push/PR to `main`/`master` — installs and builds frontend, runs backend tests.
