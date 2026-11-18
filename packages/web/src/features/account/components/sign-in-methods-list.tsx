import { DeleteDialog } from "@/components/delete-dialog";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  linkedSignInAccountsQueryKey,
  linkedSignInAccountsQueryOptions,
} from "@/features/account/api/linked-sign-in-accounts";
import { neon } from "@/lib/auth/client";
import { formatShortDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import {
  NEON_PASSWORD_SIGN_IN_PROVIDER_ID,
  NEON_SOCIAL_PROVIDER_NAMES,
  canUnlinkSignInAccount,
  isNeonSocialProvider,
  type LinkedSignInAccount,
} from "@magic-vault/shared";
import {
  IconBrandApple,
  IconBrandDiscord,
  IconBrandGithub,
  IconBrandGoogle,
  IconKey,
  IconLoader2,
  IconUserCircle,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function providerIconOf(providerId: string) {
  switch (providerId) {
    case NEON_PASSWORD_SIGN_IN_PROVIDER_ID:
      return IconKey;
    case "github":
      return IconBrandGithub;
    case "google":
      return IconBrandGoogle;
    case "discord":
      return IconBrandDiscord;
    case "apple":
      return IconBrandApple;
    default:
      return IconUserCircle;
  }
}

export function SignInMethodsList() {
  const { t } = useTranslation("account");
  const queryClient = useQueryClient();
  const {
    data: accounts,
    isLoading,
    isError: loadFailed,
    refetch,
  } = useQuery(linkedSignInAccountsQueryOptions());
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedSignInAccount | null>(null);
  const [unlinkingAccountId, setUnlinkingAccountId] = useState<string | null>(null);

  const providerNameOf = (providerId: string) =>
    providerId === NEON_PASSWORD_SIGN_IN_PROVIDER_ID
      ? t("signInMethods.password")
      : isNeonSocialProvider(providerId)
        ? NEON_SOCIAL_PROVIDER_NAMES[providerId]
        : providerId;

  async function handleUnlink() {
    if (!unlinkTarget) return;
    const providerName = providerNameOf(unlinkTarget.providerId);
    setUnlinkingAccountId(unlinkTarget.id);
    try {
      const { error } = await neon.auth.unlinkAccount({
        providerId: unlinkTarget.providerId,
        accountId: unlinkTarget.accountId,
      });
      if (error) throw new Error(error.message);
      toast.success(t("signInMethods.unlinked", { provider: providerName }));
    } catch (e: unknown) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : t("signInMethods.unlinkFailed", { provider: providerName }),
      );
    } finally {
      setUnlinkingAccountId(null);
      setUnlinkTarget(null);
      await queryClient.invalidateQueries({ queryKey: linkedSignInAccountsQueryKey });
    }
  }

  const linkedAccounts = accounts ?? [];
  const isBusy = unlinkingAccountId !== null;

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <p className="text-xs text-foreground/70">{t("signInMethods.description")}</p>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!isLoading && loadFailed && !accounts && (
        <LoadErrorCallout
          message={t("signInMethods.loadFailed")}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && accounts && (
        <ul className="flex flex-col divide-y divide-border">
          {linkedAccounts.map((account) => {
            const Icon = providerIconOf(account.providerId);
            const providerName = providerNameOf(account.providerId);
            const canUnlink = canUnlinkSignInAccount(linkedAccounts, account);
            const isUnlinking = unlinkingAccountId === account.id;
            return (
              <li key={account.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <Icon aria-hidden className="size-4 shrink-0 text-foreground/70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{providerName}</p>
                  <p className="truncate text-xs text-foreground/70">
                    {t("signInMethods.linkedOn", { date: formatShortDate(account.createdAt) })}
                    {account.providerId !== NEON_PASSWORD_SIGN_IN_PROVIDER_ID &&
                      !canUnlink &&
                      ` · ${t("signInMethods.onlyMethod")}`}
                  </p>
                </div>
                {canUnlink && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isBusy}
                    aria-label={t("signInMethods.unlinkProvider", { provider: providerName })}
                    onClick={() => setUnlinkTarget(account)}
                  >
                    {isUnlinking && <IconLoader2 className="animate-spin" />}
                    {t("signInMethods.unlink")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <DeleteDialog
        open={!!unlinkTarget}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null);
        }}
        title={t("signInMethods.unlinkConfirmTitle", {
          provider: unlinkTarget ? providerNameOf(unlinkTarget.providerId) : "",
        })}
        description={t("signInMethods.unlinkConfirmDescription", {
          provider: unlinkTarget ? providerNameOf(unlinkTarget.providerId) : "",
        })}
        confirm={{ type: "simple" }}
        confirmLabel={t("signInMethods.unlink")}
        onConfirm={handleUnlink}
      />
    </div>
  );
}
