import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { contourToPoints } from "@magic-vault/shared";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { BATCH_SCAN_LABEL_RADIUS } from "@/lib/constants/scanner";
import type { BatchScanPhotoProps } from "@/lib/interfaces/scanner";

export function BatchScanPhoto({ photo, cards }: BatchScanPhotoProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [width, setWidth] = useState(0);
  const scale = width > 0 ? width / photo.width : 0;
  const height = photo.height * scale;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        width: "100%",
        aspectRatio: photo.width / photo.height,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        backgroundColor: colors.camera,
      }}
    >
      <Image
        source={{ uri: photo.uri }}
        style={{ flex: 1 }}
        contentFit="fill"
        accessibilityLabel={t("batchScan.photoAlt", { count: cards.length })}
      />
      {scale > 0 ? (
        <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} accessible={false}>
          {cards.map((card, index) => {
            const points = contourToPoints(card.contour).map((point) => ({ x: point.x * scale, y: point.y * scale }));
            const path = `M${points.map((point) => `${point.x},${point.y}`).join(" L")} Z`;
            const label = points[0];
            const stroke = card.included ? colors.primary : colors.onCamera;
            return (
              <G key={card.key}>
                <Path d={path} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" opacity={card.included ? 1 : 0.5} />
                <Circle cx={label.x} cy={label.y} r={BATCH_SCAN_LABEL_RADIUS} fill={stroke} />
                <SvgText
                  x={label.x}
                  y={label.y + 4}
                  fill={card.included ? colors.primaryForeground : colors.camera}
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {String(index + 1)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
