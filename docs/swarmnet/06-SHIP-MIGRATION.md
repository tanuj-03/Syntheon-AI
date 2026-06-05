# SwarmNet — Ship System Migration Plan

> How the existing `Ship` feature evolves into SwarmNet without breaking anything.

---

## What Ship Does Today

```
User clicks "Approve and Ship" in Ticket Detail
        │
        ▼
POST /api/ship/plan
  → Groq generates full codebase (issue, branch, PR, files)
  → Creates Linear tickets
        │
        ▼
User clicks "Execute Plan"
        │
        ▼
POST /api/ship/execute
  → Creates GitHub issue
  → Creates branch
  → Commits ALL files at once
  → Opens PR
  → Moves Linear tickets
  → Creates Syntheon project
```

**Key characteristics:**

- Single-shot (one big generation)
- Monolithic (one agent = one model = everything)
- Meeting-centric (triggered from meeting ticket detail)
- No incremental updates (follow-up "MCT" exists but is fragile)
- No testing/validation (commits and prays)
- No rollback (manual only)

---

## Migration Strategy: Side-by-Side

We don't delete Ship. We **build SwarmNet alongside it** and gradually promote tickets from Ship to SwarmNet.

### Phase 0: Foundation (Today)

- Document architecture (✓ doing now)
- Create DB schema additions
- Set up event queue table

### Phase 1: Orchestrator (Week 1)

- Build the Orchestrator worker (separate process)
- Connect to existing Syntheon event system
- SwarmNet can READ tickets but doesn't act on them yet
- Ship still works exactly as before

### Phase 2: Planner Agent (Week 2)

- When user creates a large ticket, offer "Decompose with AI"
- Planner Agent breaks it into sub-tickets
- Each sub-ticket gets domain tag (`frontend`, `backend`, etc.)
- Ship button still visible on original ticket

### Phase 3: Domain Agents (Week 3-4)

- Frontend Agent claims frontend-tagged tickets
- Backend Agent claims backend-tagged tickets
- Each agent commits to its own branch
- Security Agent + Test Agent run on every PR
- **Ship button now optionally routes through SwarmNet**

### Phase 4: Full SwarmNet (Week 5-6)

- Ship is deprecated, hidden behind feature flag
- All new projects use SwarmNet by default
- Existing projects can opt-in
- Ship code stays in repo for legacy support

---

## Code Migration Map

### Files That Stay (Ship legacy)

| File                            | Role                          | Fate                                               |
| ------------------------------- | ----------------------------- | -------------------------------------------------- |
| `lib/shipai/ai.ts`              | Groq prompt + plan generation | **Refactored** → Agent-specific prompts            |
| `lib/shipai/github.ts`          | GitHub API wrapper            | **Reused** as-is by all agents                     |
| `lib/shipai/linear.ts`          | Linear ticket management      | **Reused** as-is                                   |
| `app/api/ship/plan/route.ts`    | Plan generation endpoint      | **Deprecates** → replaced by agent-specific routes |
| `app/api/ship/execute/route.ts` | Execution endpoint            | **Deprecates** → replaced by Orchestrator          |
| `components/ticket-detail.tsx`  | Ship UI (Approve/Execute)     | **Evolved** → adds "SwarmNet Mode" toggle          |

### Files That Are New (SwarmNet)

| File                                        | Role                                    |
| ------------------------------------------- | --------------------------------------- |
| `lib/swarmnet/orchestrator.ts`              | Core scheduling logic                   |
| `lib/swarmnet/agents/*.ts`                  | Agent-specific prompt builders          |
| `lib/swarmnet/agents/frontend.ts`           | FrontendAgent implementation            |
| `lib/swarmnet/agents/backend.ts`            | BackendAgent implementation             |
| `lib/swarmnet/agents/planner.ts`            | PlannerAgent implementation             |
| `lib/swarmnet/agents/security.ts`           | SecurityAgent implementation            |
| `lib/swarmnet/agents/test.ts`               | TestAgent implementation                |
| `app/api/swarmnet/webhook/route.ts`         | GitHub webhook receiver                 |
| `app/api/swarmnet/orchestrator/route.ts`    | Trigger orchestrator tick               |
| `app/api/swarmnet/agents/[id]/run/route.ts` | Start an agent run                      |
| `workers/swarmnet/`                         | Standalone worker (if separate process) |

---

## The Prompt Evolution

### Ship Prompt (Today)

```
You are a senior software engineer.
Given a feature request, generate:
1. GitHub issue title
2. Issue description
3. Branch name
4. Pull request title
5. Linear subtasks
6. Files required
7. Code for each file
```

**Problem:** One prompt tries to do everything. The model gets confused between frontend/backend concerns. Generated code is often inconsistent.

### SwarmNet Prompts (Future)

**Planner Agent:**

```
You are a technical product manager. Decompose this feature into
atomic implementation tasks. Each task should have:
- Clear title
- Acceptance criteria
- Domain tag (frontend/backend/database/test)
- Dependencies on other tasks
```

**Frontend Agent:**

```
You are a senior frontend engineer. Implement ONLY the UI components
for this ticket. You have access to the existing component library.
Read these files first: [componentA.tsx, componentB.tsx]
Write these files: [new-component.tsx]
```

**Backend Agent:**

```
You are a senior backend engineer. Implement ONLY the API route
for this ticket. The frontend expects this response shape: {...}
Write: app/api/feature/route.ts
```

**Key difference:** Each agent has a **narrow scope**, **context from other agents** (via comments/dependencies), and **reads existing code** before writing.

---

## UI Evolution: Ticket Detail Page

### Today (Ship)

```
┌─────────────────────────────────────┐
│  Ticket: Build notification system    │
│                                     │
│  [Approve and Ship]  → [Ship Changes]│
│                                     │
│  Status: Done (PR #42 merged)        │
└─────────────────────────────────────┘
```

### Phase 3 (SwarmNet + Ship)

```
┌─────────────────────────────────────┐
│  Ticket: Build notification system    │
│  Tags: [frontend] [backend] [database]│
│                                     │
│  [SwarmNet Mode]  [Classic Ship]    │
│                                     │
│  ── SwarmNet Sub-tickets ──         │
│  ☐ Database: notifications table    │
│    └─ agent:database ● working...   │
│  ☐ Backend: notifications API       │
│    └─ agent:backend ○ queued        │
│  ☐ Frontend: notification bell      │
│    └─ agent:frontend ○ queued       │
│  ☐ Test: notification tests         │
│    └─ agent:test ○ waiting...       │
│                                     │
│  [Decompose] [Force Start] [Cancel]  │
└─────────────────────────────────────┘
```

### Phase 4 (Full SwarmNet)

```
┌─────────────────────────────────────┐
│  Ticket: Build notification system    │
│                                     │
│  ── Agent Activity ──               │
│  [AGENT: Planner] Decomposed into 4 │
│  [AGENT: Database] PR #101 opened   │
│  [AGENT: Backend] Waiting for #101...│
│  [AGENT: Frontend] Waiting for #102 │
│                                     │
│  [View SwarmNet Dashboard]           │
└─────────────────────────────────────┘
```

---

## Risk: Breaking Existing Ship Flows

### Mitigation

1. **Feature flag:** `SWARMNET_ENABLED=false` keeps Ship as default
2. **Opt-in per project:** New projects can use SwarmNet, old ones stay on Ship
3. **Ship code stays:** We don't delete `lib/shipai/` or `app/api/ship/`. We just stop maintaining it.
4. **Database backwards compatibility:** New tables are additive. Existing tables unchanged.

### Rollback Plan

If SwarmNet is buggy:

1. Set `SWARMNET_ENABLED=false` env var
2. All new tickets revert to Ship flow
3. Existing SwarmNet tickets continue running (they're in DB, independent)
4. Fix bugs, re-enable

---

## The "Three Weeks" Breakdown

| Week | Focus                     | Deliverable                                                |
| ---- | ------------------------- | ---------------------------------------------------------- |
| 1    | Orchestrator + Event Bus  | Worker polls tickets, assigns to agents, tracks state      |
| 2    | Planner + Frontend Agents | Auto-decompose tickets, FrontendAgent commits React code   |
| 3    | Backend + Test + Security | BackendAgent commits API routes, TestAgent blocks bad PRs  |
| 4    | Integration + UI          | Ticket detail shows agent progress, humans can intervene   |
| 5    | Polish + Migration        | Ship button optionally uses SwarmNet, feature flag rollout |
| 6    | Hardening                 | Error handling, rollback, cost tracking, agent tuning      |

**The three-week estimate assumes:**

- We reuse existing GitHub/Linear integrations (✓ already built)
- We reuse existing Groq infrastructure (✓ already built)
- We reuse existing Syntheon tickets/comments/activities (✓ already built)
- The new work is: Orchestrator logic + Agent prompt engineering + Event wiring

The risk is in **agent reliability** — getting Claude to consistently produce valid React/TypeScript that actually compiles and runs. That's prompt engineering, not architecture.
