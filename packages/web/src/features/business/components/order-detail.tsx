import { Callout } from "@/components/callout";
import { CardThumbnail } from "@/components/card-thumbnail";
import { DeleteDialog } from "@/components/delete-dialog";
import { ListSkeleton } from "@/components/list-skeleton";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  allocateOrder,
  cancelOrder,
  deleteOrder,
  fulfilOrder,
  orderQueryOptions,
  updateOrder,
} from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { ConfirmDialog } from "@/features/business/components/confirm-dialog";
import { OrderEditDialog } from "@/features/business/components/order-edit-dialog";
import { StatusBadge } from "@/features/business/components/status-badge";
import { buildPullSheetCsv } from "@/features/business/lib/pull-sheet";
import { downloadTextFile, formatDateTime } from "@/features/business/lib/format";
import { usePriceSource } from "@/hooks/use-price-source";
import { copyTextFromPromise } from "@/lib/clipboard";
import { EMPTY_PICKS } from "@/lib/constants/business";
import type { OrderDetailProps } from "@/lib/interfaces/business";
import { DISCARD_RESET_OPTIONS } from "@/lib/constants/forms";
import { toast } from "@/lib/toast";
import {
  orderPicksSchema,
  type OrderPicksFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatDecklist,
  orderLineLabel,
  toOrderLineInput,
  type PullSheetEntry,
  type Result,
} from "@magic-vault/shared";
import {
  IconAlertTriangle,
  IconClipboardList,
  IconDots,
  IconDownload,
  IconPackageExport,
  IconPencil,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrderDetail({ guid, onDeleted }: OrderDetailProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const { access } = useBusinessAccess();
  const run = useBusinessAction();
  const { data: order, isLoading } = useQuery(orderQueryOptions(guid));
  const [fulfilOpen, setFulfilOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeLineIndex, setRemoveLineIndex] = useState<number | null>(null);
  const [lastCopyName, setLastCopyName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const form = useForm<OrderPicksFormValues>({
    resolver: zodResolver(orderPicksSchema),
    defaultValues: EMPTY_PICKS,
  });
  const picked = useWatch({ control: form.control, name: "picked" });
  const isDirty = picked.length > 0;
  const discardPicks = () => form.reset(EMPTY_PICKS, DISCARD_RESET_OPTIONS);

  if (isLoading || !order) {
    return (
      <>
        <ListSkeleton rows={8} />
        <UnsavedChangesGuard isDirty={isDirty} onDiscard={discardPicks} />
      </>
    );
  }

  const pickedSet = new Set(picked);
  const allScanIds = order.pullSheet.map((entry) => entry.scanId);
  const livePicked = picked.filter((id) => allScanIds.includes(id));
  const allPicked =
    allScanIds.length > 0 && allScanIds.every((id) => pickedSet.has(id));
  const setPicked = (next: string[]) =>
    form.setValue("picked", next, { shouldDirty: true });
  const togglePick = (scanId: string, checked: boolean) =>
    setPicked(
      checked
        ? [...picked.filter((id) => id !== scanId), scanId]
        : picked.filter((id) => id !== scanId),
    );

  const isOpen = order.status === "open";
  const canAct = isOpen && (access?.canFulfilOrders ?? false);
  const showPullSheet = isOpen && order.pullSheet.length > 0;
  const isLastLine = order.lines.length === 1;
  const copiesByLine = new Map<number, PullSheetEntry[]>();
  for (const entry of order.pullSheet) {
    copiesByLine.set(entry.lineIndex, [
      ...(copiesByLine.get(entry.lineIndex) ?? []),
      entry,
    ]);
  }
  const shortLines = order.lines.filter(
    (line) => line.allocations.length < line.quantity,
  );

  const act = async <T,>(
    action: () => Promise<Result<T>>,
    message?: string,
  ) => {
    setPending(true);
    const result = await run(action, message);
    setPending(false);
    return result;
  };

  const removeCopy = async (lineIndex: number, scanId: string) => {
    const remainingCopies =
      Math.min(
        order.lines[lineIndex].quantity,
        copiesByLine.get(lineIndex)?.length ?? 0,
      ) - 1;
    const lines = order.lines
      .map((line, index) => ({
        ...toOrderLineInput(line),
        quantity: index === lineIndex ? remainingCopies : line.quantity,
      }))
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      setLastCopyName(order.lines[lineIndex].name);
      return;
    }
    await act(
      () =>
        updateOrder(order.guid, {
          name: order.name,
          lines,
          releasedScanIds: [scanId],
        }),
      t("orders.copyRemoved"),
    );
  };

  const copyDecklist = async () => {
    const text = formatDecklist(
      order.lines.map((line) => ({ name: line.name, quantity: line.quantity })),
    );
    await copyTextFromPromise(Promise.resolve(text));
    toast.success(t("orders.decklistCopied"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex flex-wrap items-center gap-2 border-b bg-background/80 p-2 pl-4 backdrop-blur-2xl">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-lg font-semibold">
              {order.name}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-foreground/70">
            {t("orders.subtitle", {
              source: t(`orders.sources.${order.source}`),
              date: formatDateTime(order.createdAt),
            })}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={t("orders.moreActions")}
                title={t("orders.moreActions")}
              />
            }
          >
            <IconDots />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void copyDecklist()}>
              <IconClipboardList />
              {t("orders.copyDecklist")}
            </DropdownMenuItem>
            {order.pullSheet.length > 0 && (
              <DropdownMenuItem
                onClick={() =>
                  downloadTextFile(
                    `${order.name}-pull-sheet.csv`,
                    buildPullSheetCsv(order.pullSheet),
                  )
                }
              >
                <IconDownload />
                {t("orders.downloadPullSheet")}
              </DropdownMenuItem>
            )}
            {canAct && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <IconPencil />
                  {t("orders.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={pending}
                  onClick={() =>
                    void act(
                      () => allocateOrder(order.guid),
                      t("orders.reallocated"),
                    )
                  }
                >
                  <IconRefresh />
                  {t("orders.reallocate")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {canAct && (
          <>
            <Button
              variant="outline-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <IconX />
              {t("orders.cancel")}
            </Button>
            <Button
              disabled={!allPicked}
              title={allPicked ? undefined : t("orders.pickFirst")}
              onClick={() => setFulfilOpen(true)}
            >
              <IconPackageExport />
              {t("orders.fulfil")}
            </Button>
          </>
        )}
        {!isOpen && access?.canFulfilOrders && (
          <Button
            variant="outline-destructive"
            size="icon"
            aria-label={t("actions.delete")}
            title={t("actions.delete")}
            onClick={() => setDeleteOpen(true)}
          >
            <IconTrash />
          </Button>
        )}
      </div>

      <StatGroup
        heading={t("orders.summary")}
        gridClassName="grid-cols-2 sm:grid-cols-5"
        tiles={[
          { key: "lines", label: t("orders.stats.lines"), value: order.lineCount },
          { key: "quantity", label: t("orders.stats.quantity"), value: order.quantity },
          { key: "allocated", label: t("orders.stats.allocated"), value: order.allocated },
          {
            key: "picked",
            label: t("orders.stats.picked"),
            value: isOpen ? livePicked.length : order.picked,
          },
          {
            key: "revenue",
            label: t("orders.stats.revenue"),
            value: order.revenue == null ? null : format(order.revenue),
          },
        ]}
      />

      {isOpen && shortLines.length > 0 && (
        <Callout variant="warning" icon={IconAlertTriangle}>
          {t("orders.shortLines", { count: shortLines.length })}
        </Callout>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold">{t("orders.lines")}</h2>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {showPullSheet && (
                  <TableHead className="w-8">
                    <Checkbox
                      checked={allPicked}
                      indeterminate={livePicked.length > 0 && !allPicked}
                      disabled={!canAct}
                      aria-label={t("orders.pickAll")}
                      onCheckedChange={(checked) =>
                        setPicked(checked === true ? allScanIds : [])
                      }
                    />
                  </TableHead>
                )}
                <TableHead>{t("table.card")}</TableHead>
                <TableHead>{t("table.condition")}</TableHead>
                <TableHead className="text-right">
                  {isOpen ? t("orders.pickedColumn") : t("orders.quantityColumn")}
                </TableHead>
                <TableHead className="text-right">{t("table.price")}</TableHead>
                <TableHead>{t("table.orderRef")}</TableHead>
                {canAct && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((line, index) => {
                const copies = copiesByLine.get(index) ?? [];
                const copyIds = copies.map((entry) => entry.scanId);
                const pickedCopyCount = copyIds.filter((id) =>
                  pickedSet.has(id),
                ).length;
                return (
                  <Fragment key={index}>
                    <TableRow>
                      {showPullSheet && (
                        <TableCell>
                          <Checkbox
                            checked={
                              copyIds.length > 0 &&
                              pickedCopyCount === copyIds.length
                            }
                            indeterminate={
                              pickedCopyCount > 0 &&
                              pickedCopyCount < copyIds.length
                            }
                            disabled={!canAct || copyIds.length === 0}
                            aria-label={t("orders.pickLine", { name: line.name })}
                            onCheckedChange={(checked) =>
                              setPicked([
                                ...picked.filter((id) => !copyIds.includes(id)),
                                ...(checked === true ? copyIds : []),
                              ])
                            }
                          />
                        </TableCell>
                      )}
                      <TableCell className="max-w-72 truncate font-medium">
                        {orderLineLabel(line)}
                        {line.isFoil && (
                          <span className="ml-1.5 text-xs text-foreground/70">
                            {t("table.foil")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{line.condition ?? "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {isOpen
                          ? `${pickedCopyCount}/${line.quantity}`
                          : line.quantity}
                        {isOpen && line.allocations.length < line.quantity && (
                          <span className="block text-xs text-warning-strong">
                            {t("orders.inStockCount", {
                              count: line.allocations.length,
                            })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.unitPrice == null ? "-" : format(line.unitPrice)}
                      </TableCell>
                      <TableCell className="text-foreground/70">
                        {line.orderRef ?? "-"}
                      </TableCell>
                      {canAct && (
                        <TableCell className="py-0 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={t("orders.lineActions", {
                                    name: line.name,
                                  })}
                                  title={t("orders.lineActions", {
                                    name: line.name,
                                  })}
                                />
                              }
                            >
                              <IconDots />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setRemoveLineIndex(index)}
                              >
                                <IconTrash />
                                {t("orders.removeFromPick")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                    {copies.map((entry) => (
                      <TableRow key={entry.scanId} className="bg-muted/40">
                        <TableCell>
                          <Checkbox
                            checked={pickedSet.has(entry.scanId)}
                            disabled={!canAct}
                            aria-label={t("orders.markPicked")}
                            onCheckedChange={(checked) =>
                              togglePick(entry.scanId, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell className="max-w-80 pl-6">
                          <div className="flex items-center gap-2.5">
                            <CardThumbnail
                              image={entry.card.image}
                              isFoil={entry.isFoil}
                              className="w-10"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm">
                                {t("orders.printing", {
                                  setName: entry.card.setName,
                                  set: entry.card.set.toUpperCase(),
                                  number: entry.card.collectorNumber,
                                })}
                                {entry.isFoil && (
                                  <span className="ml-1.5 text-xs text-foreground/70">
                                    {t("table.foil")}
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-foreground/70">
                                {entry.locationName
                                  ? t("orders.locationAt", {
                                      location: entry.locationName,
                                      position: (entry.locationPosition ?? 0) + 1,
                                    })
                                  : t("orders.inCollection", {
                                      collection: entry.collectionName,
                                      bin: entry.binNumber ?? "-",
                                    })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{entry.condition}</TableCell>
                        <TableCell colSpan={3} />
                        {canAct && (
                          <TableCell className="py-0 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t("orders.copyActions", {
                                      name: entry.card.name,
                                    })}
                                    title={t("orders.copyActions", {
                                      name: entry.card.name,
                                    })}
                                  />
                                }
                              >
                                <IconDots />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={pending}
                                  onClick={() =>
                                    void removeCopy(index, entry.scanId)
                                  }
                                >
                                  <IconTrash />
                                  {t("orders.removeCopy")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {canAct && (
        <>
          <OrderEditDialog
            order={order}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <ConfirmDialog
            open={lastCopyName != null}
            onOpenChange={(open) => {
              if (!open) setLastCopyName(null);
            }}
            title={t("orders.removeLastCopyTitle")}
            description={t("orders.removeLastCopyDescription", {
              name: lastCopyName ?? "",
            })}
            confirmLabel={t("orders.removeCopy")}
            destructive
            isPending={pending}
            onConfirm={async () => {
              if (await act(() => cancelOrder(order.guid), t("orders.cancelled"))) {
                setLastCopyName(null);
                form.reset(EMPTY_PICKS);
              }
            }}
          />
          <ConfirmDialog
            open={removeLineIndex != null}
            onOpenChange={(open) => {
              if (!open) setRemoveLineIndex(null);
            }}
            title={t("orders.removeLineTitle")}
            description={t(
              isLastLine
                ? "orders.removeLastLineDescription"
                : "orders.removeLineDescription",
              {
                name:
                  removeLineIndex == null
                    ? ""
                    : orderLineLabel(order.lines[removeLineIndex]),
              },
            )}
            confirmLabel={t("orders.removeFromPick")}
            destructive
            isPending={pending}
            onConfirm={async () => {
              if (removeLineIndex == null) return;
              const result = isLastLine
                ? await act(() => cancelOrder(order.guid), t("orders.cancelled"))
                : await act(
                    () =>
                      updateOrder(order.guid, {
                        name: order.name,
                        lines: order.lines
                          .filter((_, index) => index !== removeLineIndex)
                          .map(toOrderLineInput),
                      }),
                    t("orders.edited"),
                  );
              if (!result) return;
              setRemoveLineIndex(null);
              if (isLastLine) form.reset(EMPTY_PICKS);
            }}
          />
        </>
      )}
      <ConfirmDialog
        open={fulfilOpen}
        onOpenChange={setFulfilOpen}
        title={t("orders.fulfilTitle")}
        description={t("orders.fulfilDescription", {
          count: livePicked.length,
        })}
        confirmLabel={t("orders.fulfil")}
        isPending={pending}
        onConfirm={async () => {
          const result = await act(
            () => fulfilOrder(order.guid, { scanIds: livePicked }),
            t("orders.fulfilled"),
          );
          if (result) {
            form.reset(EMPTY_PICKS);
            setFulfilOpen(false);
          }
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("orders.cancelTitle")}
        description={t("orders.cancelDescription")}
        confirmLabel={t("orders.cancel")}
        destructive
        isPending={pending}
        onConfirm={async () => {
          if (await act(() => cancelOrder(order.guid), t("orders.cancelled"))) {
            form.reset(EMPTY_PICKS);
            setCancelOpen(false);
          }
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("orders.deleteTitle")}
        description={t("orders.deleteDescription")}
        onConfirm={async () => {
          setDeleteOpen(false);
          if (await run(() => deleteOrder(order.guid))) onDeleted();
        }}
      />
      <UnsavedChangesGuard isDirty={isDirty} onDiscard={discardPicks} />
    </div>
  );
}
