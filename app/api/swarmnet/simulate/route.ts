import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface SimTicket {
  id: string;
  title: string;
  description: string;
  status: string;
}

function generateSimulation(projectName: string, context: string, tickets: SimTicket[]) {
  const ticketTitles = tickets.map((t) => t.title);
  const hasFrontend = tickets.some((t) =>
    /ui|component|page|layout|style|button|modal|form|card|nav|header|footer|theme|dark|light/i.test(
      t.title + ' ' + (t.description || '')
    )
  );
  const hasBackend = tickets.some((t) =>
    /api|endpoint|route|server|auth|login|webhook|integration/i.test(
      t.title + ' ' + (t.description || '')
    )
  );
  const hasDatabase = tickets.some((t) =>
    /table|schema|migration|column|field|relation|index/i.test(
      t.title + ' ' + (t.description || '')
    )
  );

  const steps: Array<{
    agent: string;
    agentId: string;
    icon: string;
    status: 'pending' | 'running' | 'done' | 'error';
    files?: string[];
    branch?: string;
    message: string;
    cost?: string;
  }> = [];

  // Planner always runs first
  steps.push({
    agent: 'Planner Agent',
    agentId: 'agent:planner',
    icon: 'bot',
    status: 'done',
    message: `Analyzed ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} and created build plan for "${projectName}".`,
    cost: '$0.002',
  });

  const branchBase = `swarm/${projectName.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`;

  let seq = 1;

  if (hasDatabase) {
    steps.push({
      agent: 'Database Agent',
      agentId: 'agent:database',
      icon: 'git-branch',
      status: 'pending',
      message: 'Would create or update database schema based on ticket requirements.',
      files: ['db/schema.ts', 'sql/migration.sql'],
      branch: `${branchBase}/${seq++}-database`,
      cost: '$0.05',
    });
  }

  if (hasBackend) {
    steps.push({
      agent: 'Backend Agent',
      agentId: 'agent:backend',
      icon: 'wrench',
      status: 'pending',
      message: 'Would implement API routes and server logic.',
      files: ['app/api/feature/route.ts', 'lib/db.ts'],
      branch: `${branchBase}/${seq++}-backend`,
      cost: '$0.50',
    });
  }

  if (hasFrontend) {
    steps.push({
      agent: 'Frontend Agent',
      agentId: 'agent:frontend',
      icon: 'file-code',
      status: 'pending',
      message: 'Would build React components and integrate into existing UI.',
      files: ['components/feature-component.tsx', 'app/(dashboard)/feature/page.tsx'],
      branch: `${branchBase}/${seq++}-frontend`,
      cost: '$0.30',
    });
  }

  // Test agent always runs
  steps.push({
    agent: 'Test Agent',
    agentId: 'agent:test',
    icon: 'check-circle',
    status: 'pending',
    message: 'Would write unit and integration tests for all modified code.',
    files: ['components/feature-component.test.tsx'],
    branch: `${branchBase}/${seq++}-tests`,
    cost: '$0.05',
  });

  // Security agent always runs
  steps.push({
    agent: 'Security Agent',
    agentId: 'agent:security',
    icon: 'alert-triangle',
    status: 'pending',
    message: 'Would scan all changes for OWASP vulnerabilities and auth issues.',
    cost: '$0.10',
  });

  // Production agent at the end
  steps.push({
    agent: 'Production Agent',
    agentId: 'agent:production',
    icon: 'rocket',
    status: 'pending',
    message: 'Would deploy preview branch and post deployment link.',
    cost: '$0.01',
  });

  const totalCost = steps
    .reduce((sum, s) => {
      const match = s.cost?.match(/\$([\d.]+)/);
      return sum + (match ? parseFloat(match[1]) : 0);
    }, 0)
    .toFixed(2);

  return {
    plan: `Build "${projectName}" from ${tickets.length} approved ticket${tickets.length !== 1 ? 's' : ''}: ${ticketTitles.join(', ')}${context ? `. Context: ${context.slice(0, 100)}` : ''}`,
    steps,
    totalCost: `$${totalCost}`,
    branchBase,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectName, context, tickets } = body;

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets provided for simulation' }, { status: 400 });
    }

    // SIMULATION MODE: No LLM calls, no GitHub calls, no cost
    const result = generateSimulation(projectName || 'Untitled Project', context || '', tickets);

    return NextResponse.json({
      success: true,
      result,
      mode: 'simulation',
      note: 'This is a simulation. No API credits were used. No code was generated.',
    });
  } catch (error) {
    console.error('SwarmNet simulate error:', error);
    return NextResponse.json({ error: 'Failed to run simulation' }, { status: 500 });
  }
}
