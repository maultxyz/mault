import type { BoardType } from "@/features/build/api/use-board-type";
import type { Esp32MountType } from "@/features/build/api/use-esp32-mount-type";
import { BOARD_INFO } from "@/lib/constants/build";
import {
  IconCpu,
  IconCube,
  IconPlayerPlay,
  IconPlugConnected,
  IconTool,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { Trans } from "react-i18next";

export interface Step {
  key: string;
  text: ReactNode;
  note?: ReactNode;
  images?: string[];
  optional?: true | "classic-hopper" | "new-hopper";
}

export function optionalBadgeLabel(
  t: TFunction<"build">,
  optional: Step["optional"],
): string {
  if (optional === "classic-hopper")
    return t("assembly.optionalClassicHopperBadge");
  if (optional === "new-hopper") return t("assembly.optionalNewHopperBadge");
  return t("assembly.optionalBadge");
}

export interface Phase {
  key: string;
  title: string;
  icon: typeof IconCube;
  steps: Step[];
  videos?: string[];
}

export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match?.[1] ?? null;
}

// The step-by-step assembly guide content, parameterized by module count,
// board type, and (for ESP32) mount type - separate from BuildAssembly's
// rendering so the huge phase/step literal doesn't drown out the component.
export function buildPhases(
  t: TFunction<"build">,
  moduleCount: number,
  boardType: BoardType,
  mountType: Esp32MountType,
): Phase[] {
  const board = BOARD_INFO[boardType];
  const isEsp32Family = boardType !== "uno_r4";
  const isEsp32Breakout = boardType === "esp32" && mountType === "breakout";
  const sortingModules = moduleCount;
  const plateBase = ((moduleCount + 1) * (moduleCount + 2)) / 2;
  const genericBase = Math.max(0, moduleCount - 2);
  const binHolders = moduleCount * 2;

  return [
    {
      key: "print",
      title: t("assembly.phases.print.title"),
      icon: IconCube,
      steps: [
        {
          key: "print-sorting-module",
          text: (
            <Trans
              t={t}
              i18nKey="assembly.phases.print.steps.printSortingModule.text"
              values={{ count: sortingModules }}
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
          key: "print-feeder-module",
          text: t("assembly.phases.print.steps.printFeederModule.text"),
        },
        {
          key: "print-sorting-module-shroud",
          text: t("assembly.phases.print.steps.printSortingModuleShroud.text"),
        },
        {
          key: "print-plate-base",
          text: t("assembly.phases.print.steps.printPlateBase.text", {
            modules: moduleCount,
            count: plateBase,
          }),
          note: isEsp32Breakout
            ? t("assembly.phases.print.steps.printPlateBase.breakoutNote")
            : undefined,
          images: [
            "/instructions/base_module.jpg",
            "/instructions/base_module_assembled.jpg",
          ],
        },
        {
          key: "print-plate-base-bottom",
          text: t(
            boardType === "uno_r4"
              ? "assembly.phases.print.steps.printPlateBaseBottom.arduino"
              : isEsp32Breakout
                ? "assembly.phases.print.steps.printPlateBaseBottom.esp32Breakout"
                : "assembly.phases.print.steps.printPlateBaseBottom.esp32Bare",
          ),
        },
        {
          key: "print-generic-base",
          text: t("assembly.phases.print.steps.printGenericBase.text", {
            modules: moduleCount,
            count: genericBase,
          }),
        },
        {
          key: "print-bin-holders",
          text: t("assembly.phases.print.steps.printBinHolders.text", {
            modules: moduleCount,
            count: binHolders,
          }),
        },
        {
          key: "dry-fit",
          text: t("assembly.phases.print.steps.dryFit.text"),
          images: ["/instructions/v5.jpg"],
        },
        {
          key: "mount-boards-to-panels",
          text: t("assembly.phases.print.steps.mountBoardsToPanels.text", {
            board: board.shortName,
          }),
          note: t("assembly.phases.print.steps.mountBoardsToPanels.note", {
            board: board.shortName,
          }),
        },
        {
          key: "attach-base-panels",
          text: t("assembly.phases.print.steps.attachBasePanels.text"),
          note: t("assembly.phases.print.steps.attachBasePanels.note", {
            board: board.shortName,
          }),
        },
      ],
    },
    {
      key: "firmware",
      title: t("assembly.phases.firmware.title"),
      icon: IconCpu,
      steps: [
        ...(isEsp32Family
          ? [
              {
                key: "install-esp32-core",
                text: t("assembly.phases.firmware.steps.installEsp32Core.text"),
                note: t("assembly.phases.firmware.steps.installEsp32Core.note"),
              },
            ]
          : []),
        {
          key: "install-libraries",
          text: t("assembly.phases.firmware.steps.installLibraries.text"),
          note: t("assembly.phases.firmware.steps.installLibraries.note"),
        },
        isEsp32Family
          ? {
              key: "upload-sketch",
              text: t("assembly.phases.firmware.steps.uploadSketchEsp32.text"),
              note: t("assembly.phases.firmware.steps.uploadSketchEsp32.note"),
            }
          : {
              key: "upload-sketch",
              text: t("assembly.phases.firmware.steps.uploadSketch.text"),
            },
        {
          key: "confirm-ready",
          text: t("assembly.phases.firmware.steps.confirmReady.text"),
        },
      ],
    },
    {
      key: "assemble-modules",
      title: t("assembly.phases.assembleModules.title"),
      icon: IconTool,
      videos: ["https://youtu.be/ayseLirjn4k", "https://youtu.be/nFxPrAMkSPc"],
      steps: [
        {
          key: "mount-module-servos",
          text: t(
            "assembly.phases.assembleModules.steps.mountModuleServos.text",
          ),
        },
        {
          key: "mount-bottom-flapper",
          text: t(
            "assembly.phases.assembleModules.steps.mountBottomFlapper.text",
          ),
          note: t(
            "assembly.phases.assembleModules.steps.mountBottomFlapper.note",
          ),
          images: [
            "/instructions/bottom_paddle_disassembled.jpg",
            "/instructions/bottom_paddle_assembled.jpg",
            "/instructions/bottom_paddle_attached.jpg",
          ],
        },
        {
          key: "mount-side-flappers",
          text: t(
            "assembly.phases.assembleModules.steps.mountSideFlappers.text",
          ),
          note: t(
            "assembly.phases.assembleModules.steps.mountSideFlappers.note",
          ),
          images: [
            "/instructions/side_paddles_disassembled.jpg",
            "/instructions/side_paddles_assembled.jpg",
            "/instructions/side_paddles_attached.jpg",
          ],
        },
        {
          key: "mount-pusher-arm",
          text: t("assembly.phases.assembleModules.steps.mountPusherArm.text"),
          note: t("assembly.phases.assembleModules.steps.mountPusherArm.note"),
          images: [
            "/instructions/pusher_disassembled.jpg",
            "/instructions/pusher_assembled.jpg",
            "/instructions/pusher_attached.jpg",
          ],
        },
        {
          key: "fit-feeder-orings",
          text: t("assembly.phases.assembleModules.steps.fitFeederOrings.text"),
          note: t("assembly.phases.assembleModules.steps.fitFeederOrings.note"),
          images: ["/instructions/roller_o_rings_mounted.jpg"],
        },
        {
          key: "mount-feeder-roller",
          text: t(
            "assembly.phases.assembleModules.steps.mountFeederRoller.text",
          ),
          images: [
            "/instructions/assembling_feeder.jpg",
            "/instructions/roller_mounted.jpg",
          ],
        },
        {
          key: "mount-feeder-servo",
          text: t(
            "assembly.phases.assembleModules.steps.mountFeederServo.text",
          ),
          images: ["/instructions/feeder_servo_mounted.jpg"],
        },
        {
          key: "mount-feeder-wall",
          text: t("assembly.phases.assembleModules.steps.mountFeederWall.text"),
          note: t("assembly.phases.assembleModules.steps.mountFeederWall.note"),
          images: [
            "/instructions/rube_disassembled.jpg",
            "/instructions/tube_assembled.jpg",
            "/instructions/feeder_tube_wall.jpg",
          ],
          optional: "classic-hopper",
        },
        {
          key: "fit-hopper-roller-orings",
          text: t(
            "assembly.phases.assembleModules.steps.fitHopperRollerOrings.text",
          ),
          note: t(
            "assembly.phases.assembleModules.steps.fitHopperRollerOrings.note",
          ),
          optional: "new-hopper",
        },
        {
          key: "mount-hopper-roller",
          text: t(
            "assembly.phases.assembleModules.steps.mountHopperRoller.text",
          ),
          images: ["/instructions/new_hopper.JPG"],
          optional: "new-hopper",
        },
        {
          key: "calibrate-hopper-roller",
          text: t(
            "assembly.phases.assembleModules.steps.calibrateHopperRoller.text",
          ),
          note: t(
            "assembly.phases.assembleModules.steps.calibrateHopperRoller.note",
          ),
          optional: "new-hopper",
        },
        {
          key: "mount-module-ir",
          text: t("assembly.phases.assembleModules.steps.mountModuleIr.text", {
            modules: moduleCount,
          }),
          images: ["/instructions/sorter_ir_sensor_mounted.jpg"],
        },
        {
          key: "mount-hopper-ir",
          text: t("assembly.phases.assembleModules.steps.mountHopperIr.text"),
          note: t("assembly.phases.assembleModules.steps.mountHopperIr.note"),
          images: ["/instructions/feeder_ir_sensor_mounted.jpg"],
        },
      ],
    },
    {
      key: "wire-and-calibrate",
      title: t("assembly.phases.wireAndCalibrate.title"),
      icon: IconPlugConnected,
      videos: ["https://youtu.be/ZKFTkpGLBB4", "https://youtu.be/FTFXHQ4d4Jk"],
      steps: [
        {
          key: "wire-i2c",
          text: t("assembly.phases.wireAndCalibrate.steps.wireI2c.text", {
            board: board.shortName,
          }),
          note: t("assembly.phases.wireAndCalibrate.steps.wireI2c.note"),
        },
        {
          key: "wire-servos",
          text: t("assembly.phases.wireAndCalibrate.steps.wireServos.text", {
            count: moduleCount * 3 + 1,
            lastChannel: moduleCount * 3 - 1,
          }),
          note: t("assembly.phases.wireAndCalibrate.steps.wireServos.note"),
        },
        {
          key: "wire-sensors",
          text: t("assembly.phases.wireAndCalibrate.steps.wireSensors.text", {
            count: moduleCount + 1,
          }),
          note: t("assembly.phases.wireAndCalibrate.steps.wireSensors.note", {
            count: moduleCount + 1,
          }),
        },
        {
          key: "wire-power",
          text: t("assembly.phases.wireAndCalibrate.steps.wirePower.text", {
            board: board.shortName,
          }),
          note: t("assembly.phases.wireAndCalibrate.steps.wirePower.note"),
        },
        {
          key: "connect-serial",
          text: t("assembly.phases.wireAndCalibrate.steps.connectSerial.text", {
            board: board.shortName,
          }),
        },
        {
          key: "calibrate-modules",
          text: t(
            "assembly.phases.wireAndCalibrate.steps.calibrateModules.text",
          ),
          note: t(
            "assembly.phases.wireAndCalibrate.steps.calibrateModules.note",
          ),
        },
        {
          key: "install-horns",
          text: t("assembly.phases.wireAndCalibrate.steps.installHorns.text", {
            count: moduleCount * 3,
          }),
          note: t("assembly.phases.wireAndCalibrate.steps.installHorns.note"),
        },
        {
          key: "calibrate-feeder",
          text: t(
            "assembly.phases.wireAndCalibrate.steps.calibrateFeeder.text",
          ),
        },
        {
          key: "check-ir",
          text: t("assembly.phases.wireAndCalibrate.steps.checkIr.text", {
            count: moduleCount + 1,
          }),
          note: t("assembly.phases.wireAndCalibrate.steps.checkIr.note"),
        },
        {
          key: "test-bins",
          text: t("assembly.phases.wireAndCalibrate.steps.testBins.text"),
        },
      ],
    },
    {
      key: "load-run",
      title: t("assembly.phases.loadRun.title"),
      icon: IconPlayerPlay,
      steps: [
        {
          key: "load-hopper",
          text: t("assembly.phases.loadRun.steps.loadHopper.text"),
        },
        {
          key: "full-pass",
          text: t("assembly.phases.loadRun.steps.fullPass.text"),
        },
      ],
    },
  ];
}
