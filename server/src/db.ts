import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export type DbState = 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'uninitialized';

const STATE_MAP: Record<number, DbState> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

export function getDbState(): DbState {
  return STATE_MAP[mongoose.connection.readyState] ?? 'uninitialized';
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? 'PhotoWiper';

  if (!uri || uri.includes('<user>') || uri.includes('<password>')) {
    throw new Error('MONGODB_URI is not set or still contains placeholder values. Edit server/.env.');
  }

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 8000,
  });

  console.log(`[db] connected to MongoDB Atlas (db: ${dbName})`);
}
