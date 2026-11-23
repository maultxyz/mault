import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { SwitchRow } from "@/components/ui/switch-row";
import { useStatusMessageSettings } from "@/features/status-messages/api/status-messages";
import type { StatusMessagesSwitchProps } from "@/lib/interfaces/status-messages";

export function StatusMessagesSwitch({ kind }: StatusMessagesSwitchProps) {
  const { t } = useTranslation();
  const { settings, update } = useStatusMessageSettings();
  if (!settings.data?.isAvailable) return null;
  const { isDiscordLinked } = settings.data;

  return (
    <ListGroup>
      <SwitchRow
        title={t(`statusMessages.${kind}.label`)}
        description={isDiscordLinked ? t("statusMessages.description") : t("statusMessages.linkDiscord")}
        value={isDiscordLinked && settings.data[kind]}
        disabled={!isDiscordLinked}
        onValueChange={(isEnabled) => update.mutate({ kind, isEnabled })}
      />
      {isDiscordLinked ? null : (
        <ListRow icon="discord" title={t("statusMessages.openProfile")} onPress={() => router.push("/profile")} />
      )}
    </ListGroup>
  );
}
