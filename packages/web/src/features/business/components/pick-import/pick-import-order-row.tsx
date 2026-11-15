import { Input } from "@/components/ui/input";
import type { PickImportOrderRowProps } from "@/lib/interfaces/business";
import {
  CSV_IMPORT_NAME_MAX_LENGTH,
  orderLineLabel,
} from "@magic-vault/shared";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PickImportOrderRow({
  control,
  order,
  index,
  isNameEditable,
}: PickImportOrderRowProps) {
  const { t } = useTranslation("csvImport");
  const quantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  const counts = [
    t("orders.lineCount", { count: order.lines.length }),
    t("orders.quantity", { count: quantity }),
  ].join(" · ");
  return (
    <li className="rounded-card bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {isNameEditable ? (
          <Controller
            name={`orderNames.${index}`}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder={order.reference ?? t("pickImport.review.noOrder")}
                aria-label={t("pickImport.review.orderName", {
                  name: order.reference ?? t("pickImport.review.noOrder"),
                })}
                maxLength={CSV_IMPORT_NAME_MAX_LENGTH}
                className="min-w-40 flex-1 md:max-w-xs"
              />
            )}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {order.reference ?? t("pickImport.review.noOrder")}
          </span>
        )}
        <span className="text-xs text-foreground/70 tabular-nums">{counts}</span>
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-foreground/70">
          {t("pickImport.review.showCards")}
        </summary>
        <ul className="mt-1 flex flex-col gap-0.5">
          {order.lines.map((line, lineIndex) => (
            <li key={lineIndex} className="flex gap-2 text-xs">
              <span className="w-6 shrink-0 text-right tabular-nums text-foreground/70">
                {line.quantity}
              </span>
              <span className="min-w-0 truncate">{orderLineLabel(line)}</span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}
