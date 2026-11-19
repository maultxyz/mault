import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRawSerialConsole } from "@/features/admin/api/use-raw-serial-console";
import {
  parseRawCommandObject,
  rawCommandFormSchema,
} from "@/features/admin/lib/raw-command";
import { RAW_COMMAND_PRESETS } from "@/lib/constants/kit-test";
import type {
  KitRawCommandConsoleProps,
  RawCommandFormValues,
  RawCommandHistoryRowProps,
} from "@/lib/interfaces/kit-test";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconHandStop, IconSend, IconTrash } from "@tabler/icons-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function KitRawCommandConsole({ disabled }: KitRawCommandConsoleProps) {
  const { t } = useTranslation("admin");
  const { history, isSending, sendCommand, stopAllServos, clearHistory } =
    useRawSerialConsole();
  const commandFieldId = useId();
  const commandHintId = useId();
  const presetsLabelId = useId();
  const historyLabelId = useId();
  const form = useForm<RawCommandFormValues>({
    resolver: zodResolver(rawCommandFormSchema),
    defaultValues: { command: "" },
  });
  const locked = disabled || isSending;

  async function handleSubmit(values: RawCommandFormValues) {
    const command = parseRawCommandObject(values.command);
    if (command) await sendCommand(command);
  }

  function fillPreset(command: Record<string, unknown>) {
    form.setValue("command", JSON.stringify(command), {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setFocus("command");
  }

  return (
    <SettingsSection
      heading={t("kitTest.rawCommands.heading")}
      description={t("kitTest.rawCommands.description")}
      action={
        <Button
          variant="destructive"
          disabled={disabled}
          onClick={() => void stopAllServos()}
        >
          <IconHandStop />
          {t("kitTest.rawCommands.stopAll")}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <Label id={presetsLabelId}>{t("kitTest.rawCommands.presets")}</Label>
        <div
          role="group"
          aria-labelledby={presetsLabelId}
          className="flex flex-wrap gap-1.5"
        >
          {RAW_COMMAND_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant="outline"
              disabled={disabled}
              onClick={() => fillPreset(preset.command)}
            >
              {t(`kitTest.rawCommands.preset.${preset.key}`)}
            </Button>
          ))}
        </div>
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <Field data-invalid={!!form.formState.errors.command}>
          <FieldLabel htmlFor={commandFieldId}>
            {t("kitTest.rawCommands.command")}
          </FieldLabel>
          <Textarea
            id={commandFieldId}
            className="font-mono"
            placeholder='{"channel": 0, "value": 305}'
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby={commandHintId}
            disabled={disabled}
            {...form.register("command")}
          />
          <FieldDescription id={commandHintId}>
            {t("kitTest.rawCommands.commandHint")}
          </FieldDescription>
          <FieldError errors={[form.formState.errors.command]} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={locked}>
            <IconSend />
            {t("kitTest.rawCommands.send")}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5">
          <Label id={historyLabelId}>{t("kitTest.rawCommands.history")}</Label>
          <Button
            variant="ghost"
            disabled={history.length === 0}
            onClick={clearHistory}
          >
            <IconTrash />
            {t("kitTest.rawCommands.clear")}
          </Button>
        </div>
        <ol
          role="log"
          aria-labelledby={historyLabelId}
          className="flex max-h-80 flex-col overflow-y-auto rounded-lg bg-foreground/6 font-mono text-xs"
        >
          {history.length === 0 ? (
            <li className="px-2 py-1.5 font-sans text-foreground/70">
              {t("kitTest.rawCommands.empty")}
            </li>
          ) : (
            history.map((entry) => (
              <RawCommandHistoryRow key={entry.id} entry={entry} />
            ))
          )}
        </ol>
      </div>
    </SettingsSection>
  );
}

function RawCommandHistoryRow({ entry }: RawCommandHistoryRowProps) {
  const { t } = useTranslation("admin");
  const replyIsError = entry.reply?.includes('"error"') ?? false;
  const succeeded = entry.status === "ok" && !replyIsError;

  return (
    <li className="flex flex-col gap-1 border-b border-border px-2 py-1.5 last:border-b-0">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-foreground/70">
          {new Date(entry.sentAt).toLocaleTimeString()}
        </span>
        <span className="sr-only">{t("kitTest.rawCommands.sent")}</span>
        <span aria-hidden className="shrink-0 text-primary">
          →
        </span>
        <span className="min-w-0 break-all">{entry.command}</span>
        <Badge
          variant={succeeded ? "success" : "destructive"}
          className="ml-auto shrink-0"
        >
          {succeeded
            ? t("kitTest.status.ok")
            : t("kitTest.rawCommands.failed")}
        </Badge>
      </div>
      {entry.reply !== null && (
        <div className="flex items-start gap-2">
          <span className="sr-only">{t("kitTest.rawCommands.reply")}</span>
          <span aria-hidden className="shrink-0 text-success-foreground">
            ←
          </span>
          <span className="min-w-0 break-all">{entry.reply}</span>
        </div>
      )}
      {entry.status !== "ok" && (
        <p className="font-sans text-foreground/70">
          {t(`kitTest.status.${entry.status}`)}
        </p>
      )}
    </li>
  );
}
