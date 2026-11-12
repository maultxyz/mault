import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHidden,
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import { EMPTY_SCANNER_ACTIVITY_WIDGET_PROPS, SCANNER_ACTIVITY_WIDGET_NAME } from "@/lib/constants/widgets";
import type { ScannerActivityWidgetProps } from "@/lib/interfaces/widgets";

const scannerActivityLayout = (props: ScannerActivityWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const family = environment.widgetFamily;
  const isReady = props.status === "ready";
  const isScanning = isReady && props.activityState === "scanning";
  const statusSymbol = isScanning ? "dot.radiowaves.left.and.right" : props.activityState === "unknown" ? "questionmark.circle" : "pause.circle";
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const clearBackground = containerBackground("clear", "widget");

  if (family === "accessoryInline") {
    return (
      <Text modifiers={[widgetURL(props.url)]}>
        {isReady ? (isScanning && props.activeScanners[0] ? props.activeScanners[0] : props.headline) : props.title}
      </Text>
    );
  }

  if (family === "accessoryRectangular") {
    return (
      <VStack alignment="leading" spacing={0} modifiers={[clearBackground, widgetURL(props.url), accessibilityElement("combine")]}>
        <HStack spacing={4}>
          <Image systemName={statusSymbol} modifiers={[accessibilityHidden()]} />
          <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1)]}>{isReady ? props.headline : props.title}</Text>
        </HStack>
        {isReady ? (
          <Text modifiers={[font({ textStyle: "caption" }), lineLimit(1)]}>
            {isScanning ? (props.activeScanners[0] ?? "") : props.scansToday}
          </Text>
        ) : null}
        <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(isReady ? 1 : 2)]}>
          {isReady ? (isScanning ? props.scansToday : props.lastScan || props.updated) : props.message}
        </Text>
      </VStack>
    );
  }

  const background = containerBackground(PlatformColor("systemBackground"), "widget");
  const isMedium = family === "systemMedium" || family === "systemLarge" || family === "systemExtraLarge";

  return (
    <VStack alignment="leading" spacing={4} modifiers={[background, widgetURL(props.url), accessibilityElement("combine")]}>
      <HStack spacing={6}>
        <Image systemName={statusSymbol} color={isScanning ? "#16a34a" : undefined} modifiers={[accessibilityHidden()]} />
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.title}</Text>
        <Spacer />
      </HStack>
      <Spacer />
      {isReady ? (
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ textStyle: "headline" }), minimumScaleFactor(0.7), lineLimit(1)]}>{props.headline}</Text>
          {isScanning && props.activeScanners[0] ? (
            <Text modifiers={[font({ textStyle: "footnote" }), lineLimit(1)]}>{props.activeScanners[0]}</Text>
          ) : null}
          {isScanning && isMedium && props.activeScanners[1] ? (
            <Text modifiers={[font({ textStyle: "footnote" }), lineLimit(1)]}>{props.activeScanners[1]}</Text>
          ) : null}
          {isScanning && isMedium && props.activeScanners[2] ? (
            <Text modifiers={[font({ textStyle: "footnote" }), lineLimit(1)]}>{props.activeScanners[2]}</Text>
          ) : null}
          {isScanning && (isMedium ? props.moreScannersAfterList : props.moreScannersAfterFirst) ? (
            <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>
              {isMedium ? props.moreScannersAfterList : props.moreScannersAfterFirst}
            </Text>
          ) : null}
          {!isScanning && props.message ? (
            <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(2)]}>{props.message}</Text>
          ) : null}
          <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{props.scansToday}</Text>
          {props.lastScan ? (
            <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{props.lastScan}</Text>
          ) : null}
          <Text modifiers={[font({ textStyle: "caption2" }), secondary, lineLimit(1)]}>{props.updated}</Text>
        </VStack>
      ) : (
        <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(3)]}>{props.message}</Text>
      )}
    </VStack>
  );
};

export const scannerActivityWidget = createWidget<ScannerActivityWidgetProps>(
  SCANNER_ACTIVITY_WIDGET_NAME,
  scannerActivityLayout,
  EMPTY_SCANNER_ACTIVITY_WIDGET_PROPS,
);
