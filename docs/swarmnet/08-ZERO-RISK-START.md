# SwarmNet — Zero-Risk First Step (Dry Run Mode)

> Build the entire architecture with **fake agents** first. See it work. Then plug in real LLMs.

---

## The Fear is Valid

You're right to be cautious:

- **Cost:** One bad agent loop could burn $5-10 in API calls
- **Complexity:** New DB tables, API routes, worker process, webhooks
- **No visibility:** You can't see what agents are doing
- **Unknown unknowns:** What if agents fight each other? What if they get stuck in loops?

**Solution:** Build a **"Simulation Mode"** where everything is fake EXCEPT the orchestration logic. You see the full flow without spending a cent.

---

## What "Dry Run Mode" Looks Like

```
User creates ticket: "Add dark mode toggle"
        │
        ▼
PlannerAgent (FAKE) → "Would decompose into 3 sub-tickets"
        │
        ▼
FrontendAgent (FAKE) → "Would create components/dark-mode-toggle.tsx"
        │
        ▼
TestAgent (FAKE) → "Would add dark-mode-toggle.test.tsx"
        │
        ▼
SecurityAgent (FAKE) → "Would scan: no issues found"
        │
        ▼
ProductionAgent (FAKE) → "Would deploy preview to vercel"
```

Nothing hits Groq/Claude. Nothing hits GitHub. But you see:

- Which agent claimed which ticket
- What files they would create
- The branch names they would use
- The commit messages they would write
- The PR they would open

**You can review the fake output before enabling real mode.**

---

## The Smallest Possible UI

Just three additions to existing pages:

### 1. Ticket Detail — "Simulate with SwarmNet" Button

```
┌─────────────────────────────────────────────┐
│  Ticket: Add dark mode toggle                  │
│  Status: Backlog                               │
│                                               │
│  [Assign to me]  [Simulate with SwarmNet]   │  ← NEW BUTTON
│                                               │
│  ── SwarmNet Simulation ──                    │  ← NEW SECTION (collapsed)
│  PlannerAgent would create 2 sub-tickets:   │
│    1. Create theme provider (frontend)        │
│    2. Add toggle component to settings        │
│                                               │
│  FrontendAgent would create:                  │
│    components/dark-mode-toggle.tsx            │
│                                               │
│  TestAgent would create:                      │
│    components/dark-mode-toggle.test.tsx       │
│                                               │
│  [Approve & Run for Real]  [Cancel]         │  ← Only after reviewing fake output
└─────────────────────────────────────────────┘
```

### 2. Project Dashboard — Agent Activity Feed

```
┌─────────────────────────────────────────────┐
│  Project: Acme Corp Website                  │
│                                               │
│  ── Agent Activity ──                          │  ← NEW WIDGET
│  🤖 FrontendAgent claimed #42 (2m ago)      │
│  🤖 FrontendAgent planned approach (1m ago) │
│  🤖 FrontendAgent created branch              │
│      swarm/tkt-42/frontend/dark-mode         │
│  ⏳ TestAgent queued (waiting for #42)      │
│                                               │
│  [View SwarmNet Dashboard]                    │  ← Link to full view
└─────────────────────────────────────────────┘
```

### 3. SwarmNet Dashboard (New Page)

```
┌─────────────────────────────────────────────┐
│  SwarmNet Control Center                     │
│                                               │
│  Mode: [Simulation ▼]  [Real ▼]              │  ← Toggle
│  Budget today: $0.00 (limit: $10)           │
│                                               │
│  Active Agents: 7                             │
│  Queue: 3 tickets                             │
│  Running: 1 (FrontendAgent on #42)           │
│                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Planner  │ │Frontend │ │Backend  │       │
│  │  🟢     │ │  🟡     │ │  🟢     │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                               │
│  Recent Runs:                                 │
│  #42 FrontendAgent — Simulated — 2m ago     │
│  #41 BackendAgent — Real — $0.42 — 1h ago   │
└─────────────────────────────────────────────┘
```

**That's it.** Three UI additions. The rest is backend.

---

## The Zero-Cost Architecture

### Step 1: Create DB Tables (One-time, free)

```sql
-- Run this ONCE in Supabase SQL Editor
-- No data loss, no breaking changes
\i docs/swarmnet/schema-migration.sql
```

Takes 30 seconds. Costs $0.

### Step 2: Add Simulation Toggle to Environment

```bash
# .env.local
SWARMNET_ENABLED=true
SWARMNET_MODE=simulation  # ← "simulation" or "real"
```

When `MODE=simulation`, agents return fake responses. When `MODE=real`, they call Groq/Claude.

### Step 3: Build the Orchestrator (No LLM calls)

```typescript
// lib/swarmnet/orchestrator.ts
async function orchestratorTick() {
  const readyTickets = await getReadyTickets();

  for (const ticket of readyTickets) {
    const agent = await findBestAgent(ticket);

    // SIMULATION: Just log what WOULD happen
    if (process.env.SWARMNET_MODE === 'simulation') {
      await simulateAgentRun(agent, ticket);
      continue;
    }

    // REAL: Actually call the LLM
    await startAgentRun(agent, ticket);
  }
}

async function simulateAgentRun(agent: Agent, ticket: Ticket) {
  // Fake output based on ticket title + agent domain
  const fakeOutput = generateFakeOutput(agent, ticket);

  // Store in DB so UI can display it
  await createRun({
    ticket_id: ticket.id,
    agent_id: agent.id,
    status: 'done', // Simulated runs complete instantly
    files_created: fakeOutput.files,
    branch_name: fakeOutput.branch,
    is_simulation: true,
  });

  // Post fake comment on ticket
  await createComment(
    ticket.id,
    agent.id,
    `[AGENT: ${agent.name}] 📝 SIMULATION\n\n` +
      `Would create:\n${fakeOutput.files.map((f) => `- ${f}`).join('\n')}\n\n` +
      `Branch: ${fakeOutput.branch}\n` +
      `Estimated cost: ${fakeOutput.estimatedCost}`
  );
}
```

### Step 4: Build Minimal UI (React components)

```typescript
// components/swarmnet-simulation-panel.tsx
export function SwarmnetSimulationPanel({ ticket }: { ticket: Ticket }) {
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  async function runSimulation() {
    setSimulating(true);
    const res = await fetch('/api/swarmnet/simulate', {
      method: 'POST',
      body: JSON.stringify({ ticketId: ticket.id }),
    });
    setSimulation(await res.json());
    setSimulating(false);
  }

  return (
    <div className="border rounded-xl p-4 bg-muted/50">
      <button onClick={runSimulation} disabled={simulating}>
        {simulating ? 'Simulating...' : 'Simulate with SwarmNet'}
      </button>

      {simulation && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Simulation Result:</p>
          {simulation.agents.map(agent => (
            <div key={agent.id} className="text-sm">
              <span className="font-medium">{agent.name}</span> would:
              <ul className="list-disc ml-4">
                {agent.files.map(f => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Estimated cost: {simulation.estimatedCost}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## The First Milestone (Week 1, $0)

**Goal:** A user can click "Simulate with SwarmNet" on a ticket and see what agents WOULD do.

**What gets built:**

1. ✅ `swarmnet_agents` table (seeded with 7 default agents)
2. ✅ `swarmnet_runs` table (with `is_simulation` column)
3. ✅ `swarmnet_events` table (event queue)
4. ✅ `lib/swarmnet/orchestrator.ts` (simulation mode only)
5. ✅ `app/api/swarmnet/simulate/route.ts` (POST to simulate)
6. ✅ `components/swarmnet-simulation-panel.tsx` (UI)
7. ✅ `app/(dashboard)/swarmnet/page.tsx` (dashboard)

**What does NOT get built yet:**

- ❌ Real LLM calls (no Groq/Claude usage)
- ❌ Real GitHub commits
- ❌ Real PRs
- ❌ Worker process (runs in Next.js API route for now)
- ❌ Webhook handlers
- ❌ Model router / tier system

**Total API cost: $0**

---

## The Second Milestone (Week 2, ~$2)

**Goal:** Turn on ONE real agent for ONE ticket.

**Process:**

1. Pick a simple ticket: "Add a loading spinner to the button component"
2. Set `SWARMNET_MODE=real` for `agent:frontend` only
3. All other agents stay in simulation mode
4. FrontendAgent calls Groq (cheap: Sonnet 4, ~$0.50)
5. FrontendAgent commits to a branch (GitHub API, free)
6. You review the PR manually
7. If it works → great! If not → fix prompt, retry (~$0.50 more)

**Total API cost: $0.50-2.00**

---

## The Third Milestone (Week 3, ~$5)

**Goal:** Two real agents working sequentially.

1. FrontendAgent builds UI (real)
2. TestAgent writes tests (real, but GPT-4o-mini = $0.15)
3. TestAgent runs tests via GitHub Actions (free)
4. If tests pass → auto-merge (configurable)

**Total API cost: $1-5**

---

## Risk Mitigation Checklist

| Fear                              | Mitigation                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| **Burning API credits**           | Simulation mode runs everything for $0. Real mode has per-run budget caps.               |
| **Breaking existing code**        | Feature flag `SWARMNET_ENABLED`. Existing Ship untouched.                                |
| **Agents going rogue**            | Trust levels: FrontendAgent can commit but not merge. BackendAgent needs human approval. |
| **Infinite loops**                | Orchestrator has max retries (3). After 3 failures, ticket goes to human.                |
| **Can't see what's happening**    | Every agent action = activity log + notification + comment. Full audit trail.            |
| **DB migrations breaking things** | Additive only. No existing tables changed. Rollback = drop 4 new tables.                 |
| **No UI to control it**           | Week 1 delivers simulation UI. Week 2 delivers real agent control panel.                 |

---

## The Honest Answer to "What Will Happen Down the Road?"

**Worst case:** Agents are unreliable. They produce broken code. You spent $20 testing and decide to:

- Keep SwarmNet in simulation mode as a "planning assistant"
- Keep Ship for actual code generation
- You still have a better ticket decomposition tool

**Best case:** Agents work. You have a system that builds features while you sleep.

**Most likely case:** Somewhere in between. FrontendAgent works well for UI. BackendAgent needs human review. TestAgent catches 70% of bugs. You save 50% of implementation time.

**The upside:** Even partial success means you're ahead. And you can tune agents over time — better prompts, better models, better context. The system improves.

**The downside:** If it fails completely, you've lost ~$50 in API credits and 3 weeks. But you've learned exactly what AI can and cannot do for your codebase.

---

## Decision Time

Three options:

**A. Full Send** — Start building the zero-cost simulation mode this week. See it work. Then decide about real agents.

**B. Pause** — Keep SwarmNet in `/docs/` only. Focus on other features (weekly digest, end-of-day meeting). Revisit in 2 months.

**C. Hybrid** — Build just the PlannerAgent simulation. It decomposes tickets for you (free, useful immediately). Everything else stays manual.

My recommendation: **A**. The simulation mode costs $0 and gives you visibility. You'll know within a week if this architecture feels right.
