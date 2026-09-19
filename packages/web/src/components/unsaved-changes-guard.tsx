import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { useTranslation } from "react-i18next";

export function UnsavedChangesGuard({
  isDirty,
  onDiscard,
}: {
  isDirty: boolean;
  onDiscard?: () => void;
}) {
  const { t } = useTranslation("common");
  const blocker = useUnsavedChangesGuard(isDirty);
  const open = blocker.state === "blocked";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && blocker.state === "blocked") blocker.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("unsavedChanges.leaveTitle")}</DialogTitle>
          <DialogDescription>
            {t("unsavedChanges.leaveDescription")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => blocker.state === "blocked" && blocker.reset()}
          >
            {t("unsavedChanges.keepEditing")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (blocker.state !== "blocked") return;
              onDiscard?.();
              blocker.proceed();
            }}
          >
            {t("unsavedChanges.discardAndLeave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
