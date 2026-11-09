import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { formatDateTime } from "@/lib/dates";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { DeletedItemRowProps } from "@/lib/interfaces/admin-deleted";

export function DeletedItemRow({ item, isRestoring, isRestoreDisabled, onRestore }: DeletedItemRowProps) {
  const { t, i18n } = useTranslation();
  const details = [
    item.detail,
    item.orgName ?? t("admin.deleted.global"),
    t("admin.deleted.lastUpdated", { date: formatDateTime(item.updatedAt, i18n.language) }),
  ].filter(Boolean);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: SPACING.md,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: SPACING.xs }}>
        <AppText weight="medium" numberOfLines={2}>
          {item.name}
        </AppText>
        <Pill label={t(`admin.deleted.types.${item.type}`)} />
        {details.map((detail) => (
          <AppText key={detail} size="xs" tone="secondary" numberOfLines={2}>
            {detail}
          </AppText>
        ))}
      </View>
      <Button
        label={t("admin.deleted.restore")}
        accessibilityLabel={t("admin.deleted.restoreItem", { name: item.name })}
        icon="restore"
        variant="secondary"
        size="sm"
        loading={isRestoring}
        disabled={isRestoreDisabled}
        onPress={() => onRestore(item)}
      />
    </View>
  );
}
