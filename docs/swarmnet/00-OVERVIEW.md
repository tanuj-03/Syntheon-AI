# SwarmNet — Architecture Overview

> "Windsurf for Syntheon" — Multi-agent orchestration layer that turns Syntheon tickets into production code through specialized AI agents.

---

## The Core Idea

Syntheon already tracks what needs to be built (tickets, dependencies, meetings). SwarmNet is the **execution layer** that actually builds it.

Instead of one monolithic AI generating everything, SwarmNet decomposes work across **domain-specialized agents** that:

1. **Claim** tickets from the queue
2. **Plan** their approach by reading existing code
3. **Execute** by committing to GitHub
4. **Verify** by running tests/typechecks
5. **Report** back through Syntheon's existing notification/activity system

---

## Mental Model: Syntheon as the "Jira", SwarmNet as the "Team"

| Syntheon (Human Layer)                         | SwarmNet (Agent Layer)                     |
| ---------------------------------------------- | ------------------------------------------ |
| User creates a ticket                          | Agent sees ticket in queue                 |
| User assigns ticket                            | Agent claims ticket                        |
| User comments with context                     | Agent reads comments as context            |
| User moves ticket to Done                      | Agent moves ticket to Done after PR merged |
| Activity log shows "John moved to In Progress" | Activity log shows "FrontendAgent claimed" |
| Notifications alert humans                     | Notifications alert dependent agents       |

**The beautiful part:** SwarmNet uses Syntheon's existing data model. Agents are just "users" with special privileges.

---

## Why This Isn't Ship 2.0

Ship (existing) is a **single-shot code generator**:

- One AI call → all files → one branch → one PR
- Works for greenfield apps from meeting tickets
- No incremental updates, no testing, no validation

SwarmNet is a **continuous delivery system**:

- Multiple agents working in parallel or sequence
- Each agent owns a domain, commits independently
- Follow-up changes are first-class (not a hack)
- Testing/validation blocks merge (gates)
- Can run indefinitely, picking up new tickets as they arrive

---

## Architecture Principles

1. **Syntheon-native** — Agents read/write through the existing ticket/comment/activity API. No separate queue system.
2. **GitHub as source of truth** — All code lives in GitHub. Agents don't have local filesystems; they use the GitHub API.
3. **Atomic, reversible commits** — Each agent's work is a single commit on a feature branch. Easy to revert.
4. **Dependency-aware scheduling** — If Ticket B depends on Ticket A, the BackendAgent waits for FrontendAgent's PR to merge before starting.
5. **Human in the loop (configurable)** — Simple tickets auto-merge. Complex tickets require human PR review.
6. **Self-documenting** — Every action an agent takes is logged as a Syntheon activity + notification.

---

## System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     SWARMNET (NEW)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Planner    │  │  Frontend   │  │   Backend   │         │
│  │   Agent     │  │   Agent     │  │   Agent     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Database   │  │  Security   │  │   Test      │         │
│  │   Agent     │  │   Agent     │  │   Agent     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │ Production │  │ Orchestrator │                           │
│  │   Agent    │  │   (Swarm)    │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ SYNTHEON │          │ GITHUB  │          │  GROQ   │
   │ Tickets  │          │  Repo   │          │  APIs   │
   │Comments  │          │ Branches│          │         │
   │Activities│          │  PRs    │          │         │
   └─────────┘          └─────────┘          └─────────┘
```

---

## File Map (This Doc Directory)

| File                   | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `00-OVERVIEW.md`       | This file — high-level concepts                        |
| `01-AGENTS.md`         | Agent definitions, roles, capabilities                 |
| `02-PROTOCOL.md`       | How agents communicate via tickets/comments/activities |
| `03-ORCHESTRATOR.md`   | Orchestrator logic, scheduling, dependency resolution  |
| `04-SCHEMA.md`         | DB schema additions for jobs, runs, artifacts          |
| `05-DEPLOYMENT.md`     | How code gets committed, branched, merged              |
| `06-SHIP-MIGRATION.md` | How existing Ship system evolves into SwarmNet         |
| `07-GLOSSARY.md`       | Naming conventions and terminology                     |

---

## Open Questions (To Resolve Today)

1. Do agents share one branch or get independent branches per ticket?
2. How does the Orchestrator run — cron job, webhook-triggered, or persistent worker?
3. What happens when two agents need to touch the same file?
4. How do we prevent infinite loops (agent A fixes → breaks agent B's work → agent B fixes → breaks A)?
5. Should there be a "Review Agent" that does code review before human eyes see it?
