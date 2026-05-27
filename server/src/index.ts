import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB, getDbState } from './db.js';
import { requireApiKey } from './middleware/apiKey.js';
import devicesRouter    from './routes/devices.js';
import sessionsRouter   from './routes/sessions.js';
import dailyStatsRouter from './routes/dailyStats.js';

const app  = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Public health checks ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), ts: Date.now() });
});

app.get('/health/db', (_req, res) => {
  const state = getDbState();
  res.status(state === 'connected' ? 200 : 503).json({ db: state });
});

// ── Protected API (all routes below require a valid API key) ────────────────
app.use('/v1', requireApiKey);
app.use('/v1/devices',     devicesRouter);
app.use('/v1/sessions',    sessionsRouter);
app.use('/v1/daily-stats', dailyStatsRouter);

// ── Global error handler ───────────────────────────────────────────────────
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────
connectDB().catch((err) => {
  console.error('[db] connection failed:', err.message);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[photoswipe-server] listening on http://0.0.0.0:${PORT}`);
});