export interface ICoachClientLinkRepository {
  hasActiveLink(coachUserId: string, clientUserId: string): Promise<boolean>;
}

export class CoachClientLinkStubRepository implements ICoachClientLinkRepository {
  async hasActiveLink(coachUserId: string, clientUserId: string): Promise<boolean> {
    return false;  // No coach-client links exist yet
  }
}
