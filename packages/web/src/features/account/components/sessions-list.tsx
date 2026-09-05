import { DeleteDialog } from "@/components/delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { neon } from "@/lib/auth/client";
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconLoader2,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface SessionRow {
  id: string;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function describeUserAgent(ua: string | null | undefined): {
  label: string;
  isMobile: boolean;
} {
  if (!ua) return { label: "", isMobile: false };

  const isTablet = /iPad|Tablet/i.test(ua);
  const isMobile = isTablet || /Mobi|Android|iPhone/i.test(ua);

  let browser = "";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  let os = "";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  const label = [browser, os].filter(Boolean).join(" on ");
  return { label, isMobile };
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionsList() {
  const { t } = useTranslation("account");
  const { data } = neon.auth.useSession();
  const currentToken = data?.session?.token;

  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<SessionRow | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await neon.auth.listSessions();
      if (error) throw new Error(error.message);
      setSessions(
        [...(data ?? [])].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      );
    } catch {
      toast.error(t("sessions.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevokingToken(revokeTarget.token);
    try {
      const { error } = await neon.auth.revokeSession({
        token: revokeTarget.token,
      });
      if (error) throw new Error(error.message);
      if (revokeTarget.token === currentToken) {
        window.location.href = "/auth/sign-in";
        return;
      }
      toast.success(t("sessions.revoked"));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("sessions.revokeFailed"));
    } finally {
      setRevokingToken(null);
      setRevokeTarget(null);
    }
  }

  async function handleRevokeAll() {
    setIsRevokingAll(true);
    try {
      const { error } = await neon.auth.revokeOtherSessions();
      if (error) throw new Error(error.message);
      toast.success(t("sessions.allRevoked"));
      await load();
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("sessions.revokeAllFailed"),
      );
    } finally {
      setIsRevokingAll(false);
      setRevokeAllOpen(false);
    }
  }

  const otherCount = (sessions ?? []).filter(
    (s) => s.token !== currentToken,
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("sessions.description")}
        </p>
        {otherCount > 0 && (
          <Button
            type="button"
            variant="outline-destructive"
            size="sm"
            disabled={isRevokingAll}
            onClick={() => setRevokeAllOpen(true)}
          >
            {t("sessions.revokeAll")}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!isLoading && sessions?.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("sessions.empty")}</p>
      )}

      {!isLoading && sessions && sessions.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border">
          {sessions.map((session) => {
            const isCurrent = session.token === currentToken;
            const { label, isMobile } = describeUserAgent(session.userAgent);
            const Icon = isMobile ? IconDeviceMobile : IconDeviceDesktop;
            const isRevoking = revokingToken === session.token;

            return (
              <div
                key={session.id}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {label || t("sessions.unknownDevice")}
                    </p>
                    {isCurrent && (
                      <Badge variant="success">{t("sessions.current")}</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.ipAddress ?? t("sessions.noIp")} ·{" "}
                    {t("sessions.lastActive", {
                      date: formatDate(session.updatedAt),
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isRevoking}
                  onClick={() => setRevokeTarget(session)}
                >
                  {isRevoking && <IconLoader2 className="animate-spin" />}
                  {t("sessions.revoke")}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <DeleteDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={t("sessions.revokeConfirmTitle")}
        description={
          revokeTarget?.token === currentToken
            ? t("sessions.revokeCurrentConfirmDescription")
            : t("sessions.revokeConfirmDescription")
        }
        confirm={{ type: "simple" }}
        confirmLabel={t("sessions.revoke")}
        onConfirm={handleRevoke}
      />

      <DeleteDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        title={t("sessions.revokeAllConfirmTitle")}
        description={t("sessions.revokeAllConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("sessions.revokeAll")}
        onConfirm={handleRevokeAll}
      />
    </div>
  );
}
