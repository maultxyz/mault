import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { billingQueryOptions } from "@/features/org/api/billing";
import {
  cancelInvitation,
  deleteOrganization,
  inviteMember,
  organizationQueryOptions,
  removeMember,
  renameOrganization,
  updateMemberRole,
} from "@/features/org/api/organization";
import { inviteMemberSchema, renameOrgSchema } from "@/features/org/lib/org-schemas";
import { useActiveOrg } from "@/hooks/use-org";
import { refreshOrganizations, useSession } from "@/lib/auth/session";
import { SPACING } from "@/lib/constants/theme";
import type { InviteMemberValues, RenameOrgValues } from "@/lib/interfaces/forms";
import type { OrgMember, OrgRole } from "@/lib/interfaces/settings";

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
  const [inviteRoleOpen, setInviteRoleOpen] = useState(false);
  const [error, setError] = useState(false);
  const subscriptionBlocksDelete = billing?.plan === "business" && !billing.cancelAtPeriodEnd;

  const renameForm = useForm<RenameOrgValues>({
    resolver: zodResolver(renameOrgSchema),
    values: { name: details.data?.name ?? org?.name ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const inviteForm = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  });
  const inviteRole = inviteForm.watch("role");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
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

  return (
    <Screen
      refreshing={details.isRefetching}
      onRefresh={() => void details.refetch()}
      header={<PageHeader title={t("settings.sections.organization.title")} subtitle={org?.name} onBack={() => router.back()} />}
    >
      {error || details.isError ? <Callout tone="destructive" title={t("settings.org.failed")} /> : null}

      {canManage && details.data?.canRename ? (
        <Surface style={{ gap: SPACING.md }}>
          <AppText heading weight="semibold">
            {t("settings.org.renameHeading", { name: org?.name ?? "" })}
          </AppText>
          <Controller
            control={renameForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label={t("settings.org.nameLabel")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={fieldState.error ? t("collections.validation.name") : undefined}
              />
            )}
          />
          <Button
            label={t("settings.org.rename")}
            disabled={!renameForm.formState.isDirty}
            loading={mutate.isPending}
            onPress={renameForm.handleSubmit((values) =>
              run(async () => {
                await renameOrganization(orgId ?? "", values.name.trim());
                renameForm.reset({ name: values.name.trim() });
                await refreshOrganizations();
              }),
            )}
          />
        </Surface>
      ) : null}

      <Surface style={{ gap: SPACING.sm }}>
        <AppText heading weight="semibold">
          {t("settings.org.membersHeading")}
        </AppText>
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
                />
              );
            })}
          </ListGroup>
        )}
      </Surface>

      {canManage ? (
        <Surface style={{ gap: SPACING.md }}>
          <AppText heading weight="semibold">
            {t("settings.org.inviteMemberHeading")}
          </AppText>
          <Controller
            control={inviteForm.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label={t("settings.org.emailLabel")}
                placeholder={t("settings.org.emailPlaceholder")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                error={fieldState.error ? t("settings.org.invalidEmail") : undefined}
              />
            )}
          />
          <SelectField
            label={t("settings.org.role")}
            value={t(`settings.org.roles.${inviteRole}`)}
            placeholder={t("settings.org.role")}
            onPress={() => setInviteRoleOpen(true)}
          />
          <Button
            icon="plus"
            label={t("settings.org.invite")}
            loading={mutate.isPending}
            onPress={inviteForm.handleSubmit((values) =>
              run(async () => {
                await inviteMember(orgId ?? "", values.email.trim(), values.role);
                inviteForm.reset({ email: "", role: values.role });
              }),
            )}
          />
          <View style={{ gap: SPACING.xs }}>
            <AppText size="xs" tone="secondary">
              {t("settings.org.pendingInvites")}
            </AppText>
            {(details.data?.invitations ?? []).length === 0 ? (
              <AppText size="xs" tone="secondary">
                {t("settings.org.noInvites")}
              </AppText>
            ) : (
              <ListGroup>
                {(details.data?.invitations ?? []).map((invitation) => (
                  <ListRow
                    key={invitation.id}
                    title={invitation.email}
                    subtitle={t(`settings.org.roles.${invitation.role}`)}
                    right={
                      <Button
                        size="sm"
                        variant="ghost"
                        label={t("settings.org.cancelInvite")}
                        onPress={() => void run(() => cancelInvitation(invitation.id))}
                      />
                    }
                  />
                ))}
              </ListGroup>
            )}
          </View>
        </Surface>
      ) : null}

      {role === "owner" ? (
        <Surface style={{ gap: SPACING.md }}>
          <AppText heading weight="semibold">
            {t("settings.org.dangerZoneHeading")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {subscriptionBlocksDelete
              ? t("settings.org.cancelSubscriptionFirst")
              : t("settings.org.deleteWarning", { name: org?.name ?? "" })}
          </AppText>
          <Button
            variant="destructive"
            icon="trash"
            label={t("settings.org.deleteOrganization")}
            disabled={subscriptionBlocksDelete}
            onPress={confirmDelete}
          />
        </Surface>
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
      <OptionSheet
        visible={inviteRoleOpen}
        title={t("settings.org.role")}
        options={[
          { value: "member", label: t("settings.org.roles.member") },
          { value: "admin", label: t("settings.org.roles.admin") },
        ]}
        selected={[inviteRole]}
        onSelect={(value) => {
          setInviteRoleOpen(false);
          inviteForm.setValue("role", value as InviteMemberValues["role"]);
        }}
        onClose={() => setInviteRoleOpen(false)}
      />
    </Screen>
  );
}
