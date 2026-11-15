import { Callout } from "@/components/callout";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PickImportChoice } from "@/features/business/components/pick-import/pick-import-choice";
import { PickImportOrderRow } from "@/features/business/components/pick-import/pick-import-order-row";
import { PICK_IMPORT_COMPOSITIONS } from "@/lib/constants/business";
import type {
  PickImportCreateMode,
  PickImportReviewProps,
} from "@/lib/interfaces/business";
import {
  ORDER_NAME_MAX_LENGTH,
  orderLineLabel,
  type CsvImportComposition,
} from "@magic-vault/shared";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PickImportReview({
  control,
  csvImport,
  composed,
  orders,
  plainListLines,
}: PickImportReviewProps) {
  const { t } = useTranslation("csvImport");
  const { t: tBusiness } = useTranslation("business");
  const createMode = useWatch({ control, name: "createMode" });
  const { mapping, table } = csvImport;
  const composition = mapping?.composition ?? "single";
  const isPlainList = !mapping;
  const hasManyOrders = !isPlainList && composition !== "single" && orders.length > 1;
  const createsOnePick = !hasManyOrders || createMode === "together";
  const orderColumn =
    mapping?.columns.orderRef === undefined
      ? null
      : table.headers[mapping.columns.orderRef]?.trim() ||
        t("pickImport.columns.columnNumber", {
          index: mapping.columns.orderRef + 1,
        });
  const pickNamePlaceholder = hasManyOrders
    ? t("orders.pickNamePlaceholder", { count: orders.length })
    : (orders[0]?.reference ?? tBusiness("orders.importedName", { index: 1 }));

  return (
    <div className="flex flex-col gap-4 md:gap-3">
      {mapping && (
        <PickImportChoice<CsvImportComposition>
          legend={t("pickImport.review.split.legend")}
          value={composition}
          onChange={(next) =>
            csvImport.setMapping({ ...mapping, composition: next })
          }
          options={PICK_IMPORT_COMPOSITIONS.map((option) => ({
            value: option,
            label:
              option === "reference" && orderColumn
                ? t("pickImport.review.split.referenceWithColumn", {
                    column: orderColumn,
                  })
                : t(`pickImport.review.split.${option.replace("-", "")}`),
            description:
              option === "reference" && !orderColumn
                ? t("pickImport.review.split.referenceDisabled")
                : t(`pickImport.review.split.${option.replace("-", "")}Hint`),
            disabled: option === "reference" && !orderColumn,
          }))}
        />
      )}

      {hasManyOrders && (
        <Controller
          name="createMode"
          control={control}
          render={({ field }) => (
            <PickImportChoice<PickImportCreateMode>
              legend={t("pickImport.review.create.legend")}
              value={field.value}
              onChange={field.onChange}
              options={[
                {
                  value: "together",
                  label: t("pickImport.review.create.together"),
                  description: t("pickImport.review.create.togetherHint"),
                },
                {
                  value: "separate",
                  label: t("pickImport.review.create.separate"),
                  description: t("pickImport.review.create.separateHint"),
                },
              ]}
            />
          )}
        />
      )}

      {createsOnePick && (
        <Controller
          name="pickName"
          control={control}
          render={({ field, fieldState }) => (
            <Field
              className="max-w-sm"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="pick-import-name">
                {t("pickImport.review.pickName")}
              </FieldLabel>
              <Input
                {...field}
                id="pick-import-name"
                placeholder={pickNamePlaceholder}
                maxLength={ORDER_NAME_MAX_LENGTH}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}

      {isPlainList ? (
        <section aria-labelledby="pick-import-cards" className="flex flex-col gap-2">
          <h3 id="pick-import-cards" className="text-sm font-medium">
            {t("pickImport.review.cards", { count: plainListLines.length })}
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-card bg-card px-3">
            {plainListLines.map((line, index) => (
              <li key={index} className="flex gap-2 py-1.5 text-sm">
                <span className="w-8 shrink-0 text-right tabular-nums text-foreground/70">
                  {line.quantity}
                </span>
                <span className="min-w-0 truncate">{orderLineLabel(line)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-labelledby="pick-import-orders" className="flex flex-col gap-2">
          <div>
            <h3 id="pick-import-orders" className="text-sm font-medium">
              {t("pickImport.review.orders", { count: orders.length })}
            </h3>
            {composition !== "single" && (
              <p className="text-xs text-foreground/70">
                {t("pickImport.review.ordersHint")}
              </p>
            )}
          </div>
          <ul className="flex flex-col gap-1.5">
            {orders.map((order, index) => (
              <PickImportOrderRow
                key={index}
                control={control}
                order={order}
                index={index}
                isNameEditable={composition !== "single"}
              />
            ))}
          </ul>
        </section>
      )}

      {composed &&
        (composed.skippedRows > 0 ||
          composed.emptyOrders > 0 ||
          composed.conflicts.length > 0) && (
          <div role="status">
            <Callout variant="warning">
              {[
                composed.skippedRows > 0
                  ? t("orders.skippedRows", { count: composed.skippedRows })
                  : null,
                composed.emptyOrders > 0
                  ? t("orders.emptyOrders", { count: composed.emptyOrders })
                  : null,
                composed.conflicts.length > 0
                  ? t("orders.conflicts", { count: composed.conflicts.length })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Callout>
          </div>
        )}
    </div>
  );
}
