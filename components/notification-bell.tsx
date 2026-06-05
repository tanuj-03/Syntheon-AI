'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Ticket, MessageSquare, AlertTriangle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  user_id: string;
  org_id: string;
  type: 'assigned' | 'mentioned' | 'blocked' | 'due_soon';
  title: string;
  message?: string;
  ticket_id?: string;
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  onNavigateToTicket?: (ticketId: string) => void;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  assigned: {
    icon: <Ticket className="h-3.5 w-3.5" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  mentioned: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  blocked: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  due_soon: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
};

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell({ onNavigateToTicket }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
      const unreadRes = await fetch('/api/notifications?unread=true');
      if (unreadRes.ok) {
        const { count } = await unreadRes.json();
        setUnreadCount(count);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(c - 1, 0));
    } catch {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  const handleClickNotification = (n: NotificationItem) => {
    if (!n.read) markAsRead(n.id);
    if (n.ticket_id && onNavigateToTicket) {
      onNavigateToTicket(n.ticket_id);
    }
    setOpen(false);
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <div ref={bellRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
        aria-label="Notifications"
        className={cn(
          'relative flex items-center justify-center h-9 w-9 rounded-full border transition-colors press-down',
          open
            ? 'border-foreground/30 bg-accent text-foreground'
            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4.5 min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-11 right-0 w-80 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden z-50"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="py-1">
                  {unreadNotifications.map((n) => {
                    const cfg = typeConfig[n.type] ?? typeConfig.assigned;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleClickNotification(n)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
                      >
                        <div
                          className={cn(
                            'mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                            cfg.bg
                          )}
                        >
                          <span className={cfg.color}>{cfg.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{n.title}</p>
                          {n.message && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {n.message}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      </button>
                    );
                  })}

                  {readNotifications.length > 0 && unreadNotifications.length > 0 && (
                    <div className="px-4 py-1.5">
                      <div className="border-t border-border/40" />
                    </div>
                  )}

                  {readNotifications.map((n) => {
                    const cfg = typeConfig[n.type] ?? typeConfig.assigned;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleClickNotification(n)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors opacity-60"
                      >
                        <div
                          className={cn(
                            'mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0',
                            cfg.bg
                          )}
                        >
                          <span className={cfg.color}>{cfg.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{n.title}</p>
                          {n.message && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {n.message}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
