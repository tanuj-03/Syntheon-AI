# SwarmNet — Orchestrator Design

> The Orchestrator is the conductor. It doesn't write code. It decides WHO does WHAT and WHEN.

---

## What the Orchestrator Is

A stateful service (or cron job + API route combo) that:

1. **Polls** for new/changed tickets
2. **Matches** tickets to capable agents
3. **Schedules** work respecting dependencies
4. **Monitors** agent progress via activities/comments
5. **Resolves** blockers (escalates to humans if needed)

It is **not** an AI. It is deterministic logic. Think Kubernetes scheduler, not LLM.

---

## Orchestrator Trigger Model

The Orchestrator runs in response to events:

| Event                    | Source               | Orchestrator Action                 |
| ------------------------ | -------------------- | ----------------------------------- |
| Ticket created           | User / Planner Agent | Evaluate agents, queue for claiming |
| Ticket assigned to agent | Orchestrator / Human | Start agent run                     |
| Ticket status changed    | Agent / Human        | Check if dependents can start       |
| Comment posted           | Agent / Human        | Parse for `/claim`, `/block`, etc.  |
| PR opened                | GitHub webhook       | Trigger SecurityAgent + TestAgent   |
| PR merged                | GitHub webhook       | Mark ticket done, notify dependents |
| PR review submitted      | GitHub webhook       | If approved + tests pass → merge    |
| PR check failed          | GitHub webhook       | Notify agent, retry or escalate     |

**Two trigger mechanisms:**

1. **Webhook-driven** (fast) — GitHub webhooks hit `/api/swarmnet/webhook`
2. **Polling fallback** (reliable) — Cron job every 30s scans for stale tickets

---

## Orchestrator State Machine

Every ticket goes through this lifecycle:

```
                    ┌─────────────┐
                    │   CREATED   │
                    └──────┬──────┘
                           │ PlannerAgent decomposes (optional)
                           ▼
                    ┌─────────────┐
                    │   QUEUED    │
                    └──────┬──────┘
                           │ Orchestrator assigns to best agent
                           ▼
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
        ┌─────────────┐        ┌─────────────┐
        │  CLAIMED    │        │  BLOCKED    │
        │  (assigned) │        │  (needs     │
        └──────┬──────┘        │  dependency)│
               │               └──────┬──────┘
               │ Agent works          │ Human resolves
               │                      ▼
               ▼               ┌─────────────┐
        ┌─────────────┐      │   QUEUED    │
        │  COMMITTED  │      └─────────────┘
        │  (PR open)  │
        └──────┬──────┘
               │ Security + Test agents run
               │
               ▼
        ┌─────────────┐
        │  REVIEWING  │
        └──────┬──────┘
               │ Human approves OR auto-merge (trust level)
               │
         ┌─────┴─────┐
         │           │
         ▼           ▼
   ┌─────────┐  ┌──────────┐
   │ MERGED  │  │ REJECTED │
   │ (done)  │  │ (requeue)│
   └────┬────┘  └────┬─────┘
        │            │
        ▼            ▼
   ┌─────────┐  ┌──────────┐
   │  DONE   │  │  QUEUED  │
   └─────────┘  └──────────┘
```

---

## Scheduling Algorithm

The Orchestrator uses a simple greedy scheduler:

```typescript
function scheduleTickets() {
  // 1. Get all tickets that are "ready" (backlog, no unresolved hard dependencies)
  const readyTickets = getTicketsWhere({
    status: 'backlog',
    assignee_user_id: null,
  }).filter((t) => !hasUnresolvedHardDependencies(t));

  // 2. Score each agent-ticket match
  const assignments: Assignment[] = [];

  for (const ticket of readyTickets) {
    for (const agent of availableAgents) {
      const score = scoreMatch(agent, ticket);
      if (score > 0) {
        assignments.push({ ticket, agent, score });
      }
    }
  }

  // 3. Sort by score descending, greedily assign (no agent gets 2 tickets at once)
  assignments.sort((a, b) => b.score - a.score);

  const assignedAgents = new Set<string>();
  const assignedTickets = new Set<string>();

  for (const { ticket, agent, score } of assignments) {
    if (assignedAgents.has(agent.id)) continue;
    if (assignedTickets.has(ticket.id)) continue;

    assignTicket(ticket.id, agent.id);
    assignedAgents.add(agent.id);
    assignedTickets.add(ticket.id);
  }
}
```

**Scoring function:**

```typescript
function scoreMatch(agent: Agent, ticket: Ticket): number {
  let score = 0;

  // Tag match (highest weight)
  if (ticket.tags?.includes(agent.domain)) score += 100;

  // Title keyword match
  const keywords = agent.keywords; // e.g., ["component", "page", "ui"]
  for (const kw of keywords) {
    if (ticket.title.toLowerCase().includes(kw)) score += 30;
  }

  // Agent availability (penalize busy agents)
  if (agent.activeTicketCount > 0) score -= 50 * agent.activeTicketCount;

  // Historical success rate
  score += (agent.successRate || 0.8) * 20;

  // Prefer agents who worked on related code
  if (agent.previouslyTouchedFiles.some((f) => ticket.description?.includes(f))) {
    score += 25;
  }

  return score;
}
```

---

## The Orchestrator Loop (Pseudocode)

```typescript
// Runs every 30 seconds via cron + on every webhook event

async function orchestratorTick() {
  // ── PHASE 1: Ingest Events ──
  const events = await dequeueEvents(); // webhook queue or polling diff

  for (const event of events) {
    await handleEvent(event);
  }

  // ── PHASE 2: Schedule Work ──
  await scheduleTickets();

  // ── PHASE 3: Monitor Active Runs ──
  const activeRuns = await getActiveAgentRuns();
  for (const run of activeRuns) {
    await monitorRun(run);
  }

  // ── PHASE 4: Handle Blocked Tickets ──
  const blockedTickets = await getBlockedTickets();
  for (const ticket of blockedTickets) {
    await attemptUnblock(ticket);
  }
}

async function handleEvent(event: SwarmEvent) {
  switch (event.type) {
    case 'ticket_created':
      // If ticket is large, spawn PlannerAgent to decompose
      if (isLargeTicket(event.ticket)) {
        await spawnPlanner(event.ticket);
      }
      break;

    case 'ticket_assigned':
      if (isAgent(event.assignee)) {
        await startAgentRun(event.ticket, event.assignee);
      }
      break;

    case 'pr_opened':
      await triggerSecurityScan(event.pr);
      await triggerTests(event.pr);
      break;

    case 'pr_merged':
      await markTicketDone(event.ticketId);
      await notifyDependents(event.ticketId);
      break;

    case 'agent_comment':
      await parseAgentCommand(event.comment);
      break;

    case 'check_failed':
      await notifyAgent(event.agentId, event.ticketId, 'tests_failed');
      break;
  }
}
```

---

## Where the Orchestrator Lives

Two options, with tradeoffs:

### Option A: In-Process (API Route + Cron)

The Orchestrator is a Next.js API route (`/api/swarmnet/orchestrator`) triggered by:

- Vercel Cron Jobs (free tier: up to 2 cron jobs)
- GitHub webhooks hitting `/api/swarmnet/webhook`

**Pros:**

- Same codebase, shared DB connection
- No separate infrastructure
- Easy to deploy

**Cons:**

- 10-second function timeout on Vercel Hobby
- Can't run long agent operations in one request
- Must break work into small chunks

### Option B: Separate Worker (Recommended for v1)

A lightweight Node.js worker (Express/fastify) running alongside the main app, or on a separate Render/Railway instance.

**Architecture:**

```
┌──────────────────┐     HTTP      ┌──────────────────┐
│  Syntheon App    │◄────────────►│  SwarmNet Worker │
│  (Next.js)       │              │  (Node.js)       │
│                  │   Webhooks   │                  │
│  /api/*          │◄─────────────│  Orchestrator    │
│  Dashboard UI    │              │  Agent runners   │
└──────────────────┘              └──────────────────┘
         │                                  │
         └────────────┬───────────────────┘
                      │
                ┌─────▼──────┐
                │  Supabase  │
                │   (DB)     │
                └────────────┘
```

**Why separate:**

- Agent runs can take 30-120 seconds (LLM calls + GitHub API)
- Worker can run persistent connections to Groq/Claude
- Doesn't block user-facing API routes
- Can scale workers independently (more workers = more parallel agents)

**Communication between App and Worker:**

- DB polling (Worker reads `swarmnet_events` table)
- Webhooks (App POSTs to Worker on ticket changes)
- Shared queue table in DB (reliable, no extra infra)

---

## Event Queue Table

The reliable backbone. Both App and Worker write to it.

```sql
CREATE TABLE swarmnet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  project_id text,
  ticket_id text,
  event_type text NOT NULL,  -- 'ticket_created', 'pr_merged', 'agent_completed', etc.
  payload jsonb NOT NULL,    -- event-specific data
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX swarmnet_events_unprocessed ON swarmnet_events(processed, created_at)
  WHERE processed = false;
```

Worker loop:

```typescript
while (true) {
  const events = await db
    .select()
    .from(swarmnetEvents)
    .where(eq(swarmnetEvents.processed, false))
    .orderBy(asc(swarmnetEvents.createdAt))
    .limit(10);

  for (const event of events) {
    await handleEvent(event);
    await db
      .update(swarmnetEvents)
      .set({ processed: true, processed_at: new Date() })
      .where(eq(swarmnetEvents.id, event.id));
  }

  await sleep(5000); // 5 second poll
}
```

This is the **SwarmNet Event Bus**.
