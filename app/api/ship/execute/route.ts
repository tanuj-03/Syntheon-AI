// app/api/ship/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createGithubIssue,
  createBranch,
  commitFile,
  createPullRequest,
  getRepoInfo,
} from '@/lib/shipai/github';
import { db } from '@/db/index';
import { meetings as meetingsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  getIntegrationByUserId,
  getGithubToken,
  getGithubOwner,
} from '@/lib/services/integrations';
import {
  updateMeetingBranch,
  saveProject,
  updateProject,
  addMeetingToProject,
  addTicketsToProject,
  addFilesToProject,
  getProjectById,
  getProjectByMeetingId,
} from '@/lib/db';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan, meetingId, projectId, tickets, meetingTitle, isFollowUp } = await req.json();

    if (!plan) return NextResponse.json({ error: 'plan is required' }, { status: 400 });

    // Get user's GitHub integration
    const integration = await getIntegrationByUserId(userId);
    const githubToken = getGithubToken(integration);
    const githubOwner = getGithubOwner(integration);

    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    console.log('Executing plan:', plan.branch_name);

    // Step 1: Create GitHub issue
    const issue = await createGithubIssue(plan.issue_title, plan.issue_body, githubToken);
    console.log('Issue created:', issue.number);

    // Step 2: Create branch
    await createBranch(plan.branch_name, githubToken);
    console.log('Branch created:', plan.branch_name);

    // Step 3: Commit all files
    const committedFiles = [];
    for (const file of plan.files) {
      await commitFile(file.path, file.content, plan.branch_name, githubToken);
      committedFiles.push(file.path);
      console.log('Committed:', file.path);
    }

    // Step 4: Open PR
    const pullRequest = await createPullRequest(plan.pr_title, plan.branch_name, githubToken);
    console.log('PR opened:', pullRequest.number);

    // Step 5: Save branch name to meeting
    if (meetingId) {
      await updateMeetingBranch(meetingId, plan.branch_name);
      console.log('Branch saved to meeting:', meetingId);
    }

    // Step 7: Create or update project
    const repoInfo = getRepoInfo(githubOwner);
    const ticketItems = tickets ?? [];
    const ticketTitles = ticketItems?.map((t: any) => t.title) ?? [];
    const ticketIds = ticketItems?.map((t: any) => t.id) ?? [];
    const nonWorkflowFiles = committedFiles.filter((f) => !f.includes('.github'));
    const baseUrl = `https://${repoInfo.owner}.github.io/${repoInfo.repo}/`;

    if (isFollowUp && projectId) {
      // Update existing project
      console.log('Updating existing project:', projectId);
      if (meetingId) await addMeetingToProject(projectId, meetingId);
      await addTicketsToProject(projectId, ticketIds);
      await addFilesToProject(projectId, nonWorkflowFiles);

      const project = await getProjectById(projectId);
      if (project) {
        await updateProject(projectId, {
          context: `${project.context}. Follow-up: ${ticketTitles.join(', ')}`,
        });
      }
    } else if (meetingId) {
      // Check if project already exists for this meeting
      const existingProject = await getProjectByMeetingId(meetingId);

      if (!existingProject) {
        const newProjectId = `project-${Date.now()}`;
        const repo = `${repoInfo.owner}/${repoInfo.repo}`;
        const projectDeployUrl = baseUrl;

        await saveProject({
          id: newProjectId,
          user_id: userId,
          name: meetingTitle || plan.issue_title,
          repo,
          deployUrl: projectDeployUrl,
          branchBase: 'main',
          meetings: meetingId ? [meetingId] : [],
          ticketIds,
          files: nonWorkflowFiles,
          context: ticketTitles.join(', '),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Link meeting to project
        if (meetingId) {
          await db
            .update(meetingsTable)
            .set({ projectId: newProjectId })
            .where(eq(meetingsTable.id, meetingId));
        }

        console.log('New project created');
      }
    }

    return NextResponse.json({
      success: true,
      issue,
      pullRequest,
      committedFiles,
    });
  } catch (error) {
    console.error('Ship execute error:', error);
    return NextResponse.json({ error: 'Failed to execute plan' }, { status: 500 });
  }
}
