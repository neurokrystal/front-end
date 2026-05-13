import { pgTable, text, timestamp, integer, pgEnum, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';
import { purchases } from '../billing/billing.schema';

export const partnerOrgs = pgTable('partner_orgs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  adminUserId: text('admin_user_id').notNull().references(() => betterAuthUser.id),
  commissionRateBps: integer('commission_rate_bps').notNull().default(1000),  // Basis points (1000 = 10%)
  billingEmail: text('billing_email'),
  configJson: jsonb('config_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    adminIdx: index('partner_orgs_admin_user_id_idx').on(table.adminUserId),
  };
});

export const referralAttributionTypeEnum = pgEnum('referral_attribution_type', [
  'first_purchase', 'twelve_month_window', 'lifetime',
]);

export const referralCodes = pgTable('referral_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  resellerUserId: text('reseller_user_id').notNull().references(() => betterAuthUser.id),
  partnerOrgId: text('partner_org_id').references(() => partnerOrgs.id),
  code: text('code').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    resellerIdx: index('referral_codes_reseller_user_id_idx').on(table.resellerUserId),
    partnerIdx: index('referral_codes_partner_org_id_idx').on(table.partnerOrgId),
  };
});

export const referralAttributions = pgTable('referral_attributions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  resellerUserId: text('reseller_user_id').notNull().references(() => betterAuthUser.id),
  partnerOrgId: text('partner_org_id').references(() => partnerOrgs.id),  // Nullable — reseller can be individual
  purchaseId: text('purchase_id').notNull().references(() => purchases.id),
  attributionType: referralAttributionTypeEnum('attribution_type').notNull().default('first_purchase'),
  referralCode: text('referral_code'),
  commissionAmountCents: integer('commission_amount_cents'),
  commissionPaidAt: timestamp('commission_paid_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    resellerIdx: index('referral_attributions_reseller_user_id_idx').on(table.resellerUserId),
    partnerIdx: index('referral_attributions_partner_org_id_idx').on(table.partnerOrgId),
    purchaseIdx: index('referral_attributions_purchase_id_idx').on(table.purchaseId),
  };
});
