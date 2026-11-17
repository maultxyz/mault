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
import type {
  UnsavedChangesGuardGroupMemberProps,
  UnsavedChangesGuardProps,
} from "@/lib/interfaces/save-bar";
import { SaveBarGroupContext } from "@/lib/save-bar-group";
import { useContext, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";

export function UnsavedChangesGuard(props: UnsavedChangesGuardProps) {
  const group = useContext(SaveBarGroupContext);
  return group ? (
    <UnsavedChangesGuardGroupMember group={group} {...props} />
  ) : (
    <UnsavedChangesGuardView {...props} />
  );
}

function UnsavedChangesGuardGroupMember({
  group,
  isDirty,
  onDiscard,
}: UnsavedChangesGuardGroupMemberProps) {
  const guardId = useId();
  useEffect(() => {
    group.setGuard(guardId, { isDirty, discard: onDiscard });
  });
  useEffect(() => () => group.removeGuard(guardId), [group, guardId]);
  return null;
}

export function UnsavedChangesGuardView({
  isDirty,
  onDiscard,
}: UnsavedChangesGuardProps) {
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
            onClick={async () => {
              if (blocker.state !== "blocked") return;
              try {
                await onDiscard?.();
                blocker.proceed();
              } catch {
                return;
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
