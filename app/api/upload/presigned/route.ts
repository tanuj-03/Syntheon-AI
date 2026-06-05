import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTicketById } from '@/lib/db';

export const runtime = 'nodejs';

// Generate a presigned URL for direct Supabase upload
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { filename, ticketId, fileSize, fileType } = body;

    if (!filename || !ticketId) {
      return NextResponse.json({ error: 'filename and ticketId required' }, { status: 400 });
    }

    // Verify ticket ownership
    const ticket = await getTicketById(ticketId);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Validate file size (max 15MB)
    const maxSize = 15 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 15MB limit' }, { status: 400 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${ticketId}/${timestamp}_${sanitizedName}`;

    // Create signed URL for upload (valid for 60 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from('ticket-attachments')
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error('Signed URL error:', error);
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      filePath,
      token: data.token,
    });
  } catch (err) {
    console.error('POST /upload/presigned error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
