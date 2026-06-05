import { NextRequest, NextResponse } from 'next/server';
import { getProjectById, addProjectMember, removeProjectMember, getProjectMembers } from '@/lib/db';
import { requireAuth, isOrgAdmin, canAdminProject } from '@/lib/rbac';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project || project.org_id !== ctx.orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const members = await getProjectMembers(id);
    return NextResponse.json(members);
  } catch (err) {
    console.error('GET /members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await req.json();
    const userId = String(body?.userId ?? '').trim();
    const role: 'admin' | 'member' = body?.role === 'admin' ? 'admin' : 'member';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await addProjectMember(id, ctx.orgId, userId, role);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const project = await getProjectById(id);
    if (!project || project.org_id !== ctx.orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const canAdmin = await canAdminProject(ctx, id);
    if (!canAdmin && !isOrgAdmin(ctx)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const userId = String(body?.userId ?? '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await removeProjectMember(id, userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
