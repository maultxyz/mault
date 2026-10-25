import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import {
  authSessionsQueryOptions,
  changeEmail,
  changePassword,
  revokeAuthSession,
  revokeOtherAuthSessions,
  updateName,
} from "@/features/account/api/account";
import { describeUserAgent } from "@/features/account/lib/user-agent";
import { getSessionToken, refreshOrganizations, signOut, useSession } from "@/lib/auth/session";
import { AUTH_PROVIDER } from "@/lib/constants/config";
import { SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";
import type { AuthSessionRow } from "@/lib/interfaces/auth";
import {
  changeEmailFormSchema,
  type ChangeEmailFormValues,
  changePasswordFormSchema,
  type ChangePasswordFormValues,
  updateNameFormSchema,
  type UpdateNameFormValues,
} from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const isLocal = AUTH_PROVIDER === "local";
  const [message, setMessage] = useState<{ tone: "success" | "destructive" | "info"; text: string; description?: string } | null>(null);
  const sessions = useQuery({ ...authSessionsQueryOptions(), enabled: !isLocal });
  const currentToken = getSessionToken();

  const nameValues = useMemo(() => ({ name: user?.name ?? "" }), [user?.name]);
  const nameForm = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameFormSchema),
    values: nameValues,
    resetOptions: { keepDirtyValues: true },
  });
  const emailForm = useForm<ChangeEmailFormValues>({ resolver: zodResolver(changeEmailFormSchema), defaultValues: { newEmail: "" } });
  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "", revokeOtherSessions: false },
  });
  const nameDirty = nameForm.formState.isDirty;

  usePreventRemove(nameDirty && !nameForm.formState.isSubmitting, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("settings.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => {
          nameForm.reset(nameValues);
          navigation.dispatch(data.action);
        },
      },
    ]);
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

  const emailChange = useMutation({
    mutationFn: ({ newEmail }: ChangeEmailFormValues) => changeEmail(newEmail.trim()),
    onSuccess: (_, { newEmail }) => {
      emailForm.reset({ newEmail: "" });
      setMessage({
        tone: "success",
        text: t("account.profile.email.confirmationSent"),
        description: t("account.profile.email.confirmationSentDescription", { email: newEmail.trim() }),
      });
    },
    onError: (err: Error) => setMessage({ tone: "destructive", text: err.message || t("account.profile.email.updateFailed") }),
  });
  const passwordChange = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword(values.currentPassword, values.newPassword, values.revokeOtherSessions),
    onSuccess: () => {
      passwordForm.reset();
      setMessage({ tone: "success", text: t("account.profile.password.updated") });
      refreshSessions();
    },
    onError: (err: Error) => setMessage({ tone: "destructive", text: err.message || t("account.profile.password.updateFailed") }),
  });
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

  const submitEmail = emailForm.handleSubmit((values) => {
    if (values.newEmail.trim().toLowerCase() === (user?.email ?? "").toLowerCase()) {
      emailForm.setError("newEmail", { message: t("account.profile.email.sameAsCurrent") });
      return;
    }
    emailChange.mutate(values);
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
    <View style={{ flex: 1 }}>
      <Screen
        refreshing={sessions.isRefetching}
        onRefresh={isLocal ? undefined : () => void sessions.refetch()}
        header={
          <PageHeader
            title={t("account.profile.title")}
            subtitle={isLocal ? t("account.profile.localSubtitle") : t("account.profile.subtitle")}
            onBack={() => router.back()}
          />
        }
      >
        {message ? <Callout tone={message.tone} title={message.text} description={message.description} /> : null}

        {isLocal ? (
          <ListGroup>
            <ListRow title={t("account.profile.email.heading")} value={user?.email ?? ""} />
            {user?.name ? <ListRow title={t("account.profile.nameLabel")} value={user.name} /> : null}
          </ListGroup>
        ) : (
          <>
            <SectionHeader title={t("account.profile.profile.heading")} />
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
                  autoCapitalize="words"
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />

            <SectionHeader title={t("account.profile.email.heading")} />
            <Surface style={{ gap: SPACING.md }}>
              <AppText weight="semibold" selectable>
                {user?.email ?? ""}
              </AppText>
              <Controller
                control={emailForm.control}
                name="newEmail"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t("account.profile.email.newLabel")}
                    placeholder={t("account.profile.email.placeholder")}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    autoComplete="email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={fieldState.error ? (translateFormErrorMessage(t, fieldState.error.message) ?? t("account.profile.email.updateFailed")) : undefined}
                  />
                )}
              />
              <Button
                variant="secondary"
                label={t("account.profile.email.submit")}
                loading={emailChange.isPending}
                onPress={() => void submitEmail()}
              />
            </Surface>

            <SectionHeader title={t("account.profile.password.heading")} />
            <Surface style={{ gap: SPACING.md }}>
              <Controller
                control={passwordForm.control}
                name="currentPassword"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t("account.profile.password.currentLabel")}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    secureTextEntry
                    autoComplete="password"
                    autoCapitalize="none"
                    error={translateFormErrorMessage(t, fieldState.error?.message)}
                  />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="newPassword"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t("account.profile.password.newLabel")}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    secureTextEntry
                    autoComplete="new-password"
                    autoCapitalize="none"
                    error={translateFormErrorMessage(t, fieldState.error?.message)}
                  />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t("account.profile.password.confirmLabel")}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    secureTextEntry
                    autoComplete="new-password"
                    autoCapitalize="none"
                    error={translateFormErrorMessage(t, fieldState.error?.message)}
                  />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="revokeOtherSessions"
                render={({ field }) => (
                  <SwitchRow
                    title={t("account.profile.password.revokeOtherSessions")}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              <Button
                variant="secondary"
                label={t("account.profile.password.submit")}
                loading={passwordChange.isPending}
                onPress={passwordForm.handleSubmit((values) => passwordChange.mutate(values))}
              />
            </Surface>

            <SectionHeader title={t("account.profile.sessions.heading")} />
            <AppText size="xs" tone="secondary">
              {t("account.profile.sessions.description")}
            </AppText>
            {sessions.isError ? <Callout tone="destructive" title={t("account.profile.sessions.loadFailed")} /> : null}
            {sessions.isPending ? (
              <Skeleton height={120} />
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
              <Button
                variant="ghost"
                label={t("account.profile.sessions.revokeAll")}
                loading={revokeOthers.isPending}
                onPress={confirmRevokeOthers}
              />
            ) : null}
          </>
        )}
      </Screen>
      <SaveBar
        visible={nameDirty}
        saving={nameForm.formState.isSubmitting}
        onSave={() => void nameForm.handleSubmit(saveName)()}
        onDiscard={() => nameForm.reset(nameValues)}
      />
    </View>
  );
}
