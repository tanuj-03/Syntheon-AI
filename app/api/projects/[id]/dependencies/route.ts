import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectById, getDependenciesForProject, getTicketsByProjectId } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    const project = await getProjectById(projectId);
    const owned = orgId ? project?.org_id === orgId : project?.user_id === userId;
    if (!project || !owned) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const [allTickets, dependencies] = await Promise.all([
      getTicketsByProjectId(projectId),
      getDependenciesForProject(projectId),
    ]);

    const tickets = allTickets.filter(
      (t: { dependency_ticket_id?: string | null }) => !t.dependency_ticket_id
    );

    return NextResponse.json({ tickets, dependencies });
  } catch (err) {
    console.error('GET /projects/[id]/dependencies error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
