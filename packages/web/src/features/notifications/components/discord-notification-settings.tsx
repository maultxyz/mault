import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconBrandDiscord } from "@tabler/icons-react";
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
  const { settings, isLoading, save, isLinked, sendTest, isTesting, testingType } =
    useNotificationSettings();

  const canTest = isLinked && !isTesting && !isLoading;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <IconBrandDiscord className="size-4" />
        <Label>{t("discordNotifications.heading")}</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("discordNotifications.description")}
      </p>
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm">
            {t("discordNotifications.notifyToggleLabel")}
          </span>
          <span className="text-sm text-muted-foreground">
            {t("discordNotifications.notifyToggleDescription")}
          </span>
        </span>
        <Switch
          checked={settings.discordNotifyOnScan}
          disabled={isLoading}
          onCheckedChange={(checked) => save({ discordNotifyOnScan: checked })}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm text-muted-foreground">
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
