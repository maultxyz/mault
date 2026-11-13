import { HStack, Image, Rectangle, RoundedRectangle, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  aspectRatio,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  resizable,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import { EMPTY_TOTAL_CARDS_WIDGET_PROPS, TOTAL_CARDS_WIDGET_NAME } from "@/lib/constants/widgets";
import type { CollectionWidgetConfiguration, TotalCardsWidgetProps } from "@/lib/interfaces/widgets";

const totalCardsLayout = (props: TotalCardsWidgetProps, environment: WidgetEnvironment<CollectionWidgetConfiguration>) => {
  "widget";
  const family = environment.widgetFamily;
  const scopes = props.scopes ?? {};
  const scope = scopes[environment.configuration?.collection ?? "all"] ?? scopes.all;
  const isReady = props.status === "ready" && scope !== undefined;
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const url = isReady ? scope.url : props.url;

  if (family === "accessoryInline") {
    return (
      <Text modifiers={[widgetURL(url)]}>{isReady ? scope.accessibilityText : props.title}</Text>
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
          <Text modifiers={[font({ size: 30, weight: "bold", design: "rounded" }), monospacedDigit(), minimumScaleFactor(0.5), lineLimit(1)]}>
            {scope.digits}
          </Text>
        ) : (
          <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(2)]}>{props.message}</Text>
        )}
      </VStack>
    );
  }

  const isMedium = family === "systemMedium" || family === "systemLarge" || family === "systemExtraLarge";
  const digits = isReady ? scope.digits.split("") : [];
  const digitFontSize = isMedium ? 64 : 40;
  const logoUri = environment.colorScheme === "dark" ? props.logo?.dark : props.logo?.light;
  const fill = frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "topLeading" });

  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[containerBackground(PlatformColor("systemBackground"), "widget"), widgetURL(url), fill]}
    >
      <HStack spacing={8} modifiers={[accessibilityElement("combine")]}>
        {logoUri ? (
          <Image
            uiImage={logoUri}
            modifiers={[resizable(), aspectRatio({ ratio: 1.61, contentMode: "fit" }), frame({ height: 16 }), accessibilityHidden()]}
          />
        ) : null}
        <VStack alignment="leading" spacing={0}>
          <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>
            {isReady ? scope.title : props.title}
          </Text>
          {isReady && props.updated ? (
            <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{props.updated}</Text>
          ) : null}
        </VStack>
        <Spacer />
      </HStack>
      {isReady ? (
        <HStack
          spacing={isMedium ? 6 : 3}
          modifiers={[fill, accessibilityElement("ignore"), accessibilityLabel(scope.accessibilityText)]}
        >
          {digits.map((digit, index) => (
            <ZStack key={`digit-${index}`} modifiers={[frame({ maxWidth: 10_000, maxHeight: 10_000 })]}>
              <RoundedRectangle cornerRadius={isMedium ? 12 : 8} modifiers={[foregroundStyle("#1c1c1e")]} />
              <Text
                modifiers={[
                  font({ size: digitFontSize, weight: "semibold", design: "rounded" }),
                  foregroundStyle("#ffffff"),
                  monospacedDigit(),
                  minimumScaleFactor(0.3),
                  lineLimit(1),
                ]}
              >
                {digit}
              </Text>
              <Rectangle modifiers={[frame({ maxWidth: 10_000, minHeight: 1, maxHeight: 1 }), foregroundStyle("#000000")]} />
            </ZStack>
          ))}
        </HStack>
      ) : (
        <VStack alignment="leading" spacing={0} modifiers={[fill]}>
          <Spacer />
          <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(3)]}>{props.message}</Text>
        </VStack>
      )}
      {isReady && isMedium && props.caption ? (
        <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1), accessibilityHidden()]}>{props.caption}</Text>
      ) : null}
    </VStack>
  );
};

export const totalCardsWidget = createWidget<TotalCardsWidgetProps, CollectionWidgetConfiguration>(
  TOTAL_CARDS_WIDGET_NAME,
  totalCardsLayout,
  EMPTY_TOTAL_CARDS_WIDGET_PROPS,
);
