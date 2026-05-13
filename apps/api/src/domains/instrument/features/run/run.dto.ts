import { z } from 'zod';

import { RUN_STATUSES } from '@dimensional/shared';

export const StartRunInput = z.object({
  instrumentSlug: z.string().min(1),
});
export type StartRunInput = z.infer<typeof StartRunInput>;

export const SubmitResponseInput = z.object({
  itemId: z.string().uuid(),
  responseValue: z.number().int().min(1).max(7),
});
export type SubmitResponseInput = z.infer<typeof SubmitResponseInput>;

export const SubmitBatchResponsesInput = z.object({
  responses: z.array(z.object({
    itemId: z.string().uuid(),
    responseValue: z.number().int().min(1).max(7),
  })).min(1),
});
export type SubmitBatchResponsesInput = z.infer<typeof SubmitBatchResponsesInput>;

export const RunStatusOutput = z.object({
  id: z.string(),
  status: z.enum(RUN_STATUSES),
  totalItems: z.number(),
  answeredItems: z.number(),
  startedAt: z.date(),
  completedAt: z.date().nullable(),
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
