import { z } from 'zod';
import { ScoredProfilePayloadSchema } from '../scoring/scoring.types';

export const AdminStatsOutput = z.object({
  totalUsers: z.number(),
  totalUsersThisWeek: z.number(),
  completedAssessments: z.number(),
  completedAssessmentsThisWeek: z.number(),
  activeOrganisations: z.number(),
  totalRevenueCents: z.number(),
  revenueThisMonthCents: z.number(),
});
export type AdminStatsOutput = z.infer<typeof AdminStatsOutput>;

export const AdminUserSummary = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string(),
  profileType: z.string(),
  runCount: z.number(),
  reportCount: z.number(),
});
export type AdminUserSummary = z.infer<typeof AdminUserSummary>;

export const ListUsersQuery = z.object({
  limit: z.any().transform(v => {
    const n = parseInt(String(v), 10);
    return isNaN(n) ? 50 : n;
  }).pipe(z.number().int().min(1).max(200)),
  offset: z.any().transform(v => {
    const n = parseInt(String(v), 10);
    return isNaN(n) ? 0 : n;
  }).pipe(z.number().int().min(0)),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuery>;

export const GrantCompInput = z.object({
  userId: z.string().uuid(),
  purchaseType: z.string(),
  reason: z.string().min(5),
});
export type GrantCompInput = z.infer<typeof GrantCompInput>;

export const ManualCorrectionInput = z.object({
  profileId: z.string().uuid(),
  payload: ScoredProfilePayloadSchema,
  reason: z.string().min(5),
});
export type ManualCorrectionInput = z.infer<typeof ManualCorrectionInput>;
