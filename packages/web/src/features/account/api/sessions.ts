import { neon } from "@/lib/auth/client";
import type { SessionRow } from "@/lib/interfaces/account";
import { queryOptions } from "@tanstack/react-query";

export const sessionsQueryKey = ["me", "sessions"] as const;

async function listSessionsNewestFirst(): Promise<SessionRow[]> {
  const { data, error } = await neon.auth.listSessions();
  if (error) throw new Error(error.message);
  return [...(data ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export const sessionsQueryOptions = () =>
  queryOptions({
    queryKey: sessionsQueryKey,
    queryFn: listSessionsNewestFirst,
    staleTime: 0,
  });
