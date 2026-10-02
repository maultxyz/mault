import { Checkbox } from "@/components/ui/checkbox";
import { AnchorLinkButton } from "@/features/build/components/anchor-link-button";
import { bomGroupAnchorId } from "@/features/build/lib/anchors";
import type { BoardType } from "@/features/build/api/use-board-type";
import {
  optionalBadgeLabel,
  resolveRowBuyUrl,
  resolveRowName,
  type Group,
} from "@/features/build/lib/bom-parts";
import { cn } from "@/lib/utils";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function BomGroupTable({
  group,
  moduleCount,
  boardType,
  checked,
  toggle,
}: {
  group: Group;
  moduleCount: number;
  boardType: BoardType;
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  const { t } = useTranslation("build");

  return (
    <div id={bomGroupAnchorId(group.key)} className="scroll-mt-16">
      <div className="group/anchor mb-2 flex items-center gap-1">
        <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground/70 uppercase">
          {t(`bom.groups.${group.key}.title`)}
        </h3>
        <AnchorLinkButton id={bomGroupAnchorId(group.key)} />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-120 border-collapse text-sm/relaxed">
          <thead>
            <tr className="bg-secondary/40">
              <th className="w-8 border-b px-3 py-2" />
              <th className="w-16 border-b px-3 py-2 text-left font-mono text-2xs font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.qty")}
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-2xs font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.part")}
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-2xs font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.notes")}
              </th>
              <th className="w-12 border-b px-3 py-2 text-left font-mono text-2xs font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.buy")}
              </th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, i) => {
              const qty = row.qty(moduleCount);
              return (
                <tr
                  key={row.key}
                  className={cn(
                    "hover:bg-secondary/30",
                    i !== group.rows.length - 1 && "border-b",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <Checkbox
                      aria-label={t("bom.checkboxAriaLabel", {
                        qty: qty === "-" ? "" : qty,
                      })}
                      checked={!!checked[row.key]}
                      onCheckedChange={() => toggle(row.key)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70 tabular-nums">
                    {qty}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-medium",
                      checked[row.key] &&
                        "text-foreground/70 line-through decoration-foreground/70",
                    )}
                  >
                    {row.part(t, boardType)}
                    {row.optional && (
                      <span className="ml-2 rounded-full border px-1.5 py-0.5 font-mono text-sm font-medium text-foreground/70 uppercase no-underline">
                        {optionalBadgeLabel(t, row.optional)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/70">
                    {row.notes(t, moduleCount, boardType)}
                  </td>
                  <td className="px-3 py-2.5">
                    {resolveRowBuyUrl(row, boardType) && (
                      <a
                        href={resolveRowBuyUrl(row, boardType)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("bom.buyAriaLabel", {
                          part: resolveRowName(row, boardType),
                        })}
                        className="inline-flex items-center text-foreground/70 transition-colors hover:text-foreground"
                      >
                        <IconExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
