import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Announcement, AnnouncementSeverity } from "@magic-vault/shared";
import { TFunction } from "i18next";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const SEVERITIES: AnnouncementSeverity[] = ["info", "warning", "danger"];

function createAnnouncementFormSchema(t: TFunction<"announcements">) {
  return z
    .object({
      severity: z.enum(["info", "warning", "danger"]),
      message: z.string().trim().min(1, t("formDialog.validation.required")),
      isActive: z.boolean(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
    })
    .refine(
      (data) =>
        !data.startsAt ||
        !data.endsAt ||
        new Date(data.endsAt) > new Date(data.startsAt),
      {
        message: t("formDialog.validation.endAfterStart"),
        path: ["endsAt"],
      },
    );
}

export type AnnouncementFormValues = z.infer<
  ReturnType<typeof createAnnouncementFormSchema>
>;

function toDatetimeLocalValue(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(
  value: string | undefined,
): string | null {
  return value ? new Date(value).toISOString() : null;
}

function toFormValues(
  announcement?: Announcement | null,
): AnnouncementFormValues {
  if (!announcement) {
    return {
      severity: "info",
      message: "",
      isActive: true,
      startsAt: "",
      endsAt: "",
    };
  }
  return {
    severity: announcement.severity,
    message: announcement.message,
    isActive: announcement.isActive,
    startsAt: toDatetimeLocalValue(announcement.startsAt),
    endsAt: toDatetimeLocalValue(announcement.endsAt),
  };
}

interface AnnouncementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
}

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  announcement,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const { t } = useTranslation("announcements");
  const announcementFormSchema = createAnnouncementFormSchema(t);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: toFormValues(announcement),
  });

  useEffect(() => {
    if (open) reset(toFormValues(announcement));
  }, [open, announcement, reset]);

  async function handleFormSubmit(values: AnnouncementFormValues) {
    await onSubmit(values);
    onOpenChange(false);
  }

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-md"
      title={
        announcement ? t("formDialog.editTitle") : t("formDialog.addTitle")
      }
      description={t("formDialog.description")}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("formDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="announcement-form"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t("formDialog.saving")
              : announcement
                ? t("formDialog.saveChanges")
                : t("formDialog.create")}
          </Button>
        </>
      }
    >
      <form
        id="announcement-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-4"
      >
        <Field data-invalid={!!errors.severity}>
          <FieldLabel>{t("formDialog.severityLabel")}</FieldLabel>
          <Controller
            control={control}
            name="severity"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((severity) => (
                    <SelectItem key={severity} value={severity}>
                      {t(`severity.${severity}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.severity]} />
        </Field>

        <Field data-invalid={!!errors.message}>
          <FieldLabel>{t("formDialog.messageLabel")}</FieldLabel>
          <Textarea
            placeholder={t("formDialog.messagePlaceholder")}
            {...register("message")}
          />
          <FieldError errors={[errors.message]} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.startsAt}>
            <FieldLabel>{t("formDialog.startsAtLabel")}</FieldLabel>
            <Input type="datetime-local" {...register("startsAt")} />
            <FieldError errors={[errors.startsAt]} />
          </Field>
          <Field data-invalid={!!errors.endsAt}>
            <FieldLabel>{t("formDialog.endsAtLabel")}</FieldLabel>
            <Input type="datetime-local" {...register("endsAt")} />
            <FieldError errors={[errors.endsAt]} />
          </Field>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          {t("formDialog.scheduleHint")}
        </p>

        <Field orientation="horizontal">
          <FieldLabel>{t("formDialog.activeLabel")}</FieldLabel>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Field>
      </form>
    </DynamicDialog>
  );
}
