import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { MATCH_VALIDATION_REVIEWS_REQUIRED } from "@magic-vault/shared";
import { Icon } from "@/components/ui/icon";
import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { useTheme } from "@/hooks/use-theme";
import { CONTROL_RADIUS, RADIUS } from "@/lib/constants/theme";
import { MIN_TOUCH_TARGET, TOP_BAR_SWITCHER_HEIGHT } from "@/lib/constants/ui";
import { TOP_BAR_PROGRESS_WIDTH } from "@/lib/constants/match-validations";

export function ValidateMatchesTopBarButton() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { data: progress } = useQuery(matchValidationProgressQueryOptions);
  const reviewsNeeded = progress ? progress.scanCount * MATCH_VALIDATION_REVIEWS_REQUIRED : 0;
  const percent = reviewsNeeded > 0 ? Math.min(100, Math.floor(((progress?.reviewCount ?? 0) / reviewsNeeded) * 100)) : null;
  const label =
    percent == null
      ? t("matchValidations.title")
      : `${t("matchValidations.title")}, ${t("matchValidations.progress.percent", { percent })}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={(MIN_TOUCH_TARGET - TOP_BAR_SWITCHER_HEIGHT) / 2}
      onPress={() => router.push("/validate-matches")}
      style={({ pressed }) => ({
        width: TOP_BAR_SWITCHER_HEIGHT,
        height: TOP_BAR_SWITCHER_HEIGHT,
        borderRadius: CONTROL_RADIUS,
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        backgroundColor: pressed ? colors.shellAccent : "transparent",
      })}
    >
      <Icon name="success" size={percent == null ? 20 : 18} color={colors.foreground} />
      {percent != null ? (
        <View
          pointerEvents="none"
          style={{
            width: TOP_BAR_PROGRESS_WIDTH,
            height: 3,
            borderRadius: RADIUS.full,
            backgroundColor: colors.border,
            overflow: "hidden",
          }}
        >
          <View style={{ width: `${percent}%`, height: "100%", backgroundColor: colors.primary }} />
        </View>
      ) : null}
    </Pressable>
  );
}
