import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switch-row";
import { LoadingLogo } from "@/components/ui/loading-logo";
import { LOADING_LOGO_INLINE_SIZE } from "@/lib/constants/loading";
import { SPACING } from "@/lib/constants/theme";
import type { ExportSheetProps } from "@/lib/interfaces/cards";

export function ExportSheet({
  visible,
  title,
  adapters,
  loading,
  exporting,
  failed,
  combineDuplicates,
  onCombineDuplicatesChange,
  onExport,
  onClose,
}: ExportSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={title} contentContainerStyle={{ gap: SPACING.md }}>
      {failed ? <Callout tone="destructive" title={t("export.failed")} /> : null}
      <SwitchRow
        title={t("export.combineDuplicates")}
        value={combineDuplicates}
        onValueChange={onCombineDuplicatesChange}
      />
      {loading || exporting ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.md }}>
          <LoadingLogo size={LOADING_LOGO_INLINE_SIZE} />
          <AppText size="sm" tone="secondary">
            {exporting ? t("export.exporting") : t("export.loading")}
          </AppText>
        </View>
      ) : (
        <ListGroup>
          {adapters.map((adapter) => (
            <ListRow
              key={adapter.key}
              icon="upload"
              title={adapter.label}
              disabled={exporting}
              onPress={() => onExport(adapter)}
            />
          ))}
        </ListGroup>
      )}
    </Sheet>
  );
}
