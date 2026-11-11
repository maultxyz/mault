import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, Share, View } from "react-native";
import {
  DEFAULT_SHARE_LINK_SHOWS_PRICES,
  DEFAULT_SHOP_CATALOG_IS_PUBLIC,
  SHOP_PHOTO_MAX_UPLOAD_BYTES,
  SHOP_PHOTO_MIME_TYPES,
  shopCatalogFormSchema,
  type ShopCatalog,
  type ShopCatalogFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { QrCode } from "@/components/ui/qr-code";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import {
  buildShopCatalogUrl,
  businessAccessQueryOptions,
  createShopCatalog,
  deleteShopCatalog,
  removeShopPhoto,
  resetShopCatalogLink,
  shopCatalogsQueryOptions,
  shopPhotoQueryOptions,
  updateShopCatalog,
  uploadShopPhoto,
} from "@/features/business/api/shop-catalogs";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { storageLocationsQueryOptions } from "@/features/storage/api/storage";
import { useActiveOrg } from "@/hooks/use-org";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { useTheme } from "@/hooks/use-theme";
import { QR_CODE_MAX_SIZE } from "@/lib/constants/share-links";
import { SHOP_PHOTO_PREVIEW_HEIGHT, SHOP_PHOTO_PREVIEW_WIDTH } from "@/lib/constants/shop-catalogs";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function ShopCatalogsSettingsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const panelWidth = usePanelWidth();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const access = useQuery(businessAccessQueryOptions(orgId));
  const canManage = !!access.data?.canManageSettings;
  const locked = !!access.data?.isLocked;
  const list = useQuery(shopCatalogsQueryOptions(orgId, canManage));
  const photo = useQuery(shopPhotoQueryOptions(orgId, canManage));
  const [editing, setEditing] = useState<ShopCatalog | "new" | null>(null);
  const [actionsFor, setActionsFor] = useState<ShopCatalog | null>(null);
  const [linkGuid, setLinkGuid] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "destructive"; text: string } | null>(null);
  const collections = useQuery({ ...collectionsQueryOptions(orgId), enabled: !!orgId && editing !== null });
  const storageLocations = useQuery(storageLocationsQueryOptions(orgId, editing !== null));
  const form = useForm<ShopCatalogFormValues>({
    resolver: zodResolver(shopCatalogFormSchema),
    defaultValues: {
      name: "",
      showsPrices: DEFAULT_SHARE_LINK_SHOWS_PRICES,
      isPublic: DEFAULT_SHOP_CATALOG_IS_PUBLIC,
      collectionGuids: [],
      storageLocationGuids: [],
    },
  });
  const catalogs = list.data ?? [];
  const linkCatalog = catalogs.find((catalog) => catalog.guid === linkGuid) ?? null;
  const linkUrl = linkCatalog ? buildShopCatalogUrl(linkCatalog) : null;

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["business", "shop-catalogs", orgId] });
  const succeed = (text: string) => {
    setMessage({ tone: "success", text });
    AccessibilityInfo.announceForAccessibility(text);
  };
  const fail = (error: Error) => setMessage({ tone: "destructive", text: error.message });

  const save = useMutation({
    mutationFn: (values: ShopCatalogFormValues) =>
      editing && editing !== "new" ? updateShopCatalog(editing.guid, values) : createShopCatalog(values),
    onSuccess: (catalog) => {
      const wasNew = editing === "new";
      setEditing(null);
      succeed(wasNew ? t("settings.shopCatalogs.created") : t("settings.shopCatalogs.saved"));
      if (wasNew) setLinkGuid(catalog.guid);
      invalidate();
    },
    onError: fail,
  });
  const resetLink = useMutation({
    mutationFn: resetShopCatalogLink,
    onSuccess: (catalog) => {
      succeed(t("settings.shopCatalogs.linkReset"));
      setLinkGuid(catalog.guid);
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
    setMessage(null);
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

  const startEditing = (target: ShopCatalog | "new") => {
    setLinkGuid(null);
    form.reset(
      target === "new"
        ? {
            name: "",
            showsPrices: DEFAULT_SHARE_LINK_SHOWS_PRICES,
            isPublic: DEFAULT_SHOP_CATALOG_IS_PUBLIC,
            collectionGuids: [],
            storageLocationGuids: [],
          }
        : {
            name: target.name,
            showsPrices: target.showsPrices,
            isPublic: target.isPublic,
            collectionGuids: target.collections.map((source) => source.guid),
            storageLocationGuids: target.storageLocations.map((source) => source.guid),
          },
    );
    setEditing(target);
  };

  const runAction = (action: string) => {
    const catalog = actionsFor;
    setActionsFor(null);
    if (!catalog) return;
    if (action === "link") setLinkGuid(catalog.guid);
    else if (action === "edit") startEditing(catalog);
    else if (action === "reset") {
      Alert.alert(t("settings.shopCatalogs.resetLinkConfirmTitle"), t("settings.shopCatalogs.resetLinkConfirmDescription"), [
        { text: t("settings.shopCatalogs.cancel"), style: "cancel" },
        { text: t("settings.shopCatalogs.resetLink"), style: "destructive", onPress: () => resetLink.mutate(catalog.guid) },
      ]);
    } else if (action === "delete") {
      Alert.alert(t("settings.shopCatalogs.deleteConfirmTitle"), t("settings.shopCatalogs.deleteConfirmDescription"), [
        { text: t("settings.shopCatalogs.cancel"), style: "cancel" },
        {
          text: t("settings.shopCatalogs.delete"),
          style: "destructive",
          onPress: () => {
            if (linkGuid === catalog.guid) setLinkGuid(null);
            remove.mutate(catalog.guid);
          },
        },
      ]);
    }
  };

  const sourceSummary = (catalog: ShopCatalog) =>
    [...catalog.collections, ...catalog.storageLocations].map((source) => source.name).join(", ") ||
    t("settings.shopCatalogs.noLiveSources");

  const renderSourceSwitches = (
    options: { guid: string; name: string }[],
    value: string[],
    onChange: (next: string[]) => void,
  ) =>
    options.length === 0 ? (
      <AppText size="xs" tone="secondary">
        {t("settings.shopCatalogs.noSources")}
      </AppText>
    ) : (
      options.map((option) => (
        <SwitchRow
          key={option.guid}
          title={option.name}
          value={value.includes(option.guid)}
          onValueChange={(on) => onChange(on ? [...value, option.guid] : value.filter((guid) => guid !== option.guid))}
        />
      ))
    );

  return (
    <Screen
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      header={<PageHeader title={t("settings.shopCatalogs.heading")} subtitle={org?.name} onBack={() => router.back()} />}
    >
      {access.isLoading || (canManage && list.isLoading) ? (
        <PageSkeleton />
      ) : (
        <>
          <AppText size="sm" tone="secondary">
            {t("settings.shopCatalogs.description")}
          </AppText>
          {locked ? <Callout tone="info" title={t("settings.shopCatalogs.upgrade")} /> : null}
          {access.data && !canManage ? <Callout tone="info" title={t("settings.shopCatalogs.managersOnly")} /> : null}
          {list.isError || access.isError ? <Callout tone="destructive" title={t("settings.shopCatalogs.loadFailed")} /> : null}
          {message ? <Callout tone={message.tone} title={message.text} /> : null}

          {canManage ? (
            <Surface style={{ gap: SPACING.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
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
                <View style={{ flex: 1 }}>
                  <AppText weight="semibold" accessibilityRole="header">
                    {t("settings.shopCatalogs.photo.heading")}
                  </AppText>
                  <AppText size="xs" tone="secondary">
                    {t("settings.shopCatalogs.photo.description")}
                  </AppText>
                </View>
              </View>
              {!locked ? (
                <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                  <Button
                    style={{ flex: 1 }}
                    variant="secondary"
                    icon="upload"
                    label={photo.data?.url ? t("settings.shopCatalogs.photo.replace") : t("settings.shopCatalogs.photo.upload")}
                    loading={uploadPhoto.isPending}
                    onPress={() => void pickPhoto()}
                  />
                  {photo.data?.url ? (
                    <Button
                      style={{ flex: 1 }}
                      variant="destructive"
                      icon="trash"
                      label={t("settings.shopCatalogs.photo.remove")}
                      loading={removePhoto.isPending}
                      onPress={confirmRemovePhoto}
                    />
                  ) : null}
                </View>
              ) : null}
            </Surface>
          ) : null}

          {linkCatalog ? (
            <Surface style={{ gap: SPACING.md, alignItems: "center" }}>
              <AppText heading weight="semibold" accessibilityRole="header" style={{ alignSelf: "stretch" }}>
                {t("settings.shopCatalogs.linkTitle", { name: linkCatalog.name })}
              </AppText>
              <AppText size="xs" tone="secondary" style={{ alignSelf: "stretch" }}>
                {t("settings.shopCatalogs.linkDescription")}
              </AppText>
              {linkUrl ? (
                <>
                  <QrCode
                    value={linkUrl}
                    size={Math.min(panelWidth - SCREEN_GUTTER * 4, QR_CODE_MAX_SIZE)}
                    accessibilityLabel={t("shareLink.qrLabel")}
                  />
                  <AppText selectable size="sm" style={{ textAlign: "center" }}>
                    {linkUrl}
                  </AppText>
                  <AppText size="xs" tone="secondary" style={{ textAlign: "center" }}>
                    {linkCatalog.isPublic
                      ? t("settings.shopCatalogs.publicLinkNote")
                      : t("settings.shopCatalogs.linkNeverExpires")}
                  </AppText>
                  <View style={{ flexDirection: "row", gap: SPACING.sm, alignSelf: "stretch" }}>
                    <Button style={{ flex: 1 }} variant="ghost" label={t("settings.shopCatalogs.close")} onPress={() => setLinkGuid(null)} />
                    <Button
                      style={{ flex: 1 }}
                      icon="share"
                      label={t("shareLink.share")}
                      onPress={() => void Share.share({ message: linkUrl, url: linkUrl })}
                    />
                  </View>
                </>
              ) : (
                <AppText size="sm" tone="secondary">
                  {t("settings.shopCatalogs.linksNotConfigured")}
                </AppText>
              )}
            </Surface>
          ) : null}

          {editing ? (
            <Surface style={{ gap: SPACING.md }}>
              <View>
                <AppText heading weight="semibold" accessibilityRole="header">
                  {editing === "new" ? t("settings.shopCatalogs.addTitle") : t("settings.shopCatalogs.editTitle")}
                </AppText>
                <AppText size="xs" tone="secondary">
                  {t("settings.shopCatalogs.dialogDescription")}
                </AppText>
              </View>
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t("settings.shopCatalogs.nameLabel")}
                    placeholder={t("settings.shopCatalogs.namePlaceholder")}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChangeText={field.onChange}
                    error={translateFormErrorMessage(t, fieldState.error?.message)}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="showsPrices"
                render={({ field }) => (
                  <SwitchRow
                    title={t("settings.shopCatalogs.showPrices")}
                    description={t("settings.shopCatalogs.showPricesDescription")}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <SwitchRow
                    title={t("settings.shopCatalogs.isPublic")}
                    description={t("settings.shopCatalogs.isPublicDescription")}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="collectionGuids"
                render={({ field, fieldState }) => (
                  <View style={{ gap: SPACING.sm }}>
                    <AppText size="sm" weight="medium" accessibilityRole="header">
                      {t("settings.shopCatalogs.collectionsLabel")}
                    </AppText>
                    {renderSourceSwitches(
                      (collections.data ?? []).map((collection) => ({ guid: collection.guid, name: collection.name })),
                      field.value,
                      field.onChange,
                    )}
                    {fieldState.error ? (
                      <AppText size="xs" style={{ color: colors.destructiveForeground }} accessibilityRole="alert">
                        {translateFormErrorMessage(t, fieldState.error.message)}
                      </AppText>
                    ) : null}
                  </View>
                )}
              />
              <Controller
                control={form.control}
                name="storageLocationGuids"
                render={({ field }) => (
                  <View style={{ gap: SPACING.sm }}>
                    <AppText size="sm" weight="medium" accessibilityRole="header">
                      {t("settings.shopCatalogs.storageLocationsLabel")}
                    </AppText>
                    {renderSourceSwitches(
                      (storageLocations.data ?? []).map((location) => ({ guid: location.guid, name: location.name })),
                      field.value,
                      field.onChange,
                    )}
                  </View>
                )}
              />
              <AppText size="xs" tone="secondary">
                {t("settings.shopCatalogs.inventoryNote")}
              </AppText>
              <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                <Button style={{ flex: 1 }} variant="ghost" label={t("settings.shopCatalogs.cancel")} onPress={() => setEditing(null)} />
                <Button
                  style={{ flex: 1 }}
                  label={editing === "new" ? t("settings.shopCatalogs.add") : t("settings.shopCatalogs.save")}
                  loading={save.isPending}
                  onPress={form.handleSubmit((values) => save.mutate(values))}
                />
              </View>
            </Surface>
          ) : canManage && !locked ? (
            <Button icon="plus" label={t("settings.shopCatalogs.add")} onPress={() => startEditing("new")} />
          ) : null}

          {canManage && list.data && catalogs.length === 0 && !editing ? (
            <EmptyState icon="store" title={t("settings.shopCatalogs.empty")} />
          ) : (
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
                  onPress={() => setActionsFor(catalog)}
                />
              ))}
            </ListGroup>
          )}

          <OptionSheet
            visible={!!actionsFor}
            title={actionsFor?.name ?? t("settings.shopCatalogs.actions")}
            options={[
              { value: "link", label: t("settings.shopCatalogs.showLink") },
              ...(locked ? [] : [{ value: "edit", label: t("settings.shopCatalogs.edit") }]),
              ...(actionsFor?.isPublic
                ? []
                : [{ value: "reset", label: t("settings.shopCatalogs.resetLink") }]),
              { value: "delete", label: t("settings.shopCatalogs.delete") },
            ]}
            selected={[]}
            onSelect={runAction}
            onClose={() => setActionsFor(null)}
          />
        </>
      )}
    </Screen>
  );
}
