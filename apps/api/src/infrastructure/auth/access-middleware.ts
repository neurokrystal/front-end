import type { FastifyRequest, FastifyReply } from 'fastify';

export function requireAccess(resourceType: string) {
  return async function (request: FastifyRequest<{
    Params: { userId?: string };
    Body: { subjectUserId?: string };
    Querystring: { teamId?: string; orgId?: string };
  }>, reply: FastifyReply) {
    const session = request.session;
    if (!session?.user) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const viewerUserId = session.user.id;
    const subjectUserId = request.params.userId || request.body?.subjectUserId;

    // Self-access: no check needed
    if (viewerUserId === subjectUserId) return;

    const decision = await request.server.container.accessEvaluator.evaluate({
      subjectUserId: subjectUserId as string, // Cast because at this point it should be there or handled by evaluator
      viewerUserId,
      resourceType,
      context: {
        teamId: request.query.teamId,
        orgId: request.query.orgId,
      },
    });

    if (!decision.allowed) {
      await request.server.container.auditService.log({
        actorUserId: viewerUserId,
        actionType: 'access.denied',
        resourceType,
        subjectUserId: subjectUserId as string,
        metadata: { reason: decision.reason },
        ipAddress: request.ip,
      });

      return reply.status(403).send({
        code: 'ACCESS_DENIED',
        message: decision.reason,
      });
    }

    // Attach the decision to the request for downstream audit logging
    request.accessDecision = decision;
  };
}
