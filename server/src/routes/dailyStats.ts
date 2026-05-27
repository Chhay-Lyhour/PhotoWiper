import { Router, Request, Response } from 'express';
import { DailyStats } from '../models/DailyStats.js';

const router = Router();

/**
 * POST /v1/daily-stats
 *
 * Upsert daily stats for one device + date pair.
 * Uses $set — the client owns the truth, so re-sync overwrites the row
 * with the current totals. Idempotent.
 *
 * Body:
 *   {
 *     deviceId: string,
 *     date: string,          // 'YYYY-MM-DD' (device local time)
 *     keptCount: number,
 *     deletedCount: number,
 *     freedMB: number,
 *     sessionCount: number,
 *   }
 *
 * Response 200 — stats upserted
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const {
    deviceId,
    date,
    keptCount,
    deletedCount,
    freedMB,
    sessionCount,
  } = req.body as {
    deviceId?: string;
    date?: string;
    keptCount?: number;
    deletedCount?: number;
    freedMB?: number;
    sessionCount?: number;
  };

  if (!deviceId || !date) {
    res.status(400).json({ error: 'deviceId and date are required' });
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    return;
  }

  await DailyStats.findOneAndUpdate(
    { deviceId, date },
    {
      $set: {
        keptCount:    keptCount    ?? 0,
        deletedCount: deletedCount ?? 0,
        freedMB:      freedMB      ?? 0,
        sessionCount: sessionCount ?? 0,
      },
    },
    { upsert: true, new: true },
  );

  res.json({ ok: true });
});

export default router;