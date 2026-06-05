import type { Metadata } from 'next';
import { Geist, Geist_Mono, Playfair_Display, DM_Sans, DM_Serif_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { ClerkProvider } from '@clerk/nextjs';
import { ToastProvider } from '@/components/island-toast';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });
const _playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const _dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const _dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif',
});

export const metadata: Metadata = {
  title: 'Syntheon — Turns conversations into software',
  description:
    'Syntheon joins your meetings, extracts spec blocks, generates code, opens PRs, creates Linear tickets, and deploys a live preview — automatically.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html
        lang="en"
        suppressHydrationWarning
        className={`${_playfair.variable} ${_dmSans.variable} ${_dmSerif.variable}`}
      >
        <body className="font-sans antialiased bg-background text-foreground">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              {children}
              <Analytics />
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
