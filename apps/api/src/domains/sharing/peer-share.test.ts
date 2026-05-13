import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTestContainer, cleanTestData, createTestUser, createTestScoredProfile } from '../../test/helpers';
import { db } from '../../test/setup';
import { sql, eq } from 'drizzle-orm';
import { peerShares } from './peer-share.schema';
import { shareGrants } from './share-grant.schema';
import { userProfiles } from '../user/user.schema';

describe('Category 7: Peer Sharing', () => {
  const container = getTestContainer();
  const { peerShareService, accessEvaluator } = container;

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Invite & Accept', () => {
    it('7.1 Invite peer → peer share record created with status "pending", invite token generated', async () => {
      const u1 = await createTestUser();
      await createTestScoredProfile(u1.id);
      
      const share = await peerShareService.invitePeer(u1.id, {
        recipientEmail: 'peer@example.com',
        recipientName: 'Peer',
        mutual: true,
      });
      
      expect(share.status).toBe('pending');
      expect(share.inviteToken).toBeDefined();
      
      const [dbShare] = await db.select().from(peerShares).where(eq(peerShares.id, share.id));
      expect(dbShare.recipientEmail).toBe('peer@example.com');
    });

    it('7.2 Accept invite → status "active", share grants created', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser({ email: 'peer@example.com' });
      await createTestScoredProfile(u1.id);
      
      const share = await peerShareService.invitePeer(u1.id, {
        recipientEmail: u2.email,
        mutual: false,
      });
      
      await peerShareService.acceptInvite(u2.id, share.inviteToken!);
      
      const [dbShare] = await db.select().from(peerShares).where(eq(peerShares.id, share.id));
      expect(dbShare.status).toBe('active');
      expect(dbShare.recipientUserId).toBe(u2.id);
      
      // Should have a grant from u1 to u2
      const [grant] = await db.select().from(shareGrants).where(sql`subject_user_id = ${u1.id} AND target_user_id = ${u2.id}`);
      expect(grant).toBeDefined();
    });

    it('7.3 Accept mutual invite → grants created for BOTH directions', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser({ email: 'peer@example.com' });
      await createTestScoredProfile(u1.id);
      await createTestScoredProfile(u2.id);
      
      const share = await peerShareService.invitePeer(u1.id, {
        recipientEmail: u2.email,
        mutual: true,
      });
      
      await peerShareService.acceptInvite(u2.id, share.inviteToken!);
      
      const g1 = await db.select().from(shareGrants).where(sql`subject_user_id = ${u1.id} AND target_user_id = ${u2.id}`);
      const g2 = await db.select().from(shareGrants).where(sql`subject_user_id = ${u2.id} AND target_user_id = ${u1.id}`);
      
      expect(g1).toHaveLength(1);
      expect(g2).toHaveLength(1);
    });
  });

  describe('Revocation & Expiry', () => {
    it('7.5 Revoke peer share → status "revoked", related share grants revoked', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser({ email: 'peer@example.com' });
      await createTestScoredProfile(u1.id);
      const share = await peerShareService.invitePeer(u1.id, { recipientEmail: u2.email, mutual: false });
      await peerShareService.acceptInvite(u2.id, share.inviteToken!);
      
      await peerShareService.revokePeerShare(share.id, u1.id);
      
      const [dbShare] = await db.select().from(peerShares).where(eq(peerShares.id, share.id));
      expect(dbShare.status).toBe('revoked');
      
      const [grant] = await db.select().from(shareGrants).where(sql`subject_user_id = ${u1.id} AND target_user_id = ${u2.id}`);
      expect(grant.status).toBe('revoked');
    });
  });

  describe('Access', () => {
    it('7.7 Viewer account receiving share → can access shared reports', async () => {
      const u1 = await createTestUser();
      const u2 = await createTestUser({ email: 'viewer@example.com' }); // "viewer" account
      await createTestScoredProfile(u1.id);
      
      const share = await peerShareService.invitePeer(u1.id, { recipientEmail: u2.email });
      await peerShareService.acceptInvite(u2.id, share.inviteToken!);
      
      const decision = await accessEvaluator.evaluate({
        viewerUserId: u2.id,
        subjectUserId: u1.id,
        resourceType: 'base_diagnostic'
      });
      expect(decision.allowed).toBe(true);
    });

    it('7.8 Viewer account taking assessment → profile_type upgrades to "full"', async () => {
        const u = await createTestUser();
        await db.update(userProfiles).set({ profileType: 'viewer' }).where(eq(userProfiles.userId, u.id));
        
        // This usually happens in ScoringService.scoreRun
        await container.scoringService.scoreRun({ 
            id: 'run-1', 
            userId: u.id,
            instrumentVersionId: 'v1',
            responses: []
        } as any);
        
        const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, u.id));
        expect(profile.profileType).toBe('full');
    });
  });
});
