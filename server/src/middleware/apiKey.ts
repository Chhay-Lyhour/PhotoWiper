import { Request, Response, NextFunction } from 'express';

/**
 * Simple API-key guard.
 * The mobile app sends:  Authorization: Bearer <API_KEY>
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.API_KEY;

  if (!expected) {
    res.status(500).json({ error: 'Server misconfigured: API_KEY not set' });
    return;
  }

  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (token !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}