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
import type { CollectionWidgetConfiguration, WidgetCard, WidgetCardListProps } from "@/lib/interfaces/widgets";

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
  const logoUri = environment.colorScheme === "dark" ? props.logo?.dark : props.logo?.light;
  const fill = frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "topLeading" });

  const cardArt = (imageUri: string) =>
    imageUri ? (
      <Image
        uiImage={imageUri}
        modifiers={[
          resizable(),
          aspectRatio({ ratio: 0.716, contentMode: "fit" }),
          clipShape("roundedRectangle", 5),
          frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "leading" }),
          accessibilityHidden(),
        ]}
      />
    ) : (
      <ZStack modifiers={[aspectRatio({ ratio: 0.716, contentMode: "fit" }), accessibilityHidden()]}>
        <RoundedRectangle cornerRadius={5} modifiers={[foregroundStyle(PlatformColor("tertiarySystemFill"))]} />
        <Image systemName="photo" size={16} color={PlatformColor("secondaryLabel")} />
      </ZStack>
    );

  const cardColumn = (card: WidgetCard) => (
    <VStack
      key={card.scanId}
      alignment="leading"
      spacing={3}
      modifiers={[fill, accessibilityElement("ignore"), accessibilityLabel(card.accessibilityText)]}
    >
      {cardArt(card.imageUri)}
      <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), lineLimit(1), minimumScaleFactor(0.8)]}>{card.name}</Text>
      {card.price ? (
        <Text modifiers={[font({ textStyle: "caption2", weight: "semibold" }), secondary, monospacedDigit(), lineLimit(1), minimumScaleFactor(0.7), privacySensitive()]}>
          {card.price}
        </Text>
      ) : null}
    </VStack>
  );

  const cardRow = (card: WidgetCard) => (
    <HStack
      key={card.scanId}
      spacing={8}
      alignment="top"
      modifiers={[fill, accessibilityElement("ignore"), accessibilityLabel(card.accessibilityText)]}
    >
      {cardArt(card.imageUri)}
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 10_000, alignment: "leading" })]}>
        <Text modifiers={[font({ textStyle: "footnote", weight: "semibold" }), lineLimit(2), minimumScaleFactor(0.8)]}>{card.name}</Text>
        {card.detail ? <Text modifiers={[font({ textStyle: "caption2" }), secondary, lineLimit(2)]}>{card.detail}</Text> : null}
        {card.price ? (
          <Text modifiers={[font({ textStyle: "subheadline", weight: "bold" }), monospacedDigit(), lineLimit(1), minimumScaleFactor(0.6), privacySensitive()]}>
            {card.price}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );

  const header = (
    <HStack spacing={6} modifiers={[accessibilityElement("combine")]}>
      {logoUri ? (
        <Image
          uiImage={logoUri}
          modifiers={[resizable(), aspectRatio({ ratio: 1.61, contentMode: "fit" }), frame({ height: 12 }), accessibilityHidden()]}
        />
      ) : null}
      <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), lineLimit(1)]}>{props.title}</Text>
      {isReady && isMedium ? (
        <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1)]}>{scope.title}</Text>
      ) : null}
      <Spacer />
    </HStack>
  );

  const widgetBackground = containerBackground(PlatformColor("systemBackground"), "widget");

  if (!isReady || !firstCard) {
    return (
      <VStack alignment="leading" spacing={8} modifiers={[widgetBackground, widgetURL(url), fill]}>
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
      <VStack alignment="leading" spacing={8} modifiers={[widgetBackground, widgetURL(url), fill]}>
        {header}
        {cardColumn(firstCard)}
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={8} modifiers={[widgetBackground, widgetURL(url), fill]}>
      {header}
      <HStack spacing={12} alignment="top" modifiers={[fill]}>
        {cards.length < 3 ? cards.map(cardRow) : cards.map(cardColumn)}
      </HStack>
    </VStack>
  );
};
