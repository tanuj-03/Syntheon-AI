'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Sparkles,
  GitBranch,
  Layers,
  Zap,
  BookOpen,
  CreditCard,
  Scale,
  ArrowUpRight,
} from 'lucide-react';

// React Bits components (JS — inferred prop types are loose, cast to any)
import OrbRaw from '@/components/Orb';
import MagicRingsRaw from '@/components/MagicRings';
import AntigravityRaw from '@/components/Antigravity';
import LogoLoopRaw from '@/components/LogoLoop';
import GlassIconsRaw from '@/components/GlassIcons';
import VerticalDockRaw from '@/components/VerticalDock';
import DecryptedTextRaw from '@/components/DecryptedText';

const Orb = OrbRaw as any;
const MagicRings = MagicRingsRaw as any;
const Antigravity = AntigravityRaw as any;
const LogoLoop = LogoLoopRaw as any;
const GlassIcons = GlassIconsRaw as any;
const VerticalDock = VerticalDockRaw as any;
const DecryptedText = DecryptedTextRaw as any;

// ─── Theme tokens (monochrome — black & white only) ──────────────
const C = {
  ink: '#000000', // pure black
  inkSoft: '#0d0d0d',
  cream: '#ffffff',
  creamWarm: '#fafafa',
  matcha: '#000000', // primary == black
  matchaMid: '#525252',
  matchaLight: '#a3a3a3',
  mint: '#e5e5e5',
  beige: '#e5e5e5',
  text: '#0a0a0a',
  muted: '#737373',
};

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Tech stack for LogoLoop (SVG logos + label)
  const techLogos = [
    {
      node: (
        <TechLogo
          label="Next.js"
          svg={
            <svg viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <mask
                id="a"
                style={{ maskType: 'alpha' }}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="180"
                height="180"
              >
                <circle cx="90" cy="90" r="90" fill="#000" />
              </mask>
              <g mask="url(#a)">
                <circle cx="90" cy="90" r="90" fill="#000" />
                <path
                  d="M149.508 157.52L69.142 54H54v71.97h12.114V69.384l73.885 95.461A90.09 90.09 0 0 0 149.508 157.52Z"
                  fill="url(#b)"
                />
                <rect x="115" y="54" width="12" height="72" fill="url(#c)" />
              </g>
              <defs>
                <linearGradient
                  id="b"
                  x1="109"
                  y1="116.5"
                  x2="144.5"
                  y2="160.5"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#fff" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="c"
                  x1="121"
                  y1="54"
                  x2="120.799"
                  y2="106.875"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#fff" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="Supabase"
          svg={
            <svg viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284Z"
                fill="url(#sb-a)"
              />
              <path
                d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284Z"
                fill="url(#sb-b)"
                fillOpacity=".2"
              />
              <path
                d="M45.317 2.071c2.86-3.601 8.657-1.628 8.726 2.97l.442 67.251H9.83c-8.19 0-12.759-9.46-7.665-15.875L45.317 2.072Z"
                fill="#3ECF8E"
              />
              <defs>
                <linearGradient
                  id="sb-a"
                  x1="53.974"
                  y1="54.974"
                  x2="94.163"
                  y2="71.829"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#249361" />
                  <stop offset="1" stopColor="#3ECF8E" />
                </linearGradient>
                <linearGradient
                  id="sb-b"
                  x1="36.156"
                  y1="30.578"
                  x2="54.484"
                  y2="65.081"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop />
                  <stop offset="1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="Clerk"
          svg={
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M42.685 53.556a21.333 21.333 0 0 1-21.37 0l5.333-9.238a10.667 10.667 0 0 0 10.704 0l5.333 9.238Z"
                fill="#1F0256"
              />
              <path
                d="M53.548 42.694l-9.237-5.334a10.667 10.667 0 0 0-5.352-9.26l5.334-9.238a21.333 21.333 0 0 1 9.255 23.832Z"
                fill="#1F0256"
                opacity=".5"
              />
              <path
                d="M44.31 37.36a10.667 10.667 0 0 1-10.703 0 10.667 10.667 0 0 1-5.353-9.26H17.588a21.333 21.333 0 0 0 32.056 18.498l-5.334-9.238Z"
                fill="#1F0256"
                opacity=".3"
              />
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="OpenAI"
          svg={
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 10.68.287a6.048 6.048 0 0 0-5.77 4.166 6.004 6.004 0 0 0-4.027 2.91 6.04 6.04 0 0 0 .749 7.116 5.98 5.98 0 0 0 .516 4.911 6.05 6.05 0 0 0 6.51 2.9A6.07 6.07 0 0 0 13.32 23.714a6.05 6.05 0 0 0 5.772-4.206 5.98 5.98 0 0 0 4.023-2.867 6.04 6.04 0 0 0-.832-7.12ZM13.32 22.178a4.53 4.53 0 0 1-2.914-1.06c.037-.02.1-.056.142-.081l4.834-2.791a.786.786 0 0 0 .395-.683v-6.813l2.043 1.18a.072.072 0 0 1 .04.056v5.643a4.548 4.548 0 0 1-4.54 4.55ZM3.516 18.078a4.53 4.53 0 0 1-.543-3.046c.036.021.098.06.142.085l4.834 2.79a.782.782 0 0 0 .787 0l5.903-3.409v2.36a.074.074 0 0 1-.028.062l-4.888 2.823a4.55 4.55 0 0 1-6.207-1.665ZM2.203 7.935a4.524 4.524 0 0 1 2.368-1.99v5.75a.78.78 0 0 0 .394.681l5.903 3.408-2.042 1.18a.072.072 0 0 1-.068.005L3.87 14.147A4.55 4.55 0 0 1 2.203 7.934Zm17.093 3.976-5.904-3.409 2.043-1.18a.072.072 0 0 1 .068-.005l4.889 2.822a4.546 4.546 0 0 1-.704 8.197v-5.744a.782.782 0 0 0-.392-.681Zm2.032-3.065a6.7 6.7 0 0 0-.142-.085L16.35 6.07a.783.783 0 0 0-.788 0l-5.903 3.408V7.12a.074.074 0 0 1 .028-.062l4.889-2.82a4.545 4.545 0 0 1 6.752 4.608Zm-12.79 4.206-2.043-1.18a.074.074 0 0 1-.04-.057V6.171a4.546 4.546 0 0 1 7.453-3.49c-.037.02-.1.055-.142.081L8.932 5.553a.786.786 0 0 0-.395.683l-.001 6.816Zm1.11-2.392 2.63-1.52 2.63 1.52v3.039l-2.63 1.519-2.63-1.52V10.66Z"
                fill="currentColor"
              />
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="GitHub"
          svg={
            <svg viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.06 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6C29.304 70.3 17.9 66.062 17.9 47.044c0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.57 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 19.018-11.497 23.175-22.428 24.396 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0Z"
                fill="currentColor"
              />
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="Vercel"
          svg={
            <svg viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M37.532 0L75.065 64.974H0L37.532 0Z" fill="currentColor" />
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="Three.js"
          svg={
            <svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M64 576h512L320 64 64 576Zm107.8-32L320 125l148.2 419H171.8Z"
                fill="currentColor"
              />
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="Tiptap"
          svg={
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5v3h5.5v12h3V8H19V5H5Z" fill="currentColor" />
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="shadcn/ui"
          svg={
            <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 5 229 L 128 27"
                stroke="currentColor"
                strokeWidth="26"
                strokeLinecap="round"
              />
              <path
                d="M 128 229 L 251 27"
                stroke="currentColor"
                strokeWidth="26"
                strokeLinecap="round"
                opacity="0.4"
              />
            </svg>
          }
        />
      ),
    },
    {
      node: (
        <TechLogo
          label="TailwindCSS"
          svg={
            <svg viewBox="0 0 54 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.514-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0ZM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.514-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2Z"
                fill="#06B6D4"
              />
            </svg>
          }
        />
      ),
    },
  ];

  // GlassIcons feature row
  const glassItems = [
    { icon: <Bot size={22} />, color: 'green', label: 'Bot joins call' },
    { icon: <Sparkles size={22} />, color: 'green', label: 'AI extracts tickets' },
    { icon: <GitBranch size={22} />, color: 'green', label: 'Kanban board' },
    { icon: <Layers size={22} />, color: 'green', label: 'Gantt timeline' },
    { icon: <Zap size={22} />, color: 'green', label: 'Ship to GitHub' },
  ];

  // Side Dock — vertical
  const dockItems = [
    {
      icon: <BookOpen size={20} color={C.cream} />,
      label: 'How it works',
      onClick: () => (window.location.href = '/how-it-works'),
    },
    {
      icon: <CreditCard size={20} color={C.cream} />,
      label: 'Pricing',
      onClick: () => (window.location.href = '/pricing'),
    },
    {
      icon: <Scale size={20} color={C.cream} />,
      label: 'Legal',
      onClick: () => (window.location.href = '/legal'),
    },
    {
      icon: <ArrowUpRight size={20} color={C.cream} />,
      label: 'Open App',
      onClick: () => (window.location.href = '/dashboard'),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.cream,
        color: C.text,
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
        overflowX: 'hidden',
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        html {
          scroll-behavior: smooth;
        }

        /* Fix GlassIcons for monochrome theme — horizontal row, always-visible labels, glass look */
        .syntheon-glass .icon-btns {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2.5rem;
          grid-gap: 0;
          padding: 1rem 0 3rem;
          grid-template-columns: none;
        }
        .syntheon-glass .icon-btn {
          width: 5.5em;
          height: 5.5em;
        }
        .syntheon-glass .icon-btn__back {
          background: linear-gradient(135deg, #2a2a2a, #000000) !important;
          box-shadow: 0.4em -0.4em 1em rgba(0, 0, 0, 0.22);
        }
        .syntheon-glass .icon-btn__front {
          background: rgba(255, 255, 255, 0.4) !important;
          box-shadow:
            0 0 0 0.08em rgba(255, 255, 255, 0.6) inset,
            0 8px 24px rgba(0, 0, 0, 0.12);
          color: #ffffff;
        }
        .syntheon-glass .icon-btn__icon {
          color: #ffffff;
          width: 1.75em;
          height: 1.75em;
        }
        .syntheon-glass .icon-btn__label {
          font-family: 'Inter', sans-serif;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: #5a5a52;
          opacity: 1 !important;
          transform: translateY(30%) !important;
          top: 100%;
        }
        .syntheon-glass .icon-btn:hover .icon-btn__label {
          color: #000000;
        }

        /* Smooth section reveal */
        .reveal-section {
          opacity: 0;
          transform: translateY(30px);
          transition:
            opacity 0.8s ease-out,
            transform 0.8s ease-out;
        }
        .reveal-section.in-view {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes recPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>

      {/* ─── HERO with Orb background + "Syntheon" centered ───────── */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          background: C.ink,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Orb — oversized to fill & extend past hero */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(115vmin, 1200px)',
            height: 'min(115vmin, 1200px)',
            opacity: 0.9,
          }}
        >
          {mounted && (
            <Orb hue={0} hoverIntensity={0.25} rotateOnHover={true} forceHoverState={false} />
          )}
        </div>

        {/* Subtle vignette overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 35%, rgba(15,20,16,0.6) 95%)',
            pointerEvents: 'none',
          }}
        />

        {/* Hero content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            maxWidth: '900px',
            padding: '0 2rem',
            pointerEvents: 'none',
          }}
        >
          <h1
            style={{
              fontFamily: "'Fraunces', 'DM Serif Display', serif",
              fontSize: 'clamp(4rem, 14vw, 11rem)',
              fontWeight: 300,
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
              color: C.cream,
              margin: 0,
              textShadow: '0 8px 60px rgba(255,255,255,0.18)',
            }}
          >
            Syntheon
          </h1>

          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
              fontStyle: 'italic',
              fontWeight: 300,
              color: C.matchaLight,
              marginTop: '1.5rem',
              marginBottom: '2.5rem',
              letterSpacing: '0.01em',
            }}
          >
            Meetings to tickets, automatically.
          </p>

          <Link
            href="/dashboard"
            style={{
              pointerEvents: 'auto',
              display: 'inline-block',
              background: C.cream,
              color: C.matcha,
              padding: '14px 40px',
              borderRadius: '999px',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '0.01em',
              textDecoration: 'none',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 32px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'none';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)';
            }}
          >
            Start free
          </Link>
        </div>

        {/* scroll indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            color: C.matchaLight,
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          ↓ scroll
        </div>
      </section>

      {/* ─── Smooth transition from ink → cream ───────────────────── */}
      <div
        aria-hidden
        style={{
          height: '200px',
          background: `linear-gradient(180deg, ${C.ink} 0%, ${C.cream} 100%)`,
        }}
      />

      {/* ─── GlassIcons feature row ───────────────────────────────── */}
      <section
        className="syntheon-glass"
        style={{
          background: C.cream,
          padding: '2rem 2rem 7rem',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <SectionLabel>How it works</SectionLabel>
          <h2 style={sectionH2}>Five steps. Zero tickets written by hand.</h2>
          <p
            style={{
              fontSize: '1rem',
              color: C.muted,
              maxWidth: '560px',
              margin: '1.25rem auto 0',
              lineHeight: 1.7,
              fontWeight: 300,
              textAlign: 'center',
            }}
          >
            Record a meeting. Get a Kanban board full of tickets. Track it all on a Gantt timeline.
          </p>
          <div
            style={{
              marginTop: '3rem',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <GlassIcons items={glassItems} />
          </div>
        </div>
      </section>

      {/* ─── Antigravity showcase ─────────────────────────────────── */}
      <section
        style={{
          background: C.inkSoft,
          color: C.cream,
          padding: '8rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: C.matchaLight,
                marginBottom: '1.5rem',
                fontWeight: 500,
              }}
            >
              Cross-meeting context
            </div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                marginBottom: '1.5rem',
              }}
            >
              Every meeting, <em style={{ color: C.matchaLight }}>connected.</em>
            </h2>
            <p
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.8,
                color: 'rgba(250,248,244,0.7)',
                fontWeight: 300,
                marginBottom: '2rem',
              }}
            >
              Projects span multiple meetings. Syntheon remembers every decision and ticket across
              sessions. Follow-up meetings only create the new tickets needed — no duplicates, no
              lost context.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                'Meeting 1 · 8 tickets created',
                'Meeting 2 · 3 new, 2 updated',
                'Meeting 3 · 5 resolved',
              ].map((s) => (
                <span
                  key={s}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid rgba(255,255,255,0.18)`,
                    borderRadius: '999px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    color: C.matchaLight,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div style={{ height: '460px', position: 'relative' }}>
            {mounted && (
              <Antigravity
                count={280}
                magnetRadius={6}
                ringRadius={6}
                waveSpeed={0.4}
                waveAmplitude={1}
                particleSize={1.4}
                lerpSpeed={0.05}
                color={C.matchaLight}
                autoAnimate={true}
                particleVariance={1}
              />
            )}
          </div>
        </div>
      </section>

      {/* ─── MagicRings — recording animation showcase ────────────── */}
      <section
        style={{
          background: C.cream,
          padding: '8rem 2rem',
          textAlign: 'center',
        }}
      >
        <SectionLabel>Live capture</SectionLabel>
        <h2 style={sectionH2}>Record. Transcribe. Extract tickets.</h2>
        <p
          style={{
            fontSize: '1.05rem',
            color: C.muted,
            maxWidth: '560px',
            margin: '1.25rem auto 3rem',
            lineHeight: 1.7,
            fontWeight: 300,
          }}
        >
          One click sends Syntheon into any Google Meet, Zoom, or Teams call. It transcribes in
          real-time and turns the conversation into actionable Jira-style tickets.
        </p>
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1200px',
            height: 'min(780px, 80vh)',
            margin: '0 auto',
            borderRadius: '32px',
            overflow: 'hidden',
            background: C.ink,
            border: `1px solid ${C.beige}`,
            boxShadow: '0 40px 120px rgba(0,0,0,0.35)',
          }}
        >
          {mounted && (
            <MagicRings
              color={C.matchaLight}
              colorTwo={C.mint}
              ringCount={8}
              speed={0.85}
              baseRadius={0.42}
              radiusStep={0.11}
              ringGap={1.4}
              opacity={1}
              noiseAmount={0.07}
              lineThickness={2.2}
              attenuation={9}
            />
          )}
          {/* Center text — DecryptedText */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '0 2rem',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', 'Fraunces', serif",
                fontSize: 'clamp(1.2rem, 3.2vw, 2.4rem)',
                color: C.cream,
                fontWeight: 400,
                letterSpacing: '0.01em',
                textAlign: 'center',
                maxWidth: '900px',
                lineHeight: 1.3,
                textShadow: '0 6px 40px rgba(0,0,0,0.6)',
                pointerEvents: 'auto',
              }}
            >
              {mounted && <LoopingDecrypt />}
            </div>
          </div>
          {/* REC indicator badge */}
          <div
            style={{
              position: 'absolute',
              top: '1.5rem',
              left: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(15,20,16,0.6)',
              border: '1px solid rgba(220,38,38,0.4)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.18em',
              color: '#f5a5a5',
              textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#dc2626',
                boxShadow: '0 0 8px #dc2626',
                animation: 'recPulse 1.4s infinite',
              }}
            />
            REC
          </div>
        </div>
      </section>

      {/* ─── LogoLoop tech stack ──────────────────────────────────── */}
      <section
        style={{
          background: C.creamWarm,
          padding: '5rem 0',
          borderTop: `1px solid ${C.beige}`,
          borderBottom: `1px solid ${C.beige}`,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem', padding: '0 2rem' }}>
          <SectionLabel>Built on</SectionLabel>
        </div>
        <div style={{ height: '60px' }}>
          <LogoLoop
            logos={techLogos}
            speed={50}
            direction="left"
            logoHeight={32}
            gap={56}
            pauseOnHover={true}
            fadeOut={true}
            fadeOutColor={C.creamWarm}
            ariaLabel="Built with"
          />
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────────── */}
      <section
        style={{
          background: C.cream,
          padding: '6rem 2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '2.5rem',
            textAlign: 'center',
          }}
        >
          {[
            { v: '< 2 min', l: 'meeting → tickets' },
            { v: '0', l: 'tickets written by hand' },
            { v: '100%', l: 'action items captured' },
            { v: '1 click', l: 'record → kanban' },
          ].map((s) => (
            <div key={s.l}>
              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: '3rem',
                  fontWeight: 300,
                  color: C.matcha,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {s.v}
              </div>
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '13px',
                  color: C.muted,
                  letterSpacing: '0.02em',
                  fontWeight: 400,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section
        style={{
          background: C.matcha,
          padding: '6rem 2rem',
          textAlign: 'center',
          color: C.cream,
        }}
      >
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            marginBottom: '1rem',
          }}
        >
          Ready to automate your ticket workflow?
        </h2>
        <p style={{ color: C.matchaLight, marginBottom: '2rem', fontWeight: 300 }}>
          Record a meeting, get a full board of tickets. Start free.
        </p>
        <Link
          href="/dashboard"
          style={{
            background: C.cream,
            color: C.matcha,
            padding: '16px 40px',
            borderRadius: '999px',
            fontSize: '15px',
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Get started free →
        </Link>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          background: C.ink,
          color: 'rgba(250,248,244,0.6)',
          padding: '4rem 2rem 8rem',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2.5rem',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '1.25rem',
                color: C.cream,
                marginBottom: '0.5rem',
                fontWeight: 400,
              }}
            >
              Syntheon
            </div>
            <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
              Turns meetings into tickets, timelines, and tracked work. Bengaluru, India.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { label: 'How it works', href: '/how-it-works' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Dashboard', href: '/dashboard' },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: 'Privacy', href: '/legal#privacy' },
              { label: 'Terms', href: '/legal#terms' },
              { label: 'Refund', href: '/legal#refund' },
              { label: 'DPA', href: '/legal#dpa' },
            ]}
          />
          <FooterCol
            title="Contact"
            links={[
              { label: 'support@syntheon.ai', href: 'mailto:support@syntheon.ai' },
              { label: 'privacy@syntheon.ai', href: 'mailto:privacy@syntheon.ai' },
            ]}
          />
        </div>
        <div
          style={{
            maxWidth: '1100px',
            margin: '3rem auto 0',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(250,248,244,0.08)',
            fontSize: '12px',
            color: 'rgba(250,248,244,0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <span>© 2026 Syntheon AI</span>
          <span>Governed by Indian law · Courts of Bengaluru</span>
        </div>
      </footer>

      {/* ─── Floating Vertical Dock (right side) ─────────────────── */}
      <div
        style={{
          position: 'fixed',
          right: '1.25rem',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          pointerEvents: 'auto',
          height: 'auto',
        }}
      >
        <VerticalDock
          items={dockItems}
          panelWidth={60}
          baseItemSize={44}
          magnification={60}
          distance={160}
        />
      </div>
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────

// Looping decrypt: uses animateOn="click" + clickMode="toggle" and fires
// programmatic clicks on a timer. Toggle alternates forward (decrypt) and
// reverse (encrypt) animations — so it's truly bidirectional.
function LoopingDecrypt() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Sequence: scrambled → click (forward decrypt ~2.1s) → dwell ~1.5s →
    // click (reverse encrypt ~2.1s) → dwell ~1.5s → repeat.
    const tick = () => {
      const target = wrapperRef.current?.querySelector(
        '[data-decrypt-target]'
      ) as HTMLElement | null;
      target?.click();
    };
    // First click after a short delay so initial scrambled state is visible.
    const first = setTimeout(tick, 800);
    const id = setInterval(tick, 3600);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return (
    <div ref={wrapperRef} style={{ display: 'inline-block' }}>
      <DecryptedText
        text="Every meeting becomes a board of tickets"
        animateOn="click"
        clickMode="toggle"
        sequential={true}
        revealDirection="start"
        speed={55}
        characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+"
        parentClassName="inline-block"
        encryptedClassName="opacity-70"
        data-decrypt-target=""
      />
    </div>
  );
}

function TechLogo({ label, svg }: { label: string; svg: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.matcha,
        }}
      >
        {svg}
      </span>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '15px',
          fontWeight: 500,
          color: C.matcha,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </span>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: '11px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: C.matchaMid,
        fontWeight: 500,
        marginBottom: '1rem',
      }}
    >
      {children}
    </div>
  );
}

const sectionH2: React.CSSProperties = {
  fontFamily: "'Fraunces', serif",
  fontSize: 'clamp(2rem, 4.5vw, 3rem)',
  fontWeight: 300,
  textAlign: 'center',
  letterSpacing: '-0.02em',
  color: C.text,
  margin: 0,
  lineHeight: 1.15,
};

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: C.matchaLight,
          marginBottom: '1rem',
          fontWeight: 500,
        }}
      >
        {title}
      </div>
      {links.map((l) => (
        <div key={l.label} style={{ marginBottom: '0.5rem' }}>
          <Link
            href={l.href}
            style={{
              fontSize: '14px',
              color: 'rgba(250,248,244,0.6)',
              textDecoration: 'none',
            }}
          >
            {l.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
