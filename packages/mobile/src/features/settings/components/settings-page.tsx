import { router, useNavigation, usePreventRemove } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/page-loading";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { useActiveOrg } from "@/hooks/use-org";
import type { SettingsPageProps } from "@/lib/interfaces/settings";

const noop = () => {};

export function SettingsPage({
  title,
  subtitle,
  isDirty = false,
  isSaving = false,
  saveError = false,
  isLoading = false,
  refreshing,
  onRefresh,
  onSave = noop,
  onDiscard = noop,
  isSaveBarVisible,
  onSaveBarDiscard,
  isLeavingWithoutGuard = false,
  children,
}: SettingsPageProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const org = useActiveOrg();
  usePreventRemove(isDirty && !isSaving && !isLeavingWithoutGuard, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("settings.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => {
          onDiscard();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });
  return (
    <View style={{ flex: 1 }}>
      <Screen
        refreshing={refreshing}
        onRefresh={onRefresh}
        header={<PageHeader title={title} subtitle={subtitle ?? org?.name} onBack={() => router.back()} />}
      >
        {saveError ? <Callout tone="destructive" title={t("settings.draft.saveFailed")} /> : null}
        {isLoading ? <PageLoading /> : children}
      </Screen>
      <SaveBar
        visible={isSaveBarVisible ?? isDirty}
        saving={isSaving}
        onSave={onSave}
        onDiscard={onSaveBarDiscard ?? onDiscard}
      />
    </View>
  );
}
