import { Host, Toggle } from "@expo/ui/swift-ui";
import { labelsHidden, tint } from "@expo/ui/swift-ui/modifiers";
import { useTheme } from "@/hooks/use-theme";
import type { SwitchControlProps } from "@/lib/interfaces/ui";

export function SwitchControl({ value }: SwitchControlProps) {
  const colors = useTheme();
  return (
    <Host matchContents pointerEvents="none">
      <Toggle isOn={value} modifiers={[labelsHidden(), tint(colors.primary)]} />
    </Host>
  );
}
