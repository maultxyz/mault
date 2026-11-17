import { useWindowDimensions } from "react-native";
import { SHELL_PANEL_INSET } from "@/lib/constants/ui";

export function usePanelWidth(): number {
  const { width } = useWindowDimensions();
  return width - SHELL_PANEL_INSET * 2 - 2;
}
