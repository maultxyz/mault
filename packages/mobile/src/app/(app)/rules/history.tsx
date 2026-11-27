import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast-provider";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { binSetHistoryQueryOptions, revertBinSet } from "@/features/rules/api/bin-sets";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { useActiveOrgId } from "@/hooks/use-org";
import { formatDateTime } from "@/lib/dates";
import type { BinSetHistoryEntry } from "@/lib/interfaces/rules";

export default function PresetHistoryScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const { showToast } = useToast();
  const { activeSet } = useRulesData();
  const historyOptions = binSetHistoryQueryOptions(activeSet?.guid);
  const history = useQuery(historyOptions);
  const revert = useMutation({
    mutationFn: (entry: BinSetHistoryEntry) => revertBinSet(entry.guid),
    onSuccess: (next) => {
      queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, next);
      void queryClient.invalidateQueries({ queryKey: historyOptions.queryKey });
      showToast({ message: t("rules.history.reverted"), tone: "success" });
      router.back();
    },
  });

  const confirmRevert = (entry: BinSetHistoryEntry) =>
    Alert.alert(
      t("rules.history.revertTitle"),
      t("rules.history.revertDescription", { date: formatDateTime(entry.createdAt, i18n.language) }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("rules.history.revert"), style: "destructive", onPress: () => revert.mutate(entry) },
      ],
    );

  return (
    <Screen
      onRefresh={() => history.refetch()}
      header={<PageHeader title={t("rules.history.title")} subtitle={activeSet?.name} onBack={() => router.back()} />}
    >
      <AppText size="sm" tone="secondary">
        {t("rules.history.description")}
      </AppText>
      {revert.isError ? <Callout tone="destructive" title={t("rules.history.revertFailed")} /> : null}
      {history.isError && !history.data ? (
        <QueryErrorState
          title={t("rules.loadFailed")}
          onRetry={() => void history.refetch()}
          isRetrying={history.isRefetching}
        />
      ) : history.isPending ? (
        <ListSkeleton leading="none" hasSubtitle />
      ) : history.data.length === 0 ? (
        <EmptyState icon="clock" title={t("rules.history.emptyTitle")} description={t("rules.history.emptyDescription")} />
      ) : (
        <ListGroup>
          {history.data.map((entry) => (
            <ListRow
              key={entry.guid}
              icon="clock"
              title={formatDateTime(entry.createdAt, i18n.language)}
              subtitle={t("rules.history.binCount", { count: entry.snapshot.length })}
              accessibilityHint={t("rules.history.revert")}
              disabled={revert.isPending}
              onPress={() => confirmRevert(entry)}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
