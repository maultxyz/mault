import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Modal, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/icon-button";
import { CARD_IMAGE_VIEWER_DOUBLE_TAP_SCALE, CARD_IMAGE_VIEWER_MAX_SCALE } from "@/lib/constants/cards";
import { SPACING } from "@/lib/constants/theme";
import type { CardImageViewerProps } from "@/lib/interfaces/cards";

export function CardImageViewer({ visible, imageUrl, placeholderUrl, accessibilityLabel, onClose }: CardImageViewerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 1), CARD_IMAGE_VIEWER_MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (savedScale.value <= 1) return;
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomIn = savedScale.value <= 1;
      const next = zoomIn ? CARD_IMAGE_VIEWER_DOUBLE_TAP_SCALE : 1;
      scale.value = withTiming(next);
      savedScale.value = next;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });
  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent
      statusBarTranslucent
      onRequestClose={close}
      onShow={() => AccessibilityInfo.announceForAccessibility(t("cardImageViewer.opened"))}
    >
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[{ flex: 1, padding: SPACING.lg }, imageStyle]}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                placeholder={placeholderUrl ? { uri: placeholderUrl } : undefined}
                placeholderContentFit="contain"
                contentFit="contain"
                accessibilityLabel={accessibilityLabel}
                style={{ flex: 1 }}
              />
            ) : null}
          </Animated.View>
        </GestureDetector>
        <View
          style={{ position: "absolute", top: insets.top + SPACING.sm, right: SPACING.lg }}
          pointerEvents="box-none"
        >
          <IconButton icon="close" variant="camera" accessibilityLabel={t("cardImageViewer.close")} onPress={close} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
