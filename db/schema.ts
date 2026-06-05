// db/schema.ts — Drizzle ORM schema for Supabase PostgreSQL
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Users ─────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  plan: text('plan').default('starter'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── API Keys ──────────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  keyHash: text('key_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Meetings ──────────────────────────────────────────────────
export const meetings = pgTable(
  'meetings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    orgId: text('org_id'),
    projectId: text('project_id'),
    projectName: text('project_name').notNull(),
    meetingId: text('meeting_id').notNull(),
    meetingUrl: text('meeting_url'),
    platform: text('platform').notNull(),
    transcript: text('transcript').default(''),
    specsDetected: integer('specs_detected').default(0),
    status: text('status').default('processing'),
    botId: text('bot_id'),
    branchName: text('branch_name'),
    deployUrl: text('deploy_url'),
    filePath: text('file_path').default(''),
    date: text('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('meetings_org_id_idx').on(table.orgId)]
);

// ─── Specs (legacy) ────────────────────────────────────────────
export const specs = pgTable('specs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  title: text('title').notNull(),
  type: text('type').notNull(),
  confidence: real('confidence').notNull(),
  meetingId: text('meeting_id').notNull(),
  timestamp: text('timestamp').notNull(),
  note: text('note'),
  projectId: text('project_id'),
  parentSpecId: text('parent_spec_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Tickets ───────────────────────────────────────────────────
export const tickets = pgTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    orgId: text('org_id'),
    meetingId: text('meeting_id'),
    projectId: text('project_id'),
    parentId: text('parent_id'),
    title: text('title').notNull(),
    description: text('description').default(''),
    status: text('status').default('backlog'),
    assignee: text('assignee'),
    assigneeUserId: text('assignee_user_id'),
    dependencyTicketId: text('dependency_ticket_id'),
    startDate: text('start_date'),
    dueDate: text('due_date'),
    deadlineTime: text('deadline_time'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('tickets_meeting_id_idx').on(table.meetingId),
    index('tickets_project_id_idx').on(table.projectId),
    index('tickets_org_id_idx').on(table.orgId),
  ]
);

// ─── Projects ──────────────────────────────────────────────────
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  orgId: text('org_id'),
  name: text('name').notNull(),
  repo: text('repo').notNull(),
  deployUrl: text('deploy_url'),
  branchBase: text('branch_base').default('main'),
  meetingsArr: text('meetings').notNull().default('[]'),
  specIds: text('spec_ids').notNull().default('[]'),
  files: text('files').notNull().default('[]'),
  context: text('context').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Ticket Dependencies ───────────────────────────────────────
export const ticketDependencies = pgTable(
  'ticket_dependencies',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    ticketId: text('ticket_id').notNull(),
    dependsOnTicketId: text('depends_on_ticket_id').notNull(),
    dependencyType: text('dependency_type').default('hard'),
    strength: text('strength').default('strong'),
    note: text('note'),
    ignoreCount: integer('ignore_count').default(0),
    escalated: boolean('escalated').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex('ticket_depends_on_unique').on(table.ticketId, table.dependsOnTicketId)]
);

// ─── Ticket Attachments ────────────────────────────────────────
export const ticketAttachments = pgTable('ticket_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: text('ticket_id').notNull(),
  projectId: text('project_id'),
  userId: text('user_id').notNull(),
  filename: text('filename').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Ticket Comments ───────────────────────────────────────────
export const ticketComments = pgTable('ticket_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: text('ticket_id').notNull(),
  projectId: text('project_id'),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Ticket Activities ─────────────────────────────────────────
export const ticketActivities = pgTable('ticket_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticketId: text('ticket_id').notNull(),
  userId: text('user_id').notNull(),
  actionType: text('action_type').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Integrations ──────────────────────────────────────────────
export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').unique().notNull(),
  githubToken: text('github_token'),
  githubOwner: text('github_owner'),
  githubAccessToken: text('github_access_token'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Project Members ───────────────────────────────────────────
export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: text('project_id').notNull(),
    orgId: text('org_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex('project_user_unique').on(table.projectId, table.userId)]
);

// ─── Notifications ─────────────────────────────────────────────
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    orgId: text('org_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message'),
    ticketId: text('ticket_id'),
    read: boolean('read').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_org_id_idx').on(table.orgId),
    index('notifications_read_idx').on(table.read),
  ]
);

// ─── Relations ─────────────────────────────────────────────────
export const meetingsRelations = relations(meetings, ({ many }) => ({
  tickets: many(tickets),
  specs: many(specs),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  meeting: one(meetings, { fields: [tickets.meetingId], references: [meetings.id] }),
  project: one(projects, { fields: [tickets.projectId], references: [projects.id] }),
  dependencies: many(ticketDependencies, { relationName: 'TicketDependent' }),
  blocking: many(ticketDependencies, { relationName: 'TicketBlocking' }),
  attachments: many(ticketAttachments),
  comments: many(ticketComments),
  activities: many(ticketActivities),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  tickets: many(tickets),
  members: many(projectMembers),
}));

export const ticketDependenciesRelations = relations(ticketDependencies, ({ one }) => ({
  ticket: one(tickets, {
    relationName: 'TicketDependent',
    fields: [ticketDependencies.ticketId],
    references: [tickets.id],
  }),
  dependsOnTicket: one(tickets, {
    relationName: 'TicketBlocking',
    fields: [ticketDependencies.dependsOnTicketId],
    references: [tickets.id],
  }),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketAttachments.ticketId], references: [tickets.id] }),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
}));

export const ticketActivitiesRelations = relations(ticketActivities, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketActivities.ticketId], references: [tickets.id] }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
}));

// ─── SwarmNet Agents ───────────────────────────────────────────
export const swarmnetAgents = pgTable(
  'swarmnet_agents',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    name: text('name').notNull(),
    domain: text('domain').notNull(),
    persona: text('persona').notNull(),
    model: text('model').default('llama-3.3-70b-versatile').notNull(),
    trustLevel: text('trust_level').default('medium').notNull(),
    keywords: text('keywords').array().default([]).notNull(),
    filePatterns: text('file_patterns').array().default([]).notNull(),
    capabilities: text('capabilities').array().default([]).notNull(),
    maxActiveTickets: integer('max_active_tickets').default(1).notNull(),
    isCustom: boolean('is_custom').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('swarmnet_agents_org_domain_idx').on(table.orgId, table.domain)]
);

// ─── SwarmNet Runs ─────────────────────────────────────────────
export const swarmnetRuns = pgTable(
  'swarmnet_runs',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    projectId: text('project_id'),
    ticketId: text('ticket_id').notNull(),
    agentId: text('agent_id').notNull(),
    status: text('status').default('claimed').notNull(),
    branchName: text('branch_name'),
    baseCommitSha: text('base_commit_sha'),
    headCommitSha: text('head_commit_sha'),
    prNumber: integer('pr_number'),
    prUrl: text('pr_url'),
    modelUsed: text('model_used'),
    promptTokens: integer('prompt_tokens').default(0),
    completionTokens: integer('completion_tokens').default(0),
    costUsd: real('cost_usd').default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
    filesModified: text('files_modified').array().default([]),
    filesCreated: text('files_created').array().default([]),
    testResults: jsonb('test_results'),
    securityScan: jsonb('security_scan'),
    errorMessage: text('error_message'),
    currentTask: text('current_task'),
    steps: jsonb('steps').default('[]'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('swarmnet_runs_org_status_idx').on(table.orgId, table.status),
    index('swarmnet_runs_ticket_idx').on(table.ticketId),
    index('swarmnet_runs_agent_idx').on(table.agentId),
  ]
);

// ─── SwarmNet Artifacts ────────────────────────────────────────
export const swarmnetArtifacts = pgTable(
  'swarmnet_artifacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => swarmnetRuns.id, { onDelete: 'cascade' }),
    filePath: text('file_path').notNull(),
    content: text('content').notNull(),
    isNew: boolean('is_new').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('swarmnet_artifacts_run_idx').on(table.runId)]
);
