import { createLockEventsSource } from "@/lib/api/session";
import { useAuthSession } from "@/lib/auth";
import { createContext, useContext, useEffect, useRef, useState } from "react";

export interface ScanLockInfo {
  userId: string;
  displayName: string;
  expiresAt: number;
}

interface CollectionLocksContextValue {
  locks: Record<string, ScanLockInfo>;
  currentUserId: string | undefined;
  isLockedByOther: (guid: string) => boolean;
}

const CollectionLocksContext = createContext<CollectionLocksContextValue>({
  locks: {},
  currentUserId: undefined,
  isLockedByOther: () => false,
});

export function CollectionLocksProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locks, setLocks] = useState<Record<string, ScanLockInfo>>({});
  const { data: sessionData } = useAuthSession();
  const session = sessionData as {
    session?: { activeOrganizationId?: string | null };
    user?: { id?: string };
  } | null;
  const currentUserId = session?.user?.id;
  const orgId =
    session?.session?.activeOrganizationId ??
    localStorage.getItem("activeOrgId");

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    createLockEventsSource()
      .then((es) => {
        if (cancelled) {
          es.close();
          return;
        }
        esRef.current = es;

        es.addEventListener("init", (e) => {
          const { locks: initial } = JSON.parse((e as MessageEvent).data) as {
            locks: Record<string, ScanLockInfo>;
          };
          setLocks(initial);
        });

        es.addEventListener("lock_acquired", (e) => {
          const { guid, userId, displayName } = JSON.parse(
            (e as MessageEvent).data,
          ) as { guid: string; userId: string; displayName: string };
          setLocks((prev) => ({
            ...prev,
            [guid]: {
              userId,
              displayName,
              expiresAt: Date.now() + 5 * 60 * 1000,
            },
          }));
        });

        es.addEventListener("lock_released", (e) => {
          const { guid } = JSON.parse((e as MessageEvent).data) as {
            guid: string;
          };
          setLocks((prev) => {
            const next = { ...prev };
            delete next[guid];
            return next;
          });
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [orgId]);

  const isLockedByOther = (guid: string) => {
    const lock = locks[guid];
    return !!(lock && lock.userId !== currentUserId);
  };

  return (
    <CollectionLocksContext value={{ locks, currentUserId, isLockedByOther }}>
      {children}
    </CollectionLocksContext>
  );
}

export function useCollectionLocks() {
  return useContext(CollectionLocksContext);
}
