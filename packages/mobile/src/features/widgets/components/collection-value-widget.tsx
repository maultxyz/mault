import { HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  privacySensitive,
  shapes,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import { COLLECTION_VALUE_WIDGET_NAME, EMPTY_COLLECTION_VALUE_WIDGET_PROPS } from "@/lib/constants/widgets";
import type { CollectionValueWidgetProps, CollectionWidgetConfiguration } from "@/lib/interfaces/widgets";

const collectionValueLayout = (
  props: CollectionValueWidgetProps,
  environment: WidgetEnvironment<CollectionWidgetConfiguration>,
) => {
  "widget";
  const family = environment.widgetFamily;
  const isDark = environment.colorScheme === "dark";
  const scopes = props.scopes ?? {};
  const scope = scopes[environment.configuration?.collection ?? "all"] ?? scopes.all;
  const isReady = props.status === "ready" && scope !== undefined;
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const changeColor =
    scope?.changeDirection === "up"
      ? isDark ? "#4ade80" : "#15803d"
      : scope?.changeDirection === "down"
        ? isDark ? "#f87171" : "#b91c1c"
        : undefined;
  const changeSymbol =
    scope?.changeDirection === "up" ? "arrow.up.right" : scope?.changeDirection === "down" ? "arrow.down.right" : "equal";
  const hasChange = isReady && scope.changeDirection !== "none";
  const url = isReady ? scope.url : props.url;

  if (family === "accessoryInline") {
    return (
      <Text modifiers={[widgetURL(url), privacySensitive()]}>
        {isReady ? (hasChange ? `${scope.totalValue} · ${scope.changePercent}` : scope.totalValue) : props.title}
      </Text>
    );
  }

  if (family === "accessoryRectangular") {
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[containerBackground("clear", "widget"), widgetURL(url), accessibilityElement("combine")]}
      >
        <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1)]}>{isReady ? scope.title : props.title}</Text>
        {isReady ? (
          <Text
            modifiers={[
              font({ textStyle: "title3", weight: "semibold" }),
              monospacedDigit(),
              minimumScaleFactor(0.6),
              lineLimit(1),
              privacySensitive(),
            ]}
          >
            {scope.totalValue}
          </Text>
        ) : null}
        <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(isReady ? 1 : 2)]}>
          {isReady ? (hasChange ? `${scope.change} · ${scope.changePercent}` : `${scope.cardCount} ${props.cardsLabel}`) : props.message}
        </Text>
      </VStack>
    );
  }

  const widgetBackground = containerBackground(PlatformColor("systemBackground"), "widget");
  const tileBackground = background(
    PlatformColor("secondarySystemBackground"),
    shapes.roundedRectangle({ cornerRadius: 14, roundedCornerStyle: "continuous" }),
  );
  const isMedium = family === "systemMedium" || family === "systemLarge" || family === "systemExtraLarge";

  if (!isReady) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[widgetBackground, widgetURL(url), accessibilityElement("combine")]}>
        <HStack spacing={6}>
          <ZStack modifiers={[frame({ width: 26, height: 26 }), accessibilityHidden()]}>
            <RoundedRectangle cornerRadius={7} modifiers={[foregroundStyle("#1447e6")]} />
            <Image systemName="rectangle.stack.fill" size={13} color="#ffffff" />
          </ZStack>
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.title}</Text>
          <Spacer />
        </HStack>
        <Spacer />
        <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(3)]}>{props.message}</Text>
      </VStack>
    );
  }

  const valueTile = (
    <VStack alignment="leading" spacing={2} modifiers={[accessibilityElement("ignore"), accessibilityLabel(scope.accessibilityText)]}>
      <ZStack modifiers={[frame({ width: 26, height: 26 }), accessibilityHidden()]}>
        <RoundedRectangle cornerRadius={7} modifiers={[foregroundStyle("#1447e6")]} />
        <Image systemName="rectangle.stack.fill" size={13} color="#ffffff" />
      </ZStack>
      <Spacer />
      <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1), minimumScaleFactor(0.8)]}>
        {scope.title}
      </Text>
      <Text
        modifiers={[
          font({ textStyle: "title2", weight: "bold" }),
          monospacedDigit(),
          minimumScaleFactor(0.5),
          lineLimit(1),
          privacySensitive(),
        ]}
      >
        {scope.totalValue}
      </Text>
      {scope.previousValue ? (
        <Text modifiers={[font({ textStyle: "footnote" }), secondary, monospacedDigit(), lineLimit(1), minimumScaleFactor(0.7), privacySensitive()]}>
          {scope.previousValue}
        </Text>
      ) : (
        <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(1)]}>{scope.cardCount}</Text>
      )}
    </VStack>
  );

  if (!isMedium) {
    return (
      <VStack alignment="leading" spacing={0} modifiers={[widgetBackground, widgetURL(url)]}>
        <HStack>
          {valueTile}
          <Spacer />
        </HStack>
        {hasChange ? (
          <HStack spacing={3} modifiers={[padding({ top: 2 }), accessibilityHidden()]}>
            <Image systemName={changeSymbol} size={10} color={changeColor} />
            <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), changeColor ? foregroundStyle(changeColor) : secondary, monospacedDigit(), lineLimit(1), minimumScaleFactor(0.7)]}>
              {scope.changePercent}
            </Text>
          </HStack>
        ) : null}
      </VStack>
    );
  }

  return (
    <HStack spacing={10} modifiers={[widgetBackground, widgetURL(url)]}>
      <VStack alignment="leading" spacing={0} modifiers={[frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "leading" })]}>
        {valueTile}
      </VStack>
      <VStack spacing={8} modifiers={[frame({ width: 130 })]}>
        <VStack
          alignment="leading"
          spacing={2}
          modifiers={[
            padding({ all: 10 }),
            frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "leading" }),
            tileBackground,
            accessibilityElement("combine"),
          ]}
        >
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.cardsLabel}</Text>
          <HStack spacing={6}>
            <Text modifiers={[font({ textStyle: "title3", weight: "semibold" }), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6)]}>
              {scope.cardCount}
            </Text>
            {scope.previousCardCount ? (
              <Text modifiers={[font({ textStyle: "footnote" }), secondary, monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6)]}>
                {scope.previousCardCount}
              </Text>
            ) : null}
          </HStack>
        </VStack>
        <VStack
          alignment="leading"
          spacing={2}
          modifiers={[
            padding({ all: 10 }),
            frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "leading" }),
            tileBackground,
            accessibilityElement("combine"),
          ]}
        >
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.changeLabel}</Text>
          {hasChange ? (
            <HStack spacing={4}>
              <Image systemName={changeSymbol} size={12} color={changeColor} modifiers={[accessibilityHidden()]} />
              <Text modifiers={[font({ textStyle: "title3", weight: "semibold" }), changeColor ? foregroundStyle(changeColor) : secondary, monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6)]}>
                {scope.changePercent}
              </Text>
            </HStack>
          ) : (
            <Text modifiers={[font({ textStyle: "title3", weight: "semibold" }), secondary, lineLimit(1)]}>-</Text>
          )}
          {hasChange ? (
            <Text modifiers={[font({ textStyle: "footnote" }), secondary, monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6), privacySensitive()]}>
              {scope.change}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </HStack>
  );
};

export const collectionValueWidget = createWidget<CollectionValueWidgetProps, CollectionWidgetConfiguration>(
  COLLECTION_VALUE_WIDGET_NAME,
  collectionValueLayout,
  EMPTY_COLLECTION_VALUE_WIDGET_PROPS,
);
