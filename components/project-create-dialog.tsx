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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FolderPlus, Sparkles } from 'lucide-react';

interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    name: string;
    context: string;
    deployUrl: string;
    branchBase: string;
  }) => Promise<void> | void;
}

export function ProjectCreateDialog({ open, onOpenChange, onCreate }: ProjectCreateDialogProps) {
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [deployUrl, setDeployUrl] = useState('');
  const [branchBase, setBranchBase] = useState('main');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setContext('');
    setDeployUrl('');
    setBranchBase('main');
    setSubmitting(false);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        context: context.trim(),
        deployUrl: deployUrl.trim(),
        branchBase: branchBase.trim() || 'main',
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-border bg-background shadow-2xl">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Syntheon Projects
          </div>
          <DialogTitle className="font-playfair text-2xl text-foreground">
            Create a new project
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Start a workspace for a product, client, or feature stream. You can add meetings and
            tickets under it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Atlas Revamp"
              className="bg-white"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Context</label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="A short description of the project goals, scope, and constraints."
              className="min-h-28 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Deploy URL</label>
              <Input
                value={deployUrl}
                onChange={(e) => setDeployUrl(e.target.value)}
                placeholder="https://app.example.com"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Base branch</label>
              <Input
                value={branchBase}
                onChange={(e) => setBranchBase(e.target.value)}
                placeholder="main"
                className="bg-white"
              />
            </div>
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
              disabled={submitting || !name.trim()}
              className="rounded-full gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              {submitting ? 'Creating...' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
