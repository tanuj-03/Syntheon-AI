// lib/db.ts — Drizzle ORM data-access layer
import { db } from '@/db/index';
import {
  meetings as meetingsTable,
  specs as specsTable,
  tickets as ticketsTable,
  projects as projectsTable,
  ticketDependencies as depsTable,
  ticketAttachments as attachmentsTable,
  ticketComments as commentsTable,
  ticketActivities as activitiesTable,
  projectMembers as membersTable,
  notifications as notificationsTable,
  swarmnetAgents as agentsTable,
  swarmnetRuns as runsTable,
  swarmnetArtifacts as artifactsTable,
} from '@/db/schema';
import { eq, and, desc, asc, inArray, isNull, gte, sql } from 'drizzle-orm';

// ─── Types ─────────────────────────────────────────────────────
export interface Meeting {
  id: string;
  user_id?: string;
  org_id?: string;
  projectName: string;
  meetingId: string;
  platform: string;
  transcript: string;
  specsDetected: number;
  status: 'completed' | 'processing' | 'failed' | 'not_admitted';
  date: string;
  filePath: string;
  botId?: string;
  branchName?: string;
  deployUrl?: string;
  projectId?: string;
  meeting_url?: string;
}

export interface SpecBlock {
  id: string;
  user_id?: string;
  title: string;
  type: 'feature' | 'idea' | 'constraint' | 'improvement';
  confidence: number;
  meeting_id: string;
  timestamp: string;
  note?: string;
  projectId?: string;
  parentSpecId?: string;
}

export interface Ticket {
  id: string;
  user_id?: string;
  org_id?: string;
  meeting_id: string | null;
  projectId?: string;
  parent_id?: string | null;
  title: string;
  description: string;
  status: 'backlog' | 'in_progress' | 'done' | 'blocked';
  assignee?: string | null;
  assignee_user_id?: string | null;
  dependency_ticket_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  deadline_time?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  user_id?: string;
  org_id?: string;
  name: string;
  repo: string;
  deployUrl?: string;
  branchBase: string;
  meetings: string[];
  ticketIds: string[];
  files: string[];
  context: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  project_id?: string | null;
  user_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  file_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  project_id?: string | null;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers — map Drizzle rows to app types ───────────────────
function ts(d: Date | null | undefined): string {
  return d?.toISOString() ?? new Date().toISOString();
}

function rowToMeeting(row: typeof meetingsTable.$inferSelect): Meeting {
  return {
    id: row.id,
    user_id: row.userId ?? undefined,
    org_id: row.orgId ?? undefined,
    projectName: row.projectName,
    meetingId: row.meetingId,
    platform: row.platform,
    transcript: row.transcript ?? '',
    specsDetected: row.specsDetected ?? 0,
    status: row.status as Meeting['status'],
    date: row.date,
    filePath: row.filePath ?? '',
    botId: row.botId ?? undefined,
    branchName: row.branchName ?? undefined,
    deployUrl: row.deployUrl ?? undefined,
    projectId: row.projectId ?? undefined,
    meeting_url: row.meetingUrl ?? undefined,
  };
}

function rowToTicket(row: typeof ticketsTable.$inferSelect): Ticket {
  return {
    id: row.id,
    user_id: row.userId ?? undefined,
    org_id: row.orgId ?? undefined,
    meeting_id: row.meetingId ?? null,
    projectId: row.projectId ?? undefined,
    parent_id: row.parentId ?? null,
    title: row.title,
    description: row.description ?? '',
    status: row.status as Ticket['status'],
    assignee: row.assignee ?? null,
    assignee_user_id: row.assigneeUserId ?? null,
    dependency_ticket_id: row.dependencyTicketId ?? null,
    start_date: row.startDate ?? null,
    due_date: row.dueDate ?? null,
    deadline_time: row.deadlineTime ?? null,
    createdAt: ts(row.createdAt),
    updatedAt: ts(row.updatedAt),
  };
}

function rowToSpec(row: typeof specsTable.$inferSelect): SpecBlock {
  return {
    id: row.id,
    user_id: row.userId ?? undefined,
    title: row.title,
    type: row.type as SpecBlock['type'],
    confidence: row.confidence,
    meeting_id: row.meetingId,
    timestamp: row.timestamp,
    note: row.note ?? undefined,
    projectId: row.projectId ?? undefined,
  };
}

function parseJsonArray(val: string | null): string[] {
  if (!val || val === '[]') return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToProject(row: typeof projectsTable.$inferSelect): Project {
  return {
    id: row.id,
    user_id: row.userId ?? undefined,
    org_id: row.orgId ?? undefined,
    name: row.name,
    repo: row.repo,
    deployUrl: row.deployUrl ?? undefined,
    branchBase: row.branchBase ?? 'main',
    meetings: parseJsonArray(row.meetingsArr),
    ticketIds: parseJsonArray(row.specIds),
    files: parseJsonArray(row.files),
    context: row.context ?? '',
    createdAt: ts(row.createdAt),
    updatedAt: ts(row.updatedAt),
  };
}

// ─── Meetings ───────────────────────────────────────────────────
export async function saveMeeting(meeting: Meeting): Promise<void> {
  await db.insert(meetingsTable).values({
    id: meeting.id,
    userId: meeting.user_id,
    orgId: meeting.org_id ?? null,
    projectId: meeting.projectId ?? null,
    projectName: meeting.projectName,
    meetingId: meeting.meetingId,
    meetingUrl: meeting.meeting_url ?? null,
    platform: meeting.platform,
    transcript: meeting.transcript ?? '',
    specsDetected: meeting.specsDetected,
    status: meeting.status,
    botId: meeting.botId ?? null,
    branchName: meeting.branchName ?? null,
    deployUrl: meeting.deployUrl ?? null,
    filePath: meeting.filePath ?? '',
    date: meeting.date,
  });
}

export async function getMeetings(userId: string): Promise<Meeting[]> {
  const rows = await db
    .select()
    .from(meetingsTable)
    .where(eq(meetingsTable.userId, userId))
    .orderBy(desc(meetingsTable.date));
  return rows.map(rowToMeeting);
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  const [row] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id)).limit(1);
  return row ? rowToMeeting(row) : undefined;
}

export async function getMeetingByBotId(botId: string): Promise<Meeting | undefined> {
  const [row] = await db
    .select()
    .from(meetingsTable)
    .where(eq(meetingsTable.botId, botId))
    .limit(1);
  return row ? rowToMeeting(row) : undefined;
}

export async function updateMeetingStatus(id: string, status: Meeting['status']): Promise<void> {
  await db.update(meetingsTable).set({ status }).where(eq(meetingsTable.id, id));
}

export async function updateMeetingSpecs(
  id: string,
  transcript: string,
  specsDetected: number
): Promise<void> {
  await db
    .update(meetingsTable)
    .set({ transcript, specsDetected, status: 'completed' })
    .where(eq(meetingsTable.id, id));
}

export async function updateMeetingBranch(id: string, branchName: string): Promise<void> {
  await db.update(meetingsTable).set({ branchName }).where(eq(meetingsTable.id, id));
}

export async function updateMeetingDeployUrl(id: string, deployUrl: string): Promise<void> {
  await db.update(meetingsTable).set({ deployUrl }).where(eq(meetingsTable.id, id));
}

export async function updateMeetingName(id: string, projectName: string): Promise<void> {
  await db.update(meetingsTable).set({ projectName }).where(eq(meetingsTable.id, id));
}

export async function deleteMeeting(id: string): Promise<void> {
  await db.delete(meetingsTable).where(eq(meetingsTable.id, id));
}

export async function getActiveMeetingByUrl(meetingUrl: string, userId: string) {
  try {
    const [row] = await db
      .select()
      .from(meetingsTable)
      .where(
        and(
          eq(meetingsTable.userId, userId),
          eq(meetingsTable.meetingUrl, meetingUrl),
          eq(meetingsTable.status, 'processing')
        )
      )
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error('Error fetching active meeting:', error);
    return null;
  }
}

export async function getRecentMeetingByUrl(meetingUrl: string, userId: string) {
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
  try {
    const [row] = await db
      .select()
      .from(meetingsTable)
      .where(
        and(
          eq(meetingsTable.userId, userId),
          eq(meetingsTable.meetingUrl, meetingUrl),
          gte(meetingsTable.date, fiveSecondsAgo)
        )
      )
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error('Error checking recent meeting:', error);
    return null;
  }
}

// ─── Specs ──────────────────────────────────────────────────────
export async function saveSpecs(specsList: SpecBlock[]): Promise<void> {
  if (specsList.length === 0) return;
  await db.insert(specsTable).values(
    specsList.map((s) => ({
      id: s.id,
      userId: s.user_id,
      meetingId: s.meeting_id,
      projectId: s.projectId ?? null,
      title: s.title,
      type: s.type,
      confidence: s.confidence,
      note: s.note ?? null,
      timestamp: s.timestamp,
    }))
  );
}

export async function getSpecsByMeetingId(meetingId: string): Promise<SpecBlock[]> {
  const rows = await db
    .select()
    .from(specsTable)
    .where(eq(specsTable.meetingId, meetingId))
    .orderBy(asc(specsTable.timestamp));
  return rows.map(rowToSpec);
}

export async function getSpecsByProjectId(projectId: string): Promise<SpecBlock[]> {
  const rows = await db
    .select()
    .from(specsTable)
    .where(eq(specsTable.projectId, projectId))
    .orderBy(asc(specsTable.timestamp));
  return rows.map(rowToSpec);
}

export async function getAllSpecs(userId: string): Promise<SpecBlock[]> {
  const rows = await db
    .select()
    .from(specsTable)
    .where(eq(specsTable.userId, userId))
    .orderBy(desc(specsTable.timestamp));
  return rows.map(rowToSpec);
}

export async function updateSpecNote(specId: string, note: string): Promise<void> {
  await db.update(specsTable).set({ note }).where(eq(specsTable.id, specId));
}

export async function deleteSpecsByMeetingId(meetingId: string): Promise<void> {
  await db.delete(specsTable).where(eq(specsTable.meetingId, meetingId));
}

// ─── Projects ───────────────────────────────────────────────────
export async function saveProject(project: Project): Promise<void> {
  await db.insert(projectsTable).values({
    id: project.id,
    userId: project.user_id,
    name: project.name,
    repo: project.repo,
    deployUrl: project.deployUrl ?? null,
    branchBase: project.branchBase,
    meetingsArr: JSON.stringify(project.meetings),
    specIds: JSON.stringify(project.ticketIds),
    files: JSON.stringify(project.files),
    context: project.context,
  });
}

export async function getProjects(userId: string): Promise<Project[]> {
  const rows = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.createdAt));
  return rows.map(rowToProject);
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const [row] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  return row ? rowToProject(row) : undefined;
}

export async function getProjectByMeetingId(meetingId: string): Promise<Project | undefined> {
  const [row] = await db
    .select({ projectId: meetingsTable.projectId })
    .from(meetingsTable)
    .where(eq(meetingsTable.id, meetingId))
    .limit(1);
  if (!row?.projectId) return undefined;
  return getProjectById(row.projectId);
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.name) set.name = updates.name;
  if (updates.deployUrl) set.deployUrl = updates.deployUrl;
  if (updates.context) set.context = updates.context;
  if (updates.files) set.files = JSON.stringify(updates.files);
  if (updates.ticketIds) set.specIds = JSON.stringify(updates.ticketIds);
  if (updates.meetings) set.meetingsArr = JSON.stringify(updates.meetings);

  await db.update(projectsTable).set(set).where(eq(projectsTable.id, id));
}

export async function addMeetingToProject(projectId: string, meetingId: string): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) return;
  const meetingsList = [...new Set([...project.meetings, meetingId])];
  await updateProject(projectId, { meetings: meetingsList });
}

export async function deleteProject(id: string): Promise<void> {
  // Delete ticket dependencies for this project
  await db.delete(depsTable).where(eq(depsTable.projectId, id));

  // Delete all tickets in this project (both with and without meetingId)
  await db.delete(ticketsTable).where(eq(ticketsTable.projectId, id));

  // Unlink meetings
  await db.update(meetingsTable).set({ projectId: null }).where(eq(meetingsTable.projectId, id));

  // Delete project
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
}

export async function saveTickets(ticketsList: Ticket[]): Promise<void> {
  if (ticketsList.length === 0) return;
  await db.insert(ticketsTable).values(
    ticketsList.map((ticket) => ({
      id: ticket.id,
      userId: ticket.user_id,
      orgId: ticket.org_id ?? null,
      meetingId: ticket.meeting_id ?? null,
      projectId: ticket.projectId ?? null,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      assignee: ticket.assignee ?? null,
      assigneeUserId: ticket.assignee_user_id ?? null,
      dependencyTicketId: ticket.dependency_ticket_id ?? null,
    }))
  );
}

function ticketFingerprint(
  ticket: Pick<Ticket, 'meeting_id' | 'title' | 'description' | 'status' | 'assignee'>
) {
  return [
    ticket.meeting_id ?? '',
    ticket.title.trim().toLowerCase(),
    ticket.description.trim().toLowerCase(),
    ticket.status,
    ticket.assignee?.trim().toLowerCase() ?? '',
  ].join('::');
}

export async function saveExtractedTickets(ticketsList: Ticket[]): Promise<Ticket[]> {
  if (ticketsList.length === 0) return [];

  const meetingId = ticketsList[0]?.meeting_id;
  if (!meetingId) return [];

  const existingTickets = await getTicketsByMeetingId(meetingId);
  const existingFingerprints = new Set(existingTickets.map(ticketFingerprint));
  const seenFingerprints = new Set<string>();

  const uniqueTickets = ticketsList.filter((ticket) => {
    const fingerprint = ticketFingerprint(ticket);
    if (existingFingerprints.has(fingerprint) || seenFingerprints.has(fingerprint)) {
      return false;
    }
    seenFingerprints.add(fingerprint);
    return true;
  });

  if (uniqueTickets.length === 0) return [];

  await saveTickets(uniqueTickets);
  return uniqueTickets;
}

export async function getTicketsByMeetingId(
  meetingId: string,
  options?: { originalOnly?: boolean }
): Promise<Ticket[]> {
  const conditions = [eq(ticketsTable.meetingId, meetingId)];
  if (options?.originalOnly) {
    conditions.push(isNull(ticketsTable.projectId));
  }
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(and(...conditions))
    .orderBy(asc(ticketsTable.createdAt));
  return rows.map(rowToTicket);
}

export async function getTicketsByProjectId(projectId: string): Promise<Ticket[]> {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.projectId, projectId))
    .orderBy(asc(ticketsTable.createdAt));
  return rows.map(rowToTicket);
}

export async function getAllTickets(userId: string): Promise<Ticket[]> {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.userId, userId))
    .orderBy(desc(ticketsTable.createdAt));
  const tickets = rows.map(rowToTicket);

  // Deduplicate by (meeting_id + title + description) to avoid showing same ticket multiple times
  const seen = new Set<string>();
  const deduplicated: Ticket[] = [];
  for (const ticket of tickets) {
    const key = `${ticket.meeting_id || 'null'}::${ticket.title.trim().toLowerCase()}::${(ticket.description || '').trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(ticket);
    }
  }
  return deduplicated;
}

export async function getTicketById(id: string): Promise<Ticket | null> {
  const [row] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  return row ? rowToTicket(row) : null;
}

export async function updateTicketStatus(id: string, status: Ticket['status']): Promise<void> {
  await db
    .update(ticketsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ticketsTable.id, id));
}

export async function updateTicketAssignee(
  id: string,
  assignee: string | null,
  assigneeUserId: string | null = null
): Promise<void> {
  await db
    .update(ticketsTable)
    .set({ assignee, assigneeUserId, updatedAt: new Date() })
    .where(eq(ticketsTable.id, id));
}

export async function updateTicketDependency(
  id: string,
  dependencyTicketId: string | null
): Promise<void> {
  await db
    .update(ticketsTable)
    .set({ dependencyTicketId, updatedAt: new Date() })
    .where(eq(ticketsTable.id, id));
}

export async function updateTicket(
  id: string,
  updates: Partial<
    Pick<
      Ticket,
      | 'title'
      | 'description'
      | 'status'
      | 'assignee'
      | 'assignee_user_id'
      | 'dependency_ticket_id'
      | 'start_date'
      | 'due_date'
      | 'deadline_time'
    >
  >
): Promise<void> {
  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof updates.title !== 'undefined') set.title = updates.title;
  if (typeof updates.description !== 'undefined') set.description = updates.description;
  if (typeof updates.status !== 'undefined') set.status = updates.status;
  if (typeof updates.assignee !== 'undefined') set.assignee = updates.assignee;
  if (typeof updates.assignee_user_id !== 'undefined') {
    set.assigneeUserId = updates.assignee_user_id;
  }
  if (typeof updates.dependency_ticket_id !== 'undefined') {
    set.dependencyTicketId = updates.dependency_ticket_id;
  }
  if (typeof updates.start_date !== 'undefined') set.startDate = updates.start_date;
  if (typeof updates.due_date !== 'undefined') set.dueDate = updates.due_date;
  if (typeof updates.deadline_time !== 'undefined') set.deadlineTime = updates.deadline_time;

  await db.update(ticketsTable).set(set).where(eq(ticketsTable.id, id));
}

export async function deleteTicketById(id: string): Promise<void> {
  await db.delete(ticketsTable).where(eq(ticketsTable.id, id));
}

export async function deleteTicketsByMeetingId(meetingId: string): Promise<void> {
  await db.delete(ticketsTable).where(eq(ticketsTable.meetingId, meetingId));
}

export async function addTicketsToProject(projectId: string, ticketIds: string[]): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) return;
  const merged = [...new Set([...project.ticketIds, ...ticketIds])];
  await updateProject(projectId, { ticketIds: merged });

  await db.update(ticketsTable).set({ projectId }).where(inArray(ticketsTable.id, ticketIds));
}

export async function addFilesToProject(projectId: string, files: string[]): Promise<void> {
  const project = await getProjectById(projectId);
  if (!project) return;
  const merged = [...new Set([...project.files, ...files])];
  await updateProject(projectId, { files: merged });
}

export async function updateMeetingSpecs2(
  id: string,
  transcript: string,
  specsDetected: number
): Promise<void> {
  await updateMeetingSpecs(id, transcript, specsDetected);
}

// ─── Ticket Dependencies ────────────────────────────────────────

export type DependencyType = 'data' | 'structural' | 'logical' | 'resource';
export type DependencyStrength = 'soft' | 'hard';

export interface TicketDependency {
  id: string;
  project_id: string;
  ticket_id: string;
  depends_on_ticket_id: string;
  dependency_type: DependencyType;
  strength: DependencyStrength;
  note?: string | null;
  ignore_count: number;
  escalated: boolean;
  created_at: string;
  updated_at: string;
}

function rowToTicketDependency(row: typeof depsTable.$inferSelect): TicketDependency {
  return {
    id: row.id,
    project_id: row.projectId,
    ticket_id: row.ticketId,
    depends_on_ticket_id: row.dependsOnTicketId,
    dependency_type: row.dependencyType as DependencyType,
    strength: row.strength as DependencyStrength,
    note: row.note ?? null,
    ignore_count: row.ignoreCount ?? 0,
    escalated: row.escalated ?? false,
    created_at: ts(row.createdAt),
    updated_at: ts(row.updatedAt),
  };
}

export async function getDependenciesForTicket(ticketId: string): Promise<{
  parents: TicketDependency[];
  children: TicketDependency[];
}> {
  const [parents, children] = await Promise.all([
    db
      .select()
      .from(depsTable)
      .where(eq(depsTable.ticketId, ticketId))
      .orderBy(asc(depsTable.createdAt)),
    db
      .select()
      .from(depsTable)
      .where(eq(depsTable.dependsOnTicketId, ticketId))
      .orderBy(asc(depsTable.createdAt)),
  ]);
  return {
    parents: parents.map(rowToTicketDependency),
    children: children.map(rowToTicketDependency),
  };
}

export async function getDependenciesForProject(projectId: string): Promise<TicketDependency[]> {
  const rows = await db
    .select()
    .from(depsTable)
    .where(eq(depsTable.projectId, projectId))
    .orderBy(asc(depsTable.createdAt));
  return rows.map(rowToTicketDependency);
}

async function _hasPath(fromId: string, toId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue: string[] = [fromId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const rows = await db
      .select({ dependsOnTicketId: depsTable.dependsOnTicketId })
      .from(depsTable)
      .where(eq(depsTable.ticketId, current));
    for (const row of rows) {
      if (!visited.has(row.dependsOnTicketId)) {
        queue.push(row.dependsOnTicketId);
      }
    }
  }
  return false;
}

export async function createDependency(dep: {
  id: string;
  project_id: string;
  ticket_id: string;
  depends_on_ticket_id: string;
  dependency_type: DependencyType;
  strength: DependencyStrength;
  note?: string | null;
}): Promise<{ error?: string }> {
  if (dep.ticket_id === dep.depends_on_ticket_id) {
    return { error: 'A ticket cannot depend on itself.' };
  }

  const [parentTicket] = await db
    .select({ projectId: ticketsTable.projectId })
    .from(ticketsTable)
    .where(eq(ticketsTable.id, dep.depends_on_ticket_id))
    .limit(1);
  if (!parentTicket) {
    return { error: 'Parent ticket not found.' };
  }
  if (parentTicket.projectId !== dep.project_id) {
    return { error: 'Cross-project dependencies are not allowed.' };
  }

  const cycleExists = await _hasPath(dep.depends_on_ticket_id, dep.ticket_id);
  if (cycleExists) {
    return {
      error:
        'Cannot add dependency: this would create a circular dependency. The selected ticket already depends on this ticket (directly or indirectly).',
    };
  }

  const [existing] = await db
    .select({ id: depsTable.id })
    .from(depsTable)
    .where(
      and(
        eq(depsTable.ticketId, dep.ticket_id),
        eq(depsTable.dependsOnTicketId, dep.depends_on_ticket_id)
      )
    )
    .limit(1);
  if (existing) {
    return { error: 'This dependency already exists.' };
  }

  try {
    await db.insert(depsTable).values({
      id: dep.id,
      projectId: dep.project_id,
      ticketId: dep.ticket_id,
      dependsOnTicketId: dep.depends_on_ticket_id,
      dependencyType: dep.dependency_type,
      strength: dep.strength,
      note: dep.note ?? null,
      ignoreCount: 0,
      escalated: false,
    });
    return {};
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteDependency(id: string): Promise<void> {
  await db.delete(depsTable).where(eq(depsTable.id, id));
}

export async function incrementDependencyIgnoreCount(id: string): Promise<void> {
  const [row] = await db
    .select({ ignoreCount: depsTable.ignoreCount, strength: depsTable.strength })
    .from(depsTable)
    .where(eq(depsTable.id, id))
    .limit(1);
  if (!row) return;

  const newCount = (row.ignoreCount ?? 0) + 1;
  const shouldEscalate = row.strength === 'soft' && newCount >= 3;
  await db
    .update(depsTable)
    .set({
      ignoreCount: newCount,
      escalated: shouldEscalate || undefined,
      strength: shouldEscalate ? 'hard' : row.strength,
      updatedAt: new Date(),
    })
    .where(eq(depsTable.id, id));
}

export async function checkHardBlockers(ticketId: string): Promise<{
  blocked: boolean;
  blockers: TicketDependency[];
}> {
  const { parents } = await getDependenciesForTicket(ticketId);
  const hardParents = parents.filter((d) => d.strength === 'hard' || d.escalated);
  if (hardParents.length === 0) return { blocked: false, blockers: [] };

  const parentIds = hardParents.map((d) => d.depends_on_ticket_id);
  const parentTickets = await db
    .select({ id: ticketsTable.id, status: ticketsTable.status })
    .from(ticketsTable)
    .where(inArray(ticketsTable.id, parentIds));

  const unresolved = hardParents.filter((dep) => {
    const parent = parentTickets.find((t) => t.id === dep.depends_on_ticket_id);
    return parent?.status !== 'done';
  });

  return { blocked: unresolved.length > 0, blockers: unresolved };
}

export async function cascadeDepRegressionForParent(parentId: string): Promise<void> {
  const { children } = await getDependenciesForTicket(parentId);
  if (children.length === 0) return;

  const childIds = children.map((d) => d.ticket_id);
  const childTickets = await db
    .select({ id: ticketsTable.id, status: ticketsTable.status })
    .from(ticketsTable)
    .where(inArray(ticketsTable.id, childIds));

  const toBlock = childTickets
    .filter((t) => t.status === 'done' || t.status === 'in_progress')
    .map((t) => t.id);

  if (toBlock.length === 0) return;

  await db
    .update(ticketsTable)
    .set({ status: 'blocked', updatedAt: new Date() })
    .where(inArray(ticketsTable.id, toBlock));
}

// ─── Attachments ───────────────────────────────────────────────
export async function getAttachmentsForTicket(ticketId: string): Promise<TicketAttachment[]> {
  const rows = await db
    .select()
    .from(attachmentsTable)
    .where(eq(attachmentsTable.ticketId, ticketId))
    .orderBy(desc(attachmentsTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    ticket_id: row.ticketId,
    project_id: row.projectId,
    user_id: row.userId,
    filename: row.filename,
    file_url: row.fileUrl,
    file_size: row.fileSize,
    file_type: row.fileType,
    created_at: ts(row.createdAt),
    updated_at: ts(row.updatedAt),
  }));
}

export async function createAttachment(
  attachment: Omit<TicketAttachment, 'id' | 'created_at' | 'updated_at'>
): Promise<TicketAttachment> {
  const [data] = await db
    .insert(attachmentsTable)
    .values({
      ticketId: attachment.ticket_id,
      projectId: attachment.project_id,
      userId: attachment.user_id,
      filename: attachment.filename,
      fileUrl: attachment.file_url,
      fileSize: attachment.file_size,
      fileType: attachment.file_type,
    })
    .returning();
  return {
    id: data.id,
    ticket_id: data.ticketId,
    project_id: data.projectId,
    user_id: data.userId,
    filename: data.filename,
    file_url: data.fileUrl,
    file_size: data.fileSize,
    file_type: data.fileType,
    created_at: ts(data.createdAt),
    updated_at: ts(data.updatedAt),
  };
}

export async function deleteAttachment(id: string): Promise<void> {
  await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id));
}

// ─── Comments ────────────────────────────────────────────────────
export async function getCommentsForTicket(ticketId: string): Promise<TicketComment[]> {
  const rows = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.ticketId, ticketId))
    .orderBy(asc(commentsTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    ticket_id: row.ticketId,
    project_id: row.projectId,
    user_id: row.userId,
    content: row.content,
    created_at: ts(row.createdAt),
    updated_at: ts(row.updatedAt),
  }));
}

export async function createComment(
  comment: Omit<TicketComment, 'id' | 'created_at' | 'updated_at'>
): Promise<TicketComment> {
  const [data] = await db
    .insert(commentsTable)
    .values({
      ticketId: comment.ticket_id,
      projectId: comment.project_id,
      userId: comment.user_id,
      content: comment.content,
    })
    .returning();
  return {
    id: data.id,
    ticket_id: data.ticketId,
    project_id: data.projectId,
    user_id: data.userId,
    content: data.content,
    created_at: ts(data.createdAt),
    updated_at: ts(data.updatedAt),
  };
}

export async function deleteComment(id: string): Promise<void> {
  await db.delete(commentsTable).where(eq(commentsTable.id, id));
}

export async function updateComment(id: string, content: string): Promise<TicketComment> {
  const [data] = await db
    .update(commentsTable)
    .set({ content, updatedAt: new Date() })
    .where(eq(commentsTable.id, id))
    .returning();
  return {
    id: data.id,
    ticket_id: data.ticketId,
    project_id: data.projectId,
    user_id: data.userId,
    content: data.content,
    created_at: ts(data.createdAt),
    updated_at: ts(data.updatedAt),
  };
}

// ─── Activities ────────────────────────────────────────────────────
export interface TicketActivity {
  id: string;
  ticket_id: string;
  user_id: string;
  action_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getActivitiesForTicket(ticketId: string): Promise<TicketActivity[]> {
  const rows = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.ticketId, ticketId))
    .orderBy(desc(activitiesTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    ticket_id: row.ticketId,
    user_id: row.userId,
    action_type: row.actionType,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: ts(row.createdAt),
  }));
}

export async function createActivity(
  activity: Omit<TicketActivity, 'id' | 'created_at'>
): Promise<TicketActivity> {
  const [data] = await db
    .insert(activitiesTable)
    .values({
      ticketId: activity.ticket_id,
      userId: activity.user_id,
      actionType: activity.action_type,
      metadata: activity.metadata || {},
    })
    .returning();
  if (!data) throw new Error('Failed to create activity');
  return {
    id: data.id,
    ticket_id: data.ticketId,
    user_id: data.userId,
    action_type: data.actionType,
    metadata: (data.metadata as Record<string, unknown>) ?? {},
    created_at: ts(data.createdAt),
  };
}

// ─── Legacy compatibility (db.json style) ──────────────────────
// These are kept so old code doesn't break during migration
export function loadDB() {
  throw new Error('loadDB is deprecated — use Drizzle async functions');
}

export function saveDB() {
  throw new Error('saveDB is deprecated — use Drizzle async functions');
}

// ─── Org-scoped functions ───────────────────────────────────────

export async function getProjectsByOrg(orgId: string): Promise<Project[]> {
  const rows = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.orgId, orgId))
    .orderBy(desc(projectsTable.createdAt));
  return rows.map(rowToProject);
}

export async function getMeetingsByOrg(orgId: string): Promise<Meeting[]> {
  const rows = await db
    .select()
    .from(meetingsTable)
    .where(eq(meetingsTable.orgId, orgId))
    .orderBy(desc(meetingsTable.date));
  return rows.map(rowToMeeting);
}

export async function getAllTicketsByOrg(orgId: string): Promise<Ticket[]> {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.orgId, orgId))
    .orderBy(desc(ticketsTable.createdAt));
  const tickets = rows.map(rowToTicket);

  // Deduplicate by (meeting_id + title + description) to avoid showing same ticket multiple times
  const seen = new Set<string>();
  const deduplicated: Ticket[] = [];
  for (const ticket of tickets) {
    const key = `${ticket.meeting_id || 'null'}::${ticket.title.trim().toLowerCase()}::${(ticket.description || '').trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(ticket);
    }
  }
  return deduplicated;
}

export async function saveProjectForOrg(project: Project & { org_id: string }): Promise<void> {
  await db.insert(projectsTable).values({
    id: project.id,
    userId: project.user_id,
    orgId: project.org_id,
    name: project.name,
    repo: project.repo ?? '',
    deployUrl: project.deployUrl ?? null,
    branchBase: project.branchBase ?? '',
    meetingsArr: JSON.stringify(project.meetings ?? []),
    specIds: JSON.stringify(project.ticketIds ?? []),
    files: JSON.stringify(project.files ?? []),
    context: project.context ?? '',
  });
}

export async function saveMeetingForOrg(meeting: Meeting & { org_id: string }): Promise<void> {
  await db.insert(meetingsTable).values({
    id: meeting.id,
    userId: meeting.user_id,
    orgId: meeting.org_id,
    projectId: meeting.projectId ?? null,
    projectName: meeting.projectName,
    meetingId: meeting.meetingId,
    meetingUrl: meeting.meeting_url ?? null,
    platform: meeting.platform,
    transcript: meeting.transcript ?? '',
    specsDetected: meeting.specsDetected,
    status: meeting.status,
    botId: meeting.botId ?? null,
    branchName: meeting.branchName ?? null,
    deployUrl: meeting.deployUrl ?? null,
    filePath: meeting.filePath ?? '',
    date: meeting.date,
  });
}

// ─── Project Members ────────────────────────────────────────────

export interface ProjectMember {
  id: string;
  project_id: string;
  org_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

export async function addProjectMember(
  projectId: string,
  orgId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  await db
    .insert(membersTable)
    .values({ projectId, orgId, userId, role })
    .onConflictDoUpdate({
      target: [membersTable.projectId, membersTable.userId],
      set: { role },
    });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  await db
    .delete(membersTable)
    .where(and(eq(membersTable.projectId, projectId), eq(membersTable.userId, userId)));
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const rows = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.projectId, projectId))
    .orderBy(asc(membersTable.createdAt));
  return rows.map((row) => ({
    id: row.id,
    project_id: row.projectId,
    org_id: row.orgId,
    user_id: row.userId,
    role: row.role as 'admin' | 'member',
    created_at: ts(row.createdAt),
  }));
}

export async function getProjectsForMember(orgId: string, userId: string): Promise<Project[]> {
  const memberRows = await db
    .select({ projectId: membersTable.projectId })
    .from(membersTable)
    .where(and(eq(membersTable.orgId, orgId), eq(membersTable.userId, userId)));

  const projectIds = memberRows.map((r) => r.projectId);
  if (projectIds.length === 0) return [];

  const rows = await db
    .select()
    .from(projectsTable)
    .where(inArray(projectsTable.id, projectIds))
    .orderBy(desc(projectsTable.createdAt));
  return rows.map(rowToProject);
}

export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.projectId, projectId), eq(membersTable.userId, userId)))
    .limit(1);
  return !!row;
}

// ─── Notifications ──────────────────────────────────────────────

export interface Notification {
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

export async function createNotification(
  values: Omit<Notification, 'id' | 'created_at' | 'read'>
): Promise<Notification> {
  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId: values.user_id,
      orgId: values.org_id,
      type: values.type,
      title: values.title,
      message: values.message ?? null,
      ticketId: values.ticket_id ?? null,
    })
    .returning();
  return {
    id: row.id,
    user_id: row.userId,
    org_id: row.orgId,
    type: row.type as Notification['type'],
    title: row.title,
    message: row.message ?? undefined,
    ticket_id: row.ticketId ?? undefined,
    read: row.read ?? false,
    created_at: ts(row.createdAt),
  };
}

export async function getNotificationsForUser(
  userId: string,
  orgId: string,
  limit = 20
): Promise<Notification[]> {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.orgId, orgId)))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    org_id: row.orgId,
    type: row.type as Notification['type'],
    title: row.title,
    message: row.message ?? undefined,
    ticket_id: row.ticketId ?? undefined,
    read: row.read ?? false,
    created_at: ts(row.createdAt),
  }));
}

export async function getUnreadNotificationCount(userId: string, orgId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.orgId, orgId),
        eq(notificationsTable.read, false)
      )
    );
  return Number(row?.count ?? 0);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id));
}

export async function markAllNotificationsAsRead(userId: string, orgId: string): Promise<void> {
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.orgId, orgId),
        eq(notificationsTable.read, false)
      )
    );
}

// ─── SwarmNet Runs ─────────────────────────────────────────────

export interface SwarmnetRun {
  id: string;
  org_id: string;
  project_id?: string;
  ticket_id: string;
  agent_id: string;
  status: string;
  branch_name?: string;
  pr_number?: number;
  pr_url?: string;
  error_message?: string;
  current_task?: string;
  steps?: any[];
  files_created?: string[];
  files_modified?: string[];
  created_at: string;
  updated_at: string;
}

export async function createSwarmnetRun(values: {
  id: string;
  orgId: string;
  projectId?: string;
  ticketId: string;
  agentId: string;
  status: string;
  branchName?: string;
}): Promise<void> {
  await db.insert(runsTable).values({
    id: values.id,
    orgId: values.orgId,
    projectId: values.projectId ?? null,
    ticketId: values.ticketId,
    agentId: values.agentId,
    status: values.status,
    branchName: values.branchName ?? null,
  });
}

export async function getSwarmnetRun(id: string): Promise<SwarmnetRun | null> {
  const [row] = await db.select().from(runsTable).where(eq(runsTable.id, id)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    org_id: row.orgId,
    project_id: row.projectId ?? undefined,
    ticket_id: row.ticketId,
    agent_id: row.agentId,
    status: row.status,
    branch_name: row.branchName ?? undefined,
    pr_number: row.prNumber ?? undefined,
    pr_url: row.prUrl ?? undefined,
    error_message: row.errorMessage ?? undefined,
    current_task: row.currentTask ?? undefined,
    steps: row.steps as any[] | undefined,
    files_created: row.filesCreated ?? undefined,
    files_modified: row.filesModified ?? undefined,
    created_at: ts(row.createdAt),
    updated_at: ts(row.updatedAt),
  };
}

export async function updateSwarmnetRun(
  id: string,
  values: Partial<{
    status: string;
    branchName: string;
    headCommitSha: string;
    prNumber: number;
    prUrl: string;
    errorMessage: string;
    currentTask: string;
    steps: any[];
    filesCreated: string[];
    filesModified: string[];
    completedAt: Date;
  }>
): Promise<void> {
  await db.update(runsTable).set(values).where(eq(runsTable.id, id));
}

export async function createSwarmnetArtifact(values: {
  runId: string;
  filePath: string;
  content: string;
  isNew: boolean;
}): Promise<void> {
  await db.insert(artifactsTable).values({
    runId: values.runId,
    filePath: values.filePath,
    content: values.content,
    isNew: values.isNew,
  });
}
