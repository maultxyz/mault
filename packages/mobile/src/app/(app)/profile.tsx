import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import {
  authSessionsQueryOptions,
  linkedSignInAccountsQueryOptions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  updateName,
} from "@/features/account/api/account";
import { SignInMethodsSection } from "@/features/account/components/sign-in-methods-section";
import { DiscordAccountSection } from "@/features/account/components/discord-account-section";
import { describeUserAgent } from "@/features/account/lib/user-agent";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getSessionToken, refreshOrganizations, signOut, useSession } from "@/lib/auth/session";
import { AUTH_PROVIDER } from "@/lib/constants/config";
import { formatShortDate } from "@/lib/dates";
import type { AuthSessionRow } from "@/lib/interfaces/auth";
import type { StatusTone } from "@/lib/interfaces/theme";
import { updateNameFormSchema, type UpdateNameFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isLocal = AUTH_PROVIDER === "local";
  const { showToast } = useToast();
  const [hasNameSaveFailed, setHasNameSaveFailed] = useState(false);
  const setMessage = useCallback(
    (message: { tone: StatusTone; text: string }) =>
      showToast({ message: message.text, tone: message.tone === "destructive" ? "destructive" : "success" }),
    [showToast],
  );
  const sessions = useQuery({ ...authSessionsQueryOptions(), enabled: !isLocal });
  const currentToken = getSessionToken();

  const nameValues = useMemo(() => ({ name: user?.name ?? "" }), [user?.name]);
  const nameForm = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameFormSchema),
    values: nameValues,
    resetOptions: { keepDirtyValues: true },
  });

  const refreshSessions = () => void queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });

  const saveName = async ({ name }: UpdateNameFormValues) => {
    setHasNameSaveFailed(false);
    try {
      await updateName(name.trim());
      await refreshOrganizations();
      nameForm.reset({ name: name.trim() });
      setMessage({ tone: "success", text: t("account.profile.profile.updated") });
    } catch {
      setHasNameSaveFailed(true);
    }
  };

  const revoke = useMutation({
    mutationFn: (row: AuthSessionRow) => revokeAuthSession(row.token),
    onSuccess: (_, row) => {
      if (row.token === currentToken) {
        queryClient.clear();
        void signOut();
        return;
      }
      setMessage({ tone: "success", text: t("account.profile.sessions.revoked") });
    },
    onError: () => setMessage({ tone: "destructive", text: t("account.profile.sessions.revokeFailed") }),
    onSettled: refreshSessions,
  });
  const revokeOthers = useMutation({
    mutationFn: revokeOtherAuthSessions,
    onSuccess: () => setMessage({ tone: "success", text: t("account.profile.sessions.allRevoked") }),
    onError: () => setMessage({ tone: "destructive", text: t("account.profile.sessions.revokeAllFailed") }),
    onSettled: refreshSessions,
  });

  const confirmRevoke = (row: AuthSessionRow) => {
    const isCurrent = row.token === currentToken;
    Alert.alert(
      t("account.profile.sessions.revokeConfirmTitle"),
      isCurrent ? t("account.profile.sessions.revokeCurrentConfirmDescription") : t("account.profile.sessions.revokeConfirmDescription"),
      [
        { text: t("account.profile.sessions.cancel"), style: "cancel" },
        { text: t("account.profile.sessions.revokeConfirm"), style: "destructive", onPress: () => revoke.mutate(row) },
      ],
    );
  };

  const confirmRevokeOthers = () =>
    Alert.alert(t("account.profile.sessions.revokeAllConfirmTitle"), t("account.profile.sessions.revokeAllConfirmDescription"), [
      { text: t("account.profile.sessions.cancel"), style: "cancel" },
      { text: t("account.profile.sessions.revokeConfirm"), style: "destructive", onPress: () => revokeOthers.mutate() },
    ]);

  const otherSessions = (sessions.data ?? []).filter((row) => row.token !== currentToken);

  return (
    <SettingsPage
      title={t("account.profile.title")}
      subtitle={isLocal ? t("account.profile.localSubtitle") : t("account.profile.subtitle")}
      onRefresh={
        isLocal
          ? undefined
          : () => Promise.all([sessions.refetch(), queryClient.refetchQueries({ queryKey: linkedSignInAccountsQueryOptions().queryKey })])
      }
      isDirty={!isLocal && nameForm.formState.isDirty}
      isSaving={nameForm.formState.isSubmitting}
      saveError={hasNameSaveFailed}
      saveErrorMessage={t("account.profile.profile.updateFailed")}
      onSave={() => void nameForm.handleSubmit(saveName)()}
      onDiscard={() => {
        setHasNameSaveFailed(false);
        nameForm.reset(nameValues);
      }}
    >
      {isLocal ? (
        <ListGroup>
          <ListRow title={t("account.profile.email.heading")} value={user?.email ?? ""} />
          {user?.name ? <ListRow title={t("account.profile.nameLabel")} value={user.name} /> : null}
        </ListGroup>
      ) : (
        <>
          <SettingsSection title={t("account.profile.profile.heading")}>
            <Controller
              control={nameForm.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("account.profile.profile.nameLabel")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                  returnKeyType="done"
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
          </SettingsSection>

          <SettingsSection title={t("account.profile.signInHeading")}>
            <ListGroup>
              <ListRow title={t("account.profile.email.heading")} value={user?.email ?? ""} />
              <ListRow
                icon="send"
                title={t("account.profile.email.change")}
                onPress={() => router.push("/settings/change-email")}
              />
              <ListRow
                icon="key"
                title={t("account.profile.password.change")}
                onPress={() => router.push("/settings/change-password")}
              />
            </ListGroup>
          </SettingsSection>

          <SignInMethodsSection onMessage={setMessage} />

          <SettingsSection title={t("account.profile.sessions.heading")} description={t("account.profile.sessions.description")}>
            {sessions.isError ? (
              <Callout
                tone="destructive"
                title={t("account.profile.sessions.loadFailed")}
                action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void sessions.refetch()} />}
              />
            ) : null}
            {sessions.isPending ? (
              <ListSkeleton rows={2} hasSubtitle />
            ) : sessions.data && sessions.data.length === 0 ? (
              <EmptyState icon="account" title={t("account.profile.sessions.empty")} />
            ) : (
              <ListGroup>
                {(sessions.data ?? []).map((row) => {
                  const device = describeUserAgent(row.userAgent);
                  const isCurrent = row.token === currentToken;
                  return (
                    <ListRow
                      key={row.id}
                      icon={device.isMobile ? "phone" : "desktop"}
                      title={`${device.label || t("account.profile.sessions.unknownDevice")}${isCurrent ? ` · ${t("account.profile.sessions.current")}` : ""}`}
                      subtitle={`${row.ipAddress || t("account.profile.sessions.noIp")}\n${t("account.profile.sessions.lastActive", { date: formatShortDate(row.updatedAt, i18n.language) })}`}
                      onPress={() => confirmRevoke(row)}
                      actionLabel={t("account.profile.sessions.revoke")}
                      actionTone="destructive"
                      disabled={revoke.isPending}
                    />
                  );
                })}
              </ListGroup>
            )}
            {otherSessions.length > 0 ? (
              <ListGroup>
                <ListRow
                  icon="logout"
                  tone="destructive"
                  title={t("account.profile.sessions.revokeAll")}
                  disabled={revokeOthers.isPending}
                  onPress={confirmRevokeOthers}
                />
              </ListGroup>
            ) : null}
          </SettingsSection>
        </>
      )}

      <DiscordAccountSection onMessage={setMessage} />
    </SettingsPage>
  );
}
