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
import { useShareLinkLengths } from "@/features/share-links/api/use-share-link-lengths";
import type { ShareLinkFormProps } from "@/lib/interfaces/share-links";
import {
  HOURS_PER_DAY,
  longestMonitorLinkExpiryDays,
  shareLinkDurationOfHours,
} from "@magic-vault/shared";
import { useId } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ShareLinkForm({ formId, form, onSubmit }: ShareLinkFormProps) {
  const { t } = useTranslation("common");
  const expirySelectId = useId();
  const showPricesId = useId();
  const showPricesDescriptionId = useId();
  const requireGuestContactId = useId();
  const requireGuestContactDescriptionId = useId();
  const purpose = useWatch({ control: form.control, name: "purpose" });
  const { lengths, allowsLongShareLinks } = useShareLinkLengths();
  const isFixedLengthLink = purpose === "trade" || !allowsLongShareLinks;
  const expiryLabel = (days: number) =>
    t("shareLink.expiryOption", { count: days });
  const durationLabel = (hours: number) => {
    const duration = shareLinkDurationOfHours(hours);
    return duration.unit === "days"
      ? t("shareLink.durationDays", { count: duration.count })
      : t("shareLink.durationHours", { count: duration.count });
  };

  return (
    <form
      id={formId}
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 md:gap-2"
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
      {isFixedLengthLink && (
        <Callout variant="info">
          {purpose === "trade"
            ? t("shareLink.tradeLengthNote", {
                duration: durationLabel(lengths.tradeLinkHours),
              })
            : t("shareLink.monitorShortLengthNote", {
                duration: durationLabel(lengths.restrictedShareLinkHours),
                longestDuration: durationLabel(
                  longestMonitorLinkExpiryDays(lengths.monitorLinkExpiryDays) * HOURS_PER_DAY,
                ),
              })}
        </Callout>
      )}
      {!isFixedLengthLink && (
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
                  {lengths.monitorLinkExpiryDays.map((days) => (
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
      {purpose === "trade" && (
        <Controller
          name="requireGuestContact"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={requireGuestContactId}>
                  {t("shareLink.requireGuestContact")}
                </FieldLabel>
                <FieldDescription id={requireGuestContactDescriptionId}>
                  {t("shareLink.requireGuestContactDescription")}
                </FieldDescription>
              </FieldContent>
              <Switch
                id={requireGuestContactId}
                aria-describedby={requireGuestContactDescriptionId}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Field>
          )}
        />
      )}
    </form>
  );
}
