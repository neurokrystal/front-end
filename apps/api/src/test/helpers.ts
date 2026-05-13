import { db } from './setup';
import { sql, eq } from 'drizzle-orm';
import { createContainer, type AppContainer } from '../container';
import { instruments, instrumentVersions } from '../domains/instrument/instrument.schema';
import { instrumentRuns, instrumentResponses } from '../domains/instrument/features/run/run.schema';
import { scoredProfiles } from '../domains/scoring/scoring.schema';
import { teams, teamMemberships } from '../domains/organization/features/team/team.schema';
import { shareGrants } from '../domains/sharing/share-grant.schema';
import { userProfiles } from '../domains/user/user.schema';
import { purchases } from '../domains/billing/billing.schema';

let _container: AppContainer | null = null;

/**
 * Get or create the test container.
 * Reuses the same container across tests for efficiency.
 */
export function getTestContainer(): AppContainer {
  if (!_container) {
    _container = createContainer();
  }
  return _container;
}

/**
 * Clean all application tables (not Better-Auth tables).
 * Call in afterEach or beforeEach to reset state.
 */
export async function cleanTestData(): Promise<void> {
  // Delete in reverse dependency order to respect FKs
  const tables = [
    'audit_logs',
    'share_grants',
    'reports',
    'scored_profiles',
    'instrument_responses',
    'instrument_runs',
    'seat_allocations',
    'purchases',
    'team_memberships',
    'teams',
    'report_content_blocks',
    'report_content_versions',
    'report_templates',
    'instrument_items',
    'instrument_versions',
    'instruments',
    'user_profiles',
    'peer_shares',
    'coach_client_links',
    'certification_records',
    'coaching_firm_memberships',
    'coaching_firms',
    'partner_orgs',
    'referral_attributions',
    'programme_enrolments',
    'programmes',
  ];

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`DELETE FROM "${table}"`));
    } catch (e) {
      // Table might not exist yet — skip
    }
  }
}

/**
 * Create a test user in the Better-Auth user table.
 * Returns the user ID.
 */
export async function createTestUser(overrides?: Partial<{
  id: string;
  name: string;
  email: string;
  role: string;
}>): Promise<{ id: string; email: string; name: string }> {
  const id = overrides?.id || crypto.randomUUID();
  const email = overrides?.email || `test-${id.slice(0, 8)}@test.com`;
  const name = overrides?.name || `Test User ${id.slice(0, 8)}`;

  await db.execute(sql`
    INSERT INTO "user" (id, name, email, role, email_verified, created_at, updated_at)
    VALUES (${id}, ${name}, ${email}, ${overrides?.role || 'user'}, true, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.insert(userProfiles).values({
    userId: id,
    displayName: name,
    profileType: 'full',
  }).onConflictDoNothing();

  return { id, email, name };
}

/**
 * Create a test organisation.
 */
export async function createTestOrg(overrides?: Partial<{
  id: string;
  name: string;
}>): Promise<{ id: string; name: string }> {
  const id = overrides?.id || crypto.randomUUID();
  const name = overrides?.name || `Test Org ${id.slice(0, 8)}`;

  await db.execute(sql`
    INSERT INTO "organization" (id, name, slug, created_at)
    VALUES (${id}, ${name}, ${id.slice(0, 8)}, NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  return { id, name };
}

/**
 * Create a test team.
 */
export async function createTestTeam(orgId: string, overrides?: Partial<{
  id: string;
  name: string;
}>): Promise<{ id: string; name: string }> {
  const id = overrides?.id || crypto.randomUUID();
  const name = overrides?.name || `Test Team ${id.slice(0, 8)}`;

  await db.insert(teams).values({
    id,
    organizationId: orgId,
    name,
  });

  return { id, name };
}

/**
 * Add a member to a team.
 */
export async function addTeamMember(teamId: string, userId: string, role: 'leader' | 'member' = 'member'): Promise<void> {
  await db.insert(teamMemberships).values({
    id: crypto.randomUUID(),
    teamId,
    userId,
    role,
  });
}

/**
 * Generate 66 deterministic responses approximating target scores.
 */
export function generateResponses(targets: { 
  safety?: number; 
  challenge?: number; 
  play?: number;
  [key: string]: number | undefined;
}): Array<{ itemId: string; value: number }> {
  const responses: Array<{ itemId: string; value: number }> = [];
  
  // Deterministic "randomness" using a simple LCG
  let seed = 123;
  function nextRandom() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // We need to map items to domains/dimensions.
  // For simplicity in tests, we'll assume a fixed mapping or just distribute them.
  // The Scoring Engine tests will define their own rules anyway.
  
  for (let i = 1; i <= 66; i++) {
    let target = 3;
    if (i <= 22) target = targets.safety ?? 3;
    else if (i <= 44) target = targets.challenge ?? 3;
    else target = targets.play ?? 3;

    // Add some deterministic jitter (+/- 1)
    const jitter = Math.floor(nextRandom() * 3) - 1; // -1, 0, or 1
    let value = Math.max(1, Math.min(5, Math.round(target + jitter)));
    
    responses.push({
      itemId: `item-${i}`,
      value
    });
  }

  return responses;
}

/**
 * Create a scored profile for a user.
 */
export async function createTestScoredProfile(userId: string, overrides?: any): Promise<{ id: string }> {
  // 1. Ensure Instrument exists
  let [instrument] = await db.select().from(instruments).where(eq(instruments.slug, 'base-diagnostic'));
  if (!instrument) {
    [instrument] = await db.insert(instruments).values({
      slug: 'base-diagnostic',
      name: 'Base Diagnostic',
      status: 'active'
    }).returning();
  }

  // 2. Ensure Version exists
  let [version] = await db.select().from(instrumentVersions).where(eq(instrumentVersions.instrumentId, instrument.id));
  if (!version) {
    [version] = await db.insert(instrumentVersions).values({
      instrumentId: instrument.id,
      versionNumber: 1,
      itemCount: 66,
      scoringStrategyKey: 'config-driven'
    }).returning();
  }

  const runId = crypto.randomUUID();
  const profileId = crypto.randomUUID();

  // 3. Create Run
  await db.insert(instrumentRuns).values({
    id: runId,
    userId,
    instrumentVersionId: version.id,
    status: 'completed',
    completedAt: new Date()
  });

  // 4. Create Scored Profile
  await db.insert(scoredProfiles).values({
    id: profileId,
    userId,
    instrumentRunId: runId,
    scoringStrategyKey: 'config-driven',
    scoringStrategyVersion: 1,
    safetyBand: overrides?.safetyBand || 'balanced',
    challengeBand: overrides?.challengeBand || 'balanced',
    playBand: overrides?.playBand || 'balanced',
    profilePayload: { domains: [], dimensions: [], alignments: [] }
  });

  return { id: profileId };
}

/**
 * Create a test purchase.
 */
export async function createTestPurchase(userId: string, type: string = 'individual_assessment'): Promise<{ id: string }> {
  const [purchase] = await db.insert(purchases).values({
    buyerUserId: userId,
    purchaseType: type as any,
    status: 'completed',
    amountCents: 1000,
    currency: 'usd',
    completedAt: new Date()
  }).returning();
  
  return { id: purchase.id };
}
