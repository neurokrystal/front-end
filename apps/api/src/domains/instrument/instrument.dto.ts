import { z } from 'zod';

export const InstrumentOutput = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'active', 'retired', 'inactive']),
});

export type InstrumentOutput = z.infer<typeof InstrumentOutput>;

export const InstrumentItemOutput = z.object({
  id: z.string(),
  ordinal: z.number(),
  itemText: z.string(),
  responseFormat: z.enum(['likert_5', 'likert_7', 'binary', 'free_text']),
  domainTag: z.string().nullable(),
  dimensionTag: z.string().nullable(),
  stateTag: z.string().nullable(),
});

export const InstrumentVersionWithItemsOutput = z.object({
  id: z.string(),
  instrumentId: z.string(),
  versionNumber: z.number(),
  itemCount: z.number(),
  scoringStrategyKey: z.string(),
  items: z.array(InstrumentItemOutput),
});

export type InstrumentVersionWithItemsOutput = z.infer<typeof InstrumentVersionWithItemsOutput>;
