# SwarmNet — Glossary & Naming Conventions

> Consistent language prevents three weeks of confusion.

---

## Core Concepts

| Term             | Definition                                                     | Never Say                              |
| ---------------- | -------------------------------------------------------------- | -------------------------------------- |
| **SwarmNet**     | The multi-agent orchestration system                           | "Ship v2", "AI builder", "bot system"  |
| **Agent**        | A domain-specialized AI worker                                 | "Bot", "Model", "Worker", "AI"         |
| **Orchestrator** | The scheduler that assigns tickets to agents                   | "Controller", "Manager", "Dispatcher"  |
| **Run**          | A single agent execution session on one ticket                 | "Job", "Task", "Session"               |
| **Claim**        | When an agent takes ownership of a ticket                      | "Assign" (reserved for humans), "Grab" |
| **Artifact**     | Code produced by an agent (stored in DB)                       | "Output", "Result", "File"             |
| **Event**        | A state change in the system (ticket created, PR merged, etc.) | "Message", "Signal", "Trigger"         |
| **Domain**       | The area of expertise (frontend, backend, database, etc.)      | "Role", "Type", "Category"             |
| **Trust Level**  | How much autonomy an agent has (low/medium/high)               | "Permission", "Access", "Clearance"    |

---

## Agent Names (Canonical)

| ID                 | Display Name     | Domain     | Abbreviation |
| ------------------ | ---------------- | ---------- | ------------ |
| `agent:planner`    | Planner Agent    | planner    | PLAN         |
| `agent:frontend`   | Frontend Agent   | frontend   | FE           |
| `agent:backend`    | Backend Agent    | backend    | BE           |
| `agent:database`   | Database Agent   | database   | DB           |
| `agent:security`   | Security Agent   | security   | SEC          |
| `agent:test`       | Test Agent       | test       | QA           |
| `agent:production` | Production Agent | production | PROD         |

**Custom agents follow:** `agent:{domain}:{name}`
Example: `agent:frontend:mobile` for a React Native specialist.

---

## Ticket Status (Agent Lifecycle)

Agents use existing ticket statuses PLUS new ones:

| Status        | Meaning                        | Actor  |
| ------------- | ------------------------------ | ------ |
| `backlog`     | Not started                    | System |
| `in_progress` | Agent is actively working      | Agent  |
| `blocked`     | Agent is stuck (needs help)    | Agent  |
| `reviewing`   | PR is open, waiting for review | System |
| `done`        | Merged to main                 | System |

**Agent-specific run statuses** (in `swarmnet_runs` table):

| Status       | Meaning                                  |
| ------------ | ---------------------------------------- |
| `claimed`    | Agent has taken the ticket               |
| `planning`   | Agent is reading code, planning approach |
| `coding`     | Agent is generating/writing code         |
| `committing` | Agent is pushing commits to GitHub       |
| `testing`    | Tests are running on the PR              |
| `reviewing`  | Awaiting human or auto-review            |
| `merging`    | PR is being merged                       |
| `done`       | Complete, ticket closed                  |
| `failed`     | Agent failed, needs retry or human       |
| `cancelled`  | Human cancelled the run                  |

---

## Branch Naming

```
swarm/{ticket-id}/{domain}/{slug}

Examples:
swarm/tkt-456/database/notifications-table
swarm/tkt-456/backend/notifications-api
swarm/tkt-456/frontend/notification-bell
swarm/tkt-456/test/notification-tests
```

**Rules:**

- Always lowercase
- Slug is kebab-case
- Max 50 characters
- Ticket ID is the Syntheon ticket UUID (first 8 chars)

---

## Commit Message Format

```
{scope}({domain}): {description}

{body}

Agent: {agent_id}
Ticket: {ticket_id}
```

Example:

```
feat(frontend): add notification bell component

- Bell icon with unread count badge
- Dropdown panel with notification list
- Auto-polls every 30s

Agent: agent:frontend
Ticket: tkt-456
```

---

## Comment Commands

Agents and humans can use these in comments:

| Command                                 | Actor       | Effect                                |
| --------------------------------------- | ----------- | ------------------------------------- |
| `/claim`                                | Agent       | Agent takes ownership of ticket       |
| `/unclaim`                              | Agent       | Agent gives up ticket                 |
| `/block reason="..." needs="ticket-id"` | Agent       | Marks ticket blocked                  |
| `/unblock`                              | Human/Agent | Removes blocked status                |
| `/needs-review`                         | Agent       | Requests human review                 |
| `/auto-merge`                           | Agent       | Requests merge (respects trust level) |
| `/retry`                                | Human       | Restarts failed agent run             |
| `/cancel`                               | Human       | Cancels active agent run              |
| `/decompose`                            | Human       | Triggers PlannerAgent on this ticket  |

---

## Database Table Prefixes

| Prefix      | Table           | Purpose                |
| ----------- | --------------- | ---------------------- |
| `swarmnet_` | New tables      | SwarmNet-specific data |
| (no prefix) | Existing tables | Syntheon core data     |

**Why:** Easy to distinguish SwarmNet tables in migrations and queries.

---

## API Route Conventions

```
/api/swarmnet/
  ├── orchestrator/          → Trigger orchestrator tick
  ├── webhook/               → GitHub webhook receiver
  ├── agents/                → Agent CRUD (admin only)
  ├── agents/[id]/run        → Start agent run
  ├── runs/                  → List runs
  ├── runs/[id]              → Run details
  ├── runs/[id]/artifacts    → Run artifacts
  └── events/                → Event queue (admin/debug)
```

---

## Environment Variables

```
# Existing (already in .env.local)
GROQ_API_KEY=                # For agent LLM calls
GITHUB_TOKEN=                # For agent commits
GITHUB_OWNER=                # Target repo owner
GITHUB_REPO=                 # Target repo name

# New (for SwarmNet)
SWARMNET_ENABLED=true        # Feature flag
SWARMNET_WORKER_URL=         # Where the worker lives
SWARMNET_WEBHOOK_SECRET=     # GitHub webhook HMAC secret
SWARMNET_DEFAULT_MODEL=      # Fallback LLM model
SWARMNET_MAX_COST_PER_RUN=   # Budget guardrail ($)
```

---

## File Organization

```
lib/
  shipai/                    # LEGACY — existing Ship code
    ai.ts
    github.ts
    linear.ts
  swarmnet/                  # NEW — SwarmNet code
    orchestrator.ts          # Core scheduling logic
    types.ts                 # Shared types/interfaces
    agents/
      base.ts                # Base agent class
      planner.ts
      frontend.ts
      backend.ts
      database.ts
      security.ts
      test.ts
      production.ts
    github.ts                # Extends shipai/github.ts (if needed)
    prompts/                 # Agent-specific system prompts
      planner.txt
      frontend.txt
      backend.txt
      ...

app/api/
  ship/                      # LEGACY — existing Ship API
    plan/
    execute/
  swarmnet/                  # NEW — SwarmNet API
    orchestror/
    webhook/
    agents/
    runs/
    events/

workers/
  swarmnet/                  # NEW — Standalone worker (optional)
    index.ts
    package.json
```

---

## Activity Action Types

Existing types: `status_changed`, `assigned`, `updated`, `comment_added`

New types (for agents):

```typescript
type AgentActivityType =
  | 'agent_claimed' // Agent took ownership
  | 'agent_started' // Agent began work
  | 'agent_planned' // Agent posted plan in comments
  | 'agent_committed' // Agent pushed commit(s)
  | 'agent_pr_opened' // Agent opened PR
  | 'agent_test_passed' // Tests passed
  | 'agent_test_failed' // Tests failed
  | 'agent_security_clear' // Security scan passed
  | 'agent_security_blocked' // Security scan failed
  | 'agent_merged' // PR merged
  | 'agent_failed' // Agent run failed
  | 'agent_blocked' // Agent blocked (needs help)
  | 'agent_cancelled' // Human cancelled run
  | 'agent_completed'; // Run finished successfully
```

---

## Emoji Conventions for Agent Comments

| Emoji | Meaning                  |
| ----- | ------------------------ |
| 🔄    | Working / In progress    |
| ✅    | Complete / Passed        |
| ❌    | Failed / Error           |
| 🚫    | Blocked                  |
| ❓    | Question / Needs info    |
| 📝    | Planning / Analysis      |
| 💻    | Coding / Implementation  |
| 🔐    | Security-related         |
| 🧪    | Testing                  |
| 🚀    | Deployed / Preview ready |
| 🤖    | Agent identity marker    |
