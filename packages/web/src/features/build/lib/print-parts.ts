import {
  breakoutSupportHeight,
  countBaseSupportPieces,
} from "@/lib/sorter-model/base-support";
import type {
  BoardType,
  Esp32MountType,
  PrintPartEntry,
} from "@/lib/interfaces/build";

export function printBreakoutHeight(
  moduleCount: number,
  boardType: BoardType,
  mountType: Esp32MountType,
) {
  return boardType === "esp32" && mountType === "breakout"
    ? breakoutSupportHeight(moduleCount)
    : null;
}

export function printPartEntries(
  moduleCount: number,
  breakoutHeight: number | null,
): PrintPartEntry[] {
  const { threeTall, oneTall } = countBaseSupportPieces(moduleCount);
  const entries: PrintPartEntry[] = [
    { part: "sortingModule", count: moduleCount },
    { part: "feederModule", count: 1 },
    { part: "shroud", count: 1 },
    {
      part: "baseSupportTall",
      count: threeTall - (breakoutHeight === 3 ? 1 : 0),
    },
    {
      part: "baseSupportShort",
      count: oneTall - (breakoutHeight === 1 ? 1 : 0),
    },
    { part: "baseSupportBreakout", count: breakoutHeight === null ? 0 : 1 },
    { part: "circuitBoardPlate", count: 1 },
    { part: "servoControllerPlate", count: 1 },
    { part: "genericPlate", count: Math.max(0, moduleCount - 2) },
    { part: "endPlate", count: 1 },
    { part: "binsPlate", count: 2 },
    { part: "endBinPlate", count: 1 },
    { part: "otherPrinted", count: null },
    { part: "hardware", count: null },
  ];
  return entries.filter((entry) => entry.count !== 0);
}
