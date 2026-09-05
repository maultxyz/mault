import { DeleteDialog } from "@/components/delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  announcementsQueryOptions,
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/features/announcements/api/announcements";
import { ALERT_SEVERITY_ICON_CLASS } from "@/lib/alerts";
import { cn } from "@/lib/utils";
import type { Announcement } from "@magic-vault/shared";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AnnouncementFormDialog,
  fromDatetimeLocalValue,
  type AnnouncementFormValues,
} from "./announcement-form-dialog";

function formatSchedule(
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string,
  announcement: Announcement,
): string | null {
  const { startsAt, endsAt } = announcement;
  if (!startsAt && !endsAt) return null;

  const format = (value: Date | string) =>
    new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (startsAt && endsAt) {
    return t("schedule.startsAndEnds", {
      start: format(startsAt),
      end: format(endsAt),
    });
  }
  if (startsAt) return t("schedule.starts", { date: format(startsAt) });
  return t("schedule.ends", { date: format(endsAt!) });
}

export function AnnouncementsManager() {
  const { t, i18n } = useTranslation("announcements");
  const queryClient = useQueryClient();
  const [formTarget, setFormTarget] = useState<Announcement | null | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const announcementsQuery = useQuery(announcementsQueryOptions);

  function setAnnouncements(announcements: Announcement[]) {
    queryClient.setQueryData(announcementsQueryOptions.queryKey, announcements);
    queryClient.invalidateQueries({ queryKey: ["announcements", "active"] });
  }

  const createMutation = useMutation({
    mutationFn: (values: AnnouncementFormValues) =>
      createAnnouncement({
        ...values,
        startsAt: fromDatetimeLocalValue(values.startsAt),
        endsAt: fromDatetimeLocalValue(values.endsAt),
      }),
    onSuccess: (r) => {
      if (!r.success || !r.data) {
        toast.error(r.message || t("toasts.createError"));
        return;
      }
      setAnnouncements([r.data, ...(announcementsQuery.data ?? [])]);
      toast.success(t("toasts.createSuccess"));
    },
    onError: () => toast.error(t("toasts.createError")),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      guid,
      values,
    }: {
      guid: string;
      values: AnnouncementFormValues;
    }) =>
      updateAnnouncement(guid, {
        ...values,
        startsAt: fromDatetimeLocalValue(values.startsAt),
        endsAt: fromDatetimeLocalValue(values.endsAt),
      }),
    onSuccess: (r) => {
      if (!r.success || !r.data) {
        toast.error(r.message || t("toasts.updateError"));
        return;
      }
      setAnnouncements(
        (announcementsQuery.data ?? []).map((a) =>
          a.guid === r.data!.guid ? r.data! : a,
        ),
      );
      toast.success(t("toasts.updateSuccess"));
    },
    onError: () => toast.error(t("toasts.updateError")),
  });

  const deleteMutation = useMutation({
    mutationFn: (guid: string) => deleteAnnouncement(guid),
    onSuccess: (r, guid) => {
      if (!r.success) {
        toast.error(r.message || t("toasts.deleteError"));
        return;
      }
      setAnnouncements((announcementsQuery.data ?? []).filter((a) => a.guid !== guid));
      toast.success(t("toasts.deleteSuccess"));
    },
    onError: () => toast.error(t("toasts.deleteError")),
  });

  async function handleSubmit(values: AnnouncementFormValues) {
    if (formTarget) {
      await updateMutation.mutateAsync({ guid: formTarget.guid, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t("heading")}</p>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setFormTarget(null)}>
          <IconPlus size={14} />
          {t("addAnnouncement")}
        </Button>
      </div>

      <div className="divide-y">
        {announcementsQuery.isLoading && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {t("loading")}
          </p>
        )}
        {announcementsQuery.data?.map((announcement) => {
          const schedule = formatSchedule(t, i18n.language, announcement);
          return (
            <div
              key={announcement.guid}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      ALERT_SEVERITY_ICON_CLASS[announcement.severity],
                    )}
                  >
                    {t(`severity.${announcement.severity}`)}
                  </span>
                  <Badge variant={announcement.isActive ? "success" : "outline"}>
                    {announcement.isActive ? t("active") : t("inactive")}
                  </Badge>
                </div>
                <p className="text-sm truncate">{announcement.message}</p>
                {schedule && (
                  <p className="text-xs text-muted-foreground truncate">
                    {schedule}
                  </p>
                )}
              </div>
              <ButtonGroup>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setFormTarget(announcement)}
                  title={t("editTitle")}
                >
                  <IconPencil size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="outline-destructive"
                  onClick={() => setDeleteTarget(announcement)}
                  title={t("deleteTitle")}
                >
                  <IconTrash size={14} />
                </Button>
              </ButtonGroup>
            </div>
          );
        })}
        {announcementsQuery.data?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {t("empty")}
          </p>
        )}
      </div>

      <AnnouncementFormDialog
        open={formTarget !== undefined}
        onOpenChange={(open) => {
          if (!open) setFormTarget(undefined);
        }}
        announcement={formTarget}
        onSubmit={handleSubmit}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description")}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.guid);
        }}
      />
    </div>
  );
}
