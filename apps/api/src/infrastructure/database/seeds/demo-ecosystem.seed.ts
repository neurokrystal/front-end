import { db } from '../connection';
import { shareGrants } from '../../../domains/sharing/share-grant.schema';
import { betterAuthUser } from '../../auth/better-auth-refs.schema';
import { teams, teamMemberships } from '../../../domains/organization/features/team/team.schema';
import { eq } from 'drizzle-orm';

export async function seedDemoEcosystem() {
  console.log('Seeding demo ecosystem...');

  // 1. Create Users
  const usersToCreate = [
    { id: 'priya-sharma-id', name: 'Priya Sharma', email: 'priya@example.com' },
    { id: 'david-kim-id', name: 'David Kim', email: 'david@example.com' },
    { id: 'tom-wilson-id', name: 'Tom Wilson', email: 'tom@example.com' },
    { id: 'aisha-mohammed-id', name: 'Aisha Mohammed', email: 'aisha@example.com' },
    { id: 'lisa-park-id', name: 'Lisa Park', email: 'lisa@example.com' },
    { id: 'marcus-johnson-id', name: 'Marcus Johnson', email: 'marcus@example.com' },
    { id: 'alex-rivera-id', name: 'Alex Rivera', email: 'alex@example.com' },
    { id: 'sam-nakamura-id', name: 'Sam Nakamura', email: 'sam@example.com' },
    { id: 'james-okafor-id', name: 'James Okafor', email: 'james@example.com' },
  ];

  for (const u of usersToCreate) {
    await db.insert(betterAuthUser).values({ 
      id: u.id,
      email: u.email,
      name: u.name,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
    // In a real system, we'd also insert into the full user table with name/email
  }

  // 2. Create Teams
  const [teamAlpha] = await db.insert(teams).values({
    name: 'Team Alpha',
    organizationId: 'default-org-id', // Assuming a default org exists
  }).onConflictDoNothing().returning();

  const [teamBeta] = await db.insert(teams).values({
    name: 'Team Beta',
    organizationId: 'default-org-id',
  }).onConflictDoNothing().returning();

  const alphaId = teamAlpha?.id || 'team-alpha-id';
  const betaId = teamBeta?.id || 'team-beta-id';

  // 3. Set James as Leader of Team Alpha
  await db.insert(teamMemberships).values({
    teamId: alphaId,
    userId: 'james-okafor-id',
    role: 'leader',
  }).onConflictDoNothing();

  // 4. Create Share Grants
  const grants = [
    { subjectUserId: 'priya-sharma-id', targetType: 'team', targetTeamId: alphaId, resourceTypes: ['base', 'leader_adapted'], status: 'active' },
    { subjectUserId: 'david-kim-id', targetType: 'team', targetTeamId: alphaId, resourceTypes: ['base', 'leader_adapted'], status: 'active' },
    { subjectUserId: 'tom-wilson-id', targetType: 'team', targetTeamId: alphaId, resourceTypes: ['base', 'leader_adapted'], status: 'revoked' },
    { subjectUserId: 'aisha-mohammed-id', targetType: 'team', targetTeamId: alphaId, resourceTypes: ['base', 'leader_adapted'], status: 'active' },
    { subjectUserId: 'lisa-park-id', targetType: 'team', targetTeamId: betaId, resourceTypes: ['base', 'leader_adapted'], status: 'active' },
    { subjectUserId: 'marcus-johnson-id', targetType: 'team', targetTeamId: betaId, resourceTypes: ['base', 'leader_adapted'], status: 'active' },
    { subjectUserId: 'alex-rivera-id', targetType: 'user', targetUserId: 'sam-nakamura-id', resourceTypes: ['base'], status: 'active' },
  ];

  for (const g of grants) {
    await db.insert(shareGrants).values({
      ...g,
      targetType: g.targetType as any,
      status: g.status as any,
      grantedAt: new Date(),
    }).onConflictDoNothing();
  }

  console.log('Demo ecosystem seeded.');
}
