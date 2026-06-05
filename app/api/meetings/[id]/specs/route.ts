// app/api/meetings/[id]/specs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getTicketsByMeetingId,
  updateTicketStatus,
  updateTicketAssignee,
  updateTicketDependency,
  getMeetingById,
} from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting || (orgId && meeting.org_id !== orgId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const tickets = await getTicketsByMeetingId(id);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting || (orgId && meeting.org_id !== orgId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { ticketId, status, assignee, assigneeUserId, dependencyTicketId } = await req.json();

    const meetingTickets = await getTicketsByMeetingId(id);
    if (!meetingTickets.find((t) => t.id === ticketId)) {
      return NextResponse.json({ error: 'Ticket not in meeting' }, { status: 404 });
    }

    if (status) {
      await updateTicketStatus(ticketId, status);
    }

    if (typeof assignee !== 'undefined' || typeof assigneeUserId !== 'undefined') {
      await updateTicketAssignee(ticketId, assignee ?? null, assigneeUserId ?? null);
    }

    if (typeof dependencyTicketId !== 'undefined') {
      await updateTicketDependency(ticketId, dependencyTicketId ?? null);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
