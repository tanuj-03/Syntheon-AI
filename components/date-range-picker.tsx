'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangePickerProps {
  startDate?: string;
  dueDate?: string;
  deadlineTime?: string;
  onStartDateChange: (date: string | undefined) => void;
  onDueDateChange: (date: string | undefined) => void;
  onDeadlineTimeChange: (time: string | undefined) => void;
  disabled?: boolean;
}

export function DateRangePicker({
  startDate,
  dueDate,
  deadlineTime,
  onStartDateChange,
  onDueDateChange,
  onDeadlineTimeChange,
  disabled = false,
}: DateRangePickerProps) {
  const [activeTab, setActiveTab] = React.useState<'start' | 'due'>('start');
  const [isOpen, setIsOpen] = React.useState(false);

  const startDateObj = startDate ? parseISO(startDate) : undefined;
  const dueDateObj = dueDate ? parseISO(dueDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const formatted = format(date, 'yyyy-MM-dd');
    if (activeTab === 'start') {
      onStartDateChange(formatted);
    } else {
      onDueDateChange(formatted);
    }
  };

  const handleClear = () => {
    if (activeTab === 'start') {
      onStartDateChange(undefined);
    } else {
      onDueDateChange(undefined);
      onDeadlineTimeChange(undefined);
    }
  };

  const selectedDate = activeTab === 'start' ? startDateObj : dueDateObj;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setActiveTab('start');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !startDate && !dueDate && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1">
            {startDate && dueDate ? (
              <>
                {format(parseISO(startDate), 'MMM d')} - {format(parseISO(dueDate), 'MMM d')}
                {deadlineTime && (
                  <span className="ml-1 text-muted-foreground">at {deadlineTime}</span>
                )}
              </>
            ) : startDate ? (
              format(parseISO(startDate), 'MMM d')
            ) : dueDate ? (
              <>
                Due {format(parseISO(dueDate), 'MMM d')}
                {deadlineTime && (
                  <span className="ml-1 text-muted-foreground">at {deadlineTime}</span>
                )}
              </>
            ) : (
              'Set dates'
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="bg-popover rounded-md border shadow-md">
          {/* Tab Header */}
          <div className="flex border-b">
            <button
              type="button"
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'start'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('start')}
            >
              <span className="flex items-center gap-2">
                {startDate && <span className="w-2 h-2 rounded-full bg-primary" />}
                Start date
              </span>
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'due'
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('due')}
            >
              <span className="flex items-center gap-2">
                {dueDate && <span className="w-2 h-2 rounded-full bg-primary" />}
                Due date
              </span>
            </button>
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="border-0"
            />
          </div>

          {/* Time Picker (only for due date) */}
          {activeTab === 'due' && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Time</span>
                </label>
                {/* AM/PM Toggle */}
                <div className="flex bg-muted rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (deadlineTime) {
                        const [h, m] = deadlineTime.split(':').map(Number);
                        const newH = h >= 12 ? h - 12 : h;
                        onDeadlineTimeChange(
                          `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                        );
                      }
                    }}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-all',
                      !deadlineTime || parseInt(deadlineTime.split(':')[0]) < 12
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deadlineTime) {
                        const [h, m] = deadlineTime.split(':').map(Number);
                        const newH = h < 12 ? h + 12 : h;
                        onDeadlineTimeChange(
                          `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                        );
                      } else {
                        onDeadlineTimeChange('19:00');
                      }
                    }}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-md transition-all',
                      deadlineTime && parseInt(deadlineTime.split(':')[0]) >= 12
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Time Grid: 7:00 - 11:30 in 30-min intervals */}
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  '07:00',
                  '07:30',
                  '08:00',
                  '08:30',
                  '09:00',
                  '09:30',
                  '10:00',
                  '10:30',
                  '11:00',
                  '11:30',
                ].map((baseTime) => {
                  const [baseH, baseM] = baseTime.split(':').map(Number);
                  const isAm = !deadlineTime || parseInt(deadlineTime.split(':')[0]) < 12;
                  const actualH = isAm ? baseH : baseH + 12;
                  const timeValue = `${String(actualH).padStart(2, '0')}:${String(baseM).padStart(2, '0')}`;
                  const isSelected = deadlineTime === timeValue;

                  return (
                    <button
                      key={baseTime}
                      type="button"
                      onClick={() => onDeadlineTimeChange(timeValue)}
                      className={cn(
                        'py-2 px-1 text-xs font-medium rounded-md transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      )}
                    >
                      {baseH}:{String(baseM).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
