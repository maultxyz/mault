import type { Announcement } from "@magic-vault/shared";
import type { AnnouncementFormValues } from "@/schemas/announcements.schema";

export interface AnnouncementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement | null;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
}
