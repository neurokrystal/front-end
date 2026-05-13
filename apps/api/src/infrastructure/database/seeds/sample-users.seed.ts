import { db } from '../connection';
import { betterAuthUser } from '@/infrastructure/auth/better-auth-refs.schema';
import { userProfiles } from '@/domains/user/user.schema';
import { eq } from 'drizzle-orm';

export async function seedUsers() {
  console.log('Seeding users...');

  const sampleUsers = [
    {
      id: 'user_1',
      name: 'Admin User',
      email: 'admin@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user_2',
      name: 'Sample Coach',
      email: 'coach@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user_3',
      name: 'Sample Client',
      email: 'client@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const userData of sampleUsers) {
    const existing = await db.select().from(betterAuthUser).where(eq(betterAuthUser.email, userData.email)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(betterAuthUser).values(userData);
      
      // Also create a user profile
      await db.insert(userProfiles).values({
        userId: userData.id,
        displayName: userData.name,
        profileType: 'full',
      });
      
      console.log(`Created user: ${userData.email}`);
    } else {
      console.log(`User already exists: ${userData.email}`);
    }
  }
}
