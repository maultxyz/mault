import { Host, Toggle } from "@expo/ui/swift-ui";
import { fixedSize, labelsHidden, tint } from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "@/hooks/use-theme";
import type { SwitchControlProps } from "@/lib/interfaces/ui";

export function SwitchControl({ value }: SwitchControlProps) {
  const colors = useTheme();
  return (
    <Host matchContents pointerEvents="none" style={{ flexShrink: 0, flexGrow: 0 }}>
      <Toggle isOn={value} modifiers={[labelsHidden(), fixedSize(), tint(colors.primary)]} />
    </Host>
  );
}
