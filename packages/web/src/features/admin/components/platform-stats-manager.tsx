import { Callout } from "@/components/callout";
import { ListSkeleton } from "@/components/list-skeleton";
import { SaveBar } from "@/components/save-bar";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { usePlatformStatsDraft } from "@/features/admin/api/use-platform-stats-draft";
import { DiscordGuildSelect } from "@/features/admin/components/discord-guild-select";
import { DiscordChannelSelect } from "@/features/integrations/components/discord-channel-select";
import { PLATFORM_STATS_SCRIPT_COMMAND } from "@/lib/constants/admin";
import { PLATFORM_STAT_KEYS } from "@magic-vault/shared";
import { IconLoader2, IconSend } from "@tabler/icons-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PlatformStatsManager() {
  const { t, i18n } = useTranslation("admin");
  const {
    form,
    data,
    guild,
    isGuildLoading,
    isLoading,
    isPosting,
    save,
    postNow,
  } = usePlatformStatsDraft();
  const { isDirty, isSubmitting } = form.formState;

  if (isLoading || !data) {
    return (
      <SettingsSection heading={t("platformStats.destinationHeading")}>
        <ListSkeleton />
      </SettingsSection>
    );
  }

  const saved = data.settings;
  const canPost =
    !isDirty && !!saved.guildId && !!saved.channelId && saved.stats.length > 0;

  return (
    <form id="platform-stats-form" onSubmit={save} className="contents">
      {!data.botReachable && (
        <Callout variant="warning">{t("platformStats.botUnreachable")}</Callout>
      )}

      <SettingsSection
        heading={t("platformStats.destinationHeading")}
        description={t("platformStats.destinationDescription")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("platformStats.server")}</Label>
            <Controller
              control={form.control}
              name="guildId"
              render={({ field }) => (
                <DiscordGuildSelect
                  value={field.value}
                  guilds={data.guilds}
                  emptyLabel={t("platformStats.noServer")}
                  disabled={!data.botReachable}
                  onChange={(next) => {
                    field.onChange(next);
                    form.setValue("channelId", null, { shouldDirty: true });
                  }}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("platformStats.channel")}</Label>
            <Controller
              control={form.control}
              name="channelId"
              render={({ field }) => (
                <DiscordChannelSelect
                  value={field.value}
                  channels={guild?.channels ?? []}
                  emptyLabel={
                    isGuildLoading
                      ? t("platformStats.loadingChannels")
                      : t("platformStats.noChannel")
                  }
                  disabled={!guild || isGuildLoading}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        heading={t("platformStats.statsHeading")}
        description={t("platformStats.statsDescription")}
      >
        <Controller
          control={form.control}
          name="stats"
          render={({ field }) => (
            <div className="divide-y rounded-lg border">
              {PLATFORM_STAT_KEYS.map((key) => {
                const id = `platform-stat-${key}`;
                return (
                  <div key={key} className="flex items-start gap-3 px-3 py-2.5">
                    <Checkbox
                      id={id}
                      checked={field.value.includes(key)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          PLATFORM_STAT_KEYS.filter((k) =>
                            k === key ? checked : field.value.includes(k),
                          ),
                        )
                      }
                      className="mt-0.5"
                    />
                    <label htmlFor={id} className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">
                        {t(`platformStats.stats.${key}.label`)}
                      </span>
                      <span className="text-xs text-foreground/70">
                        {t(`platformStats.stats.${key}.description`)}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        />
      </SettingsSection>

      <SettingsSection
        heading={t("platformStats.scheduleHeading")}
        description={t("platformStats.scheduleDescription")}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPost || isPosting}
            onClick={postNow}
          >
            {isPosting ? <IconLoader2 className="animate-spin" /> : <IconSend />}
            {t("platformStats.postNow")}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <pre className="overflow-x-auto rounded-lg border bg-muted px-3 py-2 text-xs">
            <code>{PLATFORM_STATS_SCRIPT_COMMAND}</code>
          </pre>
          <p className="text-xs text-foreground/70">
            {data.lastPostedAt
              ? t("platformStats.lastPosted", {
                  date: new Date(data.lastPostedAt).toLocaleString(
                    i18n.language,
                    { dateStyle: "medium", timeStyle: "short" },
                  ),
                })
              : t("platformStats.neverPosted")}
          </p>
          {isDirty && (
            <p className="text-xs text-foreground/70">
              {t("platformStats.saveBeforePosting")}
            </p>
          )}
        </div>
      </SettingsSection>

      <SaveBar
        show={isDirty}
        formId="platform-stats-form"
        isSaving={isSubmitting}
        onDiscard={() => form.reset()}
      />
      <UnsavedChangesGuard isDirty={isDirty} />
    </form>
  );
}
