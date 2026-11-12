import { router } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import { STORAGE_VERIFY_CARDS_MAX, storagePickListRows } from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorageVerify } from "@/features/storage/api/use-storage-verify";
import { useTheme } from "@/hooks/use-theme";
import { absoluteUrl } from "@/lib/url";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { StorageLocationVerifyProps } from "@/lib/interfaces/storage";

export function StorageLocationVerify({ location }: StorageLocationVerifyProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const verify = useStorageVerify(location.guid);
  const rows = useMemo(
    () => storagePickListRows([], verify.cards, verify.verifiedScanIds),
    [verify.cards, verify.verifiedScanIds],
  );
  const total = verify.cards.length;
  const verifiedFraction = total > 0 ? verify.verifiedCount / total : 0;
  const hasProgress = verify.verifiedCount > 0 || verify.notInLocation.length > 0;

  if (verify.isLoading) {
    return (
      <View style={{ gap: SPACING.sm, paddingTop: SPACING.md }}>
        <Skeleton height={61} />
        <Skeleton height={61} />
      </View>
    );
  }
  if (verify.isError) return <Callout tone="destructive" title={t("storage.verify.loadFailed")} />;
  if (total === 0) {
    return (
      <EmptyState
        icon="storage"
        title={t("storage.verify.emptyTitle")}
        description={t("storage.verify.emptyDescription")}
      />
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => (row.kind === "card" ? row.entry.scanId : row.line.name)}
      contentContainerStyle={{ paddingBottom: SPACING.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={verify.refetch}
          tintColor={colors.primaryText}
          colors={[colors.primary]}
          progressBackgroundColor={colors.card}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: SPACING.md, paddingVertical: SPACING.md }}>
          <AppText size="sm" tone="secondary">
            {t("storage.verify.description")}
          </AppText>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button
              style={{ flex: 1 }}
              icon="camera"
              label={t("storage.verify.scan.button")}
              onPress={() => router.push({ pathname: "/storage-card-scan", params: { verifyGuid: location.guid } })}
            />
            <Button
              style={{ flex: 1 }}
              variant="secondary"
              label={t("storage.verify.startOver")}
              disabled={!hasProgress}
              onPress={verify.startOver}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
              {t("storage.verify.progress", { verified: verify.verifiedCount, total })}
            </AppText>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: total, now: verify.verifiedCount }}
              style={{ flex: 1, height: 6, borderRadius: RADIUS.full, backgroundColor: colors.muted, overflow: "hidden" }}
            >
              <View
                style={{ width: `${Math.round(verifiedFraction * 100)}%`, height: "100%", backgroundColor: colors.primary }}
              />
            </View>
          </View>
          {verify.isTruncated ? (
            <Callout tone="warning" title={t("storage.verify.truncated", { max: STORAGE_VERIFY_CARDS_MAX })} />
          ) : null}
          {verify.verifiedCount >= total ? <Callout tone="success" title={t("storage.verify.complete")} /> : null}
          {verify.notInLocation.length > 0 ? (
            <Callout
              tone="warning"
              title={t("storage.verify.notInLocationTitle")}
              description={`${t("storage.verify.notInLocationDescription")}\n${verify.notInLocation
                .map(({ name, count }) => (count > 1 ? `${count} ${name}` : name))
                .join(", ")}`}
            />
          ) : null}
        </View>
      }
      renderItem={({ item: row }) =>
        row.kind === "card" ? (
          <CardRow
            name={row.entry.card.name}
            subtitle={`${t("storage.position", { position: row.entry.position })} · ${row.entry.card.setName}`}
            imageUrl={absoluteUrl(row.entry.card.image?.small)}
            checked={row.isPicked}
            onPress={() => verify.setVerified(row.entry.scanId, !row.isPicked)}
          />
        ) : null
      }
    />
  );
}
