# SwarmNet — Code Commit & Deployment Strategy

> How agents write code, where they write it, and how it gets to production.

---

## The Commit Model

Agents don't have local filesystems. They interact with code **exclusively through the GitHub API**.

### Why Not Local Filesystem?

| Approach                  | Problem                                          |
| ------------------------- | ------------------------------------------------ |
| Local git clone on server | Needs persistent disk, Docker, SSH keys          |
| Local git clone + commit  | Risk of merge conflicts, stale code              |
| GitHub API                | Stateless, reliable, audit trail, no disk needed |

**The GitHub API is the agent's filesystem.**

---

## Branching Strategy

### Model A: One Branch Per Ticket (Recommended)

```
main
  ├── feature/notification-bell     ← FrontendAgent
  ├── feature/notifications-api     ← BackendAgent
  ├── feature/notifications-schema  ← DatabaseAgent
  └── feature/notification-tests    ← TestAgent (depends on above)
```

**Flow:**

1. Agent claims ticket → Orchestrator creates branch from `main`
2. Agent commits all files to its branch
3. Agent opens PR → triggers SecurityAgent + TestAgent
4. PR approved + checks pass → merge to `main`
5. Orchestrator deletes branch

**Pros:**

- Clean isolation — one agent's bugs don't block others
- Easy rollback — just revert one PR
- Parallel work — multiple agents, no merge conflicts

**Cons:**

- Cross-ticket dependencies need sequential merging (Ticket A PR → merge → Ticket B starts)
- More PRs to review

### Model B: Shared Feature Branch

```
main
  └── feature/notifications-system    ← All agents commit here
```

All agents working on the "notifications system" commit to one branch.

**Flow:**

1. Orchestrator creates shared branch
2. DatabaseAgent commits first (schema)
3. BackendAgent commits second (API)
4. FrontendAgent commits third (UI)
5. TestAgent commits fourth (tests)
6. One big PR → review → merge

**Pros:**

- One PR to review for a feature set
- Agents can see each other's commits immediately
- Easier to test the full feature end-to-end

**Cons:**

- If one agent breaks the branch, everyone is blocked
- Merge conflicts between agents on same branch
- Harder to partial-revert

### Hybrid Model (What We'll Use)

```
main
  ├── swarm/feature-123/database    ← DatabaseAgent (auto-merges on pass)
  ├── swarm/feature-123/backend     ← BackendAgent (blocks on DB merge)
  ├── swarm/feature-123/frontend    ← FrontendAgent (blocks on API merge)
  └── swarm/feature-123/tests       ← TestAgent (blocks on all above)
```

Each agent gets a **sub-branch** scoped to their domain. Orchestrator controls merge order via dependencies.

**Naming convention:**

```
swarm/{ticket-id}/{domain}/{slug}

Examples:
swarm/tkt-456/database/notifications-table
swarm/tkt-456/backend/notifications-api
swarm/tkt-456/frontend/notification-bell
```

This makes it instantly clear which agent owns which branch.

---

## The Commit Contract

Every agent commit must include:

1. **Clear commit message**

```
feat(notifications): add notification bell component

- Bell icon with unread count badge
- Dropdown panel with notification list
- Auto-polls for new notifications every 30s
- Click to mark as read

Agent: FrontendAgent
Ticket: tkt-456
```

2. **Signed-off-by agent**

```
Signed-off-by: agent:frontend <swarmnet@syntheon.ai>
```

3. **No force pushes** — Agents never force-push. If they need to fix, they make a new commit.

---

## Agent Commit Sequence

```typescript
async function agentCommitSequence(run: Run, files: FileChange[]) {
  const branch = run.branch_name;

  for (const file of files) {
    // 1. Check if file exists on branch
    const existingSha = await github.getFileSha(file.path, branch);

    // 2. Base64 encode content
    const encoded = Buffer.from(file.content, 'utf-8').toString('base64');

    // 3. Commit via GitHub API
    await github.commitFile(file.path, file.content, branch, {
      commitMessage: `feat(${run.ticket_slug}): ${file.description}\n\nAgent: ${run.agent_id}\nTicket: ${run.ticket_id}`,
    });

    // 4. Store artifact in DB for display
    await createArtifact(run.id, file.path, file.content, !existingSha);
  }

  // 5. Update run record
  await updateRun(run.id, {
    files_created: files.filter((f) => f.isNew).map((f) => f.path),
    files_modified: files.filter((f) => !f.isNew).map((f) => f.path),
    head_commit_sha: await github.getBranchHead(branch),
  });
}
```

---

## PR Lifecycle

### 1. Auto-Generated PR Description

```markdown
## 🤖 SwarmNet Agent PR

**Agent:** FrontendAgent  
**Ticket:** [Build notification bell component](https://syntheon.app/tickets/tkt-456)  
**Branch:** `swarm/tkt-456/frontend/notification-bell`

### Changes

- `components/notification-bell.tsx` — New component
- `app/(dashboard)/dashboard/page.tsx` — Integrated bell into header

### Agent Notes

> Built with shadcn/ui patterns. Bell icon from lucide-react.
> Dropdown uses existing Popover component. No new dependencies.

### Checklist

- [x] Security scan passed
- [x] TypeScript check passed
- [ ] Human review (required — trust level: medium)

---

_This PR was automatically generated by SwarmNet._
```

### 2. PR Checks (Automated)

Every SwarmNet PR runs these checks:

| Check                       | Agent         | Blocking?               |
| --------------------------- | ------------- | ----------------------- |
| TypeScript (`tsc --noEmit`) | TestAgent     | Yes                     |
| ESLint                      | TestAgent     | Yes                     |
| Unit tests                  | TestAgent     | Yes                     |
| Security scan               | SecurityAgent | Yes (for critical/high) |
| Build                       | TestAgent     | Yes                     |

If any check fails:

1. PR is labeled `swarmnet:failed`
2. Agent that wrote the code gets a notification
3. Agent reclaims ticket and fixes
4. Push new commit → checks re-run

### 3. Merge Rules

Based on agent trust level:

| Trust Level | Auto-merge conditions                      |
| ----------- | ------------------------------------------ |
| **High**    | All checks pass → auto-merge immediately   |
| **Medium**  | All checks pass + 1 human approval → merge |
| **Low**     | All checks pass + admin approval → merge   |

**Override:** Humans can always merge manually or reject.

---

## Rollback Strategy

### Scenario: Merged PR broke production

```typescript
async function emergencyRollback(prNumber: number) {
  // 1. Find the merge commit
  const pr = await github.getPR(prNumber);
  const mergeCommit = pr.merge_commit_sha;

  // 2. Create revert PR
  await github.revertCommit(mergeCommit, {
    branchName: `swarm/rollback/${prNumber}`,
    title: `🚨 Rollback: Revert PR #${prNumber}`,
    body: `Automatically rolled back due to production failure.`,
  });

  // 3. Fast-track merge (admin override)
  await github.mergePR(revertPR.number, { admin: true });

  // 4. Notify
  await createNotification({
    user_id: orgAdminId,
    type: 'blocked',
    title: '🚨 Auto-rollback executed',
    message: `PR #${prNumber} was rolled back due to failures.`,
    ticket_id: relatedTicketId,
  });

  // 5. Re-queue ticket
  await updateTicket(ticketId, { status: 'backlog', assignee_user_id: null });
}
```

**Production Agent monitors deployment health** and triggers rollback if error rate spikes.

---

## Preview Deployments

Every SwarmNet PR gets a preview deployment:

```typescript
async function createPreviewDeployment(pr: PR) {
  // Vercel: auto-deploys branch previews
  // Render: manual preview URL generation

  const previewUrl = await vercel.deployBranch(pr.branch);

  // Post to PR
  await github.postPRComment(
    pr.number,
    `🚀 **Preview deployed:** ${previewUrl}\n\nTest the changes live before merging.`
  );

  // Post to Syntheon ticket
  await createComment(
    ticketId,
    'agent:production',
    `[AGENT: ProductionAgent] 🚀 Preview Ready\n\n${previewUrl}`
  );
}
```

**For v1:** Leverage Vercel's automatic branch previews (free). No extra work needed.

---

## GitHub Actions Integration

SwarmNet doesn't replace CI/CD. It **extends** it.

```yaml
# .github/workflows/swarmnet-checks.yml
name: SwarmNet Checks

on:
  pull_request:
    branches: [main]

jobs:
  swarmnet-checks:
    if: startsWith(github.head_ref, 'swarm/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: TypeScript
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint .

      - name: Tests
        run: npx vitest run

      - name: SwarmNet Security Scan
        run: curl -X POST ${{ secrets.SYNTHEON_API }}/swarmnet/security-scan \
          -H "Authorization: Bearer ${{ secrets.SYNTHEON_TOKEN }}" \
          -d "{\"pr\": ${{ github.event.pull_request.number }}}"

      - name: Report Results to Syntheon
        if: always()
        run: curl -X POST ${{ secrets.SYNTHEON_API }}/swarmnet/check-complete \
          -H "Authorization: Bearer ${{ secrets.SYNTHEON_TOKEN }}" \
          -d "{\"pr\": ${{ github.event.pull_request.number }}, \"passed\": ${{ job.status == 'success' }}}"
```

This means:

- Standard CI runs first (typecheck, lint, test)
- SwarmNet-specific checks run after
- Results are POSTed back to Syntheon via API
- Orchestrator consumes these and decides merge
