import { Schema, model, Document } from 'mongoose';

export interface ISession extends Document {
  deviceId: string;         // references Device.deviceId
  localSessionId: string;   // SQLite rowid (string) — idempotency key
  startedAt: Date;
  endedAt: Date;
  totalPhotos: number;
  keptCount: number;
  deletedCount: number;
  skippedCount: number;
  freedMB: number;          // storage reclaimed in megabytes
}

const SessionSchema = new Schema<ISession>(
  {
    deviceId:       { type: String, required: true, index: true },
    localSessionId: { type: String, required: true },
    startedAt:      { type: Date, required: true },
    endedAt:        { type: Date, required: true },
    totalPhotos:    { type: Number, required: true, default: 0 },
    keptCount:      { type: Number, required: true, default: 0 },
    deletedCount:   { type: Number, required: true, default: 0 },
    skippedCount:   { type: Number, required: true, default: 0 },
    freedMB:        { type: Number, required: true, default: 0 },
  },
  { collection: 'sessions', timestamps: true },
);

// Composite unique index — prevents duplicate syncs if the app retries
SessionSchema.index({ deviceId: 1, localSessionId: 1 }, { unique: true });

export const Session = model<ISession>('Session', SessionSchema);