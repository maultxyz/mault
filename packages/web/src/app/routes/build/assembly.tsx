import { BOARD_INFO } from "@/app/routes/build/board-info";
import {
  useBoardType,
  type BoardType,
} from "@/app/routes/build/use-board-type";
import { useModuleCount } from "@/app/routes/build/use-module-count";
import { DISCORD_URL } from "@/lib/links";
import { cn } from "@/lib/utils";
import {
  IconCpu,
  IconCube,
  IconPlayerPlay,
  IconPlugConnected,
  IconTool,
  IconVideo,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

interface Step {
  key: string;
  text: ReactNode;
  note?: ReactNode;
  images?: string[];
}

interface Phase {
  key: string;
  title: string;
  icon: typeof IconCube;
  steps: Step[];
  videos?: string[];
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match?.[1] ?? null;
}

function buildPhases(
  t: TFunction<"build">,
  moduleCount: number,
  boardType: BoardType,
): Phase[] {
  const board = BOARD_INFO[boardType];
  const isEsp32Family = boardType !== "uno_r4";
  const isEsp32S3 = boardType === "esp32";
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
          note: t("assembly.phases.print.steps.printSortingModule.note"),
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
          images: [
            "/instructions/base_module.jpg",
            "/instructions/base_module_assembled.jpg",
          ],
        },
        {
          key: "print-plate-base-bottom",
          text: t("assembly.phases.print.steps.printPlateBaseBottom.text"),
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
          images: [
            "/instructions/top_down_view_device.jpg",
            "/instructions/corner_view_device.jpg",
            "/instructions/front_view_device.jpg",
          ],
        },
        {
          key: "mount-boards-to-panels",
          text: t("assembly.phases.print.steps.mountBoardsToPanels.text", {
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
        isEsp32S3
          ? {
              key: "upload-sketch",
              text: t("assembly.phases.firmware.steps.uploadSketchEsp32.text"),
              note: t("assembly.phases.firmware.steps.uploadSketchEsp32.note"),
            }
          : isEsp32Family
            ? {
                key: "upload-sketch",
                text: t(
                  "assembly.phases.firmware.steps.uploadSketchEsp32Wroom.text",
                ),
                note: t(
                  "assembly.phases.firmware.steps.uploadSketchEsp32Wroom.note",
                ),
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
          text: t(
            "assembly.phases.assembleModules.steps.fitFeederOrings.text",
          ),
          note: t(
            "assembly.phases.assembleModules.steps.fitFeederOrings.note",
          ),
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
          text: t(
            "assembly.phases.assembleModules.steps.mountFeederWall.text",
          ),
          note: t(
            "assembly.phases.assembleModules.steps.mountFeederWall.note",
          ),
          images: [
            "/instructions/rube_disassembled.jpg",
            "/instructions/tube_assembled.jpg",
            "/instructions/feeder_tube_wall.jpg",
          ],
        },
        {
          key: "mount-module-ir",
          text: t(
            "assembly.phases.assembleModules.steps.mountModuleIr.text",
            { modules: moduleCount },
          ),
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
          text: t(
            "assembly.phases.wireAndCalibrate.steps.connectSerial.text",
            { board: board.shortName },
          ),
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

const STORAGE_KEY = "magic-vault:build-checklist";

function useChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return { checked, toggle };
}

export function BuildAssembly() {
  const { t } = useTranslation("build");
  const { checked, toggle } = useChecklist();
  const { moduleCount } = useModuleCount();
  const { boardType } = useBoardType();

  const PHASES = useMemo(
    () => buildPhases(t, moduleCount, boardType),
    [t, moduleCount, boardType],
  );

  const allSteps = useMemo(() => PHASES.flatMap((p) => p.steps), [PHASES]);
  const doneCount = allSteps.filter((s) => checked[s.key]).length;
  const pct = allSteps.length
    ? Math.round((doneCount / allSteps.length) * 100)
    : 0;

  return (
    <section id="assembly" className="mx-auto max-w-7xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {t("assembly.heading")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("assembly.description")}
      </p>
      <p className="mt-2 max-w-2xl text-sm/relaxed text-foreground/70">
        <Trans
          t={t}
          i18nKey="assembly.helpText"
          components={{
            a: (
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              />
            ),
          }}
        />
      </p>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-foreground/70">
          <span>
            {t("assembly.progress.stepsCount", {
              done: doneCount,
              total: allSteps.length,
            })}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {PHASES.map((phase, i) => {
          const videoIds = (phase.videos ?? [])
            .map((url) => [url, getYouTubeVideoId(url)] as const)
            .filter((pair): pair is [string, string] => pair[1] !== null);
          const hasVideos = videoIds.length > 0;
          return (
            <div
              key={phase.key}
              className={cn(
                "flex flex-col gap-6",
                hasVideos && "lg:flex-row lg:items-start",
              )}
            >
              {hasVideos && (
                <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:w-3/5 lg:shrink-0">
                  {videoIds.map(([url, id]) => (
                    <div
                      key={url}
                      className="aspect-video w-full overflow-hidden rounded-lg border bg-black"
                    >
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${id}`}
                        title={t("assembly.videoTitle")}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        loading="lazy"
                        className="size-full"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="min-w-0 flex-1 rounded-lg border bg-card">
                <div className="sticky top-20 z-10 flex items-center gap-3 rounded-t-lg border-b bg-secondary px-4 py-3 md:px-5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <phase.icon size={16} />
                  </span>
                  <div className="flex flex-col items-baseline">
                    <span className="font-mono text-[10px] font-semibold tracking-wide text-foreground/70 uppercase">
                      {t("assembly.phaseLabel", { n: i + 1 })}
                    </span>
                    <h3 className="font-heading text-sm font-semibold">
                      {phase.title}
                    </h3>
                  </div>
                  {hasVideos && (
                    <IconVideo
                      size={16}
                      className="ml-auto shrink-0 text-foreground/70"
                      aria-label={t("assembly.hasVideoAria")}
                    />
                  )}
                </div>
                <div className="flex flex-col divide-y divide-dashed divide-border px-4 py-4 md:px-5 md:py-5">
                  {phase.steps.map((step) => (
                    <label
                      key={step.key}
                      htmlFor={step.key}
                      className="flex cursor-pointer items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <input
                        id={step.key}
                        type="checkbox"
                        checked={!!checked[step.key]}
                        onChange={() => toggle(step.key)}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm/relaxed",
                            checked[step.key] &&
                              "text-foreground/70 line-through decoration-foreground/70",
                          )}
                        >
                          {step.text}
                        </p>
                        {step.note && (
                          <p className="mt-1 text-[11px]/relaxed text-foreground/70">
                            {step.note}
                          </p>
                        )}
                        {step.images && step.images.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {step.images.map((src) => (
                              <img
                                key={src}
                                src={src}
                                alt=""
                                className="w-full max-w-40 rounded-md border sm:max-w-sm"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
