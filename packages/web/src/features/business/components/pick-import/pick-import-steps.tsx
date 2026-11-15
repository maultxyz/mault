import type { PickImportStepsProps } from "@/lib/interfaces/business";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PickImportSteps({ steps, current }: PickImportStepsProps) {
  const { t } = useTranslation("csvImport");
  const currentIndex = steps.indexOf(current);
  return (
    <ol
      aria-label={t("pickImport.stepsLabel")}
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
    >
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;
        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-sm",
              isCurrent ? "font-medium text-foreground" : "text-foreground/70",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                isCurrent && "bg-primary text-primary-foreground",
                isDone && "bg-success-muted text-success-foreground",
                !isCurrent && !isDone && "bg-foreground/6",
              )}
            >
              {isDone ? <IconCheck className="size-3.5" /> : index + 1}
            </span>
            <span>
              {t(`pickImport.steps.${step}`)}
              {isDone && (
                <span className="sr-only"> {t("pickImport.stepDone")}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
