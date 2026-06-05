'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';

export default function LegalPage() {
  const [active, setActive] = useState('privacy');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) setActive(hash);
  }, []);

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms of Service' },
    { id: 'dpa', label: 'DPA' },
    { id: 'refund', label: 'Refund Policy' },
  ];

  const s = (text: string) => ({
    h1: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: '2rem',
      fontWeight: '400' as const,
      color: '#f5f5f5',
      marginBottom: '0.5rem',
      marginTop: '2.5rem',
    },
    h2: {
      fontFamily: "'DM Serif Display', serif",
      fontSize: '1.4rem',
      fontWeight: '400' as const,
      color: '#d4d4d4',
      marginBottom: '0.5rem',
      marginTop: '2rem',
    },
    p: {
      fontSize: '15px',
      color: '#737373',
      fontWeight: '300' as const,
      lineHeight: '1.8',
      marginBottom: '1rem',
    },
    li: {
      fontSize: '14px',
      color: '#737373',
      fontWeight: '300' as const,
      lineHeight: '1.8',
      marginBottom: '0.4rem',
    },
  });

  const Privacy = () => (
    <div>
      <p style={{ fontSize: '13px', color: '#525252', marginBottom: '2rem' }}>
        Last updated: March 2026
      </p>

      <h2 style={s('').h1}>Privacy Policy</h2>
      <p style={s('').p}>
        Syntheon AI operates syntheon.ai and our Chrome extension. This policy explains how we
        collect, use, and protect your personal data in accordance with the Digital Personal Data
        Protection Act 2023 (DPDP Act) and the Information Technology Act 2000.
      </p>

      <h2 style={s('').h2}>Data we collect</h2>
      <p style={s('').p}>
        <strong>Account data</strong> — name, email, profile picture collected via Clerk
        authentication.
      </p>
      <p style={s('').p}>
        <strong>Meeting data</strong> — audio processed in real-time and deleted immediately after
        transcription. Transcripts stored encrypted and deleted when you choose.
      </p>
      <p style={s('').p}>
        <strong>Integration data</strong> — GitHub and Linear OAuth tokens stored with AES-256
        encryption. Never stored in plain text.
      </p>
      <p style={s('').p}>
        <strong>Usage data</strong> — features used, meetings processed, code generated. Used for
        billing limits and product improvement.
      </p>

      <h2 style={s('').h2}>Meeting audio and transcripts</h2>
      <p style={s('').p}>
        Audio files are deleted immediately after transcription. We never store raw audio.
        Transcripts are stored only as long as necessary for product functionality and can be
        deleted by you at any time. We do not read your transcripts manually, use them to train AI
        models, or share them with other users.
      </p>

      <h2 style={s('').h2}>Third-party services</h2>
      <p style={s('').p}>
        Skribby (transcription), Groq (AI), Clerk (auth), Supabase (database, Mumbai region), Vercel
        (hosting), Razorpay (payments), GitHub, Linear. All have data processing agreements with us.
      </p>

      <h2 style={s('').h2}>Your rights under DPDP Act 2023</h2>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        {[
          'Access — request your data at privacy@syntheon.ai',
          'Correction — update via Settings',
          'Erasure — delete account and all data via Settings',
          'Withdraw consent — disconnect integrations anytime',
          'Grievance — contact privacy@syntheon.ai, 72hr response',
        ].map((r, i) => (
          <li key={i} style={s('').li}>
            {r}
          </li>
        ))}
      </ul>

      <h2 style={s('').h2}>Contact</h2>
      <p style={s('').p}>
        Data Protection Officer:{' '}
        <a href="mailto:privacy@syntheon.ai" style={{ color: '#525252' }}>
          privacy@syntheon.ai
        </a>
      </p>
    </div>
  );

  const Terms = () => (
    <div>
      <p style={{ fontSize: '13px', color: '#525252', marginBottom: '2rem' }}>
        Last updated: March 2026
      </p>

      <h2 style={s('').h1}>Terms of Service</h2>
      <p style={s('').p}>
        By using Syntheon you agree to these Terms. If you do not agree, do not use the service.
      </p>

      <h2 style={s('').h2}>Eligibility</h2>
      <p style={s('').p}>
        You must be 18 or older and capable of entering a binding legal agreement.
      </p>

      <h2 style={s('').h2}>Subscription and payment</h2>
      <p style={s('').p}>
        Plans are billed monthly in INR via Razorpay. Subscriptions auto-renew. You will be notified
        3 days before renewal. Exceeding usage limits pauses the relevant feature until the next
        billing cycle.
      </p>

      <h2 style={s('').h2}>Acceptable use</h2>
      <p style={s('').p}>
        You may use Syntheon to record and process your own business meetings, generate code for
        legitimate projects, and create tickets in workspaces you own.
      </p>
      <p style={s('').p}>
        You may not record meetings without participant consent, generate malicious code, circumvent
        usage limits, or use the service for any illegal purpose under Indian law.
      </p>

      <h2 style={s('').h2}>Meeting recording consent</h2>
      <p style={s('').p}>
        You are solely responsible for obtaining consent from all meeting participants before using
        the Syntheon bot. Recording laws vary by jurisdiction. By using Syntheon, you represent and
        warrant that you have obtained all necessary consents from meeting participants. Syntheon is
        not liable for your failure to obtain proper consent.
      </p>

      <h2 style={s('').h2}>AI-generated content disclaimer</h2>
      <p style={s('').p}>
        AI-generated code may contain bugs or vulnerabilities. You are solely responsible for
        reviewing all generated code before deploying to production. Syntheon does not guarantee the
        accuracy or fitness of AI-generated content.
      </p>

      <h2 style={s('').h2}>Intellectual property</h2>
      <p style={s('').p}>
        You retain full ownership of your meeting transcripts, spec blocks, and all generated code.
        Syntheon claims no ownership over content you create using the platform.
      </p>

      <h2 style={s('').h2}>Limitation of liability</h2>
      <p style={s('').p}>
        Syntheon's total liability shall not exceed the amount paid in the 3 months preceding the
        claim. We are not liable for indirect, incidental, or consequential damages, or for damages
        arising from AI-generated code you deploy.
      </p>

      <h2 style={s('').h2}>Governing law</h2>
      <p style={s('').p}>
        These Terms are governed by the laws of India. Disputes are subject to the exclusive
        jurisdiction of courts in Bengaluru, Karnataka.
      </p>

      <h2 style={s('').h2}>Contact</h2>
      <p style={s('').p}>
        <a href="mailto:legal@syntheon.ai" style={{ color: '#525252' }}>
          legal@syntheon.ai
        </a>
      </p>
    </div>
  );

  const DPA = () => (
    <div>
      <p style={{ fontSize: '13px', color: '#525252', marginBottom: '2rem' }}>
        Last updated: March 2026
      </p>

      <h2 style={s('').h1}>Data Processing Agreement</h2>
      <p style={s('').p}>
        This DPA governs the processing of personal data by Syntheon AI ("Data Fiduciary") in
        accordance with the Digital Personal Data Protection Act 2023 and applicable Indian law.
      </p>

      <h2 style={s('').h2}>Definitions</h2>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        {[
          'Personal Data — any information relating to an identified or identifiable individual',
          'Data Principal — the individual whose personal data is processed (meeting participants)',
          'Data Fiduciary — Syntheon AI, which determines the purpose and means of processing personal data',
          'Sub-processor — third-party services engaged by Syntheon to process data on its behalf',
        ].map((d, i) => (
          <li key={i} style={s('').li}>
            {d}
          </li>
        ))}
      </ul>

      <h2 style={s('').h2}>Sub-processors</h2>
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
              {['Service', 'Location', 'Purpose'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    color: '#525252',
                    fontWeight: '500',
                    fontSize: '12px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Skribby', 'EU', 'Meeting transcription'],
              ['Groq', 'USA', 'AI processing'],
              ['Supabase', 'India (Mumbai)', 'Data storage'],
              ['Vercel', 'USA', 'Hosting'],
              ['Clerk', 'USA', 'Authentication'],
            ].map(([s, l, p], i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1f1f1f' }}>
                <td
                  style={{
                    padding: '8px 12px',
                    color: '#d4d4d4',
                    fontWeight: '500',
                  }}
                >
                  {s}
                </td>
                <td style={{ padding: '8px 12px', color: '#737373' }}>{l}</td>
                <td style={{ padding: '8px 12px', color: '#737373' }}>{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={s('').h2}>Security measures</h2>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        {[
          'AES-256 encryption for OAuth tokens at rest',
          'TLS 1.3 for all data in transit',
          'Row-level security in Supabase',
          'No plain-text credential storage',
          'Access logs retained for 90 days',
        ].map((m, i) => (
          <li key={i} style={s('').li}>
            {m}
          </li>
        ))}
      </ul>

      <h2 style={s('').h2}>Data breach notification</h2>
      <p style={s('').p}>
        In the event of a personal data breach, Syntheon will notify affected users within 72 hours
        and report to the Data Protection Board of India as required.
      </p>

      <h2 style={s('').h2}>Contact</h2>
      <p style={s('').p}>
        Data Protection Officer:{' '}
        <a href="mailto:privacy@syntheon.ai" style={{ color: '#525252' }}>
          privacy@syntheon.ai
        </a>
      </p>
    </div>
  );

  const Refund = () => (
    <div>
      <p style={{ fontSize: '13px', color: '#525252', marginBottom: '2rem' }}>
        Last updated: March 2026
      </p>

      <h2 style={s('').h1}>Refund Policy</h2>
      <p style={s('').p}>We want you to be completely satisfied with Syntheon.</p>

      <h2 style={s('').h2}>7-day money back guarantee</h2>
      <p style={s('').p}>
        You are eligible for a full refund if you request it within 7 days of your first payment and
        have processed fewer than 2 meetings. No questions asked.
      </p>

      <h2 style={s('').h2}>Service outage refund</h2>
      <p style={s('').p}>
        If Syntheon is unavailable for more than 24 continuous hours due to our infrastructure (not
        third-party services), you are eligible for a pro-rated refund for those days.
      </p>

      <h2 style={s('').h2}>Non-refundable situations</h2>
      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
        {[
          'Dissatisfaction with AI-generated code quality',
          'Third-party service issues (GitHub, Linear, Skribby)',
          'Your GitHub or Linear misconfiguration',
          'Unused meetings in a billing period',
          'Cancellation mid-month',
          'Accounts terminated for Terms violations',
        ].map((r, i) => (
          <li key={i} style={s('').li}>
            {r}
          </li>
        ))}
      </ul>

      <h2 style={s('').h2}>How to request</h2>
      <p style={s('').p}>
        Email{' '}
        <a href="mailto:refunds@syntheon.ai" style={{ color: '#525252' }}>
          refunds@syntheon.ai
        </a>{' '}
        from your registered email with your reason. We respond within 2 business days. Eligible
        refunds are processed within 5-7 business days to your original payment method via Razorpay.
      </p>

      <h2 style={s('').h2}>Cancellation</h2>
      <p style={s('').p}>
        Cancel anytime from Settings → Billing. Access continues until the end of your current
        billing period. No refund for remaining days unless covered above.
      </p>
    </div>
  );

  const content: Record<string, ReactNode> = {
    privacy: <Privacy />,
    terms: <Terms />,
    dpa: <DPA />,
    refund: <Refund />,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#fafafa',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: '1px solid #1f1f1f',
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(12px)',
          padding: '0 2rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
        >
          <img
            src="/logo.png"
            alt="Syntheon"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <span
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '18px',
              color: '#d4d4d4',
            }}
          >
            Syntheon
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            href="/pricing"
            style={{
              fontSize: '14px',
              color: '#a3a3a3',
              textDecoration: 'none',
            }}
          >
            Pricing
          </Link>
          <Link
            href="/dashboard"
            style={{
              background: '#000000',
              color: '#f5f5f5',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            Open App
          </Link>
        </div>
      </nav>

      <div
        style={{
          paddingTop: '80px',
          maxWidth: '860px',
          margin: '0 auto',
          padding: '80px 2rem 100px',
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          gap: '3rem',
          alignItems: 'start',
        }}
      >
        {/* Sidebar */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#525252',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            Legal documents
          </p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActive(tab.id);
                window.history.replaceState(null, '', `#${tab.id}`);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: active === tab.id ? '#1f1f1f' : 'none',
                border: 'none',
                borderLeft: active === tab.id ? '3px solid #525252' : '3px solid transparent',
                padding: '10px 16px',
                fontSize: '14px',
                color: active === tab.id ? '#d4d4d4' : '#737373',
                cursor: 'pointer',
                fontWeight: active === tab.id ? '500' : '300',
                borderRadius: '0 6px 6px 0',
                marginBottom: '4px',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1f1f1f',
            borderRadius: '12px',
            padding: '2.5rem',
          }}
        >
          {content[active]}
        </div>
      </div>

      <footer
        style={{
          borderTop: '1px solid #1f1f1f',
          padding: '2rem',
          textAlign: 'center',
          background: '#000000',
        }}
      >
        <p style={{ fontSize: '12px', color: '#404040' }}>
          2026 Syntheon AI. Bengaluru, Karnataka, India. Governed by Indian law.
        </p>
      </footer>
    </div>
  );
}
