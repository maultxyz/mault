import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import { SHOP_PHOTO_MAX_UPLOAD_BYTES, SHOP_PHOTO_MIME_TYPES } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Surface } from "@/components/ui/surface";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { removeShopPhoto, shopPhotoQueryOptions, uploadShopPhoto } from "@/features/business/api/shop-catalogs";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { SHOP_PHOTO_PREVIEW_HEIGHT, SHOP_PHOTO_PREVIEW_WIDTH } from "@/lib/constants/shop-catalogs";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { SettingsNotice } from "@/lib/interfaces/settings";

export function ShopPhotoSettings() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const access = useQuery(businessAccessQueryOptions(orgId));
  const locked = !!access.data?.isLocked;
  const canEdit = !!access.data?.canManageSettings && !locked;
  const photo = useQuery(shopPhotoQueryOptions(orgId, true));
  const [notice, setNotice] = useState<SettingsNotice | null>(null);

  const succeed = (text: string) => {
    setNotice({ tone: "success", text });
    AccessibilityInfo.announceForAccessibility(text);
  };
  const fail = (error: Error) => setNotice({ tone: "destructive", text: error.message });
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

  return (
    <SettingsSection title={t("settings.shopCatalogs.photo.heading")} description={t("settings.shopCatalogs.photo.description")}>
      {locked ? <Callout tone="info" title={t("settings.shopCatalogs.photo.upgrade")} /> : null}
      {notice ? <Callout tone={notice.tone} title={notice.text} /> : null}
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
          {t("settings.shopCatalogs.photo.formats")}
        </AppText>
      </Surface>
      {canEdit ? (
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
    </SettingsSection>
  );
}
