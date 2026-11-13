import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { syncCardById } from "@/features/admin/api/cards-sync";
import { CardsSyncSourceFields } from "@/features/admin/components/cards-sync-source-fields";
import { ADMIN_CARDS_QUERY_KEY, ADMIN_DEFAULT_SYNC_LANGUAGE } from "@/lib/constants/admin-cards";
import { SPACING } from "@/lib/constants/theme";
import type { CardsSyncByIdPanelProps, CardsSyncSourceSelection } from "@/lib/interfaces/admin-cards";

export function CardsSyncByIdPanel({ sources }: CardsSyncByIdPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<CardsSyncSourceSelection>({ gameKey: null, lang: ADMIN_DEFAULT_SYNC_LANGUAGE });
  const [cardIdText, setCardIdText] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const trimmedCardId = cardIdText.trim();

  const syncCard = useMutation({
    mutationFn: syncCardById,
    onMutate: () => setResultMessage(null),
    onSuccess: (message) => {
      setResultMessage(message);
      setCardIdText("");
      AccessibilityInfo.announceForAccessibility(message);
      void queryClient.invalidateQueries({ queryKey: ADMIN_CARDS_QUERY_KEY });
    },
  });

  return (
    <Surface style={{ gap: SPACING.md }}>
      <View>
        <AppText heading weight="semibold" accessibilityRole="header">
          {t("admin.cards.syncCardById.heading")}
        </AppText>
        <AppText size="xs" tone="secondary">
          {t("admin.cards.syncCardById.description")}
        </AppText>
      </View>
      <CardsSyncSourceFields sources={sources} selection={selection} onChange={setSelection} />
      <TextField
        label={t("admin.cards.syncCardById.cardIdLabel")}
        placeholder={t("admin.cards.syncCardById.cardIdPlaceholder")}
        value={cardIdText}
        onChangeText={setCardIdText}
        autoCapitalize="none"
        autoComplete="off"
      />
      {resultMessage ? <Callout tone="success" title={resultMessage} /> : null}
      {syncCard.isError ? (
        <Callout
          tone="destructive"
          title={t("admin.cards.syncCardById.failed", { id: syncCard.variables?.cardId ?? "" })}
          description={syncCard.error.message}
        />
      ) : null}
      <Button
        label={syncCard.isPending ? t("admin.cards.syncCardById.syncing") : t("admin.cards.syncCardById.syncButton")}
        loading={syncCard.isPending}
        disabled={!selection.gameKey || !trimmedCardId || syncCard.isPending}
        onPress={() => {
          if (!selection.gameKey || !trimmedCardId) return;
          syncCard.mutate({ gameKey: selection.gameKey, cardId: trimmedCardId, lang: selection.lang });
        }}
      />
    </Surface>
  );
}
