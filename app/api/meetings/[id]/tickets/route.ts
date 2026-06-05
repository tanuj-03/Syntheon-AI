import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  getTicketsByMeetingId,
  getTicketsByProjectId,
  updateTicketAssignee,
  updateTicketStatus,
  updateTicketDependency,
  saveTickets,
  getMeetingById,
  addTicketsToProject,
  createNotification,
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

    const tickets = await getTicketsByMeetingId(id, { originalOnly: true });
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const meetingCheck = await getMeetingById(id);
    if (!meetingCheck || (orgId && meetingCheck.org_id !== orgId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const title = String(body?.title ?? '').trim();
    const description = String(body?.description ?? '').trim();
    const status =
      body?.status === 'done' || body?.status === 'in_progress' || body?.status === 'blocked'
        ? body.status
        : 'backlog';
    const assignee = body?.assignee ? String(body.assignee).trim() : null;
    const assigneeUserId = body?.assigneeUserId ? String(body.assigneeUserId).trim() : null;
    const meeting = await getMeetingById(id);
    const resolvedProjectId = body?.projectId ?? meeting?.projectId ?? null;
    const parentTicketId =
      typeof body?.parentTicketId === 'string' && body.parentTicketId.trim()
        ? body.parentTicketId.trim()
        : null;
    const ticketId = randomUUID();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (parentTicketId) {
      if (resolvedProjectId) {
        const projectTickets = await getTicketsByProjectId(resolvedProjectId);
        const parent = projectTickets.find((ticket) => ticket.id === parentTicketId);
        if (!parent) {
          return NextResponse.json(
            { error: 'Parent ticket does not belong to this project' },
            { status: 400 }
          );
        }
      } else {
        const meetingTickets = await getTicketsByMeetingId(id);
        const parent = meetingTickets.find((ticket) => ticket.id === parentTicketId);
        if (!parent) {
          return NextResponse.json(
            { error: 'Parent ticket does not belong to this meeting' },
            { status: 400 }
          );
        }
      }
    }

    await saveTickets([
      {
        id: ticketId,
        user_id: userId,
        org_id: orgId ?? undefined,
        meeting_id: id,
        projectId: resolvedProjectId,
        title,
        description,
        status,
        assignee,
        assignee_user_id: assigneeUserId,
        dependency_ticket_id: parentTicketId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    if (resolvedProjectId) {
      await addTicketsToProject(resolvedProjectId, [ticketId]);
    }

    // Notify assignee on creation (if any and not self)
    if (assigneeUserId && assigneeUserId !== userId) {
      await createNotification({
        user_id: assigneeUserId,
        org_id: orgId ?? '',
        type: 'assigned',
        title: 'New ticket assigned to you',
        message: `"${title}" was assigned to you`,
        ticket_id: ticketId,
      });
      await createNotification({
        user_id: userId,
        org_id: orgId ?? '',
        type: 'assigned',
        title: 'Ticket assignment updated',
        message: `You assigned "${title}" to ${assignee}`,
        ticket_id: ticketId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const meetingCheck = await getMeetingById(id);
    if (!meetingCheck || (orgId && meetingCheck.org_id !== orgId)) {
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
