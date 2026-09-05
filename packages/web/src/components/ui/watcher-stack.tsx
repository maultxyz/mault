import { InitialsAvatar, getInitials } from "@/components/ui/initials-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MAX_STACK = 2;

export interface Watcher {
  userId: string;
  displayName: string;
}

export function WatcherStack({ watchers }: { watchers: Watcher[] }) {
  if (watchers.length === 0) return null;

  const visible = watchers.slice(0, MAX_STACK);
  const overflow = watchers.length - MAX_STACK;

  return (
    <Popover>
      <PopoverTrigger className="flex items-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
        {visible.map((w, i) => (
          <span
            key={w.userId}
            style={{ marginLeft: i === 0 ? 0 : -6, zIndex: MAX_STACK - i }}
            className="relative inline-flex items-center justify-center size-5 rounded-full bg-green-500/15 text-green-800 dark:text-green-400 ring-2 ring-background text-[9px] font-semibold"
          >
            {getInitials(w.displayName)}
          </span>
        ))}
        {overflow > 0 && (
          <span
            style={{ marginLeft: -6, zIndex: 0 }}
            className="relative inline-flex items-center justify-center size-5 rounded-full bg-muted text-muted-foreground ring-2 ring-background text-[9px] font-semibold"
          >
            +{overflow}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-48 p-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1.5 pb-1.5">
          Watching
        </p>
        {watchers.map((w) => (
          <div key={w.userId} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-accent">
            <InitialsAvatar name={w.displayName} variant="watcher" size="sm" />
            <span className="text-xs">{w.displayName}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
