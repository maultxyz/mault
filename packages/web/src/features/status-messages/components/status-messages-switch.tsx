import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useStatusMessageSettings } from "@/features/status-messages/api/status-messages";
import { ACCOUNT_PATH } from "@/lib/constants/nav";
import type { StatusMessagesSwitchProps } from "@/lib/interfaces/status-messages";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function StatusMessagesSwitch({ kind }: StatusMessagesSwitchProps) {
  const { t } = useTranslation("common");
  const switchId = useId();
  const descriptionId = useId();
  const { settings, update } = useStatusMessageSettings();
  if (!settings.data?.isAvailable) return null;
  const { isDiscordLinked } = settings.data;

  return (
    <Field orientation="horizontal" className="rounded-card bg-card p-3 md:p-2.5">
      <FieldContent>
        <FieldLabel htmlFor={switchId}>{t(`statusMessages.${kind}.label`)}</FieldLabel>
        <FieldDescription id={descriptionId}>
          {isDiscordLinked ? (
            t("statusMessages.description")
          ) : (
            <>
              {t("statusMessages.linkDiscord")}{" "}
              <Link to={ACCOUNT_PATH} className="underline underline-offset-2">
                {t("statusMessages.openAccount")}
              </Link>
            </>
          )}
        </FieldDescription>
      </FieldContent>
      <Switch
        id={switchId}
        aria-describedby={descriptionId}
        checked={isDiscordLinked && settings.data[kind]}
        disabled={!isDiscordLinked}
        onCheckedChange={(isEnabled) => update.mutate({ kind, isEnabled })}
      />
    </Field>
  );
}
