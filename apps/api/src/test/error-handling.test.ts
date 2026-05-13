import { describe, it, expect, beforeAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { errorHandlerPlugin } from '../shared/errors/error-handler';
import { NotFoundError, AccessDeniedError, ForbiddenError, InsufficientDataError, DomainError } from '../shared/errors/domain-error';
import { z, ZodError } from 'zod';

describe('Category 14: Error Handling', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify({ logger: false });
    await app.register(errorHandlerPlugin);

    app.get('/not-found', async () => { throw new NotFoundError('Resource', '123'); });
    app.get('/access-denied', async () => { throw new AccessDeniedError('u1', 's1', 'No share'); });
    app.get('/forbidden', async () => { throw new ForbiddenError('Role too low'); });
    app.get('/insufficient-data', async () => { throw new InsufficientDataError(5, 3); });
    app.get('/domain-error', async () => { throw new DomainError('Bad request', 'BAD_REQUEST', 400); });
    app.get('/unexpected', async () => { throw new Error('Explosion'); });
    
    app.post('/validation', async (request) => {
      const schema = z.object({ id: z.string().uuid() });
      schema.parse(request.body);
      return { ok: true };
    });

    await app.ready();
  });

  it('14.1 NotFoundError → HTTP 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/not-found' });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('NOT_FOUND');
  });

  it('14.2 AccessDeniedError → HTTP 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/access-denied' });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('ACCESS_DENIED');
  });

  it('14.3 ForbiddenError → HTTP 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/forbidden' });
    expect(res.statusCode).toBe(403);
  });

  it('14.4 InsufficientDataError → HTTP 200 with suppressed data', async () => {
    const res = await app.inject({ method: 'GET', url: '/insufficient-data' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).code).toBe('INSUFFICIENT_DATA');
  });

  it('14.5 DomainError → HTTP 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/domain-error' });
    expect(res.statusCode).toBe(400);
  });

  it('14.6 Unexpected error → HTTP 500', async () => {
    const res = await app.inject({ method: 'GET', url: '/unexpected' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.message).toBe('An unexpected error occurred');
    expect(body.stack).toBeUndefined();
  });

  it('14.7 Invalid UUID in route param → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/validation', payload: { id: 'not-a-uuid' } });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });
});
