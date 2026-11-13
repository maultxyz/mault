import { Host, Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import type { SegmentedControlProps } from "@/lib/interfaces/ui";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <Picker<T> selection={value} onSelectionChange={onChange} modifiers={[pickerStyle("segmented")]}>
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
