# Nexus Athletic Club — Vercel demo

This is a single Next.js application: its screens and mock API live together in this folder. There is no separate Express server, MongoDB database, or `NEXT_PUBLIC_API_URL` required for the demo.

## Run locally

From the repository root:

```powershell
pnpm.cmd --filter my-app dev
```

Open `http://localhost:3000`.

- `/scanner` — member entrance scanner. Try `GYM-000123` (active) and `GYM-000124` (expired).
- `/admin/members/new` — admin form that creates a mock member and assigns a Gym ID. Newly registered members are also saved in that browser so they can be scanned straight away.

On supported mobile browsers, **Scan with phone camera** reads QR/barcode values and shows the exact decoded code before it checks membership. HTTPS is required for camera access (Vercel provides it).

## Deploy on Vercel

1. Import this repository into Vercel.
2. Set **Root Directory** to `my-app`.
3. Keep the default Next.js build settings and deploy.

The API route handlers are located under `app/api`, therefore Vercel deploys frontend and backend together as one project.

## Important mock-data note

Members are intentionally stored in process memory in `lib/mock-gym-data.ts`. They can reset when a Vercel serverless function restarts, and are not appropriate for real member data. Use a persistent database (for example Vercel Postgres, Neon, or MongoDB Atlas) and authentication before production use.
