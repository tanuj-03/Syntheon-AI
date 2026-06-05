import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Body size limit for this route
export const bodyParser = {
  sizeLimit: '15mb',
};

export const maxBodyLength = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ticketId = formData.get('ticketId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    // Validate file size (max 15MB)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 15MB limit' }, { status: 400 });
    }

    // Validate file type against allowlist
    const ALLOWED_TYPE_PREFIXES = ['image/', 'application/pdf', 'text/', 'video/', 'audio/'];
    if (!ALLOWED_TYPE_PREFIXES.some((t) => file.type.startsWith(t))) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${ticketId}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('ticket-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('ticket-attachments')
      .getPublicUrl(filePath);

    return NextResponse.json({
      filePath,
      fileUrl: urlData.publicUrl,
      fileSize: file.size,
      fileType: file.type,
      filename: file.name,
    });
  } catch (err) {
    console.error('POST /upload error:', err);

    // Check for body size limit exceeded
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (
      errorMessage.includes('exceeded') ||
      errorMessage.includes('body size') ||
      errorMessage.includes('maximum') ||
      errorMessage.includes('payload too large') ||
      errorMessage.includes('Request body') ||
      errorMessage.includes('10MB')
    ) {
      return NextResponse.json({ error: 'File size exceeds 15MB limit' }, { status: 413 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
