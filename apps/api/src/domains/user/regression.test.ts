import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile } from '../../test/helpers';
import { db } from '../../test/setup';
import { userProfiles, deletionRequests } from './user.schema';
import { eq, sql } from 'drizzle-orm';
import { auditLogs } from '../audit/audit.schema';
import crypto from 'crypto';

describe('Category 9: GDPR Deletion', () => {
  let container = getTestContainer();
  let deletionService = container.deletionService;

  beforeEach(async () => {
    await cleanTestData();
  });

  it('9.1 Request deletion → pending, scheduled', async () => {
    const user = await createTestUser();
    const { id: requestId, scheduledFor } = await deletionService.requestDeletion(user.id);
    
    const [request] = await db.select().from(deletionRequests).where(eq(deletionRequests.id, requestId));
    expect(request.status).toBe('pending');
    expect(request.scheduledFor).toBeDefined();
  });

  it('9.2 Cancel → status cancelled', async () => {
    const user = await createTestUser();
    const { id: requestId } = await deletionService.requestDeletion(user.id);
    
    await deletionService.cancelDeletion(requestId, user.id);
    
    const [updated] = await db.select().from(deletionRequests).where(eq(deletionRequests.id, requestId));
    expect(updated.status).toBe('cancelled');
  });

  it('9.3 Execute deletion → data gone + audit anonymised', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const user = await createTestUser();
    await createTestScoredProfile(user.id);
    const { id: requestId } = await deletionService.requestDeletion(user.id);

    // Seed audit log
    await db.insert(auditLogs).values({
        actorUserId: user.id,
        actionType: 'test.action',
        resourceType: 'none',
        subjectUserId: user.id
    });

    await deletionService.executeDeletion(requestId, admin.id);
    
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id));
    expect(profile).toBeUndefined();

    // Verify audit logs anonymised (subjectUserId should be hash)
    const userHash = crypto.createHash('sha256').update(user.id).digest('hex');
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.subjectUserId, userHash));
    expect(log).toBeDefined();
    expect(log.actorUserId).toBe(userHash);
  });
});
