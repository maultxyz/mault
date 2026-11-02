import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { ControlCardBuilder } from "@/features/control-cards/components/control-card-builder";
import { ControlCardSheet } from "@/features/control-cards/components/control-card-sheet";
import {
  CONTROL_CARD_PRINT_PAGE_STYLE,
  CONTROL_CARDS_BACK_PATH,
} from "@/lib/constants/control-cards";
import type { ControlCardSheetEntry } from "@/lib/interfaces/control-cards";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconInfoCircle,
  IconPrinter,
} from "@tabler/icons-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function ControlCardsPage() {
  const { t } = useTranslation("scanner");
  const [entries, setEntries] = useState<ControlCardSheetEntry[]>([]);
  const removeEntry = (entryId: string) =>
    setEntries((previous) => previous.filter((entry) => entry.id !== entryId));

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto text-foreground",
        MOBILE_NAV_SCROLL_PADDING_CLASS,
      )}
    >
      <style>{CONTROL_CARD_PRINT_PAGE_STYLE}</style>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="-ml-2 self-start"
              nativeButton={false}
              render={<Link to={CONTROL_CARDS_BACK_PATH} />}
            >
              <IconArrowLeft />
              {t("controlCards.page.back")}
            </Button>
            <h1 className="font-heading text-2xl font-semibold">
              {t("controlCards.page.title")}
            </h1>
            <p className="text-sm text-foreground/70">
              {t("controlCards.page.description")}
            </p>
          </div>
          <Button
            disabled={entries.length === 0}
            onClick={() => window.print()}
          >
            <IconPrinter />
            {t("controlCards.page.print")}
          </Button>
        </div>
        <Callout icon={IconInfoCircle}>
          {t("controlCards.page.printTip")}
        </Callout>
        <ControlCardBuilder
          onAdd={(entry) => setEntries((previous) => [...previous, entry])}
        />
        <ControlCardSheet entries={entries} onRemove={removeEntry} />
      </div>
      {createPortal(
        <div className="hidden bg-white print:block">
          <ControlCardSheet entries={entries} onRemove={removeEntry} />
        </div>,
        document.body,
      )}
    </div>
  );
}
