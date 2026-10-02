import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImpersonationAuditDrawer } from "@/features/admin/components/impersonation-audit-drawer";
import { useImpersonation } from "@/hooks/use-impersonation";
import { searchAdminUsers } from "@/lib/api/admin";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { QUERY_MIN_LENGTH, type AdminUserSummary } from "@magic-vault/shared";
import { IconClockHour3, IconUserScan } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

export function ImpersonationUsersManager() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { start, isImpersonating } = useImpersonation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<AdminUserSummary | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isQueryReady = search.trim().length >= QUERY_MIN_LENGTH;

  const usersQuery = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => searchAdminUsers(search).then((r) => r.data ?? []),
    enabled: isQueryReady,
    staleTime: 10_000,
  });

  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setSearch(value),
      SEARCH_DEBOUNCE_MS,
    );
  }

  async function handleConfirmImpersonate() {
    if (!target) return;
    setIsStarting(true);
    try {
      await start(target.id);
      setTarget(null);
      navigate("/app");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("impersonationUsersManager.toasts.startError"),
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <SettingsSection
      heading={t("impersonationUsersManager.heading")}
      description={t("impersonationUsersManager.description")}
      action={
        <>
          <Input
            placeholder={t("impersonationUsersManager.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="h-7 text-xs max-w-56"
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7"
                  onClick={() => setAuditOpen(true)}
                >
                  <IconClockHour3 size={14} />
                </Button>
              }
            ></TooltipTrigger>
            <TooltipContent>
              {t("impersonationUsersManager.viewAuditLog")}
            </TooltipContent>
          </Tooltip>
        </>
      }
    >
      <div className="divide-y max-h-80 overflow-y-auto rounded-lg border">
        {!isQueryReady && (
          <p className="text-sm text-foreground/70 text-center py-6">
            {t("impersonationUsersManager.startTyping")}
          </p>
        )}
        {isQueryReady && usersQuery.isLoading && (
          <p className="text-sm text-foreground/70 text-center py-6">
            {t("loading")}
          </p>
        )}
        {isQueryReady &&
          usersQuery.data?.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {user.name || user.email}
                  </p>
                  {user.role === "admin" && (
                    <Badge variant="outline">
                      {t("impersonationUsersManager.adminBadge")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-foreground/70 truncate">
                  {user.email}
                  {user.orgs.length > 0
                    ? ` · ${user.orgs.map((o) => o.name).join(", ")}`
                    : ` · ${t("impersonationUsersManager.noOrgs")}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  user.role === "admin" ||
                  isImpersonating ||
                  user.orgs.length === 0
                }
                title={
                  user.role === "admin"
                    ? t("impersonationUsersManager.cannotImpersonateAdmin")
                    : user.orgs.length === 0
                      ? t("impersonationUsersManager.noOrgs")
                      : undefined
                }
                onClick={() => setTarget(user)}
              >
                <IconUserScan size={14} />
                {t("impersonationUsersManager.impersonateButton")}
              </Button>
            </div>
          ))}
        {isQueryReady &&
          !usersQuery.isLoading &&
          usersQuery.data?.length === 0 && (
            <p className="text-sm text-foreground/70 text-center py-6">
              {t("impersonationUsersManager.empty")}
            </p>
          )}
      </div>

      <DynamicDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title={t("impersonationUsersManager.confirmDialog.title")}
        description={t("impersonationUsersManager.confirmDialog.description", {
          email: target?.email ?? "",
        })}
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>
              {t("cancel")}
            </Button>
            <Button disabled={isStarting} onClick={handleConfirmImpersonate}>
              {isStarting
                ? t("starting")
                : t("impersonationUsersManager.confirmDialog.confirm")}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      />

      <ImpersonationAuditDrawer open={auditOpen} onOpenChange={setAuditOpen} />
    </SettingsSection>
  );
}
