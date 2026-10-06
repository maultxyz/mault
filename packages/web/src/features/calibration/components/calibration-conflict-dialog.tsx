import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { groupDifferences } from "@/features/calibration/lib/stored-calibration";
import type { CalibrationConflictDialogProps } from "@/lib/interfaces/calibration";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

export function CalibrationConflictDialog({
  conflict,
  onChoose,
}: CalibrationConflictDialogProps) {
  const { t } = useTranslation("calibration");
  const groups = conflict ? groupDifferences(conflict.differences) : [];

  return (
    <Dialog open={!!conflict} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("storedCalibration.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("storedCalibration.dialog.description", {
              name: conflict?.deviceName ?? "",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("storedCalibration.dialog.setting")}</TableHead>
                <TableHead className="text-right">
                  {t("storedCalibration.dialog.app")}
                </TableHead>
                <TableHead className="text-right">
                  {t("storedCalibration.dialog.sorter")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(([moduleNumber, differences]) => (
                <Fragment key={moduleNumber ?? "feeder"}>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableCell
                      colSpan={3}
                      className="text-xs font-medium uppercase tracking-wide text-foreground/70"
                    >
                      {moduleNumber === null
                        ? t("storedCalibration.dialog.feeder")
                        : t("storedCalibration.dialog.module", {
                            module: moduleNumber,
                          })}
                    </TableCell>
                  </TableRow>
                  {differences.map((difference) => (
                    <TableRow key={difference.field}>
                      <TableCell>
                        {t(`storedCalibration.fields.${difference.field}`)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {difference.appValue}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {difference.deviceValue}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-foreground/70">
          {t("storedCalibration.dialog.hint")}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChoose("device")}>
            {t("storedCalibration.dialog.useSorter")}
          </Button>
          <Button onClick={() => onChoose("app")}>
            {t("storedCalibration.dialog.useApp")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
