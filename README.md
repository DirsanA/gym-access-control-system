# Nexus Athletic Club

The project currently contains the first production vertical slice of the gym access platform: member data models, server-side membership verification, audited check-ins, and the entrance scanner at `/scanner`.

## Run locally

1. Start a local MongoDB server, or set `MONGODB_URI` to a MongoDB Atlas connection string.
2. Copy `backend/.env.example` to `backend/.env` and set its values.
3. Copy `my-app/.env.example` to `my-app/.env.local`.
4. In one terminal, run `pnpm.cmd dev` from `backend`.
5. In another terminal, run `pnpm.cmd dev` from `my-app`.
6. Optionally run `pnpm.cmd seed` from `backend` to create demo members:
   - `GYM-000123` — active
   - `GYM-000124` — expired

Open `http://localhost:3000/scanner`. USB/HID scanners can enter an ID followed by Enter; manual input is also supported.

To create the first administrator, set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters), and optionally `ADMIN_NAME` for the terminal session, then run `pnpm.cmd create-admin` from `backend`. Log in through `POST /api/auth/login`; protected member and dashboard endpoints require its Bearer token.

## Verification commands

Run `pnpm.cmd build` in both `backend` and `my-app`. Run `pnpm.cmd lint` in `my-app`.

## Next phase

The next UI phase adds administrator screens for member management, renewals, dashboard analytics, and check-in history. The protected API support for these areas is already in place.
