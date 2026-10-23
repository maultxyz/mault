import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { accuracyReportQueryOptions } from "@/features/business/api/business";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { SpotCheckRunner } from "@/features/business/components/spot-check-runner";
import { StartCheckDialog } from "@/features/business/components/start-check-dialog";
import { StatusBadge } from "@/features/business/components/status-badge";
import { formatDateTime, formatPercent } from "@/features/business/lib/format";
import { useCollections } from "@/features/collections/api/use-collections";
import type { AccuracyReportViewProps } from "@/lib/interfaces/business";
import { IconListCheck, IconTargetArrow } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AccuracyReportView({
  collectionGuid,
  checkGuid,
  onCollectionChange,
  onCheckChange,
}: AccuracyReportViewProps) {
  const { t } = useTranslation("business");
  const { access } = useBusinessAccess();
  const { collections, activeCollection } = useCollections();
  const selectedGuid = collectionGuid ?? activeCollection?.guid ?? null;
  const selected = collections.find((c) => c.guid === selectedGuid);
  const { data: report, isLoading } = useQuery(
    accuracyReportQueryOptions(selectedGuid, null),
  );
  const [startOpen, setStartOpen] = useState(false);

  if (checkGuid) {
    return <SpotCheckRunner guid={checkGuid} onClose={() => onCheckChange(null)} />;
  }

  const stats = report?.stats;
  const rate = (value: number) =>
    stats && stats.cardCount ? formatPercent(value / stats.cardCount) : "-";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={selectedGuid ?? ""}
          onValueChange={(value) => value && onCollectionChange(value)}
        >
          <SelectTrigger className="w-56" aria-label={t("table.collection")}>
            <SelectValue>{selected?.name ?? t("intake.chooseCollection")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {collections.map((collection) => (
              <SelectItem key={collection.guid} value={collection.guid}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={!selected || access?.isLocked || !stats?.cardCount}
          onClick={() => setStartOpen(true)}
        >
          <IconListCheck />
          {t("accuracy.startButton")}
        </Button>
      </div>

      {!selectedGuid ? (
        <EmptyState icon={IconTargetArrow} title={t("accuracy.pickCollection")} />
      ) : isLoading || !report || !stats ? (
        <ListSkeleton rows={6} />
      ) : (
        <>
          <StatGroup
            heading={t("accuracy.batchHeading")}
            gridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            tiles={[
              { key: "cards", label: t("accuracy.stats.cards"), value: stats.cardCount.toLocaleString() },
              {
                key: "corrected",
                label: t("accuracy.stats.corrected"),
                value: stats.corrected.toLocaleString(),
                detail: rate(stats.corrected),
              },
              {
                key: "low",
                label: t("accuracy.stats.lowConfidence"),
                value: stats.lowConfidence.toLocaleString(),
                detail: rate(stats.lowConfidence),
              },
              {
                key: "alternatives",
                label: t("accuracy.stats.alternatives"),
                value: stats.withAlternatives.toLocaleString(),
                detail: rate(stats.withAlternatives),
              },
              {
                key: "reviewed",
                label: t("accuracy.stats.reviewed"),
                value: stats.reviewed.toLocaleString(),
                detail: rate(stats.reviewed),
              },
              {
                key: "unmatched",
                label: t("accuracy.stats.unmatched"),
                value: stats.unmatched.toLocaleString(),
              },
            ]}
          />
          <p className="text-xs text-foreground/70">{t("accuracy.statsNote")}</p>

          <h2 className="font-heading text-sm font-semibold">
            {t("accuracy.checks")}
          </h2>
          {report.checks.length === 0 ? (
            <EmptyState
              size="compact"
              icon={IconListCheck}
              title={t("accuracy.noChecks")}
              description={t("accuracy.noChecksDescription")}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.date")}</TableHead>
                    <TableHead>{t("table.person")}</TableHead>
                    <TableHead className="text-right">{t("accuracy.checked")}</TableHead>
                    <TableHead className="text-right">{t("accuracy.estimate")}</TableHead>
                    <TableHead>{t("accuracy.range")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.checks.map((check) => (
                    <TableRow
                      key={check.guid}
                      className="cursor-pointer"
                      onClick={() => onCheckChange(check.guid)}
                    >
                      <TableCell>{formatDateTime(check.createdAt)}</TableCell>
                      <TableCell className="max-w-40 truncate">
                        {check.createdByName ?? "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {check.checked}/{check.sampleSize}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(check.estimate?.accuracy)}
                      </TableCell>
                      <TableCell className="tabular-nums text-foreground/70">
                        {check.estimate
                          ? `${formatPercent(check.estimate.low)} - ${formatPercent(check.estimate.high)}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={check.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {selected && (
        <StartCheckDialog
          collectionGuid={selected.guid}
          collectionName={selected.name}
          open={startOpen}
          onOpenChange={setStartOpen}
          onStarted={onCheckChange}
        />
      )}
    </div>
  );
}
