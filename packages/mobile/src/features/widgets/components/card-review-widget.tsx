import { Button, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  aspectRatio,
  buttonStyle,
  clipShape,
  containerBackground,
  controlSize,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  resizable,
  tint,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import { CARD_REVIEW_WIDGET_NAME, EMPTY_CARD_REVIEW_WIDGET_PROPS } from "@/lib/constants/widgets";
import type { CardReviewWidgetProps } from "@/lib/interfaces/widgets";

const cardReviewLayout = (props: CardReviewWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const family = environment.widgetFamily;
  const isReady = props.status === "ready";
  const queue = props.queue ?? [];
  const acceptedScanIds = props.acceptedScanIds ?? [];
  const cards = props.cards ?? [];
  const remaining = Math.max(0, (props.needsReviewCount ?? 0) - acceptedScanIds.length);
  const currentScanId = queue[0];
  const currentCard = cards.find((card) => card.scanId === currentScanId);
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const url = currentCard ? currentCard.url : props.url;
  const isMedium = family === "systemMedium" || family === "systemLarge" || family === "systemExtraLarge";
  const logoUri = environment.colorScheme === "dark" ? props.logo?.dark : props.logo?.light;
  const fill = frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "topLeading" });

  const acceptCurrentCard = () => ({
    queue: queue.slice(1),
    acceptedScanIds: currentScanId ? [...acceptedScanIds, currentScanId] : acceptedScanIds,
  });
  const reviewCurrentCardLater = () => ({
    queue: currentScanId ? [...queue.slice(1), currentScanId] : queue,
  });

  if (family === "accessoryInline") {
    return (
      <Text modifiers={[widgetURL(url)]}>{isReady ? `${remaining} ${props.countCaption}` : props.title}</Text>
    );
  }

  if (family === "accessoryRectangular") {
    return (
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          containerBackground("clear", "widget"),
          widgetURL(url),
          frame({ maxWidth: 10_000, maxHeight: 10_000, alignment: "leading" }),
          accessibilityElement("combine"),
        ]}
      >
        <HStack spacing={4}>
          <Image systemName="checkmark.seal" modifiers={[font({ textStyle: "headline" }), accessibilityHidden()]} />
          <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1), minimumScaleFactor(0.8)]}>{props.title}</Text>
        </HStack>
        {isReady ? (
          <HStack spacing={4} alignment="firstTextBaseline">
            <Text modifiers={[font({ textStyle: "body", weight: "bold" }), monospacedDigit(), lineLimit(1)]}>{String(remaining)}</Text>
            <Text modifiers={[font({ textStyle: "body" }), lineLimit(1), minimumScaleFactor(0.7)]}>{props.countCaption}</Text>
          </HStack>
        ) : null}
        <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(isReady ? 1 : 2), minimumScaleFactor(0.8)]}>
          {isReady ? (currentCard ? currentCard.name : props.doneTitle) : props.message}
        </Text>
      </VStack>
    );
  }

  const widgetBackground = containerBackground(PlatformColor("systemBackground"), "widget");
  const header = (
    <HStack spacing={6} modifiers={[accessibilityElement("combine")]}>
      {logoUri ? (
        <Image
          uiImage={logoUri}
          modifiers={[resizable(), aspectRatio({ ratio: 1.61, contentMode: "fit" }), frame({ height: 12 }), accessibilityHidden()]}
        />
      ) : null}
      <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), lineLimit(1)]}>{props.title}</Text>
      <Spacer />
      {isReady ? (
        <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), monospacedDigit(), lineLimit(1)]}>
          {`${remaining} ${props.countCaption}`}
        </Text>
      ) : null}
    </HStack>
  );

  if (!isReady || !currentCard) {
    const isDone = isReady && remaining === 0;
    return (
      <VStack alignment="leading" spacing={6} modifiers={[widgetBackground, widgetURL(url), fill]}>
        {header}
        <Spacer />
        <HStack spacing={6} modifiers={[accessibilityElement("combine")]}>
          {isDone ? <Image systemName="checkmark.circle.fill" size={18} color="#15803d" modifiers={[accessibilityHidden()]} /> : null}
          <Text modifiers={[font({ textStyle: "headline" }), lineLimit(2)]}>
            {isDone ? props.doneTitle : isReady ? props.moreInAppMessage : props.message}
          </Text>
        </HStack>
        {isDone ? <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(2)]}>{props.doneMessage}</Text> : null}
        <Spacer />
      </VStack>
    );
  }

  const buttons = (
    <HStack spacing={6}>
      <Button
        label={props.acceptLabel}
        systemImage="checkmark"
        onPress={acceptCurrentCard}
        modifiers={[buttonStyle("borderedProminent"), controlSize("small"), tint("#1447e6")]}
      />
      <Button
        label={props.laterLabel}
        systemImage="clock"
        onPress={reviewCurrentCardLater}
        modifiers={[buttonStyle("bordered"), controlSize("small")]}
      />
    </HStack>
  );

  const cardArt = currentCard.imageUri ? (
    <Image
      uiImage={currentCard.imageUri}
      modifiers={[
        resizable(),
        aspectRatio({ ratio: 0.716, contentMode: "fit" }),
        clipShape("roundedRectangle", 5),
        isMedium ? frame({ maxHeight: 10_000, alignment: "top" }) : frame({ height: 56 }),
        accessibilityHidden(),
      ]}
    />
  ) : null;

  if (!isMedium) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[widgetBackground, widgetURL(url), fill]}>
        {header}
        <HStack spacing={6} modifiers={[accessibilityElement("ignore"), accessibilityLabel(currentCard.accessibilityText)]}>
          {cardArt}
          <VStack alignment="leading" spacing={1}>
            <Text modifiers={[font({ textStyle: "caption", weight: "semibold" }), lineLimit(3), minimumScaleFactor(0.8)]}>
              {currentCard.name}
            </Text>
            <Text modifiers={[font({ textStyle: "caption2" }), secondary, lineLimit(2)]}>{currentCard.detail}</Text>
          </VStack>
          <Spacer />
        </HStack>
        <Spacer />
        <HStack spacing={6}>
          <Button
            systemImage="checkmark"
            label={props.acceptLabel}
            onPress={acceptCurrentCard}
            modifiers={[buttonStyle("borderedProminent"), controlSize("small"), tint("#1447e6"), labelStyle("iconOnly"), frame({ maxWidth: 10_000 })]}
          />
          <Button
            systemImage="clock"
            label={props.laterLabel}
            onPress={reviewCurrentCardLater}
            modifiers={[buttonStyle("bordered"), controlSize("small"), labelStyle("iconOnly"), frame({ maxWidth: 10_000 })]}
          />
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={[widgetBackground, widgetURL(url), fill]}>
      {header}
      <HStack spacing={12} alignment="top" modifiers={[fill]}>
        {cardArt}
        <VStack alignment="leading" spacing={2}>
          <VStack alignment="leading" spacing={2} modifiers={[accessibilityElement("ignore"), accessibilityLabel(currentCard.accessibilityText)]}>
            <Text modifiers={[font({ textStyle: "headline" }), lineLimit(2), minimumScaleFactor(0.8)]}>{currentCard.name}</Text>
            <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(2)]}>{currentCard.detail}</Text>
            {currentCard.price ? (
              <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), monospacedDigit(), lineLimit(1)]}>
                {currentCard.price}
              </Text>
            ) : null}
          </VStack>
          <Spacer />
          {buttons}
        </VStack>
        <Spacer />
      </HStack>
    </VStack>
  );
};

export const cardReviewWidget = createWidget<CardReviewWidgetProps>(
  CARD_REVIEW_WIDGET_NAME,
  cardReviewLayout,
  EMPTY_CARD_REVIEW_WIDGET_PROPS,
);
