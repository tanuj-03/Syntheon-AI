import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getIntegrationStatus } from '@/lib/services/integrations';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getIntegrationStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Integrations status error:', error);
    return NextResponse.json({ error: 'Failed to fetch integration status' }, { status: 500 });
  }
}
