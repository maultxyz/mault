import { useTranslation } from "react-i18next";
import { ListGroup } from "@/components/ui/list-group";
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
    </ListGroup>
  );
}
