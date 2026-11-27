import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SecretReveal } from "@/features/integrations/components/secret-reveal";
import { generateStatsSyncKey, statsSyncKeyQueryOptions } from "@/features/integrations/api/stats-sync";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";

export default function NewStatsSyncKeyScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const keyOptions = statsSyncKeyQueryOptions(org?.id ?? null);
  const { data: status } = useQuery(keyOptions);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const replacesKey = !!status?.key;
  const generate = useMutation({
    mutationFn: generateStatsSyncKey,
    onSuccess: (created) => {
      setRawKey(created.rawKey);
      queryClient.setQueryData(keyOptions.queryKey, created.status);
      AccessibilityInfo.announceForAccessibility(t("settings.statsSync.key.revealTitle"));
    },
  });

  if (rawKey) {
    return (
      <SecretReveal
        title={t("settings.statsSync.key.revealTitle")}
        subtitle={org?.name}
        description={t("settings.statsSync.key.revealDescription")}
        secret={rawKey}
        copyLabel={t("settings.statsSync.key.copy")}
        copiedLabel={t("settings.statsSync.key.copied")}
        copyFailedLabel={t("settings.statsSync.key.copyFailed")}
        shareLabel={t("settings.statsSync.key.share")}
        doneLabel={t("settings.statsSync.key.revealDone")}
      />
    );
  }

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={replacesKey ? t("settings.statsSync.key.regenerateConfirmTitle") : t("settings.statsSync.key.generateTitle")}
        subtitle={org?.name}
      />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={replacesKey ? t("settings.statsSync.key.regenerate") : t("settings.statsSync.key.generate")}
            loading={generate.isPending}
            onPress={() => generate.mutate()}
          />
        }
      >
        {generate.isError ? <Callout tone="destructive" title={t("settings.statsSync.key.generateFailed")} /> : null}
        <AppText size="sm" tone="secondary">
          {replacesKey ? t("settings.statsSync.key.regenerateConfirmDescription") : t("settings.statsSync.key.description")}
        </AppText>
      </PinnedActionsLayout>
    </View>
  );
}
