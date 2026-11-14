import type { EventEmitter } from "node:events";

export type SorterPortOwner = "bridge" | "session" | "levers";

export interface SorterPort extends EventEmitter {
  readonly isOpen: boolean;
  write(data: string | Buffer, callback?: (error?: Error | null) => void): unknown;
  close(): unknown;
}

export interface SorterReplyWaiter {
  resolve: (line: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
