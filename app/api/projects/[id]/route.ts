import { NextRequest, NextResponse } from 'next/server';
import { deleteProject, getProjectById, updateProject } from '@/lib/db';
import { requireAuth, isOrgAdmin, canAdminProject } from '@/lib/rbac';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project || project.org_id !== ctx.orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!(await canAdminProject(ctx, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: {
      name?: string;
      context?: string;
      deployUrl?: string;
      branchBase?: string;
    } = {};

    if (typeof body?.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
      }
      updates.name = name;
    }

    if (typeof body?.context === 'string') {
      updates.context = body.context.trim();
    }

    if (typeof body?.deployUrl === 'string') {
      updates.deployUrl = body.deployUrl.trim();
    }

    if (typeof body?.branchBase === 'string') {
      updates.branchBase = body.branchBase.trim();
    }

    await updateProject(id, updates);
    const updated = await getProjectById(id);
    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrgAdmin(ctx)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project || project.org_id !== ctx.orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
