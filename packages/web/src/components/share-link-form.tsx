import { Callout } from "@/components/callout";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { billingQueryOptions } from "@/features/billing/api/billing";
import { useOrg } from "@/features/companies/api/use-organization";
import type { ShareLinkFormProps } from "@/lib/interfaces/share-links";
import { MONITOR_LINK_EXPIRY_DAYS } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ShareLinkForm({ formId, form, onSubmit }: ShareLinkFormProps) {
  const { t } = useTranslation("common");
  const expirySelectId = useId();
  const showPricesId = useId();
  const showPricesDescriptionId = useId();
  const purpose = useWatch({ control: form.control, name: "purpose" });
  const { activeOrg } = useOrg();
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  const isOneHourLink = purpose === "trade" || billing?.longShareLinks === false;
  const expiryLabel = (days: number) =>
    t("shareLink.expiryOption", { count: days });

  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <Controller
        name="purpose"
        control={form.control}
        render={({ field }) => (
          <Field>
            <p className="text-control font-medium" aria-hidden>
              {t("shareLink.typeLabel")}
            </p>
            <ResponsiveSegmented
              label={t("shareLink.typeLabel")}
              value={field.value}
              onChange={field.onChange}
              items={[
                { key: "view", label: t("shareLink.monitorType") },
                { key: "trade", label: t("shareLink.tradeType") },
              ]}
            />
            <FieldDescription>
              {field.value === "trade"
                ? t("shareLink.tradeTypeDescription")
                : t("shareLink.monitorTypeDescription")}
            </FieldDescription>
          </Field>
        )}
      />
      {isOneHourLink && (
        <Callout variant="info">
          {purpose === "trade"
            ? t("shareLink.tradeOneHourNote")
            : t("shareLink.monitorOneHourNote")}
        </Callout>
      )}
      {!isOneHourLink && (
        <Controller
          name="expiresInDays"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={expirySelectId}>
                {t("shareLink.expiryLabel")}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={expirySelectId}>
                  <SelectValue>{expiryLabel(Number(field.value))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONITOR_LINK_EXPIRY_DAYS.map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {expiryLabel(days)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
      )}
      <Controller
        name="showPrices"
        control={form.control}
        render={({ field }) => (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={showPricesId}>
                {t("shareLink.showPrices")}
              </FieldLabel>
              <FieldDescription id={showPricesDescriptionId}>
                {t("shareLink.showPricesDescription")}
              </FieldDescription>
            </FieldContent>
            <Switch
              id={showPricesId}
              aria-describedby={showPricesDescriptionId}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </Field>
        )}
      />
    </form>
  );
}
