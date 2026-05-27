import { Router, Request, Response } from 'express';
import { Device } from '../models/Device.js';

const router = Router();

/**
 * POST /v1/devices
 *
 * Register or update a device. Called once on first launch and on each app
 * open so lastSeenAt stays fresh.
 *
 * Body:
 *   { deviceId: string, platform: 'ios'|'android', appVersion: string }
 *
 * Response 200 — device upserted
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { deviceId, platform, appVersion } = req.body as {
    deviceId?: string;
    platform?: string;
    appVersion?: string;
  };

  if (!deviceId || !platform || !appVersion) {
    res.status(400).json({ error: 'deviceId, platform, and appVersion are required' });
    return;
  }

  const now = new Date();

  await Device.findOneAndUpdate(
    { deviceId },
    {
      $set:         { platform, appVersion, lastSeenAt: now },
      $setOnInsert: { firstSeenAt: now },
    },
    { upsert: true, new: true },
  );

  res.json({ ok: true });
});

export default router;