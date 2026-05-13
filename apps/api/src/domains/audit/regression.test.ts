import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser } from '../../test/helpers';
import { db } from '../../test/setup';
import { auditLogs } from './audit.schema';
import { eq, sql } from 'drizzle-orm';

describe('Category 12: Audit Integrity', () => {
  let container = getTestContainer();
  let auditService = container.auditService;

  beforeEach(async () => {
    await cleanTestData();
  });

  it('12.1 Create entry → persisted with timestamp', async () => {
    const user = await createTestUser();
    await auditService.log({
      actorUserId: user.id,
      actionType: 'test.action',
      resourceType: 'test',
      resourceId: '123'
    });

    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.actorUserId, user.id));
    expect(log).toBeDefined();
    expect(log.createdAt).toBeDefined();
  });

  it('12.4 Query by actor → correct', async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    
    await auditService.log({ actorUserId: u1.id, actionType: 'a', resourceType: 'r' });
    await auditService.log({ actorUserId: u2.id, actionType: 'b', resourceType: 'r' });

    const logs = await auditService.getLogs({ actorUserId: u1.id });
    expect(logs.length).toBe(1);
    expect(logs[0].actorUserId).toBe(u1.id);
  });

  it('12.8 Ordered by createdAt desc', async () => {
    const user = await createTestUser();
    await auditService.log({ actorUserId: user.id, actionType: 'first', resourceType: 'r' });
    // Small delay to ensure different timestamps if granularity is low, but DB usually handles it
    await new Promise(r => setTimeout(r, 10));
    await auditService.log({ actorUserId: user.id, actionType: 'second', resourceType: 'r' });

    const logs = await auditService.getLogs({ actorUserId: user.id });
    expect(logs[0].actionType).toBe('second');
    expect(logs[1].actionType).toBe('first');
  });
});
