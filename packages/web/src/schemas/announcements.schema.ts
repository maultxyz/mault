import type { TFunction } from "i18next";
import { z } from "zod";

export function createAnnouncementFormSchema(t: TFunction<"announcements">) {
  return z
    .object({
      severity: z.enum(["info", "warning", "danger"]),
      message: z.string().trim().min(1, t("formDialog.validation.required")),
      isActive: z.boolean(),
      showOnLanding: z.boolean(),
      link: z.string().trim().optional(),
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
    )
    .refine(
      (data) => {
        if (!data.link) return true;
        try {
          const url = new URL(data.link);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      {
        message: t("formDialog.validation.invalidLink"),
        path: ["link"],
      },
    );
}

export type AnnouncementFormValues = z.infer<
  ReturnType<typeof createAnnouncementFormSchema>
>;
