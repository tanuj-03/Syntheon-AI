'use client';

import Link from 'next/link';

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: '999',
      desc: 'Perfect for solo founders and small teams getting started.',
      features: [
        '5 meetings per month',
        '3 code generations per month',
        '1 GitHub repository',
        '1 Linear workspace',
        'GitHub Pages deployment',
        'Spec blocks + MCT',
        'Email support',
      ],
      cta: 'Start free trial',
      popular: false,
    },
    {
      name: 'Growth',
      price: '2,999',
      desc: 'For growing teams shipping features every week.',
      features: [
        '25 meetings per month',
        '15 code generations per month',
        '5 GitHub repositories',
        '3 Linear workspaces',
        'GitHub Pages deployment',
        'Spec blocks + MCT',
        'Priority email support',
        'Usage analytics',
      ],
      cta: 'Start free trial',
      popular: true,
    },
    {
      name: 'Team',
      price: '7,999',
      desc: 'Unlimited everything for serious engineering teams.',
      features: [
        'Unlimited meetings',
        'Unlimited code generations',
        'Unlimited repositories',
        'Unlimited Linear workspaces',
        'GitHub Pages deployment',
        'Spec blocks + MCT',
        'Dedicated support',
        'Usage analytics',
        'Custom bot name',
        'Early access to new features',
      ],
      cta: 'Start free trial',
      popular: false,
    },
  ];

  const faqs = [
    {
      q: 'What counts as a meeting?',
      a: 'A meeting is any call where the Syntheon bot joins and transcribes. Whether it is 5 minutes or 2 hours, it counts as one meeting against your monthly limit.',
    },
    {
      q: 'What is a code generation?',
      a: 'A code generation is one "Approve and Ship" action — where Syntheon generates code, opens a GitHub PR, and creates Linear tickets. Follow-up generations using MCT also count.',
    },
    {
      q: 'Do I need to provide my own GitHub and Linear accounts?',
      a: 'Yes. You connect your own GitHub and Linear accounts via OAuth. Syntheon acts on your behalf — your code goes to your repos, your tickets go to your workspace.',
    },
    {
      q: 'What happens if I exceed my meeting limit?',
      a: 'We will notify you when you reach 80% of your limit. Once exceeded, the bot feature pauses until your next billing cycle. You can upgrade anytime to continue.',
    },
    {
      q: 'Is there a free trial?',
      a: 'Yes. Every plan starts with a 7-day free trial. No credit card required to start. If you are not satisfied within 7 days and have processed fewer than 2 meetings, we offer a full refund.',
    },
    {
      q: 'Can I change plans anytime?',
      a: 'Yes. Upgrades take effect immediately (pro-rated). Downgrades take effect at the next billing cycle.',
    },
    {
      q: 'Do you offer annual pricing?',
      a: 'Annual plans with a 20% discount are coming soon. Contact us at support@syntheon.ai to discuss early access.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay. All prices are in INR inclusive of GST.',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#fafafa',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Nav */}
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
            href="/how-it-works"
            style={{
              fontSize: '14px',
              color: '#a3a3a3',
              textDecoration: 'none',
            }}
          >
            How it works
          </Link>
          <Link
            href="/legal"
            style={{
              fontSize: '14px',
              color: '#a3a3a3',
              textDecoration: 'none',
            }}
          >
            Legal
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

      {/* Hero */}
      <section
        style={{
          paddingTop: '120px',
          paddingBottom: '60px',
          textAlign: 'center',
          padding: '120px 2rem 60px',
        }}
      >
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: '400',
            marginBottom: '1rem',
            color: '#f5f5f5',
          }}
        >
          Simple, honest pricing
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: '#737373',
            fontWeight: '300',
            maxWidth: '500px',
            margin: '0 auto 0.75rem',
          }}
        >
          All prices in INR. GST applicable. 7-day free trial on all plans.
        </p>
        <p style={{ fontSize: '13px', color: '#525252' }}>No credit card required to start.</p>
      </section>

      {/* Plans */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem 80px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {plans.map((plan, i) => (
            <div
              key={i}
              style={{
                background: '#0a0a0a',
                border: plan.popular ? '2px solid #525252' : '1px solid #1f1f1f',
                borderRadius: '16px',
                padding: '2rem',
                position: 'relative',
                transform: plan.popular ? 'translateY(-8px)' : 'none',
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#525252',
                    color: '#f5f5f5',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.05em',
                  }}
                >
                  Most popular
                </div>
              )}

              <p
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#525252',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                {plan.name}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '4px',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontSize: '14px', color: '#737373' }}>₹</span>
                <span
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: '3rem',
                    fontWeight: '400',
                    color: '#f5f5f5',
                    lineHeight: '1',
                  }}
                >
                  {plan.price}
                </span>
                <span style={{ fontSize: '14px', color: '#737373' }}>/month</span>
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: '#737373',
                  fontWeight: '300',
                  marginBottom: '1.5rem',
                  lineHeight: '1.6',
                }}
              >
                {plan.desc}
              </p>

              <Link
                href="/dashboard"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: plan.popular ? '#000000' : 'none',
                  color: plan.popular ? '#f5f5f5' : '#a3a3a3',
                  border: plan.popular ? 'none' : '1.5px solid #333333',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  marginBottom: '1.5rem',
                }}
              >
                {plan.cta}
              </Link>

              <div
                style={{
                  borderTop: '1px solid #1f1f1f',
                  paddingTop: '1.5rem',
                }}
              >
                {plan.features.map((f, j) => (
                  <div
                    key={j}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span style={{ color: '#525252', fontSize: '16px', flexShrink: 0 }}>✓</span>
                    <span
                      style={{
                        fontSize: '14px',
                        color: '#a3a3a3',
                        fontWeight: '300',
                      }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enterprise */}
      <section
        style={{ maxWidth: '700px', margin: '0 auto', padding: '0 2rem 80px', textAlign: 'center' }}
      >
        <div
          style={{
            background: '#0a0a0a',
            border: '1px solid #1f1f1f',
            borderRadius: '16px',
            padding: '2.5rem',
          }}
        >
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '1.8rem',
              fontWeight: '400',
              marginBottom: '0.75rem',
              color: '#f5f5f5',
            }}
          >
            Enterprise
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: '#737373',
              fontWeight: '300',
              marginBottom: '1.5rem',
              lineHeight: '1.7',
            }}
          >
            Custom deployment, SSO, dedicated support, SLA guarantees, and volume pricing for large
            engineering teams.
          </p>
          <a
            href="mailto:sales@syntheon.ai"
            style={{
              display: 'inline-block',
              background: '#000000',
              color: '#f5f5f5',
              padding: '12px 28px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Contact sales
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '0 2rem 100px' }}>
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '2rem',
            fontWeight: '400',
            textAlign: 'center',
            marginBottom: '3rem',
            color: '#f5f5f5',
          }}
        >
          Frequently asked questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: '#0a0a0a',
                border: '1px solid #1f1f1f',
                borderRadius: '10px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#d4d4d4',
                  marginBottom: '0.5rem',
                }}
              >
                {faq.q}
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: '#737373',
                  fontWeight: '300',
                  lineHeight: '1.7',
                }}
              >
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #1f1f1f',
          padding: '2rem',
          textAlign: 'center',
          background: '#000000',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: '14px',
              color: '#525252',
              textDecoration: 'none',
            }}
          >
            Home
          </Link>
          <Link
            href="/how-it-works"
            style={{
              fontSize: '14px',
              color: '#525252',
              textDecoration: 'none',
            }}
          >
            How it works
          </Link>
          <Link
            href="/legal"
            style={{
              fontSize: '14px',
              color: '#525252',
              textDecoration: 'none',
            }}
          >
            Legal
          </Link>
          <Link
            href="/dashboard"
            style={{
              fontSize: '14px',
              color: '#525252',
              textDecoration: 'none',
            }}
          >
            Dashboard
          </Link>
        </div>
        <p style={{ fontSize: '12px', color: '#404040' }}>2026 Syntheon AI. Bengaluru, India.</p>
      </footer>
    </div>
  );
}
