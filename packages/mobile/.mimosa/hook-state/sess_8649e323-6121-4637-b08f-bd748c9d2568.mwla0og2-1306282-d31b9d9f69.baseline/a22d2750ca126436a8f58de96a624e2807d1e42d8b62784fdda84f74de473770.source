import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, lineLimit, monospacedDigit, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";
import { SCAN_SESSION_LIVE_ACTIVITY_NAME } from "@/lib/constants/live-activity";
import type { ScanSessionLiveActivityProps } from "@/lib/interfaces/live-activity";

const scanSessionLayout = (props: ScanSessionLiveActivityProps) => {
  "widget";
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const statusSymbol = props.isRunning ? "dot.radiowaves.left.and.right" : "pause.circle";
  return {
    banner: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 14 })]}>
        <HStack spacing={6}>
          <Image systemName={statusSymbol} />
          <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1)]}>{props.title}</Text>
          <Spacer />
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.statusLabel}</Text>
        </HStack>
        <Text modifiers={[font({ textStyle: "subheadline" }), lineLimit(1)]}>{props.lastCardLabel}</Text>
        <HStack spacing={12}>
          <Text modifiers={[font({ textStyle: "caption" }), secondary, monospacedDigit(), lineLimit(1)]}>
            {props.scannedCountLabel}
          </Text>
          <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{props.binLabel}</Text>
          <Spacer />
          <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{props.collectionName}</Text>
        </HStack>
      </VStack>
    ),
    compactLeading: <Image systemName={statusSymbol} />,
    compactTrailing: <Text modifiers={[monospacedDigit()]}>{String(props.scannedCount)}</Text>,
    minimal: <Image systemName={statusSymbol} />,
    expandedLeading: <Image systemName={statusSymbol} />,
    expandedCenter: <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1)]}>{props.lastCardLabel}</Text>,
    expandedTrailing: <Text modifiers={[monospacedDigit()]}>{String(props.scannedCount)}</Text>,
    expandedBottom: (
      <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>
        {`${props.statusLabel} · ${props.binLabel || props.collectionName}`}
      </Text>
    ),
  };
};

export const scanSessionLiveActivity = createLiveActivity<ScanSessionLiveActivityProps>(
  SCAN_SESSION_LIVE_ACTIVITY_NAME,
  scanSessionLayout,
);
