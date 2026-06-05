'use client';

import { useState, useEffect } from 'react';
import {
  Rocket,
  Wrench,
  Bot,
  FileCode,
  GitBranch,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Brain,
  Search,
  Code2,
  GitCommit,
  TestTube,
  Bug,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  FilePlus,
  Terminal,
  PlayCircle,
  Activity,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'in_progress' | 'done' | 'blocked';
  assignee?: string | null;
  assignee_user_id?: string | null;
  projectId?: string | null;
}

interface Project {
  id: string;
  name: string;
  repo?: string | null;
  deployUrl?: string | null;
  context?: string;
}

interface AgentStep {
  agent: string;
  agentId: string;
  icon: string;
  status: 'pending' | 'running' | 'done' | 'error';
  files?: string[];
  branch?: string;
  message: string;
  cost?: string;
}

interface SimulationResult {
  plan: string;
  steps: AgentStep[];
  totalCost: string;
  branchBase: string;
}

interface BuildPhase {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const BUILD_PHASES: BuildPhase[] = [
  {
    key: 'planning',
    label: 'Plan',
    icon: <Brain className="h-4 w-4" />,
    description: 'Analyze ticket and decide what to build',
  },
  {
    key: 'gathering',
    label: 'Gather',
    icon: <Search className="h-4 w-4" />,
    description: 'Read existing repo files for context',
  },
  {
    key: 'coding',
    label: 'Generate',
    icon: <Code2 className="h-4 w-4" />,
    description: 'Generate new code and modifications',
  },
  {
    key: 'committing',
    label: 'Commit',
    icon: <GitCommit className="h-4 w-4" />,
    description: 'Push files to GitHub branch',
  },
  {
    key: 'testing',
    label: 'Validate',
    icon: <TestTube className="h-4 w-4" />,
    description: 'Type-check and lint generated code',
  },
  {
    key: 'fixing',
    label: 'Fix',
    icon: <Bug className="h-4 w-4" />,
    description: 'Auto-fix any validation errors',
  },
  {
    key: 'reviewing',
    label: 'Open PR',
    icon: <Eye className="h-4 w-4" />,
    description: 'Create pull request on GitHub',
  },
  {
    key: 'done',
    label: 'Done',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Build complete — review the PR',
  },
];

function getPhaseStatus(
  phaseKey: string,
  runDetails: any
): 'pending' | 'running' | 'done' | 'error' {
  if (!runDetails) return 'pending';
  const status = runDetails.status;
  const steps = runDetails.steps || [];

  const phaseOrder = BUILD_PHASES.map((p) => p.key);
  const currentIdx = phaseOrder.indexOf(status);
  const phaseIdx = phaseOrder.indexOf(phaseKey);

  if (phaseKey === status) return 'running';
  if (currentIdx > phaseIdx) return 'done';
  if (status === 'error' && phaseIdx <= currentIdx) {
    const step = steps.find((s: any) => s.phase === 'error');
    if (step) return 'error';
    return 'done';
  }
  if (status === 'done') return 'done';
  return 'pending';
}

export function SwarmNetBuildPanel({ project, tickets }: { project: Project; tickets: Ticket[] }) {
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runningAgent, setRunningAgent] = useState(false);
  const [agentRunStatus, setAgentRunStatus] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  // Repo picker state
  const [repos, setRepos] = useState<{ fullName: string; name: string; owner: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const [projectTickets, setProjectTickets] = useState<Ticket[]>(tickets);

  const readyTickets = projectTickets.filter(
    (t) => t.status === 'in_progress' || t.status === 'done'
  );

  // Default-select all ready tickets on first load / when tickets change
  useEffect(() => {
    setSelectedTicketIds(new Set(readyTickets.map((t) => t.id)));
  }, [readyTickets.map((t) => t.id).join(',')]);

  const selectedTickets = readyTickets.filter((t) => selectedTicketIds.has(t.id));

  // Fetch all tickets and filter to this project
  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await fetch('/api/tickets');
        if (!res.ok) return;
        const allTickets: Ticket[] = await res.json();
        setProjectTickets(allTickets.filter((t) => t.projectId === project.id));
      } catch (e) {
        console.error('[BuildPanel] Failed to fetch tickets:', e);
        setProjectTickets(tickets);
      }
    }
    void fetchTickets();
  }, [project.id]);

  // Fetch user's GitHub repos on mount
  useEffect(() => {
    async function fetchRepos() {
      setLoadingRepos(true);
      setRepoError(null);
      try {
        const res = await fetch('/api/swarmnet/repos');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load repos');
        setRepos(data.repos || []);
        // Auto-select project.repo if it exists
        if (project.repo) {
          const match = data.repos.find((r: any) => r.fullName === project.repo);
          if (match) setSelectedRepo(match.fullName);
        }
      } catch (err) {
        setRepoError(err instanceof Error ? err.message : 'Failed to load repos');
      } finally {
        setLoadingRepos(false);
      }
    }
    fetchRepos();
  }, [project.repo]);

  async function runSimulation() {
    if (readyTickets.length === 0) return;
    setSimulating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/swarmnet/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          context: project.context,
          tickets: readyTickets.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            status: t.status,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Simulation failed');
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  }

  async function runRealAgent() {
    if (selectedTickets.length === 0) return;
    const ticket = selectedTickets[0];
    setRunningAgent(true);
    setAgentRunStatus('Starting FrontendAgent...');
    setError(null);

    try {
      const [owner, repo] = selectedRepo.includes('/') ? selectedRepo.split('/') : ['', ''];
      if (!owner || !repo) {
        throw new Error('Please select a GitHub repository first');
      }

      const res = await fetch(`/api/swarmnet/agents/agent:frontend/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          projectId: project.id,
          projectName: project.name,
          githubOwner: owner,
          githubRepo: repo,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Agent run failed');

      setAgentRunStatus(`FrontendAgent running on branch ${data.branchName}`);
      setElapsedSeconds(0);

      // Track elapsed time
      const timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      // Poll for status every 8 seconds
      const interval = setInterval(async () => {
        const statusRes = await fetch(`/api/swarmnet/runs/${data.runId}`);
        const statusData = await statusRes.json();
        setRunDetails(statusData);
        if (statusData.status === 'done' || statusData.status === 'error') {
          clearInterval(interval);
          clearInterval(timer);
          setAgentRunStatus(
            statusData.status === 'done'
              ? `Done! PR #${statusData.prNumber}`
              : `Error: ${statusData.error || 'Unknown error'}`
          );
          setRunningAgent(false);
        } else {
          setAgentRunStatus(statusData.currentTask || `Running: ${statusData.status}`);
        }
      }, 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed');
      setAgentRunStatus(null);
      setRunningAgent(false);
    }
  }

  function getAgentIcon(agentId: string) {
    if (agentId.includes('planner')) return <Bot className="h-4 w-4" />;
    if (agentId.includes('frontend')) return <FileCode className="h-4 w-4" />;
    if (agentId.includes('backend')) return <Wrench className="h-4 w-4" />;
    if (agentId.includes('database')) return <GitBranch className="h-4 w-4" />;
    if (agentId.includes('security')) return <AlertTriangle className="h-4 w-4" />;
    if (agentId.includes('test')) return <CheckCircle className="h-4 w-4" />;
    return <Bot className="h-4 w-4" />;
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'done':
        return 'text-emerald-500';
      case 'running':
        return 'text-amber-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  }

  const isRunning =
    runningAgent || (runDetails && runDetails.status !== 'done' && runDetails.status !== 'error');
  const isDone = runDetails?.status === 'done';
  const isError = runDetails?.status === 'error';
  const activeTicket = readyTickets.length > 0 ? readyTickets[0] : null;

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">SwarmNet Build</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Run the FrontendAgent to generate code from tickets and open a pull request. Every
              phase is tracked live.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-medium">Build {project.name}</span>{' '}
            <span className="text-muted-foreground">
              from {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setTicketDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <ListChecks className="h-3.5 w-3.5" />
            View tickets
          </button>
          <div className="flex-1" />
          <button
            onClick={runRealAgent}
            disabled={runningAgent || selectedTickets.length === 0 || !selectedRepo}
            title={
              !selectedRepo
                ? 'Select a repository first'
                : selectedTickets.length === 0
                  ? 'Select at least one ticket to build'
                  : ''
            }
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {runningAgent ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Building...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Run FrontendAgent
              </>
            )}
          </button>
        </div>

        {readyTickets.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">
            Move tickets to <strong>In Progress</strong> or <strong>Done</strong> to make them
            available for building.
          </p>
        )}
        {readyTickets.length > 0 && selectedTickets.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">
            Select at least one ticket using <strong>View tickets</strong> to start building.
          </p>
        )}
      </div>

      {/* ── Real-Time Progress Card ── */}
      {(runningAgent || runDetails) && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Top status bar */}
          <div
            className={`px-5 py-4 border-b ${
              isError
                ? 'bg-red-50 border-red-100'
                : isDone
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-primary/5 border-primary/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {isRunning ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : isDone ? (
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                ) : isError ? (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                ) : (
                  <Activity className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={`text-sm font-semibold ${
                      isError ? 'text-red-800' : isDone ? 'text-emerald-800' : 'text-primary'
                    }`}
                  >
                    {isRunning
                      ? 'Building in progress'
                      : isDone
                        ? 'Build complete'
                        : isError
                          ? 'Build failed'
                          : 'Build status'}
                  </h4>
                  {isRunning && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase tracking-wide">
                      Live
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs mt-0.5 ${
                    isError ? 'text-red-600' : isDone ? 'text-emerald-600' : 'text-primary/80'
                  }`}
                >
                  {isRunning && activeTicket ? (
                    <>
                      Working on <strong>#{activeTicket.id.slice(0, 8)}</strong> —{' '}
                      {agentRunStatus || 'Initializing...'}
                    </>
                  ) : isDone ? (
                    <>
                      PR #{runDetails.prNumber} opened — {agentRunStatus}
                    </>
                  ) : isError ? (
                    <>{runDetails?.error || 'An error occurred during the build.'}</>
                  ) : (
                    agentRunStatus
                  )}
                </p>
              </div>
              {isRunning && (
                <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(elapsedSeconds)}
                </div>
              )}
            </div>

            {/* Current Task Detail */}
            {runDetails?.currentTask && isRunning && (
              <div className="mt-3 rounded-lg bg-white/60 border border-primary/10 p-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground">Current task:</span>
                  <span className="text-xs text-muted-foreground">{runDetails.currentTask}</span>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isRunning && (
              <div className="mt-3">
                <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(
                        ((BUILD_PHASES.findIndex((p) => p.key === runDetails?.status) + 1) /
                          BUILD_PHASES.length) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Step {BUILD_PHASES.findIndex((p) => p.key === runDetails?.status) + 1} of{' '}
                    {BUILD_PHASES.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(
                      ((BUILD_PHASES.findIndex((p) => p.key === runDetails?.status) + 1) /
                        BUILD_PHASES.length) *
                        100
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* File Changes Preview */}
          {isDone && runDetails?.filesCreated && runDetails.filesCreated.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Files Generated
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {runDetails.filesCreated.map((f: string) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700"
                  >
                    <FilePlus className="h-3 w-3" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error detail */}
          {isError && runDetails?.error && (
            <div className="px-5 py-4 border-b border-red-100">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong>Error:</strong> {runDetails.error}
              </div>
            </div>
          )}

          {/* PR Success Banner */}
          {isDone && runDetails?.prUrl && (
            <div className="px-5 py-4 border-b border-emerald-100">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Pull Request #{runDetails.prNumber} opened successfully
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Branch:{' '}
                    <code className="font-mono text-emerald-800">{runDetails.branchName}</code>
                  </p>
                </div>
                <a
                  href={runDetails.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900 bg-white px-4 py-2 rounded-lg border border-emerald-200 hover:border-emerald-300 transition-colors shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                  View PR
                </a>
              </div>
            </div>
          )}

          {/* Phase Pipeline (compact inline) */}
          <div className="px-5 py-4">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Phase Pipeline
            </h5>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {BUILD_PHASES.map((phase) => {
                const status = getPhaseStatus(phase.key, runDetails);
                const active = status === 'running';
                const done = status === 'done';
                const errored = status === 'error';

                return (
                  <div
                    key={phase.key}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-center transition-all ${
                      active
                        ? 'border-primary/40 bg-primary/5'
                        : done
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : errored
                            ? 'border-red-200 bg-red-50'
                            : 'border-border/40 bg-background opacity-50'
                    }`}
                  >
                    <div className="shrink-0">
                      {active ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : done ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : errored ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium leading-tight ${
                        active
                          ? 'text-primary'
                          : done
                            ? 'text-emerald-700'
                            : errored
                              ? 'text-red-700'
                              : 'text-muted-foreground'
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw Logs (expandable) */}
          {runDetails && (
            <div className="border-t border-border">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-5 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  {showDetails ? 'Hide detailed logs' : 'Show detailed logs'}
                </span>
                {showDetails ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {showDetails && (
                <div className="px-5 pb-4 space-y-2">
                  {runDetails.branchName && (
                    <p className="text-xs text-muted-foreground">
                      Branch: <code className="text-foreground">{runDetails.branchName}</code>
                    </p>
                  )}
                  {runDetails.steps && runDetails.steps.length > 0 && (
                    <div className="space-y-1">
                      {runDetails.steps.map((step: any, i: number) => (
                        <div
                          key={i}
                          className={`text-xs p-2.5 rounded-lg border ${
                            step.phase === 'error'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : step.phase === 'done'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-border/50 bg-background text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize text-[10px] px-1.5 py-0.5 rounded bg-muted">
                              {step.phase}
                            </span>
                            <span>{step.message}</span>
                          </div>
                          {step.metadata?.filesGenerated && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {step.metadata.filesGenerated.map((f: string) => (
                                <code
                                  key={f}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted"
                                >
                                  {f}
                                </code>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {runDetails.filesCreated && runDetails.filesCreated.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Files
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {runDetails.filesCreated.map((f: string) => (
                          <code
                            key={f}
                            className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {f}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Repo Picker ── */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Target Repository
        </h4>
        {repoError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-3">
            {repoError}
          </div>
        )}
        {loadingRepos ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading repositories...
          </div>
        ) : repos.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No repositories found. Connect GitHub in Settings → Integrations.
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a repository...</option>
              {repos.map((r) => (
                <option key={r.fullName} value={r.fullName}>
                  {r.fullName}
                </option>
              ))}
            </select>
            {selectedRepo && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-medium">All commits go to this single repository</p>
                    <p className="mt-0.5 text-amber-700/80">
                      Code changes will be committed to{' '}
                      <code className="font-mono text-amber-900">{selectedRepo}</code>. Make sure
                      this is the repo you want the agent to push to.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Simulation Preview */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Preview Simulation
          </h4>
          <button
            onClick={runSimulation}
            disabled={simulating || readyTickets.length === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40"
          >
            {simulating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Rocket className="h-3 w-3" />
            )}
            {simulating ? 'Simulating...' : 'Preview'}
          </button>
        </div>
        {result && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">{result.plan}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Branch base: {result.branchBase}</span>
              <span>Est. cost: {result.totalCost}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This is a simulation only — no code is generated.
            </p>
          </div>
        )}
        {!result && !simulating && (
          <p className="text-xs text-muted-foreground">
            Click Preview to simulate what the agent would build without making any API calls.
          </p>
        )}
      </div>

      {/* ── Ticket Selection Dialog ── */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select tickets to build</DialogTitle>
            <DialogDescription>
              Choose which tickets the FrontendAgent should build. Only tickets in{' '}
              <strong>In Progress</strong> or <strong>Done</strong> are selectable.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 max-h-[60vh] overflow-y-auto space-y-2">
            {projectTickets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tickets in this project yet.
              </p>
            )}
            {projectTickets.map((ticket) => {
              const isReady = ticket.status === 'in_progress' || ticket.status === 'done';
              const isSelected = selectedTicketIds.has(ticket.id);
              return (
                <div
                  key={ticket.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    isReady
                      ? 'border-border bg-background hover:bg-muted/40 cursor-pointer'
                      : 'border-border/40 bg-muted/20 opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (!isReady) return;
                    setSelectedTicketIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(ticket.id)) next.delete(ticket.id);
                      else next.add(ticket.id);
                      return next;
                    });
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    <Checkbox checked={isSelected} disabled={!isReady} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                          ticket.status === 'done'
                            ? 'bg-emerald-100 text-emerald-700'
                            : ticket.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-700'
                              : ticket.status === 'blocked'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        #{ticket.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="mt-4">
            <button
              onClick={() => setTicketDialogOpen(false)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <CheckCircle className="h-4 w-4" />
              Done ({selectedTickets.length} selected)
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
