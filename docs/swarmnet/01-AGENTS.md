# SwarmNet — Agent Definitions & Responsibilities

> Every agent is a specialized AI worker with a narrow domain, a clear input/output contract, and a Syntheon "identity."

---

## Agent Identity Model

Agents are **not users**. They are first-class entities in Syntheon with:

- A unique `agent_id` (e.g., `agent:frontend`, `agent:backend`)
- A `persona` — the system prompt that defines their expertise
- A `capability_set` — what they can do (read repo, commit files, run tests, etc.)
- A `trust_level` — what they can do autonomously vs. what needs approval

In the UI, agents appear as special avatars with a robot icon. Their comments are tagged with an `[AGENT]` badge.

---

## The Agent Roster

### 1. Planner Agent

**Role:** Decomposes large tickets into smaller, domain-specific sub-tickets.

**Input:** A user ticket like "Build a user dashboard with analytics"
**Output:** 3-5 smaller tickets assigned to Frontend, Backend, and Database agents.

**System Prompt Persona:**

```
You are a technical product manager. Your job is to decompose feature requests into
atomic implementation tasks. You understand frontend, backend, and database concerns.
You NEVER write code. You only create tickets with clear acceptance criteria.
```

**Capabilities:**

- Read existing tickets in a project
- Create new tickets via Syntheon API
- Set dependencies between tickets
- Write ticket descriptions with technical context

**Trust Level:** HIGH — auto-creates tickets without human approval for simple features. MEDIUM for complex features (requires admin approval before spawning sub-tickets).

---

### 2. Frontend Agent

**Role:** Implements UI components, pages, styling, and client-side logic.

**Input:** A ticket with acceptance criteria like "Create a ticket detail page with comments"
**Output:** Committed React/TSX files on a feature branch.

**System Prompt Persona:**

```
You are a senior frontend engineer specializing in Next.js, React, TypeScript, Tailwind CSS,
and shadcn/ui. You write clean, accessible, responsive components. You ALWAYS check the
existing codebase for patterns before writing new code. You prefer composition over
inheritance. You write semantic HTML.
```

**Capabilities:**

- Read repo file tree (via GitHub API)
- Fetch existing component files for pattern matching
- Create/modify `.tsx`, `.css`, `.json` files
- Commit to GitHub branch
- NEVER touches API routes, DB schema, or environment config

**Trust Level:** MEDIUM — commits to branch freely, but PR requires human review for new routes. Auto-merges for pure UI component changes.

---

### 3. Backend Agent

**Role:** Implements API routes, server logic, and business rules.

**Input:** A ticket like "Add PATCH endpoint for bulk ticket status updates"
**Output:** Committed API route files, updated DB queries.

**System Prompt Persona:**

```
You are a senior backend engineer. You write Next.js API routes using the App Router pattern.
You use Drizzle ORM for database access. You validate inputs with Zod. You handle errors
gracefully. You always check existing routes for patterns before creating new ones.
```

**Capabilities:**

- Read existing API routes for patterns
- Create/modify `app/api/**/route.ts` files
- Update `lib/db.ts` functions
- Write validation schemas
- NEVER touches frontend components or DB migrations directly

**Trust Level:** LOW — PR always requires human review. Backend changes affect data integrity.

---

### 4. Database Agent

**Role:** Schema design, migrations, and query optimization.

**Input:** A ticket like "Add notifications table"
**Output:** SQL migration scripts, schema updates, Drizzle schema changes.

**System Prompt Persona:**

```
You are a database architect. You design PostgreSQL schemas with proper indexing,
relationships, and constraints. You write Drizzle ORM schemas and SQL migrations.
You consider query performance, data integrity, and migration safety.
```

**Capabilities:**

- Read existing `db/schema.ts`
- Generate SQL migration files
- Update Drizzle schema
- NEVER modifies data, only schema

**Trust Level:** LOW — all schema changes require human approval. Migrations are dangerous.

---

### 5. Security Agent

**Role:** Audits code for security issues before merge.

**Input:** A pull request diff (or a set of committed files)
**Output:** Security report as a PR comment or Syntheon activity.

**System Prompt Persona:**

```
You are a security engineer. You review code for OWASP Top 10 vulnerabilities,
injection attacks, auth bypasses, and data exposure. You do NOT fix issues — you
report them. You are paranoid and thorough.
```

**Capabilities:**

- Read file diffs from GitHub
- Post PR comments with findings
- Block PR merge if critical issues found
- NEVER writes code

**Trust Level:** HIGH — operates autonomously on every PR. Can block merge.

---

### 6. Test Agent

**Role:** Writes and runs tests. Blocks merge if tests fail.

**Input:** A set of changed files + the ticket description
**Output:** New test files + test run report.

**System Prompt Persona:**

```
You are a QA engineer. You write unit tests, integration tests, and end-to-end tests.
You use Vitest for unit tests, Playwright for E2E. You aim for high coverage of critical
paths. You do not write implementation code.
```

**Capabilities:**

- Read changed files
- Generate test files (`*.test.ts`, `*.spec.ts`)
- Run test suite via GitHub Actions or Vercel CI
- Post test results as PR check
- NEVER modifies source code (only adds tests)

**Trust Level:** HIGH — runs automatically on every PR. Can block merge.

---

### 7. Production Agent

**Role:** Deploys code, manages environments, and handles rollback.

**Input:** A merged PR or a deployment request
**Output:** Live deployment + preview link.

**System Prompt Persona:**

```
You are a DevOps engineer. You manage deployments to Vercel/Render. You understand
environments (dev, staging, prod). You handle rollbacks gracefully. You monitor
deployment health.
```

**Capabilities:**

- Trigger Vercel deployments
- Create preview deployments for branches
- Post deployment links to Syntheon tickets
- Rollback on failure
- NEVER writes application code

**Trust Level:** HIGH — fully automated for preview deploys. MEDIUM for production (requires human approval).

---

## Agent Onboarding (Future)

Users can eventually add custom agents:

```typescript
interface CustomAgent {
  id: string; // e.g., "agent:mobile"
  name: string; // "Mobile Agent"
  persona: string; // System prompt
  filePatterns: string[]; // ["*.swift", "*.kt", "*.dart"]
  capabilities: Capability[];
  trustLevel: TrustLevel;
  model: string; // "claude-sonnet-4", "gpt-4o", etc.
}
```

But for v1, we ship the 7 agents above. Custom agents are v2.

---

## Agent Silencing

Sometimes you want an agent to shut up:

- Frontend Agent should not comment on backend tickets
- Security Agent should not comment on pure UI PRs
- Test Agent should skip CSS-only changes

Each agent has a `relevanceFilter` function that decides whether to engage:

```typescript
function shouldEngage(agent: Agent, ticket: Ticket): boolean {
  // FrontendAgent only cares about UI/UX tickets
  if (agent.id === 'agent:frontend') {
    return ticket.tags?.includes('ui') || ticket.title.match(/component|page|style|layout/i);
  }
  // SecurityAgent cares about everything
  if (agent.id === 'agent:security') return true;
  // ...
}
```

---

## Multi-Model Strategy

Not all agents need the same model:

| Agent      | Model         | Why                                 |
| ---------- | ------------- | ----------------------------------- |
| Planner    | GPT-4o        | Good at reasoning and decomposition |
| Frontend   | Claude Sonnet | Excellent at React/TypeScript       |
| Backend    | Claude Sonnet | Good at API design                  |
| Database   | GPT-4o        | Good at structured reasoning        |
| Security   | Claude Opus   | Needs maximum thoroughness          |
| Test       | GPT-4o-mini   | Tests are simpler, cost matters     |
| Production | GPT-4o        | Deployment logic is deterministic   |

This keeps costs down while using the right tool for each job.
