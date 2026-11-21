import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { TextField } from "@/components/ui/text-field";
import {
  authSessionsQueryOptions,
  revokeAuthSession,
  revokeOtherAuthSessions,
  updateName,
} from "@/features/account/api/account";
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
  const [message, setMessage] = useState<{ tone: StatusTone; text: string } | null>(null);
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
    try {
      await updateName(name.trim());
      await refreshOrganizations();
      nameForm.reset({ name: name.trim() });
      setMessage({ tone: "success", text: t("account.profile.profile.updated") });
    } catch (err) {
      setMessage({ tone: "destructive", text: err instanceof Error ? err.message : t("account.profile.profile.updateFailed") });
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
    onError: (err: Error) => setMessage({ tone: "destructive", text: err.message || t("account.profile.sessions.revokeFailed") }),
    onSettled: refreshSessions,
  });
  const revokeOthers = useMutation({
    mutationFn: revokeOtherAuthSessions,
    onSuccess: () => setMessage({ tone: "success", text: t("account.profile.sessions.allRevoked") }),
    onError: (err: Error) => setMessage({ tone: "destructive", text: err.message || t("account.profile.sessions.revokeAllFailed") }),
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
      onRefresh={isLocal ? undefined : () => sessions.refetch()}
      isDirty={!isLocal && nameForm.formState.isDirty}
      isSaving={nameForm.formState.isSubmitting}
      onSave={() => void nameForm.handleSubmit(saveName)()}
      onDiscard={() => nameForm.reset(nameValues)}
    >
      {message ? <Callout tone={message.tone} title={message.text} /> : null}

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

          <SettingsSection title={t("account.profile.sessions.heading")} description={t("account.profile.sessions.description")}>
            {sessions.isError ? <Callout tone="destructive" title={t("account.profile.sessions.loadFailed")} /> : null}
            {sessions.isPending ? (
              <ListSkeleton rows={2} />
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
    </SettingsPage>
  );
}
