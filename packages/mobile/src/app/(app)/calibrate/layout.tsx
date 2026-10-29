import { router, useNavigation, usePreventRemove } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { computeBinCount } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { useLayoutDraft } from "@/features/calibration/api/use-layout-draft";
import { BinSlot } from "@/features/calibration/components/bin-slot";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useTheme } from "@/hooks/use-theme";
import { BIN_SLOTS_PHYSICAL_ORDER } from "@/lib/constants/calibration";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function CalibrationLayoutScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const navigation = useNavigation();
  const sorter = useSorter();
  const draft = useLayoutDraft();
  const [countOpen, setCountOpen] = useState(false);
  const [bottomPicker, setBottomPicker] = useState<number | null>(null);
  const binCount = computeBinCount(draft.moduleCount);
  const modules = Array.from({ length: draft.moduleCount }, (_, i) => i + 1);
  const bottomRoutes = draft.routes.filter((r) => r.direction === "bottom");
  const heightFor = (binNumber: number) => draft.heights.find((h) => h.binNumber === binNumber)?.height;

  usePreventRemove(draft.isDirty && !draft.isSaving, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("common.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      { text: t("common.discard"), style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const save = () => {
    if (!draft.isReducing) {
      void draft.save();
      return;
    }
    Alert.alert(
      t("calibration.moduleCount.reduceTitle"),
      t("calibration.moduleCount.reduceDescription", { count: draft.moduleCount }),
      [
        { text: t("cardDetail.cancel"), style: "cancel" },
        { text: t("calibration.moduleCount.reduceConfirm"), style: "destructive", onPress: () => void draft.save() },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PageHeader title={t("calibration.sections.layout.title")} subtitle={sorter.device?.name} onBack={() => router.back()} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.lg }}
      >
        {draft.saveError ? <Callout tone="destructive" title={t("calibration.layoutSaveFailed")} /> : null}

        <Surface style={{ gap: SPACING.sm }}>
          <AppText heading weight="semibold">
            {t("calibration.moduleCount.label")}
          </AppText>
          <SelectField
            value={t("calibration.moduleCount.value", { count: draft.moduleCount })}
            placeholder={t("calibration.moduleCount.label")}
            onPress={() => setCountOpen(true)}
          />
          <AppText size="xs" tone="secondary">
            {t("calibration.moduleCount.description")}
          </AppText>
        </Surface>

        <View style={{ gap: SPACING.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <AppText heading weight="semibold">
              {t("calibration.bins.label")}
            </AppText>
            <Button
              size="sm"
              variant="secondary"
              label={t("calibration.bins.resetToDefaults")}
              disabled={draft.isSaving}
              onPress={draft.resetRoutes}
            />
          </View>
          <View
            style={{
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
              backgroundColor: colors.border,
              gap: 1,
            }}
          >
            {modules.map((module) => (
              <View key={module} style={{ flexDirection: "row", gap: 1 }}>
                {BIN_SLOTS_PHYSICAL_ORDER.map(({ direction, labelKey }) => {
                  const route = draft.routes.find((r) => r.module === module && r.direction === direction);
                  return (
                    <BinSlot
                      key={direction}
                      label={t(labelKey, { module })}
                      binNumber={route?.binNumber}
                      binCount={binCount}
                      height={route ? heightFor(route.binNumber) : undefined}
                      onBinChange={(bin) => draft.assignSlot(module, direction, bin)}
                      onHeightChange={draft.setHeight}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          {bottomRoutes.length > 0 ? (
            <Surface style={{ gap: SPACING.sm }}>
              <AppText size="2xs" weight="medium" tone="secondary" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("calibration.bins.bottomSectionLabel")}
              </AppText>
              {bottomRoutes.map((route) => (
                <View key={route.binNumber} style={{ gap: SPACING.xs }}>
                  <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                    <SelectField
                      label={t("calibration.bins.module")}
                      value={t("calibration.moduleLabel", { module: route.module })}
                      placeholder={t("calibration.bins.module")}
                      onPress={() => setBottomPicker(route.binNumber)}
                    />
                    <BinSlot
                      label={t("calibration.binLabel", { bin: route.binNumber })}
                      binNumber={route.binNumber}
                      binCount={binCount}
                      height={heightFor(route.binNumber)}
                      onBinChange={(bin) => draft.assignSlot(route.module, "bottom", bin)}
                      onHeightChange={draft.setHeight}
                    />
                  </View>
                  <OptionSheet
                    visible={bottomPicker === route.binNumber}
                    title={t("calibration.bins.module")}
                    options={modules.map((m) => ({ value: String(m), label: t("calibration.moduleLabel", { module: m }) }))}
                    selected={[String(route.module)]}
                    onSelect={(value) => {
                      setBottomPicker(null);
                      draft.setBottomModule(route.binNumber, Number(value));
                    }}
                    onClose={() => setBottomPicker(null)}
                  />
                </View>
              ))}
            </Surface>
          ) : null}
        </View>
      </ScrollView>
      <SaveBar visible={draft.isDirty} saving={draft.isSaving} onSave={save} onDiscard={draft.discard} />
      <OptionSheet
        visible={countOpen}
        title={t("calibration.moduleCount.label")}
        options={draft.moduleOptions.map((n) => ({ value: String(n), label: t("calibration.moduleCount.value", { count: n }) }))}
        selected={[String(draft.moduleCount)]}
        onSelect={(value) => {
          setCountOpen(false);
          draft.setModuleCount(Number(value));
        }}
        onClose={() => setCountOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
