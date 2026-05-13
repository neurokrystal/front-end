import { describe, it, expect } from 'vitest';
import fastify from 'fastify';
import { errorHandlerPlugin } from '../shared/errors/error-handler';
import { NotFoundError, AccessDeniedError, ForbiddenError, InsufficientDataError, DomainError } from '../shared/errors/domain-error';
import { ZodError } from 'zod';

describe('Category 14: Error Handling', () => {
  const app = fastify();
  app.register(errorHandlerPlugin);

  app.get('/not-found', async () => { throw new NotFoundError('User', '123'); });
  app.get('/access-denied', async () => { throw new AccessDeniedError('V', 'S', 'Reason'); });
  app.get('/forbidden', async () => { throw new ForbiddenError('Role'); });
  app.get('/insufficient', async () => { throw new InsufficientDataError(5, 3); });
  app.get('/domain-error', async () => { throw new DomainError('Bad', 'CODE', 400); });
  app.get('/unexpected', async () => { throw new Error('Boom'); });
  app.get('/validation', async () => { throw new ZodError([]); });

  it('14.1 NotFoundError → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/not-found' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('14.2 AccessDeniedError → 404 (anti-enumeration)', async () => {
    const res = await app.inject({ method: 'GET', url: '/access-denied' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('14.3 ForbiddenError (role) → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/forbidden' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('14.4 InsufficientDataError → 200 with suppressed data', async () => {
    const res = await app.inject({ method: 'GET', url: '/insufficient' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ code: 'INSUFFICIENT_DATA' });
  });

  it('14.5 DomainError → 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/domain-error' });
    expect(res.statusCode).toBe(400);
  });

  it('14.6 Unexpected error → 500 (no stack trace in body)', async () => {
    const res = await app.inject({ method: 'GET', url: '/unexpected' });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.message).toBe('An unexpected error occurred');
    expect(body.stack).toBeUndefined();
  });

  it('14.8 Missing required body field (ZodError) → 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/validation' });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });
});
