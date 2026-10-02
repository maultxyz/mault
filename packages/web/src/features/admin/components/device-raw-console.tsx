import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeviceCommand } from "@/features/admin/api/use-device-command";
import { DeviceCommandOutcome } from "@/features/admin/components/device-command-outcome";
import { DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS } from "@/lib/constants/device-playground";
import type { DeviceRawConsoleProps } from "@/lib/interfaces/device-playground";
import {
  deviceRawCommandSchema,
  type DeviceRawCommandValues,
} from "@/schemas/device-playground.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2, IconSend } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function DeviceRawConsole({ disabled }: DeviceRawConsoleProps) {
  const { t } = useTranslation("admin");
  const { send, outcome, isSending } = useDeviceCommand();
  const form = useForm<DeviceRawCommandValues>({
    resolver: zodResolver(deviceRawCommandSchema),
    defaultValues: {
      line: '{"getStatus": true}',
      timeoutMs: DEVICE_PLAYGROUND_DEFAULT_TIMEOUT_MS,
    },
  });
  const lineError = form.formState.errors.line?.message;

  return (
    <SettingsSection
      heading={t("devicePlayground.raw.heading")}
      description={t("devicePlayground.raw.description")}
    >
      <form
        onSubmit={form.handleSubmit((values) =>
          send(values.line, values.timeoutMs),
        )}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="device-raw-line">
              {t("devicePlayground.raw.line")}
            </Label>
            <Input
              id="device-raw-line"
              className="font-mono text-xs"
              spellCheck={false}
              autoComplete="off"
              disabled={disabled || isSending}
              {...form.register("line")}
            />
          </div>
          <div className="flex flex-col gap-1 sm:w-32">
            <Label htmlFor="device-raw-timeout">
              {t("devicePlayground.raw.timeout")}
            </Label>
            <Controller
              control={form.control}
              name="timeoutMs"
              render={({ field }) => (
                <Input
                  id="device-raw-timeout"
                  type="number"
                  className="font-mono text-xs"
                  disabled={disabled || isSending}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? Number.NaN
                        : Number(e.target.value),
                    )
                  }
                />
              )}
            />
          </div>
          <Button type="submit" disabled={disabled || isSending}>
            {isSending ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconSend />
            )}
            {t("devicePlayground.send")}
          </Button>
        </div>
        {lineError && <p className="text-xs text-destructive">{lineError}</p>}
        {outcome && <DeviceCommandOutcome outcome={outcome} />}
      </form>
    </SettingsSection>
  );
}
