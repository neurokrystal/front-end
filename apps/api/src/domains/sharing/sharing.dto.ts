import { z } from 'zod';
import { SHARE_TARGET_TYPES } from '@dimensional/shared';

export const GrantShareInput = z.object({
  targetType: z.enum(SHARE_TARGET_TYPES),
  targetUserId: z.string().uuid().optional(),
  targetTeamId: z.string().uuid().optional(),
  targetOrgId: z.string().uuid().optional(),
  resourceTypes: z.array(z.string()).default([]),    // Empty = share all
  expiresAt: z.string().datetime().optional(),        // Null = indefinite
  grantContext: z.string().optional(),
});
export type GrantShareInput = z.infer<typeof GrantShareInput>;

export interface ShareGrantOutput {
  id: string;
  subjectUserId: string;
  targetType: string;
  targetUserId?: string | null;
  targetTeamId?: string | null;
  targetOrgId?: string | null;
  resourceTypes: string[];
  status: string;
  grantedAt: Date;
  revokedAt?: Date | null;
  expiresAt?: Date | null;
  grantContext?: string | null;
}

export interface AccessibleResource {
  subjectUserId: string;
  subjectDisplayName?: string;
  resourceTypes: string[];
  grantType: string;
}
