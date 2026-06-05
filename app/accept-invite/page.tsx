'use client';

import { useEffect } from 'react';
import { useSignIn } from '@clerk/nextjs/legacy';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticket = searchParams.get('__clerk_ticket');
  const status = searchParams.get('__clerk_status');

  // Extract orgId from the invitation ticket JWT (the 'oid' claim)
  function getOrgIdFromTicket(t: string): string | null {
    try {
      const payload = t.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded.oid ?? null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!ticket || !authLoaded || !isLoaded) return;

    const orgId = getOrgIdFromTicket(ticket);

    (async () => {
      try {
        if (!signIn || !setActive) return;

        const result = await signIn.create({ strategy: 'ticket', ticket });

        if (result.status === 'complete') {
          // Set the session AND activate the invited org in one call
          await setActive({
            session: result.createdSessionId,
            organization: orgId ?? undefined,
          });
          router.replace('/dashboard');
        } else {
          router.replace('/sign-in');
        }
      } catch (err: any) {
        const code = err?.errors?.[0]?.code ?? '';

        // Ticket requires sign-up (new user)
        if (code === 'strategy_for_user_invalid' || status === 'sign_up') {
          router.replace(`/sign-up?__clerk_ticket=${ticket}&__clerk_status=sign_up`);
          return;
        }

        // Already signed in but Clerk blocked ticket creation —
        // sign out so the effect re-fires with isSignedIn=false and processes the ticket
        if (code === 'identifier_already_signed_in' || isSignedIn) {
          await clerk.signOut();
          return; // useEffect re-runs when isSignedIn flips to false
        }

        // Fallback to sign-in with ticket
        router.replace(`/sign-in?__clerk_ticket=${ticket}&__clerk_status=${status}`);
      }
    })();
  }, [authLoaded, isLoaded, isSignedIn, ticket, status]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        <p className="text-sm text-white/50">Accepting invitation...</p>
      </div>
    </div>
  );
}
