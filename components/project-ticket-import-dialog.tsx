'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Sparkles } from 'lucide-react';

interface Meeting {
  id: string;
  projectName: string;
  meetingId: string;
  specsDetected: number;
  status: 'completed' | 'processing' | 'failed' | 'not_admitted';
  date: string;
  platform: string;
}

interface Ticket {
  id: string;
  meeting_id: string | null;
}

interface ProjectTicketImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  meetings: Meeting[];
  tickets?: Ticket[];
  projectTickets: Ticket[];
  onCreated?: () => Promise<void> | void;
}

export function ProjectTicketImportDialog({
  open,
  onOpenChange,
  projectId,
  meetings,
  tickets,
  projectTickets,
  onCreated,
}: ProjectTicketImportDialogProps) {
  const [importingMeetingId, setImportingMeetingId] = useState<string | null>(null);

  const meetingTicketCounts = useMemo(() => {
    return Object.fromEntries(meetings.map((m) => [m.id, m.specsDetected ?? 0]));
  }, [meetings]);

  const importedMeetingIds = useMemo(() => {
    return new Set(
      projectTickets
        .filter(
          (ticket) =>
            ticket.meeting_id && meetings.some((meeting) => meeting.id === ticket.meeting_id)
        )
        .map((ticket) => ticket.meeting_id as string)
    );
  }, [meetings, projectTickets]);

  async function handleImport(meetingId: string) {
    setImportingMeetingId(meetingId);
    try {
      const res = await fetch(`/api/projects/${projectId}/import-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceMeetingId: meetingId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to import tickets');
      }

      const importedCount = typeof data?.importedCount === 'number' ? data.importedCount : 0;
      const dependenciesMapped =
        typeof data?.dependenciesMapped === 'number' ? data.dependenciesMapped : 0;
      const warning =
        typeof data?.dependencyInferenceWarning === 'string' ? data.dependencyInferenceWarning : '';

      const summary = data?.skipped
        ? data?.message || 'Tickets from this meeting are already in the project.'
        : `Imported ${importedCount} ticket${importedCount === 1 ? '' : 's'} and auto-mapped ${dependenciesMapped} dependenc${dependenciesMapped === 1 ? 'y' : 'ies'}.`;

      window.alert(warning ? `${summary}\n\n${warning}` : summary);

      await onCreated?.();
      onOpenChange(false);
    } finally {
      setImportingMeetingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl border-border bg-background shadow-2xl">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Import tickets from meeting
          </div>
          <DialogTitle className="font-playfair text-2xl text-foreground">
            Import from any meeting
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Pick a meeting and copy all of its tickets into this project. Imported tickets stay
            linked to the source meeting and will show a short Imported label.
          </DialogDescription>
        </DialogHeader>

        {meetings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-8 text-center">
            <p className="font-medium text-foreground mb-2">No meetings available</p>
            <p className="text-sm text-muted-foreground">
              Record or sync a meeting first, then import its tickets.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {meetings.map((meeting) => {
              const count = meetingTicketCounts[meeting.id] ?? 0; // from specsDetected
              const isImporting = importingMeetingId === meeting.id;
              const isAlreadyImported = importedMeetingIds.has(meeting.id);

              return (
                <div
                  key={meeting.id}
                  className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-playfair text-lg font-bold text-foreground truncate">
                        {meeting.projectName}
                      </p>
                      <Badge className="bg-primary/10 text-primary border border-primary/10">
                        {count} tickets
                      </Badge>
                      {isAlreadyImported && (
                        <Badge className="bg-green-100 text-green-800 border border-green-200">
                          Imported
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {meeting.platform} • {new Date(meeting.date).toLocaleDateString()} •{' '}
                      {meeting.status}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleImport(meeting.id)}
                    disabled={isImporting || count === 0 || isAlreadyImported}
                    className="rounded-full gap-2 shrink-0 bg-black text-white hover:bg-gray-900"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isImporting ? 'Importing...' : isAlreadyImported ? 'Imported' : 'Import'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
