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
    { part: "feederModule", plate: 4, count: 1 },
    { part: "shroud", plate: 6, count: 1 },
    {
      part: "circuitBoardPlate",
      plate: isBreakoutBoard ? 8 : 7,
      count: 1,
    },
    {
      part: "baseSupportTall",
      plate: 9,
      count: threeTall - (breakoutHeight === null ? 0 : 1),
    },
    { part: "baseSupportShort", plate: 9, count: oneTall },
    {
      part: "baseSupportBreakout",
      plate: 10,
      count: breakoutHeight === null ? 0 : 1,
    },
    { part: "servoControllerPlate", plate: 12, count: 1 },
    { part: "endPlate", plate: 13, count: 1 },
    { part: "genericPlate", plate: 14, count: Math.max(0, moduleCount - 2) },
    { part: "binsPlate", plate: 16, count: 2 },
    { part: "endBinPlate", plate: 17, count: 1 },
    { part: "optionalPlate", plate: 20, count: null },
  ];
  return entries
    .filter((entry) => entry.count !== 0)
    .sort((a, b) => a.plate - b.plate);
}
