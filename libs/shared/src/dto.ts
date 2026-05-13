import { z } from 'zod';
import { RUN_STATUSES, SHARE_TARGET_TYPES } from './enums';

// --- Instrument & Run ---

export const StartRunInput = z.object({
  instrumentSlug: z.string().min(1),
});
export type StartRunInput = z.infer<typeof StartRunInput>;

export const SubmitResponseInput = z.object({
  itemId: z.string().uuid(),
  responseValue: z.number().int().min(1).max(7),
});
export type SubmitResponseInput = z.infer<typeof SubmitResponseInput>;

export const RunStatusOutput = z.object({
  id: z.string(),
  status: z.enum(RUN_STATUSES),
  totalItems: z.number(),
  answeredItems: z.number(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
});
export type RunStatusOutput = z.infer<typeof RunStatusOutput>;

export const RunDetailOutput = RunStatusOutput.extend({
  items: z.array(z.object({
    id: z.string(),
    ordinal: z.number(),
    itemText: z.string(),
    responseFormat: z.string(),
    currentResponse: z.number().nullable(),
  })),
});
export type RunDetailOutput = z.infer<typeof RunDetailOutput>;

// --- Instrument ---

export const InstrumentOutput = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});
export type InstrumentOutput = z.infer<typeof InstrumentOutput>;

// --- Reports ---

export const ReportOutput = z.object({
  id: z.string(),
  reportType: z.string(),
  generatedAt: z.coerce.date(),
});
export type ReportOutput = z.infer<typeof ReportOutput>;

// --- Sharing ---

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

export const ShareGrantOutput = z.object({
  id: z.string(),
  subjectUserId: z.string(),
  targetType: z.string(),
  targetUserId: z.string().nullable().optional(),
  targetTeamId: z.string().nullable().optional(),
  targetOrgId: z.string().nullable().optional(),
  resourceTypes: z.array(z.string()),
  status: z.string(),
  grantedAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable().optional(),
});
export type ShareGrantOutput = z.infer<typeof ShareGrantOutput>;

export const AccessibleResource = z.object({
  subjectUserId: z.string(),
  subjectDisplayName: z.string().optional(),
  resourceTypes: z.array(z.string()),
  grantType: z.string(),
});
export type AccessibleResource = z.infer<typeof AccessibleResource>;
