import { NextRequest, NextResponse } from 'next/server';
import { getBotTranscript } from '@/lib/skribby';
import { extractTickets } from '@/lib/groq';
import {
  getMeetingByBotId,
  updateMeetingStatus,
  updateMeetingSpecs,
  updateMeetingName,
  saveExtractedTickets,
  addTicketsToProject,
  getProjectById,
  updateProject,
} from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/webhook';

export async function POST(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    const webhookSigningSecret = process.env.SKRIBBY_WEBHOOK_SECRET;
    const webhookAccessToken =
      process.env.WEBHOOK_ACCESS_TOKEN ?? process.env.SKRIBBY_WEBHOOK_SECRET;
    const rawPayload = await req.text();
    const signature =
      req.headers.get('x-webhook-signature') ??
      req.headers.get('x-skribby-signature') ??
      req.headers.get('webhook-signature') ??
      req.headers.get('x-signature');

    console.log('📋 Raw Payload:', rawPayload);
    console.log('🔑 Signature Header:', signature);
    console.log('🪪 Token present:', Boolean(token));

    if (!webhookAccessToken && !webhookSigningSecret) {
      console.error('WEBHOOK_ACCESS_TOKEN and SKRIBBY_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    if (token && webhookAccessToken && token === webhookAccessToken) {
      console.log('✅ Webhook token accepted');
    } else if (token) {
      console.warn('❌ Invalid webhook token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    } else if (!signature) {
      const allowUnsignedWebhooks =
        process.env.NODE_ENV !== 'production' &&
        process.env.SKRIBBY_ALLOW_UNSIGNED_WEBHOOKS === 'true';

      if (!allowUnsignedWebhooks) {
        console.warn('❌ Missing webhook signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      console.warn(
        '⚠️ No webhook signature header, allowing unsigned webhook only in local development'
      );
    } else {
      if (!webhookSigningSecret) {
        console.error('SKRIBBY_WEBHOOK_SECRET not configured for signature verification');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
      }

      const isValid = verifyWebhookSignature({
        secret: webhookSigningSecret,
        payload: rawPayload,
        signature: signature,
      });

      if (!isValid) {
        console.warn('❌ Webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      console.log('✅ Webhook signature verified');
    }

    // Parse JSON after verification
    const payload = JSON.parse(rawPayload);

    // Rest of your existing code stays the same...
    if (payload.type !== 'status_update') return NextResponse.json({ ok: true });
    if (payload.data?.new_status === 'not_admitted') {
      const botId = payload.bot_id;

      if (!botId) {
        console.error('No botId in payload:', JSON.stringify(payload));
        return NextResponse.json({ ok: true });
      }

      const meeting = await getMeetingByBotId(botId);
      if (!meeting) {
        console.error('No meeting found for botId:', botId);
        return NextResponse.json({ ok: true });
      }

      await updateMeetingStatus(meeting.id, 'not_admitted');
      return NextResponse.json({ ok: true });
    }
    if (payload.data?.new_status !== 'finished') return NextResponse.json({ ok: true });

    const botId = payload.bot_id;
    console.log('Meeting finished, botId:', botId);

    if (!botId) {
      console.error('No botId in payload:', JSON.stringify(payload));
      return NextResponse.json({ ok: true });
    }

    const meeting = await getMeetingByBotId(botId);

    if (!meeting) {
      console.error('No meeting found for botId:', botId);
      return NextResponse.json({ ok: true });
    }

    console.log('Fetching transcript for bot:', botId);
    const botData = await getBotTranscript(botId);

    const rawTranscript = botData.transcript;
    const transcript = Array.isArray(rawTranscript)
      ? rawTranscript.map((t: any) => t.transcript).join(' ')
      : typeof rawTranscript === 'string'
        ? rawTranscript
        : '';

    console.log('Transcript length:', transcript.length);

    if (!transcript.trim()) {
      console.error('Empty transcript');
      await updateMeetingStatus(meeting.id, 'failed');
      return NextResponse.json({ ok: true });
    }

    const { tickets, title } = await extractTickets(transcript, meeting.id);
    console.log(`Extracted ${tickets.length} tickets`);

    const ticketsWithUser = tickets.map((ticket: any) => ({
      ...ticket,
      user_id: meeting.user_id,
      org_id: meeting.org_id ?? null,
      projectId: meeting.projectId ?? null,
      project_id: meeting.projectId ?? null,
    }));

    const insertedTickets = await saveExtractedTickets(ticketsWithUser);

    await updateMeetingSpecs(meeting.id, transcript, insertedTickets.length);
    await updateMeetingName(meeting.id, title);

    if (meeting.projectId) {
      await addTicketsToProject(
        meeting.projectId,
        insertedTickets.map((ticket: any) => ticket.id)
      );
      console.log('Tickets linked to project:', meeting.projectId);

      const project = await getProjectById(meeting.projectId);
      if (project && project.meetings[0] === meeting.id) {
        await updateProject(meeting.projectId, { name: title });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
