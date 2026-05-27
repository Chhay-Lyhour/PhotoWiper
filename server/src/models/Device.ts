import { Schema, model, Document } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;       // UUID generated on first launch (stored in SQLite meta table)
  platform: string;       // 'ios' | 'android'
  appVersion: string;     // e.g. '1.0.0'
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId:   { type: String, required: true, unique: true, index: true },
    platform:   { type: String, required: true },
    appVersion: { type: String, required: true },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt:  { type: Date, required: true },
  },
  { collection: 'devices', timestamps: false },
);

export const Device = model<IDevice>('Device', DeviceSchema);
