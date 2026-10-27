export type SorterPortOwner = "bridge" | "session" | "levers";

export interface SorterReplyWaiter {
  resolve: (line: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
