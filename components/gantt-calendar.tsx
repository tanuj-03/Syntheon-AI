'use client';

import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isFirstDayOfMonth,
  isSameDay,
  isWeekend,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  AlertOctagon,
  Loader2,
  CircleDot,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ─── Types ─────────────────────────────────────────────────────────
export interface GanttTicket {
  id: string;
  title: string;
  status?: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked' | string | null;
  assignee?: string | null;
  projectId?: string | null;
  start_date?: string | null;
  due_date?: string | null;
}

export interface GanttProject {
  id: string;
  name: string;
}

interface GanttCalendarProps {
  tickets: GanttTicket[];
  projects: GanttProject[];
  onSelectTicket?: (id: string) => void;
}

// ─── Layout constants ──────────────────────────────────────────────
const ZOOM = {
  month: { dayWidth: 36, defaultRangeAfter: 60, label: 'Month' },
  quarter: { dayWidth: 16, defaultRangeAfter: 120, label: 'Quarter' },
} as const;
type ZoomKey = keyof typeof ZOOM;

const RAIL_WIDTH = 320;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 64;

// ─── Status visual mapping (monochrome with one red accent) ────────
function statusStyles(status?: string | null) {
  switch (status) {
    case 'in_progress':
      return {
        bar: 'bg-foreground text-background',
        text: 'text-background',
        icon: <CircleDot className="h-3 w-3" />,
        label: 'In progress',
      };
    case 'in_review':
      return {
        bar: 'bg-foreground/55 text-background',
        text: 'text-background',
        icon: <Loader2 className="h-3 w-3" />,
        label: 'In review',
      };
    case 'done':
      return {
        bar: 'bg-foreground/20 text-foreground/60 line-through',
        text: 'text-foreground/60',
        icon: <CheckCircle2 className="h-3 w-3 text-foreground/60" />,
        label: 'Done',
      };
    case 'blocked':
      return {
        bar: 'bg-destructive text-destructive-foreground',
        text: 'text-destructive-foreground',
        icon: <AlertOctagon className="h-3 w-3" />,
        label: 'Blocked',
      };
    case 'todo':
      return {
        bar: 'bg-foreground/15 text-foreground border border-foreground/25',
        text: 'text-foreground',
        icon: <Circle className="h-3 w-3" />,
        label: 'To do',
      };
    case 'backlog':
    default:
      return {
        bar: 'bg-muted text-muted-foreground border border-dashed border-foreground/25',
        text: 'text-muted-foreground',
        icon: <Circle className="h-3 w-3" />,
        label: 'Backlog',
      };
  }
}

// ─── Urgency helpers ────────────────────────────────────────────────
function getUrgency(dueDate: string | null | undefined, status?: string | null) {
  if (status === 'done') return { label: 'Done', color: '', dot: '', daysLeft: null };
  if (!dueDate) return { label: '', color: '', dot: '', daysLeft: null };
  const due = startOfDay(parseISO(dueDate));
  const now = startOfDay(new Date());
  const days = differenceInCalendarDays(due, now);
  if (days < 0)
    return {
      label: `${Math.abs(days)}d overdue`,
      color: 'text-red-500 bg-red-500/10',
      dot: 'bg-red-500',
      daysLeft: days,
    };
  if (days === 0)
    return {
      label: 'Due today',
      color: 'text-orange-500 bg-orange-500/10',
      dot: 'bg-orange-500',
      daysLeft: days,
    };
  if (days <= 3)
    return {
      label: `${days}d left`,
      color: 'text-yellow-500 bg-yellow-500/10',
      dot: 'bg-yellow-500',
      daysLeft: days,
    };
  if (days <= 7)
    return {
      label: `${days}d left`,
      color: 'text-blue-400 bg-blue-400/10',
      dot: 'bg-blue-400',
      daysLeft: days,
    };
  return { label: `${days}d`, color: 'text-muted-foreground bg-muted', dot: '', daysLeft: days };
}

// ─── Helpers ───────────────────────────────────────────────────────
function safeParse(d?: string | null): Date | null {
  if (!d) return null;
  try {
    const parsed = parseISO(d);
    if (isNaN(parsed.getTime())) return null;
    return startOfDay(parsed);
  } catch {
    return null;
  }
}

function getTicketSpan(t: GanttTicket): { start: Date; end: Date } | null {
  const s = safeParse(t.start_date);
  const e = safeParse(t.due_date);
  if (!s && !e) return null;
  if (s && e) return s <= e ? { start: s, end: e } : { start: e, end: s };
  if (s) return { start: s, end: s };
  return { start: e!, end: e! };
}

// ─── Component ─────────────────────────────────────────────────────
export function GanttCalendar({ tickets, projects, onSelectTicket }: GanttCalendarProps) {
  const [zoom, setZoom] = useState<ZoomKey>('month');
  const [anchor, setAnchor] = useState<Date>(() => startOfMonth(new Date()));
  const [hoveredTicketId, setHoveredTicketId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dayWidth = ZOOM[zoom].dayWidth;

  // Visible range
  const rangeStart = useMemo(() => subDays(anchor, 14), [anchor]);
  const rangeEnd = useMemo(() => addDays(anchor, ZOOM[zoom].defaultRangeAfter), [anchor, zoom]);
  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd]
  );
  const totalWidth = days.length * dayWidth;
  const today = startOfDay(new Date());

  // Group rows: scheduled tickets sorted by start date, unscheduled at bottom
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const { scheduled, unscheduled } = useMemo(() => {
    const scheduled: { ticket: GanttTicket; span: { start: Date; end: Date } }[] = [];
    const unscheduled: GanttTicket[] = [];
    for (const t of tickets) {
      const span = getTicketSpan(t);
      if (span) scheduled.push({ ticket: t, span });
      else unscheduled.push(t);
    }
    scheduled.sort((a, b) => a.span.start.getTime() - b.span.start.getTime());
    return { scheduled, unscheduled };
  }, [tickets]);

  // Scroll to today when anchor or zoom changes
  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const offsetDays = differenceInCalendarDays(today, rangeStart);
    const target = offsetDays * dayWidth - node.clientWidth / 2 + RAIL_WIDTH / 2;
    node.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [anchor, zoom, rangeStart, dayWidth]);

  // Empty state
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-up">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <CalendarDays className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">No tickets yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Create tickets with start and due dates to visualize them on the timeline.
        </p>
      </div>
    );
  }

  const goPrev = () => setAnchor((d) => subMonths(d, 1));
  const goNext = () => setAnchor((d) => addMonths(d, 1));
  const goToday = () => setAnchor(startOfMonth(new Date()));

  // Build month bands for header (group consecutive days in same month)
  const monthBands: { label: string; startIdx: number; days: number }[] = [];
  days.forEach((d, i) => {
    const last = monthBands[monthBands.length - 1];
    const label = format(d, 'MMMM yyyy');
    if (!last || last.label !== label) {
      monthBands.push({ label, startIdx: i, days: 1 });
    } else {
      last.days += 1;
    }
  });

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-2xl overflow-hidden animate-fade-in">
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            className="h-8 w-8 press-down"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="h-8 px-3 text-xs font-medium press-down"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            className="h-8 w-8 press-down"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-3 text-sm font-semibold text-foreground tabular-nums">
            {format(anchor, 'MMMM yyyy')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground mr-2">
            <LegendDot className="bg-foreground" label="In progress" />
            <LegendDot className="bg-foreground/55" label="Review" />
            <LegendDot className="bg-foreground/20" label="Done" />
            <LegendDot className="bg-destructive" label="Blocked" />
            <span className="mx-0.5 text-border">│</span>
            <LegendDot className="bg-red-500" label="Overdue" />
            <LegendDot className="bg-orange-500" label="Today" />
            <LegendDot className="bg-yellow-500" label="≤3d" />
          </div>

          {/* Zoom toggle */}
          <div className="inline-flex bg-muted rounded-lg p-0.5">
            {(Object.keys(ZOOM) as ZoomKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setZoom(k)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md press-down inline-flex items-center gap-1',
                  zoom === k
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {k === 'month' ? <ZoomIn className="h-3 w-3" /> : <ZoomOut className="h-3 w-3" />}
                {ZOOM[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Grid: rail + scrollable timeline ─── */}
      <div ref={scrollerRef} className="flex-1 overflow-auto relative">
        <div className="relative" style={{ width: RAIL_WIDTH + totalWidth, minWidth: '100%' }}>
          {/* ─── Sticky header row ─── */}
          <div
            className="sticky top-0 z-30 flex bg-card/95 backdrop-blur-sm border-b border-border"
            style={{ height: HEADER_HEIGHT }}
          >
            {/* Rail header */}
            <div
              className="sticky left-0 z-10 flex items-center px-4 border-r border-border bg-card/95 backdrop-blur-sm"
              style={{ width: RAIL_WIDTH, minWidth: RAIL_WIDTH, height: HEADER_HEIGHT }}
            >
              <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                Tickets · {scheduled.length} scheduled
              </span>
            </div>

            {/* Month + day cells */}
            <div className="relative" style={{ width: totalWidth, height: HEADER_HEIGHT }}>
              {/* Month bands (top half) */}
              <div className="absolute top-0 left-0 right-0 h-7 flex">
                {monthBands.map((band) => (
                  <div
                    key={band.label + band.startIdx}
                    className="border-r border-border/50 px-2 flex items-center"
                    style={{ width: band.days * dayWidth }}
                  >
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {band.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Day cells (bottom half) */}
              <div className="absolute top-7 left-0 right-0 bottom-0 flex">
                {days.map((d, i) => {
                  const isToday = isSameDay(d, today);
                  const weekend = isWeekend(d);
                  const monthStart = isFirstDayOfMonth(d) && i !== 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex flex-col items-center justify-center text-[10px] tabular-nums border-r',
                        weekend && 'bg-muted/40',
                        isToday && 'bg-primary/10',
                        monthStart ? 'border-foreground/30' : 'border-border/40'
                      )}
                      style={{ width: dayWidth, minWidth: dayWidth }}
                    >
                      {zoom === 'quarter' && d.getDate() % 5 !== 0 && !isToday ? null : (
                        <>
                          <span
                            className={cn(
                              'font-medium',
                              isToday
                                ? 'text-primary font-bold'
                                : weekend
                                  ? 'text-muted-foreground/60'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {format(d, 'd')}
                          </span>
                          {zoom === 'month' && (
                            <span
                              className={cn(
                                'text-[9px] uppercase tracking-wider',
                                isToday
                                  ? 'text-primary'
                                  : weekend
                                    ? 'text-muted-foreground/40'
                                    : 'text-muted-foreground/60'
                              )}
                            >
                              {format(d, 'EEEEE')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Body rows ─── */}
          <div className="relative">
            {/* Today vertical line — overlay across entire body */}
            <TodayLine
              today={today}
              rangeStart={rangeStart}
              dayWidth={dayWidth}
              railWidth={RAIL_WIDTH}
              rowsCount={scheduled.length + (unscheduled.length > 0 ? unscheduled.length + 1 : 0)}
            />

            {/* Scheduled rows */}
            {scheduled.map(({ ticket, span }, idx) => {
              const startOffset = differenceInCalendarDays(span.start, rangeStart);
              const lengthDays = differenceInCalendarDays(span.end, span.start) + 1;
              const left = startOffset * dayWidth;
              const width = Math.max(lengthDays * dayWidth - 4, dayWidth - 4);
              const styles = statusStyles(ticket.status ?? 'backlog');
              const urgency = getUrgency(ticket.due_date, ticket.status);
              const projName = ticket.projectId ? projectMap.get(ticket.projectId) : null;

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'flex border-b border-border/60 group/row',
                    idx % 2 === 1 && 'bg-muted/20',
                    hoveredTicketId === ticket.id && 'bg-accent/40'
                  )}
                  style={{ height: ROW_HEIGHT }}
                  onMouseEnter={() => setHoveredTicketId(ticket.id)}
                  onMouseLeave={() => setHoveredTicketId(null)}
                >
                  {/* Rail cell — sticky */}
                  <button
                    type="button"
                    onClick={() => onSelectTicket?.(ticket.id)}
                    className={cn(
                      'sticky left-0 z-20 flex items-center gap-2 px-4 border-r border-border text-left bg-background/95 backdrop-blur-sm hover:bg-accent press-down',
                      idx % 2 === 1 && 'bg-muted/40',
                      hoveredTicketId === ticket.id && 'bg-accent/70'
                    )}
                    style={{ width: RAIL_WIDTH, minWidth: RAIL_WIDTH, height: ROW_HEIGHT }}
                  >
                    <span className="shrink-0">{styles.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-[13px] font-medium leading-tight truncate',
                          ticket.status === 'done'
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        )}
                      >
                        {ticket.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {projName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium truncate max-w-[120px]">
                            {projName}
                          </span>
                        )}
                        {urgency.label && ticket.status !== 'done' && (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-medium',
                              urgency.color
                            )}
                          >
                            {urgency.label}
                          </span>
                        )}
                        {ticket.assignee && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            @{ticket.assignee}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Day grid track + bar */}
                  <div
                    className="relative shrink-0"
                    style={{ width: totalWidth, height: ROW_HEIGHT }}
                  >
                    {/* Vertical day separators + weekend tint */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((d, i) => (
                        <div
                          key={i}
                          className={cn(
                            'border-r',
                            isWeekend(d) && 'bg-muted/30',
                            isFirstDayOfMonth(d) && i !== 0
                              ? 'border-foreground/20'
                              : 'border-border/30'
                          )}
                          style={{ width: dayWidth, minWidth: dayWidth }}
                        />
                      ))}
                    </div>

                    {/* The ticket bar */}
                    <button
                      type="button"
                      onClick={() => onSelectTicket?.(ticket.id)}
                      className={cn(
                        'group/bar absolute top-1/2 -translate-y-1/2 rounded-full px-3 flex items-center gap-1.5 text-xs font-medium shadow-sm hover:shadow-md hover:scale-[1.02] press-down origin-left',
                        styles.bar
                      )}
                      style={{
                        left,
                        width,
                        height: ROW_HEIGHT - 16,
                      }}
                      title={`${ticket.title}\n${format(span.start, 'MMM d')} → ${format(span.end, 'MMM d')}`}
                    >
                      {urgency.dot && ticket.status !== 'done' && (
                        <span
                          className={cn('w-2 h-2 rounded-full shrink-0 animate-pulse', urgency.dot)}
                        />
                      )}
                      <span className={cn('truncate', styles.text)}>{ticket.title}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Unscheduled section */}
            {unscheduled.length > 0 && (
              <>
                <div
                  className="flex items-center px-4 border-y border-border bg-muted/30"
                  style={{ height: 32 }}
                >
                  <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                    Unscheduled · {unscheduled.length}
                  </span>
                </div>
                {unscheduled.map((ticket, idx) => {
                  const styles = statusStyles(ticket.status ?? 'backlog');
                  const projName = ticket.projectId ? projectMap.get(ticket.projectId) : null;
                  return (
                    <div
                      key={ticket.id}
                      className={cn(
                        'flex border-b border-border/60',
                        idx % 2 === 1 && 'bg-muted/20'
                      )}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTicket?.(ticket.id)}
                        className={cn(
                          'sticky left-0 z-20 flex items-center gap-2 px-4 border-r border-border text-left bg-background/95 backdrop-blur-sm hover:bg-accent press-down',
                          idx % 2 === 1 && 'bg-muted/40'
                        )}
                        style={{
                          width: RAIL_WIDTH,
                          minWidth: RAIL_WIDTH,
                          height: ROW_HEIGHT,
                        }}
                      >
                        <span className="shrink-0">{styles.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground leading-tight truncate">
                            {ticket.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {projName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium truncate max-w-[120px]">
                                {projName}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground italic">
                              No dates set
                            </span>
                          </div>
                        </div>
                      </button>
                      <div
                        className="relative shrink-0 flex items-center px-4"
                        style={{ width: totalWidth, height: ROW_HEIGHT }}
                      >
                        <span className="text-[11px] text-muted-foreground/70 italic">
                          Add a start &amp; due date to schedule this ticket
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Bottom spacer so last row isn't flush */}
            <div style={{ height: 16 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────
function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-2.5 h-2.5 rounded-full', className)} />
      {label}
    </span>
  );
}

function TodayLine({
  today,
  rangeStart,
  dayWidth,
  railWidth,
  rowsCount,
}: {
  today: Date;
  rangeStart: Date;
  dayWidth: number;
  railWidth: number;
  rowsCount: number;
}) {
  const offset = differenceInCalendarDays(today, rangeStart);
  if (offset < 0) return null;
  const left = railWidth + offset * dayWidth + dayWidth / 2;
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 z-10 flex flex-col items-center"
      style={{ left, transform: 'translateX(-50%)' }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-primary -mt-1 ring-4 ring-background shadow-md" />
      <div className="w-px flex-1 bg-primary/60" />
    </div>
  );
}
