'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderKanban,
  Video,
  Ticket,
  CheckCircle2,
  ArrowUpRight,
  Users,
  BarChart3,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/sidebar';
import { MeetingCards } from '@/components/meeting-cards';
import { TicketDetail } from '@/components/ticket-detail';
import { TicketsBoard } from '@/components/tickets-board';
import { ProjectsWorkspace } from '@/components/projects-workspace';
import { ProjectCreateDialog } from '@/components/project-create-dialog';
import { ManualTicketDialog } from '@/components/manual-ticket-dialog';
import { DynamicIslandSearch } from '@/components/dynamic-island-search';
import { NotificationBell } from '@/components/notification-bell';
import { GanttCalendar } from '@/components/gantt-calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useUser, useOrganization } from '@clerk/nextjs';

type ViewType =
  | 'dashboard'
  | 'meetings'
  | 'projects'
  | 'tickets'
  | 'ticket-detail'
  | 'members'
  | 'calendar';

interface Project {
  id: string;
  name: string;
  repo: string;
  deployUrl?: string | null;
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
  projectId?: string | null;
  specsDetected: number;
  status: 'completed' | 'processing' | 'failed' | 'not_admitted';
  date: string;
  platform: string;
  deployUrl?: string | null;
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
  due_date?: string | null;
}

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  identifier: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { membership, organization } = useOrganization();
  const isAdmin = membership?.role === 'org:admin';
  // Admin-only: load memberships lazily
  const { memberships } = useOrganization(
    isAdmin ? { memberships: { infinite: true, pageSize: 50 } } : {}
  );

  // Drive view from URL — no state needed, avoids sync delay
  const currentView: ViewType = (searchParams.get('view') as ViewType) || 'dashboard';

  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [isProjectCreateOpen, setIsProjectCreateOpen] = useState(false);
  const [isMeetingTicketOpen, setIsMeetingTicketOpen] = useState(false);
  const [meetingTicketMeetingId, setMeetingTicketMeetingId] = useState<string | null>(null);

  useEffect(() => {
    // Wait until Clerk has resolved membership (undefined = still loading)
    if (membership === undefined) return;

    let isMounted = true;

    async function loadWorkspace() {
      try {
        const [projectsRes, meetingsRes, ticketsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/meetings'),
          fetch('/api/tickets'),
        ]);

        if (!isMounted) return;

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }

        if (meetingsRes.ok) {
          const meetingsData = await meetingsRes.json();
          setMeetings(meetingsData);
        }

        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setTickets(ticketsData);
        }
      } catch (error) {
        console.error('Failed to load workspace data:', error);
      }
    }

    void loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [membership]);

  function handleViewChange(view: ViewType) {
    if (view === 'dashboard') {
      router.push('/dashboard');
    } else {
      router.push(`/dashboard?view=${view}`);
    }
    if (view !== 'ticket-detail') setSelectedMeeting(null);
  }

  function handleMeetingSelect(meetingId: string) {
    setSelectedMeeting(meetingId);
    router.push(`/dashboard?view=ticket-detail&meetingId=${meetingId}`);
  }

  function handleMeetingTicketCreate(meetingId: string) {
    setMeetingTicketMeetingId(meetingId);
    setIsMeetingTicketOpen(true);
  }

  async function handleDeleteMeeting(meetingId: string) {
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to delete meeting');
    }

    await refreshWorkspace();
    setSelectedMeeting(null);
    router.push('/dashboard?view=meetings');

    toast({ title: 'Meeting deleted', description: 'The meeting was removed from Supabase.' });
  }

  function handleProjectSelect(projectId: string) {
    if (!projectId) {
      router.push('/dashboard?view=projects');
      return;
    }
    router.push(`/project?projectId=${projectId}&tab=kanban`);
  }

  async function handleDeleteProject(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to delete project');
    }

    await refreshWorkspace();
    toast({ title: 'Project deleted', description: 'The project was removed from Supabase.' });
  }

  const refreshWorkspace = useCallback(async () => {
    try {
      const [projectsRes, meetingsRes, ticketsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/meetings'),
        fetch('/api/tickets'),
      ]);

      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      if (ticketsRes.ok) setTickets(await ticketsRes.json());
    } catch (error) {
      console.error('Failed to refresh workspace data:', error);
    }
  }, []);

  async function handleCreateProject(payload: {
    name: string;
    context: string;
    deployUrl: string;
    branchBase: string;
  }) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to create project');
    }

    const data = await res.json();
    await refreshWorkspace();
    router.push(`/project?projectId=${data.project.id}&tab=kanban`);
    toast({ title: 'Project created', description: `${data.project.name} is ready.` });
  }

  const doneCount = tickets.filter((t) => t.status === 'done').length;
  const completionPct = tickets.length ? Math.round((doneCount / tickets.length) * 100) : 0;

  // My tickets (assigned to me)
  const myTickets = tickets.filter((t) => t.assignee_user_id === user?.id);
  const myDone = myTickets.filter((t) => t.status === 'done').length;
  const myInProgress = myTickets.filter((t) => t.status === 'in_progress').length;
  const myOverdue = myTickets.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
  ).length;

  // Per-member workload for admin
  const orgMembers = memberships?.data ?? [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        currentView={currentView}
        projects={projects}
        selectedProjectId={null}
        onSelectProject={handleProjectSelect}
        onCreateProject={() => setIsProjectCreateOpen(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background">
          <h1 className="text-sm font-semibold text-foreground">
            {currentView === 'dashboard' && (isAdmin ? 'Organization Dashboard' : 'My Dashboard')}
            {currentView === 'meetings' && 'Meetings'}
            {currentView === 'projects' && 'Projects'}
            {currentView === 'tickets' && 'All Tickets'}
            {currentView === 'members' && 'Members'}
            {currentView === 'calendar' && 'Calendar'}
            {currentView === 'ticket-detail' && 'Meeting Tickets'}
          </h1>
          <div className="flex items-center gap-2">
            <NotificationBell onNavigateToTicket={() => handleViewChange('tickets')} />
            <DynamicIslandSearch
              onSelectTicket={(id) => handleViewChange('tickets')}
              onSelectMeeting={(id) => {
                setSelectedMeeting(id);
                handleViewChange('ticket-detail');
              }}
              onSelectProject={(id) => handleProjectSelect(id)}
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto animate-fade-in-up">
          {/* ── ADMIN DASHBOARD ── */}
          {currentView === 'dashboard' && isAdmin && (
            <div className="p-6 space-y-5 max-w-5xl mx-auto w-full">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {organization?.name ?? 'Organization'} Overview
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Everything happening across your organization
                </p>
              </div>

              {/* Org Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Projects',
                    value: projects.length,
                    Icon: FolderKanban,
                    color: 'text-primary',
                  },
                  {
                    label: 'Meetings',
                    value: meetings.length,
                    Icon: Video,
                    color: 'text-blue-500',
                  },
                  {
                    label: 'Total Tickets',
                    value: tickets.length,
                    Icon: Ticket,
                    color: 'text-orange-500',
                  },
                  {
                    label: 'Completion',
                    value: `${completionPct}%`,
                    Icon: CheckCircle2,
                    color: 'text-emerald-500',
                  },
                ].map(({ label, value, Icon, color }) => (
                  <Card key={label} className="border-border/60 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium">{label}</span>
                        <Icon className={cn('h-4 w-4', color)} />
                      </div>
                      <p className="text-2xl font-semibold text-foreground">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Member Workload */}
              <Card className="border-border/60 shadow-none">
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Member Workload</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Ticket distribution across the team
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 h-7"
                      onClick={() => handleViewChange('members')}
                    >
                      Manage <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {orgMembers.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-6 text-center">
                      <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No members yet — invite your team from Settings.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orgMembers.map((m) => {
                        const memberTickets = tickets.filter(
                          (t) => t.assignee_user_id === m.publicUserData?.userId
                        );
                        const done = memberTickets.filter((t) => t.status === 'done').length;
                        const pct = memberTickets.length
                          ? Math.round((done / memberTickets.length) * 100)
                          : 0;
                        const name =
                          [m.publicUserData?.firstName, m.publicUserData?.lastName]
                            .filter(Boolean)
                            .join(' ') ||
                          m.publicUserData?.identifier ||
                          'Member';
                        return (
                          <div key={m.id} className="flex items-center gap-3">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={m.publicUserData?.imageUrl} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {name[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-foreground truncate">
                                  {name}
                                </span>
                                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                  {done}/{memberTickets.length} done
                                </span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                              {m.role === 'org:admin' ? 'Admin' : 'Member'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Projects */}
              <Card className="border-border/60 shadow-none">
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Projects</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        All organization projects
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 h-7"
                      onClick={() => handleViewChange('projects')}
                    >
                      View all <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {projects.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center">
                      <FolderKanban className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Create a project to get started.
                      </p>
                      <Button size="sm" onClick={() => setIsProjectCreateOpen(true)}>
                        Create project
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {projects.slice(0, 6).map((project) => {
                        const pTickets = tickets.filter((t) => t.projectId === project.id).length;
                        const pDone = tickets.filter(
                          (t) => t.projectId === project.id && t.status === 'done'
                        ).length;
                        const pPct = pTickets ? Math.round((pDone / pTickets) * 100) : 0;
                        return (
                          <button
                            key={project.id}
                            onClick={() => handleProjectSelect(project.id)}
                            className="text-left rounded-lg border border-border/60 bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-2.5 mb-3">
                              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <FolderKanban className="h-4 w-4 text-primary" />
                              </div>
                              <p className="text-sm font-semibold text-foreground truncate">
                                {project.name}
                              </p>
                            </div>
                            <Progress value={pPct} className="h-1 mb-2" />
                            <p className="text-[11px] text-muted-foreground">
                              {pDone}/{pTickets} tickets done
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Meetings */}
              <Card className="border-border/60 shadow-none">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold">Recent Meetings</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {meetings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No meetings yet.</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {meetings.slice(0, 5).map((meeting) => (
                        <button
                          key={meeting.id}
                          onClick={() => handleMeetingSelect(meeting.id)}
                          className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/50 px-2 -mx-2 rounded-md transition-colors"
                        >
                          <div className="h-8 w-8 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Video className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {meeting.projectName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {meeting.platform} · {new Date(meeting.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={meeting.status === 'completed' ? 'default' : 'secondary'}
                            className="text-[10px] shrink-0"
                          >
                            {meeting.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MEMBER DASHBOARD ── */}
          {currentView === 'dashboard' && !isAdmin && (
            <div className="p-6 space-y-5 max-w-4xl mx-auto w-full">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Hey {user?.firstName ?? 'there'} 👋
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Here's your work at a glance</p>
              </div>

              {/* My Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: 'My Tickets',
                    value: myTickets.length,
                    Icon: Ticket,
                    color: 'text-orange-500',
                  },
                  {
                    label: 'In Progress',
                    value: myInProgress,
                    Icon: BarChart3,
                    color: 'text-blue-500',
                  },
                  {
                    label: 'Completed',
                    value: myDone,
                    Icon: CheckCircle2,
                    color: 'text-emerald-500',
                  },
                  {
                    label: 'Overdue',
                    value: myOverdue,
                    Icon: AlertCircle,
                    color: myOverdue > 0 ? 'text-red-500' : 'text-muted-foreground',
                  },
                ].map(({ label, value, Icon, color }) => (
                  <Card key={label} className="border-border/60 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium">{label}</span>
                        <Icon className={cn('h-4 w-4', color)} />
                      </div>
                      <p className="text-2xl font-semibold text-foreground">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* My Tickets */}
              <Card className="border-border/60 shadow-none">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold">My Tickets</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Tickets assigned to you
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {myTickets.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center">
                      <Ticket className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No tickets assigned to you yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myTickets.slice(0, 8).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-card"
                        >
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] shrink-0', {
                              'border-emerald-300 text-emerald-600 bg-emerald-50':
                                ticket.status === 'done',
                              'border-blue-300 text-blue-600 bg-blue-50':
                                ticket.status === 'in_progress',
                              'border-red-300 text-red-600 bg-red-50': ticket.status === 'blocked',
                              'border-border text-muted-foreground': ticket.status === 'backlog',
                            })}
                          >
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <p className="text-sm text-foreground truncate flex-1">{ticket.title}</p>
                          {ticket.due_date && (
                            <span
                              className={cn(
                                'text-[11px] shrink-0 flex items-center gap-1',
                                new Date(ticket.due_date) < new Date() && ticket.status !== 'done'
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* My Projects */}
              <Card className="border-border/60 shadow-none">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-semibold">My Projects</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Projects you're part of
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {projects.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-6 text-center">
                      <FolderKanban className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No projects assigned yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {projects.slice(0, 4).map((project) => {
                        const pTickets = myTickets.filter((t) => t.projectId === project.id).length;
                        return (
                          <button
                            key={project.id}
                            onClick={() => handleProjectSelect(project.id)}
                            className="text-left rounded-lg border border-border/60 bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <FolderKanban className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {project.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {pTickets} tickets assigned to me
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── MEMBERS (admin only) ── */}
          {currentView === 'members' && isAdmin && (
            <div className="p-6 max-w-4xl mx-auto w-full">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-foreground">Members</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Everyone in {organization?.name ?? 'your org'}
                </p>
              </div>
              <Card className="border-border/60 shadow-none">
                <CardContent className="p-0">
                  {orgMembers.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">No members yet</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Go to Settings to generate an invite link for your team.
                      </p>
                      <Button size="sm" onClick={() => router.push('/settings')}>
                        Go to Settings
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {orgMembers.map((m) => {
                        const memberTickets = tickets.filter(
                          (t) => t.assignee_user_id === m.publicUserData?.userId
                        );
                        const done = memberTickets.filter((t) => t.status === 'done').length;
                        const inProg = memberTickets.filter(
                          (t) => t.status === 'in_progress'
                        ).length;
                        const name =
                          [m.publicUserData?.firstName, m.publicUserData?.lastName]
                            .filter(Boolean)
                            .join(' ') ||
                          m.publicUserData?.identifier ||
                          'Member';
                        return (
                          <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarImage src={m.publicUserData?.imageUrl} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                {name[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {m.publicUserData?.identifier}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                              <span className="flex items-center gap-1">
                                <Ticket className="h-3 w-3" /> {memberTickets.length} tickets
                              </span>
                              <span className="flex items-center gap-1 text-blue-500">
                                <BarChart3 className="h-3 w-3" /> {inProg} active
                              </span>
                              <span className="flex items-center gap-1 text-emerald-500">
                                <CheckCircle2 className="h-3 w-3" /> {done} done
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {m.role === 'org:admin' ? 'Admin' : 'Member'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── CALENDAR — Gantt timeline ── */}
          {currentView === 'calendar' && (
            <div className="p-6 h-full flex flex-col">
              <div className="mb-5 shrink-0">
                <h2 className="text-xl font-semibold text-foreground">Timeline</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Gantt view of every ticket across your projects
                </p>
              </div>
              <div className="flex-1 min-h-[600px]">
                <GanttCalendar
                  tickets={tickets as any}
                  projects={projects as any}
                  onSelectTicket={(id) => {
                    const t = tickets.find((x) => x.id === id);
                    if (t?.meeting_id) {
                      setSelectedMeeting(t.meeting_id);
                      handleViewChange('ticket-detail');
                    } else {
                      handleViewChange('tickets');
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* ── MEETINGS ── */}
          {currentView === 'meetings' && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-foreground">Meetings</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    All your recorded meeting sessions
                  </p>
                </div>
                <MeetingCards
                  onSelectMeeting={handleMeetingSelect}
                  onCreateTicket={handleMeetingTicketCreate}
                />
              </div>
            </div>
          )}

          {/* ── TICKETS ── */}
          {currentView === 'tickets' && (
            <div className="p-6">
              <div className="max-w-5xl mx-auto">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-foreground">Tickets</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    All extracted tickets across every meeting
                  </p>
                </div>
                <TicketsBoard
                  onSelectMeeting={handleMeetingSelect}
                  onSelectProject={handleProjectSelect}
                  onSaved={refreshWorkspace}
                />
              </div>
            </div>
          )}

          {/* ── TICKET DETAIL ── */}
          {currentView === 'ticket-detail' &&
            (selectedMeeting || searchParams.get('meetingId')) && (
              <div className="p-6 max-w-5xl mx-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewChange('meetings')}
                  className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
                >
                  ← Back to Meetings
                </Button>
                <TicketDetail
                  meetingId={(selectedMeeting ?? searchParams.get('meetingId'))!}
                  onSelectMeeting={handleMeetingSelect}
                  onDeleteMeeting={handleDeleteMeeting}
                />
              </div>
            )}

          {/* ── PROJECTS ── */}
          {currentView === 'projects' && (
            <div className="p-6">
              <ProjectsWorkspace
                projects={projects}
                meetings={meetings}
                tickets={tickets}
                selectedProjectId={null}
                onSelectProject={handleProjectSelect}
                onSelectMeeting={handleMeetingSelect}
                onCreateProject={() => setIsProjectCreateOpen(true)}
                onDeleteProject={handleDeleteProject}
                onRefresh={refreshWorkspace}
              />
            </div>
          )}
        </main>
      </div>

      <ProjectCreateDialog
        open={isProjectCreateOpen}
        onOpenChange={setIsProjectCreateOpen}
        onCreate={handleCreateProject}
      />

      <ManualTicketDialog
        open={isMeetingTicketOpen}
        onOpenChange={setIsMeetingTicketOpen}
        meetings={meetings.map((meeting) => ({ id: meeting.id, projectName: meeting.projectName }))}
        defaultMeetingId={meetingTicketMeetingId}
        onCreated={refreshWorkspace}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
