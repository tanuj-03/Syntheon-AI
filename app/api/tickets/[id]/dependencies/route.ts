import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  getAllTickets,
  getAllTicketsByOrg,
  createDependency,
  getDependenciesForTicket,
  createActivity,
  type DependencyType,
  type DependencyStrength,
} from '@/lib/db';

const DEP_TYPES = new Set<DependencyType>(['data', 'structural', 'logical', 'resource']);
const DEP_STRENGTHS = new Set<DependencyStrength>(['soft', 'hard']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userTickets = orgId ? await getAllTicketsByOrg(orgId) : await getAllTickets(userId);
    if (!userTickets.find((t) => t.id === id)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const deps = await getDependenciesForTicket(id);
    return NextResponse.json(deps);
  } catch (err) {
    console.error('GET /dependencies error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId } = await params;
    const userTickets = orgId ? await getAllTicketsByOrg(orgId) : await getAllTickets(userId);
    const ticket = userTickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    if (!ticket.projectId) {
      return NextResponse.json(
        { error: 'Ticket is not associated with a project' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { depends_on_ticket_id, dependency_type, strength, note } = body;

    if (!depends_on_ticket_id || typeof depends_on_ticket_id !== 'string') {
      return NextResponse.json({ error: 'depends_on_ticket_id is required' }, { status: 400 });
    }
    if (!DEP_TYPES.has(dependency_type)) {
      return NextResponse.json(
        { error: `dependency_type must be one of: ${[...DEP_TYPES].join(', ')}` },
        { status: 400 }
      );
    }
    if (!DEP_STRENGTHS.has(strength)) {
      return NextResponse.json(
        { error: `strength must be one of: ${[...DEP_STRENGTHS].join(', ')}` },
        { status: 400 }
      );
    }

    const result = await createDependency({
      id: randomUUID(),
      project_id: ticket.projectId,
      ticket_id: ticketId,
      depends_on_ticket_id,
      dependency_type,
      strength,
      note: note ?? null,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Log activity
    await createActivity({
      ticket_id: ticketId,
      user_id: userId,
      action_type: 'dependency_added',
      metadata: { depends_on_ticket_id, dependency_type, strength },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /dependencies error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
