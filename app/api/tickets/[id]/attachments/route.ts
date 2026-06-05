import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getAttachmentsForTicket,
  createAttachment,
  deleteAttachment,
  getTicketById,
  createActivity,
} from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const attachments = await getAttachmentsForTicket(id);
    return NextResponse.json(attachments);
  } catch (err) {
    console.error('GET /attachments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId } = await params;
    const ticket = await getTicketById(ticketId);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await req.json();
    const { filename, file_url, file_size, file_type } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }
    if (!file_url || typeof file_url !== 'string') {
      return NextResponse.json({ error: 'file_url is required' }, { status: 400 });
    }
    if (typeof file_size !== 'number' || file_size <= 0) {
      return NextResponse.json({ error: 'file_size must be a positive number' }, { status: 400 });
    }

    const attachment = await createAttachment({
      ticket_id: ticketId,
      project_id: ticket.projectId ?? null,
      user_id: userId,
      filename,
      file_url,
      file_size,
      file_type: file_type ?? null,
    });

    // Log activity
    await createActivity({
      ticket_id: ticketId,
      user_id: userId,
      action_type: 'attachment_added',
      metadata: { filename, file_size },
    });

    // If this is a subticket, also log to parent
    if (ticket.parent_id) {
      await createActivity({
        ticket_id: ticket.parent_id,
        user_id: userId,
        action_type: 'attachment_added',
        metadata: { filename, file_size, subtask_id: ticketId },
      });
    }

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    console.error('POST /attachments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
