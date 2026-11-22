import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import {
  intakeLotQueryOptions,
  unmovedBuysQueryOptions,
} from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { IntakeTransferDialog } from "@/features/business/components/intake-transfer-dialog";
import { IconArrowsTransferUp, IconLoader2, IconPackages } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmovedBuysCallout() {
  const { t } = useTranslation("business");
  const { orgId, access } = useBusinessAccess();
  const canMove = !!access?.canAcceptIntake && !access.isLocked;
  const { data: unmoved = [] } = useQuery({
    ...unmovedBuysQueryOptions(orgId),
    enabled: !!orgId && canMove,
  });
  const [movingGuid, setMovingGuid] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const movingLot = useQuery(intakeLotQueryOptions(movingGuid ?? undefined));

  if (!canMove || unmoved.length === 0) return null;

  return (
    <>
      <Callout
        variant="info"
        icon={IconPackages}
        title={t("intake.unmoved.title", { count: unmoved.length })}
      >
        <p>{t("intake.unmoved.description")}</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {unmoved.map((buy) => (
            <li key={buy.guid} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{buy.customerName}</span>
                <span className="block truncate">
                  {t("intake.unmoved.row", {
                    collection: buy.collectionName,
                    count: buy.cardCount,
                  })}
                </span>
              </span>
              <Button
                variant="outline"
                aria-label={t("intake.unmoved.moveFor", { name: buy.customerName })}
                disabled={movingGuid === buy.guid && movingLot.isPending}
                onClick={() => {
                  setMovingGuid(buy.guid);
                  setIsDialogOpen(true);
                }}
              >
                {movingGuid === buy.guid && movingLot.isPending ? (
                  <IconLoader2 className="animate-spin" />
                ) : (
                  <IconArrowsTransferUp />
                )}
                {t("intake.unmoved.move")}
              </Button>
            </li>
          ))}
        </ul>
      </Callout>
      {movingLot.data && movingLot.data.guid === movingGuid && (
        <IntakeTransferDialog
          lot={movingLot.data}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </>
  );
}
