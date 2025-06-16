import mongoose from 'mongoose';
import { CONFIG } from '../config';

export async function connectDB() {
  const uri = CONFIG.MONGO_URI;
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}