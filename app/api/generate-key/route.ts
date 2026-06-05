import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { db } from '@/db/index';
import { apiKeys } from '@/db/schema';
import { ensureUser } from '@/lib/ensureUser';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in DB before saving API key
    const email = user.emailAddresses[0]?.emailAddress;
    if (email) {
      await ensureUser(userId, email);
    }

    // Generate raw API key (shown only once)
    const rawKey = `syn_${crypto.randomBytes(32).toString('hex')}`;

    // Hash before storing
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Upsert → ensures ONE key per user (no duplicates)
    await db.insert(apiKeys).values({ userId, keyHash }).onConflictDoUpdate({
      target: apiKeys.userId,
      set: { keyHash },
    });

    // Return raw key ONLY ONCE
    return NextResponse.json({ apiKey: rawKey });
  } catch (err) {
    console.error('Generate key error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
