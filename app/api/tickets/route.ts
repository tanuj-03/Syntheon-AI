import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  cascadeDepRegressionForParent,
  checkHardBlockers,
  getAllTickets,
  getAllTicketsByOrg,
  getDependenciesForTicket,
  incrementDependencyIgnoreCount,
  updateTicketStatus,
} from '@/lib/db';
import { db } from '@/db/index';
import { tickets as ticketsTable } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = orgId ? await getAllTicketsByOrg(orgId) : await getAllTickets(userId);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const changes = Array.isArray(body?.changes) ? body.changes : [];

    if (changes.length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const allowedStatuses = new Set(['backlog', 'in_progress', 'done', 'blocked']);
    const bypassGate = body?.bypassGate === true;
    const userTickets = orgId ? await getAllTicketsByOrg(orgId) : await getAllTickets(userId);
    const userTicketIds = new Set(userTickets.map((ticket) => ticket.id));
    const ticketById = new Map(userTickets.map((ticket) => [ticket.id, ticket]));

    for (const change of changes) {
      const ticketId = typeof change?.ticketId === 'string' ? change.ticketId : '';
      const status = typeof change?.status === 'string' ? change.status : '';

      if (!ticketId || !allowedStatuses.has(status)) {
        return NextResponse.json({ error: 'Invalid ticket update payload' }, { status: 400 });
      }

      if (!userTicketIds.has(ticketId)) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
    }

    for (const change of changes) {
      const ticketId = change.ticketId as string;
      const status = change.status as 'backlog' | 'in_progress' | 'done' | 'blocked';

      if (status === 'in_progress') {
        const { blocked, blockers } = await checkHardBlockers(ticketId);
        if (blocked) {
          return NextResponse.json(
            {
              error: 'hard_blocked',
              ticketId,
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

        const { parents } = await getDependenciesForTicket(ticketId);
        const softParents = parents.filter((d) => d.strength === 'soft' && !d.escalated);
        if (softParents.length > 0) {
          const softParentIds = softParents.map((d) => d.depends_on_ticket_id);
          const softParentTickets = await db
            .select({ id: ticketsTable.id, status: ticketsTable.status })
            .from(ticketsTable)
            .where(inArray(ticketsTable.id, softParentIds));

          const unresolvedSoft = softParents.filter((dep) => {
            const parent = softParentTickets.find((t) => t.id === dep.depends_on_ticket_id);
            return parent?.status !== 'done';
          });

          if (unresolvedSoft.length > 0 && !bypassGate) {
            return NextResponse.json(
              {
                error: 'soft_blocked',
                ticketId,
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

      const previousStatus = ticketById.get(ticketId)?.status;
      await updateTicketStatus(ticketId, status);

      if (previousStatus === 'done' && status !== 'done') {
        await cascadeDepRegressionForParent(ticketId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update tickets:', error);
    return NextResponse.json({ error: 'Failed to update tickets' }, { status: 500 });
  }
}
