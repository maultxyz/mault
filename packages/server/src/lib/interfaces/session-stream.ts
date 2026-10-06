import type { SseWriter } from "./sse";

export interface ViewerInfo {
  userId: string;
  displayName: string;
}

export interface ViewerEntry extends ViewerInfo {
  writer: SseWriter;
}

export interface SessionEntry {
  orgId: string;
  viewers: Set<ViewerEntry>;
}
