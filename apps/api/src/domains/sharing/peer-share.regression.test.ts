import { describe, it, expect, beforeEach } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile } from '../../test/helpers';
import { db } from '../../test/setup';
import { peerShares } from './peer-share.schema';
import { shareGrants } from './share-grant.schema';
import { eq, and, or } from 'drizzle-orm';

describe('Category 7: Peer Sharing', () => {
  let container = getTestContainer();
  let peerShareService = container.peerShareService;

  beforeEach(async () => {
    await cleanTestData();
  });

  it('7.1 Invite peer → record pending, token generated', async () => {
    const userA = await createTestUser();
    const invite = await peerShareService.invite(userA.id, 'peer@example.com', 'one_way');
    
    expect(invite.senderUserId).toBe(userA.id);
    expect(invite.recipientEmail).toBe('peer@example.com');
    expect(invite.status).toBe('pending');
    expect(invite.inviteToken).toBeDefined();
  });

  it('7.2 Accept → status active, grants created', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    await createTestScoredProfile(userB.id);

    const invite = await peerShareService.invite(userA.id, userB.email, 'one_way');
    await peerShareService.acceptInvite(invite.inviteToken, userB.id);
    
    const [updated] = await db.select().from(peerShares).where(eq(peerShares.id, invite.id));
    expect(updated.status).toBe('active');
    expect(updated.recipientUserId).toBe(userB.id);

    // Verify grants
    const grants = await db.select().from(shareGrants).where(and(eq(shareGrants.subjectUserId, userA.id), eq(shareGrants.targetUserId, userB.id)));
    expect(grants.length).toBeGreaterThan(0);
  });

  it('7.3 Mutual accept → grants for BOTH directions', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    await createTestScoredProfile(userA.id);
    await createTestScoredProfile(userB.id);

    const invite = await peerShareService.invite(userA.id, userB.email, 'mutual');
    await peerShareService.acceptInvite(invite.inviteToken, userB.id);

    const aToB = await db.select().from(shareGrants).where(and(eq(shareGrants.subjectUserId, userA.id), eq(shareGrants.targetUserId, userB.id)));
    const bToA = await db.select().from(shareGrants).where(and(eq(shareGrants.subjectUserId, userB.id), eq(shareGrants.targetUserId, userA.id)));
    
    expect(aToB.length).toBeGreaterThan(0);
    expect(bToA.length).toBeGreaterThan(0);
  });

  it('7.5 Revoke → status revoked, grants revoked', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const invite = await peerShareService.invite(userA.id, userB.email, 'one_way');
    await peerShareService.acceptInvite(invite.inviteToken, userB.id);

    await peerShareService.revoke(invite.id, userA.id);
    
    const [updated] = await db.select().from(peerShares).where(eq(peerShares.id, invite.id));
    expect(updated.status).toBe('revoked');

    const activeGrants = await db.select().from(shareGrants).where(and(eq(shareGrants.subjectUserId, userA.id), eq(shareGrants.targetUserId, userB.id), eq(shareGrants.status, 'active')));
    expect(activeGrants.length).toBe(0);
  });

  it('7.9 Get my peer shares → only involving requesting user', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const userC = await createTestUser();
    
    await peerShareService.invite(userA.id, userB.email, 'one_way');
    await peerShareService.invite(userC.id, 'other@test.com', 'one_way');

    const mine = await peerShareService.getMyPeerShares(userA.id);
    expect(mine.length).toBe(1);
    expect(mine[0].senderUserId).toBe(userA.id);
  });
});
