import type { TFunction } from "i18next";
import { z } from "zod";

export function createAnnouncementFormSchema(t: TFunction<"announcements">) {
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
