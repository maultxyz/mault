import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DiscordSettingsDraftValues } from "@/schemas/discord-settings-draft.schema";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { NotificationTestType } from "../api/notification-settings";
import { useNotificationSettings } from "../api/use-notification-settings";

const TEST_TYPES: NotificationTestType[] = [
  "sorter-error",
  "feeder-empty",
  "card-jam",
  "card-search-error",
  "sync-failure",
];

export function DiscordNotificationSettings() {
  const { t } = useTranslation("notifications");
  const { isLoading, isLinked, sendTest, isTesting, testingType } =
    useNotificationSettings();
  const { control, formState } = useFormContext<DiscordSettingsDraftValues>();
  const notifyOnScan = useWatch({ control, name: "discordNotifyOnScan" });
  const disabled = isLoading || formState.isSubmitting;

  const canTest = isLinked && !isTesting && !isLoading;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm">
            {t("discordNotifications.notifyToggleLabel")}
          </span>
          <span className="text-xs text-foreground/70">
            {t("discordNotifications.notifyToggleDescription")}
          </span>
        </span>
        <Controller
          control={control}
          name="discordNotifyOnScan"
          render={({ field }) => (
            <Switch
              checked={field.value}
              disabled={disabled}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm">
            {t("discordNotifications.threadToggleLabel")}
          </span>
          <span className="text-xs text-foreground/70">
            {t("discordNotifications.threadToggleDescription")}
          </span>
        </span>
        <Controller
          control={control}
          name="discordScanUseThreads"
          render={({ field }) => (
            <Switch
              checked={field.value}
              disabled={disabled || !notifyOnScan}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm text-foreground/70">
          {isLinked
            ? t("discordNotifications.testHintReady")
            : t("discordNotifications.testHintNotLinked")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {TEST_TYPES.map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => sendTest(type)}
              disabled={!canTest}
            >
              {isTesting && testingType === type
                ? t("discordNotifications.sending")
                : t(`discordNotifications.testTypes.${type}`)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
