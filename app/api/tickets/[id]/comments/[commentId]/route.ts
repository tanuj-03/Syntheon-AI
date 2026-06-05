import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteComment, updateComment, getTicketById, createActivity } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId, commentId } = await params;
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await deleteComment(commentId);

    // Log activity
    await createActivity({
      ticket_id: ticketId,
      user_id: userId,
      action_type: 'comment_deleted',
      metadata: { comment_id: commentId },
    });

    // If this is a subticket, also log to parent
    if (ticket.parent_id) {
      await createActivity({
        ticket_id: ticket.parent_id,
        user_id: userId,
        action_type: 'comment_deleted',
        metadata: { comment_id: commentId, subtask_id: ticketId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId, commentId } = await params;
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { content } = await req.json();
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const updated = await updateComment(commentId, content.trim());
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
