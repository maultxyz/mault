import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, View } from "react-native";
import { CardRow } from "@/components/cards/card-row";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { ListGroup } from "@/components/ui/list-group";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteStorageLocation,
  storageLocationCardsQueryOptions,
  storageLocationsQueryOptions,
} from "@/features/storage/api/storage";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { absoluteUrl } from "@/lib/url";

export default function StorageLocationScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const pricing = usePricing();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: locations } = useQuery(storageLocationsQueryOptions(orgId));
  const location = locations?.find((l) => l.guid === guid);
  const cards = useQuery(storageLocationCardsQueryOptions(guid));
  const remove = useMutation({
    mutationFn: () => deleteStorageLocation(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      router.back();
    },
  });

  const runAction = (action: string) => {
    setMenuOpen(false);
    if (action === "rename") {
      router.push({ pathname: "/storage-name", params: { guid, name: location?.name ?? "" } });
      return;
    }
    Alert.alert(t("storage.deleteTitle", { name: location?.name ?? "" }), t("storage.deleteDescription"), [
      { text: t("storage.cancel"), style: "cancel" },
      { text: t("storage.delete"), style: "destructive", onPress: () => remove.mutate() },
    ]);
  };

  return (
    <Screen
      refreshing={cards.isRefetching}
      onRefresh={() => void cards.refetch()}
      header={
        <PageHeader
          title={location?.name ?? t("storage.title")}
          subtitle={
            location ? t("storage.summary", { count: location.cardCount, value: pricing.format(location.totalValue) }) : null
          }
          onBack={() => router.back()}
          actions={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("storage.actions")}
              hitSlop={SPACING.sm}
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: RADIUS.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? colors.muted : "transparent",
              })}
            >
              <Icon name="more" size={18} color={colors.foreground} />
            </Pressable>
          }
        />
      }
    >
      {remove.isError ? <Callout tone="destructive" title={t("storage.actionFailed")} /> : null}
      {cards.isPending ? (
        <View style={{ gap: SPACING.sm }}>
          <Skeleton height={61} />
          <Skeleton height={61} />
        </View>
      ) : (cards.data ?? []).length === 0 ? (
        <EmptyState icon="collections" title={t("storage.noCardsTitle")} />
      ) : (
        <ListGroup>
          {(cards.data ?? []).map((entry) => {
            const value = pricing.priceOf(entry.card, entry.isFoil, entry.condition);
            return (
              <CardRow
                key={entry.scanId}
                name={entry.card.name}
                subtitle={`${t("storage.position", { position: entry.position })} · ${entry.collectionName}`}
                imageUrl={absoluteUrl(entry.card.image?.small)}
                price={value != null ? pricing.format(value) : null}
                lowConfidence={entry.lowConfidenceMatch && !entry.reviewed}
                onPress={() =>
                  router.push({ pathname: "/card/[scanId]", params: { scanId: entry.scanId, guid: entry.collectionGuid } })
                }
              />
            );
          })}
        </ListGroup>
      )}
      <OptionSheet
        visible={menuOpen}
        title={location?.name ?? t("storage.actions")}
        options={[
          { value: "rename", label: t("storage.rename") },
          { value: "delete", label: t("storage.delete") },
        ]}
        selected={[]}
        onSelect={runAction}
        onClose={() => setMenuOpen(false)}
      />
    </Screen>
  );
}
