import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { RuleGroupEditor } from "@/features/bins/components/rule-group-editor";
import {
  binConfigSchema,
  type BinConfigFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { BinRuleGroup } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useCallback, useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";

function emptyRuleGroup(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

export function BinConfigPanel() {
  const { t } = useTranslation("bins");
  const {
    selectedConfig: config,
    save,
    clear,
    configs,
    apiDocsUrl,
    isPending,
  } = useBinConfigs();

  const form = useForm<BinConfigFormValues>({
    resolver: zodResolver(binConfigSchema) as Resolver<BinConfigFormValues>,
    defaultValues: {
      isCatchAll: false,
      rules: emptyRuleGroup(),
    },
  });

  useEffect(() => {
    form.reset({
      isCatchAll: config.isCatchAll ?? false,
      rules:
        config.rules.conditions.length > 0 ? config.rules : emptyRuleGroup(),
    });
  }, [config, form]);

  const isOnlyCatchAll =
    config.isCatchAll &&
    configs.filter((c) => c.isCatchAll && c.binNumber !== config.binNumber)
      .length === 0;

  const handleSave = useCallback(
    (values: BinConfigFormValues) => {
      if (!values.isCatchAll && isOnlyCatchAll) {
        form.setError("isCatchAll", {
          message: t("binConfigPanel.needCatchAllError"),
        });
        return;
      }
      save(config.binNumber, values.rules as BinRuleGroup, values.isCatchAll);
    },
    [config, save, isOnlyCatchAll, form, t],
  );

  const handleClear = useCallback(() => {
    if (isOnlyCatchAll) {
      form.setError("isCatchAll", {
        message: t("binConfigPanel.needCatchAllError"),
      });
      return;
    }
    form.reset({
      isCatchAll: false,
      rules: emptyRuleGroup(),
    });
    clear(config.binNumber);
  }, [config, clear, form, isOnlyCatchAll, t]);

  const isCatchAll = form.watch("isCatchAll");

  return (
    <form
      onSubmit={form.handleSubmit(handleSave)}
      className="flex flex-col"
    >
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-semibold font-heading">
          {t("binConfigPanel.binHeading", { number: config.binNumber })}
        </h2>
        <Controller
          name="isCatchAll"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={field.value ? "default" : "outline"}
                size="sm"
                onClick={() => field.onChange(!field.value)}
              >
                {field.value
                  ? t("binConfigPanel.catchAllEnabled")
                  : t("binConfigPanel.setCatchAll")}
              </Button>
              {field.value && (
                <p className="text-sm text-muted-foreground">
                  {t("binConfigPanel.catchAllDescription")}
                </p>
              )}
            </div>
          )}
        />
      </div>
      {!isCatchAll && (
        <ScrollArea>
          <div className="flex items-center justify-between mb-2">
            <Label>{t("binConfigPanel.rulesLabel")}</Label>
            {apiDocsUrl && (
              <a
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("binConfigPanel.apiDocsLink")}
              </a>
            )}
          </div>
          <Controller
            name="rules"
            control={form.control}
            render={({ field }) => (
              <RuleGroupEditor
                group={field.value as BinRuleGroup}
                onChange={field.onChange}
              />
            )}
          />
        </ScrollArea>
      )}
      {form.formState.errors.isCatchAll && (
        <FieldError errors={[form.formState.errors.isCatchAll]} />
      )}
      {form.formState.errors.rules && (
        <FieldError errors={[form.formState.errors.rules]} />
      )}
      <div className="flex gap-2 mt-2 justify-end">
        <Button
          type="button"
          variant="destructive"
          onClick={handleClear}
          disabled={isPending}
        >
          {t("binConfigPanel.clear")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <IconLoader2 className="size-4 animate-spin" />}
          {t("binConfigPanel.save")}
        </Button>
      </div>
    </form>
  );
}
