// app/api/meetings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  deleteMeeting,
  deleteTicketsByMeetingId,
  deleteSpecsByMeetingId,
  getMeetingById,
} from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const meeting = await getMeetingById(id);
    if (!meeting || (orgId && meeting.org_id !== orgId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete tickets first then meeting (keep specs cleanup for migration compatibility)
    await deleteTicketsByMeetingId(id);
    await deleteSpecsByMeetingId(id);
    await deleteMeeting(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete meeting:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
