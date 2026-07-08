# Deployment

## Architecture

| Component | Where | Why |
|---|---|---|
| Frontend (Next.js) | Vercel (native build, no Docker) | Static/SSR hosting; Vercel does not run Docker containers |
| Backend (FastAPI + SAM 3) | Any Docker host: Fly.io, Railway, Render, Cloud Run, VPS | PyTorch + 3.4 GB model weights and multi-second inference exceed serverless limits |
| Auth + user database | Supabase | Managed login (supabase-js) and Postgres credits ledger |

## Deployment Modes

| | `APP_MODE=open` (default) | `APP_MODE=hosted` |
|---|---|---|
| Audience | Self-hosting developers using their own API keys | Public deployment |
| Segmentation preview (`/image/segment`) | Free | Free, no login |
| Recipe + illustration | Free | Requires login; charges credits (1 + 4 by default) |
| Supabase | Not required | Required |

## 1. Supabase Setup (hosted mode)

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL Editor. This creates the `profiles` table (10 starter credits per signup), the signup trigger, and atomic `spend_credits` / `add_credits` functions.
3. Collect from Project Settings → API:
   - Project URL → `SUPABASE_URL` (backend) and `NEXT_PUBLIC_SUPABASE_URL` (frontend)
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only; never expose to the client)
   - JWT secret → `SUPABASE_JWT_SECRET` (optional; omit to verify tokens via JWKS)
4. Enable the Email auth provider (Authentication → Providers).

## 2. Backend (Docker)

Build and run locally:

```bash
docker compose up --build
```

Deploy the `eat-this-back` image to any container platform. Requirements:

- ≥ 8 GB RAM recommended (SAM 3 CPU inference)
- A persistent volume mounted at `/models` (Hugging Face cache; avoids re-downloading 3.4 GB per restart)
- Environment variables per `eat-this-back/.env.example`, with `APP_MODE=hosted` and `CORS_ORIGINS` set to the Vercel domain

Example (Fly.io):

```bash
cd eat-this-back
fly launch --no-deploy            # generates fly.toml from the Dockerfile
fly volumes create models --size 10
fly secrets set OPENAI_API_KEY=... HF_TOKEN=... APP_MODE=hosted \
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  CORS_ORIGINS=https://your-app.vercel.app
fly deploy
```

Note: CPU inference takes roughly 3–10 s per ingredient prompt. For lower latency, deploy on a GPU host or substitute a hosted SAM 3 endpoint in `segmentation/sam3_api.py`.

## 3. Frontend (Vercel)

1. Import the repository in Vercel; set the project root directory to `eat-this-front`.
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — the deployed backend URL
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. No Docker or additional configuration is required; Vercel builds Next.js natively.

In open mode (no Supabase variables set), the auth UI does not render and no login is required.

## 4. Payments (TODO)

`POST /auth/credits/add` is a development stub, disabled unless `ALLOW_DEV_TOPUP=true`. For production purchases, integrate a payment provider (e.g. Stripe Checkout): create a checkout session from the client, and call `add_credits()` (see `auth/supabase.py`) from the webhook handler after payment verification. Never enable `ALLOW_DEV_TOPUP` on a public deployment.

## Environment Reference

Backend (`eat-this-back/.env.example`) and frontend (`eat-this-front/.env.local.example`) list every variable with defaults and comments.
