import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { MACHINE_PAGE_DOT_SIZE, MACHINE_PAGE_DOT_TARGET_SIZE } from "@/lib/constants/machines";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { MachinePageDotsProps } from "@/lib/interfaces/machines";

export function MachinePageDots({ machines, selectedMachineId, onSelectMachine }: MachinePageDotsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  if (machines.length < 2) return null;

  return (
    <View
      style={{
        alignSelf: "center",
        flexDirection: "row",
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.full,
        backgroundColor: colors.tonal,
      }}
    >
      {machines.map((machine) => {
        const isSelected = machine.machineId === selectedMachineId;
        return (
          <Pressable
            key={machine.machineId}
            accessibilityRole="button"
            accessibilityLabel={t("machines.pages.goTo", { name: machine.name })}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectMachine(machine.machineId)}
            style={{
              width: MACHINE_PAGE_DOT_TARGET_SIZE,
              height: MACHINE_PAGE_DOT_TARGET_SIZE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: MACHINE_PAGE_DOT_SIZE,
                height: MACHINE_PAGE_DOT_SIZE,
                borderRadius: RADIUS.full,
                backgroundColor: isSelected ? colors.foreground : colors.mutedForeground,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
