import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SYNC_VECTORIZE_CONCURRENCY_DEFAULT, SYNC_VECTORIZE_CONCURRENCY_OPTIONS, type SyncState, type SyncStatus } from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { cancelCardSync, startCardSync, syncSourcesQueryOptions, syncStatusQueryOptions } from "@/features/admin/api/cards-sync";
import { computeCardSyncProgress, formatSyncDuration } from "@/features/admin/api/cards-sync-progress";
import { CardsProgressBar } from "@/features/admin/components/cards-progress-bar";
import { CardsSyncByIdPanel } from "@/features/admin/components/cards-sync-by-id-panel";
import { CardsSyncSourceFields } from "@/features/admin/components/cards-sync-source-fields";
import { useTheme } from "@/hooks/use-theme";
import { ADMIN_DEFAULT_SYNC_LANGUAGE, ADMIN_SYNC_LOG_VISIBLE_LINES, CARD_SYNC_STATUS_TONES } from "@/lib/constants/admin-cards";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CardsSyncSourceSelection } from "@/lib/interfaces/admin-cards";

export function CardsSyncPanel() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const sources = useQuery(syncSourcesQueryOptions);
  const syncStatus = useQuery(syncStatusQueryOptions);
  const [selection, setSelection] = useState<CardsSyncSourceSelection>({ gameKey: null, lang: ADMIN_DEFAULT_SYNC_LANGUAGE });
  const [forceResync, setForceResync] = useState(false);
  const [concurrency, setConcurrency] = useState<number>(SYNC_VECTORIZE_CONCURRENCY_DEFAULT);
  const [concurrencySheetOpen, setConcurrencySheetOpen] = useState(false);
  const announcedStatusRef = useRef<SyncStatus | null>(null);

  const storeSyncState = (next: SyncState) => queryClient.setQueryData(syncStatusQueryOptions.queryKey, next);
  const start = useMutation({ mutationFn: startCardSync, onSuccess: storeSyncState });
  const cancel = useMutation({ mutationFn: cancelCardSync, onSuccess: storeSyncState });

  const syncState = syncStatus.data;
  const status = syncState?.status ?? "idle";
  const isRunning = status === "running";
  const statusLabel = t(`admin.cards.sync.status.${status}`);

  useEffect(() => {
    if (!syncState) return;
    if (announcedStatusRef.current !== null && announcedStatusRef.current !== syncState.status) {
      AccessibilityInfo.announceForAccessibility(t("admin.cards.sync.statusAnnouncement", { status: t(`admin.cards.sync.status.${syncState.status}`) }));
    }
    announcedStatusRef.current = syncState.status;
  }, [syncState, t]);

  if (syncStatus.isLoading || sources.isLoading) return <PageSkeleton />;

  const runningSourceLabel = syncState
    ? `${sources.data?.find((source) => source.gameKey === syncState.gameKey)?.label ?? syncState.gameKey}${
        syncState.lang !== ADMIN_DEFAULT_SYNC_LANGUAGE ? ` (${LANGUAGE_LABELS[syncState.lang] ?? syncState.lang})` : ""
      }`
    : "";
  const progress = syncState ? computeCardSyncProgress(syncState, syncStatus.dataUpdatedAt) : null;
  const visibleLogLines = (syncState?.logs ?? []).slice(-ADMIN_SYNC_LOG_VISIBLE_LINES).reverse();
  const mutationError = start.error ?? cancel.error;

  return (
    <View style={{ gap: SPACING.lg }}>
      <Surface style={{ gap: SPACING.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}>
          <AppText heading weight="semibold" accessibilityRole="header" style={{ flexShrink: 1 }}>
            {t("admin.cards.sync.heading")}
          </AppText>
          <View accessible accessibilityLabel={t("admin.cards.sync.statusLabel", { status: statusLabel })} accessibilityLiveRegion="polite">
            <Pill label={statusLabel} tone={CARD_SYNC_STATUS_TONES[status]} />
          </View>
        </View>
        {isRunning ? (
          <AppText size="xs" tone="secondary">
            {t("admin.cards.sync.runningFor", { source: runningSourceLabel })}
          </AppText>
        ) : null}
        {syncStatus.isError ? <Callout tone="destructive" title={t("admin.cards.sync.loadFailed")} /> : null}
        {mutationError ? (
          <Callout tone="destructive" title={t(start.error ? "admin.cards.sync.startFailed" : "admin.cards.sync.cancelFailed")} description={mutationError.message} />
        ) : null}
        {isRunning && progress?.isBrowserJob ? <Callout tone="info" title={t("admin.cards.sync.browserJobRunning")} /> : null}

        {isRunning ? (
          <Button
            variant="secondary"
            label={cancel.isPending ? t("admin.cards.sync.cancelling") : t("admin.cards.cancel")}
            disabled={cancel.isPending}
            onPress={() => cancel.mutate()}
          />
        ) : (
          <>
            <CardsSyncSourceFields sources={sources.data ?? []} selection={selection} onChange={setSelection} />
            <SwitchRow title={t("admin.cards.sync.forceResyncLabel")} value={forceResync} onValueChange={setForceResync} />
            <View style={{ gap: SPACING.xs }}>
              <SelectField
                label={t("admin.cards.sync.concurrencyLabel")}
                value={String(concurrency)}
                placeholder={String(SYNC_VECTORIZE_CONCURRENCY_DEFAULT)}
                onPress={() => setConcurrencySheetOpen(true)}
              />
              <AppText size="xs" tone="secondary">
                {t("admin.cards.sync.concurrencyDescription")}
              </AppText>
            </View>
            <Button
              label={start.isPending ? t("admin.cards.sync.starting") : t("admin.cards.sync.startButton")}
              loading={start.isPending}
              disabled={!selection.gameKey || start.isPending}
              onPress={() => {
                if (!selection.gameKey) return;
                start.mutate({ gameKey: selection.gameKey, lang: selection.lang, forceResync, concurrency });
              }}
            />
          </>
        )}

        {syncState && progress && progress.total > 0 ? (
          <View style={{ gap: SPACING.xs + 2 }}>
            <CardsProgressBar accessibilityLabel={t("admin.cards.sync.progressLabel")} done={progress.done} total={progress.total} />
            <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
              {[
                t("admin.cards.sync.progressCount", { done: progress.done, total: progress.total }),
                progress.isBrowserJob
                  ? t("admin.cards.sync.savedCount", { count: syncState.processed })
                  : t("admin.cards.sync.vectorizedCount", { count: syncState.processed }),
                syncState.queued > 0 ? t("admin.cards.sync.queuedCount", { count: syncState.queued }) : null,
                t("admin.cards.sync.skippedCount", { count: syncState.skipped }),
                isRunning && progress.etaMs !== null
                  ? t("admin.cards.sync.etaRemaining", { duration: formatSyncDuration(progress.etaMs) })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
            {syncState.errors > 0 ? (
              <AppText size="xs" tone="destructive">
                {t("admin.cards.sync.errorsCount", { count: syncState.errors })}
              </AppText>
            ) : null}
            {isRunning && syncState.currentCard ? (
              <AppText size="xs" tone="secondary" numberOfLines={1}>
                {syncState.currentCard}
              </AppText>
            ) : null}
          </View>
        ) : null}

        {syncState?.printingMarksTotal ? (
          <View style={{ gap: SPACING.xs + 2 }}>
            <CardsProgressBar
              accessibilityLabel={t("admin.cards.sync.printingMarksLabel")}
              done={syncState.printingMarksDone ?? 0}
              total={syncState.printingMarksTotal}
            />
            <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
              {t("admin.cards.sync.printingMarksCount", { done: syncState.printingMarksDone ?? 0, total: syncState.printingMarksTotal })}
            </AppText>
            {syncState.printingMarksFailed ? (
              <AppText size="xs" tone="destructive">
                {t("admin.cards.sync.errorsCount", { count: syncState.printingMarksFailed })}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Surface>

      <Surface style={{ gap: SPACING.sm }}>
        <View>
          <AppText weight="semibold" accessibilityRole="header">
            {t("admin.cards.sync.logHeading")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("admin.cards.sync.logDescription", { count: ADMIN_SYNC_LOG_VISIBLE_LINES })}
          </AppText>
        </View>
        <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted, gap: 2 }}>
          {visibleLogLines.length > 0 ? (
            visibleLogLines.map((line, index) => (
              <AppText key={`${index}-${line}`} size="2xs" mono tone="secondary" selectable>
                {line}
              </AppText>
            ))
          ) : (
            <AppText size="2xs" mono tone="secondary">
              {t("admin.cards.sync.logEmpty")}
            </AppText>
          )}
        </View>
      </Surface>

      <CardsSyncByIdPanel sources={sources.data ?? []} />

      <OptionSheet
        visible={concurrencySheetOpen}
        title={t("admin.cards.sync.concurrencyLabel")}
        options={SYNC_VECTORIZE_CONCURRENCY_OPTIONS.map((option) => ({ value: String(option), label: String(option) }))}
        selected={[String(concurrency)]}
        onSelect={(value) => {
          setConcurrencySheetOpen(false);
          const next = SYNC_VECTORIZE_CONCURRENCY_OPTIONS.find((option) => String(option) === value);
          if (next !== undefined) setConcurrency(next);
        }}
        onClose={() => setConcurrencySheetOpen(false)}
      />
    </View>
  );
}
