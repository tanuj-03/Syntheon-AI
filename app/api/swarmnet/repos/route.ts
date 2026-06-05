// app/api/swarmnet/repos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listRepos } from '@/lib/shipai/github';
import { getIntegrationByUserId, getGithubToken } from '@/lib/services/integrations';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const integration = await getIntegrationByUserId(userId);
    const githubToken = getGithubToken(integration);
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    const repos = await listRepos(githubToken);
    return NextResponse.json({
      success: true,
      repos: repos.map((r) => ({ fullName: r.full_name, name: r.name, owner: r.owner.login })),
    });
  } catch (error) {
    console.error('List repos error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list repos' },
      { status: 500 }
    );
  }
}
