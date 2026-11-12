import { HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  aspectRatio,
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  privacySensitive,
  resizable,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import type { WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import type { CollectionWidgetConfiguration, WidgetCardListProps } from "@/lib/interfaces/widgets";

export const cardListLayout = (props: WidgetCardListProps, environment: WidgetEnvironment<CollectionWidgetConfiguration>) => {
  "widget";
  const family = environment.widgetFamily;
  const scopes = props.scopes ?? {};
  const scope = scopes[environment.configuration?.collection ?? "all"] ?? scopes.all;
  const isReady = props.status === "ready" && scope !== undefined;
  const cards = isReady ? scope.cards : [];
  const isMedium = family === "systemMedium" || family === "systemLarge" || family === "systemExtraLarge";
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const firstCard = cards[0];
  const url = firstCard && !isMedium ? firstCard.url : isReady ? scope.url : props.url;

  const cardArt = (imageUri: string, height: number) =>
    imageUri ? (
      <Image
        uiImage={imageUri}
        modifiers={[
          resizable(),
          aspectRatio({ ratio: 0.716, contentMode: "fit" }),
          frame({ height }),
          clipShape("roundedRectangle", 5),
          accessibilityHidden(),
        ]}
      />
    ) : (
      <ZStack modifiers={[frame({ width: height * 0.716, height }), accessibilityHidden()]}>
        <RoundedRectangle cornerRadius={5} modifiers={[foregroundStyle(PlatformColor("tertiarySystemFill"))]} />
        <Image systemName="photo" size={16} color={PlatformColor("secondaryLabel")} />
      </ZStack>
    );

  const header = (
    <HStack spacing={6} modifiers={[accessibilityElement("combine")]}>
      <ZStack modifiers={[frame({ width: 22, height: 22 }), accessibilityHidden()]}>
        <RoundedRectangle cornerRadius={6} modifiers={[foregroundStyle("#1447e6")]} />
        <Image systemName={props.symbol} size={11} color="#ffffff" />
      </ZStack>
      <VStack alignment="leading" spacing={0}>
        <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), lineLimit(1)]}>{props.title}</Text>
        {isReady ? <Text modifiers={[font({ textStyle: "caption2" }), secondary, lineLimit(1)]}>{scope.title}</Text> : null}
      </VStack>
      <Spacer />
    </HStack>
  );

  const widgetBackground = containerBackground(PlatformColor("systemBackground"), "widget");

  if (!isReady || !firstCard) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[widgetBackground, widgetURL(url)]}>
        {header}
        <Spacer />
        <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(3)]}>
          {isReady ? props.emptyMessage : props.message}
        </Text>
      </VStack>
    );
  }

  if (!isMedium) {
    return (
      <VStack alignment="leading" spacing={6} modifiers={[widgetBackground, widgetURL(url)]}>
        {header}
        <HStack spacing={8} modifiers={[accessibilityElement("ignore"), accessibilityLabel(firstCard.accessibilityText)]}>
          {cardArt(firstCard.imageUri, 96)}
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ textStyle: "footnote", weight: "semibold" }), lineLimit(3), minimumScaleFactor(0.8)]}>
              {firstCard.name}
            </Text>
            <Text modifiers={[font({ textStyle: "caption2" }), secondary, lineLimit(2)]}>{firstCard.detail}</Text>
            <Spacer />
            {firstCard.price ? (
              <Text modifiers={[font({ textStyle: "subheadline", weight: "bold" }), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6), privacySensitive()]}>
                {firstCard.price}
              </Text>
            ) : null}
          </VStack>
          <Spacer />
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={[widgetBackground, widgetURL(url)]}>
      {header}
      <HStack spacing={10} alignment="top">
        {cards.map((card) => (
          <HStack
            key={card.scanId}
            spacing={6}
            alignment="top"
            modifiers={[frame({ maxWidth: 10_000, alignment: "leading" }), accessibilityElement("ignore"), accessibilityLabel(card.accessibilityText)]}
          >
            {cardArt(card.imageUri, 100)}
            {cards.length < 3 ? (
              <VStack alignment="leading" spacing={2}>
                <Text modifiers={[font({ textStyle: "footnote", weight: "semibold" }), lineLimit(3), minimumScaleFactor(0.8)]}>
                  {card.name}
                </Text>
                <Text modifiers={[font({ textStyle: "caption2" }), secondary, lineLimit(2)]}>{card.detail}</Text>
                <Spacer />
                {card.price ? (
                  <Text modifiers={[font({ textStyle: "subheadline", weight: "bold" }), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6), privacySensitive()]}>
                    {card.price}
                  </Text>
                ) : null}
              </VStack>
            ) : (
              <VStack alignment="leading" spacing={2}>
                <Text modifiers={[font({ textStyle: "caption2", weight: "semibold" }), lineLimit(3), minimumScaleFactor(0.8)]}>
                  {card.name}
                </Text>
                <Spacer />
                {card.price ? (
                  <Text modifiers={[font({ textStyle: "caption", weight: "bold" }), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.5), privacySensitive()]}>
                    {card.price}
                  </Text>
                ) : null}
              </VStack>
            )}
          </HStack>
        ))}
      </HStack>
    </VStack>
  );
};
