import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/index';
import { apiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has an existing API key
    const [row] = await db
      .select({ userId: apiKeys.userId })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .limit(1);

    return NextResponse.json({ hasKey: !!row });
  } catch (error) {
    console.error('Check key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
