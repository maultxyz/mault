import { CompactPrice } from "@/components/compact-value";
import { Callout } from "@/components/callout";
import { CardThumbnail } from "@/components/card-thumbnail";
import { DeleteDialog } from "@/components/delete-dialog";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
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
import { ViewTabs } from "@/components/view-tabs";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import {
  allocateOrder,
  cancelOrder,
  createOrderSortPreset,
  deleteOrder,
  fulfilOrder,
  orderQueryOptions,
  updateOrder,
} from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { OrderPhonePickDialog } from "@/features/business/components/order-phone-pick-dialog";
import { useOrderPickProgress } from "@/features/business/api/use-order-pick-progress";
import { OrderBinsDialog } from "@/features/business/components/order-bins-dialog";
import { OrderEditDialog } from "@/features/business/components/order-edit-dialog";
import { OrderPickByLocation } from "@/features/business/components/order-pick-by-location";
import { OrderRefLabel } from "@/features/business/components/order-ref-label";
import { OrderSubstituteDialog } from "@/features/business/components/order-substitute-dialog";
import { StatusBadge } from "@/features/business/components/status-badge";
import { buildPullSheetCsv } from "@/features/business/lib/pull-sheet";
import {
  downloadTextFile,
  formatDateTime,
} from "@/features/business/lib/format";
import { usePriceSource } from "@/hooks/use-price-source";
import { copyTextFromPromise } from "@/lib/clipboard";
import { sortingRulesPresetPath } from "@/lib/constants/bins";
import {
  ORDER_DETAIL_VIEWS,
  packingSlipsPath,
} from "@/lib/constants/business";
import type {
  OrderDetailProps,
  OrderDetailView,
} from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import {
  formatDecklist,
  hasEveryOrderBin,
  orderLineLabel,
  orderRefsOf,
  pickOrderGroups,
  toOrderLineInput,
  type PullSheetEntry,
  type Result,
} from "@magic-vault/shared";
import {
  IconAlertTriangle,
  IconClipboardList,
  IconDots,
  IconDeviceMobile,
  IconDownload,
  IconPackageExport,
  IconPencil,
  IconArrowsSort,
  IconBox,
  IconPrinter,
  IconRefresh,
  IconReplace,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-is-mobile";

export function OrderDetail({ guid, onDeleted }: OrderDetailProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const DetailHeading = isMobile ? "h2" : "h1";
  const { format } = usePriceSource();
  const { access } = useBusinessAccess();
  const run = useBusinessAction();
  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery(orderQueryOptions(guid));
  const [fulfilOpen, setFulfilOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [orderBinsOpen, setOrderBinsOpen] = useState(false);
  const [sortPresetOpen, setSortPresetOpen] = useState(false);
  const [view, setView] = useState<OrderDetailView>("location");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [removeLineIndex, setRemoveLineIndex] = useState<number | null>(null);
  const [substituteLineIndex, setSubstituteLineIndex] = useState<number | null>(null);
  const [lastCopyName, setLastCopyName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [phonePickOpen, setPhonePickOpen] = useState(false);
  const pickProgress = useOrderPickProgress(order ? [order] : []);

  if (isLoading || !order) {
    return (
      <>
        {!isMobile && <h1 className="sr-only">{t("views.picks")}</h1>}
        {isError ? (
          <LoadErrorCallout
            message={t("errors.loadFailed")}
            onRetry={() => void refetch()}
          />
        ) : (
          <ListSkeleton rows={8} />
        )}
      </>
    );
  }

  const pickedSet = pickProgress.pickedScanIds;
  const allScanIds = order.pullSheet.map((entry) => entry.scanId);
  const livePicked = allScanIds.filter((id) => pickedSet.has(id));
  const allPicked =
    allScanIds.length > 0 && allScanIds.every((id) => pickedSet.has(id));
  const changePicked = pickProgress.changePicked;

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
  const orderRefs = orderRefsOf(order.lines);
  const orderGroups = pickOrderGroups(
    order.lines,
    order.pullSheet,
    order.orderBins,
  );
  const showOrderGroups = orderRefs.length > 0;
  const canCreateSortPreset =
    showPullSheet && hasEveryOrderBin(orderRefs, order.orderBins);
  const columnCount = (showPullSheet ? 1 : 0) + 5 + (canAct ? 1 : 0);

  const act = async <T,>(
    action: () => Promise<Result<T>>,
    message?: string,
  ) => {
    setPending(true);
    const result = await run(action, message);
    setPending(false);
    return result;
  };

  const createSortPreset = async () => {
    const result = await act(() => createOrderSortPreset(order.guid));
    if (!result?.data) return;
    setSortPresetOpen(false);
    void queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey });
    const [firstPreset] = result.data.presets;
    toast.success(
      t("orders.sortPresetCreated", { count: result.data.presets.length }),
      firstPreset
        ? {
            action: {
              label: t("orders.openSortPreset"),
              onClick: () =>
                void navigate(sortingRulesPresetPath(firstPreset.guid)),
            },
          }
        : undefined,
    );
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
    <div className="flex flex-col gap-4 md:gap-2">
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex flex-wrap items-center gap-1.5 border-b bg-background/80 p-2 pl-4 backdrop-blur-2xl md:-top-2 md:-mx-3 md:-mt-2 md:pl-3">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2">
            <DetailHeading className="truncate font-heading text-lg font-semibold">
              {order.name}
            </DetailHeading>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-foreground/70">
            {t("orders.subtitle", {
              source: t(`orders.sources.${order.source}`),
              date: formatDateTime(order.createdAt),
            })}
          </p>
        </div>
        {(!isMobile || canAct) && (
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
              {!isMobile && (
                <DropdownMenuItem onClick={() => void copyDecklist()}>
                  <IconClipboardList />
                  {t("orders.copyDecklist")}
                </DropdownMenuItem>
              )}
              {!isMobile && order.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => window.open(packingSlipsPath([order.guid]), "_blank")}
                >
                  <IconPrinter />
                  {t("orders.packingSlips.print")}
                </DropdownMenuItem>
              )}
              {!isMobile && order.pullSheet.length > 0 && (
                <DropdownMenuItem
                  onClick={() =>
                    downloadTextFile(
                      `${order.name}-pull-sheet.csv`,
                      buildPullSheetCsv(order.pullSheet, order.orderBins),
                    )
                  }
                >
                  <IconDownload />
                  {t("orders.downloadPullSheet")}
                </DropdownMenuItem>
              )}
              {canAct && (
                <>
                  {!isMobile && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <IconPencil />
                        {t("orders.edit")}
                      </DropdownMenuItem>
                    </>
                  )}
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
                  {!isMobile && orderRefs.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setOrderBinsOpen(true)}>
                        <IconBox />
                        {t("orders.assignOrderBins")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canCreateSortPreset || pending}
                        onClick={() => setSortPresetOpen(true)}
                      >
                        <IconArrowsSort />
                        {t("orders.createSortPreset")}
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canAct && (
          <>
            {!isMobile && (
              <Button
                variant="outline"
                disabled={!showPullSheet}
                onClick={() => setPhonePickOpen(true)}
              >
                <IconDeviceMobile />
                {t("orders.phonePick.button")}
              </Button>
            )}
            <Button
              variant="destructive"
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
            variant="destructive"
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
          {
            key: "lines",
            label: t("orders.stats.lines"),
            value: order.lineCount,
          },
          {
            key: "quantity",
            label: t("orders.stats.quantity"),
            value: order.quantity,
          },
          {
            key: "allocated",
            label: t("orders.stats.allocated"),
            value: order.allocated,
          },
          {
            key: "picked",
            label: t("orders.stats.picked"),
            value: isOpen ? livePicked.length : order.picked,
          },
          {
            key: "revenue",
            label: t("orders.stats.revenue"),
            value:
              order.revenue == null ? null : (
                <CompactPrice value={order.revenue} />
              ),
          },
        ]}
      />

      {isOpen && shortLines.length > 0 && (
        <Callout variant="warning" icon={IconAlertTriangle}>
          {t("orders.shortLines", { count: shortLines.length })}
        </Callout>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold">
          {t("orders.lines")}
        </h2>
        {showPullSheet && (
          <ViewTabs
            label={t("orders.viewsLabel")}
            value={view}
            onChange={setView}
            items={ORDER_DETAIL_VIEWS.map((key) => ({
              key,
              label: t(`orders.views.${key}`),
            }))}
          />
        )}
        {showPullSheet && view === "location" ? (
          <OrderPickByLocation
            entries={order.pullSheet}
            orderBinOf={(entry) =>
              entry.orderRef == null ? null : (order.orderBins[entry.orderRef] ?? null)
            }
            pickedScanIds={pickedSet}
            canPick={canAct}
            onPickedChange={changePicked}
          />
        ) : (
          <div>
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
                          changePicked(allScanIds, checked === true)
                        }
                      />
                    </TableHead>
                  )}
                  <TableHead>{t("table.card")}</TableHead>
                  <TableHead>{t("table.condition")}</TableHead>
                  <TableHead className="text-right">
                    {isOpen
                      ? t("orders.pickedColumn")
                      : t("orders.quantityColumn")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("table.price")}
                  </TableHead>
                  <TableHead>{t("table.orderRef")}</TableHead>
                  {canAct && (
                    <TableHead className="w-10">
                      <span className="sr-only">{t("table.actions")}</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderGroups.map((group) => {
                  const groupScanIds = group.entries.map(
                    (entry) => entry.scanId,
                  );
                  const groupPickedCount = groupScanIds.filter((id) =>
                    pickedSet.has(id),
                  ).length;
                  return (
                    <Fragment key={group.orderRef ?? ""}>
                      {showOrderGroups && (
                        <TableRow className="bg-foreground/6 hover:bg-foreground/6">
                          {showPullSheet && (
                            <TableCell>
                              <Checkbox
                                checked={
                                  groupScanIds.length > 0 &&
                                  groupPickedCount === groupScanIds.length
                                }
                                indeterminate={
                                  groupPickedCount > 0 &&
                                  groupPickedCount < groupScanIds.length
                                }
                                disabled={!canAct || groupScanIds.length === 0}
                                aria-label={
                                  group.orderRef == null
                                    ? t("orders.pickNoOrder")
                                    : t("orders.pickOrder", {
                                        order: group.orderRef,
                                      })
                                }
                                onCheckedChange={(checked) =>
                                  changePicked(groupScanIds, checked === true)
                                }
                              />
                            </TableCell>
                          )}
                          <TableHead
                            scope="rowgroup"
                            colSpan={columnCount - (showPullSheet ? 1 : 0)}
                            className="text-sm font-medium text-foreground"
                          >
                            <OrderRefLabel
                              orderRef={group.orderRef}
                              binNumber={group.binNumber}
                            />
                            <span className="ml-1.5 text-xs font-normal text-foreground/70 tabular-nums">
                              {isOpen
                                ? t("orders.orderPickedCount", {
                                    picked: groupPickedCount,
                                    quantity: group.quantity,
                                  })
                                : t("orders.orderCardCount", {
                                    count: group.quantity,
                                  })}
                            </span>
                          </TableHead>
                        </TableRow>
                      )}
                      {group.lineIndexes.map((index) => {
                        const line = order.lines[index];
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
                                    aria-label={t("orders.pickLine", {
                                      name: line.name,
                                    })}
                                    onCheckedChange={(checked) =>
                                      changePicked(copyIds, checked === true)
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
                                {isOpen &&
                                  line.allocations.length < line.quantity && (
                                    <span className="block text-xs text-warning-strong">
                                      {t("orders.inStockCount", {
                                        count: line.allocations.length,
                                      })}
                                    </span>
                                  )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.unitPrice == null
                                  ? "-"
                                  : format(line.unitPrice)}
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
                                          size="icon"
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
                                      {line.allocations.length < line.quantity && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() => setSubstituteLineIndex(index)}
                                          >
                                            <IconReplace />
                                            {t("orders.substitutes.find")}
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                        </>
                                      )}
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() =>
                                          setRemoveLineIndex(index)
                                        }
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
                              <TableRow
                                key={entry.scanId}
                                className="bg-foreground/6"
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={pickedSet.has(entry.scanId)}
                                    disabled={!canAct}
                                    aria-label={t("orders.pickCopy", {
                                      name: entry.card.name,
                                    })}
                                    onCheckedChange={(checked) =>
                                      changePicked([entry.scanId], checked === true)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="max-w-80 pl-6">
                                  <div className="flex items-center gap-2.5">
                                    <CardThumbnail
                                      image={entry.card.image}
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
                                              position:
                                                (entry.locationPosition ?? 0) +
                                                1,
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
                                            size="icon"
                                            aria-label={t(
                                              "orders.copyActions",
                                              {
                                                name: entry.card.name,
                                              },
                                            )}
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
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {canAct && (
        <>
          <OrderEditDialog
            order={order}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <OrderBinsDialog
            order={order}
            open={orderBinsOpen}
            onOpenChange={setOrderBinsOpen}
          />
          <OrderSubstituteDialog
            order={order}
            lineIndex={substituteLineIndex}
            onOpenChange={(open) => {
              if (!open) setSubstituteLineIndex(null);
            }}
          />
          <ConfirmDialog
            open={sortPresetOpen}
            onOpenChange={setSortPresetOpen}
            title={t("orders.sortPresetTitle")}
            description={t("orders.sortPresetDescription")}
            confirmLabel={t("orders.createSortPreset")}
            cancelLabel={t("actions.back")}
            isPending={pending}
            onConfirm={createSortPreset}
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
            cancelLabel={t("actions.back")}
            destructive
            isPending={pending}
            onConfirm={async () => {
              if (
                await act(() => cancelOrder(order.guid), t("orders.cancelled"))
              ) {
                setLastCopyName(null);
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
            cancelLabel={t("actions.back")}
            destructive
            isPending={pending}
            onConfirm={async () => {
              if (removeLineIndex == null) return;
              const result = isLastLine
                ? await act(
                    () => cancelOrder(order.guid),
                    t("orders.cancelled"),
                  )
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
        cancelLabel={t("actions.back")}
        isPending={pending}
        onConfirm={async () => {
          const result = await act(
            () => fulfilOrder(order.guid, { scanIds: livePicked }),
            t("orders.fulfilled"),
          );
          if (result) setFulfilOpen(false);
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t("orders.cancelTitle")}
        description={t("orders.cancelDescription")}
        confirmLabel={t("orders.cancel")}
        cancelLabel={t("actions.back")}
        destructive
        isPending={pending}
        onConfirm={async () => {
          if (await act(() => cancelOrder(order.guid), t("orders.cancelled"))) {
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
      <OrderPhonePickDialog
        open={phonePickOpen}
        onOpenChange={setPhonePickOpen}
        orderGuids={[order.guid]}
      />
    </div>
  );
}
