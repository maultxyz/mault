import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { useMachineLabels } from "@/features/machines/api/use-machine-labels";
import { MachinePageDots } from "@/features/machines/components/machine-page-dots";
import { MachinePanel } from "@/features/machines/components/machine-panel";
import { useMachineStatuses } from "@/features/stream/api/use-app-stream";
import { useTheme } from "@/hooks/use-theme";
import { MACHINES_TABLET_MIN_WIDTH } from "@/lib/constants/machines";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { MachineStatus } from "@magic-vault/shared";
import type { MachinesLayoutProps } from "@/lib/interfaces/machines";

function PhoneMachinesPager({ machines }: MachinesLayoutProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { statusLabel } = useMachineLabels();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<FlatList<MachineStatus>>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    machines.findIndex((machine) => machine.machineId === selectedMachineId),
  );
  const selected = machines[selectedIndex];

  const showMachine = useCallback(
    (machineId: string) => {
      const index = machines.findIndex((machine) => machine.machineId === machineId);
      if (index < 0) return;
      setSelectedMachineId(machineId);
      pagerRef.current?.scrollToIndex({ index, animated: true });
    },
    [machines],
  );

  const syncSelectedPage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    const machine = machines[index];
    if (machine) setSelectedMachineId(machine.machineId);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.sm }}>
        {machines.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("machines.machinePicker", { name: selected?.name ?? "" })}
            onPress={() => setPickerOpen(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, alignSelf: "flex-start" }}
          >
            <AppText size="2xl" heading weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {selected?.name}
            </AppText>
            <Icon name="expand" size={20} color={colors.foreground} />
          </Pressable>
        ) : (
          <AppText size="2xl" heading weight="semibold" numberOfLines={1}>
            {selected?.name}
          </AppText>
        )}
      </View>
      <FlatList
        ref={pagerRef}
        data={machines}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(machine) => machine.machineId}
        getItemLayout={(_data, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={syncSelectedPage}
        renderItem={({ item, index }) => (
          <ScrollView
            style={{ width }}
            contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl * 2 }}
          >
            <MachinePanel machine={item} showsName={false} isVisible={index === selectedIndex} />
          </ScrollView>
        )}
      />
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: SPACING.md }}>
        <MachinePageDots
          machines={machines}
          selectedMachineId={selected?.machineId ?? ""}
          onSelectMachine={showMachine}
        />
      </View>
      <OptionSheet
        visible={pickerOpen}
        title={t("machines.chooseMachine")}
        options={machines.map((machine) => ({
          value: machine.machineId,
          label: machine.name,
          description: statusLabel(machine),
        }))}
        selected={selected ? [selected.machineId] : []}
        onSelect={(machineId) => {
          setPickerOpen(false);
          showMachine(machineId);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

function TabletMachinesGrid({ machines }: MachinesLayoutProps) {
  const { width } = useWindowDimensions();
  const columnWidth = (width - SCREEN_GUTTER * 2 - SPACING.xl) / 2;

  return (
    <ScrollView
      contentContainerStyle={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.xl,
        padding: SCREEN_GUTTER,
        paddingBottom: SPACING.xxl,
      }}
    >
      {machines.map((machine) => (
        <View key={machine.machineId} style={{ width: machines.length === 1 ? "100%" : columnWidth }}>
          <MachinePanel machine={machine} showsName isVisible />
        </View>
      ))}
    </ScrollView>
  );
}

export default function MachinesScreen() {
  const { t } = useTranslation();
  const machines = useMachineStatuses();
  const { width } = useWindowDimensions();
  const isTablet = width >= MACHINES_TABLET_MIN_WIDTH;

  return (
    <Screen
      scroll={false}
      padded={false}
      header={<PageHeader title={t("machines.title")} onBack={() => router.back()} />}
    >
      {machines.length === 0 ? (
        <View style={{ padding: SCREEN_GUTTER }}>
          <EmptyState icon="monitor" title={t("machines.empty.title")} description={t("machines.empty.description")} />
        </View>
      ) : isTablet ? (
        <TabletMachinesGrid machines={machines} />
      ) : (
        <PhoneMachinesPager machines={machines} />
      )}
    </Screen>
  );
}
