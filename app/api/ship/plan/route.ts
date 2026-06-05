// app/api/ship/plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generatePlan, planFollowUpChanges, generateFollowUpPlan } from '@/lib/shipai/ai';
import { getProjectById, getTicketsByProjectId } from '@/lib/db';
import { getRepoFileTree, getFileContents, getRepoInfo } from '@/lib/shipai/github';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tickets, specs, meetingTitle, notes = {}, projectId } = await req.json();

    const ticketItems = tickets ?? specs ?? [];

    if (!ticketItems || ticketItems.length === 0) {
      return NextResponse.json({ error: 'tickets array is required' }, { status: 400 });
    }

    const newTicketList = ticketItems.map((ticket: any) => {
      const note = notes[ticket.id] ? ` - Note: ${notes[ticket.id]}` : '';
      const status = ticket.status ? ` [${ticket.status.toUpperCase()}]` : '';
      const assignee = ticket.assignee ? ` @${ticket.assignee}` : '';
      const desc = ticket.description ? ` - ${ticket.description}` : '';
      return `${ticket.title}${status}${assignee}${desc}${note}`;
    });

    let plan;

    if (projectId) {
      // ── Follow-up ship (MCT) ──────────────────────────────────
      console.log('Follow-up ship for project:', projectId);

      const project = await getProjectById(projectId);
      if (!project) throw new Error(`Project ${projectId} not found`);

      const previousTickets = (await getTicketsByProjectId(projectId)).map((t) => t.title);
      console.log('Previous tickets:', previousTickets.length);

      const repoInfo = getRepoInfo();
      const fileTree = await getRepoFileTree(repoInfo);
      console.log('File tree:', fileTree.length, 'files');

      const plannerResult = await planFollowUpChanges(
        { name: project.name, context: project.context, files: fileTree, specs: previousTickets },
        newTicketList,
        notes
      );

      console.log('Planner:', plannerResult.reasoning);

      const relevantFiles = plannerResult.filesToModify.filter((f) => fileTree.includes(f));
      const existingFiles = await getFileContents(relevantFiles, repoInfo);

      plan = await generateFollowUpPlan(
        { name: project.name, context: project.context, specs: previousTickets },
        newTicketList,
        existingFiles,
        plannerResult.filesToCreate,
        notes
      );
    } else {
      // ── First ship ────────────────────────────────────────────
      console.log('First ship for:', meetingTitle);

      const featureRequest = `Build a complete application for: "${meetingTitle}"

The following tickets were approved from the meeting:

${newTicketList.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

Build the entire application implementing ALL of the above tickets in one cohesive codebase.`;

      plan = await generatePlan(featureRequest);
      console.log('Plan generated:', plan.branch_name);
    }

    return NextResponse.json({
      success: true,
      featureRequest: newTicketList.join('\n'),
      plan,
      isFollowUp: !!projectId,
    });
  } catch (error) {
    console.error('Ship plan error:', error);
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
  }
}
