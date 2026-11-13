import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { cardGameCountsQueryOptions, dumpCatalogCards } from "@/features/admin/api/cards-database";
import { syncStatusQueryOptions } from "@/features/admin/api/cards-sync";
import { CardsTypedConfirmPanel } from "@/features/admin/components/cards-typed-confirm-panel";
import { ADMIN_CARDS_QUERY_KEY, ADMIN_DELETE_CONFIRM_KEYWORD, ADMIN_DUMP_ALL_GAMES_SCOPE } from "@/lib/constants/admin-cards";
import { SPACING } from "@/lib/constants/theme";

export function CardsDumpPanel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const gameCounts = useQuery(cardGameCountsQueryOptions);
  const syncStatus = useQuery(syncStatusQueryOptions);
  const [scope, setScope] = useState<string>(ADMIN_DUMP_ALL_GAMES_SCOPE);
  const [scopeSheetOpen, setScopeSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const isSyncRunning = syncStatus.data?.status === "running";

  const dump = useMutation({
    mutationFn: () => dumpCatalogCards(scope === ADMIN_DUMP_ALL_GAMES_SCOPE ? null : scope),
    onMutate: () => setResultMessage(null),
    onSuccess: (message) => {
      setConfirming(false);
      setResultMessage(message);
      AccessibilityInfo.announceForAccessibility(message);
      void queryClient.invalidateQueries({ queryKey: ADMIN_CARDS_QUERY_KEY });
    },
  });

  const scopeLabel = (gameKey: string) => {
    if (gameKey === ADMIN_DUMP_ALL_GAMES_SCOPE) return t("admin.cards.dump.allGames");
    const count = gameCounts.data?.find((entry) => entry.gameKey === gameKey)?.count;
    return count != null ? `${gameKey} (${count})` : gameKey;
  };
  const scopeOptions = [ADMIN_DUMP_ALL_GAMES_SCOPE, ...(gameCounts.data ?? []).map((entry) => entry.gameKey)].map((value) => ({
    value,
    label: scopeLabel(value),
  }));

  if (confirming) {
    return (
      <View style={{ gap: SPACING.md }}>
        {dump.isError ? <Callout tone="destructive" title={t("admin.cards.dump.failed")} description={dump.error.message} /> : null}
        <CardsTypedConfirmPanel
          title={t("admin.cards.dump.confirmTitle")}
          description={
            scope === ADMIN_DUMP_ALL_GAMES_SCOPE ? t("admin.cards.dump.confirmAll") : t("admin.cards.dump.confirmScoped", { scope })
          }
          expectedText={ADMIN_DELETE_CONFIRM_KEYWORD}
          confirmLabel={t("admin.cards.dump.dumpButton")}
          isConfirming={dump.isPending}
          onConfirm={() => dump.mutate()}
          onCancel={() => {
            dump.reset();
            setConfirming(false);
          }}
        />
      </View>
    );
  }

  return (
    <Surface style={{ gap: SPACING.md }}>
      <View>
        <AppText heading weight="semibold" accessibilityRole="header">
          {t("admin.cards.dump.heading")}
        </AppText>
        <AppText size="xs" tone="secondary">
          {t("admin.cards.dump.description")}
        </AppText>
      </View>
      {resultMessage ? <Callout tone="success" title={resultMessage} /> : null}
      {isSyncRunning ? <Callout tone="info" title={t("admin.cards.dump.syncRunning")} /> : null}
      <SelectField
        label={t("admin.cards.dump.scopeLabel")}
        value={scopeLabel(scope)}
        placeholder={t("admin.cards.dump.scopePlaceholder")}
        onPress={() => setScopeSheetOpen(true)}
      />
      <Button
        variant="destructive"
        icon="trash"
        label={t("admin.cards.dump.dumpButton")}
        disabled={isSyncRunning}
        onPress={() => {
          setResultMessage(null);
          setConfirming(true);
        }}
      />
      <OptionSheet
        visible={scopeSheetOpen}
        title={t("admin.cards.dump.scopeLabel")}
        options={scopeOptions}
        selected={[scope]}
        onSelect={(value) => {
          setScopeSheetOpen(false);
          setScope(value);
        }}
        onClose={() => setScopeSheetOpen(false)}
      />
    </Surface>
  );
}
