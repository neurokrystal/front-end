import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['test', 'production']).default('test'),
  PORT: z.coerce.number().default(8080),
  POSTGRES_DB_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1),
  // Mailgun
  MAILGUN_API_KEY: z.string().min(1),
  MAILGUN_DOMAIN: z.string().min(1),
  MAILGUN_URL: z.string().url().optional(),
  // Digital Ocean Spaces
  DO_SPACES_KEY: z.string().min(1).optional(),
  DO_SPACES_SECRET: z.string().min(1).optional(),
  DO_SPACES_ENDPOINT: z.string().min(1).optional(),
  DO_SPACES_BUCKET: z.string().min(1).optional(),
  DO_SPACES_REGION: z.string().min(1).optional(),
});

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1).default('http://localhost:8080'),
  NEXT_PUBLIC_APP_URL: z.string().min(1).default('http://localhost:3000'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
