import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import { SHOP_PHOTO_MAX_UPLOAD_BYTES, SHOP_PHOTO_MIME_TYPES, type ShopCatalog } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import {
  deleteShopCatalog,
  removeShopPhoto,
  resetShopCatalogLink,
  shopCatalogsQueryOptions,
  shopPhotoQueryOptions,
  uploadShopPhoto,
} from "@/features/business/api/shop-catalogs";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { SHOP_PHOTO_PREVIEW_HEIGHT, SHOP_PHOTO_PREVIEW_WIDTH } from "@/lib/constants/shop-catalogs";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { SettingsNotice } from "@/lib/interfaces/settings";

export default function ShopCatalogsSettingsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const access = useQuery(businessAccessQueryOptions(orgId));
  const canManage = !!access.data?.canManageSettings;
  const locked = !!access.data?.isLocked;
  const list = useQuery(shopCatalogsQueryOptions(orgId, canManage));
  const photo = useQuery(shopPhotoQueryOptions(orgId, canManage));
  const [actionsFor, setActionsFor] = useState<ShopCatalog | null>(null);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);
  const catalogs = list.data ?? [];

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["business", "shop-catalogs", orgId] });
  const succeed = (text: string) => {
    setNotice({ tone: "success", text });
    AccessibilityInfo.announceForAccessibility(text);
  };
  const fail = (error: Error) => setNotice({ tone: "destructive", text: error.message });

  const showLink = (catalogGuid: string) => router.push({ pathname: "/settings/shop-catalog-link", params: { guid: catalogGuid } });
  const openEditor = (catalog?: ShopCatalog) => {
    setNotice(null);
    router.push({ pathname: "/settings/shop-catalog-edit", params: catalog ? { guid: catalog.guid } : {} });
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

  const invalidatePhoto = () => void queryClient.invalidateQueries({ queryKey: ["business", "shop-photo", orgId] });
  const uploadPhoto = useMutation({
    mutationFn: uploadShopPhoto,
    onSuccess: () => succeed(t("settings.shopCatalogs.photo.uploaded")),
    onSettled: invalidatePhoto,
    onError: fail,
  });
  const removePhoto = useMutation({
    mutationFn: removeShopPhoto,
    onSuccess: () => succeed(t("settings.shopCatalogs.photo.removed")),
    onSettled: invalidatePhoto,
    onError: fail,
  });

  const pickPhoto = async () => {
    setNotice(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: SHOP_PHOTO_MIME_TYPES, copyToCacheDirectory: true });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      const mimeType = asset.mimeType ?? "";
      if (!SHOP_PHOTO_MIME_TYPES.includes(mimeType)) {
        fail(new Error(t("settings.shopCatalogs.photo.wrongType")));
        return;
      }
      if (asset.size != null && asset.size > SHOP_PHOTO_MAX_UPLOAD_BYTES) {
        fail(new Error(t("settings.shopCatalogs.photo.tooLarge")));
        return;
      }
      uploadPhoto.mutate({ uri: asset.uri, fileName: asset.name, mimeType });
    } catch {
      fail(new Error(t("settings.shopCatalogs.photo.uploadFailed")));
    }
  };

  const confirmRemovePhoto = () =>
    Alert.alert(t("settings.shopCatalogs.photo.removeConfirmTitle"), t("settings.shopCatalogs.photo.removeConfirmDescription"), [
      { text: t("settings.shopCatalogs.cancel"), style: "cancel" },
      { text: t("settings.shopCatalogs.photo.remove"), style: "destructive", onPress: () => removePhoto.mutate() },
    ]);

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

  return (
    <SettingsPage
      title={t("settings.shopCatalogs.heading")}
      isLoading={access.isLoading || (canManage && list.isLoading)}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.shopCatalogs.description")}
      </AppText>
      {locked ? <Callout tone="info" title={t("settings.shopCatalogs.upgrade")} /> : null}
      {access.data && !canManage ? <Callout tone="info" title={t("settings.shopCatalogs.managersOnly")} /> : null}
      {list.isError || access.isError ? <Callout tone="destructive" title={t("settings.shopCatalogs.loadFailed")} /> : null}
      {notice ? <Callout tone={notice.tone} title={notice.text} /> : null}

      {canManage ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("settings.shopCatalogs.photo.heading")} />
          <Surface style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View
              style={{
                width: SHOP_PHOTO_PREVIEW_WIDTH,
                height: SHOP_PHOTO_PREVIEW_HEIGHT,
                borderRadius: RADIUS.md,
                overflow: "hidden",
                backgroundColor: colors.muted,
              }}
            >
              {photo.data?.url ? (
                <Image
                  source={{ uri: photo.data.url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  accessibilityLabel={t("settings.shopCatalogs.photo.previewAlt")}
                />
              ) : null}
            </View>
            <AppText size="xs" tone="secondary" style={{ flex: 1 }}>
              {t("settings.shopCatalogs.photo.description")}
            </AppText>
          </Surface>
          {!locked ? (
            <ListGroup>
              <ListRow
                icon="upload"
                title={photo.data?.url ? t("settings.shopCatalogs.photo.replace") : t("settings.shopCatalogs.photo.upload")}
                disabled={uploadPhoto.isPending}
                onPress={() => void pickPhoto()}
              />
              {photo.data?.url ? (
                <ListRow
                  icon="trash"
                  tone="destructive"
                  title={t("settings.shopCatalogs.photo.remove")}
                  disabled={removePhoto.isPending}
                  onPress={confirmRemovePhoto}
                />
              ) : null}
            </ListGroup>
          ) : null}
        </View>
      ) : null}

      {canManage ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("settings.shopCatalogs.heading")} />
          {list.data && catalogs.length === 0 ? <EmptyState icon="store" title={t("settings.shopCatalogs.empty")} /> : null}
          {catalogs.length > 0 || !locked ? (
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
                  ]
                    .filter(Boolean)
                    .join("\n")}
                  subtitleNumberOfLines={3}
                  onPress={() => showLink(catalog.guid)}
                  onLongPress={() => setActionsFor(catalog)}
                  longPressLabel={t("settings.shopCatalogs.actions")}
                />
              ))}
              {!locked ? <ListRow icon="plus" title={t("settings.shopCatalogs.add")} onPress={() => openEditor()} /> : null}
            </ListGroup>
          ) : null}
        </View>
      ) : null}

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
    </SettingsPage>
  );
}
