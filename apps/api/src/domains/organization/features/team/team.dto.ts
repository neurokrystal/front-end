import { z } from 'zod';

export const CreateTeamInput = z.object({
  name: z.string().min(1).max(100),
  organizationId: z.string().uuid(),
});

export type CreateTeamInput = z.infer<typeof CreateTeamInput>;

export const TeamOutput = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TeamOutput = z.infer<typeof TeamOutput>;

export const AddTeamMemberInput = z.object({
  userId: z.string(),
  role: z.enum(['leader', 'member']).default('member'),
});

export type AddTeamMemberInput = z.infer<typeof AddTeamMemberInput>;
