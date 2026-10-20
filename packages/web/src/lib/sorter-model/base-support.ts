import {
  MODULE_PINS_PER_PIECE_TOP,
  MODULE_PINS_PER_UNIT_FRONT,
} from "@/lib/constants/build";
import type {
  SorterBaseSupportBlock,
  SorterBaseSupportCounts,
  SorterModulePinCounts,
} from "@/lib/interfaces/sorter-model";

function columnPieces(height: number) {
  return [
    ...Array<number>(Math.floor(height / 3)).fill(3),
    ...Array<number>(height % 3).fill(1),
  ];
}

export function countBaseSupportPieces(
  moduleCount: number,
): SorterBaseSupportCounts {
  let threeTall = 0;
  let oneTall = 0;
  for (let tier = 1; tier <= moduleCount + 1; tier++) {
    threeTall += Math.floor(tier / 3);
    oneTall += tier % 3;
  }
  return { threeTall, oneTall };
}

export function countModulePins(moduleCount: number): SorterModulePinCounts {
  const { threeTall, oneTall } = countBaseSupportPieces(moduleCount);
  const columns = moduleCount + 1;
  const units = (columns * (columns + 1)) / 2;
  const front = MODULE_PINS_PER_UNIT_FRONT * (units - columns);
  const top = MODULE_PINS_PER_PIECE_TOP * (threeTall + oneTall);
  return { front, top, total: front + top };
}

export function breakoutSupportHeight(moduleCount: number) {
  return moduleCount >= 3 ? 3 : 1;
}

export function baseSupportBlocks(
  moduleCount: number,
  breakoutHeight: number | null,
): SorterBaseSupportBlock[][] {
  const columns = Array.from({ length: moduleCount + 1 }, (_, column) =>
    columnPieces(moduleCount + 1 - column),
  );
  let breakout: [number, number] | null = null;
  if (breakoutHeight !== null) {
    for (const [column, pieces] of columns.entries()) {
      const index = pieces.indexOf(breakoutHeight);
      if (index === -1) continue;
      breakout = [column, index];
      break;
    }
  }

  return columns.map((pieces, column) =>
    pieces.flatMap((height, index): SorterBaseSupportBlock[] => {
      const part =
        breakout?.[0] === column && breakout[1] === index
          ? "baseSupportBreakout"
          : height === 3
            ? "baseSupportTall"
            : "baseSupportShort";
      return Array.from({ length: height }, () => ({
        part,
        alt: index % 2 === 1,
      }));
    }),
  );
}
