import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminUnmatchedQueryOptions,
  retryAdminUnmatched,
  runAdminUnmatchedOcr,
} from "@/features/admin/api/unmatched-retry";
import { useBadPhotoMarks } from "@/features/admin/api/use-bad-photo-marks";
import { UnmatchedRetryResult } from "@/features/admin/components/unmatched-retry-result";
import { UnmatchedScanDetailDialog } from "@/features/admin/components/unmatched-scan-detail-dialog";
import { formatMatchDistance } from "@/features/admin/lib/format-match-distance";
import { UNMATCHED_PHOTO_FILTERS } from "@/lib/constants/admin";
import type { UnmatchedPhotoFilter } from "@/lib/interfaces/admin";
import { toast } from "@/lib/toast";
import type {
  AdminUnmatchedOcrResult,
  AdminUnmatchedRetryResult,
  AdminUnmatchedScan,
} from "@magic-vault/shared";
import {
  IconLoader2,
  IconPhotoOff,
  IconPhotoX,
  IconRefresh,
  IconScanEye,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function UnmatchedRetryManager() {
  const { t, i18n } = useTranslation("admin");
  const scansQuery = useQuery(adminUnmatchedQueryOptions);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoFilter, setPhotoFilter] = useState<UnmatchedPhotoFilter>("all");
  const badPhotos = useBadPhotoMarks();
  const [results, setResults] = useState<
    Record<string, AdminUnmatchedRetryResult>
  >({});

  const retryMutation = useMutation({
    mutationFn: retryAdminUnmatched,
    onSuccess: (r) => {
      if (!r.success || !r.data) {
        toast.error(r.message || t("unmatchedRetry.toasts.retryError"));
        return;
      }
      const retried = r.data;
      setResults((prev) => ({
        ...prev,
        ...Object.fromEntries(retried.map((result) => [result.scanId, result])),
      }));
    },
    onError: () => toast.error(t("unmatchedRetry.toasts.retryError")),
  });

  const [ocrResults, setOcrResults] = useState<
    Record<string, AdminUnmatchedOcrResult>
  >({});
  const ocrMutation = useMutation({
    mutationFn: runAdminUnmatchedOcr,
    onSuccess: (r) => {
      if (!r.success || !r.data) {
        toast.error(r.message || t("unmatchedRetry.toasts.ocrError"));
        return;
      }
      const ocr = r.data;
      setOcrResults((prev) => ({ ...prev, [ocr.scanId]: ocr }));
    },
    onError: () => toast.error(t("unmatchedRetry.toasts.ocrError")),
  });

  const scans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (scansQuery.data ?? []).filter(
      (scan) =>
        (photoFilter === "all" ||
          (photoFilter === "bad") === badPhotos.isBad(scan.scanId)) &&
        (!query ||
          [
            scan.orgName,
            scan.collectionName,
            scan.gameKey,
            scan.originalNearestName,
            results[scan.scanId]?.card?.name,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query))),
    );
  }, [scansQuery.data, search, results, photoFilter, badPhotos.isBad]);

  const badCount = scans.filter((scan) => badPhotos.isBad(scan.scanId)).length;
  const goodResults = scans.flatMap((scan) =>
    results[scan.scanId] && !badPhotos.isBad(scan.scanId)
      ? [results[scan.scanId]]
      : [],
  );
  const matchedCount = goodResults.filter(
    (result) => result.status === "match",
  ).length;
  const retryable = scans
    .filter((scan) => scan.hasEmbedding)
    .map((scan) => scan.scanId);

  const selected =
    scansQuery.data?.find((scan) => scan.scanId === selectedId) ?? null;

  const neighborOf = (direction: 1 | -1) => {
    const all = scansQuery.data ?? [];
    const visible = new Set(scans.map((scan) => scan.scanId));
    const start = all.findIndex((scan) => scan.scanId === selectedId);
    if (start === -1) return null;
    for (let i = start + direction; i >= 0 && i < all.length; i += direction) {
      if (visible.has(all[i].scanId)) return all[i].scanId;
    }
    return null;
  };
  const previousId = neighborOf(-1);
  const nextId = neighborOf(1);

  const isRetrying = (scanId: string) =>
    retryMutation.isPending &&
    (retryMutation.variables?.scanIds.includes(scanId) ?? false);
  const retryOne = (scanId: string) =>
    retryMutation.mutate({ scanIds: [scanId], withOcr: true });

  const describeOriginal = (scan: AdminUnmatchedScan) =>
    [
      scan.originalReason
        ? t(`unmatchedRetry.reasons.${scan.originalReason}`)
        : null,
      scan.originalNearestName
        ? t("unmatchedRetry.nearest", {
            name: scan.originalNearestName,
            distance: formatMatchDistance(scan.originalNearestDistance),
          })
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <SettingsSection
      heading={t("unmatchedRetry.heading")}
      description={t("unmatchedRetry.description")}
      action={
        <Button
          onClick={() => retryMutation.mutate({ scanIds: retryable })}
          disabled={retryMutation.isPending || retryable.length === 0}
        >
          {retryMutation.isPending && !retryMutation.variables?.withOcr ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconRefresh />
          )}
          {t("unmatchedRetry.retryAll", { count: retryable.length })}
        </Button>
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("unmatchedRetry.searchPlaceholder")}
          data-hotkey-search
        />
        <Select
          value={photoFilter}
          onValueChange={(value) =>
            setPhotoFilter(value as UnmatchedPhotoFilter)
          }
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>
              {t(`unmatchedRetry.photoFilters.${photoFilter}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {UNMATCHED_PHOTO_FILTERS.map((filter) => (
              <SelectItem key={filter} value={filter}>
                {t(`unmatchedRetry.photoFilters.${filter}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(goodResults.length > 0 || badCount > 0) && (
        <p className="text-sm text-foreground/70">
          {t("unmatchedRetry.summary", {
            retried: goodResults.length,
            matched: matchedCount,
            unmatched: goodResults.length - matchedCount,
            bad: badCount,
          })}
        </p>
      )}

      {scansQuery.isLoading ? (
        <ListSkeleton rows={6} />
      ) : scans.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconScanEye}
          title={t("unmatchedRetry.empty")}
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {scans.map((scan) => {
            const result = results[scan.scanId];
            const isBad = badPhotos.isBad(scan.scanId);
            const badPhotoLabel = isBad
              ? t("unmatchedRetry.unmarkBadPhoto")
              : t("unmatchedRetry.markBadPhoto");
            return (
              <div
                key={scan.scanId}
                className="flex flex-col gap-3 px-4 py-2.5 sm:flex-row sm:items-center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(scan.scanId)}
                  aria-label={t("unmatchedRetry.detail.open")}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="aspect-[2.5/3.5] w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {scan.capturedImageUrl ? (
                      <img
                        src={scan.capturedImageUrl}
                        alt={t("unmatchedRetry.imageAlt")}
                        className="h-full w-full object-fill"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <IconPhotoOff className="size-4 text-foreground/70" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {[
                          scan.collectionName,
                          scan.orgName ?? t("unmatchedRetry.unknownOrg"),
                        ].join(" · ")}
                      </p>
                      {isBad && (
                        <Badge variant="destructive" className="shrink-0">
                          {t("unmatchedRetry.badPhoto")}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-foreground/70">
                      {[
                        scan.gameKey
                          ? `${scan.gameKey} (${scan.lang})`
                          : t("unmatchedRetry.statuses.no_game"),
                        new Date(scan.scannedAt).toLocaleString(i18n.language, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }),
                      ].join(" · ")}
                    </p>
                    <p className="truncate text-xs text-foreground/70">
                      {t("unmatchedRetry.original", {
                        details:
                          describeOriginal(scan) ||
                          t("unmatchedRetry.originalNone"),
                      })}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-3 sm:w-80">
                  <div className="min-w-0 flex-1">
                    {result ? (
                      <UnmatchedRetryResult result={result} />
                    ) : (
                      <p className="text-xs text-foreground/70">
                        {scan.hasEmbedding
                          ? t("unmatchedRetry.notRetried")
                          : t("unmatchedRetry.statuses.no_embedding")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant={isBad ? "destructive" : "outline"}
                    aria-pressed={isBad}
                    aria-label={badPhotoLabel}
                    title={badPhotoLabel}
                    onClick={() => badPhotos.toggle(scan.scanId)}
                  >
                    <IconPhotoX />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => retryOne(scan.scanId)}
                    disabled={retryMutation.isPending || !scan.hasEmbedding}
                  >
                    {isRetrying(scan.scanId) ? (
                      <IconLoader2 className="animate-spin" />
                    ) : (
                      <IconRefresh />
                    )}
                    {t("unmatchedRetry.retry")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UnmatchedScanDetailDialog
        scan={selected}
        result={selected ? results[selected.scanId] : undefined}
        isRetrying={!!selected && isRetrying(selected.scanId)}
        onRetry={retryOne}
        isBadPhoto={!!selected && badPhotos.isBad(selected.scanId)}
        onToggleBadPhoto={badPhotos.toggle}
        ocrResult={selected ? ocrResults[selected.scanId] : undefined}
        isRunningOcr={
          ocrMutation.isPending && ocrMutation.variables === selected?.scanId
        }
        onRunOcr={(scanId) => ocrMutation.mutate(scanId)}
        onPrevious={previousId ? () => setSelectedId(previousId) : null}
        onNext={nextId ? () => setSelectedId(nextId) : null}
        onClose={() => setSelectedId(null)}
      />
    </SettingsSection>
  );
}
