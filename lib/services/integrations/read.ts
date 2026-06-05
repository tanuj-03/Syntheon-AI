import { db } from '@/db/index';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';

export type IntegrationRow = Record<string, any> | null;

export async function getIntegrationByUserId(userId: string): Promise<IntegrationRow> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, userId))
    .limit(1);
  if (!row) return null;
  return {
    github_token: row.githubToken,
    github_owner: row.githubOwner,
    github_access_token: row.githubAccessToken,
  };
}

export function getGithubToken(integration: IntegrationRow): string | null {
  if (!integration) return null;
  const token = integration.github_token || null;
  if (!token) return null;
  try {
    return decrypt(token);
  } catch {
    return token;
  }
}

export function getGithubOwner(integration: IntegrationRow): string | null {
  if (!integration) return null;
  return integration.github_owner || null;
}

export async function getIntegrationStatus(userId: string) {
  const integration = await getIntegrationByUserId(userId);
  return {
    githubConnected: Boolean(getGithubToken(integration)),
    githubUser: getGithubOwner(integration),
  };
}
