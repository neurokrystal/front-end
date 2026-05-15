import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ConsentPurpose } from '@dimensional/shared';

export function requireConsent(purpose: ConsentPurpose) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const viewerUserId = request.session!.user.id;
    const subjectUserId = (request.params as any).userId || (request.body as any).subjectUserId;

    if (!subjectUserId || viewerUserId === subjectUserId) return; // Accessing own data — no consent needed

    const consentService = request.server.container.consentService;
    const hasConsent = await consentService.hasActiveConsent(subjectUserId, viewerUserId, purpose);

    if (!hasConsent) {
      return reply.status(403).send({
        code: 'CONSENT_REQUIRED',
        message: 'Active consent record required for this access',
      });
    }

    // Log the access
    await request.server.container.auditService.log({
      actorUserId: viewerUserId,
      actionType: 'data.accessed_with_consent',
      resourceType: 'scored_profile',
      subjectUserId,
      metadata: { purpose },
      ipAddress: request.ip,
    });
  };
}
