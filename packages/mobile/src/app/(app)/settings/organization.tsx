import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SectionHeader } from "@/components/ui/section-header";
import { TextField } from "@/components/ui/text-field";
import { billingQueryOptions } from "@/features/org/api/billing";
import { SettingsPage } from "@/features/settings/components/settings-page";
import {
  cancelInvitation,
  deleteOrganization,
  organizationQueryOptions,
  removeMember,
  renameOrganization,
  updateMemberRole,
} from "@/features/org/api/organization";
import { useActiveOrg } from "@/hooks/use-org";
import { refreshOrganizations, useSession } from "@/lib/auth/session";
import { SPACING } from "@/lib/constants/theme";
import type { OrgMember, OrgRole } from "@/lib/interfaces/settings";
import { organizationNameFormSchema, type OrganizationNameFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function OrganizationSettingsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const { user } = useSession();
  const orgId = org?.id ?? null;
  const role = (org?.role ?? "member") as OrgRole;
  const canManage = role === "owner" || role === "admin";
  const details = useQuery(organizationQueryOptions(orgId, org?.name ?? ""));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const [roleSheet, setRoleSheet] = useState<OrgMember | null>(null);
  const [error, setError] = useState(false);
  const subscriptionBlocksDelete = !!billing && billing.plan !== "free" && !billing.cancelAtPeriodEnd;
  const memberLimit = billing?.maxMembersPerOrg ?? null;
  const memberLimitReached = memberLimit != null && (billing?.memberCount ?? 0) >= memberLimit;
  const canRename = canManage && !!details.data?.canRename;

  const renameForm = useForm<OrganizationNameFormValues>({
    resolver: zodResolver(organizationNameFormSchema),
    values: { name: details.data?.name ?? org?.name ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
    await queryClient.invalidateQueries({ queryKey: billingQueryOptions(orgId).queryKey });
  };
  const mutate = useMutation({
    mutationFn: async (task: () => Promise<void>) => task(),
    onMutate: () => setError(false),
    onError: () => setError(true),
    onSuccess: () => void refresh(),
  });

  const run = (task: () => Promise<void>) => mutate.mutateAsync(task).catch(() => undefined);

  const confirmRemove = (member: OrgMember) =>
    Alert.alert(t("settings.org.removeMemberTitle"), t("settings.org.removeMemberDescription", { name: member.name || member.email }), [
      { text: t("settings.org.cancel"), style: "cancel" },
      { text: t("settings.org.remove"), style: "destructive", onPress: () => void run(() => removeMember(orgId ?? "", member.id)) },
    ]);

  const confirmCancelInvite = (invitation: { id: string; email: string }) =>
    Alert.alert(t("settings.org.cancelInvite"), invitation.email, [
      { text: t("settings.org.cancel"), style: "cancel" },
      {
        text: t("settings.org.cancelInvite"),
        style: "destructive",
        onPress: () => void run(() => cancelInvitation(invitation.id)),
      },
    ]);

  const saveName = renameForm.handleSubmit((values) =>
    run(async () => {
      await renameOrganization(orgId ?? "", values.name.trim());
      renameForm.reset({ name: values.name.trim() });
      await refreshOrganizations();
    }),
  );

  const confirmDelete = () =>
    Alert.alert(t("settings.org.deleteOrganization"), t("settings.org.deleteOrgDescription", { name: org?.name ?? "" }), [
      { text: t("settings.org.cancel"), style: "cancel" },
      {
        text: t("settings.org.deleteOrganization"),
        style: "destructive",
        onPress: () =>
          void run(async () => {
            await deleteOrganization(orgId ?? "");
            queryClient.clear();
            await refreshOrganizations();
            router.back();
          }),
      },
    ]);

  const invitations = details.data?.invitations ?? [];
  return (
    <SettingsPage
      title={t("settings.sections.organization.title")}
      isLoading={details.isLoading}
      refreshing={details.isRefetching}
      onRefresh={() => void details.refetch()}
      isDirty={canRename && renameForm.formState.isDirty}
      isSaving={mutate.isPending}
      onSave={() => void saveName()}
      onDiscard={() => renameForm.reset()}
    >
      {error || details.isError ? <Callout tone="destructive" title={t("settings.org.failed")} /> : null}

      {canRename ? (
        <Controller
          control={renameForm.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("settings.org.nameLabel")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              returnKeyType="done"
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
      ) : null}

      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("settings.org.membersHeading")} />
        {details.data && !details.data.canManageMembers ? (
          <AppText size="xs" tone="secondary">
            {t("settings.org.membersUnavailable")}
          </AppText>
        ) : (
          <ListGroup>
            {(details.data?.members ?? []).map((member) => {
              const isSelf = member.userId === user?.id;
              const editable = canManage && !isSelf && member.role !== "owner";
              return (
                <ListRow
                  key={member.id}
                  icon="account"
                  title={member.name || member.email}
                  subtitle={isSelf ? `${member.email} · ${t("settings.org.you")}` : member.email}
                  value={t(`settings.org.roles.${member.role}`)}
                  onPress={editable ? () => setRoleSheet(member) : undefined}
                  onLongPress={editable ? () => setRoleSheet(member) : undefined}
                  longPressLabel={editable ? t("settings.org.changeRole") : undefined}
                />
              );
            })}
            {canManage ? (
              <ListRow
                icon="plus"
                title={t("settings.org.inviteMemberHeading")}
                subtitle={memberLimitReached ? t("settings.org.memberLimitReached", { count: memberLimit }) : undefined}
                disabled={memberLimitReached}
                onPress={() => router.push("/settings/invite-member")}
              />
            ) : null}
          </ListGroup>
        )}
      </View>

      {canManage && invitations.length > 0 ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("settings.org.pendingInvites")} />
          <ListGroup>
            {invitations.map((invitation) => (
              <ListRow
                key={invitation.id}
                icon="send"
                title={invitation.email}
                subtitle={t(`settings.org.roles.${invitation.role}`)}
                onPress={() => confirmCancelInvite(invitation)}
                onLongPress={() => confirmCancelInvite(invitation)}
                longPressLabel={t("settings.org.cancelInvite")}
              />
            ))}
          </ListGroup>
        </View>
      ) : null}

      {role === "owner" ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("settings.org.dangerZoneHeading")} />
          <ListGroup>
            <ListRow
              icon="trash"
              tone="destructive"
              title={t("settings.org.deleteOrganization")}
              subtitle={
                subscriptionBlocksDelete
                  ? t("settings.org.cancelSubscriptionFirst")
                  : t("settings.org.deleteWarning", { name: org?.name ?? "" })
              }
              subtitleNumberOfLines={3}
              disabled={subscriptionBlocksDelete}
              onPress={confirmDelete}
            />
          </ListGroup>
        </View>
      ) : null}

      <OptionSheet
        visible={roleSheet !== null}
        title={roleSheet ? roleSheet.name || roleSheet.email : t("settings.org.changeRole")}
        options={[
          { value: "admin", label: t("settings.org.roles.admin") },
          { value: "member", label: t("settings.org.roles.member") },
          { value: "remove", label: t("settings.org.remove") },
        ]}
        selected={roleSheet ? [roleSheet.role] : []}
        onSelect={(value) => {
          const member = roleSheet;
          setRoleSheet(null);
          if (!member) return;
          if (value === "remove") confirmRemove(member);
          else if (value !== member.role) void run(() => updateMemberRole(orgId ?? "", member.id, value as OrgRole));
        }}
        onClose={() => setRoleSheet(null)}
      />
    </SettingsPage>
  );
}
