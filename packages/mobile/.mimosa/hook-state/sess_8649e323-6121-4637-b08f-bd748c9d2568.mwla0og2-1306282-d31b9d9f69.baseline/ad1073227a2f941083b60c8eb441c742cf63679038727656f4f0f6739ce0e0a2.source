import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { SPACING } from "@/lib/constants/theme";
import type { CardsTypedConfirmPanelProps } from "@/lib/interfaces/admin-cards";
import { SettingsSection } from "@/features/settings/components/settings-section";

export function CardsTypedConfirmPanel({
  title,
  description,
  expectedText,
  confirmLabel,
  isConfirming,
  onConfirm,
  onCancel,
}: CardsTypedConfirmPanelProps) {
  const { t } = useTranslation();
  const [typedText, setTypedText] = useState("");
  return (
    <SettingsSection title={title} description={description}>
      <Surface style={{ gap: SPACING.md }}>
        <TextField
          label={t("admin.cards.typeToConfirm", { text: expectedText })}
          placeholder={expectedText}
          value={typedText}
          onChangeText={setTypedText}
          autoCapitalize="none"
          autoComplete="off"
        />
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button style={{ flex: 1 }} variant="ghost" label={t("admin.cards.cancel")} disabled={isConfirming} onPress={onCancel} />
          <Button
            style={{ flex: 1 }}
            variant="destructive"
            label={confirmLabel}
            loading={isConfirming}
            disabled={typedText !== expectedText}
            onPress={onConfirm}
          />
        </View>
      </Surface>
    </SettingsSection>
  );
}
