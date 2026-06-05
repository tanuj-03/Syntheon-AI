'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface Blocker {
  id: string;
  depends_on: string;
  type: string;
  title?: string;
}

interface DependencyBlockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToTicket: (ticketId: string) => void;
  onRevert: () => void;
  message: string;
  blockers: Blocker[];
  isHardBlock: boolean;
  onProceed?: () => void;
}

export function DependencyBlockerModal({
  isOpen,
  onClose,
  onGoToTicket,
  onRevert,
  message,
  blockers,
  isHardBlock,
  onProceed,
}: DependencyBlockerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            {isHardBlock ? 'Blocked by Dependencies' : 'Dependencies Not Resolved'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{message}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Blocking tickets
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {blockers.map((blocker) => (
              <div
                key={blocker.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
              >
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {blocker.title || blocker.depends_on}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {blocker.type} dependency
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => onGoToTicket(blocker.depends_on)}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onRevert} className="w-full sm:w-auto">
            Revert Changes
          </Button>
          {isHardBlock && blockers.length === 1 && (
            <Button
              onClick={() => onGoToTicket(blockers[0].depends_on)}
              className="w-full sm:w-auto"
            >
              Go to Blocking Ticket
            </Button>
          )}
          {isHardBlock && blockers.length > 1 && (
            <Button onClick={onClose} className="w-full sm:w-auto">
              View All Blockers
            </Button>
          )}
          {!isHardBlock && onProceed && (
            <Button variant="destructive" onClick={onProceed} className="w-full sm:w-auto">
              Proceed Anyway
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
