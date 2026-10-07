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
| Backend   | `SHOPIFY_STORE_DOMAIN`   | e.g. `my-store.myshopify.com` (optional, enables "Send to Shopify") |
| Backend   | `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | Credentials of a Shopify Dev Dashboard app with `write_products` (optional) |
| Backend   | `SHOPIFY_ADMIN_ACCESS_TOKEN` | Alternative: token from an older admin-created custom app (optional) |
| Backend   | `SHOPIFY_API_VERSION`    | Shopify Admin API version (optional, default `2026-07`) |
| Frontend  | `REACT_APP_BACKEND_URL`  | Backend API base URL (no trailing /) |

See `backend/.env.example` and `frontend/.env.example` for full lists.

## Locked out of the admin panel?

Password-reset emails are not wired up yet, so reset the password straight in the database
with `backend/manage_admin.py`. You need the same `MONGO_URL` the live site uses
(MongoDB Atlas → Connect → Drivers, or your Railway / Cloudflare secrets):

```bash
pip install pymongo bcrypt python-dotenv
export MONGO_URL='mongodb+srv://USER:PASS@cluster.mongodb.net'
export DB_NAME=justsimplbuy

python backend/manage_admin.py --list                    # which admin accounts exist
python backend/manage_admin.py --email you@example.com   # reset (or create) an admin; prompts for the password
```

Then sign in at `/admin/login`. Passwords need 8+ characters with at least one letter and one number.

## Importing products from other websites

Admin → **Products** → **Import from URL**. Paste one or more product page links (one per line),
pick a category and an optional price markup, and click **Fetch product details**. You can edit the
title/price and leave out any images before importing. Data is read from, in order:

1. **Shopify stores** – the store's `/products/<handle>.json` (all images, price, compare-at price, vendor).
2. **schema.org Product JSON-LD** – used by most shops (WooCommerce, BigCommerce, Wix, Squarespace, ...).
3. **Open Graph / microdata / page heuristics** as a fallback.

Some large marketplaces (Amazon, Walmart, ...) block automated requests; use the brand's or
supplier's own product page instead. Only import products and photos you have permission to use.

## Shopify

Two ways to get catalog products into Shopify:

- **CSV (no setup):** Admin → Products → **Shopify CSV** downloads every product in Shopify's import
  format (all images included). In Shopify admin: **Products → Import**, choose the file.
  Products are created as drafts.
- **Live sync:** in the Shopify **Dev Dashboard** (dev.shopify.com, same organization as your store) create an
  app, give it the `write_products` Admin API scope, release a version and install it on your store. From
  the app's **Settings** copy the Client ID and secret. Set `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_CLIENT_ID` and
  `SHOPIFY_CLIENT_SECRET` on the API host (the API exchanges them for a 24-hour token automatically; an older
  admin-created custom app can use `SHOPIFY_ADMIN_ACCESS_TOKEN` instead). A shopping-bag button then
  appears on each product (and a "Also create in Shopify" option in the import dialog). Shopify downloads
  and hosts the images itself, so they keep working even if the source site removes them.

## Production security

Set these on Railway (API) and Cloudflare (frontend):

| Variable | Purpose |
|----------|---------|
| `ENV=production` | Disables API docs, enforces stricter defaults |
| `JWT_SECRET` | Strong random signing key (required in production) |
| `CORS_ORIGINS` | Explicit frontend origins only (no `*`) |
| `ALLOW_PUBLIC_REGISTRATION=false` | Blocks open sign-ups (recommended) |
| `ALLOWED_HOSTS` | API hostnames, e.g. `api.instabooks.digital,*.up.railway.app` |

**Do this manually:**
1. Change the default admin password (`admin@pricewise.com` / `admin123`) immediately.
2. Rotate the MongoDB Atlas password (it was shared in chat earlier).
3. In Atlas → Network Access, restrict IPs (or use Railway static egress if available).
4. In Cloudflare → Security, enable **Bot Fight Mode** and consider a free WAF rule for `/api/auth/*`.
5. Never commit `.env` files or secrets to git.

The API adds security headers, auth brute-force limits, password rules, and rate limiting (with in-memory fallback when Redis is unavailable).

- **Build** workflow (`.github/workflows/build.yml`): runs on push/PR to `main`/`master` — installs and builds frontend, runs backend tests.
