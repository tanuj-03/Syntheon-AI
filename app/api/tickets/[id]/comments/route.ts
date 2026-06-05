import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import DOMPurify from 'isomorphic-dompurify';
import {
  getCommentsForTicket,
  createComment,
  deleteComment,
  getTicketById,
  createActivity,
  createNotification,
} from '@/lib/db';

const ALLOWED_TAGS = [
  'p',
  'strong',
  'em',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'code',
  'pre',
  'br',
];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const comments = await getCommentsForTicket(id);
    return NextResponse.json(comments);
  } catch (err) {
    console.error('GET /comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: ticketId } = await params;
    const ticket = await getTicketById(ticketId);
    if (!ticket || (orgId && ticket.org_id !== orgId)) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const comment = await createComment({
      ticket_id: ticketId,
      project_id: ticket.projectId ?? null,
      user_id: userId,
      content: DOMPurify.sanitize(content.trim(), { ALLOWED_TAGS, ALLOWED_ATTR }),
    });

    const plainContent = content
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Log activity
    await createActivity({
      ticket_id: ticketId,
      user_id: userId,
      action_type: 'comment_added',
      metadata: { content: plainContent },
    });

    // If this is a subticket, also log to parent
    if (ticket.parent_id) {
      await createActivity({
        ticket_id: ticket.parent_id,
        user_id: userId,
        action_type: 'comment_added',
        metadata: { content: plainContent, subtask_id: ticketId },
      });
    }

    // Notify @mentioned users
    const mentionRegex = /@\[(.+?)\]\((.+?)\)/g;
    const mentions = new Set<string>();
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUserId = match[2];
      if (mentionedUserId && mentionedUserId !== userId) {
        mentions.add(mentionedUserId);
      }
    }
    for (const mentionedUserId of mentions) {
      await createNotification({
        user_id: mentionedUserId,
        org_id: orgId ?? '',
        type: 'mentioned',
        title: 'You were mentioned in a comment',
        message: `On "${ticket.title}"`,
        ticket_id: ticketId,
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error('POST /comments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
