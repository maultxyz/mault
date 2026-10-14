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
    { part: "sortingModule", plate: 1, count: moduleCount },
    { part: "feederModule", plate: 2, count: 1 },
    { part: "shroud", plate: 3, count: 1 },
    {
      part: "baseSupportTall",
      plate: 4,
      count: threeTall - (breakoutHeight === 3 ? 1 : 0),
    },
    {
      part: "baseSupportShort",
      plate: 4,
      count: oneTall - (breakoutHeight === 1 ? 1 : 0),
    },
    { part: "servoControllerPlate", plate: 5, count: 1 },
    { part: "endPlate", plate: 6, count: 1 },
    { part: "genericPlate", plate: 7, count: Math.max(0, moduleCount - 2) },
    { part: "binsPlate", plate: 8, count: 2 },
    { part: "endBinPlate", plate: 9, count: 1 },
    {
      part: "baseSupportBreakout",
      plate: 10,
      count: breakoutHeight === null ? 0 : 1,
    },
    {
      part: "circuitBoardPlate",
      plate: breakoutHeight === null ? 12 : 10,
      count: 1,
    },
    { part: "optionalPlate", plate: 13, count: null },
  ];
  return entries
    .filter((entry) => entry.count !== 0)
    .sort((a, b) => a.plate - b.plate);
}
