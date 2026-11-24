import { PAGE_TITLE_CLASS } from "@/lib/constants/nav";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { BaseProviders } from "@/app/providers";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SkeletonStatus } from "@/components/skeleton-status";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { intakeLotReceiptQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { formatDateTime } from "@/features/business/lib/format";
import { useOrg } from "@/features/companies/api/use-organization";
import { usePriceSource } from "@/hooks/use-price-source";
import { IconPrinter } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { RECEIPT_PRINT_PARAM } from "@/lib/constants/business";
import { RECEIPT_SKELETON_COLUMNS, RECEIPT_SKELETON_ROWS } from "@/lib/constants/skeletons";

function IntakeReceipt() {
  const { t } = useTranslation("business");
  const { guid } = useParams();
  const { activeOrg } = useOrg();
  const { access } = useBusinessAccess();
  const { format } = usePriceSource();
  const {
    data: lot,
    isLoading,
    isError,
    refetch,
  } = useQuery(intakeLotReceiptQueryOptions(guid));
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get(RECEIPT_PRINT_PARAM) === "1";
  const printedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || !lot || printedRef.current) return;
    printedRef.current = true;
    window.print();
  }, [autoPrint, lot]);

  if (isLoading || !lot) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:px-3 md:py-2">
        {isError ? (
          <LoadErrorCallout
            message={t("errors.loadFailed")}
            onRetry={() => void refetch()}
          />
        ) : (
          <SkeletonStatus className="flex flex-col gap-6 md:gap-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex h-7 items-center">
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex h-5 items-center">
                  <Skeleton className="h-3.5 w-28" />
                </div>
              </div>
              <Skeleton className="h-10 w-20 rounded-lg md:h-7" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-32" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <TableSkeleton columns={RECEIPT_SKELETON_COLUMNS} rows={RECEIPT_SKELETON_ROWS} />
            <div className="ml-auto flex w-full max-w-xs flex-col gap-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-12" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-14" />
              </div>
            </div>
          </SkeletonStatus>
        )}
      </div>
    );
  }

  const showMoney = access?.canViewCosts ?? false;
  const isAccepted = lot.status === "accepted";
  const money = (value: number | null) => (value == null ? "-" : format(value));

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="min-h-dvh bg-card text-foreground outline-none"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 md:gap-2 p-4 md:px-3 md:py-2 print:p-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className={PAGE_TITLE_CLASS}>
              {activeOrg?.name ?? t("receipt.title")}
            </h1>
            <p className="text-sm text-foreground/70">
              {t(isAccepted ? "receipt.title" : "receipt.quoteTitle")}
            </p>
          </div>
          <Button className="print:hidden" onClick={() => window.print()}>
            <IconPrinter />
            {t("receipt.print")}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-foreground/70">
              {t("receipt.customer")}
            </p>
            <p className="font-medium">{lot.customerName}</p>
            {lot.customerContact && <p>{lot.customerContact}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground/70">{t("receipt.date")}</p>
            <p className="font-medium">
              {formatDateTime(lot.acceptedAt ?? lot.createdAt)}
            </p>
            <p className="text-xs text-foreground/70">
              {t("receipt.reference", { reference: lot.guid.slice(0, 8) })}
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.card")}</TableHead>
              <TableHead>{t("table.set")}</TableHead>
              <TableHead>{t("table.condition")}</TableHead>
              {showMoney && (
                <TableHead className="text-right">{t("table.offer")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lot.cards.map((entry) => (
              <TableRow key={entry.scanId}>
                <TableCell className="whitespace-normal">
                  {entry.card.name}
                  {entry.isFoil ? ` (${t("table.foil")})` : ""}
                </TableCell>
                <TableCell>
                  {entry.card.set.toUpperCase()} {entry.card.collectorNumber}
                </TableCell>
                <TableCell>{entry.condition}</TableCell>
                {showMoney && (
                  <TableCell className="text-right tabular-nums">
                    {money(isAccepted ? entry.acquisitionCost : entry.offer)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>{t("receipt.cards")}</span>
            <span className="tabular-nums">{lot.cardCount}</span>
          </div>
          {showMoney && isAccepted && (
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>
                {t("receipt.paid", {
                  method: lot.payoutMethod
                    ? t(`intake.payout.${lot.payoutMethod}`)
                    : "",
                })}
              </span>
              <span className="tabular-nums">{money(lot.paidTotal)}</span>
            </div>
          )}
          {showMoney && !isAccepted && (
            <>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>{t("intake.stats.cash")}</span>
                <span className="tabular-nums">{money(lot.cashOffer)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("intake.stats.credit")}</span>
                <span className="tabular-nums">{money(lot.creditOffer)}</span>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-foreground/70">
          <div className="border-t pt-1">{t("receipt.customerSignature")}</div>
          <div className="border-t pt-1">{t("receipt.staffSignature")}</div>
        </div>
      </div>
    </main>
  );
}

export default function IntakeReceiptPage() {
  return (
    <BaseProviders>
      <IntakeReceipt />
    </BaseProviders>
  );
}
