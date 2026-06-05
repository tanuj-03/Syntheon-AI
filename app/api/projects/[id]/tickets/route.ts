import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  addTicketsToProject,
  getMeetingById,
  getProjectById,
  getTicketsByProjectId,
  saveTickets,
  createActivity,
  createNotification,
} from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    const project = await getProjectById(projectId);
    const owned = orgId ? project?.org_id === orgId : project?.user_id === userId;

    if (!project || !owned) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await req.json();
    const title = String(body?.title ?? '').trim();
    const description = String(body?.description ?? '').trim();
    const meetingIdFromBody = typeof body?.meetingId === 'string' ? body.meetingId.trim() : '';
    const status =
      body?.status === 'done' || body?.status === 'in_progress' || body?.status === 'blocked'
        ? body.status
        : 'backlog';
    const assignee = body?.assignee ? String(body.assignee).trim() : null;
    const assigneeUserId = body?.assigneeUserId ? String(body.assigneeUserId).trim() : null;
    const parentTicketId =
      typeof body?.parentTicketId === 'string' && body.parentTicketId.trim()
        ? body.parentTicketId.trim()
        : null;
    const start_date = body?.start_date ? String(body.start_date) : null;
    const due_date = body?.due_date ? String(body.due_date) : null;
    const deadline_time = body?.deadline_time ? String(body.deadline_time) : null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (parentTicketId) {
      const projectTickets = await getTicketsByProjectId(projectId);
      const parent = projectTickets.find((ticket) => ticket.id === parentTicketId);
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent ticket does not belong to this project' },
          { status: 400 }
        );
      }
    }

    let resolvedMeetingId: string | null = meetingIdFromBody || null;

    if (resolvedMeetingId) {
      const meeting = await getMeetingById(resolvedMeetingId);
      if (
        !meeting ||
        meeting.projectId !== projectId ||
        (meeting.user_id && meeting.user_id !== userId)
      ) {
        return NextResponse.json(
          { error: 'Meeting does not belong to this project' },
          { status: 400 }
        );
      }
    }

    const ticketId = randomUUID();

    await saveTickets([
      {
        id: ticketId,
        user_id: userId,
        org_id: orgId ?? undefined,
        meeting_id: resolvedMeetingId,
        projectId,
        title,
        description,
        status,
        assignee,
        assignee_user_id: assigneeUserId,
        dependency_ticket_id: parentTicketId,
        start_date,
        due_date,
        deadline_time,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    await addTicketsToProject(projectId, [ticketId]);

    // Log activity for ticket creation
    await createActivity({
      ticket_id: ticketId,
      user_id: userId,
      action_type: 'created',
      metadata: { title },
    });

    // If this is a subticket, also log to parent
    if (parentTicketId) {
      await createActivity({
        ticket_id: parentTicketId,
        user_id: userId,
        action_type: 'subtask_created',
        metadata: { title, subtask_id: ticketId },
      });
    }

    // Notify the assignee (if any and not self)
    if (assigneeUserId && assigneeUserId !== userId) {
      await createNotification({
        user_id: assigneeUserId,
        org_id: orgId ?? '',
        type: 'assigned',
        title: 'New ticket assigned to you',
        message: `"${title}" was assigned to you`,
        ticket_id: ticketId,
      });
      // Also notify creator
      await createNotification({
        user_id: userId,
        org_id: orgId ?? '',
        type: 'assigned',
        title: 'Ticket assignment updated',
        message: `You assigned "${title}" to ${assignee}`,
        ticket_id: ticketId,
      });
    }

    return NextResponse.json({ success: true, ticketId, meetingId: resolvedMeetingId });
  } catch (error) {
    console.error('Failed to create project ticket:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
