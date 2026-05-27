import { Router, Request, Response } from 'express';
import { Session } from '../models/Session.js';

const router = Router();

/**
 * POST /v1/sessions
 *
 * Sync one completed session from the device.
 * Idempotent — duplicate (deviceId + localSessionId) pairs are ignored.
 *
 * Body:
 *   {
 *     deviceId: string,
 *     localSessionId: string,   // SQLite row id (as string)
 *     startedAt: string,        // ISO 8601
 *     endedAt: string,          // ISO 8601
 *     totalPhotos: number,
 *     keptCount: number,
 *     deletedCount: number,
 *     skippedCount: number,
 *     freedMB: number,
 *   }
 *
 * Response 200 — session recorded
 * Response 409 — already synced (safe to ignore on client)
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const {
    deviceId,
    localSessionId,
    startedAt,
    endedAt,
    totalPhotos,
    keptCount,
    deletedCount,
    skippedCount,
    freedMB,
  } = req.body as {
    deviceId?: string;
    localSessionId?: string;
    startedAt?: string;
    endedAt?: string;
    totalPhotos?: number;
    keptCount?: number;
    deletedCount?: number;
    skippedCount?: number;
    freedMB?: number;
  };

  if (!deviceId || !localSessionId || !startedAt || !endedAt) {
    res.status(400).json({ error: 'deviceId, localSessionId, startedAt, and endedAt are required' });
    return;
  }

  try {
    await Session.create({
      deviceId,
      localSessionId,
      startedAt: new Date(startedAt),
      endedAt:   new Date(endedAt),
      totalPhotos:  totalPhotos  ?? 0,
      keptCount:    keptCount    ?? 0,
      deletedCount: deletedCount ?? 0,
      skippedCount: skippedCount ?? 0,
      freedMB:      freedMB      ?? 0,
    });

    res.json({ ok: true });
  } catch (err: any) {
    // Mongo duplicate key → already synced
    if (err.code === 11000) {
      res.status(409).json({ ok: true, note: 'already synced' });
      return;
    }
    throw err;
  }
});

export default router;