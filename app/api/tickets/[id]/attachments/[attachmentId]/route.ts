import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteAttachment, getTicketById, createActivity } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId, attachmentId } = await params;
    const ticket = await getTicketById(ticketId);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await deleteAttachment(attachmentId);

    // Log activity
    await createActivity({
      ticket_id: ticketId,
      user_id: userId,
      action_type: 'attachment_deleted',
      metadata: { attachment_id: attachmentId },
    });

    // If this is a subticket, also log to parent
    if (ticket.parent_id) {
      await createActivity({
        ticket_id: ticket.parent_id,
        user_id: userId,
        action_type: 'attachment_deleted',
        metadata: { attachment_id: attachmentId, subtask_id: ticketId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /attachments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
