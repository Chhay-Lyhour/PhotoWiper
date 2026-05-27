import { Schema, model, Document } from 'mongoose';

export interface IDailyStats extends Document {
  deviceId: string;     // references Device.deviceId
  date: string;         // 'YYYY-MM-DD' — the calendar day (local device time)
  keptCount: number;
  deletedCount: number;
  freedMB: number;
  sessionCount: number;
}

const DailyStatsSchema = new Schema<IDailyStats>(
  {
    deviceId:     { type: String, required: true, index: true },
    date:         { type: String, required: true },           // 'YYYY-MM-DD'
    keptCount:    { type: Number, required: true, default: 0 },
    deletedCount: { type: Number, required: true, default: 0 },
    freedMB:      { type: Number, required: true, default: 0 },
    sessionCount: { type: Number, required: true, default: 0 },
  },
  { collection: 'dailyStats', timestamps: true },
);

// One doc per device per day — upsert will merge new counts
DailyStatsSchema.index({ deviceId: 1, date: 1 }, { unique: true });

export const DailyStats = model<IDailyStats>('DailyStats', DailyStatsSchema);