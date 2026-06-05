import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { Webhook } from 'svix';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let event: any;
  try {
    event = wh.verify(payload, headers);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }

  if (event.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = event.data;

    await db.insert(users).values({
      id,
      email: email_addresses[0].email_address,
      name: `${first_name ?? ''} ${last_name ?? ''}`.trim() || 'User',
      plan: 'starter',
    });

    console.log('User created in DB:', id);
  }

  return NextResponse.json({ ok: true });
}
