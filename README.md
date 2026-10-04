# Bachat Guru

Bachat Guru is a personal expense and savings-goal dashboard. The React interface keeps its existing layout and reads and writes authenticated, user-scoped data through an Express API. Local development uses SQLite; when `DATABASE_URL` is set, the API initializes and uses PostgreSQL, suitable for a managed database alongside a free web host. It does not connect to banks, provide OAuth/social sign-in, process payments, or offer financial advice.

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

Development defaults are `PORT=3000` for the API and `DB_FILE=./data/bachat-guru.sqlite` for persistent storage. When `DATABASE_URL` is set, PostgreSQL takes precedence over `DB_FILE`. Both schemas are initialized automatically on server startup. Keep connection strings and `.env` files private; never commit them. Old expense data from this browser's previous local-storage prototype is offered for one-time import into the signed-in account only when that account has no expenses. Failed or skipped imports leave the old browser data untouched.

## Production-style local run

```bash
npm run build
npm start
```

Open <http://localhost:3000>. The production server serves the built frontend and API from the same origin. Set `NODE_ENV=production` when using HTTPS so the authentication cookie gets the `Secure` attribute. Back up the SQLite database while the app is stopped (or use SQLite's online backup facilities); keep `DB_FILE` on a persistent local disk.

## Host for free with hosted PostgreSQL

Render's free web-service filesystem is temporary, so SQLite data stored there can disappear when the service is replaced or redeployed. To keep signups and app data without buying a Render disk, use a managed PostgreSQL provider with a free plan (for example Neon) as the database, and let the Render service connect to it:

1. Create a PostgreSQL project with your database provider. Copy its PostgreSQL connection string; keep it private.
2. Push the current app code to the GitHub branch connected to Render. The deployed code must include `server/db.js` with PostgreSQL support and the `pg` dependency.
3. In Render, open the `Bachat-guru` web service and choose **Environment → Add variable**.
4. Add `DATABASE_URL` with the provider's connection string. Add `NODE_ENV` with value `production`. Do not add `DB_FILE` for this hosted setup; do not set `PORT` (Render supplies it).
5. Save the variables and let Render deploy/restart. On first startup, the app creates the PostgreSQL tables automatically.
6. Register a test user and add an expense on the Render URL. Restart/redeploy the service, then sign in again to confirm the data persists.
7. To inspect records, use your database provider's private SQL editor. For example: `SELECT id, email, name, created_at FROM users;` and `SELECT id, user_id, title, category, amount, date FROM expenses ORDER BY id DESC;`. Never publish this data or the connection string.

The Render service and local SQLite file are separate databases. Existing data on Render's temporary filesystem, and any accounts in your local SQLite file, are not copied automatically when you set up PostgreSQL. Export/migrate records you need before switching; user passwords cannot be recovered from their hashes, so affected users may need to register again.

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
- SQLite foreign keys, indexes, WAL mode, and a 5-second busy timeout are enabled. The database persists under `data/` by default and is excluded from version control. PostgreSQL uses the same account/data schema and is selected with `DATABASE_URL`.
- Do not expose the local HTTP development server directly to the public internet. For remote production use, terminate HTTPS at a trusted reverse proxy and configure the hosting environment, persistent database storage, and secure backups appropriately.
