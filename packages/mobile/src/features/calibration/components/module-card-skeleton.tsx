import { View } from "react-native";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { SERVOS } from "@/lib/constants/calibration";
import { FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import { MIN_TOUCH_TARGET, SLIDER_HIT_HEIGHT, SLIDER_TRACK_HEIGHT } from "@/lib/constants/ui";

export function ModuleCardSkeleton() {
  return (
    <SectionSkeleton titleWidth={96}>
      <Surface style={{ gap: SPACING.xl }}>
        {SERVOS.map((servo) => (
          <View key={servo.name} style={{ gap: SPACING.sm }}>
            <Skeleton width={72} height={FONT_SIZE.xs} />
            <Skeleton height={MIN_TOUCH_TARGET + 4} radius={RADIUS.md} />
            <View>
              <Skeleton width="45%" height={FONT_SIZE.xs} />
              <View style={{ height: SLIDER_HIT_HEIGHT, justifyContent: "center" }}>
                <Skeleton height={SLIDER_TRACK_HEIGHT} radius={RADIUS.full} />
              </View>
            </View>
          </View>
        ))}
      </Surface>
    </SectionSkeleton>
  );
}
