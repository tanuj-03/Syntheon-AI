import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSwarmnetRun } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const run = await getSwarmnetRun(id);

    if (!run) {
      return NextResponse.json({ status: 'unknown', runId: id });
    }

    // Derive currentTask from explicit field or last step
    const lastStep = run.steps?.length ? run.steps[run.steps.length - 1] : null;
    const currentTask =
      run.current_task || (lastStep ? `${lastStep.phase}: ${lastStep.message}` : 'Initializing...');

    return NextResponse.json({
      runId: id,
      status: run.status,
      currentTask,
      prNumber: run.pr_number,
      prUrl: run.pr_url,
      error: run.error_message,
      steps: run.steps,
      filesCreated: run.files_created,
      branchName: run.branch_name,
    });
  } catch (error) {
    console.error('Run status error:', error);
    return NextResponse.json({ status: 'error', error: 'Failed to fetch run status' });
  }
}
