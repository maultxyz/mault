import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeviceCommand } from "@/features/admin/api/use-device-command";
import { DeviceCommandFieldInput } from "@/features/admin/components/device-command-field-input";
import { DeviceCommandOutcome } from "@/features/admin/components/device-command-outcome";
import { defaultCommandValues } from "@/features/admin/lib/device-playground";
import type {
  DeviceCommandCardProps,
  DeviceCommandValues,
} from "@/lib/interfaces/device-playground";
import { createDeviceCommandSchema } from "@/schemas/device-playground.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FIRMWARE_FEATURE_MIN_VERSIONS } from "@magic-vault/shared";
import { IconLoader2, IconSend } from "@tabler/icons-react";
import { useMemo } from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { useTranslation } from "react-i18next";

export function DeviceCommandCard({
  command,
  disabled,
}: DeviceCommandCardProps) {
  const { t } = useTranslation("admin");
  const { send, outcome, isSending } = useDeviceCommand();
  const schema = useMemo(
    () => createDeviceCommandSchema(command.fields),
    [command.fields],
  );
  const form = useForm<DeviceCommandValues>({
    resolver: zodResolver(schema) as Resolver<DeviceCommandValues>,
    defaultValues: defaultCommandValues(command.fields),
  });
  const values = useWatch({ control: form.control }) as DeviceCommandValues;
  const preview = JSON.stringify(command.build(values));

  const onSubmit = (submitted: DeviceCommandValues) =>
    send(command.build(submitted), command.timeoutMs);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3 rounded-lg border p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm font-semibold">
                {command.command}
              </code>
              {command.feature && (
                <Badge variant="outline">
                  {FIRMWARE_FEATURE_MIN_VERSIONS[command.feature]}+
                </Badge>
              )}
            </div>
            <p className="text-xs text-foreground/70">
              {t(`devicePlayground.commands.${command.id}`)}
            </p>
          </div>
          <Button type="submit" size="sm" disabled={disabled || isSending}>
            {isSending ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconSend />
            )}
            {isSending
              ? t("devicePlayground.sending")
              : t("devicePlayground.send")}
          </Button>
        </div>

        {command.fields.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {command.fields.map((field) => (
              <DeviceCommandFieldInput
                key={field.name}
                commandId={command.id}
                field={field}
                disabled={disabled || isSending}
              />
            ))}
          </div>
        )}

        <code className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground break-all">
          {preview}
        </code>

        {outcome && <DeviceCommandOutcome outcome={outcome} />}
      </form>
    </FormProvider>
  );
}
