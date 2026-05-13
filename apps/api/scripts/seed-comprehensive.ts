import { createContainer } from '../src/container';
import { db } from '../src/infrastructure/database/connection';
import { betterAuthUser } from '../src/domains/user/user.schema';
import { teams, teamMemberships } from '../src/domains/organization/features/team/team.schema';
import { organizations } from '../src/domains/organization/organization.schema';
import { instruments, instrumentVersions, instrumentItems } from '../src/domains/instrument/instrument.schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Starting comprehensive seed...');
  const container = createContainer();

  // 1. Create Users
  const users = [
    { id: 'krystal-id', name: 'Krystal', email: 'krystal@dimensional.io', role: 'super_admin' },
    { id: 'sarah-id', name: 'Sarah Chen', email: 'sarah.chen@meridian.com', role: 'org_admin' },
    { id: 'james-id', name: 'James Okafor', email: 'james.okafor@meridian.com', role: 'team_leader' },
    { id: 'alex-id', name: 'Alex Rivera', email: 'alex@personal.com', role: 'individual' },
  ];

  for (const u of users) {
    await db.insert(betterAuthUser).values({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // role is usually in a separate profile table or handled by better-auth metadata
    }).onConflictDoNothing();
  }

  // 2. Create Organization & Teams
  const [meridian] = await db.insert(organizations).values({
    name: 'Meridian Consulting Group',
    slug: 'meridian',
  }).onConflictDoNothing().returning();

  if (meridian) {
    const [alpha] = await db.insert(teams).values({
      organizationId: meridian.id,
      name: 'Team Alpha',
      leaderUserId: 'james-id',
    }).onConflictDoNothing().returning();

    if (alpha) {
      await db.insert(teamMemberships).values({
        teamId: alpha.id,
        userId: 'james-id',
        role: 'leader',
      }).onConflictDoNothing();
    }
  }

  // 3. Create Instrument
  const [diag] = await db.insert(instruments).values({
    slug: 'base-diagnostic',
    name: 'Base Diagnostic',
    status: 'active',
  }).onConflictDoNothing().returning();

  if (diag) {
    const [v1] = await db.insert(instrumentVersions).values({
      instrumentId: diag.id,
      versionNumber: 1,
      itemCount: 3,
      scoringStrategyKey: 'dimensional_v1',
    }).onConflictDoNothing().returning();

    if (v1) {
      await db.insert(instrumentItems).values([
        { instrumentVersionId: v1.id, ordinal: 1, itemText: 'I feel safe at work.', domainTag: 'safety' },
        { instrumentVersionId: v1.id, ordinal: 2, itemText: 'I enjoy a challenge.', domainTag: 'challenge' },
        { instrumentVersionId: v1.id, ordinal: 3, itemText: 'I make time for play.', domainTag: 'play' },
      ]).onConflictDoNothing();
    }
  }

  // 4. Create Programme
  await container.programmeService.createProgramme({
    name: 'Building Safety',
    description: 'A 4-week journey to enhance your psychological safety.',
    targetDomain: 'safety',
    durationWeeks: 4,
    modules: [
      {
        id: 'm1',
        title: 'Introduction to Safety',
        description: 'Understand the foundation.',
        sequence: 1,
        estimatedMinutes: 15,
        content: [{ type: 'reading', title: 'The Safety Net', body: 'Safety is the ground we stand on.' }]
      }
    ]
  });

  console.log('Seed completed successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
