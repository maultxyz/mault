import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "@/hooks/use-theme";
import { GRADIENT_BURST_CENTER, GRADIENT_BURST_SIZE, GRADIENT_BURST_STOPS } from "@/lib/constants/ui";

export function GradientBurst() {
  const colors = useTheme();
  const id = useId();
  const radius = GRADIENT_BURST_SIZE / 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: GRADIENT_BURST_CENTER - radius,
        top: GRADIENT_BURST_CENTER - radius,
        width: GRADIENT_BURST_SIZE,
        height: GRADIENT_BURST_SIZE,
      }}
    >
      <Svg width={GRADIENT_BURST_SIZE} height={GRADIENT_BURST_SIZE}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {GRADIENT_BURST_STOPS.map((stop) => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={colors.primary} stopOpacity={stop.opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={radius} cy={radius} r={radius} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
