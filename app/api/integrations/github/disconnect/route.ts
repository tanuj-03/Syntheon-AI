import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deleteGithubIntegration } from '@/lib/services/integrations';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteGithubIntegration(userId);

    return NextResponse.json({ success: true, message: 'GitHub disconnected' });
  } catch (error) {
    console.error('Failed to disconnect GitHub:', error);
    return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 });
  }
}
