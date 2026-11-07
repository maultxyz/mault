import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { BATCH_SCAN_THUMBNAIL_WIDTH } from "@/lib/constants/scanner";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { MIN_TOUCH_TARGET } from "@/lib/constants/ui";
import type { BatchScanRowProps } from "@/lib/interfaces/scanner";
import { absoluteUrl } from "@/lib/url";

export function BatchScanRow({ index, card, isRemoveMode, onToggleIncluded, onCorrect }: BatchScanRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const matchedCard = card.correctedCard ?? card.outcome?.card ?? null;
  const isWorking = card.status === "pending" || card.status === "identifying";
  const thumbnail = absoluteUrl(card.outcome?.capturedImageUrl);
  const title = isWorking
    ? t("batchScan.identifying")
    : card.status === "failed"
      ? t("batchScan.failed")
      : (matchedCard?.name ?? t("batchScan.noMatch"));
  const subtitle = matchedCard
    ? [matchedCard.setName, matchedCard.collectorNumber ? `#${matchedCard.collectorNumber}` : null].filter(Boolean).join(" · ")
    : null;
  const canInclude = !isWorking && card.status !== "failed" && (!isRemoveMode || !!matchedCard);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.sm }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t(isRemoveMode ? "batchScan.removeCard" : "batchScan.includeCard", { number: index + 1 })}
        accessibilityState={{ checked: card.included && canInclude, disabled: !canInclude }}
        disabled={!canInclude}
        onPress={onToggleIncluded}
        hitSlop={(MIN_TOUCH_TARGET - 24) / 2}
        style={{
          width: 24,
          height: 24,
          borderRadius: RADIUS.sm,
          borderWidth: 1.5,
          borderColor: card.included && canInclude ? colors.primary : colors.foregroundSecondary,
          backgroundColor: card.included && canInclude ? colors.primary : "transparent",
          alignItems: "center",
          justifyContent: "center",
          opacity: canInclude ? 1 : 0.4,
        }}
      >
        {card.included && canInclude ? <Icon name="check" size={16} color={colors.primaryForeground} /> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${index + 1}. ${title}`}
        accessibilityHint={t("batchScan.correctHint")}
        disabled={isWorking}
        onPress={onCorrect}
        style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: SPACING.md, opacity: pressed ? 0.7 : 1 })}
      >
        <AppText size="sm" weight="semibold" tone="secondary" style={{ width: 20, textAlign: "center" }}>
          {index + 1}
        </AppText>
        <View
          style={{
            width: BATCH_SCAN_THUMBNAIL_WIDTH,
            aspectRatio: CARD_ASPECT_RATIO,
            borderRadius: RADIUS.sm,
            overflow: "hidden",
            backgroundColor: colors.muted,
          }}
        >
          {thumbnail ? <Image source={{ uri: thumbnail }} style={{ flex: 1 }} contentFit="fill" accessible={false} /> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {isWorking ? (
            <Skeleton width="60%" height={14} />
          ) : (
            <AppText weight="medium" numberOfLines={1}>
              {title}
            </AppText>
          )}
          {subtitle ? (
            <AppText size="xs" tone="secondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
          {card.correctedCard ? (
            <Pill tone="success" icon="check" label={t("batchScan.corrected")} />
          ) : !isWorking && card.outcome?.matched?.lowConfidenceMatch ? (
            <Pill tone="warning" label={t("batchScan.lowConfidence")} />
          ) : null}
        </View>
        {isWorking ? null : <Icon name="edit" size={16} color={colors.foregroundSecondary} />}
      </Pressable>
    </View>
  );
}
