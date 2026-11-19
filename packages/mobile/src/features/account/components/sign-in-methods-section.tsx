import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import {
  linkedSignInAccountsQueryOptions,
  unlinkSignInAccount,
} from "@/features/account/api/account";
import type { SignInMethodsSectionProps } from "@/lib/interfaces/auth";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { formatShortDate } from "@/lib/dates";
import type { IconName } from "@/lib/interfaces/ui";
import {
  NEON_PASSWORD_SIGN_IN_PROVIDER_ID,
  NEON_SOCIAL_PROVIDER_NAMES,
  canUnlinkSignInAccount,
  isNeonSocialProvider,
  type LinkedSignInAccount,
} from "@magic-vault/shared";

function providerNameOf(providerId: string, passwordLabel: string): string {
  if (providerId === NEON_PASSWORD_SIGN_IN_PROVIDER_ID) return passwordLabel;
  return isNeonSocialProvider(providerId) ? NEON_SOCIAL_PROVIDER_NAMES[providerId] : providerId;
}

function providerIconOf(providerId: string): IconName {
  if (providerId === NEON_PASSWORD_SIGN_IN_PROVIDER_ID) return "key";
  if (providerId === "discord") return "discord";
  return "account";
}

export function SignInMethodsSection({ onMessage }: SignInMethodsSectionProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const accounts = useQuery(linkedSignInAccountsQueryOptions());
  const refreshAccounts = () => void queryClient.invalidateQueries({ queryKey: linkedSignInAccountsQueryOptions().queryKey });
  const passwordLabel = t("account.profile.signInMethods.password");

  const unlink = useMutation({
    mutationFn: unlinkSignInAccount,
    onSuccess: (_, account) =>
      onMessage({
        tone: "success",
        text: t("account.profile.signInMethods.unlinked", { provider: providerNameOf(account.providerId, passwordLabel) }),
      }),
    onError: (err: Error, account) =>
      onMessage({
        tone: "destructive",
        text: err.message || t("account.profile.signInMethods.unlinkFailed", { provider: providerNameOf(account.providerId, passwordLabel) }),
      }),
    onSettled: refreshAccounts,
  });

  const confirmUnlink = (account: LinkedSignInAccount) => {
    const provider = providerNameOf(account.providerId, passwordLabel);
    Alert.alert(
      t("account.profile.signInMethods.unlinkConfirmTitle", { provider }),
      t("account.profile.signInMethods.unlinkConfirmDescription", { provider }),
      [
        { text: t("account.profile.signInMethods.cancel"), style: "cancel" },
        { text: t("account.profile.signInMethods.unlink"), style: "destructive", onPress: () => unlink.mutate(account) },
      ],
    );
  };

  const linkedAccounts = accounts.data ?? [];
  const isBusy = unlink.isPending;

  return (
    <SettingsSection
      title={t("account.profile.signInMethods.heading")}
      description={t("account.profile.signInMethods.description")}
    >
      {accounts.isError && !accounts.data ? (
        <Callout tone="destructive" title={t("account.profile.signInMethods.loadFailed")} />
      ) : null}
      {accounts.isPending ? (
        <ListSkeleton rows={2} />
      ) : accounts.data ? (
        <ListGroup>
            {linkedAccounts.map((account) => {
              const canUnlink = canUnlinkSignInAccount(linkedAccounts, account);
              const linkedOn = t("account.profile.signInMethods.linkedOn", {
                date: formatShortDate(account.createdAt, i18n.language),
              });
              return (
                <ListRow
                  key={account.id}
                  icon={providerIconOf(account.providerId)}
                  title={providerNameOf(account.providerId, passwordLabel)}
                  subtitle={
                    account.providerId !== NEON_PASSWORD_SIGN_IN_PROVIDER_ID && !canUnlink
                      ? `${linkedOn}\n${t("account.profile.signInMethods.onlyMethod")}`
                      : linkedOn
                  }
                  onPress={canUnlink ? () => confirmUnlink(account) : undefined}
                  accessibilityHint={canUnlink ? t("account.profile.signInMethods.unlinkHint") : undefined}
                  disabled={canUnlink && isBusy}
                />
              );
            })}
        </ListGroup>
      ) : null}
    </SettingsSection>
  );
}
