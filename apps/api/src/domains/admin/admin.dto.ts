import { z } from 'zod';
import { ScoredProfilePayloadSchema } from '../scoring/scoring.types';

export const AdminStatsOutput = z.object({
  totalUsers: z.number(),
  usersTrend: z.number(),
  totalAssessments: z.number(),
  assessmentsTrend: z.number(),
  totalOrgs: z.number(),
  totalRevenue: z.number(),
  monthlyRevenue: z.number(),
});
export type AdminStatsOutput = z.infer<typeof AdminStatsOutput>;

export const AdminUserSummary = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string(),
});
export type AdminUserSummary = z.infer<typeof AdminUserSummary>;

export const ListUsersQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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
