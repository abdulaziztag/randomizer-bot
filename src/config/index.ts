import { config } from 'dotenv';
import path from 'path';

const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

config({
  path: path.resolve(process.cwd(), envFile)
});

export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  NODE_ENV: env,
  MONGO_URI: process.env.MONGO_URI || '',
} as const;

const requiredEnvVars = ['BOT_TOKEN'] as const;
const missingEnvVars = requiredEnvVars.filter(key => !CONFIG[key]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
} 