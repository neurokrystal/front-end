import { z } from 'zod';

export const ProgrammeModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  sequence: z.number(),
  estimatedMinutes: z.number(),
  content: z.array(z.discriminatedUnion('type', [
    z.object({ type: z.literal('video'), url: z.string(), duration: z.number() }),
    z.object({ type: z.literal('reading'), title: z.string(), body: z.string() }),
    z.object({ type: z.literal('exercise'), title: z.string(), instructions: z.string() }),
    z.object({ type: z.literal('reflection_prompt'), id: z.string(), prompt: z.string() }),
    z.object({ type: z.literal('micro_assessment'), instrumentId: z.string(), targetDimension: z.string() }),
  ])),
});

export type ProgrammeModule = z.infer<typeof ProgrammeModuleSchema>;

export const ProgrammeOutput = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  targetDomain: z.string().nullable(),
  status: z.string(),
  durationWeeks: z.number().nullable(),
  modules: z.array(ProgrammeModuleSchema).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProgrammeOutput = z.infer<typeof ProgrammeOutput>;

export const CreateProgrammeInput = z.object({
  name: z.string(),
  description: z.string().optional(),
  targetDomain: z.string().optional(),
  durationWeeks: z.number().optional(),
  modules: z.array(ProgrammeModuleSchema).optional(),
});

export type CreateProgrammeInput = z.infer<typeof CreateProgrammeInput>;

export const EnrolmentOutput = z.object({
  id: z.string(),
  programmeId: z.string(),
  userId: z.string().nullable(),
  teamId: z.string().nullable(),
  status: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  progress: z.any().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EnrolmentOutput = z.infer<typeof EnrolmentOutput>;
