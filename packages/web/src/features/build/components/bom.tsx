import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Callout } from "@/components/callout";
import { useBoardType } from "@/features/build/api/use-board-type";
import { useKitMode } from "@/features/build/api/use-kit-mode";
import { useModuleCount } from "@/features/build/api/use-module-count";
import { usePartsChecklist } from "@/features/build/api/use-parts-checklist";
import { AnchorLinkButton } from "@/features/build/components/anchor-link-button";
import { BomGroupTable } from "@/features/build/components/bom-group-table";
import { BuildSelectionSummary } from "@/features/build/components/selection-summary";
import { BOM_ANCHOR_PREFIX } from "@/lib/constants/build";
import { useLocation } from "react-router-dom";
import { GROUPS } from "@/features/build/lib/bom-parts";
import { SHOP_URL } from "@/lib/constants/links";
import { IconInfoCircle, IconShoppingCart } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export function BuildBom() {
  const { t } = useTranslation("build");
  const { checked, toggle } = usePartsChecklist();
  const { moduleCount } = useModuleCount();
  const { boardType } = useBoardType();
  const { usingKit } = useKitMode();
  const [openSections, setOpenSections] = useState<string[]>(["parts"]);

  useEffect(() => {
    setOpenSections(usingKit ? [] : ["parts"]);
  }, [usingKit]);

  const { hash } = useLocation();
  useEffect(() => {
    if (!hash.startsWith(`#${BOM_ANCHOR_PREFIX}`)) return;
    setOpenSections((prev) =>
      prev.includes("parts") ? prev : [...prev, "parts"],
    );
  }, [hash]);

  const allRows = useMemo(() => GROUPS.flatMap((g) => g.rows), []);
  const doneCount = allRows.filter((r) => checked[r.key]).length;
  const pct = allRows.length
    ? Math.round((doneCount / allRows.length) * 100)
    : 0;

  const channelsUsed = moduleCount * 3 + 1;

  return (
    <section id="parts" className="mx-auto max-w-4xl scroll-mt-14 px-4 py-16">
      <div className="group/anchor flex items-center gap-1">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {t("bom.heading")}
        </h2>
        <AnchorLinkButton id="parts" />
      </div>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("bom.description", {
          modules: moduleCount,
          irSensors: moduleCount + 1,
          channelsUsed,
          channelsFree: 16 - channelsUsed,
        })}
      </p>
      <BuildSelectionSummary />
      <Callout
        variant="info"
        icon={IconInfoCircle}
        className="mt-4 max-w-2xl px-3 py-2.5 text-sm/relaxed"
      >
        {t("bom.hopperNote")}
      </Callout>
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

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-xs text-foreground/70">
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
