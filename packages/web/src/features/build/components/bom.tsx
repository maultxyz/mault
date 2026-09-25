import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useBoardType } from "@/features/build/api/use-board-type";
import { useKitMode } from "@/features/build/api/use-kit-mode";
import {
  MAX_MODULES,
  MIN_MODULES,
  useModuleCount,
} from "@/features/build/api/use-module-count";
import { usePartsChecklist } from "@/features/build/api/use-parts-checklist";
import { BomGroupTable } from "@/features/build/components/bom-group-table";
import { GROUPS } from "@/features/build/lib/bom-parts";
import { SHOP_URL } from "@/lib/constants/links";
import { cn } from "@/lib/utils";
import {
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconShoppingCart,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export function BuildBom() {
  const { t } = useTranslation("build");
  const { checked, toggle } = usePartsChecklist();
  const { moduleCount, setModuleCount } = useModuleCount();
  const { boardType, setBoardType } = useBoardType();
  const { usingKit } = useKitMode();
  const [openSections, setOpenSections] = useState<string[]>(["parts"]);

  useEffect(() => {
    setOpenSections(usingKit ? [] : ["parts"]);
  }, [usingKit]);

  const allRows = useMemo(() => GROUPS.flatMap((g) => g.rows), []);
  const doneCount = allRows.filter((r) => checked[r.key]).length;
  const pct = allRows.length
    ? Math.round((doneCount / allRows.length) * 100)
    : 0;

  const channelsUsed = moduleCount * 3 + 1;

  return (
    <section id="parts" className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {t("bom.heading")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("bom.description", {
          modules: moduleCount,
          irSensors: moduleCount + 1,
          channelsUsed,
          channelsFree: 16 - channelsUsed,
        })}
      </p>
      <div className="mt-4 flex max-w-2xl items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-sm/relaxed text-blue-900 dark:bg-blue-500/10 dark:text-blue-300">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
        <span>{t("bom.hopperNote")}</span>
      </div>
      <div className="mt-3 flex max-w-2xl items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm/relaxed text-primary">
        <IconShoppingCart className="mt-0.5 size-4 shrink-0" />
        <span>
          <Trans
            t={t}
            i18nKey="bom.shopNote"
            components={[
              <a
                key="0"
                href={SHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2 hover:opacity-80"
              />,
            ]}
          />
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/70 uppercase">
            {t("bom.moduleCount.label")}
          </span>
          <div className="flex items-center gap-1.5 rounded-md border p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("bom.moduleCount.decreaseAria")}
              disabled={moduleCount <= MIN_MODULES}
              onClick={() => setModuleCount(moduleCount - 1)}
            >
              <IconMinus />
            </Button>
            <span className="w-4 text-center font-mono text-sm font-medium tabular-nums">
              {moduleCount}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("bom.moduleCount.increaseAria")}
              disabled={moduleCount >= MAX_MODULES}
              onClick={() => setModuleCount(moduleCount + 1)}
            >
              <IconPlus />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/70 uppercase">
            {t("hero.boardType.label")}
          </span>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              variant={boardType === "uno_r4" ? "secondary" : "ghost"}
              size="sm"
              className={cn(boardType !== "uno_r4" && "text-foreground/70")}
              onClick={() => setBoardType("uno_r4")}
            >
              {t("hero.boardType.unoR4")}
            </Button>
            <Button
              variant={boardType === "esp32" ? "secondary" : "ghost"}
              size="sm"
              className={cn(boardType !== "esp32" && "text-foreground/70")}
              onClick={() => setBoardType("esp32")}
            >
              {t("hero.boardType.esp32")}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-foreground/70">
          <span>
            {t("bom.progress.partsCount", {
              done: doneCount,
              total: allRows.length,
            })}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Accordion
        multiple
        value={openSections}
        onValueChange={setOpenSections}
        className="mt-8"
      >
        <AccordionItem value="parts" className="border-b-0">
          <AccordionTrigger className="font-heading text-base font-semibold tracking-wide text-foreground uppercase">
            {t("bom.partsListLabel")}
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="flex flex-col gap-8">
              {GROUPS.map((group) => (
                <BomGroupTable
                  key={group.key}
                  group={group}
                  moduleCount={moduleCount}
                  boardType={boardType}
                  checked={checked}
                  toggle={toggle}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="mt-6 max-w-2xl text-xs/relaxed text-foreground/70">
        {t("bom.affiliateDisclaimer")}
      </p>
    </section>
  );
}
