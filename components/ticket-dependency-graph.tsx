'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, GitBranch, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface GraphTicket {
  id: string;
  title: string;
  status: 'backlog' | 'in_progress' | 'done' | 'blocked';
  assignee?: string | null;
}

interface GraphDependency {
  id: string;
  ticket_id: string;
  depends_on_ticket_id: string;
  dependency_type: string;
  strength: 'soft' | 'hard';
  escalated: boolean;
}

interface TicketDependencyGraphProps {
  projectId: string;
  subtaskCounts?: Record<string, number>;
  onTicketClick?: (ticketId: string) => void;
}

const STATUS_COLORS_LIGHT: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  done: { bg: '#f0fdf4', border: '#86efac', text: '#166534', dot: '#22c55e' },
  in_progress: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', dot: '#3b82f6' },
  blocked: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', dot: '#ef4444' },
  backlog: { bg: '#fafaf9', border: '#d6d3d1', text: '#44403c', dot: '#a8a29e' },
};

const STATUS_COLORS_DARK: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  done: { bg: '#052e16', border: '#166534', text: '#86efac', dot: '#22c55e' },
  in_progress: { bg: '#0c1a3d', border: '#1e40af', text: '#93c5fd', dot: '#3b82f6' },
  blocked: { bg: '#2a0a0a', border: '#991b1b', text: '#fca5a5', dot: '#ef4444' },
  backlog: { bg: '#1c1917', border: '#44403c', text: '#a8a29e', dot: '#78716c' },
};

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const check = () => setDark(el.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const NODE_W = 180;
const NODE_H = 64;
const H_GAP = 80;
const V_GAP = 24;

function layoutNodes(
  tickets: GraphTicket[],
  deps: GraphDependency[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (tickets.length === 0) return positions;

  const parentOf = new Map<string, Set<string>>();
  for (const t of tickets) parentOf.set(t.id, new Set());
  for (const d of deps) {
    parentOf.get(d.ticket_id)?.add(d.depends_on_ticket_id);
  }

  const levels = new Map<string, number>();
  function getLevel(id: string, visited = new Set<string>()): number {
    if (levels.has(id)) return levels.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const parents = parentOf.get(id) ?? new Set();
    if (parents.size === 0) {
      levels.set(id, 0);
      return 0;
    }
    const maxParent = Math.max(...[...parents].map((p) => getLevel(p, visited)));
    levels.set(id, maxParent + 1);
    return maxParent + 1;
  }
  for (const t of tickets) getLevel(t.id);

  const byLevel = new Map<number, string[]>();
  for (const [id, level] of levels) {
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(id);
  }

  const maxLevel = Math.max(...levels.values(), 0);
  // Reverse the column order so dependencies (higher level) are on the right
  for (let col = 0; col <= maxLevel; col++) {
    const ids = byLevel.get(maxLevel - col) ?? [];
    const totalH = ids.length * NODE_H + (ids.length - 1) * V_GAP;
    const startY = -totalH / 2;
    ids.forEach((id, row) => {
      positions.set(id, {
        x: col * (NODE_W + H_GAP),
        y: startY + row * (NODE_H + V_GAP),
      });
    });
  }

  return positions;
}

export function TicketDependencyGraph({
  projectId,
  subtaskCounts = {},
  onTicketClick,
}: TicketDependencyGraphProps) {
  const [tickets, setTickets] = useState<GraphTicket[]>([]);
  const [deps, setDeps] = useState<GraphDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDark = useIsDark();
  const STATUS_COLORS = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
  const softStroke = isDark ? '#a8a29e' : '#1a1a1a';
  const subtitleFill = isDark ? '#a8a29e' : '#78716c';

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/dependencies`);
      if (!res.ok) return;
      const data = await res.json();
      setTickets(data.tickets ?? []);
      setDeps(data.dependencies ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const positions = layoutNodes(tickets, deps);

  const allX = [...positions.values()].map((p) => p.x);
  const allY = [...positions.values()].map((p) => p.y);
  const minX = Math.min(...allX, 0);
  const minY = Math.min(...allY, 0);
  const maxX = Math.max(...allX, 0) + NODE_W;
  const maxY = Math.max(...allY, 0) + NODE_H;
  const contentW = maxX - minX + 80;
  const contentH = maxY - minY + 80;

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }

  function reset() {
    setZoom(1);
    setPan({ x: 40, y: 40 });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading dependency graph…</span>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <GitBranch className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground">No tickets in this project yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create tickets and add dependencies to see the graph.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GitBranch className="w-4 h-4 text-primary" />
          Dependency Graph
          <Badge className="text-[10px] px-1.5 py-0 rounded-full bg-muted text-muted-foreground ml-1">
            {tickets.length} tickets · {deps.length} links
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Reset view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-[480px] relative overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <defs>
            <marker
              id="arrowhead-hard"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
            <marker
              id="arrowhead-soft"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={softStroke} />
            </marker>
          </defs>

          <g
            transform={`translate(${pan.x + (contentW / 2) * (zoom - 1)},${pan.y + (contentH / 2) * (zoom - 1) + 240}) scale(${zoom})`}
          >
            {deps.map((dep) => {
              // Arrow goes from dependent (ticket_id) to dependency (depends_on_ticket_id)
              const from = positions.get(dep.ticket_id);
              const to = positions.get(dep.depends_on_ticket_id);
              if (!from || !to) return null;

              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;

              const isHard = dep.strength === 'hard' || dep.escalated;
              const strokeColor = isHard ? '#ef4444' : softStroke;
              const markerId = isHard ? 'arrowhead-hard' : 'arrowhead-soft';

              return (
                <path
                  key={dep.id}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHard ? 2 : 1.5}
                  strokeDasharray={isHard ? undefined : '5,4'}
                  markerEnd={`url(#${markerId})`}
                  opacity={
                    hoveredNode === dep.ticket_id || hoveredNode === dep.depends_on_ticket_id
                      ? 1
                      : 0.55
                  }
                />
              );
            })}

            {tickets.map((ticket) => {
              const pos = positions.get(ticket.id);
              if (!pos) return null;

              const colors = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.backlog;
              const isHovered = hoveredNode === ticket.id;
              const hasIncoming = deps.some((d) => d.ticket_id === ticket.id);
              const hasOutgoing = deps.some((d) => d.depends_on_ticket_id === ticket.id);
              const subtaskCount = subtaskCounts[ticket.id] ?? 0;
              const hasSubtasks = subtaskCount > 0;

              return (
                <g
                  key={ticket.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  onMouseEnter={() => setHoveredNode(ticket.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onTicketClick?.(ticket.id)}
                  style={{ cursor: onTicketClick ? 'pointer' : 'default' }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    ry={10}
                    fill={colors.bg}
                    stroke={isHovered ? colors.dot : colors.border}
                    strokeWidth={isHovered ? 2 : 1.5}
                    filter={isHovered ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))' : undefined}
                  />
                  <circle cx={16} cy={NODE_H / 2} r={5} fill={colors.dot} />
                  <text
                    x={28}
                    y={NODE_H / 2 - 8}
                    fontSize={11}
                    fontWeight="600"
                    fill={colors.text}
                    fontFamily="inherit"
                  >
                    {ticket.title.length > 18 ? ticket.title.slice(0, 17) + '…' : ticket.title}
                  </text>
                  <text
                    x={28}
                    y={NODE_H / 2 + 7}
                    fontSize={9.5}
                    fill={subtitleFill}
                    fontFamily="inherit"
                  >
                    {ticket.status.replace('_', ' ')}
                    {ticket.assignee ? ` · @${ticket.assignee.slice(0, 8)}` : ''}
                  </text>
                  {(hasIncoming || hasOutgoing) && (
                    <text
                      x={NODE_W - 12}
                      y={NODE_H / 2 + 4}
                      fontSize={9}
                      fill={colors.dot}
                      fontFamily="inherit"
                      textAnchor="middle"
                    >
                      {hasIncoming && hasOutgoing ? '⇄' : hasIncoming ? '←' : '→'}
                    </text>
                  )}
                  {hasSubtasks && (
                    <g transform={`translate(${NODE_W - 24}, 8)`}>
                      <rect width={18} height={14} rx={7} ry={7} fill={colors.dot} />
                      <text
                        x={9}
                        y={10}
                        fontSize={8}
                        fontWeight="600"
                        fill="#ffffff"
                        fontFamily="inherit"
                        textAnchor="middle"
                      >
                        {subtaskCount > 9 ? '9+' : subtaskCount}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[11px] text-muted-foreground bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border/60">
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-0.5 bg-destructive/70" />
            Hard block
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-5 h-0.5"
              style={{
                backgroundImage: `repeating-linear-gradient(to right,${subtitleFill} 0,${subtitleFill} 4px,transparent 4px,transparent 7px)`,
              }}
            />
            Soft
          </span>
          <span className="text-muted-foreground/60">Drag to pan · Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}
