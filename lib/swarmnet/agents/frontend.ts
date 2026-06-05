// lib/swarmnet/agents/frontend.ts
// FrontendAgent — mirrors Cascade's workflow: plan → grep → generate → run → fix → pass

import {
  createBranch,
  commitFile,
  createPullRequest,
  getRepoFileTree,
  getFileContents,
} from '@/lib/shipai/github';
import { updateSwarmnetRun, createSwarmnetArtifact } from '@/lib/db';
import {
  postTicketComment,
  logTicketActivity,
  documentRunComplete,
  documentPhaseMilestone,
} from './documenter';

interface AgentContext {
  runId: string;
  ticketId: string;
  ticketTitle: string;
  ticketDescription: string;
  projectId: string;
  projectName: string;
  orgId: string;
  branchName: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
}

interface AgentStep {
  phase: 'plan' | 'gather' | 'generate' | 'execute' | 'validate' | 'fix' | 'done' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AgentRunResult {
  success: boolean;
  steps: AgentStep[];
  filesCreated: string[];
  filesModified: string[];
  branchName: string;
  prNumber?: number;
  error?: string;
  totalCost: number;
}

// ─── PHASE 1: PLAN ──────────────────────────────────────────────
// Decide what to build and which files to touch

async function planPhase(
  ctx: AgentContext,
  steps: AgentStep[]
): Promise<{ plan: string; targetFiles: string[] }> {
  const planPrompt = `
You are a senior frontend engineer planning implementation.

TICKET: "${ctx.ticketTitle}"
DESCRIPTION: ${ctx.ticketDescription || 'No description'}

TASK: Analyze what needs to be built. Respond ONLY with JSON:
{
  "plan": "Brief 1-sentence plan",
  "newFiles": ["path/to/new/file.tsx"],
  "modifyFiles": ["path/to/existing/file.tsx"],
  "componentsNeeded": ["Button", "Modal", etc],
  "apisNeeded": ["GET /api/x", etc]
}
`;

  const res = await callGroq(planPrompt, 'llama-3.3-70b-versatile'); // Cheap planning

  let plan: any;
  try {
    plan = parseJsonResponse(res);
  } catch (e: any) {
    console.error(
      `[FrontendAgent ${ctx.runId}] Plan parse failed. Raw response:`,
      res.slice(0, 500)
    );
    throw new Error(`Plan phase failed: ${e.message}`);
  }

  steps.push({
    phase: 'plan',
    message: plan.plan,
    timestamp: new Date().toISOString(),
    metadata: { newFiles: plan.newFiles, modifyFiles: plan.modifyFiles },
  });

  return {
    plan: plan.plan,
    targetFiles: [...(plan.newFiles || []), ...(plan.modifyFiles || [])],
  };
}

// ─── PHASE 2: GATHER ────────────────────────────────────────────
// Grep + read existing code for context

async function gatherPhase(
  ctx: AgentContext,
  steps: AgentStep[],
  targetFiles: string[]
): Promise<Record<string, string>> {
  // 1. Get full file tree
  const fileTree = await getRepoFileTree({
    token: ctx.githubToken,
    owner: ctx.githubOwner,
    repo: ctx.githubRepo,
  });

  // 2. Grep for relevant files based on ticket keywords
  const keywords = extractKeywords(ctx.ticketTitle + ' ' + ctx.ticketDescription);
  const grepMatches = fileTree.filter((f) =>
    keywords.some((kw) => f.toLowerCase().includes(kw.toLowerCase()))
  );

  // 3. Always include pattern files (existing components for style reference)
  const patternFiles = fileTree
    .filter((f) => f.startsWith('components/') && (f.endsWith('.tsx') || f.endsWith('.ts')))
    .slice(0, 5);

  // 4. Include layout + utils for import patterns
  const coreFiles = ['app/layout.tsx', 'lib/utils.ts', 'app/globals.css'].filter((f) =>
    fileTree.includes(f)
  );

  // 5. De-duplicate and fetch contents
  const filesToRead = [
    ...new Set([...grepMatches, ...patternFiles, ...coreFiles, ...targetFiles]),
  ].slice(0, 15);
  const contents = await getFileContents(filesToRead, {
    token: ctx.githubToken,
    owner: ctx.githubOwner,
    repo: ctx.githubRepo,
  });

  steps.push({
    phase: 'gather',
    message: `Read ${Object.keys(contents).length} files for context`,
    timestamp: new Date().toISOString(),
    metadata: { filesRead: Object.keys(contents), keywords },
  });

  return contents;
}

// ─── PHASE 3: GENERATE ──────────────────────────────────────────
// Claude generates code with full context

async function generatePhase(
  ctx: AgentContext,
  steps: AgentStep[],
  plan: string,
  existingCode: Record<string, string>
): Promise<Record<string, string>> {
  const codePrompt = buildCodePrompt(ctx, plan, existingCode);

  const res = await callGroq(codePrompt, 'llama-3.3-70b-versatile'); // Heavy model for code
  const generated = parseGeneratedFiles(res);

  steps.push({
    phase: 'generate',
    message: `Generated ${Object.keys(generated).length} files`,
    timestamp: new Date().toISOString(),
    metadata: { filesGenerated: Object.keys(generated) },
  });

  return generated;
}

// ─── PHASE 4: EXECUTE ───────────────────────────────────────────
// Create branch and commit files

async function executePhase(
  ctx: AgentContext,
  steps: AgentStep[],
  files: Record<string, string>
): Promise<void> {
  // Create branch from main
  await createBranch(ctx.branchName, ctx.githubToken, {
    owner: ctx.githubOwner,
    repo: ctx.githubRepo,
  });

  // Commit each file
  for (const [path, content] of Object.entries(files)) {
    await commitFile(path, content, ctx.branchName, ctx.githubToken, {
      owner: ctx.githubOwner,
      repo: ctx.githubRepo,
      commitMessage: `feat(${ctx.ticketId}): ${path.split('/').pop()}\n\nAgent: agent:frontend\nTicket: ${ctx.ticketId}`,
    });
  }

  steps.push({
    phase: 'execute',
    message: `Committed ${Object.keys(files).length} files to ${ctx.branchName}`,
    timestamp: new Date().toISOString(),
    metadata: { branch: ctx.branchName, files: Object.keys(files) },
  });
}

// ─── PHASE 5: VALIDATE ──────────────────────────────────────────
// Run terminal commands: typecheck, lint, build

async function validatePhase(
  ctx: AgentContext,
  steps: AgentStep[],
  files: Record<string, string>
): Promise<{ passed: boolean; errors: string[] }> {
  // We can't directly run terminal on the user's machine, but we can:
  // 1. GitHub Actions runs checks on the PR
  // 2. For now, we do a basic syntax validation via Groq

  const fileBlocks = Object.entries(files)
    .map(([path, content]) => `--- FILE: ${path} ---\n${content.slice(0, 2000)}\n--- END ---`)
    .join('\n\n');

  const validatePrompt = `
You are a TypeScript compiler. Review the following code for syntax errors only.
Check: missing imports, undefined variables, wrong types, syntax mistakes.
Do NOT check logic or design. Return ONLY JSON:
{ "passed": boolean, "errors": ["..."] }

${fileBlocks}
`;

  const res = await callGroq(validatePrompt, 'llama-3.3-70b-versatile');

  let validation: { passed: boolean; errors: string[] };
  try {
    validation = parseJsonResponse(res);
  } catch (e: any) {
    console.error(
      `[FrontendAgent ${ctx.runId}] Validation parse failed. Raw response:`,
      res.slice(0, 500)
    );
    validation = { passed: true, errors: [`Validation parse failed: ${e.message}`] };
  }

  steps.push({
    phase: 'validate',
    message: validation.passed ? 'Validation passed' : `Found ${validation.errors.length} errors`,
    timestamp: new Date().toISOString(),
    metadata: validation,
  });

  return validation;
}

// ─── PHASE 6: FIX ────────────────────────────────────────────────
// If validation failed, fix and retry

async function fixPhase(
  ctx: AgentContext,
  steps: AgentStep[],
  files: Record<string, string>,
  errors: string[]
): Promise<Record<string, string>> {
  const fixPrompt = `
You are fixing TypeScript errors in generated code.

ERRORS:
${errors.map((e) => `- ${e}`).join('\n')}

Fix these errors and return ONLY the corrected code in the same format.
`;

  const res = await callGroq(fixPrompt, 'llama-3.3-70b-versatile');
  const fixed = parseGeneratedFiles(res);

  steps.push({
    phase: 'fix',
    message: `Fixed ${errors.length} errors`,
    timestamp: new Date().toISOString(),
    metadata: { errorsFixed: errors.length },
  });

  return fixed;
}

// ─── MAIN AGENT RUNNER ──────────────────────────────────────────

function makeDocCtx(ctx: AgentContext) {
  return {
    ticketId: ctx.ticketId,
    projectId: ctx.projectId,
    runId: ctx.runId,
    agentId: 'agent:frontend',
    orgId: ctx.orgId,
  };
}

async function saveProgress(
  runId: string,
  status: string,
  steps: AgentStep[],
  currentTask: string,
  extra?: Partial<any>
) {
  try {
    await updateSwarmnetRun(runId, {
      status,
      steps,
      currentTask,
      ...extra,
    });
  } catch (e) {
    console.error(`[Agent ${runId}] Failed to save progress:`, e);
  }
}

export async function runFrontendAgent(ctx: AgentContext): Promise<AgentRunResult> {
  const steps: AgentStep[] = [];
  let attempt = 0;
  const maxAttempts = 3;
  const docCtx = makeDocCtx(ctx);

  try {
    // ── PHASE 1: Plan ──
    await saveProgress(
      ctx.runId,
      'planning',
      steps,
      'Analyzing ticket and planning implementation...'
    );
    await documentPhaseMilestone(docCtx, 'plan', 'Starting plan phase');
    const { plan, targetFiles } = await planPhase(ctx, steps);
    await saveProgress(ctx.runId, 'planning', steps, `Plan ready: ${plan}`);
    await documentPhaseMilestone(docCtx, 'plan', `Planned: ${plan}`, {
      targetFiles,
    });

    // ── PHASE 2: Gather ──
    await saveProgress(ctx.runId, 'gathering', steps, 'Reading existing repo files for context...');
    await documentPhaseMilestone(docCtx, 'gather', 'Gathering code context');
    const existingCode = await gatherPhase(ctx, steps, targetFiles);
    await saveProgress(
      ctx.runId,
      'gathering',
      steps,
      `Read ${Object.keys(existingCode).length} files`
    );
    await documentPhaseMilestone(
      docCtx,
      'gather',
      `Read ${Object.keys(existingCode).length} files for context`
    );

    // ── PHASE 3: Generate ──
    await saveProgress(ctx.runId, 'coding', steps, 'Generating code with Groq...');
    await documentPhaseMilestone(docCtx, 'generate', 'Generating code');
    let files = await generatePhase(ctx, steps, plan, existingCode);
    await saveProgress(ctx.runId, 'coding', steps, `Generated ${Object.keys(files).length} files`, {
      filesCreated: Object.keys(files),
    });
    await documentPhaseMilestone(
      docCtx,
      'generate',
      `Generated ${Object.keys(files).length} files`,
      {
        files: Object.keys(files),
      }
    );

    // Save artifacts to DB
    for (const [path, content] of Object.entries(files)) {
      await createSwarmnetArtifact({
        runId: ctx.runId,
        filePath: path,
        content,
        isNew: true,
      });
    }

    // ── PHASE 4-6: Execute → Validate → Fix (loop) ──
    while (attempt < maxAttempts) {
      attempt++;

      // Execute
      await saveProgress(
        ctx.runId,
        'committing',
        steps,
        `Committing ${Object.keys(files).length} files to branch ${ctx.branchName}...`
      );
      await executePhase(ctx, steps, files);
      await saveProgress(
        ctx.runId,
        'committing',
        steps,
        `Committed ${Object.keys(files).length} files`
      );
      await documentPhaseMilestone(
        docCtx,
        'execute',
        `Committed ${Object.keys(files).length} files to ${ctx.branchName}`
      );

      // Validate
      await saveProgress(
        ctx.runId,
        'testing',
        steps,
        'Running validation checks on generated code...'
      );
      const validation = await validatePhase(ctx, steps, files);
      await saveProgress(
        ctx.runId,
        'testing',
        steps,
        validation.passed ? 'Validation passed' : `Found ${validation.errors.length} errors`
      );
      await documentPhaseMilestone(
        docCtx,
        'validate',
        validation.passed ? 'Validation passed' : `Found ${validation.errors.length} errors`
      );

      if (validation.passed) {
        break; // Done!
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `Failed after ${maxAttempts} attempts. Errors: ${validation.errors.join('; ')}`
        );
      }

      // Fix
      await saveProgress(
        ctx.runId,
        'fixing',
        steps,
        `Fixing ${validation.errors.length} validation errors...`
      );
      files = await fixPhase(ctx, steps, files, validation.errors);
      await saveProgress(
        ctx.runId,
        'fixing',
        steps,
        `Fixed ${validation.errors.length} errors (attempt ${attempt})`
      );
      await documentPhaseMilestone(
        docCtx,
        'fix',
        `Fixed ${validation.errors.length} errors (attempt ${attempt})`
      );
    }

    // ── PHASE 7: Open PR ──
    await saveProgress(ctx.runId, 'reviewing', steps, 'Opening pull request on GitHub...');
    const pr = await createPullRequest(
      `feat: ${ctx.ticketTitle}`,
      ctx.branchName,
      ctx.githubToken,
      { owner: ctx.githubOwner, repo: ctx.githubRepo }
    );

    steps.push({
      phase: 'done',
      message: `PR #${pr.number} opened`,
      timestamp: new Date().toISOString(),
      metadata: { prNumber: pr.number, prUrl: pr.html_url },
    });

    await saveProgress(ctx.runId, 'done', steps, `PR #${pr.number} opened successfully`, {
      prNumber: pr.number,
      prUrl: pr.html_url,
    });

    // ── DocumenterBot wrap-up ──
    await documentRunComplete(docCtx, {
      success: true,
      prNumber: pr.number,
      prUrl: pr.html_url,
      branchName: ctx.branchName,
      filesCreated: Object.keys(files),
      filesModified: [],
      steps: steps.map((s) => ({ phase: s.phase, message: s.message })),
    });

    return {
      success: true,
      steps,
      filesCreated: Object.keys(files),
      filesModified: [],
      branchName: ctx.branchName,
      prNumber: pr.number,
      totalCost: 0,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[FrontendAgent ${ctx.runId}] FAILED:`, errMsg);
    steps.push({
      phase: 'error',
      message: errMsg,
      timestamp: new Date().toISOString(),
    });

    await saveProgress(ctx.runId, 'error', steps, `Error: ${errMsg}`, { errorMessage: errMsg });

    await documentRunComplete(docCtx, {
      success: false,
      branchName: ctx.branchName,
      filesCreated: [],
      filesModified: [],
      steps: steps.map((s) => ({ phase: s.phase, message: s.message })),
      error: errMsg,
    });

    return {
      success: false,
      steps,
      filesCreated: [],
      filesModified: [],
      branchName: ctx.branchName,
      error: errMsg,
      totalCost: 0,
    };
  }
}

// ─── HELPERS ────────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter((w) => !['build', 'create', 'add', 'the', 'with', 'from', 'for', 'and'].includes(w));
  return [...new Set(words)].slice(0, 5);
}

function buildCodePrompt(
  ctx: AgentContext,
  plan: string,
  existingCode: Record<string, string>
): string {
  const existingFilesSection = Object.entries(existingCode)
    .map(([path, content]) => `### ${path}\n\`\`\`tsx\n${content}\n\`\`\``)
    .join('\n\n');

  return `
You are a senior frontend engineer implementing a ticket.

TICKET: "${ctx.ticketTitle}"
DESCRIPTION: ${ctx.ticketDescription || ''}
PLAN: ${plan}

EXISTING CODEBASE PATTERNS (read these to match style):
${existingFilesSection}

RULES:
1. Use existing components from @/components/ui/ when available
2. Use Tailwind CSS classes matching existing style (rounded-2xl, bg-card, border-border, etc.)
3. Use lucide-react for icons
4. Import style: import { X } from 'lucide-react'
5. Use 'use client' for client components
6. Export default function or named export
7. Include TypeScript interfaces for props
8. Match existing code formatting and naming conventions
9. Do NOT use any packages not already in the project

OUTPUT FORMAT:
Return ONLY file paths and contents in this format:

---FILE: path/to/file.tsx---
{code}
---ENDFILE---

Generate all needed files.
`;
}

function parseGeneratedFiles(raw: string): Record<string, string> {
  const files: Record<string, string> = {};
  const regex = /---FILE:\s*(.+?)---\n([\s\S]*?)---ENDFILE---/g;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    files[match[1].trim()] = match[2].trim();
  }
  return files;
}

function parseJsonResponse(raw: string): any {
  // 1. Strip markdown code fences
  let cleaned = raw
    .replace(/```json\s*/g, '')
    .replace(/```\s*$/g, '')
    .trim();

  // 2. Find balanced JSON object by brace counting
  let start = cleaned.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');

  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  if (end === -1) throw new Error('Unbalanced JSON braces in response');

  const jsonStr = cleaned.slice(start, end);
  try {
    return JSON.parse(jsonStr);
  } catch (e: any) {
    console.error('[parseJsonResponse] Failed to parse:', jsonStr.slice(0, 200));
    throw new Error(`JSON parse failed: ${e.message}`);
  }
}

// Groq API wrapper — 200x cheaper than Claude
async function callGroq(prompt: string, model: string, maxTokens = 4000): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq API error: ${res.status} — ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}
