import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Get public URL for uploaded file
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    // Verify the path belongs to the user
    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data } = supabaseAdmin.storage.from('ticket-attachments').getPublicUrl(path);

    return NextResponse.json({ data });
  } catch (err) {
    console.error('GET /upload/url error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
