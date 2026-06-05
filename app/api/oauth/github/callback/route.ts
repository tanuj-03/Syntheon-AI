import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { ensureUser } from '@/lib/ensureUser';
import { getSettingsRedirectUrl } from '@/lib/oauth/redirect';
import { saveGithubIntegration } from '@/lib/services/integrations';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = await currentUser();

    if (!session.userId || !user) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    const userId = session.userId;
    const email = user.emailAddresses[0].emailAddress;
    await ensureUser(userId, email);

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Validate OAuth state to prevent CSRF
    const stateParam = searchParams.get('state');
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    cookieStore.delete('oauth_state');

    if (!stateParam || stateParam !== storedState) {
      const redirectUrl = getSettingsRedirectUrl(req);
      redirectUrl.searchParams.set('github_error', 'invalid_state');
      return NextResponse.redirect(redirectUrl);
    }

    if (error) {
      const redirectUrl = getSettingsRedirectUrl(req);
      redirectUrl.searchParams.set('github_error', error);
      if (errorDescription) {
        redirectUrl.searchParams.set('github_error_detail', errorDescription);
      }
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      const redirectUrl = getSettingsRedirectUrl(req);
      redirectUrl.searchParams.set('github_error', 'no_code');
      return NextResponse.redirect(redirectUrl);
    }

    console.log('Exchanging GitHub code for token...');

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      const redirectUrl = getSettingsRedirectUrl(req);
      redirectUrl.searchParams.set('github_error', tokenData.error || 'token_exchange_failed');
      if (tokenData.error_description) {
        redirectUrl.searchParams.set('github_error_detail', tokenData.error_description);
      }
      return NextResponse.redirect(redirectUrl);
    }

    const accessToken = tokenData.access_token;

    console.log('Verifying token...');

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const githubUser = await userResponse.json();

    if (!userResponse.ok) {
      console.error('Failed to verify token:', githubUser);
      const redirectUrl = getSettingsRedirectUrl(req);
      redirectUrl.searchParams.set('github_error', 'token_invalid');
      return NextResponse.redirect(redirectUrl);
    }

    console.log('GitHub user verified:', githubUser.login);

    await saveGithubIntegration({
      userId,
      githubToken: accessToken,
      githubOwner: githubUser.login,
    });

    const redirectUrl = getSettingsRedirectUrl(req);
    redirectUrl.searchParams.set('github_connected', 'true');
    redirectUrl.searchParams.set('github_user', githubUser.login);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);

    const redirectUrl = getSettingsRedirectUrl(req);
    redirectUrl.searchParams.set('github_error', 'callback_error');
    const message = error instanceof Error ? error.message : 'Unknown callback error';
    redirectUrl.searchParams.set('github_error_detail', message);

    return NextResponse.redirect(redirectUrl);
  }
}
