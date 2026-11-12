import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { useTheme } from "@/hooks/use-theme";
import type { SegmentedControlProps } from "@/lib/interfaces/ui";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useTheme();
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <SegmentedButton
              key={option.value}
              selected={selected}
              onClick={() => onChange(option.value)}
              colors={{
                activeContainerColor: colors.primarySelected,
                activeContentColor: colors.primaryText,
                activeBorderColor: colors.border,
                inactiveContainerColor: "transparent",
                inactiveContentColor: colors.foreground,
                inactiveBorderColor: colors.border,
              }}
            >
              <SegmentedButton.Label>
                <Text maxLines={1} overflow="ellipsis" color={selected ? colors.primaryText : colors.foreground}>
                  {option.label}
                </Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          );
        })}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
