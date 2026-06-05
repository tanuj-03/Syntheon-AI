// lib/shipai/ai.ts
import fs from 'fs';
import path from 'path';

const PROMPT_PATH = path.join(process.cwd(), 'prompts/devPrompt.txt');

function loadSystemPrompt(): string {
  return fs.readFileSync(PROMPT_PATH, 'utf-8').trim();
}

export interface LinearSubtask {
  title: string;
  description: string;
}

export interface PlanFile {
  path: string;
  content: string;
}

export interface DevPlan {
  issue_title: string;
  issue_body: string;
  branch_name: string;
  pr_title: string;
  linear_subtasks: LinearSubtask[];
  files: PlanFile[];
}

export interface PlannerResponse {
  filesToModify: string[];
  filesToCreate: string[];
  reasoning: string;
}

function validatePlan(plan: any): asserts plan is DevPlan {
  const required = [
    'issue_title',
    'issue_body',
    'branch_name',
    'pr_title',
    'linear_subtasks',
    'files',
  ];
  for (const key of required) {
    if (!plan[key]) throw new Error(`AI response missing required field: "${key}"`);
  }
  if (!Array.isArray(plan.linear_subtasks) || plan.linear_subtasks.length === 0) {
    throw new Error('linear_subtasks must be a non-empty array');
  }
  for (const subtask of plan.linear_subtasks) {
    if (!subtask.title || !subtask.description) {
      throw new Error(`Each subtask must have title and description`);
    }
  }
  if (!Array.isArray(plan.files) || plan.files.length === 0) {
    throw new Error('files must be a non-empty array');
  }
  for (const file of plan.files) {
    if (!file.path || typeof file.content !== 'string') {
      throw new Error(`Each file must have path and content`);
    }
  }
}

const GITHUB_PAGES_WORKFLOW = `name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4`;

// ─── Standard plan generation (first ship) ─────────────────────
export async function generatePlan(featureRequest: string): Promise<DevPlan> {
  const systemPrompt = loadSystemPrompt();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: featureRequest },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Groq API error: ${res.status} — ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content.trim();
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw;

  let plan: any;
  try {
    // Try direct parse first
    plan = JSON.parse(jsonStr);
  } catch {
    // Try to find and extract just the JSON object
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        plan = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      } catch {
        throw new Error(`Coder returned invalid JSON: ${raw.slice(0, 300)}`);
      }
    } else {
      throw new Error(`Coder returned invalid JSON: ${raw.slice(0, 300)}`);
    }
  }

  validatePlan(plan);

  // Inject GitHub Pages workflow
  plan.files.push({
    path: '.github/workflows/deploy.yml',
    content: GITHUB_PAGES_WORKFLOW,
  });

  return plan;
}

// ─── Step 1: Planner — decides which files need to change ───────
export async function planFollowUpChanges(
  projectContext: {
    name: string;
    context: string;
    files: string[];
    specs: string[];
  },
  newSpecs: string[],
  notes: Record<string, string> = {}
): Promise<PlannerResponse> {
  const notesList = Object.values(notes).filter(Boolean);

  const prompt = `You are a senior software engineer analyzing an existing project.

PROJECT MEMORY:
Name: ${projectContext.name}
Purpose: ${projectContext.context}
Previously built specs:
${projectContext.specs.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

Files currently in the repo:
${projectContext.files.map((f) => `  - ${f}`).join('\n')}

NEW SPECS TO IMPLEMENT:
${newSpecs.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}
${notesList.length > 0 ? `\nAdditional notes:\n${notesList.map((n) => `  - ${n}`).join('\n')}` : ''}

TASK:
Analyze which files need to be modified and which new files need to be created.
Do NOT include .github/workflows files.
Be precise — only include files that actually need to change.

Respond ONLY with valid JSON in this format:
{
  "filesToModify": ["path/to/file1.js", "path/to/file2.css"],
  "filesToCreate": ["path/to/newfile.js"],
  "reasoning": "Brief explanation of why these files need to change"
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // low temperature for precise planning
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Groq planner error: ${res.status} — ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content.trim();
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw;

  try {
    return JSON.parse(jsonStr) as PlannerResponse;
  } catch {
    throw new Error(`Planner returned invalid JSON: ${raw.slice(0, 300)}`);
  }
}

// ─── Step 2: Coder — generates changes based on existing files ──
export async function generateFollowUpPlan(
  projectContext: {
    name: string;
    context: string;
    specs: string[];
  },
  newSpecs: string[],
  existingFiles: Record<string, string>,
  filesToCreate: string[],
  notes: Record<string, string> = {}
): Promise<DevPlan> {
  const notesList = Object.values(notes).filter(Boolean);
  const systemPrompt = loadSystemPrompt();

  const existingFilesContent = Object.entries(existingFiles)
    .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n');

  const prompt = `You are working on an EXISTING project. Do not rewrite everything from scratch.

PROJECT CONTEXT:
Name: ${projectContext.name}
Purpose: ${projectContext.context}
Previously built: ${projectContext.specs.join(', ')}

EXISTING FILE CONTENTS:
${existingFilesContent}

NEW SPECS TO ADD:
${newSpecs.map((s, i) => `${i + 1}. ${s}`).join('\n')}
${notesList.length > 0 ? `\nNotes:\n${notesList.map((n) => `- ${n}`).join('\n')}` : ''}
${filesToCreate.length > 0 ? `\nNew files to create: ${filesToCreate.join(', ')}` : ''}

IMPORTANT RULES:
- Only include files that actually changed or are new
- Maintain the existing code style and structure
- Do not rewrite unchanged files
- Build on top of the existing code, do not replace it

${systemPrompt}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Groq coder error: ${res.status} — ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const raw = data.choices[0].message.content.trim();
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = match ? match[1].trim() : raw;

  let plan: any;
  try {
    plan = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Coder returned invalid JSON: ${raw.slice(0, 300)}`);
  }

  validatePlan(plan);
  return plan;
}
