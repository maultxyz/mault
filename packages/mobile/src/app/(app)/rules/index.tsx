import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PickerCard } from "@/components/ui/picker-card";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresetPicker } from "@/features/rules/api/use-preset-picker";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { AlphabetPassCard } from "@/features/rules/components/alphabet-pass-card";
import { PresetStageCard } from "@/features/rules/components/preset-stage-card";
import { BinRow } from "@/features/rules/components/bin-row";
import { binModeSummaries } from "@/features/rules/lib/rules";
import { binSetMode } from "@magic-vault/shared";
import { SPACING } from "@/lib/constants/theme";

export default function RulesScreen() {
  const { t } = useTranslation();
  const data = useRulesData();
  const { collection, sets, activeSet, bins, fieldDefinitions } = data;
  const mode = binSetMode(activeSet);
  const summaries = binModeSummaries(activeSet, mode, bins, t);
  const [pickerOpen, setPickerOpen] = useState(false);
  const picker = usePresetPicker();

  return (
    <Screen
      refreshing={data.isRefetching}
      onRefresh={data.refetch}
      header={<PageHeader title={t("rules.title")} subtitle={collection?.game?.name ?? collection?.name} onBack={() => router.back()} />}
    >
      {data.isError ? <Callout tone="destructive" title={t("rules.loadFailed")} /> : null}
      {picker.isError ? <Callout tone="destructive" title={t("rules.activateFailed")} /> : null}

      {data.isPending ? (
        <View style={{ gap: SPACING.sm }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      ) : !collection ? (
        <EmptyState
          icon="collections"
          title={t("rules.noCollectionTitle")}
          description={t("rules.noCollectionDescription")}
          action={<Button variant="secondary" label={t("scan.chooseCollection")} onPress={() => router.navigate("/")} />}
        />
      ) : !collection.game ? (
        <Callout tone="warning" title={t("rules.noGameTitle")} description={t("rules.noGameDescription")} />
      ) : (
        <>
          {sets.length === 0 ? (
            <Callout tone="info" title={t("rules.noPresetsTitle")} description={t("rules.noPresetsDescription")} />
          ) : (
            <PickerCard
              icon="rules"
              label={t("rules.presets")}
              value={picker.label}
              placeholder={t("rules.choosePreset")}
              loading={picker.isPending}
              onPress={() => setPickerOpen(true)}
            />
          )}

          {activeSet && !activeSet.isActive ? (
            <Callout tone="info" title={t("rules.noActiveTitle")} description={t("rules.noActiveDescription")} />
          ) : null}
          {activeSet?.isActive ? (
            <ListGroup>
              <ListRow
                icon="adjust"
                title={t("rules.mode.title")}
                value={t(`rules.modes.${mode}.title`)}
                onPress={() => router.push("/rules/mode")}
              />
              {mode === "repack" ? (
                <ListRow
                  icon="rules"
                  title={t("rules.repack.title")}
                  subtitle={t("rules.repack.slotCount", { count: activeSet.repackSlots.length })}
                  onPress={() => router.push("/rules/repack")}
                />
              ) : null}
            </ListGroup>
          ) : null}
          {mode === "alphabet" && activeSet?.isActive ? <AlphabetPassCard set={activeSet} bins={bins} /> : null}
          {activeSet?.isActive ? <PresetStageCard /> : null}

          {activeSet ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeader title={t("rules.bins")} />
              <ListGroup>
                {bins.map((bin) => (
                  <BinRow
                    key={bin.binNumber}
                    bin={bin}
                    bins={bins}
                    fieldDefinitions={fieldDefinitions}
                    summary={summaries.get(bin.binNumber)}
                    onPress={() =>
                      router.push({ pathname: "/rules/[binNumber]", params: { binNumber: String(bin.binNumber) } })
                    }
                  />
                ))}
              </ListGroup>
            </View>
          ) : null}
        </>
      )}
      <OptionSheet
        visible={pickerOpen}
        title={t("rules.presets")}
        options={picker.options}
        selected={picker.selected}
        onSelect={(value) => {
          setPickerOpen(false);
          picker.choose(value);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}
