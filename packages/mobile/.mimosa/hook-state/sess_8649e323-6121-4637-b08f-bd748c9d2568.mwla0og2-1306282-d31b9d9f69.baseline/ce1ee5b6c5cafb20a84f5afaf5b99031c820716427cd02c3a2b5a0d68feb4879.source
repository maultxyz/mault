import { AccessoryWidgetBackground, HStack, Image, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityLabel,
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  privacySensitive,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { PlatformColor } from "react-native";
import { EMPTY_NOTIFICATIONS_WIDGET_PROPS, NOTIFICATIONS_WIDGET_NAME } from "@/lib/constants/widgets";
import type { NotificationsWidgetProps } from "@/lib/interfaces/widgets";

const notificationsLayout = (props: NotificationsWidgetProps, environment: WidgetEnvironment) => {
  "widget";
  const family = environment.widgetFamily;
  const isReady = props.status === "ready";
  const hasNotifications = isReady && props.count > 0;
  const bellSymbol = hasNotifications ? "bell.badge.fill" : "bell.fill";
  const secondary = foregroundStyle({ type: "hierarchical", style: "secondary" });
  const clearBackground = containerBackground("clear", "widget");
  const detail = isReady ? props.summary : props.message;

  if (family === "accessoryCircular") {
    return (
      <ZStack modifiers={[clearBackground, widgetURL(props.url), accessibilityElement("ignore"), accessibilityLabel(isReady ? props.countLabel : props.title)]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Image systemName={bellSymbol} />
          {isReady ? (
            <Text modifiers={[font({ textStyle: "headline", weight: "bold" }), monospacedDigit()]}>{String(props.count)}</Text>
          ) : null}
        </VStack>
      </ZStack>
    );
  }

  if (family === "accessoryInline") {
    return <Text modifiers={[widgetURL(props.url)]}>{isReady ? props.countLabel : props.title}</Text>;
  }

  if (family === "accessoryRectangular") {
    return (
      <VStack alignment="leading" spacing={0} modifiers={[clearBackground, widgetURL(props.url), accessibilityElement("combine")]}>
        <HStack spacing={4}>
          <Image systemName={bellSymbol} modifiers={[accessibilityHidden()]} />
          <Text modifiers={[font({ textStyle: "headline" }), lineLimit(1)]}>{props.title}</Text>
        </HStack>
        <Text modifiers={[font({ textStyle: "caption" }), lineLimit(1)]}>{detail}</Text>
        {hasNotifications && props.latestMessage ? (
          <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(1), privacySensitive()]}>{props.latestMessage}</Text>
        ) : null}
      </VStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[containerBackground(PlatformColor("systemBackground"), "widget"), widgetURL(props.url), accessibilityElement("combine")]}
    >
      <HStack spacing={6}>
        <Image systemName={bellSymbol} color="#1447e6" modifiers={[accessibilityHidden()]} />
        <Text modifiers={[font({ textStyle: "subheadline", weight: "semibold" }), lineLimit(1)]}>{props.title}</Text>
        <Spacer />
      </HStack>
      <Spacer />
      {isReady ? (
        <Text modifiers={[font({ textStyle: "largeTitle", weight: "bold" }), monospacedDigit(), accessibilityHidden()]}>
          {String(props.count)}
        </Text>
      ) : null}
      <Text modifiers={[font({ textStyle: "footnote" }), secondary, lineLimit(2)]}>{detail}</Text>
      {hasNotifications && props.latestMessage ? (
        <Text modifiers={[font({ textStyle: "caption" }), secondary, lineLimit(2), privacySensitive()]}>{props.latestMessage}</Text>
      ) : null}
    </VStack>
  );
};

export const notificationsWidget = createWidget<NotificationsWidgetProps>(
  NOTIFICATIONS_WIDGET_NAME,
  notificationsLayout,
  EMPTY_NOTIFICATIONS_WIDGET_PROPS,
);
