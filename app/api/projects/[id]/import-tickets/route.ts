import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import {
  addTicketsToProject,
  createDependency,
  getMeetingById,
  getProjectById,
  getTicketsByProjectId,
  getTicketsByMeetingId,
  saveTickets,
} from '@/lib/db';
import { inferProjectTicketDependencies } from '@/lib/groq';

function ticketFingerprint(ticket: {
  title: string;
  description?: string | null;
  status: string;
  assignee?: string | null;
}) {
  return [
    ticket.title.trim().toLowerCase(),
    (ticket.description ?? '').trim().toLowerCase(),
    ticket.status,
    (ticket.assignee ?? '').trim().toLowerCase(),
  ].join('::');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const project = await getProjectById(id);
    const owned = orgId ? project?.org_id === orgId : project?.user_id === userId;
    if (!project || !owned) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await req.json();
    const sourceMeetingId = String(body?.sourceMeetingId ?? '').trim();
    if (!sourceMeetingId) {
      return NextResponse.json({ error: 'Source meeting is required' }, { status: 400 });
    }

    const meeting = await getMeetingById(sourceMeetingId);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const projectTickets = await getTicketsByProjectId(project.id);

    const sourceTickets = await getTicketsByMeetingId(sourceMeetingId, { originalOnly: true });
    if (sourceTickets.length === 0) {
      return NextResponse.json({ error: 'No tickets found for this meeting' }, { status: 400 });
    }

    const existingMeetingTickets = projectTickets.filter(
      (ticket) => ticket.meeting_id === sourceMeetingId
    );
    const existingFingerprints = new Set(existingMeetingTickets.map(ticketFingerprint));

    const sourceTicketsToImport = sourceTickets.filter(
      (ticket) => !existingFingerprints.has(ticketFingerprint(ticket))
    );

    if (sourceTicketsToImport.length === 0) {
      return NextResponse.json({
        success: true,
        importedCount: 0,
        skipped: true,
        message: 'Tickets from this meeting are already in the project',
      });
    }

    const now = new Date().toISOString();
    const importedTickets = sourceTicketsToImport.map((ticket) => ({
      ...ticket,
      id: randomUUID(),
      user_id: userId,
      org_id: project.org_id ?? orgId ?? undefined,
      projectId: project.id,
      createdAt: now,
      updatedAt: now,
    }));

    await saveTickets(importedTickets);
    await addTicketsToProject(
      project.id,
      importedTickets.map((ticket) => ticket.id)
    );

    let dependenciesMapped = 0;
    let dependencyInferenceWarning: string | null = null;

    try {
      const fullProjectTickets = await getTicketsByProjectId(project.id);
      const inferredDependencies = await inferProjectTicketDependencies(
        fullProjectTickets.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          description: ticket.description || '',
          status: ticket.status,
        }))
      );

      for (const dep of inferredDependencies) {
        const result = await createDependency({
          id: randomUUID(),
          project_id: project.id,
          ticket_id: dep.ticket_id,
          depends_on_ticket_id: dep.depends_on_ticket_id,
          dependency_type: dep.dependency_type,
          strength: dep.strength,
          note: dep.note ?? null,
        });
        if (!result.error) dependenciesMapped += 1;
      }
    } catch (dependencyErr) {
      console.error('Dependency auto-mapping failed:', dependencyErr);
      dependencyInferenceWarning =
        'Tickets imported, but dependency auto-mapping could not be completed.';
    }

    return NextResponse.json({
      success: true,
      importedCount: importedTickets.length,
      dependenciesMapped,
      dependencyInferenceWarning,
      meeting: {
        id: meeting.id,
        projectName: meeting.projectName,
      },
    });
  } catch (error) {
    console.error('Failed to import tickets:', error);
    return NextResponse.json({ error: 'Failed to import tickets' }, { status: 500 });
  }
}
