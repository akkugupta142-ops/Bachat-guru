# Bachat Guru

Bachat Guru is a personal expense and savings-goal dashboard. The React interface keeps its existing layout and now reads and writes authenticated, user-scoped data through an Express API backed by SQLite. It does not connect to banks, provide OAuth/social sign-in, process payments, or offer financial advice.

## Requirements

- Node.js 20.19+ (Node.js 22 LTS recommended)
- npm

## Run locally

```bash
npm install
Copy-Item .env.example .env   # PowerShell; optional, defaults work without it
npm run seed:demo             # Optional: add a separate local interviewer demo account
npm run dev
```

Open <http://localhost:5173>. `npm run dev` starts the Vite frontend and API together; Vite proxies `/api` to Express. You can create your own account in the app (passwords must be at least 10 characters), or optionally run `npm run seed:demo` to create a separate interviewer account with example expenses and savings goals. The seeder generates a random password and prints it once; save it before closing the terminal. It never resets or modifies an existing demo account. This local demo credential is not for production. No sample account is created unless you explicitly run the seeder.

Development defaults are `PORT=3000` for the API and `DB_FILE=./data/bachat-guru.sqlite` for persistent storage. The database directory and schema are initialized automatically. Override these values in `.env` as needed; do not commit that file. Old expense data from this browser's previous local-storage prototype is offered for one-time import into the signed-in account only when that account has no expenses. Failed or skipped imports leave the old browser data untouched.

## Production-style local run

```bash
npm run build
npm start
```

Open <http://localhost:3000>. The production server serves the built frontend and API from the same origin. Set `NODE_ENV=production` when using HTTPS so the authentication cookie gets the `Secure` attribute. Back up the SQLite database while the app is stopped (or use SQLite's online backup facilities); keep `DB_FILE` on a persistent local disk.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API (`3000`) and Vite (`5173`) together |
| `npm run dev:api` | Start/restart the API on server-file changes |
| `npm run dev:web` | Start the Vite frontend |
| `npm run build` | Build the production frontend into `dist/` |
| `npm start` | Serve the built frontend and API on `PORT` (default `3000`) |
| `npm run seed:demo` | Add an isolated demo user, sample expenses, and savings goals to the configured database |
| `npm test` | Run API integration tests with an in-memory SQLite database |

## Security and data

- Passwords are hashed with bcrypt (12 rounds); plaintext passwords are not stored.
- Login and registration use rate-limited endpoints. Sessions are random, expire after seven days, are stored hashed in SQLite, and are sent in `HttpOnly`, `SameSite=Strict` cookies. Cookies are `Secure` in production mode.
- Expense and goal endpoints scope reads, writes, reports, and CSV exports to the authenticated account. API inputs are validated server-side.
- SQLite foreign keys, indexes, WAL mode, and a 5-second busy timeout are enabled. The database persists under `data/` by default and is excluded from version control.
- Do not expose the local HTTP development server directly to the public internet. For remote production use, terminate HTTPS at a trusted reverse proxy and configure the hosting environment, persistent database storage, and secure backups appropriately.
