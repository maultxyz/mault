import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Share, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { Surface } from "@/components/ui/surface";
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
      <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
        <PageHeader title={t("settings.statsSync.key.revealTitle")} subtitle={org?.name} />
        <PinnedActionsLayout
          actions={
            <>
              <Button size="lg" icon="share" label={t("settings.statsSync.key.share")} onPress={() => void Share.share({ message: rawKey })} />
              <Button variant="secondary" label={t("settings.statsSync.key.revealDone")} onPress={() => router.back()} />
            </>
          }
        >
          <AppText size="sm" tone="secondary">
            {t("settings.statsSync.key.revealDescription")}
          </AppText>
          <Surface>
            <AppText mono selectable>
              {rawKey}
            </AppText>
          </Surface>
        </PinnedActionsLayout>
      </View>
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
