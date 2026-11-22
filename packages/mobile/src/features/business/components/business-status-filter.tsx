import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { Pill } from "@/components/ui/pill";
import { SPACING } from "@/lib/constants/theme";
import { MIN_TOUCH_TARGET, PILL_MIN_HEIGHT } from "@/lib/constants/ui";
import type { BusinessStatusFilterProps } from "@/lib/interfaces/business";

export function BusinessStatusFilter<T extends string>({
  statuses,
  value,
  onChange,
  labelOf,
}: BusinessStatusFilterProps<T>) {
  const { t } = useTranslation();
  const verticalSlop = (MIN_TOUCH_TARGET - PILL_MIN_HEIGHT) / 2;
  const options: { key: T | null; label: string }[] = [
    { key: null, label: t("business.filters.allStatuses") },
    ...statuses.map((status) => ({ key: status, label: labelOf(status) })),
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={t("business.filters.status")}
      contentContainerStyle={{ gap: SPACING.sm, paddingVertical: verticalSlop }}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key ?? "all"}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Pill label={option.label} tone={selected ? "primary" : "neutral"} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
