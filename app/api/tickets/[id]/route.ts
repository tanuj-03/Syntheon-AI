import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  deleteTicketById,
  getAllTickets,
  getAllTicketsByOrg,
  updateTicket,
  checkHardBlockers,
  cascadeDepRegressionForParent,
  getDependenciesForTicket,
  incrementDependencyIgnoreCount,
  createActivity,
  getTicketById,
  createNotification,
} from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { db } from '@/db/index';
import { tickets as ticketsTable } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const allowedStatuses = new Set(['backlog', 'in_progress', 'done', 'blocked']);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userTickets = orgId ? await getAllTicketsByOrg(orgId) : await getAllTickets(userId);
    let ticket = userTickets.find((item) => item.id === id);

    // Fallback: ticket may have been created before org_id was set — look up directly
    if (!ticket) {
      ticket = (await getTicketById(id)) ?? undefined;
      if (ticket && orgId && ticket.org_id !== orgId) ticket = undefined;
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await req.json();
    console.log('[TICKET PATCH] body:', JSON.stringify(body));
    const updates: Record<string, unknown> = {};

    if (typeof body?.title !== 'undefined') updates.title = String(body.title).trim();
    if (typeof body?.description !== 'undefined')
      updates.description = String(body.description).trim();
    if (typeof body?.status !== 'undefined') {
      const status = String(body.status);
      if (!allowedStatuses.has(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = status;
    }
    if (typeof body?.assignee !== 'undefined') {
      updates.assignee = body.assignee ? String(body.assignee).trim() : null;
    }
    if (typeof body?.assigneeUserId !== 'undefined') {
      updates.assignee_user_id = body.assigneeUserId ? String(body.assigneeUserId).trim() : null;
    }
    if (typeof body?.dependencyTicketId !== 'undefined') {
      updates.dependency_ticket_id = body.dependencyTicketId
        ? String(body.dependencyTicketId).trim()
        : null;
    }
    if (typeof body?.start_date !== 'undefined') {
      updates.start_date = body.start_date ? String(body.start_date) : null;
    }
    if (typeof body?.due_date !== 'undefined') {
      updates.due_date = body.due_date ? String(body.due_date) : null;
    }
    if (typeof body?.deadline_time !== 'undefined') {
      updates.deadline_time = body.deadline_time ? String(body.deadline_time) : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const newStatus = updates.status as string | undefined;
    const bypassGate = body?.bypassGate === true;

    // Block status changes when there are unresolved hard dependencies
    if (newStatus === 'in_progress' || newStatus === 'done') {
      const { blocked, blockers } = await checkHardBlockers(id);
      if (blocked) {
        return NextResponse.json(
          {
            error: 'hard_blocked',
            message: `This ticket has ${blockers.length} unresolved hard dependenc${blockers.length === 1 ? 'y' : 'ies'} that must be resolved first.`,
            blockers: blockers.map((b) => ({
              id: b.id,
              depends_on: b.depends_on_ticket_id,
              type: b.dependency_type,
            })),
          },
          { status: 422 }
        );
      }

      // Soft dependencies warn on any progressing status (in_progress or done)
      if (newStatus === 'in_progress' || newStatus === 'done') {
        const { parents } = await getDependenciesForTicket(id);
        const softParentIds = parents
          .filter((d) => d.strength === 'soft' && !d.escalated)
          .map((d) => d.depends_on_ticket_id);

        if (softParentIds.length > 0) {
          const softParentTickets = await db
            .select({ id: ticketsTable.id, status: ticketsTable.status })
            .from(ticketsTable)
            .where(inArray(ticketsTable.id, softParentIds));
          const unresolvedSoft = parents.filter((dep) => {
            if (dep.strength !== 'soft' || dep.escalated) return false;
            const parent = softParentTickets.find((t) => t.id === dep.depends_on_ticket_id);
            return parent?.status !== 'done';
          });

          if (unresolvedSoft.length > 0 && !bypassGate) {
            return NextResponse.json(
              {
                error: 'soft_blocked',
                message: `This ticket has ${unresolvedSoft.length} unresolved soft dependenc${unresolvedSoft.length === 1 ? 'y' : 'ies'}. You can proceed anyway.`,
                blockers: unresolvedSoft.map((b) => ({
                  id: b.id,
                  depends_on: b.depends_on_ticket_id,
                  type: b.dependency_type,
                  ignore_count: b.ignore_count,
                })),
              },
              { status: 422 }
            );
          }

          if (bypassGate && unresolvedSoft.length > 0) {
            await Promise.all(unresolvedSoft.map((d) => incrementDependencyIgnoreCount(d.id)));
          }
        }
      }
    }

    const previousStatus = ticket.status;
    const previousAssignee = ticket.assignee;
    await updateTicket(id, updates);

    // Log activity for status change
    if (newStatus && newStatus !== previousStatus) {
      await createActivity({
        ticket_id: id,
        user_id: userId,
        action_type: 'status_changed',
        metadata: { from: previousStatus, to: newStatus },
      });
    }

    // Log activity for assignee change
    const newAssignee = updates.assignee as string | null;
    const newAssigneeUserId = updates.assignee_user_id as string | null;
    console.log('[TICKET PATCH] assignee check:', {
      newAssignee,
      previousAssignee,
      newAssigneeUserId,
      userId,
      hasAssigneeChange: newAssignee !== undefined && newAssignee !== previousAssignee,
    });
    if (newAssignee !== undefined && newAssignee !== previousAssignee) {
      await createActivity({
        ticket_id: id,
        user_id: userId,
        action_type: 'assigned',
        metadata: { to: newAssignee || 'Unassigned' },
      });
      // Notify the new assignee
      if (newAssigneeUserId && newAssigneeUserId !== userId) {
        console.log('[NOTIFY] Assigning ticket to user:', newAssigneeUserId, 'org:', orgId);
        try {
          await createNotification({
            user_id: newAssigneeUserId,
            org_id: orgId ?? '',
            type: 'assigned',
            title: 'New ticket assigned to you',
            message: `"${ticket.title}" was assigned to you`,
            ticket_id: id,
          });
          console.log('[NOTIFY] Assignment notification created successfully');
        } catch (err) {
          console.error('[NOTIFY] Failed to create assignment notification:', err);
        }
        // Also notify the assigner
        try {
          await createNotification({
            user_id: userId,
            org_id: orgId ?? '',
            type: 'assigned',
            title: 'Ticket assignment updated',
            message: `You assigned "${ticket.title}" to ${newAssignee}`,
            ticket_id: id,
          });
        } catch (err) {
          console.error('[NOTIFY] Failed to create assigner notification:', err);
        }
      }
    }

    // Notify when ticket is moved to blocked
    if (newStatus === 'blocked' && previousStatus !== 'blocked') {
      const targetUserId = (updates.assignee_user_id as string | null) ?? ticket.assignee_user_id;
      if (targetUserId) {
        console.log('[NOTIFY] Ticket blocked, notifying assignee:', targetUserId);
        try {
          await createNotification({
            user_id: targetUserId,
            org_id: orgId ?? '',
            type: 'blocked',
            title: 'Ticket moved to blocked',
            message: `"${ticket.title}" is now blocked`,
            ticket_id: id,
          });
        } catch (err) {
          console.error('[NOTIFY] Failed to create blocked notification:', err);
        }
      }
    }

    // Log one activity per changed field with from/to values
    const ignoredKeys = ['status', 'assignee', 'assignee_user_id'];
    const fieldLabels: Record<string, string> = {
      title: 'title',
      description: 'description',
      start_date: 'start date',
      due_date: 'due date',
      deadline_time: 'deadline time',
      dependency_ticket_id: 'dependency',
    };
    const changedKeys = Object.keys(updates).filter((k) => !ignoredKeys.includes(k));
    for (const key of changedKeys) {
      const oldVal = ticket[key as keyof typeof ticket];
      const newVal = updates[key];
      await createActivity({
        ticket_id: id,
        user_id: userId,
        action_type: 'updated',
        metadata: {
          field: fieldLabels[key] ?? key,
          from: (oldVal ?? 'not set') as string,
          to: (newVal ?? 'not set') as string,
        },
      });
    }

    if (previousStatus === 'done' && newStatus && newStatus !== 'done') {
      await cascadeDepRegressionForParent(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userTickets = await getAllTicketsByOrg(ctx.orgId);
    let ticket = userTickets.find((item) => item.id === id);

    if (!ticket) {
      ticket = (await getTicketById(id)) ?? undefined;
      if (ticket && ticket.org_id !== ctx.orgId) ticket = undefined;
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await deleteTicketById(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
