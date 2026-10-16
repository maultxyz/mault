import { router, useNavigation, usePreventRemove } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { useActiveOrg } from "@/hooks/use-org";
import type { SettingsPageProps } from "@/lib/interfaces/settings";

export function SettingsPage({ title, isDirty, isSaving, saveError, onSave, onDiscard, children }: SettingsPageProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const org = useActiveOrg();
  usePreventRemove(isDirty && !isSaving, ({ data }) => {
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
      <Screen header={<PageHeader title={title} subtitle={org?.name} onBack={() => router.back()} />}>
        {saveError ? <Callout tone="destructive" title={t("settings.draft.saveFailed")} /> : null}
        {children}
      </Screen>
      <SaveBar visible={isDirty} saving={isSaving} onSave={onSave} onDiscard={onDiscard} />
    </View>
  );
}
