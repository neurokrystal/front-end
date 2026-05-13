import type { FastifyRequest, FastifyReply } from 'fastify';
import { auth } from './better-auth';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors/domain-error';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: new Headers(request.headers as Record<string, string>),
  });
  if (!session) {
    throw new UnauthorizedError();
  }
  request.session = session;
}

export function requireRole(...roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    await requireAuth(request, reply);
    
    const userRole = request.session?.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      throw new ForbiddenError();
    }
  };
}

export async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  
  const userRole = request.session?.user?.role;
  if (userRole !== 'platform_admin' && userRole !== 'super_admin') {
    throw new ForbiddenError();
  }

  // A07-3: Admin Session Security - Stricter lifetime for admin actions (4 hours)
  const createdAt = new Date((request.session!.session as any).createdAt).getTime();
  const now = Date.now();
  if (now - createdAt > 4 * 60 * 60 * 1000) {
    throw new UnauthorizedError('Admin session expired. Please re-authenticate.');
  }
}
