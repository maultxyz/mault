import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { ConfirmDialog } from "@/features/business/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { removeCollectionCards } from "@/features/collections/api/collections";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteIntakeLot,
  fetchNextUnreviewedIntakeCard,
  intakeLotQueryOptions,
} from "@/features/business/api/business";
import { HotkeyHint } from "@/components/hotkey-hint";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { IntakeAcceptDialog } from "@/features/business/components/intake-accept-dialog";
import { IntakeCancelDialog } from "@/features/business/components/intake-cancel-dialog";
import { IntakeTransferDialog } from "@/features/business/components/intake-transfer-dialog";
import { StatusBadge } from "@/features/business/components/status-badge";
import { formatDateTime } from "@/features/business/lib/format";
import { useCollections } from "@/features/collections/api/use-collections";
import { usePriceSource } from "@/hooks/use-price-source";
import { useReviewLayout } from "@/features/cards/api/use-card-view-preferences";
import { intakeReceiptPath } from "@/lib/constants/business";
import type { IntakeLotDetailProps } from "@/lib/interfaces/business";
import {
  IconAlertTriangle,
  IconArrowsTransferUp,
  IconCameraSpark,
  IconCheck,
  IconDots,
  IconListCheck,
  IconPrinter,
  IconScan,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function IntakeLotDetail({
  guid,
  onDeleted,
  onOpenCard,
  onOpenReviewGrid,
}: IntakeLotDetailProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const navigate = useNavigate();
  const { access, settings } = useBusinessAccess();
  const { activateCollection } = useCollections();
  const run = useBusinessAction();
  const { data: lot, isLoading } = useQuery(intakeLotQueryOptions(guid));
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [inAcceptFlow, setInAcceptFlow] = useState(false);
  const [receiptPromptOpen, setReceiptPromptOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useHotkeys({
    clearSelection: selected.size > 0 ? () => setSelected(new Set()) : undefined,
  });
  const [removeTarget, setRemoveTarget] = useState<string[] | null>(null);

  const [reviewLayout] = useReviewLayout();

  const startReview = async () => {
    if (reviewLayout === "grid") {
      onOpenReviewGrid();
      return;
    }
    let first: string | null;
    try {
      first = await fetchNextUnreviewedIntakeCard(guid);
    } catch (error) {
      console.error("Couldn't load the next card to review", error);
      toast.error(t("errors.generic"));
      return;
    }
    if (first) onOpenCard(first, true);
    else toast.info(t("intake.review.nothingLeft"));
  };

  const openScanner = async (collectionGuid: string) => {
    await activateCollection(collectionGuid);
    navigate("/app");
  };

  useHotkeys({
    reviewStart:
      lot && lot.cards.length > 0 ? () => void startReview() : undefined,
    intakeOpenScanner:
      lot?.status === "open"
        ? () => void openScanner(lot.collectionGuid)
        : undefined,
  });

  if (isLoading || !lot) return <ListSkeleton rows={8} />;

  const isOpen = lot.status === "open";
  const canRemove = isOpen;
  const liveSelected = lot.cards
    .map((entry) => entry.scanId)
    .filter((scanId) => selected.has(scanId));
  const allSelected =
    lot.cards.length > 0 && liveSelected.length === lot.cards.length;
  const toggleSelected = (scanId: string, checked: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(scanId);
      else next.delete(scanId);
      return next;
    });
  const belowMinimum = lot.cards
    .filter((entry) => entry.belowMinimum)
    .map((entry) => entry.scanId);
  const minCardValue = settings?.buylist.minCardValue ?? 0;
  const removeCards = async (scanIds: string[]) => {
    setRemoveTarget(null);
    const result = await run(
      () => removeCollectionCards(lot.collectionGuid, scanIds),
      t("intake.remove.done", { count: scanIds.length }),
    );
    if (result) {
      setSelected((previous) => {
        const next = new Set(previous);
        for (const scanId of scanIds) next.delete(scanId);
        return next;
      });
    }
  };
  const showMoney = access?.canViewCosts ?? false;
  const money = (value: number | null) =>
    value == null ? null : format(value);

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex flex-wrap items-center gap-2 border-b bg-background/80 p-2 pl-4 backdrop-blur-2xl">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-lg font-semibold">
              {lot.customerName}
            </h1>
            <StatusBadge status={lot.status} />
          </div>
          <p className="text-xs text-foreground/70">
            {t("intake.subtitle", {
              collection: lot.collectionName,
              date: formatDateTime(lot.createdAt),
            })}
          </p>
        </div>
        {lot.cards.length > 0 && (
          <Button
            variant="outline"
            title={t("intake.review.startTitle")}
            onClick={() => void startReview()}
          >
            <IconListCheck />
            {t("intake.review.start")}
            <HotkeyHint id="reviewStart" />
          </Button>
        )}
        {isOpen && (
          <Button
            variant="outline"
            onClick={() => void openScanner(lot.collectionGuid)}
          >
            <IconCameraSpark />
            {t("intake.openScanner")}
            <HotkeyHint id="intakeOpenScanner" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={t("intake.moreActions")}
                title={t("intake.moreActions")}
              />
            }
          >
            <IconDots />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => window.open(intakeReceiptPath(lot.guid), "_blank")}
            >
              <IconPrinter />
              {t("intake.printReceipt")}
            </DropdownMenuItem>
            {access?.canAcceptIntake && (
              <>
                <DropdownMenuSeparator />
                {isOpen ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setCancelOpen(true)}
                  >
                    <IconX />
                    {t("intake.cancelLot")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <IconTrash />
                    {t("actions.delete")}
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {isOpen && access?.canAcceptIntake && (
          <Button
            disabled={lot.cardCount === 0}
            onClick={() => setAcceptOpen(true)}
          >
            <IconCheck />
            {t("intake.accept")}
          </Button>
        )}
        {lot.status === "accepted" &&
          !lot.collectionDeleted &&
          lot.cardsInSource > 0 &&
          access?.canAcceptIntake && (
            <Button onClick={() => setTransferOpen(true)}>
              <IconArrowsTransferUp />
              {t("transfer.button")}
            </Button>
          )}
      </div>

      {(lot.customerContact || lot.notes) && (
        <div className="flex flex-col gap-1 text-sm">
          {lot.customerContact && <p>{lot.customerContact}</p>}
          {lot.notes && (
            <p className="whitespace-pre-wrap text-foreground/70">
              {lot.notes}
            </p>
          )}
        </div>
      )}

      <StatGroup
        heading={t(isOpen ? "intake.liveOffer" : "intake.summary")}
        live={isOpen ? true : undefined}
        gridClassName="grid-cols-2 sm:grid-cols-4"
        tiles={[
          {
            key: "cards",
            label: t("intake.stats.cards"),
            value: lot.cardCount.toLocaleString(),
          },
          ...(showMoney
            ? [
                {
                  key: "market",
                  label: t("intake.stats.market"),
                  value: money(lot.marketTotal),
                },
                {
                  key: "cash",
                  label: t("intake.stats.cash"),
                  value: money(lot.cashOffer),
                },
                lot.status === "accepted"
                  ? {
                      key: "paid",
                      label: t("intake.stats.paid"),
                      value: money(lot.paidTotal),
                      detail: lot.payoutMethod
                        ? t(`intake.payout.${lot.payoutMethod}`)
                        : null,
                    }
                  : {
                      key: "credit",
                      label: t("intake.stats.credit"),
                      value: money(lot.creditOffer),
                    },
              ]
            : []),
        ]}
      />

      {lot.cards.length === 0 ? (
        <EmptyState
          icon={IconScan}
          title={t("intake.noCardsTitle")}
          description={t(
            isOpen ? "intake.noCardsOpen" : "intake.noCardsClosed",
          )}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {isOpen && belowMinimum.length > 0 && (
            <Callout
              variant="warning"
              icon={IconAlertTriangle}
              action={
                canRemove ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveTarget(belowMinimum)}
                  >
                    <IconX />
                    {t("intake.belowMinimum.remove", {
                      count: belowMinimum.length,
                    })}
                  </Button>
                ) : undefined
              }
            >
              {t("intake.belowMinimum.notice", {
                count: belowMinimum.length,
                value: format(minCardValue),
              })}
            </Callout>
          )}
          {canRemove && liveSelected.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm animate-in fade-in-0 motion-reduce:animate-none">
              <span className="font-medium">
                {t("intake.remove.selected", { count: liveSelected.length })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  {t("intake.remove.clear")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRemoveTarget(liveSelected)}
                >
                  <IconX />
                  {t("intake.remove.button")}
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {canRemove && (
                    <TableHead className="w-8">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={liveSelected.length > 0 && !allSelected}
                        aria-label={t("intake.remove.selectAll")}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked === true
                              ? new Set(lot.cards.map((entry) => entry.scanId))
                              : new Set(),
                          )
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead>{t("table.card")}</TableHead>
                  <TableHead>{t("table.set")}</TableHead>
                  <TableHead>{t("table.condition")}</TableHead>
                  {showMoney && (
                    <>
                      <TableHead className="text-right">
                        {t("table.market")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t(isOpen ? "table.offer" : "table.cost")}
                      </TableHead>
                    </>
                  )}
                  {canRemove && <TableHead className="w-8" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lot.cards.map((entry) => (
                  <TableRow
                    key={entry.scanId}
                    title={
                      entry.belowMinimum
                        ? t("intake.belowMinimum.rowTitle")
                        : undefined
                    }
                    className={cn(
                      "cursor-pointer",
                      entry.belowMinimum &&
                        "text-foreground/70 [&>td:not(:first-child):not(:last-child)]:line-through",
                    )}
                    onClick={() => onOpenCard(entry.scanId, false)}
                  >
                    {canRemove && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(entry.scanId)}
                          aria-label={t("intake.remove.selectRow", {
                            name: entry.card.name,
                          })}
                          onCheckedChange={(checked) =>
                            toggleSelected(entry.scanId, checked === true)
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell className="max-w-64 truncate font-medium">
                      {entry.card.name}
                      {entry.isFoil && (
                        <span className="ml-1.5 text-xs text-foreground/70">
                          {t("table.foil")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground/70">
                      {entry.card.set.toUpperCase()}{" "}
                      {entry.card.collectorNumber}
                    </TableCell>
                    <TableCell>{entry.condition}</TableCell>
                    {showMoney && (
                      <>
                        <TableCell className="text-right tabular-nums">
                          {money(entry.marketPrice) ?? "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {money(
                            isOpen ? entry.offer : entry.acquisitionCost,
                          ) ?? "-"}
                        </TableCell>
                      </>
                    )}
                    {canRemove && (
                      <TableCell className="py-0 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("intake.remove.row", {
                            name: entry.card.name,
                          })}
                          title={t("intake.remove.button")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemoveTarget([entry.scanId]);
                          }}
                        >
                          <IconX />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <DeleteDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={t("intake.remove.title", { count: removeTarget?.length ?? 0 })}
        description={t("intake.remove.description", {
          name: lot.customerName,
        })}
        confirmLabel={t("intake.remove.button")}
        focusConfirm
        onConfirm={() => removeTarget && void removeCards(removeTarget)}
      />
      <IntakeAcceptDialog
        lot={lot}
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        onAccepted={() => {
          setInAcceptFlow(true);
          setTransferOpen(true);
        }}
      />
      <ConfirmDialog
        open={receiptPromptOpen}
        onOpenChange={setReceiptPromptOpen}
        title={t("intake.receiptPrompt.title")}
        description={t("intake.receiptPrompt.description", {
          name: lot.customerName,
        })}
        confirmLabel={t("intake.receiptPrompt.print")}
        cancelLabel={t("intake.receiptPrompt.skip")}
        onConfirm={() => {
          window.open(intakeReceiptPath(lot.guid, true), "_blank");
          setReceiptPromptOpen(false);
        }}
      />
      <IntakeTransferDialog
        lot={lot}
        open={transferOpen}
        onOpenChange={(open) => {
          setTransferOpen(open);
          if (!open && inAcceptFlow) {
            setInAcceptFlow(false);
            setReceiptPromptOpen(true);
          }
        }}
      />
      <IntakeCancelDialog
        lot={lot}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("intake.deleteTitle")}
        description={t("intake.deleteDescription")}
        onConfirm={async () => {
          setDeleteOpen(false);
          if (await run(() => deleteIntakeLot(lot.guid))) onDeleted();
        }}
      />
    </div>
  );
}
