import { FastifyInstance } from "fastify";
import { requireAuth } from "@/infrastructure/auth/auth-middleware";
import { requireAccess } from "@/infrastructure/auth/access-middleware";
import rateLimit from "@fastify/rate-limit";
import { z } from 'zod';
import { REPORT_TYPES, type ReportType } from '@dimensional/shared';

const RT = REPORT_TYPES as unknown as [typeof REPORT_TYPES[number], ...typeof REPORT_TYPES[number][]];

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth);

  fastify.post("/", {
    schema: {
      body: z.object({
        reportType: z.enum(RT),
        subjectUserId: z.string().uuid().optional(), // Default to self if not provided
      })
    }
  }, async (request, reply) => {
    const { reportType, subjectUserId } = request.body as { reportType: ReportType, subjectUserId?: string };
    const viewerUserId = request.session!.user.id;
    const targetSubjectId = subjectUserId || viewerUserId;
    
    // Check access if viewing another user's report
    if (targetSubjectId !== viewerUserId) {
      await requireAccess(reportType)(request as any, reply);
      if (reply.sent) return;
    }

    // Get latest profile for subject
    const profiles = await fastify.container.scoringService.getProfilesForUser(targetSubjectId);
    if (profiles.length === 0) {
      return reply.status(400).send({ code: 'PROFILE_NOT_FOUND', message: 'No scored profile found for user' });
    }
    const latestProfile = profiles[profiles.length - 1];

    const result = await fastify.container.reportService.generateReport({
      reportType,
      subjectUserId: targetSubjectId,
      viewerUserId: viewerUserId === targetSubjectId ? null : viewerUserId,
      scoredProfileId: latestProfile.id,
    });
    return result;
  });

  fastify.get("/", async (request, reply) => {
    const userId = request.session!.user.id;
    const reports = await fastify.container.reportService.getReportsForUser(userId, userId);
    return reports;
  });

  fastify.get("/:id", {
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const viewerId = request.session!.user.id;
    const report = await fastify.container.reportService.getReport(id, viewerId);
    return report;
  });

  fastify.get("/:id/pdf", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    },
    schema: {
      params: z.object({ id: z.string().uuid() })
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const viewerId = request.session!.user.id;

    const pdf = await fastify.container.reportService.getReportPdf(id, viewerId);
    
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
    return reply.send(pdf);
  });
}
