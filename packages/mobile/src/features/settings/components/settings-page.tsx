import { router, useNavigation, usePreventRemove } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoading } from "@/components/ui/page-loading";
import { QueryErrorState } from "@/components/ui/query-error-state";
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
  saveErrorMessage,
  isLoading = false,
  isLoadError = false,
  isRetryingLoad = false,
  onRetryLoad,
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
  const hasLoadedData = !isLoading && !isLoadError;
  usePreventRemove(hasLoadedData && isDirty && !isSaving && !isLeavingWithoutGuard, ({ data }) => {
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen
        onRefresh={onRefresh}
        header={<PageHeader title={title} subtitle={subtitle ?? org?.name} onBack={() => router.back()} />}
      >
        {isLoadError ? (
          <QueryErrorState
            title={t("settings.loadFailed")}
            onRetry={onRetryLoad ?? (() => void onRefresh?.())}
            isRetrying={isRetryingLoad}
          />
        ) : isLoading ? (
          <PageLoading />
        ) : (
          children
        )}
      </Screen>
      <SaveBar
        visible={hasLoadedData && (isSaveBarVisible ?? isDirty)}
        saving={isSaving}
        onSave={onSave}
        onDiscard={onSaveBarDiscard ?? onDiscard}
        errorMessage={saveError ? (saveErrorMessage ?? t("settings.draft.saveFailed")) : undefined}
      />
    </KeyboardAvoidingView>
  );
}
