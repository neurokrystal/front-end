import { pgTable, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { betterAuthUser, betterAuthOrganization } from '@/infrastructure/auth/better-auth-refs.schema';

export const purchaseTypeEnum = pgEnum('purchase_type', [
  'individual_assessment', 'org_seat_bundle', 'leader_adapted_report',
  'professional_self', 'under_pressure', 'relationship_patterns',
  'career_alignment', 'parenting_patterns', 'wellbeing',
  'relational_compass', 'collaboration_compass', 'family_compass',
]);
export const purchaseStatusEnum = pgEnum('purchase_status', ['pending', 'completed', 'refunded', 'failed']);

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  buyerUserId: text('buyer_user_id').notNull().references(() => betterAuthUser.id),
  organizationId: text('organization_id').references(() => betterAuthOrganization.id),  // For org purchases
  purchaseType: purchaseTypeEnum('purchase_type').notNull(),
  status: purchaseStatusEnum('status').notNull().default('pending'),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('usd'),
  externalPaymentId: text('external_payment_id'),       // Stripe/payment provider reference
  referralCode: text('referral_code'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => {
  return {
    buyerIdx: index('purchases_buyer_user_id_idx').on(table.buyerUserId),
    orgIdx: index('purchases_organization_id_idx').on(table.organizationId),
  };
});

export const seatAllocations = pgTable('seat_allocations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => betterAuthOrganization.id),
  userId: text('user_id').references(() => betterAuthUser.id),    // Null = unallocated seat
  purchaseId: text('purchase_id').notNull().references(() => purchases.id),
  allocatedAt: timestamp('allocated_at', { withTimezone: true }),
  reclaimedAt: timestamp('reclaimed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    orgIdx: index('seat_allocations_organization_id_idx').on(table.organizationId),
    userIdIdx: index('seat_allocations_user_id_idx').on(table.userId),
    purchaseIdx: index('seat_allocations_purchase_id_idx').on(table.purchaseId),
  };
});
