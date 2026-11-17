import type { ReviewSession } from "@/lib/interfaces/cards";
import { useCallback, useState } from "react";

export function useReviewSession(
  currentScanId: string | null | undefined,
  active: boolean,
): ReviewSession {
  const [visited, setVisited] = useState<string[]>([]);
  if (!active && visited.length > 0) setVisited([]);
  if (active && currentScanId && !visited.includes(currentScanId)) {
    setVisited([...visited, currentScanId]);
  }

  const cursor = currentScanId ? visited.indexOf(currentScanId) : -1;
  const atFrontier = cursor === -1 || cursor === visited.length - 1;

  const resolveNext = useCallback(
    (upcomingScanId: string | null | undefined) =>
      atFrontier ? (upcomingScanId ?? null) : visited[cursor + 1],
    [atFrontier, visited, cursor],
  );

  const forget = useCallback(
    (scanId: string) => setVisited((ids) => ids.filter((id) => id !== scanId)),
    [],
  );

  return {
    index: cursor === -1 ? visited.length : cursor,
    size: Math.max(visited.length, cursor === -1 ? visited.length + 1 : 0),
    previousScanId: cursor > 0 ? visited[cursor - 1] : null,
    resolveNext,
    forget,
  };
}
