import { z } from 'zod';
import { PURCHASE_TYPES } from '@dimensional/shared';

export const CreatePurchaseInput = z.object({
  purchaseType: z.enum(PURCHASE_TYPES),
  organizationId: z.string().uuid().optional(),
  referralCode: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  quantity: z.number().optional(),
});

export type CreatePurchaseInput = z.infer<typeof CreatePurchaseInput>;

export const PurchaseOutput = z.object({
  id: z.string(),
  status: z.string(),
  amountCents: z.number(),
  currency: z.string(),
  checkoutUrl: z.string().optional(),
  purchaseType: z.string().optional(),
  createdAt: z.string().optional(),
  quantity: z.number().optional(),
  externalTransactionId: z.string().optional(),
});

export type PurchaseOutput = z.infer<typeof PurchaseOutput>;
