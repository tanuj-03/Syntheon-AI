// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  getProjectsByOrg,
  getProjectByMeetingId,
  saveProjectForOrg,
  addProjectMember,
} from '@/lib/db';
import { requireAuth, isOrgAdmin } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    if (meetingId) {
      const project = await getProjectByMeetingId(meetingId);
      return NextResponse.json(project ?? null);
    }

    const projects = await getProjectsByOrg(orgId);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrgAdmin(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { userId, orgId } = ctx;

    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    const context = String(body?.context ?? '').trim();
    const deployUrl = String(body?.deployUrl ?? '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const projectId = `project-${randomUUID()}`;
    const repoLabel = `syntheon/${
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'project'
    }`;

    await saveProjectForOrg({
      id: projectId,
      user_id: userId,
      org_id: orgId,
      name,
      repo: repoLabel,
      deployUrl: deployUrl || undefined,
      branchBase: body?.branchBase || 'main',
      meetings: [],
      ticketIds: [],
      files: [],
      context,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Creator is auto-added as project admin
    await addProjectMember(projectId, orgId, userId, 'admin');

    return NextResponse.json({
      success: true,
      project: {
        id: projectId,
        name,
        repo: repoLabel,
        deployUrl: deployUrl || null,
        branchBase: body?.branchBase || 'main',
        meetings: [],
        ticketIds: [],
        files: [],
        context,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
