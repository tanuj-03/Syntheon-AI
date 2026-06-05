// app/api/deploy/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMeetingByBotId, updateMeetingDeployUrl, getMeetingById } from '@/lib/db';
import { db } from '@/db/index';
import { meetings as meetingsTable } from '@/db/schema';
import { isNull, isNotNull, desc, and } from 'drizzle-orm';

async function getGithubPagesUrl(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.html_url ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('GitHub webhook ref:', payload.ref);

    if (payload.ref !== 'refs/heads/main' || !payload.repository) {
      return NextResponse.json({ ok: true });
    }

    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;

    console.log('Push to main detected for:', owner, repo);

    const deployUrl = await getGithubPagesUrl(owner, repo);
    if (!deployUrl) {
      console.error('Could not fetch GitHub Pages URL');
      return NextResponse.json({ ok: true });
    }

    console.log('Deploy URL fetched:', deployUrl);

    // Find most recent meeting with branchName but no deployUrl
    const [meeting] = await db
      .select()
      .from(meetingsTable)
      .where(and(isNotNull(meetingsTable.branchName), isNull(meetingsTable.deployUrl)))
      .orderBy(desc(meetingsTable.date))
      .limit(1);

    if (!meeting) {
      console.log('No meeting found needing deploy URL');
      return NextResponse.json({ ok: true });
    }

    await updateMeetingDeployUrl(meeting.id, deployUrl);
    console.log('Deploy URL saved for meeting:', meeting.id, deployUrl);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Deploy webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
