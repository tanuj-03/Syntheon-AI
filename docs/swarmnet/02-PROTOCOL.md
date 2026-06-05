# SwarmNet — Agent Communication Protocol

> Agents don't have a separate chat room. They talk through Syntheon's existing data model: tickets, comments, activities, and notifications.

---

## Core Insight

Syntheon already has the primitives we need:

| Primitive        | Human Use                          | Agent Use                                   |
| ---------------- | ---------------------------------- | ------------------------------------------- |
| **Ticket**       | Track work                         | Agent's task definition                     |
| **Comment**      | Discuss details                    | Agent reports findings, asks questions      |
| **Activity**     | Audit trail                        | Agent action log                            |
| **Notification** | Get alerted                        | Agent gets pinged when dependencies resolve |
| **Status**       | `backlog` → `in_progress` → `done` | Agent lifecycle state                       |

This means the entire SwarmNet protocol is **just data in existing tables**. No new message queue needed.

---

## The Agent Protocol (Formal Spec)

### 1. Ticket as Task Contract

When an agent claims a ticket, it becomes the **assignee**. The ticket is the single source of truth.

```
Ticket: "Build notification bell component"
├── Status: backlog → in_progress → done
├── Assignee: agent:frontend
├── Dependencies: ["ticket-abc123"]  ← waits for BackendAgent
├── Comments: [agent discussion history]
└── Activities: [claim, commit, test, merge events]
```

### 2. Comment as Agent Message Bus

Comments have a special format for agent-to-agent communication:

**Agent Status Report (auto-posted):**

```
[AGENT: FrontendAgent] 🔄 Status Update

Claimed this ticket. Reading repo for existing patterns...
Found 3 similar components in /components/ui/
Proceeding with implementation.
```

**Agent Question (asking another agent for context):**

```
[AGENT: FrontendAgent] ❓ Question for @BackendAgent

The notification dropdown needs real-time unread count.
What's the endpoint for GET /api/notifications?unread=true?
I need the response shape before I can build the UI.
```

**Agent Answer:**

```
[AGENT: BackendAgent] ✅ Response

Endpoint: GET /api/notifications?unread=true
Response: { count: number }

Also note: POST /api/notifications to create (admin only)
```

**Agent Blocked (needs human help):**

```
[AGENT: FrontendAgent] 🚫 Blocked

Cannot proceed — the design requires a "mark all read" action
but the API doesn't have PATCH /api/notifications/read-all.

Suggested fix: Create the endpoint or remove the "mark all read" button.

@bhuvangs please advise.
```

### 3. Activity as Audit Trail

Every agent action is logged as an `ticketActivities` row:

```typescript
// Agent claims ticket
{
  ticket_id: "ticket-xyz",
  user_id: "agent:frontend",     // ← agent ID as user_id
  action_type: "agent_claimed",
  metadata: { agent: "frontend", timestamp: "..." }
}

// Agent commits code
{
  ticket_id: "ticket-xyz",
  user_id: "agent:frontend",
  action_type: "agent_committed",
  metadata: {
    branch: "feature/notification-bell",
    commit_sha: "abc123...",
    files: ["components/notification-bell.tsx"]
  }
}

// Agent opens PR
{
  ticket_id: "ticket-xyz",
  user_id: "agent:frontend",
  action_type: "agent_pr_opened",
  metadata: { pr_number: 42, url: "https://github.com/..." }
}

// SecurityAgent blocks PR
{
  ticket_id: "ticket-xyz",
  user_id: "agent:security",
  action_type: "agent_blocked",
  metadata: { reason: "XSS vulnerability in dangerouslySetInnerHTML", severity: "critical" }
}
```

### 4. Notification as Agent Pager

Agents use notifications to wake each other up:

```typescript
// BackendAgent finishes API → FrontendAgent gets notified
{
  user_id: "agent:frontend",     // ← recipient is another agent!
  org_id: "org-123",
  type: "assigned",              // reusing existing type
  title: "Dependency resolved",
  message: "BackendAgent completed the notifications API. You can now build the UI.",
  ticket_id: "ticket-frontend-789"
}
```

This is **key**: The existing notification system works for agents too because we just use `agent:frontend` as the `user_id`.

---

## Communication Patterns

### Pattern A: Sequential Dependency

```
Ticket A: "Create notifications table"        → DatabaseAgent
     ↓ (dependency)
Ticket B: "Build notification bell UI"         → FrontendAgent
     ↓ (dependency)
Ticket C: "Write tests for notifications"      → TestAgent
```

Flow:

1. DatabaseAgent claims A, implements, commits, opens PR
2. PR merged → Orchestrator posts notification to FrontendAgent
3. FrontendAgent claims B, implements, commits, opens PR
4. TestAgent auto-runs on PR, passes
5. PR merged → Orchestrator posts notification to TestAgent
6. TestAgent claims C, writes tests, opens PR

### Pattern B: Parallel Independent Work

```
Ticket D: "Add dark mode toggle"               → FrontendAgent
Ticket E: "Add API rate limiting"              → BackendAgent
Ticket F: "Update README with setup steps"     → FrontendAgent (docs)
```

All three agents claim simultaneously. No dependencies. Three independent PRs.

### Pattern C: Collaborative Same-File

```
Ticket G: "Add due date to ticket cards"       → FrontendAgent
     └─ Needs: Ticket H (API endpoint for due dates) → BackendAgent
```

BackendAgent commits `app/api/tickets/[id]/route.ts` (adds due_date to PATCH).
FrontendAgent reads the commit diff, then commits `components/ticket-card.tsx` (displays due date).

**Conflict resolution:** If both touch the same file, FrontendAgent's commit happens AFTER BackendAgent's PR merges. No merge conflicts because they're sequential commits.

### Pattern D: Agent-to-Agent Question

```
FrontendAgent is blocked. Posts comment on BackendAgent's completed ticket:
"What's the exact response shape for GET /api/notifications?"

BackendAgent (still "watching" its old tickets via notification) replies:
"{ count: number }. Schema is in db/schema.ts line 208."

FrontendAgent unblocks and continues.
```

---

## Special Comment Commands

Agents can post comments with special syntax that the Orchestrator watches for:

```
/claim
→ Agent wants to take this ticket. Orchestrator assigns it.

/unclaim
→ Agent is giving up (too hard, out of scope). Orchestrator reassigns.

/block reason="API endpoint missing" needs="ticket-abc123"
→ Agent is blocked. Orchestrator creates dependency or alerts human.

/needs-review
→ Agent has opened a PR and wants human eyes.

/auto-merge
→ Agent is confident and wants to skip human review (respects trust level).
```

These are NOT magic strings — they're just convention. The Orchestrator's polling loop scans comments for these patterns.

---

## Why Not WebSockets / Real-Time?

Simpler is better:

- **Polling** — Orchestrator polls `/api/notifications` every 30s for agent user_ids
- **No WebSocket server** — reduces infrastructure
- **GitHub webhooks** — for PR events (PR opened, PR merged, PR reviewed)
- **Syntheon webhooks** — for ticket changes (status, assignment)

The latency of 30s polling is fine for agents. They're not humans — they don't mind waiting.

---

## Message Format Standard

All agent comments follow this structure (enforced by the Orchestrator before posting):

```
[AGENT: {agent_name}] {emoji} {action}

{body}

{metadata block}
```

Example:

```
[AGENT: FrontendAgent] ✅ Implementation Complete

Built the notification bell component with:
- Bell icon with red badge for unread count
- Dropdown panel with notification list
- Click to mark as read
- Auto-polls every 30s

Branch: feature/notification-bell
PR: #42
Files: components/notification-bell.tsx
```

This makes agent comments instantly recognizable to humans.
