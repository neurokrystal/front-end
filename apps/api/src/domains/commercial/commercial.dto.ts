import { z } from 'zod';

export const ReferralCodeOutput = z.object({
  id: z.string(),
  code: z.string(),
  isActive: z.boolean(),
  usageCount: z.number(),
  createdAt: z.string(),
});

export const CreateReferralCodeInput = z.object({
  code: z.string().optional(),
});

export const AttributionOutput = z.object({
  id: z.string(),
  purchaseId: z.string(),
  attributionType: z.string(),
  createdAt: z.string(),
});

export const PartnerOrgOutput = z.object({
  id: z.string(),
  name: z.string(),
  commissionRateBps: z.number(),
});

export const CreatePartnerOrgInput = z.object({
  name: z.string(),
  commissionRateBps: z.number(),
});
