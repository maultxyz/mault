import type { BoardType } from "@/features/build/api/use-board-type";
import { BOARD_BUY_URLS, BOARD_INFO } from "@/lib/constants/build";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Trans } from "react-i18next";

type BuildT = TFunction<"build">;

export interface Row {
  key: string;
  qty: (moduleCount: number) => string;
  name: string | ((boardType: BoardType) => string);
  part: (t: BuildT, boardType: BoardType) => ReactNode;
  notes: (t: BuildT, moduleCount: number, boardType: BoardType) => ReactNode;
  buyUrl?: string | ((boardType: BoardType) => string | undefined);
  optional?: true | "classic-hopper" | "new-hopper";
}

export function optionalBadgeLabel(t: BuildT, optional: Row["optional"]): string {
  if (optional === "classic-hopper") return t("bom.optionalClassicHopperBadge");
  if (optional === "new-hopper") return t("bom.optionalNewHopperBadge");
  return t("bom.optionalBadge");
}

export interface Group {
  key: string;
  rows: Row[];
}

export function resolveRowName(row: Row, boardType: BoardType): string {
  return typeof row.name === "function" ? row.name(boardType) : row.name;
}

export function resolveRowBuyUrl(row: Row, boardType: BoardType): string | undefined {
  return typeof row.buyUrl === "function" ? row.buyUrl(boardType) : row.buyUrl;
}

// The bill of materials content, grouped by category - separate from
// bom.tsx's rendering so the huge parts literal doesn't drown out the
// component that displays it.
export const GROUPS: Group[] = [
  {
    key: "electronics",
    rows: [
      {
        key: "board",
        qty: () => "1",
        name: (boardType) => BOARD_INFO[boardType].displayName,
        part: (_, boardType) => BOARD_INFO[boardType].displayName,
        notes: (t, _, boardType) => (
          <Trans
            t={t}
            i18nKey={
              boardType === "uno_r4"
                ? "bom.groups.electronics.items.unoR4.notes"
                : "bom.groups.electronics.items.esp32.notes"
            }
            values={{ path: "firmware/main/main.ino" }}
            components={{
              code: <code className="font-mono text-[11px]" />,
            }}
          />
        ),
        buyUrl: (boardType) => BOARD_BUY_URLS[boardType],
      },
      {
        key: "pca9685",
        qty: () => "1",
        name: "Adafruit PCA9685",
        part: (t) => t("bom.groups.electronics.items.pca9685.part"),
        notes: (t) => t("bom.groups.electronics.items.pca9685.notes"),
        buyUrl: "https://amzn.to/4gPYpcG",
      },
      {
        key: "sg90-positional",
        qty: (n) => String(n * 3),
        name: "SG90 micro servo, positional",
        part: (t) => t("bom.groups.electronics.items.sg90Positional.part"),
        notes: (t, n) =>
          t("bom.groups.electronics.items.sg90Positional.notes", {
            count: n,
          }),
        buyUrl: "https://amzn.to/4hacYZM",
      },
      {
        key: "sg90-continuous",
        qty: () => "1",
        name: "SG90 servo, continuous rotation",
        part: (t) => t("bom.groups.electronics.items.sg90Continuous.part"),
        notes: (t) => t("bom.groups.electronics.items.sg90Continuous.notes"),
        buyUrl: "https://amzn.to/4qTVZy2",
      },
    ],
  },
  {
    key: "sensing",
    rows: [
      {
        key: "ir-sensor",
        qty: (n) => String(n + 1),
        name: "Reflective/obstacle IR sensor module",
        part: (t) => (
          <>
            {t("bom.groups.sensing.items.irSensor.part")}{" "}
            <span className="text-foreground/70">
              {t("bom.groups.sensing.items.irSensor.partSpec")}
            </span>
          </>
        ),
        notes: (t, n) =>
          t("bom.groups.sensing.items.irSensor.notes", { count: n }),
        buyUrl: "https://amzn.to/4qVNFOt",
      },
    ],
  },
  {
    key: "power",
    rows: [
      {
        key: "psu",
        qty: () => "1",
        name: "6V Power Supply",
        part: (t) => t("bom.groups.power.items.psu.part"),
        notes: (t, _, boardType) =>
          t("bom.groups.power.items.psu.notes", {
            board: BOARD_INFO[boardType].shortName,
          }),
        buyUrl: "https://www.amazon.com/dp/B0B2DZJQCR",
      },
      {
        key: "usb-cable",
        qty: () => "1",
        name: (boardType) => BOARD_INFO[boardType].usbCableName,
        part: (t, boardType) =>
          t(
            boardType === "uno_r4"
              ? "bom.groups.power.items.usbCable.part"
              : "bom.groups.power.items.usbCableEsp32.part",
          ),
        notes: (t, _, boardType) =>
          t(
            boardType === "uno_r4"
              ? "bom.groups.power.items.usbCable.notes"
              : "bom.groups.power.items.usbCableEsp32.notes",
          ),
      },
      {
        key: "barrel-jack",
        qty: () => "1",
        name: "DC barrel jack or screw-terminal pigtail",
        part: (t) => t("bom.groups.power.items.barrelJack.part"),
        notes: (t) => t("bom.groups.power.items.barrelJack.notes"),
        buyUrl: "https://amzn.to/4ieVcWq",
      },
    ],
  },
  {
    key: "structural",
    rows: [
      {
        key: "enclosure",
        qty: () => "1 set",
        name: "3D-printed enclosure & module housings",
        part: (t) => t("bom.groups.structural.items.enclosure.part"),
        notes: (t) => (
          <Trans
            t={t}
            i18nKey="bom.groups.structural.items.enclosure.notes"
            components={{
              mesh: (
                <a
                  href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/card_sorter.3mf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                />
              ),
              source: (
                <a
                  href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/Card%20Sorter.f3d"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                />
              ),
            }}
          />
        ),
      },
      {
        key: "filament",
        qty: () => "-",
        name: "PLA or PETG filament",
        part: (t) => t("bom.groups.structural.items.filament.part"),
        notes: (t) => t("bom.groups.structural.items.filament.notes"),
        buyUrl: "https://amzn.to/4ieZmgR",
      },
      {
        key: "o-ring",
        qty: () => "6",
        name: "20mm ID 26mm OD 3mm Width O-Ring",
        part: (t) => t("bom.groups.structural.items.oRing.part"),
        notes: (t) => t("bom.groups.structural.items.oRing.notes"),
        buyUrl: "https://amzn.to/4yqGK2s",
      },
      {
        key: "hopper-o-ring",
        qty: () => "4",
        name: "9.2mm ID 14mm OD 2.4mm Section O-Ring",
        part: (t) => t("bom.groups.structural.items.hopperORing.part"),
        notes: (t) => t("bom.groups.structural.items.hopperORing.notes"),
        optional: "new-hopper",
        buyUrl: "https://amzn.to/4gPYxJc",
      },
      {
        key: "servo-controller-plate",
        qty: () => "1",
        name: "3D-printed Servo Controller Plate",
        part: (t) => t("bom.groups.structural.items.servoControllerPlate.part"),
        notes: (t) => t("bom.groups.structural.items.servoControllerPlate.notes"),
      },
      {
        key: "bins-plate",
        qty: () => "2",
        name: "3D-printed Bins Plate",
        part: (t) => t("bom.groups.structural.items.binsPlate.part"),
        notes: (t) => t("bom.groups.structural.items.binsPlate.notes"),
      },
      {
        key: "end-bin-plate",
        qty: () => "1",
        name: "3D-printed End Bin Plate",
        part: (t) => t("bom.groups.structural.items.endBinPlate.part"),
        notes: (t) => t("bom.groups.structural.items.endBinPlate.notes"),
      },
    ],
  },
  {
    key: "fasteners",
    rows: [
      {
        key: "m3x6-screw",
        qty: () => "24",
        name: "M3x6 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x6Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x6Screw.notes"),
        buyUrl: "https://amzn.to/3VfNwJN",
      },
      {
        key: "m3-nut",
        qty: () => "8",
        name: "M3 nut",
        part: (t) => t("bom.groups.fasteners.items.m3Nut.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3Nut.notes"),
        buyUrl: "https://amzn.to/3VfNwJN",
      },
      {
        key: "m3x10-screw",
        qty: () => "2",
        name: "M3x10 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x10Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x10Screw.notes"),
        buyUrl: "https://amzn.to/3VfNwJN",
        optional: "classic-hopper",
      },
      {
        key: "m3-washer",
        qty: () => "2",
        name: "M3 washer",
        part: (t) => t("bom.groups.fasteners.items.m3Washer.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3Washer.notes"),
        buyUrl: "https://amzn.to/3VfNwJN",
      },
      {
        key: "m3x8-screw",
        qty: () => "2",
        name: "M3x8 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x8Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x8Screw.notes"),
        buyUrl: "https://amzn.to/3VfNwJN",
        optional: "new-hopper",
      },
      {
        key: "m3x25-screw",
        qty: () => "1",
        name: "M3x25 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x25Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x25Screw.notes"),
        optional: "new-hopper",
        buyUrl: "https://amzn.to/3VfNwJN",
      },
      {
        key: "hopper-spring",
        qty: () => "1",
        name: '7/32" x 11/16" spring',
        part: (t) => t("bom.groups.fasteners.items.hopperSpring.part"),
        notes: (t) => t("bom.groups.fasteners.items.hopperSpring.notes"),
        optional: "new-hopper",
        buyUrl: "https://amzn.to/4r1tbUv",
      },
      {
        key: "m2x6-screw",
        qty: (n) => String(n * 11 + 8),
        name: "M2x6 screw",
        part: (t) => (
          <>
            {t("bom.groups.fasteners.items.m2x6Screw.part")}{" "}
            <span className="text-foreground/70">
              {t("bom.groups.fasteners.items.m2x6Screw.partSpec")}
            </span>
          </>
        ),
        notes: (t, n, boardType) =>
          t("bom.groups.fasteners.items.m2x6Screw.notes", {
            count: n,
            board: BOARD_INFO[boardType].shortName,
          }),
        buyUrl: "https://amzn.to/4yhJU8l",
      },
      {
        key: "m2x8-screw",
        qty: (n) => String(n * 2),
        name: "M2x8 screw",
        part: (t) => t("bom.groups.fasteners.items.m2x8Screw.part"),
        notes: (t, n) =>
          t("bom.groups.fasteners.items.m2x8Screw.notes", { count: n }),
      },
      {
        key: "servo-horn-screw",
        qty: (n) => String(n * 3 + 1),
        name: "Servo horn screw",
        part: (t) => t("bom.groups.fasteners.items.servoHornScrew.part"),
        notes: (t) => t("bom.groups.fasteners.items.servoHornScrew.notes"),
      },
      {
        key: "hookup-wire",
        qty: () => "1 roll",
        name: "Low Voltage Wire",
        part: (t) => t("bom.groups.fasteners.items.hookupWire.part"),
        notes: (t) => t("bom.groups.fasteners.items.hookupWire.notes"),
        buyUrl: "https://amzn.to/4d3n6B7",
      },
      {
        key: "wago-connectors",
        qty: () => "2",
        name: "Wago connectors",
        part: (t) => t("bom.groups.fasteners.items.wagoConnectors.part"),
        notes: (t) => t("bom.groups.fasteners.items.wagoConnectors.notes"),
        buyUrl: "https://amzn.to/3SMx0jQ",
        optional: true,
      },
      {
        key: "dupont-connectors",
        qty: () => "~50",
        name: "Dupont Connectors",
        part: (t) => t("bom.groups.fasteners.items.dupontConnectors.part"),
        notes: (t) => t("bom.groups.fasteners.items.dupontConnectors.notes"),
        buyUrl: "https://amzn.to/4xZY124",
        optional: true,
      },
      {
        key: "dupont-crimper",
        qty: () => "1",
        name: "Dupont Crimper",
        part: (t) => t("bom.groups.fasteners.items.dupontCrimper.part"),
        notes: (t) => t("bom.groups.fasteners.items.dupontCrimper.notes"),
        buyUrl: "https://amzn.to/4gD8RoX",
        optional: true,
      },
    ],
  },
  {
    key: "optional",
    rows: [
      {
        key: "webcam",
        qty: () => "1",
        name: "Webcam",
        part: (t) => t("bom.groups.optional.items.webcam.part"),
        notes: (t) => t("bom.groups.optional.items.webcam.notes"),
        buyUrl: "https://amzn.to/4h8B6Mp",
      },
      {
        key: "camera-mount-screw",
        qty: () => "1",
        name: '1/4"-20 camera mount screw',
        part: (t) => t("bom.groups.optional.items.cameraMountScrew.part"),
        notes: (t) => t("bom.groups.optional.items.cameraMountScrew.notes"),
        buyUrl: "https://amzn.to/4qTWoAy",
      },
    ],
  },
];

