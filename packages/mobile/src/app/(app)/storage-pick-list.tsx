import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { storagePickListRows } from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoragePickList } from "@/features/storage/api/use-storage-pick-list";
import { StoragePickListForm } from "@/features/storage/components/storage-pick-list-form";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { absoluteUrl } from "@/lib/url";

export default function StoragePickListScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const pickList = useStoragePickList();
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasList = pickList.entries.length > 0;
  const showForm = !hasList || isEditing;
  const rows = useMemo(
    () => storagePickListRows(pickList.lines, pickList.cards, pickList.pickedScanIds),
    [pickList.lines, pickList.cards, pickList.pickedScanIds],
  );
  const pickedFraction = pickList.cards.length > 0 ? pickList.pickedCount / pickList.cards.length : 0;

  const confirmFinish = () =>
    Alert.alert(
      t("storage.pickList.finishTitle", { count: pickList.pickedCount }),
      t("storage.pickList.finishDescription"),
      [
        { text: t("storage.cancel"), style: "cancel" },
        { text: t("storage.pickList.finishConfirm"), style: "destructive", onPress: pickList.finish },
      ],
    );

  const runAction = (action: string) => {
    setMenuOpen(false);
    if (action === "edit") setIsEditing(true);
    else if (action === "clear") pickList.clear();
    else if (action === "finish") confirmFinish();
  };

  const header = (
    <PageHeader
      title={t("storage.pickList.title")}
      subtitle={t("storage.pickList.description")}
      onBack={() => router.back()}
      actions={
        showForm ? null : (
          <IconButton icon="more" accessibilityLabel={t("storage.pickList.moreActions")} onPress={() => setMenuOpen(true)} />
        )
      }
    />
  );

  if (showForm) {
    return (
      <Screen header={header}>
        <StoragePickListForm
          initialDecklist={pickList.decklist}
          onSubmit={(decklist) => {
            pickList.setDecklist(decklist);
            setIsEditing(false);
          }}
          onCancel={hasList ? () => setIsEditing(false) : undefined}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} header={header}>
      <FlatList
        style={{ marginHorizontal: -SPACING.sm }}
        data={pickList.cards.length > 0 ? rows : []}
        keyExtractor={(row) => (row.kind === "card" ? row.entry.scanId : `missing-${row.line.name}`)}
        contentContainerStyle={{ paddingBottom: SPACING.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={pickList.refetch}
            tintColor={colors.primaryText}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: SPACING.md, paddingHorizontal: SPACING.sm, paddingBottom: SPACING.lg }}>
            <Button
              icon="camera"
              label={t("storage.pickList.scan.button")}
              disabled={pickList.cards.length === pickList.pickedCount}
              onPress={() => router.push("/storage-card-scan")}
            />
            {pickList.cards.length > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
                <AppText size="xs" tone="secondary" style={{ fontVariant: ["tabular-nums"] }}>
                  {t("storage.pickList.progress", { picked: pickList.pickedCount, total: pickList.cards.length })}
                </AppText>
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: pickList.cards.length, now: pickList.pickedCount }}
                  style={{ flex: 1, height: 6, borderRadius: RADIUS.full, backgroundColor: colors.muted, overflow: "hidden" }}
                >
                  <View
                    style={{ width: `${Math.round(pickedFraction * 100)}%`, height: "100%", backgroundColor: colors.primary }}
                  />
                </View>
              </View>
            ) : null}
            {pickList.finishFailed ? <Callout tone="destructive" title={t("storage.pickList.finishFailed")} /> : null}
            {pickList.isError ? <Callout tone="destructive" title={t("storage.pickList.loadFailed")} /> : null}
          </View>
        }
        ListEmptyComponent={
          pickList.isLoading ? (
            <View style={{ gap: SPACING.sm, paddingHorizontal: SPACING.sm }}>
              <Skeleton height={61} />
              <Skeleton height={61} />
            </View>
          ) : (
            <EmptyState
              icon="storage"
              title={t("storage.pickList.emptyTitle")}
              description={t("storage.pickList.emptyDescription")}
            />
          )
        }
        renderItem={({ item: row }) =>
          row.kind === "missing" ? (
            <CardRow
              name={row.line.name}
              subtitle={t("storage.pickList.missingCount", { count: row.missingCount })}
              imageUrl={null}
            />
          ) : (
            <CardRow
              name={row.entry.card.name}
              subtitle={`${row.entry.locationName} · ${t("storage.position", { position: row.entry.position })} · ${row.entry.card.setName}`}
              imageUrl={absoluteUrl(row.entry.card.image?.small)}
              checked={row.isPicked}
              onPress={() => pickList.setPicked(row.entry.scanId, !row.isPicked)}
            />
          )
        }
      />
      <OptionSheet
        visible={menuOpen}
        title={t("storage.pickList.title")}
        options={[
          { value: "edit", label: t("storage.pickList.editList") },
          { value: "clear", label: t("storage.pickList.clear") },
          ...(pickList.pickedCount > 0 && !pickList.isFinishing
            ? [{ value: "finish", label: t("storage.pickList.finish") }]
            : []),
        ]}
        selected={[]}
        onSelect={runAction}
        onClose={() => setMenuOpen(false)}
      />
    </Screen>
  );
}
