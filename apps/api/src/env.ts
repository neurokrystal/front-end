import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['test', 'production']).default('test'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1),
});

export const env = envSchema.parse(process.env);
