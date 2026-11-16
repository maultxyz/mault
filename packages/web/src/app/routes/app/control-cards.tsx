import { Callout } from "@/components/callout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ControlCardBuilder } from "@/features/control-cards/components/control-card-builder";
import { ControlCardSheet } from "@/features/control-cards/components/control-card-sheet";
import {
  CONTROL_CARD_PRINT_PAGE_STYLE,
  CONTROL_CARDS_BACK_PATH,
} from "@/lib/constants/control-cards";
import type { ControlCardSheetEntry } from "@/lib/interfaces/control-cards";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconInfoCircle, IconPrinter } from "@tabler/icons-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export default function ControlCardsPage() {
  const { t } = useTranslation("scanner");
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<ControlCardSheetEntry[]>([]);
  const removeEntry = (entryId: string) =>
    setEntries((previous) => previous.filter((entry) => entry.id !== entryId));

  const header = (
    <PageHeader
      title={t("controlCards.page.title")}
      description={t("controlCards.page.description")}
      backTo={CONTROL_CARDS_BACK_PATH}
      backLabel={t("controlCards.page.back")}
      spansFullWidth
      actions={
        <Button disabled={entries.length === 0} onClick={() => window.print()}>
          <IconPrinter />
          {t("controlCards.page.print")}
        </Button>
      }
    />
  );
  const printTip = (
    <Callout icon={IconInfoCircle}>{t("controlCards.page.printTip")}</Callout>
  );
  const builder = (
    <ControlCardBuilder
      onAdd={(entry) => setEntries((previous) => [...previous, entry])}
    />
  );
  const sheet = <ControlCardSheet entries={entries} onRemove={removeEntry} />;
  const printPortal = createPortal(
    <div className="hidden bg-white print:block">
      <ControlCardSheet entries={entries} onRemove={removeEntry} />
    </div>,
    document.body,
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto text-foreground",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <style>{CONTROL_CARD_PRINT_PAGE_STYLE}</style>
        {header}
        <div className="flex flex-col gap-6 p-4">
          {printTip}
          {builder}
          {sheet}
        </div>
        {printPortal}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
      <style>{CONTROL_CARD_PRINT_PAGE_STYLE}</style>
      <div className="grid min-h-0 flex-1 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-y-auto border-r bg-sidebar/70 p-2 lg:col-span-3">
          {builder}
        </section>
        <section className="col-span-8 flex min-h-0 flex-col overflow-y-auto lg:col-span-9">
          {header}
          <div className="flex flex-col gap-2 px-3 py-2">
            {printTip}
            {sheet}
          </div>
        </section>
      </div>
      {printPortal}
    </div>
  );
}
