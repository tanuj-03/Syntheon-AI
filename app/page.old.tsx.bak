'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import * as d3 from 'd3';

export default function LandingPage() {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('syntheon-theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('syntheon-theme', next ? 'dark' : 'light');
  }

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 700;
    const height = 320;

    const nodes = [
      { id: 'meeting', label: 'Meeting', x: 60, y: 140, color: '#5c7c5d' },
      { id: 'bot', label: 'Bot joins', x: 190, y: 80, color: '#8aab7e' },
      { id: 'transcript', label: 'Transcript', x: 320, y: 140, color: '#5c7c5d' },
      { id: 'specs', label: 'Spec blocks', x: 450, y: 80, color: '#8aab7e' },
      { id: 'code', label: 'Code gen', x: 580, y: 140, color: '#3d5a3e' },
      { id: 'deploy', label: 'Deployed', x: 650, y: 220, color: '#3d5a3e' },
    ];

    const links = [
      { source: 'meeting', target: 'bot' },
      { source: 'bot', target: 'transcript' },
      { source: 'transcript', target: 'specs' },
      { source: 'specs', target: 'code' },
      { source: 'code', target: 'deploy' },
    ];

    const nodeMap: Record<string, (typeof nodes)[0]> = {};
    nodes.forEach((n) => (nodeMap[n.id] = n));

    // Draw links
    links.forEach((l) => {
      const s = nodeMap[l.source];
      const t = nodeMap[l.target];
      svg
        .append('line')
        .attr('x1', s.x)
        .attr('y1', s.y)
        .attr('x2', t.x)
        .attr('y2', t.y)
        .attr('stroke', dark ? '#4a6b4b' : '#c8dbc4')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0)
        .transition()
        .duration(600)
        .delay((_d, i) => i * 200)
        .attr('opacity', 1);
    });

    // Animated particles along links
    links.forEach((l, i) => {
      const s = nodeMap[l.source];
      const t = nodeMap[l.target];

      const particle = svg
        .append('circle')
        .attr('r', 4)
        .attr('fill', '#8aab7e')
        .attr('cx', s.x)
        .attr('cy', s.y)
        .attr('opacity', 0);

      function animate() {
        particle
          .attr('cx', s.x)
          .attr('cy', s.y)
          .attr('opacity', 1)
          .transition()
          .duration(1200)
          .delay(i * 300)
          .attr('cx', t.x)
          .attr('cy', t.y)
          .transition()
          .duration(0)
          .attr('opacity', 0)
          .on('end', animate);
      }
      setTimeout(animate, i * 400);
    });

    // Draw nodes
    nodes.forEach((n, i) => {
      const g = svg.append('g').attr('transform', `translate(${n.x}, ${n.y})`).attr('opacity', 0);

      g.transition()
        .duration(500)
        .delay(i * 150)
        .attr('opacity', 1);

      g.append('circle')
        .attr('r', 36)
        .attr('fill', dark ? '#1e2a1f' : '#eaf2e8')
        .attr('stroke', n.color)
        .attr('stroke-width', 2);

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '11px')
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-weight', '500')
        .attr('fill', dark ? '#c8dbc4' : '#3d5a3e')
        .text(n.label);

      // Pulse ring
      g.append('circle')
        .attr('r', 36)
        .attr('fill', 'none')
        .attr('stroke', n.color)
        .attr('stroke-width', 1)
        .attr('opacity', 0.5)
        .transition()
        .duration(1500)
        .delay(i * 200)
        .ease(d3.easeSinInOut)
        .attr('r', 50)
        .attr('opacity', 0)
        .on('end', function () {
          d3.select(this).attr('r', 36).attr('opacity', 0.5);
        });
    });
  }, [dark]);

  const features = [
    {
      icon: '◎',
      title: 'Bot joins your meeting',
      desc: 'One click sends an AI bot to any Google Meet, Zoom, or Teams call. It listens, transcribes, and understands everything discussed.',
    },
    {
      icon: '◈',
      title: 'Specs extracted automatically',
      desc: 'Every feature, idea, and constraint discussed is captured as a structured spec block. Nothing gets lost between the meeting and the backlog.',
    },
    {
      icon: '◉',
      title: 'Code generated and shipped',
      desc: 'Approve the specs you want built. Syntheon generates the code, opens a GitHub PR, creates Linear tickets, and deploys a live preview.',
    },
    {
      icon: '⬡',
      title: 'Meeting Context Transfer',
      desc: 'Follow-up meetings build on existing code. Syntheon remembers the full project history and generates only the precise changes needed.',
    },
  ];

  return (
    <div
      className={dark ? 'dark' : ''}
      style={{
        minHeight: '100vh',
        background: dark ? '#0f1410' : '#faf8f4',
        color: dark ? '#e8ede6' : '#2c2c28',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 0.3s, color 0.3s',
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
          borderBottom: `1px solid ${dark ? '#1e2a1f' : '#e8dfd0'}`,
          background: dark ? 'rgba(15,20,16,0.95)' : 'rgba(250,248,244,0.95)',
          backdropFilter: 'blur(12px)',
          padding: '0 2rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo.png"
            alt="Syntheon"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <span
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '18px',
              fontWeight: '400',
              color: dark ? '#c8dbc4' : '#3d5a3e',
            }}
          >
            Syntheon
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            href="/how-it-works"
            style={{
              fontSize: '14px',
              color: dark ? '#8aab7e' : '#5c7c5d',
              textDecoration: 'none',
            }}
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            style={{
              fontSize: '14px',
              color: dark ? '#8aab7e' : '#5c7c5d',
              textDecoration: 'none',
            }}
          >
            Pricing
          </Link>
          <Link
            href="/legal"
            style={{
              fontSize: '14px',
              color: dark ? '#8aab7e' : '#5c7c5d',
              textDecoration: 'none',
            }}
          >
            Legal
          </Link>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: `1px solid ${dark ? '#3d5a3e' : '#c8dbc4'}`,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              color: dark ? '#8aab7e' : '#5c7c5d',
            }}
          >
            {dark ? '☀ Light' : '☽ Dark'}
          </button>
          <Link
            href="/dashboard"
            style={{
              background: '#3d5a3e',
              color: '#eaf2e8',
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
          paddingTop: '140px',
          paddingBottom: '80px',
          textAlign: 'center',
          maxWidth: '860px',
          margin: '0 auto',
          padding: '140px 2rem 80px',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: dark ? '#1e2a1f' : '#eaf2e8',
            border: `1px solid ${dark ? '#3d5a3e' : '#c8dbc4'}`,
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '13px',
            color: dark ? '#8aab7e' : '#5c7c5d',
            marginBottom: '2rem',
            fontWeight: '500',
          }}
        >
          Meeting Context Transfer — now available
        </div>

        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: '400',
            lineHeight: '1.1',
            marginBottom: '1.5rem',
            color: dark ? '#eaf2e8' : '#2c2c28',
          }}
        >
          Your meetings deserve
          <br />
          <span style={{ color: '#5c7c5d', fontStyle: 'italic' }}>better than Jira.</span>
        </h1>

        <p
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.7',
            color: dark ? '#8aab7e' : '#5a5a52',
            maxWidth: '600px',
            margin: '0 auto 2.5rem',
            fontWeight: '300',
          }}
        >
          Syntheon joins your meetings, extracts every idea discussed, generates the code, opens the
          PR, creates the tickets, and deploys a live preview — automatically.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard"
            style={{
              background: '#3d5a3e',
              color: '#eaf2e8',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Start free
          </Link>
          <Link
            href="/how-it-works"
            style={{
              background: 'none',
              border: `2px solid ${dark ? '#3d5a3e' : '#c8dbc4'}`,
              color: dark ? '#8aab7e' : '#5c7c5d',
              padding: '14px 32px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* D3 Pipeline */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 80px' }}>
        <div
          style={{
            background: dark ? '#111a12' : '#f5f0e8',
            border: `1px solid ${dark ? '#1e2a1f' : '#e8dfd0'}`,
            borderRadius: '16px',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <p
            style={{
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '500',
              color: dark ? '#5c7c5d' : '#8aab7e',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            The Syntheon pipeline
          </p>
          <svg ref={svgRef} style={{ width: '100%', height: '320px', display: 'block' }} />
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem 100px' }}>
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '2.5rem',
            fontWeight: '400',
            textAlign: 'center',
            marginBottom: '3rem',
            color: dark ? '#eaf2e8' : '#2c2c28',
          }}
        >
          Everything in one pipeline
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: dark ? '#111a12' : '#ffffff',
                border: `1px solid ${dark ? '#1e2a1f' : '#e8dfd0'}`,
                borderRadius: '12px',
                padding: '1.75rem',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  `0 12px 40px ${dark ? 'rgba(0,0,0,0.4)' : 'rgba(61,90,62,0.12)'}`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '1rem', color: '#5c7c5d' }}>
                {f.icon}
              </div>
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: '1.2rem',
                  fontWeight: '400',
                  marginBottom: '0.75rem',
                  color: dark ? '#eaf2e8' : '#2c2c28',
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: dark ? '#6a7a68' : '#5a5a52',
                  fontWeight: '300',
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* MCT Section */}
      <section style={{ background: dark ? '#111a12' : '#eaf2e8', padding: '80px 2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              background: dark ? '#1e2a1f' : '#ffffff',
              border: `1px solid ${dark ? '#3d5a3e' : '#c8dbc4'}`,
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '13px',
              color: dark ? '#8aab7e' : '#5c7c5d',
              marginBottom: '1.5rem',
              fontWeight: '500',
            }}
          >
            MCT — Meeting Context Transfer
          </div>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '2.5rem',
              fontWeight: '400',
              marginBottom: '1.5rem',
              color: dark ? '#eaf2e8' : '#2c2c28',
            }}
          >
            Big projects span
            <br />
            multiple meetings.
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              lineHeight: '1.8',
              color: dark ? '#8aab7e' : '#5a5a52',
              fontWeight: '300',
              marginBottom: '2rem',
            }}
          >
            Syntheon remembers everything. When you have a follow-up meeting, the bot joins with the
            full context of your project — every spec discussed, every file built. It generates only
            the precise changes needed, not a full rewrite.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Meeting 1', desc: 'Basic calculator built' },
              { label: 'Meeting 2', desc: 'Scientific mode added' },
              { label: 'Meeting 3', desc: 'Dark mode + history' },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  background: dark ? '#0f1410' : '#ffffff',
                  border: `1px solid ${dark ? '#1e2a1f' : '#c8dbc4'}`,
                  borderRadius: '10px',
                  padding: '1.25rem',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: dark ? '#5c7c5d' : '#8aab7e',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  {step.label}
                </p>
                <p
                  style={{
                    fontSize: '14px',
                    color: dark ? '#c8dbc4' : '#3d5a3e',
                    fontWeight: '500',
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 2rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '2rem',
            textAlign: 'center',
          }}
        >
          {[
            { value: '< 2min', label: 'From meeting end to specs' },
            { value: '0', label: 'Manual tickets written' },
            { value: '100%', label: 'Ideas captured, nothing lost' },
            { value: '1 click', label: 'From spec to deployed code' },
          ].map((stat, i) => (
            <div key={i}>
              <p
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: '2.5rem',
                  fontWeight: '400',
                  color: '#5c7c5d',
                  marginBottom: '0.5rem',
                }}
              >
                {stat.value}
              </p>
              <p
                style={{ fontSize: '14px', color: dark ? '#6a7a68' : '#8a8a80', fontWeight: '300' }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#3d5a3e', padding: '80px 2rem', textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '2.5rem',
            fontWeight: '400',
            color: '#eaf2e8',
            marginBottom: '1rem',
          }}
        >
          Ready to stop writing tickets?
        </h2>
        <p
          style={{ fontSize: '1.1rem', color: '#8aab7e', marginBottom: '2rem', fontWeight: '300' }}
        >
          Start free. No credit card required.
        </p>
        <Link
          href="/dashboard"
          style={{
            background: '#eaf2e8',
            color: '#3d5a3e',
            padding: '16px 40px',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Get started free
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: `1px solid ${dark ? '#1e2a1f' : '#e8dfd0'}`,
          padding: '3rem 2rem',
          background: dark ? '#0f1410' : '#faf8f4',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}
            >
              <img
                src="/logo.png"
                alt="Syntheon"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
              <span
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: '16px',
                  color: dark ? '#c8dbc4' : '#3d5a3e',
                }}
              >
                Syntheon
              </span>
            </div>
            <p style={{ fontSize: '13px', color: dark ? '#5c7c5d' : '#8a8a80', fontWeight: '300' }}>
              Turns conversations into software.
            </p>
            <p
              style={{ fontSize: '12px', color: dark ? '#404840' : '#c9bfaf', marginTop: '0.5rem' }}
            >
              Bengaluru, India
            </p>
          </div>

          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: dark ? '#5c7c5d' : '#8aab7e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Product
              </p>
              {[
                { label: 'How it works', href: '/how-it-works' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Dashboard', href: '/dashboard' },
              ].map((l) => (
                <div key={l.label} style={{ marginBottom: '0.5rem' }}>
                  <Link
                    href={l.href}
                    style={{
                      fontSize: '14px',
                      color: dark ? '#6a7a68' : '#5a5a52',
                      textDecoration: 'none',
                    }}
                  >
                    {l.label}
                  </Link>
                </div>
              ))}
            </div>

            <div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: dark ? '#5c7c5d' : '#8aab7e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Legal
              </p>
              {[
                { label: 'Privacy Policy', href: '/legal#privacy' },
                { label: 'Terms of Service', href: '/legal#terms' },
                { label: 'Refund Policy', href: '/legal#refund' },
                { label: 'DPA', href: '/legal#dpa' },
              ].map((l) => (
                <div key={l.label} style={{ marginBottom: '0.5rem' }}>
                  <Link
                    href={l.href}
                    style={{
                      fontSize: '14px',
                      color: dark ? '#6a7a68' : '#5a5a52',
                      textDecoration: 'none',
                    }}
                  >
                    {l.label}
                  </Link>
                </div>
              ))}
            </div>

            <div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: dark ? '#5c7c5d' : '#8aab7e',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                Contact
              </p>
              {[
                { label: 'support@syntheon.ai', href: 'mailto:support@syntheon.ai' },
                { label: 'privacy@syntheon.ai', href: 'mailto:privacy@syntheon.ai' },
              ].map((l) => (
                <div key={l.label} style={{ marginBottom: '0.5rem' }}>
                  <a
                    href={l.href}
                    style={{
                      fontSize: '14px',
                      color: dark ? '#6a7a68' : '#5a5a52',
                      textDecoration: 'none',
                    }}
                  >
                    {l.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1000px',
            margin: '2rem auto 0',
            paddingTop: '2rem',
            borderTop: `1px solid ${dark ? '#1e2a1f' : '#e8dfd0'}`,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <p style={{ fontSize: '12px', color: dark ? '#404840' : '#c9bfaf' }}>
            2026 Syntheon AI. All rights reserved.
          </p>
          <p style={{ fontSize: '12px', color: dark ? '#404840' : '#c9bfaf' }}>
            Governed by Indian law. Courts of Bengaluru, Karnataka.
          </p>
        </div>
      </footer>
    </div>
  );
}
