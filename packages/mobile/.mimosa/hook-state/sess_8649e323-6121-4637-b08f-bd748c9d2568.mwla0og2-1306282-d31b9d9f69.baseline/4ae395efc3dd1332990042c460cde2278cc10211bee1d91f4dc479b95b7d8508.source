import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { organizationInviteFormSchema, type OrganizationInviteFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { billingQueryOptions } from "@/features/org/api/billing";
import { inviteMember } from "@/features/org/api/organization";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function InviteMemberScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const memberLimit = billing?.maxMembersPerOrg ?? null;
  const memberLimitReached = memberLimit != null && (billing?.memberCount ?? 0) >= memberLimit;
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const form = useForm<OrganizationInviteFormValues>({
    resolver: zodResolver(organizationInviteFormSchema),
    defaultValues: { email: "", role: "member" },
  });
  const role = form.watch("role");
  const invite = useMutation({
    mutationFn: (values: OrganizationInviteFormValues) => inviteMember(orgId ?? "", values.email.trim(), values.role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      await queryClient.invalidateQueries({ queryKey: billingQueryOptions(orgId).queryKey });
      router.back();
    },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("settings.org.inviteMemberHeading")} subtitle={org?.name} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            icon="plus"
            label={t("settings.org.invite")}
            loading={invite.isPending}
            disabled={memberLimitReached}
            onPress={form.handleSubmit((values) => invite.mutate(values))}
          />
        }
      >
        {memberLimitReached ? (
          <Callout tone="info" title={t("settings.org.memberLimitReached", { count: memberLimit })} />
        ) : null}
        {invite.isError ? <Callout tone="destructive" title={t("settings.org.failed")} /> : null}
        <Controller
          control={form.control}
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
              textContentType="emailAddress"
              returnKeyType="done"
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
        <SelectField
          label={t("settings.org.role")}
          value={t(`settings.org.roles.${role}`)}
          placeholder={t("settings.org.role")}
          onPress={() => setRoleSheetOpen(true)}
        />
      </PinnedActionsLayout>
      <OptionSheet
        visible={roleSheetOpen}
        title={t("settings.org.role")}
        options={[
          { value: "member", label: t("settings.org.roles.member") },
          { value: "admin", label: t("settings.org.roles.admin") },
        ]}
        selected={[role]}
        onSelect={(value) => {
          setRoleSheetOpen(false);
          form.setValue("role", value as OrganizationInviteFormValues["role"]);
        }}
        onClose={() => setRoleSheetOpen(false)}
      />
    </View>
  );
}
