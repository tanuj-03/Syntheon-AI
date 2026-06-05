import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Proxy download to hide Supabase URL and force attachment download
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    const filename = searchParams.get('filename') || 'download';

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    // Verify path belongs to this user
    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Download file from Supabase storage
    const { data, error } = await supabaseAdmin.storage.from('ticket-attachments').download(path);

    if (error || !data) {
      console.error('Download error:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Stream back with forced download header
    // Sanitize filename: replace non-ASCII chars (e.g. U+202F narrow no-break space from macOS) with regular space
    const safeFilename = filename
      .replace(/[^\x00-\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const headers = new Headers();
    headers.set('Content-Type', data.type || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    headers.set('Content-Length', String(data.size));

    return new NextResponse(data, { headers });
  } catch (err) {
    console.error('GET /download error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
