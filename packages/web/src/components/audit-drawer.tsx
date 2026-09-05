import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { IconClockHour3, IconRotateClockwise2, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface AuditEntry {
  guid: string;
  createdAt: string;
  label?: string;
  body: ReactNode;
}

interface AuditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  entries: AuditEntry[];
  isLoading: boolean;
  onRevert: (guid: string) => void;
  isReverting: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditDrawer({
  open,
  onOpenChange,
  title,
  entries,
  isLoading,
  onRevert,
  isReverting,
}: AuditDrawerProps) {
  const { t } = useTranslation("common");
  const [confirmGuid, setConfirmGuid] = useState<string | null>(null);

  function handleRevert(guid: string) {
    onRevert(guid);
    setConfirmGuid(null);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <IconClockHour3 size={14} className="text-muted-foreground" />
            <DrawerTitle>{title}</DrawerTitle>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconX size={14} />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t("auditDrawer.noHistory")}
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {entries.map((entry, i) => (
                <div key={entry.guid} className="p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {entry.label && (
                        <p className="text-xs font-medium">{entry.label}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </p>
                      {i === 0 && (
                        <span className="text-xs text-muted-foreground italic">
                          {t("auditDrawer.current")}
                        </span>
                      )}
                    </div>
                    {i > 0 && (
                      <div className="flex gap-1 shrink-0">
                        {confirmGuid === entry.guid ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-6 px-2 text-xs"
                              disabled={isReverting}
                              onClick={() => handleRevert(entry.guid)}
                            >
                              {t("auditDrawer.confirm")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isReverting}
                              onClick={() => setConfirmGuid(null)}
                            >
                              {t("auditDrawer.cancel")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => setConfirmGuid(entry.guid)}
                          >
                            <IconRotateClockwise2 size={10} />
                            {t("auditDrawer.revert")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{entry.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
