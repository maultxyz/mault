import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert } from "react-native";
import type { ShopCatalog } from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import {
  deleteShopCatalog,
  resetShopCatalogLink,
  shopCatalogsQueryOptions,
} from "@/features/business/api/shop-catalogs";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useActiveOrg } from "@/hooks/use-org";
import type { SettingsNotice } from "@/lib/interfaces/settings";

export function ShopCatalogsView() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const access = useQuery(businessAccessQueryOptions(orgId));
  const canManage = !!access.data?.canManageSettings;
  const locked = !!access.data?.isLocked;
  const list = useQuery(shopCatalogsQueryOptions(orgId, canManage));
  const [actionsFor, setActionsFor] = useState<ShopCatalog | null>(null);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);
  const catalogs = list.data ?? [];

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["business", "shop-catalogs", orgId] });
  const succeed = (text: string) => {
    setNotice({ tone: "success", text });
    AccessibilityInfo.announceForAccessibility(text);
  };
  const fail = (error: Error) => setNotice({ tone: "destructive", text: error.message });

  const showLink = (catalogGuid: string) => router.push({ pathname: "/business/shop-catalog-link", params: { guid: catalogGuid } });
  const openEditor = (catalog?: ShopCatalog) => {
    setNotice(null);
    router.push({ pathname: "/business/shop-catalog-edit", params: catalog ? { guid: catalog.guid } : {} });
  };

  const resetLink = useMutation({
    mutationFn: resetShopCatalogLink,
    onSuccess: (catalog) => {
      succeed(t("settings.shopCatalogs.linkReset"));
      showLink(catalog.guid);
    },
    onSettled: invalidate,
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: deleteShopCatalog,
    onSuccess: () => succeed(t("settings.shopCatalogs.deleted")),
    onSettled: invalidate,
    onError: fail,
  });

  const runAction = (action: string) => {
    const catalog = actionsFor;
    setActionsFor(null);
    if (!catalog) return;
    if (action === "link") showLink(catalog.guid);
    else if (action === "edit") openEditor(catalog);
    else if (action === "reset") {
      Alert.alert(t("settings.shopCatalogs.resetLinkConfirmTitle"), t("settings.shopCatalogs.resetLinkConfirmDescription"), [
        { text: t("settings.shopCatalogs.cancel"), style: "cancel" },
        { text: t("settings.shopCatalogs.resetLink"), style: "destructive", onPress: () => resetLink.mutate(catalog.guid) },
      ]);
    } else if (action === "delete") {
      Alert.alert(t("settings.shopCatalogs.deleteConfirmTitle"), t("settings.shopCatalogs.deleteConfirmDescription"), [
        { text: t("settings.shopCatalogs.cancel"), style: "cancel" },
        { text: t("settings.shopCatalogs.delete"), style: "destructive", onPress: () => remove.mutate(catalog.guid) },
      ]);
    }
  };

  const sourceSummary = (catalog: ShopCatalog) =>
    [...catalog.collections, ...catalog.storageLocations].map((source) => source.name).join(", ") ||
    t("settings.shopCatalogs.noLiveSources");

  if (access.data && !canManage) return <Callout tone="info" title={t("settings.shopCatalogs.managersOnly")} />;
  if (!canManage) return <ListSkeleton rows={2} hasSubtitle hasTrailing={false} />;

  return (
    <>
      {locked ? <Callout tone="info" title={t("settings.shopCatalogs.upgrade")} /> : null}
      {list.isError ? <Callout tone="destructive" title={t("settings.shopCatalogs.loadFailed")} /> : null}
      {notice ? <Callout tone={notice.tone} title={notice.text} /> : null}

      <SettingsSection title={t("settings.shopCatalogs.heading")} description={t("settings.shopCatalogs.description")}>
        {list.isLoading ? <ListSkeleton rows={2} hasSubtitle hasTrailing={false} /> : null}
        {list.data && catalogs.length === 0 ? <EmptyState icon="store" title={t("settings.shopCatalogs.empty")} /> : null}
        {!list.isLoading && (catalogs.length > 0 || !locked) ? (
          <ListGroup>
            {catalogs.map((catalog) => (
              <ListRow
                key={catalog.guid}
                icon="store"
                title={catalog.name}
                subtitle={[
                  sourceSummary(catalog),
                  catalog.isPublic ? t("settings.shopCatalogs.publicBadge") : null,
                  catalog.showsPrices ? null : t("settings.shopCatalogs.pricesHidden"),
                  catalog.allowsReservations ? t("settings.shopCatalogs.reservationsOn") : null,
                ]
                  .filter(Boolean)
                  .join("\n")}
                subtitleNumberOfLines={4}
                onPress={() => showLink(catalog.guid)}
                onLongPress={() => setActionsFor(catalog)}
                longPressLabel={t("settings.shopCatalogs.actions")}
              />
            ))}
            {!locked ? <ListRow icon="plus" title={t("settings.shopCatalogs.add")} onPress={() => openEditor()} /> : null}
          </ListGroup>
        ) : null}
      </SettingsSection>

      <OptionSheet
        visible={!!actionsFor}
        title={actionsFor?.name ?? t("settings.shopCatalogs.actions")}
        options={[
          { value: "link", label: t("settings.shopCatalogs.showLink") },
          ...(locked ? [] : [{ value: "edit", label: t("settings.shopCatalogs.edit") }]),
          ...(actionsFor?.isPublic ? [] : [{ value: "reset", label: t("settings.shopCatalogs.resetLink") }]),
          { value: "delete", label: t("settings.shopCatalogs.delete") },
        ]}
        selected={[]}
        onSelect={runAction}
        onClose={() => setActionsFor(null)}
      />
    </>
  );
}
