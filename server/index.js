import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port between 1 and 65535.');
}

const app = createApp();
const server = app.listen(port, () => {
  console.log(`Bachat Guru API and web app listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    app.locals.db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
