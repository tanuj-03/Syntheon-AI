'use client';

import { useEffect, useMemo, useState } from 'react';
import { stripHtml } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  Video,
} from 'lucide-react';
import { ManualTicketDialog } from '@/components/manual-ticket-dialog';
import { AssigneePicker, type AssigneeValue } from '@/components/assignee-picker';
import { TicketDependencyPanel } from '@/components/ticket-dependency-panel';
import { DependencyBlockerModal } from '@/components/dependency-blocker-modal';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'in_progress' | 'done' | 'blocked';
  assignee?: string | null;
  assignee_user_id?: string | null;
  projectId?: string | null;
  meeting_id: string;
}

interface Meeting {
  id: string;
  projectName: string;
  projectId?: string;
  deployUrl?: string;
  date?: string;
  updatedAt?: string;
}

interface Project {
  id: string;
  name: string;
  meetings: string[];
  files: string[];
  context: string;
}

interface TicketDetailProps {
  meetingId: string;
  onSelectMeeting: (meetingId: string) => void;
  onDeleteMeeting?: (meetingId: string) => Promise<void> | void;
}

export function TicketDetail({ meetingId, onSelectMeeting, onDeleteMeeting }: TicketDetailProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingTitle, setMeetingTitle] = useState('Meeting');
  const [meetingData, setMeetingData] = useState<Meeting | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [shipResult, setShipResult] = useState<{
    status: 'idle' | 'planning' | 'planned' | 'executing' | 'done' | 'error';
    plan?: any;
    featureRequest?: string;
    issue?: any;
    pullRequest?: any;
    committedFiles?: string[];
    error?: string;
  }>({ status: 'idle' });
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerModalData, setBlockerModalData] = useState<{
    message: string;
    blockers: Array<{ id: string; depends_on: string; type: string; title?: string }>;
    isHardBlock: boolean;
    onRevert: () => void;
    onProceed?: () => void;
  } | null>(null);
  const [isManualTicketOpen, setIsManualTicketOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [ticketEditForm, setTicketEditForm] = useState<{
    title: string;
    description: string;
    assignee: AssigneeValue | null;
    status: Ticket['status'];
  }>({
    title: '',
    description: '',
    assignee: null,
    status: 'backlog',
  });
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
    fetchMeetingData();
  }, [meetingId]);

  useEffect(() => {
    if (shipResult.status !== 'done') return;
    if (meetingData?.deployUrl) return;
    const interval = setInterval(fetchMeetingData, 10000);
    return () => clearInterval(interval);
  }, [shipResult.status, meetingData?.deployUrl]);

  useEffect(() => {
    if (meetingData?.projectId) fetchProject(meetingData.projectId);
  }, [meetingData?.projectId]);

  async function fetchTickets() {
    try {
      setLoading(true);
      const res = await fetch(`/api/meetings/${meetingId}/tickets`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      console.error('Could not load tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMeeting() {
    if (!meetingToDelete || !onDeleteMeeting) return;
    await onDeleteMeeting(meetingToDelete);
    setMeetingToDelete(null);
  }

  async function fetchMeetingData() {
    try {
      const res = await fetch('/api/meetings');
      if (!res.ok) return;
      const data = await res.json();
      const meeting = data.find((m: any) => m.id === meetingId);
      if (meeting) {
        setMeetingTitle(meeting.projectName);
        setMeetingData(meeting);
      }
    } catch {}
  }

  async function fetchProject(projectId: string) {
    try {
      const res = await fetch(`/api/projects?meetingId=${meetingId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data) setProject(data);
    } catch {}
  }

  function openTicketEditor(ticket: Ticket) {
    setTicketToEdit(ticket);
    setTicketEditForm({
      title: ticket.title,
      description: ticket.description || '',
      assignee:
        ticket.assignee_user_id && ticket.assignee
          ? { userId: ticket.assignee_user_id, displayName: ticket.assignee }
          : null,
      status: ticket.status,
    });
  }

  async function handleSaveTicketEdit() {
    if (!ticketToEdit) return;

    setSavingTicketId(ticketToEdit.id);
    try {
      let res = await fetch(`/api/tickets/${ticketToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticketEditForm.title.trim(),
          description: ticketEditForm.description.trim(),
          assignee: ticketEditForm.assignee?.displayName ?? null,
          assigneeUserId: ticketEditForm.assignee?.userId ?? null,
          status: ticketEditForm.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        if (res.status === 422 && data?.error === 'soft_blocked') {
          const blockersWithTitles = (data?.blockers || []).map((b: any) => ({
            ...b,
            title: tickets.find((t) => t.id === b.depends_on)?.title,
          }));
          setBlockerModalData({
            message: data?.message || 'This move has unresolved soft dependencies.',
            blockers: blockersWithTitles,
            isHardBlock: false,
            onRevert: () => {
              setBlockerModalOpen(false);
              setTicketEditForm((prev) => ({ ...prev, status: ticketToEdit.status }));
            },
            onProceed: async () => {
              setBlockerModalOpen(false);
              const bypassRes = await fetch(`/api/tickets/${ticketToEdit.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: ticketEditForm.title.trim(),
                  description: ticketEditForm.description.trim(),
                  assignee: ticketEditForm.assignee?.displayName ?? null,
                  assigneeUserId: ticketEditForm.assignee?.userId ?? null,
                  status: ticketEditForm.status,
                  bypassGate: true,
                }),
              });
              if (bypassRes.ok) {
                setRefreshKey(Date.now());
              } else if (bypassRes.status === 422) {
                const errData = await bypassRes.json().catch(() => ({}));
                const bwt = (errData?.blockers || []).map((b: any) => ({
                  ...b,
                  title: tickets.find((t) => t.id === b.depends_on)?.title,
                }));
                setBlockerModalData({
                  message: errData?.message || 'Blocked by unresolved hard dependencies.',
                  blockers: bwt,
                  isHardBlock: true,
                  onRevert: () => {
                    setBlockerModalOpen(false);
                    setTicketEditForm((prev) => ({ ...prev, status: ticketToEdit.status }));
                  },
                });
                setBlockerModalOpen(true);
              }
            },
          });
          setBlockerModalOpen(true);
          return;
        }

        if (!res.ok) {
          const finalData = await res.json().catch(() => data || {});
          if (res.status === 422 && finalData?.error === 'hard_blocked') {
            const blockersWithTitles = (finalData?.blockers || []).map((b: any) => ({
              ...b,
              title: tickets.find((t) => t.id === b.depends_on)?.title,
            }));
            setBlockerModalData({
              message: finalData?.message || 'Blocked by unresolved hard dependencies.',
              blockers: blockersWithTitles,
              isHardBlock: true,
              onRevert: () => {
                setBlockerModalOpen(false);
                setTicketEditForm((prev) => ({ ...prev, status: ticketToEdit.status }));
              },
            });
            setBlockerModalOpen(true);
            return;
          }
          if (res.status === 422 && finalData?.error === 'soft_blocked') {
            const blockersWithTitles = (finalData?.blockers || []).map((b: any) => ({
              ...b,
              title: tickets.find((t) => t.id === b.depends_on)?.title,
            }));
            setBlockerModalData({
              message: finalData?.message || 'Blocked by unresolved soft dependencies.',
              blockers: blockersWithTitles,
              isHardBlock: false,
              onRevert: () => {
                setBlockerModalOpen(false);
                setTicketEditForm((prev) => ({ ...prev, status: ticketToEdit.status }));
              },
              onProceed: async () => {
                setBlockerModalOpen(false);
                const bypassRes = await fetch(`/api/tickets/${ticketToEdit.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: ticketEditForm.title.trim(),
                    description: ticketEditForm.description.trim(),
                    assignee: ticketEditForm.assignee?.displayName ?? null,
                    assigneeUserId: ticketEditForm.assignee?.userId ?? null,
                    status: ticketEditForm.status,
                    bypassGate: true,
                  }),
                });
                if (bypassRes.ok) {
                  setRefreshKey(Date.now());
                } else if (bypassRes.status === 422) {
                  const errData = await bypassRes.json().catch(() => ({}));
                  const bwt = (errData?.blockers || []).map((b: any) => ({
                    ...b,
                    title: tickets.find((t) => t.id === b.depends_on)?.title,
                  }));
                  setBlockerModalData({
                    message: errData?.message || 'Blocked by unresolved hard dependencies.',
                    blockers: bwt,
                    isHardBlock: true,
                    onRevert: () => {
                      setBlockerModalOpen(false);
                      setTicketEditForm((prev) => ({ ...prev, status: ticketToEdit.status }));
                    },
                  });
                  setBlockerModalOpen(true);
                }
              },
            });
            setBlockerModalOpen(true);
            return;
          }
          throw new Error(finalData?.error || 'Failed to update ticket');
        }
      }

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketToEdit.id
            ? {
                ...ticket,
                title: ticketEditForm.title.trim(),
                description: ticketEditForm.description.trim(),
                assignee: ticketEditForm.assignee?.displayName ?? null,
                assignee_user_id: ticketEditForm.assignee?.userId ?? null,
                status: ticketEditForm.status,
              }
            : ticket
        )
      );
      setTicketToEdit(null);
    } finally {
      setSavingTicketId(null);
    }
  }

  async function handleDeleteTicket() {
    if (!ticketToDelete) return;
    setSavingTicketId(ticketToDelete);

    try {
      const res = await fetch(`/api/tickets/${ticketToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ticket');

      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketToDelete));
      setTicketToDelete(null);
    } finally {
      setSavingTicketId(null);
    }
  }

  const readyTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === 'in_progress' || ticket.status === 'done'),
    [tickets]
  );

  async function handleApproveAndShip() {
    if (readyTickets.length === 0) return;
    setShipResult({ status: 'planning' });

    try {
      const planRes = await fetch('/api/ship/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickets: readyTickets,
          meetingTitle,
          projectId: project?.id ?? meetingData?.projectId,
          notes: {},
        }),
      });

      const planData = await planRes.json();
      if (!planData.success) throw new Error(planData.error);

      setShipResult({
        status: 'planned',
        plan: planData.plan,
        featureRequest: planData.featureRequest,
      });
    } catch (error) {
      setShipResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate plan',
      });
    }
  }

  async function handleExecute() {
    if (!shipResult.plan) return;
    setShipResult((prev) => ({ ...prev, status: 'executing' }));

    try {
      const execRes = await fetch('/api/ship/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureRequest: shipResult.featureRequest,
          plan: shipResult.plan,
          meetingId,
          projectId: project?.id ?? meetingData?.projectId,
          tickets: readyTickets,
          meetingTitle,
          isFollowUp: !!(project?.id ?? meetingData?.projectId),
        }),
      });

      const execData = await execRes.json();
      if (!execData.success) throw new Error(execData.error);

      setShipResult((prev) => ({
        ...prev,
        status: 'done',
        issue: execData.issue,
        pullRequest: execData.pullRequest,
        committedFiles: execData.committedFiles,
      }));

      fetchMeetingData();
    } catch (error) {
      setShipResult((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to execute',
      }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
        <span className="text-muted-foreground">Loading tickets...</span>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-4xl font-playfair font-bold text-foreground mb-2">{meetingTitle}</h1>
        <div className="bg-card rounded-2xl p-12 border border-border text-center mt-8">
          <p className="text-2xl font-playfair font-bold mb-2">No tickets yet</p>
          <p className="text-muted-foreground">This meeting has not produced any tickets yet.</p>
        </div>
      </div>
    );
  }

  const shippedCount = shipResult.status === 'done' ? readyTickets.length : 0;
  const blockedCount = tickets.filter((ticket) => ticket.status === 'blocked').length;
  const isFollowUp = !!(project?.id ?? meetingData?.projectId);

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-2 gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-playfair font-bold text-foreground">{meetingTitle}</h1>
          {isFollowUp && (
            <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium mt-3 inline-flex">
              Follow-up meeting
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsManualTicketOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New ticket
          </button>
          {onDeleteMeeting && (
            <button
              onClick={() => setMeetingToDelete(meetingId)}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete meeting
            </button>
          )}
        </div>
      </div>

      {project && (
        <p className="text-sm text-muted-foreground mb-1">
          Project: <span className="text-foreground font-medium">{project.name}</span>
          <span className="mx-2">-</span>
          {project.meetings.length} meeting{project.meetings.length > 1 ? 's' : ''}
          <span className="mx-2">-</span>
          {project.files.length} files in repo
        </p>
      )}

      <p className="text-muted-foreground mb-8">
        {tickets.length} tickets extracted - {readyTickets.length} ready to ship
      </p>

      {meetingData?.deployUrl && (
        <div className="mb-8 bg-card rounded-2xl border border-primary/30 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <p className="font-medium text-foreground">Live Preview</p>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                Deployed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={meetingData.deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setRefreshKey(Date.now())}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
          <iframe
            key={refreshKey}
            src={`${meetingData.deployUrl}?v=${refreshKey}`}
            className="w-full h-[500px]"
            title="Live App Preview"
          />
        </div>
      )}

      <div className="space-y-4 mb-8">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-card rounded-2xl p-6 border border-border transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-lg font-playfair font-bold text-foreground">
                    {ticket.title}
                  </h3>
                  <Badge
                    className={
                      ticket.status === 'backlog'
                        ? 'bg-muted text-muted-foreground'
                        : ticket.status === 'in_progress'
                          ? 'bg-primary/20 text-primary'
                          : ticket.status === 'blocked'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-green-100 text-green-800'
                    }
                  >
                    {ticket.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-6">
                  {ticket.description ? stripHtml(ticket.description) : 'No description provided.'}
                </p>
              </div>
              {savingTicketId === ticket.id && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              {savingTicketId !== ticket.id && (
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTicketEditor(ticket)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Update
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <p className="uppercase tracking-wide">Status</p>
                <p className="mt-1 text-sm text-foreground">{ticket.status.replace('_', ' ')}</p>
              </div>

              <div className="text-xs text-muted-foreground">
                <p className="uppercase tracking-wide">Assignee</p>
                <p className="mt-1 text-sm text-foreground">
                  {ticket.assignee ? `@${ticket.assignee}` : 'Unassigned'}
                </p>
              </div>

              <div className="flex items-end justify-between gap-2 text-xs text-muted-foreground md:justify-end">
                <div>
                  <p className="uppercase tracking-wide">Meeting</p>
                  <button
                    onClick={() => onSelectMeeting(ticket.meeting_id)}
                    className="mt-1 text-primary hover:underline font-medium"
                  >
                    Open meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border sticky bottom-6 shadow-lg">
        {shipResult.status === 'planned' && shipResult.plan && (
          <div className="mb-4 bg-background rounded-xl p-4 border border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              {isFollowUp ? 'Follow-up Plan Preview' : 'Plan Preview'}
            </p>
            <p className="text-sm font-medium mb-2">
              Branch: <code className="text-primary">{shipResult.plan.branch_name}</code>
            </p>
          </div>
        )}

        {shipResult.status === 'done' && (
          <div className="mb-4 bg-primary/5 rounded-xl p-4 border border-primary/20">
            <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Shipped</p>
            <div className="flex gap-4 flex-wrap">
              {shipResult.issue && (
                <a
                  href={shipResult.issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  Issue #{shipResult.issue.number} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {shipResult.pullRequest && (
                <a
                  href={shipResult.pullRequest.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  PR #{shipResult.pullRequest.number} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {shipResult.status === 'error' && (
          <div className="mb-4 bg-destructive/5 rounded-xl p-3 border border-destructive/20">
            <p className="text-sm text-destructive">{shipResult.error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {readyTickets.length > 0
              ? `${readyTickets.length} ticket${readyTickets.length > 1 ? 's' : ''} ready to ship`
              : 'Move tickets to in progress or done to ship'}
          </p>

          <div className="flex gap-3 flex-wrap">
            {shipResult.status === 'idle' && (
              <button
                onClick={handleApproveAndShip}
                disabled={readyTickets.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Rocket className="w-4 h-4" />
                {isFollowUp ? 'Ship Changes' : 'Approve and Ship'}
              </button>
            )}

            {shipResult.status === 'planning' && (
              <button
                disabled
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground opacity-70"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Plan...
              </button>
            )}

            {shipResult.status === 'planned' && (
              <button
                onClick={handleExecute}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                <Rocket className="w-4 h-4" />
                Execute Plan
              </button>
            )}

            {shipResult.status === 'executing' && (
              <button
                disabled
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground opacity-70"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </button>
            )}

            {shipResult.status === 'done' && (
              <button
                disabled
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground opacity-70"
              >
                <CheckCircle className="w-4 h-4" />
                Shipped
              </button>
            )}

            {shipResult.status === 'error' && (
              <button
                onClick={handleApproveAndShip}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                <Rocket className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{tickets.length} total tickets</span>
          <span>{blockedCount} blocked</span>
        </div>

        <ManualTicketDialog
          open={isManualTicketOpen}
          onOpenChange={setIsManualTicketOpen}
          meetings={[{ id: meetingId, projectName: meetingTitle }]}
          defaultMeetingId={meetingId}
          onCreated={fetchTickets}
        />
      </div>

      <Dialog
        open={Boolean(ticketToEdit)}
        onOpenChange={(open) => {
          if (!open) setTicketToEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              Update ticket
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Edit title, description, assignee, and status before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="block text-sm text-muted-foreground">
              Name
              <input
                value={ticketEditForm.title}
                onChange={(e) =>
                  setTicketEditForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Ticket title"
              />
            </label>

            <label className="block text-sm text-muted-foreground">
              Description
              <textarea
                value={ticketEditForm.description}
                onChange={(e) =>
                  setTicketEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Describe the ticket"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm text-muted-foreground">
                Assignee
                <div className="mt-1">
                  <AssigneePicker
                    value={ticketEditForm.assignee}
                    onChange={(val) => setTicketEditForm((prev) => ({ ...prev, assignee: val }))}
                  />
                </div>
              </label>

              <label className="block text-sm text-muted-foreground">
                Status
                <select
                  value={ticketEditForm.status}
                  onChange={(e) =>
                    setTicketEditForm((prev) => ({
                      ...prev,
                      status: e.target.value as Ticket['status'],
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </label>
            </div>

            {ticketToEdit && (
              <div className="border-t border-border/60 pt-4">
                <TicketDependencyPanel
                  ticketId={ticketToEdit.id}
                  projectId={ticketToEdit.projectId ?? meetingData?.projectId}
                  projectTickets={tickets.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                  }))}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!ticketToEdit) return;
                setTicketToDelete(ticketToEdit.id);
                setTicketToEdit(null);
              }}
              className="rounded-full"
              disabled={Boolean(savingTicketId)}
            >
              Delete ticket
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTicketToEdit(null)}
              className="rounded-full"
              disabled={Boolean(savingTicketId)}
            >
              Discard changes
            </Button>
            <Button
              type="button"
              onClick={handleSaveTicketEdit}
              className="rounded-full"
              disabled={Boolean(savingTicketId) || ticketEditForm.title.trim().length === 0}
            >
              Confirm changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(ticketToDelete)}
        onOpenChange={(open) => {
          if (!open) setTicketToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-xl border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              Delete this ticket?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently remove the ticket from the workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTicketToDelete(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteTicket}
              className="rounded-full"
            >
              Delete ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(meetingToDelete)}
        onOpenChange={(open) => {
          if (!open) setMeetingToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-xl border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              Delete this meeting?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will remove the meeting from Supabase and unlink its tickets from the meeting.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMeetingToDelete(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteMeeting}
              className="rounded-full"
            >
              Delete meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {blockerModalData && (
        <DependencyBlockerModal
          isOpen={blockerModalOpen}
          onClose={() => setBlockerModalOpen(false)}
          onGoToTicket={(ticketId) => {
            setBlockerModalOpen(false);
            const t = tickets.find((tk) => tk.id === ticketId);
            if (t) setTicketToEdit(t);
          }}
          onRevert={blockerModalData.onRevert}
          onProceed={blockerModalData.onProceed}
          message={blockerModalData.message}
          blockers={blockerModalData.blockers}
          isHardBlock={blockerModalData.isHardBlock}
        />
      )}
    </div>
  );
}
