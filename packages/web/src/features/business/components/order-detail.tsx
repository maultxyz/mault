import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { ListSkeleton } from "@/components/list-skeleton";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/features/business/api/business";
import {
  useBusinessAccess,
  useBusinessAction,
} from "@/features/business/api/use-business";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { ConfirmDialog } from "@/features/business/components/confirm-dialog";
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
  type Result,
} from "@magic-vault/shared";
import {
  IconAlertTriangle,
  IconClipboardList,
  IconDownload,
  IconPackageExport,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
        <Button variant="outline" onClick={() => void copyDecklist()}>
          <IconClipboardList />
          {t("orders.copyDecklist")}
        </Button>
        {order.pullSheet.length > 0 && (
          <Button
            variant="outline"
            onClick={() =>
              downloadTextFile(
                `${order.name}-pull-sheet.csv`,
                buildPullSheetCsv(order.pullSheet),
              )
            }
          >
            <IconDownload />
            {t("orders.downloadPullSheet")}
          </Button>
        )}
        {canAct && (
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                void act(() => allocateOrder(order.guid), t("orders.reallocated"))
              }
            >
              <IconRefresh />
              {t("orders.reallocate")}
            </Button>
            <Button
              variant="outline-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <IconX />
              {t("orders.cancel")}
            </Button>
            <Button
              disabled={picked.length === 0}
              title={picked.length === 0 ? t("orders.pickFirst") : undefined}
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
            value: isOpen ? picked.length : order.picked,
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

      {isOpen && order.pullSheet.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-sm font-semibold">
            {t("orders.pullSheet")}
          </h2>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={allPicked}
                      indeterminate={picked.length > 0 && !allPicked}
                      disabled={!canAct}
                      aria-label={t("orders.pickAll")}
                      onCheckedChange={(checked) =>
                        setPicked(checked === true ? allScanIds : [])
                      }
                    />
                  </TableHead>
                  <TableHead>{t("table.location")}</TableHead>
                  <TableHead>{t("table.card")}</TableHead>
                  <TableHead>{t("table.set")}</TableHead>
                  <TableHead>{t("table.condition")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.pullSheet.map((entry) => (
                  <TableRow key={entry.scanId}>
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
                    <TableCell>
                      {entry.locationName
                        ? t("orders.locationAt", {
                            location: entry.locationName,
                            position: (entry.locationPosition ?? 0) + 1,
                          })
                        : t("orders.inCollection", {
                            collection: entry.collectionName,
                            bin: entry.binNumber ?? "-",
                          })}
                    </TableCell>
                    <TableCell className="max-w-64 truncate font-medium">
                      {entry.card.name}
                      {entry.isFoil && (
                        <span className="ml-1.5 text-xs text-foreground/70">
                          {t("table.foil")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground/70">
                      {entry.card.set.toUpperCase()} {entry.card.collectorNumber}
                    </TableCell>
                    <TableCell>{entry.condition}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold">{t("orders.lines")}</h2>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.card")}</TableHead>
                <TableHead>{t("table.condition")}</TableHead>
                <TableHead className="text-right">{t("table.allocated")}</TableHead>
                <TableHead className="text-right">{t("table.price")}</TableHead>
                <TableHead>{t("table.orderRef")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell className="max-w-72 truncate font-medium">
                    {orderLineLabel(line)}
                    {line.isFoil && (
                      <span className="ml-1.5 text-xs text-foreground/70">
                        {t("table.foil")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{line.condition ?? "-"}</TableCell>
                  <TableCell
                    className={
                      isOpen && line.allocations.length < line.quantity
                        ? "text-right tabular-nums text-warning-strong"
                        : "text-right tabular-nums"
                    }
                  >
                    {isOpen
                      ? `${line.allocations.length}/${line.quantity}`
                      : line.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.unitPrice == null ? "-" : format(line.unitPrice)}
                  </TableCell>
                  <TableCell className="text-foreground/70">
                    {line.orderRef ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <ConfirmDialog
        open={fulfilOpen}
        onOpenChange={setFulfilOpen}
        title={t("orders.fulfilTitle")}
        description={
          picked.length < order.allocated
            ? t("orders.fulfilPartialDescription", {
                count: picked.length,
                total: order.allocated,
              })
            : t("orders.fulfilDescription", { count: picked.length })
        }
        confirmLabel={t("orders.fulfil")}
        isPending={pending}
        onConfirm={async () => {
          const result = await act(
            () => fulfilOrder(order.guid, { scanIds: picked }),
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
