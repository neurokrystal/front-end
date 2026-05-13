import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessEvaluator } from './access-evaluator.service';

describe('AccessEvaluator E2E Logic', () => {
  let evaluator: AccessEvaluator;
  let shareGrantRepository: any;
  let teamMembershipRepository: any;
  let coachClientLinkRepository: any;
  let certificationRepository: any;

  const PRIYA = 'priya-sharma-id';
  const DAVID = 'david-kim-id';
  const TOM = 'tom-wilson-id';
  const AISHA = 'aisha-mohammed-id';
  const JAMES = 'james-okafor-id';
  const SAM = 'sam-nakamura-id';
  const ALEX = 'alex-rivera-id';
  const TEAM_ALPHA = 'team-alpha-id';

  beforeEach(() => {
    shareGrantRepository = {
      findActiveGrant: vi.fn().mockImplementation(async (query) => {
        // Priya, David, Aisha shared with Team Alpha
        if ([PRIYA, DAVID, AISHA].includes(query.subjectUserId) && query.targetType === 'team' && query.targetTeamId === TEAM_ALPHA) {
          return { id: `grant-${query.subjectUserId}`, subjectUserId: query.subjectUserId, resourceTypes: ['base', 'leader_adapted'] };
        }
        // Tom Wilson revoked (so findActiveGrant returns null)
        if (query.subjectUserId === TOM) {
          return null;
        }
        // Alex shared with Sam
        if (query.subjectUserId === ALEX && query.targetType === 'user' && query.targetUserId === SAM) {
          return { id: 'grant-alex-sam', subjectUserId: ALEX, resourceTypes: ['base'] };
        }
        return null;
      }),
      findActiveGrantsBySubject: vi.fn(),
      findActiveGrantsByTarget: vi.fn(),
      findActiveGrantsByTeam: vi.fn(),
    };

    teamMembershipRepository = {
      findTeamsWhereLeader: vi.fn().mockImplementation(async (userId) => {
        if (userId === JAMES) return [{ teamId: TEAM_ALPHA }];
        return [];
      }),
    };

    coachClientLinkRepository = {};
    certificationRepository = {};

    evaluator = new AccessEvaluator(
      shareGrantRepository,
      teamMembershipRepository,
      coachClientLinkRepository as any,
      certificationRepository as any
    );
  });

  it('James Okafor can see reports for Priya, David, Aisha (shared via Team Alpha)', async () => {
    for (const subjectId of [PRIYA, DAVID, AISHA]) {
      const decision = await evaluator.evaluate({
        subjectUserId: subjectId,
        viewerUserId: JAMES,
        resourceType: 'base'
      });
      expect(decision.allowed).toBe(true);
      expect(decision.grantType).toBe('team');
    }
  });

  it('James Okafor CANNOT see reports for Tom Wilson (revoked share)', async () => {
    const decision = await evaluator.evaluate({
      subjectUserId: TOM,
      viewerUserId: JAMES,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('No active share grant found');
  });

  it('Sam Nakamura can see Alex Riveras Base Report (direct share)', async () => {
    const decision = await evaluator.evaluate({
      subjectUserId: ALEX,
      viewerUserId: SAM,
      resourceType: 'base'
    });
    expect(decision.allowed).toBe(true);
    expect(decision.grantType).toBe('direct_user');
  });

  it('James Okafor can see Leader-Adapted Report if included in share', async () => {
    const decision = await evaluator.evaluate({
      subjectUserId: PRIYA,
      viewerUserId: JAMES,
      resourceType: 'leader_adapted'
    });
    expect(decision.allowed).toBe(true);
  });

  it('James Okafor CANNOT see other report types not in share', async () => {
    const decision = await evaluator.evaluate({
      subjectUserId: PRIYA,
      viewerUserId: JAMES,
      resourceType: 'confidential_report'
    });
    expect(decision.allowed).toBe(false);
  });
});
