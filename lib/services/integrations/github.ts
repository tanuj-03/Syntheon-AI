import { db } from '@/db/index';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';

export async function saveGithubIntegration(params: {
  userId: string;
  githubToken: string;
  githubOwner: string;
}) {
  await db
    .insert(integrations)
    .values({
      userId: params.userId,
      githubToken: encrypt(params.githubToken),
      githubOwner: params.githubOwner,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: integrations.userId,
      set: {
        githubToken: encrypt(params.githubToken),
        githubOwner: params.githubOwner,
        updatedAt: new Date(),
      },
    });
}

export async function deleteGithubIntegration(userId: string) {
  await db
    .update(integrations)
    .set({
      githubToken: null,
      githubOwner: null,
      updatedAt: new Date(),
    })
    .where(eq(integrations.userId, userId));
}
