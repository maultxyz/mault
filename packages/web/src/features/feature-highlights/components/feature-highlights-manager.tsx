import { DeleteDialog } from "@/components/delete-dialog";
import { DividedRowsSkeleton } from "@/components/divided-rows-skeleton";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminFeatureHighlightsQueryOptions,
  createAdminFeatureHighlight,
  deleteAdminFeatureHighlight,
  updateAdminFeatureHighlight,
} from "@/features/feature-highlights/api/feature-highlights";
import { FeatureHighlightFormDialog } from "@/features/feature-highlights/components/feature-highlight-form-dialog";
import { adminFeatureHighlightInputOf } from "@/features/feature-highlights/lib/feature-highlight-slides";
import { FEATURE_HIGHLIGHTS_QUERY_KEY } from "@/lib/constants/feature-highlights";
import { TWO_ICON_BUTTONS_SKELETON_TRAILING } from "@/lib/constants/skeletons";
import { toast } from "@/lib/toast";
import type { FeatureHighlightFormValues } from "@/schemas/feature-highlights.schema";
import type { AdminFeatureHighlight } from "@magic-vault/shared";
import {
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function FeatureHighlightsManager() {
  const { t, i18n } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [formTarget, setFormTarget] = useState<
    AdminFeatureHighlight | null | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminFeatureHighlight | null>(null);
  const highlightsQuery = useQuery(adminFeatureHighlightsQueryOptions);
  const highlights = highlightsQuery.data ?? [];

  function refreshHighlights() {
    void queryClient.invalidateQueries({
      queryKey: adminFeatureHighlightsQueryOptions.queryKey,
    });
    void queryClient.invalidateQueries({
      queryKey: [FEATURE_HIGHLIGHTS_QUERY_KEY],
    });
  }

  const saveMutation = useMutation({
    mutationFn: ({
      guid,
      values,
    }: {
      guid: string | null;
      values: FeatureHighlightFormValues;
    }) => {
      const input = adminFeatureHighlightInputOf(values);
      return guid
        ? updateAdminFeatureHighlight(guid, input)
        : createAdminFeatureHighlight(input);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => deleteAdminFeatureHighlight(guid),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message || t("featureHighlights.toasts.deleteError"));
        return;
      }
      refreshHighlights();
      toast.success(t("featureHighlights.toasts.deleteSuccess"));
    },
    onError: () => toast.error(t("featureHighlights.toasts.deleteError")),
  });

  async function handleSubmit(values: FeatureHighlightFormValues) {
    try {
      const result = await saveMutation.mutateAsync({
        guid: formTarget?.guid ?? null,
        values,
      });
      if (!result.success || !result.data) {
        toast.error(result.message || t("featureHighlights.toasts.saveError"));
        return false;
      }
      refreshHighlights();
      toast.success(t("featureHighlights.toasts.saveSuccess"));
      return true;
    } catch {
      toast.error(t("featureHighlights.toasts.saveError"));
      return false;
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <SettingsSection
      heading={t("featureHighlights.heading")}
      description={t("featureHighlights.description")}
      action={
        <Button onClick={() => setFormTarget(null)}>
          <IconPlus aria-hidden />
          {t("featureHighlights.add")}
        </Button>
      }
    >
      {highlightsQuery.isLoading ? (
        <DividedRowsSkeleton
          leading="none"
          hasTitleBadge
          trailing={TWO_ICON_BUTTONS_SKELETON_TRAILING}
          rowClassName="px-4 py-2.5 md:px-2.5 md:py-2"
        />
      ) : highlightsQuery.isError && !highlightsQuery.data ? (
        <LoadErrorCallout
          message={t("featureHighlights.loadFailed")}
          onRetry={() => void highlightsQuery.refetch()}
        />
      ) : highlights.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconSparkles}
          title={t("featureHighlights.empty")}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {highlights.map((highlight) => {
            const title =
              highlight.slides[0]?.title || t("featureHighlights.preview.untitled");
            const isScheduled =
              highlight.isPublished &&
              new Date(highlight.publishedAt).getTime() > Date.now();
            return (
              <li
                key={highlight.guid}
                className="flex items-center gap-3 px-4 py-2.5 md:px-2.5 md:py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {title}
                    </span>
                    <Badge
                      variant={
                        highlight.isPublished && !isScheduled
                          ? "success"
                          : "outline"
                      }
                    >
                      {!highlight.isPublished
                        ? t("featureHighlights.status.draft")
                        : isScheduled
                          ? t("featureHighlights.status.scheduled")
                          : t("featureHighlights.status.published")}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-foreground/70">
                    {t("featureHighlights.summary", {
                      date: formatDate(highlight.publishedAt),
                      count: highlight.slides.length,
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={t("featureHighlights.editLabel", { title })}
                    onClick={() => setFormTarget(highlight)}
                  >
                    <IconPencil aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    aria-label={t("featureHighlights.deleteLabel", { title })}
                    onClick={() => setDeleteTarget(highlight)}
                  >
                    <IconTrash aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FeatureHighlightFormDialog
        open={formTarget !== undefined}
        onOpenChange={(open) => {
          if (!open) setFormTarget(undefined);
        }}
        highlight={formTarget ?? null}
        onSubmit={handleSubmit}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("featureHighlights.deleteDialog.title")}
        description={t("featureHighlights.deleteDialog.description")}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.guid);
        }}
      />
    </SettingsSection>
  );
}
