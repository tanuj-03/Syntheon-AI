'use client';

import dynamic from 'next/dynamic';
import { useSignUp } from '@clerk/nextjs/legacy';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

const PixelBlast = dynamic(() => import('@/components/PixelBlast'), { ssr: false });

/* ── Social button SVGs ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.97-6.19A24 24 0 0 0 0 24c0 3.77.87 7.37 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 98 96" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.06 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6C29.304 70.3 17.9 66.062 17.9 47.044c0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.57 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 19.018-11.497 23.175-22.428 24.396 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0Z"
      />
    </svg>
  );
}

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clerkTicket = searchParams.get('__clerk_ticket');
  const clerkStatus = searchParams.get('__clerk_status');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  // Handle organization invitation ticket (sign-up flow)
  useEffect(() => {
    if (!clerkTicket) return;
    if (!authLoaded || !isLoaded) return;

    // If ticket is sign_in type but we're on sign-up, redirect to sign-in
    if (clerkStatus === 'sign_in') {
      router.replace(`/sign-in?__clerk_ticket=${clerkTicket}&__clerk_status=sign_in`);
      return;
    }

    if (clerkStatus !== 'sign_up') return;
    setAcceptingInvite(true);

    (async () => {
      try {
        // Already signed in — hand off to the dedicated accept-invite page
        if (isSignedIn) {
          router.replace(
            `/accept-invite?__clerk_ticket=${clerkTicket}&__clerk_status=${clerkStatus}`
          );
          return;
        }

        if (!signUp || !setActive) return;
        const result = await signUp.create({ strategy: 'ticket', ticket: clerkTicket });
        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          router.push('/onboarding');
        } else if (result.status === 'missing_requirements') {
          // Needs email verification or extra info — show form pre-filled
          setError('Please complete your account details to accept the invitation.');
          setAcceptingInvite(false);
        } else {
          setError('Could not accept invitation. Please complete the form.');
          setAcceptingInvite(false);
        }
      } catch (err: any) {
        const code = err?.errors?.[0]?.code ?? '';
        // Ticket is for existing user — redirect to sign-in
        if (code === 'strategy_for_user_invalid' || code === 'not_allowed_access') {
          router.replace(`/sign-in?__clerk_ticket=${clerkTicket}&__clerk_status=sign_in`);
          return;
        }
        if (code === 'identifier_already_signed_in' || isSignedIn) {
          router.push('/dashboard');
          return;
        }
        setError(err.errors?.[0]?.longMessage || 'Invitation accept failed');
        setAcceptingInvite(false);
      }
    })();
  }, [authLoaded, isLoaded, isSignedIn, clerkTicket, clerkStatus]);

  async function handleOAuth(strategy: 'oauth_google' | 'oauth_github') {
    if (!isLoaded || !signUp) return;
    const redirectUrlComplete = clerkTicket
      ? `/accept-invite?__clerk_ticket=${clerkTicket}&__clerk_status=${clerkStatus ?? 'sign_in'}`
      : '/onboarding';
    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete,
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'OAuth failed');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setLoading(true);
    setError('');

    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/onboarding');
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* ── Full-screen PixelBlast background ── */}
      <div className="absolute inset-0 z-0">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#B497CF"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          speed={0.6}
          edgeFade={0.15}
          transparent
        />
      </div>

      {/* ── Content layer ── */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left: Branding */}
        <div className="hidden lg:flex relative w-[50%] items-center justify-center">
          <h1 className="font-[var(--font-dm-serif)] text-7xl xl:text-8xl text-white tracking-tight select-none">
            <span className="bg-gradient-to-br from-white via-purple-200 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_80px_rgba(180,151,207,0.4)]">
              Syntheon
            </span>
          </h1>
        </div>

        {/* Right: Sign-up form */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[400px]">
            {/* Mobile branding */}
            <h1 className="lg:hidden font-[var(--font-dm-serif)] text-4xl tracking-tight text-center mb-10">
              <span className="bg-gradient-to-br from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
                Syntheon
              </span>
            </h1>

            {/* Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 shadow-2xl shadow-black/60">
              {acceptingInvite ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                  <p className="text-sm text-white/60">Accepting invitation...</p>
                  {error && (
                    <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mt-2">
                      {error}
                    </p>
                  )}
                </div>
              ) : !pendingVerification ? (
                <>
                  <h2 className="text-xl font-semibold text-white text-center">Create account</h2>
                  <p className="text-sm text-white/40 text-center mt-1 mb-6">
                    Get started with Syntheon.
                  </p>

                  {/* Social */}
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOAuth('oauth_google')}
                      className="flex items-center justify-center gap-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 text-sm font-medium py-2.5 transition-colors"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuth('oauth_github')}
                      className="flex items-center justify-center gap-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 text-sm font-medium py-2.5 transition-colors"
                    >
                      <GitHubIcon />
                      Continue with GitHub
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-white/[0.08]" />
                    <span className="text-xs text-white/30 uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-white/[0.08]" />
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-medium text-white/50 mb-1.5 block">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 text-sm px-4 py-2.5 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50 mb-1.5 block">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 text-sm px-4 py-2.5 pr-10 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-white text-black text-sm font-semibold py-2.5 hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      Continue
                    </button>
                  </form>

                  {/* Clerk CAPTCHA element (required for custom flow) */}
                  <div id="clerk-captcha" />

                  {/* Footer */}
                  <p className="text-xs text-white/30 text-center mt-5">
                    Already have an account?{' '}
                    <Link
                      href="/sign-in"
                      className="text-white/70 hover:text-white transition-colors font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                </>
              ) : (
                /* ── Verification step ── */
                <>
                  <h2 className="text-xl font-semibold text-white text-center">Verify email</h2>
                  <p className="text-sm text-white/40 text-center mt-1 mb-6">
                    We sent a code to <span className="text-white/60">{email}</span>
                  </p>

                  <form onSubmit={handleVerify} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-medium text-white/50 mb-1.5 block">
                        Verification code
                      </label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        placeholder="123456"
                        autoFocus
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/20 text-sm px-4 py-2.5 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors text-center tracking-[0.3em] text-lg"
                      />
                    </div>

                    {error && (
                      <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-white text-black text-sm font-semibold py-2.5 hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 size={14} className="animate-spin" />}
                      Verify
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingVerification(false);
                      setError('');
                      setCode('');
                    }}
                    className="text-xs text-white/30 hover:text-white/60 text-center mt-4 block w-full transition-colors"
                  >
                    ← Back
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
