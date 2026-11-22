import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { ViewTabs } from "@/components/view-tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { setCardCost, setCardSellPrice } from "@/features/business/api/business";
import { useBusinessAccess, useBusinessAction } from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { usePriceSource } from "@/hooks/use-price-source";
import {
  CARD_COST_FORM_DEFAULT_VALUES,
  SELL_PRICE_EXAMPLE_MARKET_PRICE,
  SELL_PRICE_FORM_DEFAULT_VALUES,
  SET_PRICES_TABS,
} from "@/lib/constants/business";
import type {
  SetPricesDialogProps,
  SetPricesFormsProps,
  SetPricesTab,
  SetPricesTabFormProps,
} from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import {
  CARD_COST_MODES,
  cardCostFormSchema,
  cardSellPrice,
  DEFAULT_SELL_PRICE_CONFIG,
  EMPTY_CARD_SELL_RULE,
  SELL_PRICE_MODES,
  sellPriceFormSchema,
  type CardCostFormValues,
  type CardSellPriceRequest,
  type CardSellRule,
  type SellPriceFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

function sellFormValuesOf(rule: CardSellRule | undefined, defaultMarkupPercent: number): SellPriceFormValues {
  if (rule?.fixedPrice != null) {
    return { mode: "fixed", markupPercent: defaultMarkupPercent, fixedPrice: rule.fixedPrice };
  }
  if (rule?.markupPercent != null) {
    return { ...SELL_PRICE_FORM_DEFAULT_VALUES, mode: "markup", markupPercent: rule.markupPercent };
  }
  return { ...SELL_PRICE_FORM_DEFAULT_VALUES, markupPercent: defaultMarkupPercent };
}

function sellPriceRequestOf(scanIds: string[], values: SellPriceFormValues): CardSellPriceRequest {
  switch (values.mode) {
    case "default":
      return { scanIds, mode: "default" };
    case "markup":
      return { scanIds, mode: "markup", markupPercent: values.markupPercent };
    case "fixed":
      return { scanIds, mode: "fixed", fixedPrice: values.fixedPrice };
  }
}

function SellPriceForm({ scanIds, sellRule, onDone }: SetPricesTabFormProps) {
  const { t } = useTranslation("business");
  const { settings } = useBusinessAccess();
  const run = useBusinessAction();
  const { format } = usePriceSource();
  const formId = useId();
  const markupId = useId();
  const fixedId = useId();
  const sellConfig = settings?.sell ?? DEFAULT_SELL_PRICE_CONFIG;
  const form = useForm<SellPriceFormValues>({
    resolver: zodResolver(sellPriceFormSchema),
    defaultValues: sellFormValuesOf(sellRule, sellConfig.defaultMarkupPercent),
  });
  const sellMode = useWatch({ control: form.control, name: "mode" });
  const markupPercent = useWatch({ control: form.control, name: "markupPercent" });
  const fixedPrice = useWatch({ control: form.control, name: "fixedPrice" });

  const submit = async (values: SellPriceFormValues) => {
    const result = await run(() => setCardSellPrice(sellPriceRequestOf(scanIds, values)));
    if (!result) return;
    toast.success(t("setPrices.sell.applied", { count: result.data?.updated ?? scanIds.length }));
    onDone();
  };

  const exampleRule: CardSellRule =
    sellMode === "markup"
      ? { ...EMPTY_CARD_SELL_RULE, markupPercent: Number.isFinite(markupPercent) ? markupPercent : 0 }
      : EMPTY_CARD_SELL_RULE;
  const examplePrice = cardSellPrice(SELL_PRICE_EXAMPLE_MARKET_PRICE, exampleRule, sellConfig, "");

  return (
    <>
      <form
        id={formId}
        className="flex flex-col gap-4 md:gap-2"
        onSubmit={form.handleSubmit(submit)}
      >
        <Controller
          control={form.control}
          name="mode"
          render={({ field }) => (
            <ResponsiveSegmented
              label={t("setPrices.sell.modeLabel")}
              items={SELL_PRICE_MODES.map((option) => ({
                key: option,
                label: t(`setPrices.sell.modes.${option}`),
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {sellMode === "markup" && (
          <Controller
            control={form.control}
            name="markupPercent"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor={markupId}>{t("setPrices.sell.markupLabel")}</FieldLabel>
                <NumberInput
                  id={markupId}
                  step={1}
                  className="w-28 tabular-nums"
                  aria-invalid={fieldState.invalid}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value}
                  onChange={field.onChange}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
        {sellMode === "fixed" && (
          <Controller
            control={form.control}
            name="fixedPrice"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor={fixedId}>{t("setPrices.sell.fixedLabel")}</FieldLabel>
                <NumberInput
                  id={fixedId}
                  min={0}
                  step={0.01}
                  className="w-32 tabular-nums"
                  aria-invalid={fieldState.invalid}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value}
                  onChange={field.onChange}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
        <p className="text-xs text-foreground/70">
          {sellMode === "fixed"
            ? t("setPrices.sell.fixedExample", {
                price: format(Number.isFinite(fixedPrice) ? fixedPrice : 0),
              })
            : t("setPrices.sell.example", {
                market: format(SELL_PRICE_EXAMPLE_MARKET_PRICE),
                price: format(examplePrice ?? 0),
              })}
        </p>
        {sellMode === "default" && (
          <p className="text-xs text-foreground/70">
            {t("setPrices.sell.defaultHint", { percent: sellConfig.defaultMarkupPercent })}
          </p>
        )}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {t("actions.back")}
        </Button>
        <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
          {t("setPrices.sell.apply", { count: scanIds.length })}
        </Button>
      </DialogFooter>
    </>
  );
}

function CardCostForm({ scanIds, onDone }: SetPricesTabFormProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const formId = useId();
  const amountId = useId();
  const form = useForm<CardCostFormValues>({
    resolver: zodResolver(cardCostFormSchema),
    defaultValues: CARD_COST_FORM_DEFAULT_VALUES,
  });
  const costMode = useWatch({ control: form.control, name: "mode" });

  const submit = async (values: CardCostFormValues) => {
    const result = await run(() => setCardCost({ scanIds, ...values }));
    if (!result) return;
    toast.success(t("setPrices.cost.applied", { count: result.data?.updated ?? 0 }));
    onDone();
  };

  return (
    <>
      <form
        id={formId}
        className="flex flex-col gap-4 md:gap-2"
        onSubmit={form.handleSubmit(submit)}
      >
        <Controller
          control={form.control}
          name="mode"
          render={({ field }) => (
            <ResponsiveSegmented
              label={t("setPrices.cost.modeLabel")}
              items={CARD_COST_MODES.map((option) => ({
                key: option,
                label: t(`setPrices.cost.modes.${option}`),
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <p className="text-xs text-foreground/70">{t(`setPrices.cost.modeHints.${costMode}`)}</p>
        <Controller
          control={form.control}
          name="amount"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={amountId}>
                {t(`setPrices.cost.amountLabels.${costMode}`)}
              </FieldLabel>
              <NumberInput
                id={amountId}
                min={0}
                step={0.01}
                className="w-32 tabular-nums"
                aria-invalid={fieldState.invalid}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value}
                onChange={field.onChange}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <p className="text-xs text-foreground/70">{t("setPrices.cost.intakeNote")}</p>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {t("actions.back")}
        </Button>
        <Button type="submit" form={formId} disabled={form.formState.isSubmitting}>
          {t("setPrices.cost.apply", { count: scanIds.length })}
        </Button>
      </DialogFooter>
    </>
  );
}

function SetPricesForms({
  scanIds,
  tabs,
  initialTab,
  sellRule,
  onDone,
}: SetPricesFormsProps) {
  const { t } = useTranslation("business");
  const [tab, setTab] = useState<SetPricesTab>(
    initialTab && tabs.includes(initialTab) ? initialTab : tabs[0],
  );

  return (
    <>
      {tabs.length > 1 && (
        <ViewTabs
          label={t("setPrices.tabsLabel")}
          fill
          items={SET_PRICES_TABS.filter((key) => tabs.includes(key)).map((key) => ({
            key,
            label: t(`setPrices.tabs.${key}`),
          }))}
          value={tab}
          onChange={setTab}
        />
      )}
      {tab === "sell" ? (
        <SellPriceForm key="sell" scanIds={scanIds} sellRule={sellRule} onDone={onDone} />
      ) : (
        <CardCostForm key="cost" scanIds={scanIds} onDone={onDone} />
      )}
    </>
  );
}

export function SetPricesDialog({
  scanIds,
  open,
  onOpenChange,
  tabs,
  initialTab,
  sellRule,
}: SetPricesDialogProps) {
  const { t } = useTranslation("business");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("setPrices.title", { count: scanIds.length })}</DialogTitle>
          <DialogDescription>{t("setPrices.description")}</DialogDescription>
        </DialogHeader>
        {open && tabs.length > 0 && (
          <SetPricesForms
            scanIds={scanIds}
            tabs={tabs}
            initialTab={initialTab}
            sellRule={sellRule}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
