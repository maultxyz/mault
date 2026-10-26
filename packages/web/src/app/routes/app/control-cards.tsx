import { BaseProviders } from "@/app/providers";
import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { ControlCardBuilder } from "@/features/control-cards/components/control-card-builder";
import { ControlCardSheet } from "@/features/control-cards/components/control-card-sheet";
import {
  CONTROL_CARD_PRINT_PAGE_STYLE,
  CONTROL_CARDS_BACK_PATH,
} from "@/lib/constants/control-cards";
import type { ControlCardSheetEntry } from "@/lib/interfaces/control-cards";
import { IconArrowLeft, IconInfoCircle, IconPrinter } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function ControlCards() {
  const { t } = useTranslation("scanner");
  const [entries, setEntries] = useState<ControlCardSheetEntry[]>([]);

  return (
    <div className="min-h-dvh bg-background text-foreground print:bg-white">
      <style>{CONTROL_CARD_PRINT_PAGE_STYLE}</style>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6 print:max-w-none print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
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
        <Callout icon={IconInfoCircle} className="print:hidden">
          {t("controlCards.page.printTip")}
        </Callout>
        <div className="print:hidden">
          <ControlCardBuilder
            onAdd={(entry) => setEntries((previous) => [...previous, entry])}
          />
        </div>
        <ControlCardSheet
          entries={entries}
          onRemove={(entryId) =>
            setEntries((previous) =>
              previous.filter((entry) => entry.id !== entryId),
            )
          }
        />
      </div>
    </div>
  );
}

export default function ControlCardsPage() {
  return (
    <BaseProviders>
      <ControlCards />
    </BaseProviders>
  );
}
