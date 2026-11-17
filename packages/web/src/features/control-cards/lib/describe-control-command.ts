import {
  listScannerControlActions,
  type ScannerControlCommand,
  type ScannerControlCommandNames,
} from "@magic-vault/shared";
import type { ScannerTFunction } from "@/lib/interfaces/control-cards";

export function describeScannerControlCommand(
  command: ScannerControlCommand,
  names: ScannerControlCommandNames,
  t: ScannerTFunction,
): string[] {
  return listScannerControlActions(command, names).map((action) =>
    t(`controlCards.actions.${action.key}`, action.values),
  );
}
