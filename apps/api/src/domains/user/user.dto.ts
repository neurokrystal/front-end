import { z } from 'zod';

export const UserProfileOutput = z.object({
  id: z.string(),
  userId: z.string(),
  profileType: z.enum(['full', 'viewer']),
  displayName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProfileOutput = z.infer<typeof UserProfileOutput>;

export const UpdateProfileInput = z.object({
  displayName: z.string().min(1).max(100).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;
