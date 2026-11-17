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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function UnsavedChangesGuard({
  isDirty,
  onDiscard,
}: {
  isDirty: boolean;
  onDiscard?: () => void | Promise<void>;
}) {
  const { t } = useTranslation("common");
  const blocker = useUnsavedChangesGuard(isDirty);
  const [discarding, setDiscarding] = useState(false);
  const open = blocker.state === "blocked";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !discarding && blocker.state === "blocked") blocker.reset();
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
            disabled={discarding}
            onClick={() => blocker.state === "blocked" && blocker.reset()}
          >
            {t("unsavedChanges.keepEditing")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={discarding}
            onClick={async () => {
              if (blocker.state !== "blocked" || discarding) return;
              try {
                const result = onDiscard?.();
                if (result) {
                  setDiscarding(true);
                  await result;
                }
                blocker.proceed();
              } catch (error) {
                console.error("Discard failed:", error);
                toast.error(t("unsavedChanges.discardFailed"));
              } finally {
                setDiscarding(false);
              }
            }}
          >
            {t("unsavedChanges.discardAndLeave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
