'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Video, Sparkles } from 'lucide-react';

interface ProjectMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: () => void | Promise<void>;
}

export function ProjectMeetingDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: ProjectMeetingDialogProps) {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMeetingUrl('');
    setSubmitting(false);
    setHasJoined(false);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingUrl.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/bot/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingUrl: meetingUrl.trim(), projectId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to create meeting');
      }

      await onCreated?.();
      setHasJoined(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl border-border bg-background shadow-2xl">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Project meetings
          </div>
          <DialogTitle className="font-playfair text-2xl text-foreground">
            Start a meeting under this project
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a meeting URL and Syntheon will attach the recorded session to this project.
          </DialogDescription>
        </DialogHeader>

        {!hasJoined ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Meeting URL</label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="bg-white"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !meetingUrl.trim()}
                className="rounded-full gap-2"
              >
                <Video className="h-4 w-4" />
                {submitting ? 'Starting...' : 'Start meeting'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 rounded-2xl border border-primary/10 bg-primary/5 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <p className="font-playfair text-2xl text-foreground">
                Syntheon - AI will shortly join the meeting
              </p>
              <p className="text-sm text-muted-foreground">
                You can close this popup now or wait for the meeting to connect.
              </p>
            </div>
            <DialogFooter className="pt-2 justify-center">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full gap-2"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
