'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Ticket, Video, FolderKanban, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchResult {
  id: string;
  type: 'ticket' | 'meeting' | 'project';
  title: string;
  subtitle?: string;
}

interface DynamicIslandSearchProps {
  onSelectTicket?: (id: string) => void;
  onSelectMeeting?: (id: string) => void;
  onSelectProject?: (id: string) => void;
}

export function DynamicIslandSearch({
  onSelectTicket,
  onSelectMeeting,
  onSelectProject,
}: DynamicIslandSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
  }, []);

  // cmd+k / ctrl+k toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open ? handleClose() : handleOpen();
      }
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleOpen, handleClose]);

  // Focus trap + scroll lock
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const debounce = setTimeout(async () => {
      setLoading(true);
      try {
        const [ticketsRes, meetingsRes, projectsRes] = await Promise.all([
          fetch('/api/tickets'),
          fetch('/api/meetings'),
          fetch('/api/projects'),
        ]);
        const [ticketsData, meetingsData, projectsData] = await Promise.all([
          ticketsRes.json(),
          meetingsRes.json(),
          projectsRes.json(),
        ]);

        const q = query.toLowerCase();

        const ticketsArr: any[] = Array.isArray(ticketsData)
          ? ticketsData
          : (ticketsData.tickets ?? []);
        const meetingsArr: any[] = Array.isArray(meetingsData)
          ? meetingsData
          : (meetingsData.meetings ?? []);
        const projectsArr: any[] = Array.isArray(projectsData)
          ? projectsData
          : (projectsData.projects ?? []);

        const ticketResults: SearchResult[] = ticketsArr
          .filter(
            (t: any) =>
              t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
          )
          .slice(0, 5)
          .map((t: any) => ({
            id: t.id,
            type: 'ticket' as const,
            title: t.title,
            subtitle: t.status?.replace('_', ' '),
          }));

        const meetingResults: SearchResult[] = meetingsArr
          .filter((m: any) => (m.projectName ?? m.project_name)?.toLowerCase().includes(q))
          .slice(0, 3)
          .map((m: any) => ({
            id: m.id,
            type: 'meeting' as const,
            title: m.projectName ?? m.project_name,
            subtitle: m.platform,
          }));

        const projectResults: SearchResult[] = projectsArr
          .filter((p: any) => p.name?.toLowerCase().includes(q))
          .slice(0, 3)
          .map((p: any) => ({
            id: p.id,
            type: 'project' as const,
            title: p.name,
            subtitle: 'Project',
          }));

        setResults([...ticketResults, ...meetingResults, ...projectResults]);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (result: SearchResult) => {
    handleClose();
    if (result.type === 'ticket') onSelectTicket?.(result.id);
    if (result.type === 'meeting') onSelectMeeting?.(result.id);
    if (result.type === 'project') onSelectProject?.(result.id);
  };

  const typeIcon = (type: SearchResult['type']) => {
    if (type === 'ticket') return <Ticket className="h-3.5 w-3.5 shrink-0" />;
    if (type === 'meeting') return <Video className="h-3.5 w-3.5 shrink-0" />;
    return <FolderKanban className="h-3.5 w-3.5 shrink-0" />;
  };

  const typeColor = (type: SearchResult['type']) => {
    if (type === 'ticket') return 'text-primary';
    if (type === 'meeting') return 'text-amber-500';
    return 'text-emerald-500';
  };

  const typeLabel = (type: SearchResult['type']) => {
    if (type === 'ticket') return 'Ticket';
    if (type === 'meeting') return 'Meeting';
    return 'Project';
  };

  const [isMac, setIsMac] = useState(true);
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  return (
    <>
      {/* Trigger pill */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open search"
        className="group flex items-center gap-2 h-9 pl-3 pr-2 rounded-full border border-border bg-card hover:bg-accent hover:border-foreground/20 text-muted-foreground hover:text-foreground press-down min-w-[220px]"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs flex-1 text-left">Search…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border rounded px-1.5 py-0.5 shrink-0">
          <span className="text-[11px] leading-none">{isMac ? '⌘' : 'Ctrl'}</span>
          <span className="leading-none">K</span>
        </kbd>
      </button>

      {/* ── Popup Modal Overlay ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] sm:pt-[18vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Search card */}
            <motion.div
              ref={modalRef}
              className="relative w-full max-w-xl mx-4 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Input row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search tickets, meetings, projects…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none min-w-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="flex items-center justify-center h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <kbd className="font-mono text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border rounded px-1.5 py-0.5 shrink-0">
                  esc
                </kbd>
              </div>

              {/* Results area */}
              <div className="max-h-[50vh] overflow-y-auto">
                {loading && (
                  <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse-soft" />
                    Searching…
                  </div>
                )}

                {!loading && query && results.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No results for “{query}”
                  </div>
                )}

                {!loading && !query && (
                  <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                    Type to search across tickets, meetings & projects
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <motion.div
                    className="py-1"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: {
                        transition: { staggerChildren: 0.03 },
                      },
                    }}
                  >
                    {results.map((result, i) => (
                      <motion.button
                        key={result.id}
                        type="button"
                        onClick={() => handleSelect(result)}
                        variants={{
                          hidden: { opacity: 0, y: 6 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          i === selectedIndex ? 'bg-muted' : 'hover:bg-muted/60'
                        }`}
                      >
                        <span className={typeColor(result.type)}>{typeIcon(result.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{result.title}</p>
                          <p className="text-[11px] text-muted-foreground capitalize flex items-center gap-1.5">
                            {result.subtitle && <span>{result.subtitle}</span>}
                            <span className="text-muted-foreground/50">·</span>
                            <span>{typeLabel(result.type)}</span>
                          </p>
                        </div>
                        {i === selectedIndex && (
                          <span className="text-[10px] text-muted-foreground/60 font-mono">↵</span>
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Footer hints */}
              <div className="border-t border-border/60 px-4 py-2 flex items-center gap-4 bg-muted/30 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="font-mono bg-background border border-border rounded px-1 py-0.5">
                    ↑↓
                  </kbd>{' '}
                  navigate
                </span>
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="font-mono bg-background border border-border rounded px-1 py-0.5">
                    ↵
                  </kbd>{' '}
                  select
                </span>
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="font-mono bg-background border border-border rounded px-1 py-0.5">
                    esc
                  </kbd>{' '}
                  close
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
