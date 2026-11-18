import { DeleteDialog } from "@/components/delete-dialog";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  linkedSignInAccountsQueryKey,
  linkedSignInAccountsQueryOptions,
} from "@/features/account/api/linked-sign-in-accounts";
import { neon } from "@/lib/auth/client";
import { PENDING_SIGN_IN_PROVIDER_LINK_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { formatShortDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import {
  NEON_PASSWORD_SIGN_IN_PROVIDER_ID,
  NEON_SOCIAL_PROVIDER_NAMES,
  canUnlinkSignInAccount,
  isNeonSocialProvider,
  linkSignInProviderErrorKey,
  unlinkedNeonSocialProviders,
  type LinkedSignInAccount,
  type NeonSocialProvider,
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
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

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

function readPendingLinkProvider(): NeonSocialProvider | null {
  try {
    const provider = sessionStorage.getItem(PENDING_SIGN_IN_PROVIDER_LINK_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_SIGN_IN_PROVIDER_LINK_STORAGE_KEY);
    return provider && isNeonSocialProvider(provider) ? provider : null;
  } catch {
    return null;
  }
}

function writePendingLinkProvider(provider: NeonSocialProvider | null) {
  try {
    if (provider) sessionStorage.setItem(PENDING_SIGN_IN_PROVIDER_LINK_STORAGE_KEY, provider);
    else sessionStorage.removeItem(PENDING_SIGN_IN_PROVIDER_LINK_STORAGE_KEY);
  } catch {}
}

export function SignInMethodsList() {
  const { t } = useTranslation("account");
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: accounts,
    isLoading,
    isError: loadFailed,
    refetch,
  } = useQuery(linkedSignInAccountsQueryOptions());
  const [linkingProvider, setLinkingProvider] = useState<NeonSocialProvider | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedSignInAccount | null>(null);
  const [unlinkingAccountId, setUnlinkingAccountId] = useState<string | null>(null);

  const providerNameOf = (providerId: string) =>
    providerId === NEON_PASSWORD_SIGN_IN_PROVIDER_ID
      ? t("signInMethods.password")
      : isNeonSocialProvider(providerId)
        ? NEON_SOCIAL_PROVIDER_NAMES[providerId]
        : providerId;

  const [returnedLinkProvider, setReturnedLinkProvider] =
    useState<NeonSocialProvider | null>(null);

  useEffect(() => {
    const provider = readPendingLinkProvider();
    if (provider) setReturnedLinkProvider(provider);
  }, []);

  useEffect(() => {
    if (!returnedLinkProvider || !accounts) return;
    setReturnedLinkProvider(null);
    const providerName = NEON_SOCIAL_PROVIDER_NAMES[returnedLinkProvider];
    const errorCode = searchParams.get("error");
    if (errorCode) {
      toast.error(
        t(`signInMethods.${linkSignInProviderErrorKey(errorCode)}`, {
          provider: providerName,
          code: errorCode,
        }),
      );
      setSearchParams(
        (params) => {
          params.delete("error");
          return params;
        },
        { replace: true },
      );
    } else if (accounts.some((account) => account.providerId === returnedLinkProvider)) {
      toast.success(t("signInMethods.linked", { provider: providerName }));
    }
  }, [returnedLinkProvider, accounts, searchParams, setSearchParams, t]);

  async function handleLink(provider: NeonSocialProvider) {
    setLinkingProvider(provider);
    writePendingLinkProvider(provider);
    const returnUrl = `${window.location.origin}${window.location.pathname}`;
    try {
      const { error } = await neon.auth.linkSocial({
        provider,
        callbackURL: returnUrl,
        errorCallbackURL: returnUrl,
      });
      if (error) throw new Error(error.message);
    } catch (e: unknown) {
      writePendingLinkProvider(null);
      setLinkingProvider(null);
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : t("signInMethods.linkFailed", { provider: NEON_SOCIAL_PROVIDER_NAMES[provider] }),
      );
    }
  }

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
  const providersToLink = unlinkedNeonSocialProviders(linkedAccounts);
  const isBusy = linkingProvider !== null || unlinkingAccountId !== null;

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
        <>
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

          {providersToLink.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {providersToLink.map((provider) => {
                const Icon = providerIconOf(provider);
                return (
                  <Button
                    key={provider}
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => void handleLink(provider)}
                  >
                    {linkingProvider === provider ? (
                      <IconLoader2 className="animate-spin" />
                    ) : (
                      <Icon aria-hidden />
                    )}
                    {t("signInMethods.link", { provider: NEON_SOCIAL_PROVIDER_NAMES[provider] })}
                  </Button>
                );
              })}
            </div>
          )}
        </>
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
