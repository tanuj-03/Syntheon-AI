'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

/**
 * PageShell — wraps dashboard pages with a smooth fade-in entrance.
 * Uses the global `animate-fade-in-up` utility from globals.css.
 *
 * Drop-in: <PageShell>{contents}</PageShell>
 * Or pass a `key` prop scoped to the route to retrigger on view change.
 */
export function PageShell({
  children,
  className,
  variant = 'fade-up',
}: {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'fade-up' | 'scale';
}) {
  const animationClass =
    variant === 'fade'
      ? 'animate-fade-in'
      : variant === 'scale'
        ? 'animate-scale-in'
        : 'animate-fade-in-up';

  return (
    <div className={cn('flex-1 min-w-0 overflow-auto', animationClass, className)}>{children}</div>
  );
}
