import {
  DEMO_PICK_LIST_BIN,
  DEMO_PICK_LIST_ENTRIES,
} from "@/lib/constants/landing";
import { cn } from "@/lib/utils";
import { IconCheck, IconListCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DemoPickList() {
  const { t } = useTranslation("landing");
  const wanted = DEMO_PICK_LIST_ENTRIES.reduce((n, e) => n + e.quantity, 0);
  const found = DEMO_PICK_LIST_ENTRIES.reduce((n, e) => n + e.found, 0);

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <IconListCheck size={16} className="text-primary" />
          {t("features.demo.pickListBin", { number: DEMO_PICK_LIST_BIN })}
        </span>
        <span className="text-foreground/70 tabular-nums">
          {t("features.demo.found", { found, wanted })}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(found / wanted) * 100}%` }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {DEMO_PICK_LIST_ENTRIES.map((entry) => {
          const complete = entry.found >= entry.quantity;
          return (
            <div
              key={entry.name}
              className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  complete
                    ? "bg-primary text-primary-foreground"
                    : "border border-input",
                )}
              >
                {complete && <IconCheck size={12} />}
              </span>
              <span
                className={cn(
                  "flex-1 truncate",
                  complete && "text-foreground/70 line-through",
                )}
              >
                {entry.quantity} {entry.name}
              </span>
              <span className="shrink-0 text-foreground/70 tabular-nums">
                {entry.found}/{entry.quantity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
