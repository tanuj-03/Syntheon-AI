'use client';

import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Settings,
  FolderKanban,
  Plus,
  Users,
  CalendarDays,
  Ticket,
  Home,
  Video,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClerk, useUser, useOrganization } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  currentView?: string;
  onViewChange?: (view: any) => void;
  projects: Array<{ id: string; name: string }>;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  onCreateProject: () => void;
}

const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', view: null },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: Video,
    href: '/dashboard?view=meetings',
    view: 'meetings',
  },
  {
    id: 'members',
    label: 'Members',
    icon: Users,
    href: '/dashboard?view=members',
    view: 'members',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarDays,
    href: '/dashboard?view=calendar',
    view: 'calendar',
  },
  {
    id: 'tickets',
    label: 'Tickets',
    icon: Ticket,
    href: '/dashboard?view=tickets',
    view: 'tickets',
  },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', view: null },
];

const MEMBER_NAV = [
  { id: 'dashboard', label: 'My Dashboard', icon: Home, href: '/dashboard', view: null },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: Video,
    href: '/dashboard?view=meetings',
    view: 'meetings',
  },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', view: null },
];

export function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { membership, organization } = useOrganization();

  const isAdmin = membership?.role === 'org:admin';
  const navItems = isAdmin ? ADMIN_NAV : MEMBER_NAV;

  const userInitial =
    user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? 'S';
  const userName = user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User';

  return (
    <aside className="w-[220px] min-w-[220px] h-screen flex flex-col bg-sidebar border-r border-sidebar-border animate-fade-in">
      {/* Logo + Org */}
      <div className="h-14 flex items-center px-4 shrink-0 gap-2">
        <Link
          href="/"
          className="flex items-center gap-2.5 flex-1 min-w-0 group rounded-md -ml-1 pl-1 py-1 hover:bg-accent/40"
        >
          <img
            src="/logo.png"
            alt="Syntheon"
            className="w-6 h-6 object-contain shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <span className="font-[family-name:var(--font-dm-serif)] text-[1.05rem] text-primary tracking-tight block truncate">
              Syntheon
            </span>
            {organization?.name && (
              <span className="text-[10px] text-muted-foreground truncate block leading-none">
                {organization.name}
              </span>
            )}
          </div>
        </Link>
        {isAdmin && (
          <span title="Admin">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary/60" />
          </span>
        )}
      </div>

      <Separator />

      {/* Role badge */}
      <div className="px-4 pt-2.5 pb-1 shrink-0">
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-medium',
            isAdmin
              ? 'border-primary/30 text-primary bg-primary/5'
              : 'border-border text-muted-foreground'
          )}
        >
          {isAdmin ? 'Admin' : 'Member'}
        </Badge>
      </div>

      {/* Main nav */}
      <nav className="px-2 pt-1.5 space-y-0.5 shrink-0 stagger-children">
        {navItems.map((item) => {
          const Icon = item.icon;
          const currentView = searchParams.get('view');
          const active =
            item.view === null && item.href !== '/settings'
              ? pathname === '/dashboard' && !currentView
              : item.href === '/settings'
                ? pathname === '/settings'
                : currentView === item.view;
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                'group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm press-down',
                active
                  ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {/* Active indicator bar */}
              <span
                className={cn(
                  'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary transition-all duration-300',
                  active ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-50'
                )}
                aria-hidden
              />
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-200',
                  !active && 'group-hover:scale-110'
                )}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Separator className="mt-3" />

      {/* Projects */}
      <div className="px-2 pt-3 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-2 mb-2 shrink-0">
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
            Projects
          </span>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={onCreateProject}
              title="New project"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 -mx-1 px-1">
          {projects.length === 0 ? (
            <div className="mx-1 border border-dashed border-border rounded-lg p-3 text-center animate-fade-in">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isAdmin
                  ? 'No projects yet. Create one to get started.'
                  : 'No projects assigned yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 pb-2 stagger-children">
              {projects.slice(0, 8).map((project) => {
                const active = pathname === '/project' && project.id === selectedProjectId;
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      router.push(`/project?projectId=${project.id}&tab=kanban`);
                      onSelectProject?.(project.id);
                    }}
                    className={cn(
                      'group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left press-down',
                      active
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <FolderKanban
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-primary/70 transition-transform duration-200',
                        active ? 'scale-110' : 'group-hover:scale-110'
                      )}
                    />
                    <span className="truncate text-[13px]">{project.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer / User */}
      <Separator />
      <div className="p-3 shrink-0">
        <div className="group flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent cursor-pointer">
          <Avatar className="h-7 w-7 shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-200">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {organization?.name ?? 'No org'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start gap-2 px-2 text-muted-foreground hover:text-foreground press-down"
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
