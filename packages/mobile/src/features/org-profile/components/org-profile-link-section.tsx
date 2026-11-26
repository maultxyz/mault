import * as Clipboard from "expo-clipboard";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Linking, Share, View } from "react-native";
import { buildOrgProfileUrl, ORG_PROFILE_HANDLE_MAX_LENGTH } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { WEB_URL } from "@/lib/constants/config";
import { ORG_PROFILE_HANDLE_PREFIX } from "@/lib/constants/org-profile";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { OrgProfileLinkSectionProps } from "@/lib/interfaces/org-profile";

export function OrgProfileLinkSection({ control, disabled, savedProfile }: OrgProfileLinkSectionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const handle = useWatch({ control, name: "handle" }).trim().toLowerCase();
  const publishedUrl = savedProfile?.isPublished ? buildOrgProfileUrl(WEB_URL, savedProfile) : null;
  const previewUrl =
    publishedUrl && savedProfile?.handle === handle
      ? publishedUrl
      : buildOrgProfileUrl(WEB_URL, { handle: handle || t("settings.orgProfile.handlePlaceholder"), shortUrl: null });

  const copyLink = async (url: string) => {
    await Clipboard.setStringAsync(url);
    showToast({ tone: "success", message: t("settings.orgProfile.linkCopied") });
  };

  return (
    <SettingsSection title={t("settings.orgProfile.link.heading")} description={t("settings.orgProfile.link.description")}>
      <Controller
        control={control}
        name="handle"
        render={({ field, fieldState }) => (
          <TextField
            label={t("settings.orgProfile.handleLabel")}
            prefix={ORG_PROFILE_HANDLE_PREFIX}
            placeholder={t("settings.orgProfile.handlePlaceholder")}
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            autoCapitalize="none"
            autoComplete="off"
            maxLength={ORG_PROFILE_HANDLE_MAX_LENGTH}
            editable={!disabled}
            returnKeyType="done"
            error={translateFormErrorMessage(t, fieldState.error?.message)}
          />
        )}
      />
      <View style={{ gap: 2 }}>
        <AppText size="xs" weight="medium">
          {publishedUrl ? t("settings.orgProfile.link.liveUrl") : t("settings.orgProfile.link.previewUrl")}
        </AppText>
        <AppText selectable size="sm" tone="secondary">
          {previewUrl}
        </AppText>
        {publishedUrl && publishedUrl !== previewUrl ? (
          <AppText size="xs" tone="secondary">
            {t("settings.orgProfile.link.handleChangeNote")}
          </AppText>
        ) : null}
        {!publishedUrl ? (
          <AppText size="xs" tone="secondary">
            {t("settings.orgProfile.link.unpublishedNote")}
          </AppText>
        ) : null}
      </View>
      {publishedUrl ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          <Button
            variant="secondary"
            icon="copy"
            label={t("settings.orgProfile.link.copy")}
            onPress={() => void copyLink(publishedUrl)}
          />
          <Button
            variant="secondary"
            icon="share"
            label={t("settings.orgProfile.link.share")}
            onPress={() => void Share.share({ message: publishedUrl, url: publishedUrl })}
          />
          <Button
            variant="secondary"
            icon="external"
            label={t("settings.orgProfile.link.open")}
            accessibilityHint={t("settings.orgProfile.link.openHint")}
            onPress={() => void Linking.openURL(publishedUrl)}
          />
        </View>
      ) : null}
    </SettingsSection>
  );
}
