# JustSimplbuy CartReady

Product import and admin tool for a Shopify store: React frontend + FastAPI backend (MongoDB, Redis).
The original built-in storefront (Stripe checkout) still works when Shopify isn't configured.

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

- **Cloudflare Pages** (the live site): `instabooks.digital` and `www.instabooks.digital` are served by the
  Cloudflare Pages project `instabooks` (direct upload, not connected to GitHub), so merging to `main` does
  not update the site. Deploy from `deploy/`:
  ```bash
  cd deploy
  npm install
  npx wrangler login   # once
  npm run deploy       # builds the frontend against https://api.instabooks.digital and uploads it to Pages
  ```
  `npm run deploy:worker` deploys the unused full-stack Worker in `wrangler.jsonc` (needs Docker and
  Cloudflare Containers); it does not serve any of the domains above.

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
| Frontend  | `REACT_APP_SHOPIFY_STORE_URL` | Shopify store URL; storefront pages redirect there (optional) |

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

1. **Shopify stores** – the store's `/products/<handle>.json` (all images, sizes/colors and their prices, vendor).
2. **schema.org Product JSON-LD** – used by most shops (WooCommerce, BigCommerce, Wix, Squarespace, ...).
3. **Open Graph / microdata / page heuristics** as a fallback.

Some large marketplaces (Amazon, Walmart, ...) block automated requests; use the brand's or
supplier's own product page instead. Only import products and photos you have permission to use.

## Shopify (the main store)

Shopify runs the shop: storefront, cart, checkout, payments and orders. This app is the
back-office tool for finding products on other sites and adding them to Shopify.

### Connect this app to Shopify

1. In the Shopify **Dev Dashboard** (dev.shopify.com, same organization as your store) create an app,
   give it the `write_products` Admin API scope, release a version and install it on your store.
2. From the app's **Settings** copy the Client ID and secret.
3. On the API host (Railway variables, or `wrangler secret put` for Cloudflare) set
   `SHOPIFY_STORE_DOMAIN=your-store.myshopify.com`, `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`.
   The API exchanges them for a 24-hour token automatically. (An older admin-created custom app can set
   `SHOPIFY_ADMIN_ACCESS_TOKEN` instead.)

Once connected, imports go straight to Shopify (as **Draft** or **Live**, your choice), with every size/color
variant, all images, and the source price saved as **Cost per item** so Shopify shows your profit margin.
Inventory isn't tracked (suited to dropshipping). Shopify downloads and hosts the images itself.
On the Products page, products already in Shopify get an "open in Shopify" link and an "update Shopify"
button (re-sends title, description, prices and variants; images are only sent the first time).

Not connected yet? **Shopify CSV** downloads every product (with variants and images) in Shopify's import
format: Shopify admin → **Products → Import**.

### Send shoppers to Shopify

Build the frontend with `REACT_APP_SHOPIFY_STORE_URL=https://your-shop-domain`, for example
`REACT_APP_SHOPIFY_STORE_URL=https://instabooks.digital npm run deploy` from `deploy/`. Every storefront page
then redirects to the Shopify store, and only `/admin` keeps working here.

### Going-live checklist (done in Shopify / your domain registrar)

1. Shopify admin → **Settings → Payments**: set up Shopify Payments (or PayPal etc.).
2. **Settings → Shipping and delivery**, **Taxes and duties**, and **Policies** (refund, privacy, terms).
3. **Online Store → Themes**: pick and customize a theme.
4. **Settings → Domains**: connect your domain to Shopify. If that is `instabooks.digital`, move this admin
   app to another hostname first (for example `admin.instabooks.digital`): add it as a custom domain on the
   `instabooks` Pages project, add it to `CORS_ORIGINS` on Railway, then remove `instabooks.digital` and
   `www.instabooks.digital` from the Pages project before pointing their DNS records at Shopify
   (DNS only, not proxied).
5. Delete the demo products in this app's admin (Sony, Apple, LEGO, ...) so they never get sent to Shopify.

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
