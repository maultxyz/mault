import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Modal, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/icon-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CARD_IMAGE_VIEWER_DOUBLE_TAP_SCALE, CARD_IMAGE_VIEWER_MAX_SCALE } from "@/lib/constants/cards";
import { SPACING } from "@/lib/constants/theme";
import type { CardImageViewerProps } from "@/lib/interfaces/cards";

export function CardImageViewer({ visible, images, initialIndex = 0, onClose }: CardImageViewerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const shown = images[Math.min(index, images.length - 1)];

  const resetZoom = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const showImage = (next: number) => {
    if (next < 0 || next >= images.length) return;
    resetZoom();
    setIndex(next);
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
    .onEnd((event) => {
      if (savedScale.value <= 1) {
        if (event.translationX < -SPACING.xxl) scheduleOnRN(showImage, index + 1);
        else if (event.translationX > SPACING.xxl) scheduleOnRN(showImage, index - 1);
        return;
      }
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = savedScale.value <= 1 ? CARD_IMAGE_VIEWER_DOUBLE_TAP_SCALE : 1;
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
    resetZoom();
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
          <Animated.View
            style={[
              { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: insets.top + SPACING.xxl * 2, paddingBottom: SPACING.lg },
              imageStyle,
            ]}
          >
            {shown?.imageUrl ? (
              <Image
                key={shown.imageUrl}
                source={{ uri: shown.imageUrl }}
                placeholder={shown.placeholderUrl ? { uri: shown.placeholderUrl } : undefined}
                placeholderContentFit="contain"
                contentFit="contain"
                accessibilityLabel={shown.accessibilityLabel}
                style={{ flex: 1 }}
              />
            ) : null}
          </Animated.View>
        </GestureDetector>
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: insets.top + SPACING.sm,
            left: SPACING.lg,
            right: SPACING.lg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: SPACING.md,
          }}
        >
          {images.length > 1 ? (
            <View style={{ flex: 1 }}>
              <SegmentedControl
                options={images.map((image, imageIndex) => ({ value: String(imageIndex), label: image.title }))}
                value={String(index)}
                onChange={(value) => showImage(Number(value))}
              />
            </View>
          ) : null}
          <IconButton icon="close" variant="camera" accessibilityLabel={t("cardImageViewer.close")} onPress={close} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
