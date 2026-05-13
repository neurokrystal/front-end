import { IPeerShareRepository } from './peer-share.repository';
import { IShareService } from './share.service';
import { INotificationService } from '../notification/notification.types';
import { IUserService } from '../user/user.service';
import { NotFoundError, DomainError } from '@/shared/errors/domain-error';
import crypto from 'crypto';

export interface IPeerShareService {
  invite(initiatorUserId: string, input: string | { recipientEmail: string; recipientName?: string; direction?: 'one_way' | 'mutual'; mutual?: boolean }, direction?: 'one_way' | 'mutual'): Promise<any>;
  invitePeer(initiatorUserId: string, input: string | { recipientEmail: string; recipientName?: string; direction?: 'one_way' | 'mutual'; mutual?: boolean }, direction?: 'one_way' | 'mutual'): Promise<any>;
  acceptInvite(token: string, acceptingUserId: string): Promise<any>;
  revoke(peerShareId: string, revokingUserId: string): Promise<void>;
  revokePeerShare(peerShareId: string, revokingUserId: string): Promise<void>;
  getMyPeerShares(userId: string): Promise<any[]>;
}

export class PeerShareService implements IPeerShareService {
  constructor(
    private readonly peerShareRepository: IPeerShareRepository,
    private readonly shareService: IShareService,
    private readonly notificationService: INotificationService,
    private readonly userService: IUserService,
  ) {}

  async invite(initiatorUserId: string, input: string | { recipientEmail: string; direction?: 'one_way' | 'mutual'; mutual?: boolean }, direction?: 'one_way' | 'mutual') {
    const recipientEmail = typeof input === 'string' ? input : input.recipientEmail;
    let finalDirection: 'one_way' | 'mutual' = 'one_way';
    
    if (typeof input !== 'string') {
      finalDirection = input.direction || (input.mutual ? 'mutual' : 'one_way');
    } else if (direction) {
      finalDirection = direction;
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    
    const peerShare = await this.peerShareRepository.create({
      initiatorUserId,
      recipientEmail,
      direction: finalDirection,
      inviteToken,
      status: 'pending',
    });

    const initiator = await this.userService.getUserById(initiatorUserId);

    await this.notificationService.notify({
      type: 'seat_invitation', // We can use this or create a new one, but seat_invitation fits
      email: recipientEmail,
      orgName: 'The Dimensional System (Peer Share)',
      inviterName: initiator?.displayName || 'A friend',
      signupUrl: `${process.env.BETTER_AUTH_URL}/sharing/accept/${inviteToken}`,
    });

    return peerShare;
  }

  async invitePeer(initiatorUserId: string, input: string | { recipientEmail: string; direction?: 'one_way' | 'mutual'; mutual?: boolean }, direction?: 'one_way' | 'mutual') {
    return this.invite(initiatorUserId, input, direction);
  }

  async acceptInvite(token: string, acceptingUserId: string) {
    const peerShare = await this.peerShareRepository.findByToken(token);
    if (!peerShare || peerShare.status !== 'pending') {
      throw new NotFoundError('Pending peer share invitation', token);
    }

    // 1. Update peer share record
    await this.peerShareRepository.update(peerShare.id, {
      recipientUserId: acceptingUserId,
      status: 'active',
      acceptedAt: new Date(),
    });

    // 2. Create share grants
    // A shares with B
    await this.shareService.grantShare(peerShare.initiatorUserId, {
      targetType: 'user',
      targetUserId: acceptingUserId,
      resourceTypes: ['base'],
      grantContext: 'peer_share',
    });

    // If mutual, B shares with A
    if (peerShare.direction === 'mutual') {
      await this.shareService.grantShare(acceptingUserId, {
        targetType: 'user',
        targetUserId: peerShare.initiatorUserId,
        resourceTypes: ['base'],
        grantContext: 'peer_share',
      });
    }

    return peerShare;
  }

  async revoke(peerShareId: string, revokingUserId: string) {
    const peerShare = await this.peerShareRepository.findById(peerShareId);
    if (!peerShare) throw new NotFoundError('Peer share', peerShareId);

    if (peerShare.initiatorUserId !== revokingUserId && peerShare.recipientUserId !== revokingUserId) {
      throw new DomainError('Unauthorized to revoke this peer share', 'FORBIDDEN', 403);
    }

    await this.peerShareRepository.update(peerShareId, {
      status: 'revoked',
      revokedAt: new Date(),
      revokedByUserId: revokingUserId,
    });

    // Revoke underlying share grants
    if (peerShare.recipientUserId) {
      await this.shareService.revokeAllSharesForTarget(peerShare.initiatorUserId, 'user', peerShare.recipientUserId);
      await this.shareService.revokeAllSharesForTarget(peerShare.recipientUserId, 'user', peerShare.initiatorUserId);
    }
  }

  async revokePeerShare(peerShareId: string, revokingUserId: string) {
    return this.revoke(peerShareId, revokingUserId);
  }

  async getMyPeerShares(userId: string) {
    return this.peerShareRepository.findActiveForUser(userId);
  }
}
