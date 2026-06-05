# SwarmNet — Database Schema Additions

> Minimal additions to the existing Syntheon schema. Reuse existing tables wherever possible.

---

## Philosophy

SwarmNet piggybacks on existing Syntheon data:

- **Tickets** → Agent tasks (no new table needed)
- **Comments** → Agent messages (no new table needed)
- **Activities** → Agent audit log (no new table needed)
- **Notifications** → Agent alerts (no new table needed)

We only add tables for things Syntheon doesn't have:

1. **Agents** — Agent definitions and config
2. **Agent Runs** — A single agent execution session
3. **Artifacts** — Code produced by agents (commits, diffs)
4. **Event Queue** — The SwarmNet event bus

---

## New Tables

### 1. `swarmnet_agents` — Agent Registry

```sql
CREATE TABLE swarmnet_agents (
  id text PRIMARY KEY,                  -- e.g., "agent:frontend"
  org_id text NOT NULL,                 -- per-org agents (or 'global' for defaults)
  name text NOT NULL,                   -- "Frontend Agent"
  domain text NOT NULL,                 -- "frontend" | "backend" | "database" | ...
  persona text NOT NULL,                -- The system prompt
  model text NOT NULL DEFAULT 'claude-sonnet-4',  -- Which LLM
  trust_level text NOT NULL DEFAULT 'medium',     -- "low" | "medium" | "high"
  keywords text[] NOT NULL DEFAULT '{}',          -- ["component", "page", "ui"]
  file_patterns text[] NOT NULL DEFAULT '{}',     -- ["*.tsx", "*.css"]
  capabilities text[] NOT NULL DEFAULT '{}',      -- ["read_repo", "commit", "test"]
  max_active_tickets int NOT NULL DEFAULT 1,      -- How many tickets at once
  is_custom boolean NOT NULL DEFAULT false,       -- User-created vs. built-in
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX swarmnet_agents_org_domain ON swarmnet_agents(org_id, domain);
```

**Why `text` PK instead of UUID?** Agent IDs are semantic (`agent:frontend`). Easier to query and debug.

**Default agents (seeded on org creation):**
| id | domain | trust_level | model |
|----|--------|-------------|-------|
| `agent:planner` | planner | medium | gpt-4o |
| `agent:frontend` | frontend | medium | claude-sonnet-4 |
| `agent:backend` | backend | low | claude-sonnet-4 |
| `agent:database` | database | low | gpt-4o |
| `agent:security` | security | high | claude-opus-4 |
| `agent:test` | test | high | gpt-4o-mini |
| `agent:production` | production | high | gpt-4o |

---

### 2. `swarmnet_runs` — Agent Execution Sessions

One row per "agent picks up a ticket and works on it."

```sql
CREATE TABLE swarmnet_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  project_id text,                      -- Optional: which project
  ticket_id text NOT NULL,              -- Links to existing tickets table
  agent_id text NOT NULL REFERENCES swarmnet_agents(id),
  status text NOT NULL DEFAULT 'claimed',  -- See state machine below

  -- Git tracking
  branch_name text,                     -- e.g., "feature/notification-bell"
  base_commit_sha text,                 -- Commit SHA when agent started
  head_commit_sha text,                 -- Latest commit SHA from agent
  pr_number int,                        -- GitHub PR number
  pr_url text,

  -- LLM tracking
  model_used text,                      -- Actual model used (may differ from agent default)
  prompt_tokens int,
  completion_tokens int,
  cost_usd decimal(10,6),              -- Estimated cost

  -- Timing
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_seconds int,                 -- Computed on completion

  -- Results
  files_modified text[] DEFAULT '{}',
  files_created text[] DEFAULT '{}',
  test_results jsonb,                   -- { passed: bool, coverage: float, logs: text }
  security_scan jsonb,                  -- { findings: [...], severity: "none|low|high" }
  error_message text,                   -- If failed

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX swarmnet_runs_org_status ON swarmnet_runs(org_id, status);
CREATE INDEX swarmnet_runs_ticket ON swarmnet_runs(ticket_id);
CREATE INDEX swarmnet_runs_agent ON swarmnet_runs(agent_id);
CREATE INDEX swarmnet_runs_project ON swarmnet_runs(project_id);
```

**Status enum:**

```
claimed → planning → coding → committing → testing → reviewing → merging → done
         │          │          │           │          │           │
         └──────────┴──────────┴───────────┴──────────┴───────────┘
                              ↓
                         failed (terminal)
                         blocked (terminal until resolved)
```

---

### 3. `swarmnet_artifacts` — Code Snapshots

Stores the actual code produced by agents. Think of it as a mini-git inside Syntheon.

```sql
CREATE TABLE swarmnet_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES swarmnet_runs(id) ON DELETE CASCADE,
  file_path text NOT NULL,              -- e.g., "components/notification-bell.tsx"
  content text NOT NULL,                -- Full file content (at commit time)
  is_new boolean NOT NULL DEFAULT false, -- True if file didn't exist before

  -- Diff info (optional, for display)
  diff_before text,                     -- Previous content (for diffs)
  diff_after text,                      -- New content

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX swarmnet_artifacts_run ON swarmnet_artifacts(run_id);
```

**Why store content?**

- Humans can review agent output without opening GitHub
- Rollback is easy — just restore from artifact
- Audit trail — "what did the AI actually write?"

**Not a replacement for Git** — This is a cache/display layer. GitHub remains the source of truth.

---

### 4. `swarmnet_events` — The Event Bus

Already described in `03-ORCHESTRATOR.md`. Recapped here for schema completeness.

```sql
CREATE TABLE swarmnet_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  project_id text,
  ticket_id text,
  run_id uuid REFERENCES swarmnet_runs(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'orchestrator',  -- 'orchestrator' | 'webhook' | 'agent' | 'user'
  priority int NOT NULL DEFAULT 5,           -- 1=urgent, 10=low
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error_count int NOT NULL DEFAULT 0,      -- Retry counter
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX swarmnet_events_unprocessed ON swarmnet_events(processed, priority, created_at)
  WHERE processed = false;
CREATE INDEX swarmnet_events_ticket ON swarmnet_events(ticket_id);
CREATE INDEX swarmnet_events_org ON swarmnet_events(org_id, created_at);
```

**Event types:**

```
ticket_created, ticket_updated, ticket_assigned, ticket_status_changed,
comment_posted, pr_opened, pr_merged, pr_reviewed, check_completed,
agent_claimed, agent_completed, agent_failed, agent_blocked,
```

---

### 5. `swarmnet_cost_tracking` — Cost Analytics (Optional v1)

```sql
CREATE TABLE swarmnet_cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  project_id text,
  run_id uuid REFERENCES swarmnet_runs(id),
  agent_id text NOT NULL,
  model text NOT NULL,
  prompt_tokens int NOT NULL DEFAULT 0,
  completion_tokens int NOT NULL DEFAULT 0,
  cost_usd decimal(10,6) NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX swarmnet_cost_org_date ON swarmnet_cost_tracking(org_id, date);
```

**Why:** So users know how much SwarmNet costs them. LLM API costs add up.

---

## Existing Table Changes (Minimal)

### `tickets` — No schema change needed

Agents use existing fields:

- `assignee_user_id` = `agent:frontend` (text, works today)
- `status` = agent lifecycle state
- `dependency_ticket_id` = scheduling dependency

### `ticket_comments` — No schema change needed

Agent comments look like regular comments. The `[AGENT: ...]` prefix is convention.

### `ticket_activities` — No schema change needed

Agent activities use existing `action_type` field. We add new action types:

```
'agent_claimed', 'agent_started', 'agent_committed', 'agent_pr_opened',
'agent_test_passed', 'agent_test_failed', 'agent_security_clear',
'agent_security_blocked', 'agent_merged', 'agent_failed', 'agent_blocked'
```

### `notifications` — No schema change needed

Agents receive notifications just like humans. `user_id` = `agent:frontend`.

---

## Migration Plan

```sql
-- Run in order:

-- 1. Create agent registry
\i sql/swarmnet_agents.sql

-- 2. Create run tracking
\i sql/swarmnet_runs.sql

-- 3. Create artifact storage
\i sql/swarmnet_artifacts.sql

-- 4. Create event bus
\i sql/swarmnet_events.sql

-- 5. Seed default agents
INSERT INTO swarmnet_agents (id, org_id, name, domain, persona, model, trust_level, keywords, file_patterns, capabilities)
SELECT
  'agent:planner', org_id, 'Planner Agent', 'planner', '...', 'gpt-4o', 'medium',
  ARRAY['plan', 'decompose', 'scope'], ARRAY[], ARRAY['create_ticket', 'set_dependencies']
FROM projects GROUP BY org_id;  -- One per org

-- Repeat for frontend, backend, database, security, test, production
```

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   tickets       │◄────┤  swarmnet_runs  │     │ swarmnet_agents │
│  (existing)     │     │   (new)         │────►│   (new)         │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │                 │
         │       ┌────▼────┐      ┌────▼────┐
         │       │ artifacts│      │ events  │
         │       │  (new)   │      │  (new)  │
         │       └─────────┘      └─────────┘
         │
   ┌─────┴─────┐
   │ comments  │
   │ activities│
   │notifications│
   │(existing) │
   └───────────┘
```

Only 4 new tables. Everything else reuses existing Syntheon primitives.
