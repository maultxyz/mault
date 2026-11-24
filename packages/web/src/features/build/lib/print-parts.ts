import {
  breakoutSupportHeight,
  countBaseSupportPieces,
} from "@/lib/sorter-model/base-support";
import type {
  BoardType,
  Esp32MountType,
  PrintPartEntry,
} from "@/lib/interfaces/build";

export function isBreakoutBoardBuild(
  boardType: BoardType,
  mountType: Esp32MountType,
) {
  return boardType === "esp32" && mountType === "breakout";
}

export function printBreakoutHeight(
  moduleCount: number,
  boardType: BoardType,
  mountType: Esp32MountType,
) {
  return isBreakoutBoardBuild(boardType, mountType)
    ? breakoutSupportHeight(moduleCount)
    : null;
}

export function printPartEntries(
  moduleCount: number,
  breakoutHeight: number | null,
  isBreakoutBoard: boolean,
): PrintPartEntry[] {
  const { threeTall, oneTall } = countBaseSupportPieces(moduleCount);
  const entries: PrintPartEntry[] = [
    { part: "sortingModule", plate: 1, count: moduleCount },
    { part: "feederModule", plate: 3, count: 1 },
    { part: "shroud", plate: 5, count: 1 },
    {
      part: "circuitBoardPlate",
      plate: isBreakoutBoard ? 14 : 16,
      count: 1,
    },
    {
      part: "baseSupportTall",
      plate: 6,
      count: threeTall - (breakoutHeight === null ? 0 : 1),
    },
    { part: "baseSupportShort", plate: 6, count: oneTall },
    {
      part: "baseSupportBreakout",
      plate: 14,
      count: breakoutHeight === null ? 0 : 1,
    },
    { part: "servoControllerPlate", plate: 7, count: 1 },
    { part: "endPlate", plate: 8, count: 1 },
    { part: "genericPlate", plate: 9, count: Math.max(0, moduleCount - 2) },
    { part: "binsPlate", plate: 10, count: 2 },
    { part: "endBinPlate", plate: 11, count: 1 },
    { part: "optionalPlate", plate: 12, count: null },
  ];
  return entries
    .filter((entry) => entry.count !== 0)
    .sort((a, b) => a.plate - b.plate);
}
