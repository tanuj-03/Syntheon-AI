import { db } from '@/db/index';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function ensureUser(userId: string, email: string) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length > 0) {
    console.log('User exists (by ID)');
    return;
  }

  try {
    await db.insert(users).values({ id: userId, email });
    console.log('User created');
  } catch (err) {
    console.error('ensureUser insert failed:', err);
    throw err;
  }
}
