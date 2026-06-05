'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface Meeting {
  id: string;
  projectName: string;
  meetingId: string;
  specsDetected: number;
  status: 'completed' | 'processing' | 'failed' | 'not_admitted';
  date: string;
  platform: string;
}

interface MeetingCardsProps {
  onSelectMeeting: (meetingId: string) => void;
  onCreateTicket?: (meetingId: string) => void;
}

export function MeetingCards({ onSelectMeeting, onCreateTicket }: MeetingCardsProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchAndSchedule() {
      await fetchMeetings();
      setMeetings((current) => {
        const hasProcessing = current.some((m) => m.status === 'processing');
        if (hasProcessing && !interval) {
          interval = setInterval(fetchAndSchedule, 10000);
        } else if (!hasProcessing && interval) {
          clearInterval(interval);
          interval = null;
        }
        return current;
      });
    }

    void fetchAndSchedule();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  async function fetchMeetings() {
    try {
      const res = await fetch('/api/meetings');
      if (!res.ok) throw new Error('Failed to fetch meetings');
      const data = await res.json();
      setMeetings(data);
      setError(null);
    } catch (err) {
      setError('Could not load meetings');
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
        <span className="text-muted-foreground">Loading meetings...</span>
      </div>
    );

  if (error)
    return (
      <div className="bg-card rounded-2xl p-8 border border-border text-center animate-fade-in">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchMeetings} className="mt-4">
          Retry
        </Button>
      </div>
    );

  if (meetings.length === 0)
    return (
      <div className="bg-card rounded-2xl p-12 border border-border text-center animate-fade-in-up">
        <p className="text-2xl font-playfair font-bold text-foreground mb-2">No meetings yet</p>
        <p className="text-muted-foreground">
          Start recording a meeting with the Syntheon extension.
        </p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover-lift cursor-pointer group press-down"
          onClick={() => onSelectMeeting(meeting.id)}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-playfair font-bold text-foreground group-hover:text-primary transition-colors mb-1">
                {meeting.projectName}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">{meeting.meetingId}</p>
              {meeting.platform !== 'unknown' && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {meeting.platform.replace('-', ' ')}
                </p>
              )}
            </div>
            <Badge
              className={`ml-2 ${
                meeting.status === 'completed'
                  ? 'bg-primary/20 text-primary'
                  : meeting.status === 'failed'
                    ? 'bg-destructive/20 text-destructive'
                    : meeting.status === 'not_admitted'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-secondary text-secondary-foreground'
              }`}
              title={
                meeting.status === 'not_admitted'
                  ? 'Syntheon AI not admitted to meeting'
                  : undefined
              }
            >
              {meeting.status === 'completed' ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : meeting.status === 'not_admitted' ? (
                <AlertTriangle className="w-3 h-3 mr-1" />
              ) : (
                <Clock className="w-3 h-3 mr-1" />
              )}
              {meeting.status === 'completed'
                ? 'Done'
                : meeting.status === 'failed'
                  ? 'Failed'
                  : meeting.status === 'not_admitted'
                    ? '!'
                    : 'Processing'}
            </Badge>
          </div>

          <div className="bg-background rounded-lg p-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{meeting.specsDetected}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                Tickets Detected
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {new Date(meeting.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <div className="flex gap-2">
              {onCreateTicket && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTicket(meeting.id);
                  }}
                  variant="outline"
                  className="border-primary/20 text-primary hover:bg-primary/10 font-medium rounded-lg px-4 py-1.5 text-sm"
                >
                  New Ticket
                </Button>
              )}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMeeting(meeting.id);
                }}
                className="bg-primary hover:bg-primary text-primary-foreground font-medium rounded-lg px-4 py-1.5 text-sm"
              >
                View Tickets
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
