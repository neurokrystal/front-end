import { z } from 'zod';

export const PLATFORM_CONSTANTS = {
  DELETION_RETENTION_DAYS: 30,
  ANONYMISATION_THRESHOLD: 5,           // Minimum group size for aggregated reports
  PARTIAL_RUN_EXPIRY_DAYS: 7,          // Days before an incomplete run expires
  REASSESSMENT_COOLDOWN_DAYS: 30,      // Soft cooldown between retakes (not enforced, just warned)
  MAX_TEAMS_PER_USER: 10,              // Matrix org limit
  MAX_PEERS_PER_SHARE: 50,             // Sanity limit on simultaneous peer shares
  CONSENT_GRACE_PERIOD_DAYS: 0,        // How long after revocation before cascade takes effect (0 = immediate)
  COACH_CERT_GRACE_PERIOD_DAYS: 30,    // Days after lapse before access suspension
} as const;

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['test', 'production']).default('test'),
  PORT: z.coerce.number().default(8080),
  POSTGRES_DB_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, 'Auth secret must be at least 32 characters'),
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
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().optional().transform(v => {
    if (!v) return 'http://localhost:8080';
    if (v.startsWith('/')) return `http://localhost:8080${v}`;
    return v;
  }),
  NEXT_PUBLIC_APP_URL: z.string().optional().transform(v => {
    if (!v) return 'http://localhost:3000';
    if (v.startsWith('/')) return `http://localhost:3000${v}`;
    return v;
  }),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
