'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { stripHtml } from '@/lib/utils';
import { AssigneePicker, type AssigneeValue } from '@/components/assignee-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ManualTicketDialog } from '@/components/manual-ticket-dialog';
import { TicketDependencyPanel } from '@/components/ticket-dependency-panel';
import { TicketDependencyGraph } from '@/components/ticket-dependency-graph';
import { TicketAttachmentsPanel } from '@/components/ticket-attachments-panel';
import { TicketCommentsPanel } from '@/components/ticket-comments-panel';
import { TicketActivityPanel } from '@/components/ticket-activity-panel';
import { TicketTimelinePanel } from '@/components/ticket-timeline-panel';
import { DateRangePicker } from '@/components/date-range-picker';
import { DependencyBlockerModal } from '@/components/dependency-blocker-modal';
import { TipTapEditor } from '@/components/tiptap-editor';
import { MentionEditor } from '@/components/mention-editor';
import { useToast } from '@/components/island-toast';
import { ProjectTicketImportDialog } from '@/components/project-ticket-import-dialog';
import { ProjectMeetingDialog } from '@/components/project-meeting-dialog';
import { SwarmNetBuildPanel } from '@/components/swarmnet-build-panel';
import {
  FolderKanban,
  Plus,
  Video,
  Ticket,
  ArrowRight,
  Sparkles,
  Download,
  Pencil,
  Trash2,
  GitBranch,
  Calendar,
  LayoutList,
  KanbanSquare,
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronLeft,
  SlidersHorizontal,
  PlusCircle,
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  Users,
  UserMinus,
  Rocket,
  Settings,
} from 'lucide-react';

type ProjectTab =
  | 'meetings'
  | 'tickets'
  | 'list'
  | 'kanban'
  | 'analytics'
  | 'dependencies'
  | 'members'
  | 'build'
  | 'settings';

interface Project {
  id: string;
  name: string;
  repo: string;
  deployUrl?: string | null;
  branchBase?: string | null;
  meetings: string[];
  ticketIds: string[];
  files: string[];
  context: string;
  updatedAt?: string;
}

interface Meeting {
  id: string;
  projectName: string;
  meetingId: string;
  specsDetected: number;
  projectId?: string | null;
  status: 'completed' | 'processing' | 'failed' | 'not_admitted';
  date: string;
  platform: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'in_progress' | 'done' | 'blocked';
  assignee?: string | null;
  assignee_user_id?: string | null;
  projectId?: string | null;
  meeting_id: string | null;
  dependency_ticket_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  deadline_time?: string | null;
}

type StageConfig = {
  id: string;
  label: string;
  color: string;
  status: Ticket['status'];
};

const DEFAULT_STAGES: StageConfig[] = [
  { id: 'stage-backlog', label: 'Backlog', color: '#8a8a80', status: 'backlog' },
  { id: 'stage-progress', label: 'In Progress', color: '#3d7abf', status: 'in_progress' },
  { id: 'stage-done', label: 'Done', color: '#3d8a5e', status: 'done' },
  { id: 'stage-blocked', label: 'Blocked', color: '#b84040', status: 'blocked' },
];

interface ProjectsWorkspaceProps {
  projects: Project[];
  meetings: Meeting[];
  tickets: Ticket[];
  selectedProjectId: string | null;
  preferredTab?: ProjectTab | null;
  onTabChange?: (tab: ProjectTab) => void;
  onSelectProject: (projectId: string) => void;
  onSelectMeeting: (meetingId: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
}

export function ProjectsWorkspace({
  projects,
  meetings,
  tickets,
  selectedProjectId,
  preferredTab,
  onTabChange,
  onSelectProject,
  onSelectMeeting,
  onCreateProject,
  onDeleteProject,
  onRefresh,
}: ProjectsWorkspaceProps) {
  const { membership, memberships, invitations } = useOrganization({
    memberships: { infinite: true, pageSize: 50 },
    invitations: { infinite: true, pageSize: 50 },
  });
  const { user } = useUser();
  const isAdmin = membership?.role === 'org:admin';
  const [kanbanAssigneeFilter, setKanbanAssigneeFilter] = useState<'all' | 'unassigned' | 'mine'>(
    'all'
  );
  const [projectTab, setProjectTab] = useState<ProjectTab>('kanban');

  interface ProjectMemberRow {
    id: string;
    project_id: string;
    user_id: string;
    role: 'admin' | 'member';
  }
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [projectMembersLoading, setProjectMembersLoading] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [removingProjectMemberId, setRemovingProjectMemberId] = useState<string | null>(null);

  const fetchProjectMembers = useCallback(async (projectId: string) => {
    setProjectMembersLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) setProjectMembers(await res.json());
    } finally {
      setProjectMembersLoading(false);
    }
  }, []);

  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isRenameProjectOpen, setIsRenameProjectOpen] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [projectDeployUrlDraft, setProjectDeployUrlDraft] = useState('');
  const [projectBranchBaseDraft, setProjectBranchBaseDraft] = useState('main');
  const [projectContextDraft, setProjectContextDraft] = useState('');
  const [savingProjectSettings, setSavingProjectSettings] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deleteMode, setDeleteMode] = useState<'confirm' | 'reassign' | null>(null);
  const [subtaskReassignTargetId, setSubtaskReassignTargetId] = useState<string>('');
  const [ticketToEdit, setTicketToEdit] = useState<Ticket | null>(null);
  const [ticketEditorHistory, setTicketEditorHistory] = useState<Ticket[]>([]);
  const [ticketEditForm, setTicketEditForm] = useState<{
    title: string;
    description: string;
    assignee: AssigneeValue | null;
    status: Ticket['status'];
    start_date: string;
    due_date: string;
    deadline_time: string;
  }>({
    title: '',
    description: '',
    assignee: null,
    status: 'backlog',
    start_date: '',
    due_date: '',
    deadline_time: '',
  });
  const [stages, setStages] = useState<StageConfig[]>(DEFAULT_STAGES);
  const [ticketStageMap, setTicketStageMap] = useState<Record<string, string>>({});
  const [hydratedProjectId, setHydratedProjectId] = useState<string | null>(null);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [stageForm, setStageForm] = useState<{
    id: string | null;
    label: string;
    color: string;
  }>({
    id: null,
    label: '',
    color: '#64748b',
  });
  const [stageToDelete, setStageToDelete] = useState<StageConfig | null>(null);
  const [isDeleteStageDialogOpen, setIsDeleteStageDialogOpen] = useState(false);
  const [relocateStageId, setRelocateStageId] = useState<string>('');
  const [isRelocateStageDialogOpen, setIsRelocateStageDialogOpen] = useState(false);
  const [expandedTicketIds, setExpandedTicketIds] = useState<Record<string, boolean>>({});
  const [newChildDraft, setNewChildDraft] = useState({ title: '' });
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [subtasksPopupTicket, setSubtasksPopupTicket] = useState<Ticket | null>(null);
  const [ticketEditTab, setTicketEditTab] = useState<
    'details' | 'attachments' | 'comments' | 'activity' | 'timeline'
  >('details');

  // Dependency blocker modal state
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerModalData, setBlockerModalData] = useState<{
    message: string;
    blockers: Array<{ id: string; depends_on: string; type: string; title?: string }>;
    isHardBlock: boolean;
    onRevert: () => void;
    onProceed?: () => void;
  } | null>(null);

  const { showToast } = useToast();

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (selectedProject) {
      setProjectNameDraft(selectedProject.name);
      setProjectDeployUrlDraft(selectedProject.deployUrl || '');
      setProjectBranchBaseDraft(selectedProject.branchBase || 'main');
      setProjectContextDraft(selectedProject.context || '');
    }
  }, [selectedProject?.id]);

  const projectMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.projectId === selectedProject?.id),
    [meetings, selectedProject?.id]
  );

  const projectTickets = useMemo(
    () => tickets.filter((ticket) => ticket.projectId === selectedProject?.id),
    [tickets, selectedProject?.id]
  );

  const rootProjectTickets = useMemo(() => {
    const base = projectTickets.filter((ticket) => !ticket.dependency_ticket_id);
    if (kanbanAssigneeFilter === 'unassigned') return base.filter((t) => !t.assignee_user_id);
    if (kanbanAssigneeFilter === 'mine') return base.filter((t) => t.assignee_user_id === user?.id);
    return base;
  }, [projectTickets, kanbanAssigneeFilter, user?.id]);

  const totalTickets = projectTickets.length;

  const childrenByParentId = useMemo(() => {
    const grouped: Record<string, Ticket[]> = {};
    for (const ticket of projectTickets) {
      if (!ticket.dependency_ticket_id) continue;
      if (!grouped[ticket.dependency_ticket_id]) grouped[ticket.dependency_ticket_id] = [];
      grouped[ticket.dependency_ticket_id].push(ticket);
    }
    return grouped;
  }, [projectTickets]);

  const findStageByStatus = useCallback(
    (status: Ticket['status']) => stages.find((stage) => stage.status === status) ?? stages[0],
    [stages]
  );

  const resolveTicketStage = useCallback(
    (ticket: Ticket) => {
      const mapped = ticketStageMap[ticket.id];
      if (mapped) {
        const stage = stages.find((entry) => entry.id === mapped);
        if (stage) return stage;
      }
      return findStageByStatus(ticket.status);
    },
    [findStageByStatus, stages, ticketStageMap]
  );

  useEffect(() => {
    if (!selectedProject?.id) return;
    if (typeof window === 'undefined') return;
    setHydratedProjectId(null);

    const storedStages = window.localStorage.getItem(`project-stages:${selectedProject.id}`);
    const storedMap = window.localStorage.getItem(`project-stage-map:${selectedProject.id}`);

    if (storedStages) {
      try {
        const parsed = JSON.parse(storedStages) as StageConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStages(parsed);
        } else {
          setStages(DEFAULT_STAGES);
        }
      } catch {
        setStages(DEFAULT_STAGES);
      }
    } else {
      setStages(DEFAULT_STAGES);
    }

    if (storedMap) {
      try {
        const parsed = JSON.parse(storedMap) as Record<string, string>;
        setTicketStageMap(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        setTicketStageMap({});
      }
    } else {
      setTicketStageMap({});
    }

    setHydratedProjectId(selectedProject.id);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    if (hydratedProjectId !== selectedProject.id) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`project-stages:${selectedProject.id}`, JSON.stringify(stages));
  }, [hydratedProjectId, selectedProject?.id, stages]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    if (hydratedProjectId !== selectedProject.id) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `project-stage-map:${selectedProject.id}`,
      JSON.stringify(ticketStageMap)
    );
  }, [hydratedProjectId, selectedProject?.id, ticketStageMap]);

  useEffect(() => {
    setTicketStageMap((prev) => {
      const validTicketIds = new Set(projectTickets.map((ticket) => ticket.id));
      const validStageIds = new Set(stages.map((stage) => stage.id));
      const next: Record<string, string> = {};

      for (const [ticketId, stageId] of Object.entries(prev)) {
        if (!validTicketIds.has(ticketId)) continue;
        if (!validStageIds.has(stageId)) continue;
        next[ticketId] = stageId;
      }

      const changed =
        Object.keys(next).length !== Object.keys(prev).length ||
        Object.entries(next).some(([ticketId, stageId]) => prev[ticketId] !== stageId);

      return changed ? next : prev;
    });
  }, [projectTickets, stages]);

  function toggleExpanded(ticketId: string) {
    setExpandedTicketIds((prev) => ({ ...prev, [ticketId]: !prev[ticketId] }));
  }

  async function handleCreateChildTicket() {
    if (!ticketToEdit || !selectedProject) return;
    if (!newChildDraft.title.trim()) return;

    setSavingTicketId(ticketToEdit.id);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newChildDraft.title.trim(),
          description: '',
          assignee: null,
          status: 'backlog',
          parentTicketId: ticketToEdit.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create child ticket');
      }

      setNewChildDraft({ title: '' });
      setIsAddingSubtask(false);
      setExpandedTicketIds((prev) => ({ ...prev, [ticketToEdit.id]: true }));
      await onRefresh();
      showToast('Subtask created', 'success');
    } finally {
      setSavingTicketId(null);
    }
  }

  async function handleConfirmRelocateStageDelete() {
    if (!stageToDelete) return;
    if (!relocateStageId) {
      window.alert('Please select a destination stage.');
      return;
    }

    setSavingTicketId(stageToDelete.id);
    try {
      await removeStageKeepTickets(stageToDelete.id, relocateStageId);
      setIsRelocateStageDialogOpen(false);
      setStageToDelete(null);
      setRelocateStageId('');
      showToast('Stage deleted', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete stage';
      window.alert(message);
    } finally {
      setSavingTicketId(null);
    }
  }

  async function moveTicketToStage(ticketId: string, stage: StageConfig, skipRefresh = false) {
    const ticket = projectTickets.find((entry) => entry.id === ticketId);
    if (!ticket) return;

    let moved = true;
    if (ticket.status !== stage.status) {
      let res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: stage.status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data?.error === 'hard_blocked') {
          // Show blocker modal instead of alert
          const blockersWithTitles = (data?.blockers || []).map((b: any) => ({
            ...b,
            title: projectTickets.find((t) => t.id === b.depends_on)?.title,
          }));
          setBlockerModalData({
            message: data?.message || 'Blocked by unresolved hard dependencies.',
            blockers: blockersWithTitles,
            isHardBlock: true,
            onRevert: () => {
              setBlockerModalOpen(false);
              // Reload to restore original state
              onRefresh?.();
            },
            onProceed: () => {
              setBlockerModalOpen(false);
            },
          });
          setBlockerModalOpen(true);
          moved = false;
        } else if (res.status === 422 && data?.error === 'soft_blocked') {
          const blockersWithTitles = (data?.blockers || []).map((b: any) => ({
            ...b,
            title: projectTickets.find((t) => t.id === b.depends_on)?.title,
          }));
          setBlockerModalData({
            message: data?.message || 'Unresolved soft dependencies.',
            blockers: blockersWithTitles,
            isHardBlock: false,
            onRevert: () => {
              setBlockerModalOpen(false);
              onRefresh?.();
            },
            onProceed: async () => {
              setBlockerModalOpen(false);
              const bypassRes = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: stage.status, bypassGate: true }),
              });
              if (bypassRes.ok) {
                await onRefresh?.();
              } else if (bypassRes.status === 422) {
                const errData = await bypassRes.json().catch(() => ({}));
                const bwt = (errData?.blockers || []).map((b: any) => ({
                  ...b,
                  title: projectTickets.find((t) => t.id === b.depends_on)?.title,
                }));
                setBlockerModalData({
                  message: errData?.message || 'Blocked by unresolved hard dependencies.',
                  blockers: bwt,
                  isHardBlock: true,
                  onRevert: () => {
                    setBlockerModalOpen(false);
                    onRefresh?.();
                  },
                });
                setBlockerModalOpen(true);
              }
            },
          });
          setBlockerModalOpen(true);
          moved = false;
        } else {
          moved = false;
        }
      }
    }

    if (!moved) return;

    setTicketStageMap((prev) => ({
      ...prev,
      [ticketId]: stage.id,
    }));

    if (!skipRefresh) {
      await onRefresh();
    }
  }

  function openAddStageDialog() {
    setStageForm({
      id: null,
      label: '',
      color: '#64748b',
    });
    setIsStageDialogOpen(true);
  }

  function openEditStageDialog(stage: StageConfig) {
    setStageForm({
      id: stage.id,
      label: stage.label,
      color: stage.color,
    });
    setIsStageDialogOpen(true);
  }

  function saveStageDetails() {
    const label = stageForm.label.trim();
    if (!label) return;

    if (stageForm.id) {
      setStages((prev) =>
        prev.map((stage) =>
          stage.id === stageForm.id
            ? {
                ...stage,
                label,
                color: stageForm.color,
              }
            : stage
        )
      );
    } else {
      setStages((prev) => [
        ...prev,
        {
          id: `stage-${Date.now().toString(36)}`,
          label,
          color: stageForm.color,
          status: 'backlog',
        },
      ]);
    }

    setIsStageDialogOpen(false);
  }

  function promptDeleteStage(stage: StageConfig) {
    const fallback = stages.find((entry) => entry.id !== stage.id);
    setRelocateStageId(fallback?.id ?? '');
    setIsRelocateStageDialogOpen(false);
    setStageToDelete(stage);
    setIsDeleteStageDialogOpen(true);
  }

  async function removeStageKeepTickets(stageId: string, targetStageId: string) {
    const stage = stages.find((entry) => entry.id === stageId);
    const fallback = stages.find((entry) => entry.id === targetStageId);
    if (!stage || !fallback || stages.length <= 1) return;
    if (stage.id === fallback.id) return;

    const ticketsInStage = projectTickets.filter(
      (ticket) => resolveTicketStage(ticket).id === stageId
    );
    for (const ticket of ticketsInStage) {
      await moveTicketToStage(ticket.id, fallback, true);
    }

    setStages((prev) => prev.filter((entry) => entry.id !== stageId));
    setTicketStageMap((prev) => {
      const next = { ...prev };
      for (const [ticketId, mappedStageId] of Object.entries(next)) {
        if (mappedStageId === stageId) next[ticketId] = fallback.id;
      }
      return next;
    });

    await onRefresh();
  }

  async function removeStageWithTickets(stageId: string) {
    const ticketsInStage = projectTickets.filter(
      (ticket) => resolveTicketStage(ticket).id === stageId
    );

    for (const ticket of ticketsInStage) {
      const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete stage tickets');
      }
    }

    setStages((prev) => prev.filter((entry) => entry.id !== stageId));
    setTicketStageMap((prev) => {
      const next = { ...prev };
      for (const ticket of ticketsInStage) {
        delete next[ticket.id];
      }
      return next;
    });

    await onRefresh();
  }

  async function handleDeleteStage(mode: 'keep_tickets' | 'delete_with_tickets') {
    if (!stageToDelete) return;

    if (mode === 'keep_tickets') {
      setIsDeleteStageDialogOpen(false);
      setIsRelocateStageDialogOpen(true);
      return;
    }

    setSavingTicketId(stageToDelete.id);
    try {
      await removeStageWithTickets(stageToDelete.id);
      setIsDeleteStageDialogOpen(false);
      setStageToDelete(null);
      setRelocateStageId('');
      showToast('Stage and tickets deleted', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete stage';
      setBlockerModalData({
        message,
        blockers: [],
        isHardBlock: false,
        onRevert: () => {
          setBlockerModalOpen(false);
        },
        onProceed: () => {
          setBlockerModalOpen(false);
        },
      });
      setBlockerModalOpen(true);
    } finally {
      setSavingTicketId(null);
    }
  }

  function moveStageByDrop(sourceStageId: string, targetStageId: string) {
    setStages((prev) => {
      const sourceIdx = prev.findIndex((stage) => stage.id === sourceStageId);
      const targetIdx = prev.findIndex((stage) => stage.id === targetStageId);
      if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return prev;

      const next = [...prev];
      const [stage] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, stage);
      return next;
    });
  }

  function openTicketEditor(ticket: Ticket, pushCurrent = false) {
    if (pushCurrent && ticketToEdit) {
      setTicketEditorHistory((prev) => [...prev, ticketToEdit]);
    } else {
      setTicketEditorHistory([]);
    }

    setTicketToEdit(ticket);
    setTicketEditForm({
      title: ticket.title,
      description: ticket.description || '',
      assignee:
        ticket.assignee_user_id && ticket.assignee
          ? { userId: ticket.assignee_user_id, displayName: ticket.assignee }
          : null,
      status: ticket.status,
      start_date: ticket.start_date || '',
      due_date: ticket.due_date || '',
      deadline_time: ticket.deadline_time || '',
    });
    setNewChildDraft({
      title: '',
    });
    setTicketEditTab('details');
    setIsAddingSubtask(false);
  }

  function goBackTicketEditor() {
    const previous = ticketEditorHistory[ticketEditorHistory.length - 1];
    if (!previous) return;

    setTicketEditorHistory((prev) => prev.slice(0, -1));
    setTicketToEdit(previous);
    setTicketEditForm({
      title: previous.title,
      description: previous.description || '',
      assignee:
        previous.assignee_user_id && previous.assignee
          ? { userId: previous.assignee_user_id, displayName: previous.assignee }
          : null,
      status: previous.status,
      start_date: previous.start_date || '',
      due_date: previous.due_date || '',
      deadline_time: previous.deadline_time || '',
    });
    setNewChildDraft({ title: '' });
    setTicketEditTab('details');
    setIsAddingSubtask(false);
  }

  function closeTicketEditor() {
    setTicketToEdit(null);
    setTicketEditorHistory([]);
    setIsAddingSubtask(false);
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
          start_date: ticketEditForm.start_date || null,
          due_date: ticketEditForm.due_date || null,
          deadline_time: ticketEditForm.deadline_time || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        if (res.status === 422 && data?.error === 'soft_blocked') {
          const blockersWithTitles = (data?.blockers || []).map((b: any) => ({
            ...b,
            title: projectTickets.find((t) => t.id === b.depends_on)?.title,
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
                  start_date: ticketEditForm.start_date || null,
                  due_date: ticketEditForm.due_date || null,
                  deadline_time: ticketEditForm.deadline_time || null,
                  bypassGate: true,
                }),
              });
              if (bypassRes.ok) {
                await onRefresh?.();
              } else if (bypassRes.status === 422) {
                const errData = await bypassRes.json().catch(() => ({}));
                const bwt = (errData?.blockers || []).map((b: any) => ({
                  ...b,
                  title: projectTickets.find((t) => t.id === b.depends_on)?.title,
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
          if (res.status === 422 && data?.error === 'hard_blocked') {
            const blockersWithTitles = (data?.blockers || []).map((b: any) => ({
              ...b,
              title: projectTickets.find((t) => t.id === b.depends_on)?.title,
            }));
            setBlockerModalData({
              message: data?.message || 'Blocked by unresolved hard dependencies.',
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
          if (res.status === 422 && data?.error === 'soft_blocked') {
            const blockersWithTitles = (data?.blockers || []).map((b: any) => ({
              ...b,
              title: projectTickets.find((t) => t.id === b.depends_on)?.title,
            }));
            setBlockerModalData({
              message: data?.message || 'Blocked by unresolved soft dependencies.',
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
                    start_date: ticketEditForm.start_date || null,
                    due_date: ticketEditForm.due_date || null,
                    deadline_time: ticketEditForm.deadline_time || null,
                    bypassGate: true,
                  }),
                });
                if (bypassRes.ok) {
                  await onRefresh?.();
                } else if (bypassRes.status === 422) {
                  const errData = await bypassRes.json().catch(() => ({}));
                  const bwt = (errData?.blockers || []).map((b: any) => ({
                    ...b,
                    title: projectTickets.find((t) => t.id === b.depends_on)?.title,
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
          console.error('Ticket update failed:', data);
          showToast(data?.error || `Save failed (${res.status})`, 'error');
          return;
        }
      }

      const matchingStage =
        stages.find((stage) => stage.status === ticketEditForm.status) ?? stages[0];
      if (matchingStage) {
        setTicketStageMap((prev) => ({
          ...prev,
          [ticketToEdit.id]: matchingStage.id,
        }));
      }

      const isSubtask = Boolean(ticketToEdit.dependency_ticket_id);
      if (!isSubtask) {
        closeTicketEditor();
      }
      await onRefresh();
      showToast('Ticket saved successfully', 'success');
    } finally {
      setSavingTicketId(null);
    }
  }

  function promptDeleteTicket(ticket: Ticket) {
    const subtasks = childrenByParentId[ticket.id] ?? [];
    setTicketToDelete(ticket);
    setDeleteMode(subtasks.length > 0 ? 'confirm' : null);
    setSubtaskReassignTargetId('');
  }

  async function handleDeleteTicket(mode: 'delete_all' | 'reassign' | 'simple') {
    if (!ticketToDelete) return;

    setSavingTicketId(ticketToDelete.id);
    try {
      const subtasks = childrenByParentId[ticketToDelete.id] ?? [];

      if (mode === 'reassign' && subtaskReassignTargetId) {
        // Re-parent all subtasks to the chosen ticket
        await Promise.all(
          subtasks.map((child) =>
            fetch(`/api/tickets/${child.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dependencyTicketId: subtaskReassignTargetId }),
            })
          )
        );
      } else if (mode === 'delete_all') {
        // Delete all subtasks first
        await Promise.all(
          subtasks.map((child) => fetch(`/api/tickets/${child.id}`, { method: 'DELETE' }))
        );
        setTicketStageMap((prev) => {
          const next = { ...prev };
          for (const child of subtasks) delete next[child.id];
          return next;
        });
      }

      // Delete the parent ticket
      const res = await fetch(`/api/tickets/${ticketToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete ticket');
      }

      setTicketStageMap((prev) => {
        const next = { ...prev };
        delete next[ticketToDelete.id];
        return next;
      });
      setTicketToDelete(null);
      setDeleteMode(null);
      setSubtaskReassignTargetId('');
      await onRefresh();
      showToast('Ticket deleted', 'success');
    } finally {
      setSavingTicketId(null);
    }
  }

  async function handleKanbanDrop(ticketId: string, stageId: string) {
    const stage = stages.find((entry) => entry.id === stageId);
    if (!stage) return;
    await moveTicketToStage(ticketId, stage);
  }

  async function handleRenameProject() {
    if (!selectedProject) return;
    const nextName = projectNameDraft.trim();
    if (!nextName) return;

    setIsSavingProject(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update project');
      }

      await onRefresh();
      setIsRenameProjectOpen(false);
      showToast('Project updated', 'success');
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleSaveProjectSettings() {
    if (!selectedProject) return;

    setSavingProjectSettings(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectNameDraft.trim(),
          deployUrl: projectDeployUrlDraft.trim(),
          branchBase: projectBranchBaseDraft.trim() || 'main',
          context: projectContextDraft.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update project');
      }

      await onRefresh();
      showToast('Project settings saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingProjectSettings(false);
    }
  }

  useEffect(() => {
    setProjectTab('kanban');
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) fetchProjectMembers(selectedProjectId);
    else setProjectMembers([]);
  }, [selectedProjectId, fetchProjectMembers]);

  useEffect(() => {
    if (!preferredTab) return;
    setProjectTab(preferredTab);
  }, [preferredTab]);

  useEffect(() => {
    if (!selectedProject) return;

    let active = true;
    const refresh = async () => {
      if (!active) return;
      await onRefresh();
    };

    const interval = setInterval(refresh, 5000);
    refresh();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [onRefresh, selectedProject?.id]);

  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              <FolderKanban className="h-3.5 w-3.5" />
              Projects
            </div>
            <h1 className="text-4xl font-playfair font-bold text-foreground">Your projects</h1>
            <p className="text-muted-foreground mt-2">
              Create a workspace, link meetings, and write tickets like Jira.
            </p>
          </div>

          <Button onClick={onCreateProject} className="rounded-full gap-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 border border-border text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FolderKanban className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-2">
              No projects yet
            </h2>
            <p className="text-muted-foreground mb-6">
              {isAdmin
                ? 'Create your first project to start organizing meetings and tickets.'
                : 'No projects have been created yet. Ask your org admin to create one.'}
            </p>
            {isAdmin && (
              <Button onClick={onCreateProject} className="rounded-full gap-2">
                <Sparkles className="h-4 w-4" />
                Create project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => {
              const projectTicketCount = tickets.filter(
                (ticket) => ticket.projectId === project.id
              ).length;
              const projectMeetingCount = meetings.filter(
                (meeting) => meeting.projectId === project.id
              ).length;

              return (
                <Card
                  key={project.id}
                  className="cursor-pointer border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                  onClick={() => onSelectProject(project.id)}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="font-playfair text-xl text-foreground">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="mt-2 text-sm text-muted-foreground">
                          {project.repo}
                        </CardDescription>
                      </div>
                      <Badge className="bg-primary/10 text-primary border border-primary/10">
                        {projectMeetingCount} meetings
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.25rem]">
                      {project.context || 'No project context yet.'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{projectTicketCount} tickets</span>
                      <span>{project.files.length} files</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      Open project <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const allTabs: { id: ProjectTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'kanban', label: 'Kanban', icon: <KanbanSquare className="h-4 w-4" /> },
    { id: 'tickets', label: 'Tickets', icon: <Ticket className="h-4 w-4" /> },
    { id: 'list', label: 'List', icon: <LayoutList className="h-4 w-4" /> },
    { id: 'meetings', label: 'Meetings', icon: <Calendar className="h-4 w-4" /> },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      adminOnly: true,
    },
    { id: 'dependencies', label: 'Dependencies', icon: <GitBranch className="h-4 w-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="h-4 w-4" />, adminOnly: true },
    { id: 'build', label: 'Build', icon: <Rocket className="h-4 w-4" /> },
  ];
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

  const statusConfig: Record<
    Ticket['status'],
    { label: string; color: string; bg: string; icon: React.ReactNode }
  > = {
    backlog: {
      label: 'Backlog',
      color: '#8a8a80',
      bg: '#f3f3f0',
      icon: <Circle className="h-3 w-3" />,
    },
    in_progress: {
      label: 'In Progress',
      color: '#3d7abf',
      bg: '#eff5ff',
      icon: <Clock className="h-3 w-3" />,
    },
    done: {
      label: 'Done',
      color: '#3d8a5e',
      bg: '#edf7f1',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    blocked: {
      label: 'Blocked',
      color: '#b84040',
      bg: '#fdf0f0',
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  function renderChildTicketTree(ticket: Ticket, depth = 0): React.ReactNode {
    const children = childrenByParentId[ticket.id] ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedTicketIds[ticket.id] ?? depth < 1;
    const isDone = ticket.status === 'done';

    return (
      <div key={ticket.id} className="space-y-0">
        <div
          className="group flex items-center gap-2 border-t border-border/60 px-2 py-2"
          style={{ paddingLeft: `${8 + Math.min(depth, 4) * 18}px` }}
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}

          <button
            type="button"
            onClick={() => openTicketEditor(ticket, true)}
            className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:underline"
          >
            {ticket.title}
          </button>

          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleExpanded(ticket.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={() => openTicketEditor(ticket, true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
            onClick={() => promptDeleteTicket(ticket)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasChildren && isExpanded && (
          <div>{children.map((child) => renderChildTicketTree(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: back + project name + project nav/actions */}
      <div className="border-b border-border bg-background px-8 flex flex-col gap-0">
        {/* Row 1: back + title */}
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectProject('')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Projects
            </button>
            <span className="text-muted-foreground/40">/</span>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              <h1 className="font-playfair text-xl font-bold text-foreground">
                {selectedProject.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Row 2: tab bar + actions */}
        <div className="flex items-center gap-3 -mb-px">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setProjectTab(tab.id);
                  onTabChange?.(tab.id);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  projectTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-all">
                  <SlidersHorizontal className="h-4 w-4" />
                  Options
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
                <DropdownMenuItem
                  onClick={() => {
                    setProjectNameDraft(selectedProject.name);
                    setIsRenameProjectOpen(true);
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <Pencil className="h-4 w-4 text-primary" />
                  Change name
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setProjectTab('settings')}
                  className="gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-primary" />
                  Project settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsImportDialogOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-primary" />
                  Import tickets from meeting
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={onCreateProject} className="gap-2 cursor-pointer">
                    <Plus className="h-4 w-4 text-primary" />
                    New project
                  </DropdownMenuItem>
                )}
                {isAdmin && <DropdownMenuSeparator />}
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => setProjectToDelete(selectedProject)}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* ── MEETINGS tab ── */}
        {projectTab === 'meetings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-2xl font-bold text-foreground">Meetings</h2>
              <Button onClick={() => setIsMeetingDialogOpen(true)} className="rounded-full gap-2">
                <Video className="h-4 w-4" />
                New meeting
              </Button>
            </div>
            {projectMeetings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground mb-2">No meetings yet</p>
                <p className="text-sm text-muted-foreground mb-5">
                  Start a meeting to begin collecting tickets.
                </p>
                <Button onClick={() => setIsMeetingDialogOpen(true)} className="rounded-full gap-2">
                  <Video className="h-4 w-4" />
                  Start first meeting
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projectMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => onSelectMeeting(meeting.id)}
                    className="text-left rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-playfair text-lg font-bold text-foreground">
                        {meeting.projectName}
                      </p>
                      <Badge
                        className={
                          meeting.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : meeting.status === 'not_admitted'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-primary/10 text-primary'
                        }
                      >
                        {meeting.status === 'not_admitted' ? '!' : meeting.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {meeting.platform} • {new Date(meeting.date).toLocaleDateString()}
                    </p>
                    <p className="mt-3 text-xs text-primary font-medium">Open meeting →</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TICKETS tab (card grid) ── */}
        {projectTab === 'tickets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-2xl font-bold text-foreground">Tickets</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(true)}
                  className="rounded-full gap-2 bg-card"
                  disabled={meetings.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Import
                </Button>
                <Button onClick={() => setIsTicketDialogOpen(true)} className="rounded-full gap-2">
                  <Ticket className="h-4 w-4" />
                  New ticket
                </Button>
              </div>
            </div>
            {rootProjectTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <p className="font-medium text-foreground mb-2">No tickets yet</p>
                <p className="text-sm text-muted-foreground mb-5">
                  Import tickets from a meeting or create them manually.
                </p>
                <Button
                  onClick={() => setIsImportDialogOpen(true)}
                  className="rounded-full gap-2"
                  disabled={meetings.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Import tickets from meeting
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rootProjectTickets.map((ticket) => {
                  const s = statusConfig[ticket.status];
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => openTicketEditor(ticket)}
                      className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 text-left hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <h3 className="font-playfair text-base font-bold text-foreground line-clamp-2">
                        {ticket.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {ticket.description ? stripHtml(ticket.description) : 'No description.'}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.icon}
                          {s.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ticket.assignee ? `@${ticket.assignee}` : 'Unassigned'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LIST tab (flat table-style list) ── */}
        {projectTab === 'list' && (
          <div className="space-y-4">
            <h2 className="font-playfair text-2xl font-bold text-foreground">List</h2>
            {rootProjectTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">No tickets in this project yet.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_120px_40px] items-center px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b border-border/60 bg-muted/40">
                  <span>Title</span>
                  <span>Status</span>
                  <span>Assignee</span>
                  <span />
                </div>
                {rootProjectTickets.map((ticket, i) => {
                  const s = statusConfig[ticket.status];
                  return (
                    <div
                      key={ticket.id}
                      className={`grid grid-cols-[1fr_120px_120px_40px] items-center px-4 py-3 gap-2 hover:bg-muted/40 transition-colors ${i < rootProjectTickets.length - 1 ? 'border-b border-border/40' : ''}`}
                    >
                      <span className="font-medium text-sm text-foreground truncate">
                        {ticket.title}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium w-fit"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.icon}
                        {s.label}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {ticket.assignee ? `@${ticket.assignee}` : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openTicketEditor(ticket)}
                        className="text-xs text-primary hover:underline justify-self-end"
                      >
                        Open
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── KANBAN tab ── */}
        {projectTab === 'kanban' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-playfair text-2xl font-bold text-foreground">Kanban</h2>
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/40">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'mine', label: 'Mine' },
                    { key: 'unassigned', label: 'Unassigned' },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setKanbanAssigneeFilter(key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      kanbanAssigneeFilter === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 items-start">
              {stages.map((stage) => {
                const colTickets = rootProjectTickets.filter(
                  (ticket) => resolveTicketStage(ticket).id === stage.id
                );
                const isOver = dragOverColumn === stage.id;
                return (
                  <div
                    key={stage.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverColumn(stage.id);
                    }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setDragOverColumn(null);
                      if (draggedStageId && draggedStageId !== stage.id) {
                        moveStageByDrop(draggedStageId, stage.id);
                        setDraggedStageId(null);
                        return;
                      }
                      if (draggedTicketId) {
                        await handleKanbanDrop(draggedTicketId, stage.id);
                        setDraggedTicketId(null);
                      }
                    }}
                    className={`min-w-[280px] w-[280px] rounded-2xl border-2 transition-colors h-fit flex flex-col ${
                      isOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            draggable
                            onDragStart={() => {
                              setDraggedStageId(stage.id);
                              setDraggedTicketId(null);
                            }}
                            onDragEnd={() => setDraggedStageId(null)}
                            className="cursor-grab active:cursor-grabbing text-muted-foreground/70 hover:text-foreground"
                            aria-label={`Reorder ${stage.label} stage`}
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className="text-xs font-semibold uppercase tracking-widest"
                            style={{ color: stage.color }}
                          >
                            {stage.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-muted-foreground bg-card rounded-full px-2 py-0.5 border border-border">
                          {colTickets.length}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => openEditStageDialog(stage)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => promptDeleteStage(stage)}
                          disabled={stages.length <= 1}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 p-3">
                      {colTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          draggable
                          onClick={() => {
                            const hasSubtasks = (childrenByParentId[ticket.id] ?? []).length > 0;
                            if (hasSubtasks) {
                              setSubtasksPopupTicket(ticket);
                            } else {
                              openTicketEditor(ticket);
                            }
                          }}
                          onDragStart={() => {
                            setDraggedTicketId(ticket.id);
                            setDraggedStageId(null);
                          }}
                          onDragEnd={() => setDraggedTicketId(null)}
                          className={`rounded-xl border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow text-left ${
                            draggedTicketId === ticket.id ? 'opacity-50' : ''
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground line-clamp-2">
                            {ticket.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {ticket.description ? stripHtml(ticket.description) : 'No description'}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            {ticket.assignee && (
                              <p className="text-[11px] text-muted-foreground">
                                @{ticket.assignee}
                              </p>
                            )}
                            {(childrenByParentId[ticket.id] ?? []).length > 0 && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {
                                  (childrenByParentId[ticket.id] ?? []).filter(
                                    (c) => c.status === 'done'
                                  ).length
                                }
                                /{(childrenByParentId[ticket.id] ?? []).length}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      {colTickets.length === 0 && (
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-xs text-muted-foreground/50">Drop tickets here</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={openAddStageDialog}
                className="min-w-[280px] w-[280px] rounded-2xl border border-dashed border-border bg-card/60 text-left p-4 hover:border-primary/40 hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <PlusCircle className="h-4 w-4 text-primary" />
                  Add stage
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a new column at the end.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYTICS tab ── */}
        {projectTab === 'analytics' &&
          (() => {
            const backlog = projectTickets.filter((t) => t.status === 'backlog').length;
            const inProgress = projectTickets.filter((t) => t.status === 'in_progress').length;
            const done = projectTickets.filter((t) => t.status === 'done').length;
            const blocked = projectTickets.filter((t) => t.status === 'blocked').length;
            const total = projectTickets.length;
            const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
            return (
              <div className="space-y-6">
                <h2 className="font-playfair text-2xl font-bold text-foreground">Analytics</h2>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    { label: 'Backlog', count: backlog, color: '#8a8a80', bg: '#f3f3f0' },
                    { label: 'In Progress', count: inProgress, color: '#3d7abf', bg: '#eff5ff' },
                    { label: 'Done', count: done, color: '#3d8a5e', bg: '#edf7f1' },
                    { label: 'Blocked', count: blocked, color: '#b84040', bg: '#fdf0f0' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border bg-card p-5 space-y-1"
                    >
                      <p
                        className="text-xs uppercase tracking-wide font-medium"
                        style={{ color: stat.color }}
                      >
                        {stat.label}
                      </p>
                      <p className="text-4xl font-playfair font-bold text-foreground">
                        {stat.count}
                      </p>
                      <p className="text-xs text-muted-foreground">{pct(stat.count)}% of total</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                  <p className="font-playfair text-lg font-bold text-foreground">
                    Progress overview
                  </p>
                  <div className="space-y-3">
                    {[
                      { label: 'Backlog', count: backlog, color: '#8a8a80' },
                      { label: 'In Progress', count: inProgress, color: '#3d7abf' },
                      { label: 'Done', count: done, color: '#3d8a5e' },
                      { label: 'Blocked', count: blocked, color: '#b84040' },
                    ].map((bar) => (
                      <div key={bar.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{bar.label}</span>
                          <span className="font-medium text-foreground">{bar.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct(bar.count)}%`, background: bar.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total tickets</span>
                    <span className="font-playfair text-2xl font-bold text-foreground">
                      {total}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Meetings
                    </p>
                    <p className="text-4xl font-playfair font-bold text-foreground">
                      {projectMeetings.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Completion rate
                    </p>
                    <p className="text-4xl font-playfair font-bold text-foreground">{pct(done)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {done} of {total} tickets done
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* ── MEMBERS tab ── */}
        {projectTab === 'members' &&
          (() => {
            const orgMemberList = memberships?.data ?? [];
            const projectMemberUserIds = new Set(projectMembers.map((pm) => pm.user_id));
            const notYetAdded = orgMemberList.filter(
              (m) => !projectMemberUserIds.has(m.publicUserData?.userId ?? '')
            );

            async function handleAddMember(userId: string) {
              if (!selectedProjectId) return;
              setAddingMemberId(userId);
              try {
                await fetch(`/api/projects/${selectedProjectId}/members`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, role: 'member' }),
                });
                await fetchProjectMembers(selectedProjectId);
              } finally {
                setAddingMemberId(null);
              }
            }

            async function handleRemoveProjectMember(userId: string) {
              if (!selectedProjectId) return;
              setRemovingProjectMemberId(userId);
              try {
                await fetch(`/api/projects/${selectedProjectId}/members`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId }),
                });
                await fetchProjectMembers(selectedProjectId);
              } finally {
                setRemovingProjectMemberId(null);
              }
            }

            return (
              <div className="space-y-4">
                <h2 className="font-playfair text-2xl font-bold text-foreground">Members</h2>

                {/* Current project members */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Project members</p>
                  {projectMembersLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : projectMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No members added to this project yet.
                    </p>
                  ) : (
                    projectMembers.map((pm) => {
                      const orgM = orgMemberList.find(
                        (m) => m.publicUserData?.userId === pm.user_id
                      );
                      const name = orgM
                        ? [orgM.publicUserData?.firstName, orgM.publicUserData?.lastName]
                            .filter(Boolean)
                            .join(' ') ||
                          orgM.publicUserData?.identifier ||
                          'Unknown'
                        : pm.user_id;
                      const email = orgM?.publicUserData?.identifier ?? '';
                      const imageUrl = orgM?.publicUserData?.imageUrl;
                      return (
                        <div
                          key={pm.id}
                          className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 bg-background"
                        >
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                {name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{name}</p>
                              {email && (
                                <p className="text-[11px] text-muted-foreground">{email}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                pm.role === 'admin'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {pm.role === 'admin' ? 'Admin' : 'Member'}
                            </span>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                disabled={removingProjectMemberId === pm.user_id}
                                onClick={() => handleRemoveProjectMember(pm.user_id)}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add org members to project — admin only */}
                {isAdmin && notYetAdded.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Add org members to this project
                    </p>
                    {notYetAdded.map((m) => {
                      const name =
                        [m.publicUserData?.firstName, m.publicUserData?.lastName]
                          .filter(Boolean)
                          .join(' ') ||
                        m.publicUserData?.identifier ||
                        'Unknown';
                      const userId = m.publicUserData?.userId ?? '';
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 bg-background"
                        >
                          <div className="flex items-center gap-3">
                            {m.publicUserData?.imageUrl ? (
                              <img
                                src={m.publicUserData.imageUrl}
                                alt={name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                                {name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {m.publicUserData?.identifier}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={addingMemberId === userId}
                            onClick={() => handleAddMember(userId)}
                          >
                            {addingMemberId === userId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            Add
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending org invitations */}
                {isAdmin && (invitations?.data?.length ?? 0) > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Pending org invitations
                    </p>
                    {invitations!.data!.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-xl border border-dashed border-border/60 px-4 py-3 bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted/60 border border-dashed border-border flex items-center justify-center">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {inv.emailAddress}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Invited {new Date(inv.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        {/* ── DEPENDENCIES tab ── */}
        {projectTab === 'dependencies' && (
          <div className="space-y-4">
            <h2 className="font-playfair text-2xl font-bold text-foreground">Dependencies</h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <TicketDependencyGraph
                projectId={selectedProject.id}
                subtaskCounts={Object.fromEntries(
                  Object.entries(childrenByParentId).map(([id, children]) => [id, children.length])
                )}
                onTicketClick={(ticketId) => {
                  const ticket = projectTickets.find((t) => t.id === ticketId);
                  if (ticket && (childrenByParentId[ticketId] ?? []).length > 0) {
                    setSubtasksPopupTicket(ticket);
                  } else if (ticket) {
                    openTicketEditor(ticket);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ── BUILD tab ── */}
        {projectTab === 'build' && (
          <div className="space-y-4">
            <h2 className="font-playfair text-2xl font-bold text-foreground">SwarmNet Build</h2>
            <SwarmNetBuildPanel project={selectedProject} tickets={projectTickets} />
          </div>
        )}

        {/* ── SETTINGS tab ── */}
        {projectTab === 'settings' && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="font-playfair text-2xl font-bold text-foreground">Project Settings</h2>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Project name</label>
                <Input
                  value={projectNameDraft}
                  onChange={(e) => setProjectNameDraft(e.target.value)}
                  placeholder="Project name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Deployment URL</label>
                <Input
                  value={projectDeployUrlDraft}
                  onChange={(e) => setProjectDeployUrlDraft(e.target.value)}
                  placeholder="https://app.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Where your app is deployed. Used for preview links and webhook checks.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Base branch</label>
                <Input
                  value={projectBranchBaseDraft}
                  onChange={(e) => setProjectBranchBaseDraft(e.target.value)}
                  placeholder="main"
                />
                <p className="text-xs text-muted-foreground">
                  The default branch that agent PRs target.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Context</label>
                <Textarea
                  value={projectContextDraft}
                  onChange={(e) => setProjectContextDraft(e.target.value)}
                  placeholder="Project goals, tech stack, constraints..."
                  className="min-h-24"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  onClick={handleSaveProjectSettings}
                  disabled={savingProjectSettings}
                  className="rounded-full gap-2"
                >
                  {savingProjectSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save settings
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ProjectMeetingDialog
        open={isMeetingDialogOpen}
        onOpenChange={setIsMeetingDialogOpen}
        projectId={selectedProject.id}
        onCreated={onRefresh}
      />

      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="sm:max-w-md border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              {stageForm.id ? 'Edit stage' : 'Add new stage'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Configure stage name, status mapping, and color.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <label className="block text-sm text-muted-foreground">
              Stage name
              <input
                value={stageForm.label}
                onChange={(e) =>
                  setStageForm((prev) => ({
                    ...prev,
                    label: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="e.g. QA Review"
              />
            </label>

            <label className="block text-sm text-muted-foreground">
              Color
              <input
                type="color"
                value={stageForm.color}
                onChange={(e) =>
                  setStageForm((prev) => ({
                    ...prev,
                    color: e.target.value,
                  }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2"
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveStageDetails}
              disabled={!stageForm.label.trim()}
              className="rounded-full"
            >
              {stageForm.id ? 'Save stage' : 'Create stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRelocateStageDialogOpen}
        onOpenChange={(open) => {
          setIsRelocateStageDialogOpen(open);
          if (!open) {
            setStageToDelete(null);
            setRelocateStageId('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              Move tickets before deleting stage
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a destination stage for tickets from &quot;{stageToDelete?.label}&quot;.
            </DialogDescription>
          </DialogHeader>

          <label className="block text-sm text-muted-foreground">
            Destination stage
            <select
              value={relocateStageId}
              onChange={(e) => setRelocateStageId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              disabled={Boolean(savingTicketId)}
            >
              <option value="">Select stage</option>
              {stages
                .filter((stage) => stage.id !== stageToDelete?.id)
                .map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
            </select>
          </label>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRelocateStageDialogOpen(false);
                setStageToDelete(null);
                setRelocateStageId('');
              }}
              disabled={Boolean(savingTicketId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRelocateStageDelete}
              disabled={Boolean(savingTicketId) || !relocateStageId}
            >
              Move tickets &amp; delete stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteStageDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteStageDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-xl border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              Delete stage &quot;{stageToDelete?.label}&quot;?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose whether to keep tickets by moving them to the previous stage, or delete all
              tickets in this stage.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteStageDialogOpen(false);
                setStageToDelete(null);
                setRelocateStageId('');
                setIsRelocateStageDialogOpen(false);
              }}
              disabled={Boolean(savingTicketId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleDeleteStage('keep_tickets')}
              disabled={Boolean(savingTicketId)}
            >
              Keep tickets &amp; delete stage
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDeleteStage('delete_with_tickets')}
              disabled={Boolean(savingTicketId)}
            >
              Delete stage with tickets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameProjectOpen} onOpenChange={setIsRenameProjectOpen}>
        <DialogContent className="sm:max-w-xl border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              Change project name
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the project name used in your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="block text-sm text-muted-foreground">
              Project name
              <input
                value={projectNameDraft}
                onChange={(e) => setProjectNameDraft(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Project name"
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRenameProjectOpen(false)}
              className="rounded-full"
              disabled={isSavingProject}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRenameProject}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isSavingProject || projectNameDraft.trim().length === 0}
            >
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualTicketDialog
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        meetings={projectMeetings.map((meeting) => ({
          id: meeting.id,
          projectName: meeting.projectName,
        }))}
        defaultMeetingId={projectMeetings[0]?.id}
        defaultProjectId={selectedProject.id}
        projectOnly
        onCreated={onRefresh}
      />

      <ProjectTicketImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        projectId={selectedProject.id}
        meetings={meetings}
        tickets={tickets}
        projectTickets={projectTickets}
        onCreated={onRefresh}
      />

      <Sheet
        open={Boolean(ticketToEdit)}
        onOpenChange={(open) => {
          if (!open) closeTicketEditor();
        }}
      >
        <SheetContent side="right" className="w-[680px] sm:max-w-[680px] p-0 overflow-hidden">
          <SheetHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="text-lg">
                {ticketToEdit?.dependency_ticket_id ? 'Edit subticket' : 'Edit ticket'}
              </SheetTitle>
              {ticketEditorHistory.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={goBackTicketEditor}>
                  Go back
                </Button>
              )}
            </div>
            <SheetDescription>
              {ticketToEdit?.dependency_ticket_id
                ? 'Describe subticket and update assignee, status, and dependencies.'
                : 'Update ticket fields, manage child tickets, and adjust dependencies.'}
            </SheetDescription>
          </SheetHeader>

          <div className="border-b border-border px-6 pt-2">
            <div className="flex gap-1">
              {(() => {
                // Only parent tickets (not subtickets) get the Activity tab
                const isSubtask = Boolean(ticketToEdit?.dependency_ticket_id);
                const tabs = isSubtask
                  ? ['details', 'attachments', 'comments', 'timeline']
                  : ['details', 'attachments', 'comments', 'activity', 'timeline'];
                return tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() =>
                      setTicketEditTab(
                        tab as 'details' | 'attachments' | 'comments' | 'activity' | 'timeline'
                      )
                    }
                    className={`px-3 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                      ticketEditTab === tab
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ));
              })()}
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
            {ticketEditTab === 'details' && (
              <>
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

                <div className="space-y-1">
                  <label className="block text-sm text-muted-foreground">Description</label>
                  <MentionEditor
                    content={ticketEditForm.description}
                    onChange={(html) =>
                      setTicketEditForm((prev) => ({
                        ...prev,
                        description: html,
                      }))
                    }
                    placeholder="Describe the ticket..."
                    disabled={Boolean(savingTicketId)}
                    members={(memberships?.data ?? []).map((m) => ({
                      userId: m.publicUserData?.userId ?? '',
                      displayName:
                        [m.publicUserData?.firstName, m.publicUserData?.lastName]
                          .filter(Boolean)
                          .join(' ') ||
                        m.publicUserData?.identifier ||
                        'Unknown',
                      imageUrl: m.publicUserData?.imageUrl,
                    }))}
                    tickets={projectTickets.map((t) => ({
                      id: t.id,
                      title: t.title,
                      status: t.status,
                    }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-sm text-muted-foreground">
                    Assignee
                    <div className="mt-1">
                      <AssigneePicker
                        value={ticketEditForm.assignee}
                        onChange={(val) =>
                          setTicketEditForm((prev) => ({ ...prev, assignee: val }))
                        }
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

                  <label className="block text-sm text-muted-foreground">
                    Dates
                    <div className="mt-1">
                      <DateRangePicker
                        startDate={ticketEditForm.start_date || undefined}
                        dueDate={ticketEditForm.due_date || undefined}
                        deadlineTime={ticketEditForm.deadline_time || undefined}
                        onStartDateChange={(date) =>
                          setTicketEditForm((prev) => ({
                            ...prev,
                            start_date: date || '',
                          }))
                        }
                        onDueDateChange={(date) =>
                          setTicketEditForm((prev) => ({
                            ...prev,
                            due_date: date || '',
                          }))
                        }
                        onDeadlineTimeChange={(time) =>
                          setTicketEditForm((prev) => ({
                            ...prev,
                            deadline_time: time || '',
                          }))
                        }
                        disabled={Boolean(savingTicketId)}
                      />
                    </div>
                  </label>
                </div>

                {ticketToEdit && (
                  <div className="rounded-lg border border-border bg-card/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <h3 className="text-sm font-semibold text-foreground">Subtasks</h3>
                        <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {
                            (childrenByParentId[ticketToEdit.id] ?? []).filter(
                              (child) => child.status === 'done'
                            ).length
                          }
                          /{(childrenByParentId[ticketToEdit.id] ?? []).length}
                        </span>
                      </div>
                    </div>

                    <div>
                      {(childrenByParentId[ticketToEdit.id] ?? []).length === 0 ? (
                        <p className="border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
                          No subtasks yet.
                        </p>
                      ) : (
                        (childrenByParentId[ticketToEdit.id] ?? []).map((child) =>
                          renderChildTicketTree(child, 0)
                        )
                      )}
                    </div>

                    {isAddingSubtask && (
                      <div className="border-t border-border/60 bg-primary/5 px-2 py-2">
                        <div className="flex items-center gap-2">
                          <Circle className="h-4 w-4 text-muted-foreground" />
                          <input
                            value={newChildDraft.title}
                            onChange={(e) =>
                              setNewChildDraft((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                            placeholder="Subtask name"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleCreateChildTicket();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            onClick={handleCreateChildTicket}
                            disabled={!newChildDraft.title.trim() || Boolean(savingTicketId)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsAddingSubtask(true)}
                      className="w-full border-t border-border/60 px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    >
                      Add subtask
                    </button>
                  </div>
                )}

                {ticketToEdit && ticketToEdit.projectId && (
                  <div className="border-t border-border/60 pt-4">
                    <TicketDependencyPanel
                      ticketId={ticketToEdit.id}
                      projectId={ticketToEdit.projectId}
                      projectTickets={projectTickets.map((t) => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                      }))}
                    />
                  </div>
                )}
              </>
            )}

            {ticketEditTab === 'attachments' && ticketToEdit && (
              <TicketAttachmentsPanel ticketId={ticketToEdit.id} />
            )}

            {ticketEditTab === 'comments' && ticketToEdit && (
              <TicketCommentsPanel ticketId={ticketToEdit.id} />
            )}

            {ticketEditTab === 'activity' && ticketToEdit && (
              <TicketActivityPanel ticketId={ticketToEdit.id} />
            )}

            {ticketEditTab === 'timeline' && ticketToEdit && (
              <TicketTimelinePanel
                ticket={ticketToEdit}
                subtasks={childrenByParentId[ticketToEdit.id] ?? []}
              />
            )}
          </div>

          <SheetFooter className="border-t border-border px-6 py-4 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!ticketToEdit) return;
                promptDeleteTicket(ticketToEdit);
                closeTicketEditor();
              }}
              disabled={Boolean(savingTicketId)}
            >
              Delete ticket
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeTicketEditor}
              disabled={Boolean(savingTicketId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveTicketEdit}
              disabled={Boolean(savingTicketId) || ticketEditForm.title.trim().length === 0}
            >
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(ticketToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setTicketToDelete(null);
            setDeleteMode(null);
            setSubtaskReassignTargetId('');
          }
        }}
      >
        <DialogContent className="sm:max-w-xl border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              {deleteMode === 'reassign' ? 'Move subtasks before deleting' : 'Delete this ticket?'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {deleteMode === 'reassign'
                ? 'Choose an existing ticket to move the subtasks to before deleting.'
                : deleteMode === 'confirm'
                  ? `"${ticketToDelete?.title}" has ${(childrenByParentId[ticketToDelete?.id ?? ''] ?? []).length} subtask(s). Choose what to do with them.`
                  : `This will permanently remove "${ticketToDelete?.title}" from this project.`}
            </DialogDescription>
          </DialogHeader>

          {/* Subtask list shown in confirm mode */}
          {deleteMode === 'confirm' && (
            <div className="rounded-lg border border-border bg-muted/40 max-h-40 overflow-y-auto">
              {(childrenByParentId[ticketToDelete?.id ?? ''] ?? []).map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-2 border-b border-border/50 px-3 py-2 last:border-b-0 text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-foreground truncate">{child.title}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground capitalize shrink-0">
                    {child.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Reassign dropdown */}
          {deleteMode === 'reassign' && (
            <div className="py-1">
              <label className="block text-sm text-muted-foreground mb-1">Move subtasks to</label>
              <select
                value={subtaskReassignTargetId}
                onChange={(e) => setSubtaskReassignTargetId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select a ticket…</option>
                {projectTickets
                  .filter((t) => t.id !== ticketToDelete?.id && !t.dependency_ticket_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <DialogFooter className="pt-2 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTicketToDelete(null);
                setDeleteMode(null);
                setSubtaskReassignTargetId('');
              }}
              className="rounded-full"
              disabled={Boolean(savingTicketId)}
            >
              Cancel
            </Button>

            {deleteMode === 'confirm' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteMode('reassign')}
                  className="rounded-full"
                  disabled={Boolean(savingTicketId)}
                >
                  Move subtasks
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteTicket('delete_all')}
                  className="rounded-full gap-2"
                  disabled={Boolean(savingTicketId)}
                >
                  {savingTicketId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Delete all
                </Button>
              </>
            )}

            {deleteMode === 'reassign' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteMode('confirm')}
                  className="rounded-full"
                  disabled={Boolean(savingTicketId)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteTicket('reassign')}
                  className="rounded-full gap-2"
                  disabled={Boolean(savingTicketId) || !subtaskReassignTargetId}
                >
                  {savingTicketId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Move &amp; delete
                </Button>
              </>
            )}

            {!deleteMode && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleDeleteTicket('simple')}
                className="rounded-full gap-2"
                disabled={Boolean(savingTicketId)}
              >
                {savingTicketId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete ticket
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-xl border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl text-foreground">
              Delete this project?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will remove the project from Supabase and unlink its meetings and tickets from
              the project. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!projectToDelete) return;
                await onDeleteProject(projectToDelete.id);
                setProjectToDelete(null);
              }}
              className="rounded-full"
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(subtasksPopupTicket)}
        onOpenChange={(open) => {
          if (!open) setSubtasksPopupTicket(null);
        }}
      >
        <DialogContent className="sm:max-w-md border-border bg-background shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-playfair text-xl text-foreground">
              {subtasksPopupTicket?.title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Subtasks ({(childrenByParentId[subtasksPopupTicket?.id ?? ''] ?? []).length})
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {(childrenByParentId[subtasksPopupTicket?.id ?? ''] ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No subtasks yet.</p>
            ) : (
              <div className="space-y-1 rounded-lg border border-border bg-card/40">
                {(childrenByParentId[subtasksPopupTicket?.id ?? ''] ?? []).map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0"
                  >
                    {child.status === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm text-foreground">{child.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setSubtasksPopupTicket(null);
                        openTicketEditor(child, true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubtasksPopupTicket(null)}
              className="rounded-full"
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (subtasksPopupTicket) {
                    openTicketEditor(subtasksPopupTicket);
                    setSubtasksPopupTicket(null);
                  }
                }}
                className="rounded-full"
              >
                Edit ticket
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (subtasksPopupTicket) {
                    setIsAddingSubtask(true);
                    openTicketEditor(subtasksPopupTicket);
                    setSubtasksPopupTicket(null);
                  }
                }}
                className="rounded-full"
              >
                Add subtask
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dependency Blocker Modal */}
      {blockerModalData && (
        <DependencyBlockerModal
          isOpen={blockerModalOpen}
          onClose={() => setBlockerModalOpen(false)}
          onGoToTicket={(ticketId) => {
            const ticket = projectTickets.find((t) => t.id === ticketId);
            if (ticket) {
              setBlockerModalOpen(false);
              openTicketEditor(ticket);
            }
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
