'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Play,
  CheckCircle,
  AlertCircle,
  Hourglass,
  ArrowRight,
} from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'in_progress' | 'done' | 'blocked';
  start_date?: string | null;
  due_date?: string | null;
  deadline_time?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TicketTimelinePanelProps {
  ticket: Ticket;
  subtasks?: Ticket[];
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '';
  return timeString;
}

function getDaysRemaining(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getTimelineStatus(ticket: Ticket): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  const daysRemaining = getDaysRemaining(ticket.due_date);

  if (ticket.status === 'done') {
    return {
      label: 'Completed',
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: <CheckCircle className="h-4 w-4" />,
    };
  }

  if (ticket.status === 'blocked') {
    return {
      label: 'Blocked',
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: <AlertCircle className="h-4 w-4" />,
    };
  }

  if (daysRemaining === null) {
    return {
      label: 'No deadline',
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: <Clock className="h-4 w-4" />,
    };
  }

  if (daysRemaining < 0) {
    return {
      label: `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`,
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: <AlertCircle className="h-4 w-4" />,
    };
  }

  if (daysRemaining === 0) {
    return {
      label: 'Due today',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      icon: <Hourglass className="h-4 w-4" />,
    };
  }

  if (daysRemaining <= 3) {
    return {
      label: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      icon: <Clock className="h-4 w-4" />,
    };
  }

  return {
    label: `${daysRemaining} days remaining`,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: <Calendar className="h-4 w-4" />,
  };
}

export function TicketTimelinePanel({ ticket, subtasks = [] }: TicketTimelinePanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const timelineStatus = getTimelineStatus(ticket);
  const daysRemaining = getDaysRemaining(ticket.due_date);

  // Calculate progress based on subtasks
  const completedSubtasks = subtasks.filter((st) => st.status === 'done').length;
  const totalSubtasks = subtasks.length;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Ticket Timeline */}
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline Overview
        </h3>

        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium mb-4 ${timelineStatus.color}`}
        >
          {timelineStatus.icon}
          {timelineStatus.label}
        </div>

        {/* Timeline Visualization */}
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Start Date */}
          <div className="relative flex gap-3 pb-6">
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${ticket.start_date ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}
            >
              <Play className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Start Date</p>
              <p className="text-sm text-muted-foreground">{formatDate(ticket.start_date)}</p>
            </div>
          </div>

          {/* Due Date */}
          <div className="relative flex gap-3">
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${ticket.due_date ? (daysRemaining !== null && daysRemaining < 0 ? 'bg-red-100 text-red-600' : daysRemaining === 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600') : 'bg-muted text-muted-foreground'}`}
            >
              <CheckCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Due Date</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(ticket.due_date)}
                {ticket.deadline_time && (
                  <span className="ml-2 text-xs">at {formatTime(ticket.deadline_time)}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {totalSubtasks > 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Progress ({completedSubtasks}/{totalSubtasks} subtasks)
          </h3>
          <div className="w-full bg-muted rounded-full h-2.5 mb-2">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      )}

      {/* Subtasks Timeline */}
      {subtasks.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Subtasks Timeline
          </h3>
          <div className="space-y-3">
            {subtasks.map((subtask) => {
              const subtaskStatus = getTimelineStatus(subtask);
              return (
                <div
                  key={subtask.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-background/50"
                >
                  <div className={`px-2 py-1 rounded text-xs font-medium ${subtaskStatus.color}`}>
                    {subtaskStatus.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{subtask.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {subtask.due_date ? `Due: ${formatDate(subtask.due_date)}` : 'No due date'}
                    </p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${subtask.status === 'done' ? 'bg-green-500' : subtask.status === 'blocked' ? 'bg-red-500' : subtask.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <p className="text-xs text-muted-foreground mb-1">Created</p>
          <p className="text-sm font-medium text-foreground">{formatDate(ticket.createdAt)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
          <p className="text-sm font-medium text-foreground">{formatDate(ticket.updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
