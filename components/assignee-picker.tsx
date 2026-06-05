'use client';

import { useOrganization, useUser } from '@clerk/nextjs';
import { UserCircle2, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface AssigneeValue {
  displayName: string;
  userId: string;
}

interface AssigneePickerProps {
  value: AssigneeValue | null;
  onChange: (value: AssigneeValue | null) => void;
  disabled?: boolean;
}

export function AssigneePicker({ value, onChange, disabled }: AssigneePickerProps) {
  const { user } = useUser();
  const { memberships } = useOrganization({ memberships: { infinite: true, pageSize: 50 } });

  const members = (memberships?.data ?? []).map((m) => {
    const firstName = m.publicUserData?.firstName ?? '';
    const lastName = m.publicUserData?.lastName ?? '';
    const email = m.publicUserData?.identifier ?? '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || email;
    return {
      userId: m.publicUserData?.userId ?? '',
      displayName,
      imageUrl: m.publicUserData?.imageUrl,
    };
  });

  const myDisplayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.emailAddresses?.[0]?.emailAddress ||
    'Me';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 font-normal text-sm"
        >
          <UserCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{value ? value.displayName : 'Unassigned'}</span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange(null);
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Assign to</DropdownMenuLabel>

        {user && (
          <>
            <DropdownMenuItem
              onClick={() => onChange({ userId: user.id, displayName: myDisplayName })}
              className="gap-2 cursor-pointer"
            >
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={myDisplayName}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="truncate">{myDisplayName}</span>
              <span className="ml-auto text-xs text-muted-foreground">Me</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {members
          .filter((m) => m.userId !== user?.id)
          .map((m) => (
            <DropdownMenuItem
              key={m.userId}
              onClick={() => onChange({ userId: m.userId, displayName: m.displayName })}
              className="gap-2 cursor-pointer"
            >
              {m.imageUrl ? (
                <img
                  src={m.imageUrl}
                  alt={m.displayName}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="truncate">{m.displayName}</span>
            </DropdownMenuItem>
          ))}

        {members.length === 0 && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            No other members
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="gap-2 cursor-pointer text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Unassign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
