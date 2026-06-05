// app/api/bot/continue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createBot } from '@/lib/skribby';
import { saveMeeting, getProjectById, getActiveMeetingByUrl, addMeetingToProject } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingUrl, projectId } = await req.json();

    if (!meetingUrl) {
      return NextResponse.json({ error: 'meetingUrl is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await getProjectById(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isFollowUpMeeting = (project.meetings?.length ?? 0) > 0;

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/bot/webhook`;

    // ⚠️ Bot created first (acceptable for now)
    const bot = await createBot(meetingUrl, webhookUrl);

    console.log(
      isFollowUpMeeting ? 'Follow-up bot created:' : 'First meeting bot created:',
      bot.id,
      'for project:',
      projectId
    );

    const meetingId = `meet-${Date.now()}`;
    const date = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    try {
      // 🔥 Attempt insert (DB handles uniqueness)
      await saveMeeting({
        id: meetingId,
        user_id: userId,
        org_id: orgId ?? undefined,
        projectName: isFollowUpMeeting
          ? `${project.name} — Follow-up ${date}`
          : `${project.name} — First meeting`,
        meetingId: meetingId,
        meeting_url: meetingUrl,
        platform: detectPlatform(meetingUrl),
        transcript: '',
        specsDetected: 0,
        status: 'processing',
        date: new Date().toISOString(),
        filePath: '',
        botId: bot.id,
        projectId: projectId,
      });

      await addMeetingToProject(projectId, meetingId);
    } catch (err: any) {
      console.log('Duplicate follow-up detected (DB constraint)');

      // 🔥 Fetch existing instead of failing
      const existing = await getActiveMeetingByUrl(meetingUrl, userId);

      if (existing) {
        return NextResponse.json({
          success: true,
          botId: existing.botId,
          meetingId: existing.id,
          reused: true,
          projectId: existing.projectId,
        });
      }

      throw err;
    }

    return NextResponse.json({
      success: true,
      botId: bot.id,
      meetingId,
      projectId,
      meetingType: isFollowUpMeeting ? 'follow-up' : 'first',
    });
  } catch (error) {
    console.error('Failed to create follow-up bot:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bot' },
      { status: 500 }
    );
  }
}

// 🔍 Detect platform
function detectPlatform(url: string) {
  if (url.includes('meet.google.com')) return 'google-meet';
  if (url.includes('teams.microsoft.com')) return 'teams';
  if (url.includes('zoom.us')) return 'zoom';
  return 'unknown';
}
