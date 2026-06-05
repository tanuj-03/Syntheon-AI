import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getActivitiesForTicket, createActivity, getTicketById } from '@/lib/db';

// GET /api/tickets/[id]/activities
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId } = await params;

    // Verify ticket exists and user has access
    const ticket = await getTicketById(ticketId);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const activities = await getActivitiesForTicket(ticketId);
    return NextResponse.json(activities);
  } catch (err) {
    console.error('GET /activities error:', err);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

// POST /api/tickets/[id]/activities
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId } = await params;
    const body = await req.json();
    const { action_type, metadata = {} } = body;

    if (!action_type) {
      return NextResponse.json({ error: 'action_type is required' }, { status: 400 });
    }

    // Verify ticket exists and user has access
    const ticket = await getTicketById(ticketId);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const activity = await createActivity({
      ticket_id: ticketId,
      user_id: userId,
      action_type,
      metadata,
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (err) {
    console.error('POST /activities error:', err);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
