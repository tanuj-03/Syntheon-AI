import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/how-it-works',
  '/legal',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/accept-invite(.*)',
  '/onboarding(.*)',
  '/api/bot/webhook(.*)',
  '/api/deploy/webhook(.*)',
  '/api/auth/webhook(.*)',
  '/api/bot/create',
  '/api/webhooks(.*)',
]);

const isDashboardRoute = createRouteMatcher(['/dashboard(.*)', '/project(.*)', '/settings(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  const { userId, orgId } = await auth();

  // Not signed in → protect (Clerk handles redirect to sign-in)
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Signed in but no org → redirect to onboarding
  if (userId && !orgId && isDashboardRoute(request)) {
    const onboardingUrl = new URL('/onboarding', request.url);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
