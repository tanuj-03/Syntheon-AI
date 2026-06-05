import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { buildOAuthAuthorizationUrl } from '@/lib/oauth/initiate';

export async function POST() {
  try {
    // Check if user is logged in
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build GitHub authorization URL
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    if (!clientId) {
      console.error('GITHUB_OAUTH_CLIENT_ID not set');
      return NextResponse.json({ error: 'OAuth not configured' }, { status: 500 });
    }

    // Build redirect URI from NEXT_PUBLIC_APP_URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (!baseUrl) {
      console.error('NEXT_PUBLIC_APP_URL not set');
      return NextResponse.json({ error: 'App URL not configured' }, { status: 500 });
    }
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/oauth/github/callback`;

    // Generate random state to prevent CSRF on OAuth flow
    const state = randomUUID();
    const cookieStore = await cookies();
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/',
    });

    const authorizationUrl = buildOAuthAuthorizationUrl({
      authorizeEndpoint: 'https://github.com/login/oauth/authorize',
      clientId,
      redirectUri,
      extraParams: {
        scope: 'repo',
        state,
      },
    });

    console.log('Redirecting to GitHub authorization...');

    return NextResponse.json({ authorizationUrl });
  } catch (error) {
    console.error('OAuth initiate error:', error);
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }
}
