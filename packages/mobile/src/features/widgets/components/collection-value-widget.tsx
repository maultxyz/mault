import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHidden,
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  privacySensitive,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import { COLLECTION_VALUE_WIDGET_NAME, EMPTY_COLLECTION_VALUE_WIDGET_PROPS } from "@/lib/constants/widgets";
import type { CollectionValueWidgetProps } from "@/lib/interfaces/widgets";

const collectionValueLayout = (props: CollectionValueWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const family = environment.widgetFamily;
  const isReady = props.status === "ready";
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const clearBackground = containerBackground("clear", "widget");

  if (family === "accessoryInline") {
    return (
      <Text modifiers={[widgetURL(props.url), privacySensitive()]}>
        {isReady ? `${props.totalValue} · ${props.cardCount}` : props.title}
      </Text>
    );
  }

  if (family === "accessoryRectangular") {
    return (
      <VStack alignment="leading" spacing={0} modifiers={[clearBackground, widgetURL(props.url), accessibilityElement("combine")]}>
        <HStack spacing={4}>
          <Image systemName="rectangle.stack.fill" modifiers={[accessibilityHidden()]} />
          <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1)]}>{props.title}</Text>
        </HStack>
        {isReady ? (
          <Text modifiers={[font({ textStyle: "title3", weight: "semibold" }), monospacedDigit(), minimumScaleFactor(0.6), lineLimit(1), privacySensitive()]}>
            {props.totalValue}
          </Text>
        ) : null}
        <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(isReady ? 1 : 2)]}>
          {isReady ? props.cardCount : props.message}
        </Text>
      </VStack>
    );
  }

  const background = containerBackground(PlatformColor("systemBackground"), "widget");
  const isMedium = family === "systemMedium" || family === "systemLarge" || family === "systemExtraLarge";

  return (
    <VStack alignment="leading" spacing={4} modifiers={[background, widgetURL(props.url), accessibilityElement("combine")]}>
      <HStack spacing={6}>
        <Image systemName="rectangle.stack.fill" color="#1447e6" modifiers={[accessibilityHidden()]} />
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.title}</Text>
        <Spacer />
      </HStack>
      <Spacer />
      {isReady ? (
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ textStyle: "title", weight: "bold" }), monospacedDigit(), minimumScaleFactor(0.5), lineLimit(1), privacySensitive()]}>
            {props.totalValue}
          </Text>
          <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(1)]}>{props.cardCount}</Text>
          {isMedium ? (
            <HStack spacing={12} modifiers={[padding({ top: 4 })]}>
              <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{props.scansToday}</Text>
              <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{props.scansThisWeek}</Text>
            </HStack>
          ) : null}
        </VStack>
      ) : (
        <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(3)]}>{props.message}</Text>
      )}
    </VStack>
  );
};

export const collectionValueWidget = createWidget<CollectionValueWidgetProps>(
  COLLECTION_VALUE_WIDGET_NAME,
  collectionValueLayout,
  EMPTY_COLLECTION_VALUE_WIDGET_PROPS,
);
