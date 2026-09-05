import { BOARD_INFO } from "@/app/routes/build/board-info";
import {
  useBoardType,
  type BoardType,
} from "@/app/routes/build/use-board-type";
import {
  MAX_MODULES,
  MIN_MODULES,
  useModuleCount,
} from "@/app/routes/build/use-module-count";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  IconExternalLink,
  IconInfoCircle,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

type BuildT = TFunction<"build">;

interface Row {
  key: string;
  qty: (moduleCount: number) => string;
  name: string | ((boardType: BoardType) => string);
  part: (t: BuildT, boardType: BoardType) => ReactNode;
  notes: (t: BuildT, moduleCount: number, boardType: BoardType) => ReactNode;
  buyUrl?: string | ((boardType: BoardType) => string | undefined);
  optional?: true | "classic-hopper" | "new-hopper";
}

function optionalBadgeLabel(t: BuildT, optional: Row["optional"]): string {
  if (optional === "classic-hopper") return t("bom.optionalClassicHopperBadge");
  if (optional === "new-hopper") return t("bom.optionalNewHopperBadge");
  return t("bom.optionalBadge");
}

interface Group {
  key: string;
  rows: Row[];
}

function resolveRowName(row: Row, boardType: BoardType): string {
  return typeof row.name === "function" ? row.name(boardType) : row.name;
}

function resolveRowBuyUrl(row: Row, boardType: BoardType): string | undefined {
  return typeof row.buyUrl === "function" ? row.buyUrl(boardType) : row.buyUrl;
}

const BOARD_BUY_URLS: Partial<Record<BoardType, string>> = {
  uno_r4: "https://amzn.to/4zFfnmv",
  esp32: "https://amzn.to/4gmsm51",
};

const GROUPS: Group[] = [
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
                : boardType === "esp32"
                  ? "bom.groups.electronics.items.esp32.notes"
                  : "bom.groups.electronics.items.esp32Wroom.notes"
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
        buyUrl: "https://amzn.to/4choCPU",
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
        buyUrl: "https://amzn.to/4gwmuX7",
      },
      {
        key: "sg90-continuous",
        qty: () => "1",
        name: "SG90 servo, continuous rotation",
        part: (t) => t("bom.groups.electronics.items.sg90Continuous.part"),
        notes: (t) => t("bom.groups.electronics.items.sg90Continuous.notes"),
        buyUrl: "https://amzn.to/3UciimD",
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
        buyUrl: "https://amzn.to/4guPkWo",
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
              : boardType === "esp32"
                ? "bom.groups.power.items.usbCableEsp32.part"
                : "bom.groups.power.items.usbCableEsp32Wroom.part",
          ),
        notes: (t, _, boardType) =>
          t(
            boardType === "uno_r4"
              ? "bom.groups.power.items.usbCable.notes"
              : boardType === "esp32"
                ? "bom.groups.power.items.usbCableEsp32.notes"
                : "bom.groups.power.items.usbCableEsp32Wroom.notes",
          ),
      },
      {
        key: "barrel-jack",
        qty: () => "1",
        name: "DC barrel jack or screw-terminal pigtail",
        part: (t) => t("bom.groups.power.items.barrelJack.part"),
        notes: (t) => t("bom.groups.power.items.barrelJack.notes"),
        buyUrl: "https://amzn.to/4guET5e",
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
        buyUrl: "https://amzn.to/45Qt8RK",
      },
      {
        key: "o-ring",
        qty: () => "6",
        name: "20mm ID 26mm OD 3mm Width O-Ring",
        part: (t) => t("bom.groups.structural.items.oRing.part"),
        notes: (t) => t("bom.groups.structural.items.oRing.notes"),
        buyUrl: "https://amzn.to/3Spt0pl",
      },
      {
        key: "hopper-o-ring",
        qty: () => "4",
        name: "9.2mm ID 14mm OD 2.4mm Section O-Ring",
        part: (t) => t("bom.groups.structural.items.hopperORing.part"),
        notes: (t) => t("bom.groups.structural.items.hopperORing.notes"),
        optional: "new-hopper",
        buyUrl: "https://amzn.to/3TbcucH",
      },
      {
        key: "bin-holders",
        qty: (n) => String(n * 2),
        name: "3D-printed bin holder",
        part: (t) => t("bom.groups.structural.items.binHolders.part"),
        notes: (t, n) =>
          t("bom.groups.structural.items.binHolders.notes", { count: n }),
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
        buyUrl: "https://amzn.to/3TbcucH",
      },
      {
        key: "m3-nut",
        qty: () => "8",
        name: "M3 nut",
        part: (t) => t("bom.groups.fasteners.items.m3Nut.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3Nut.notes"),
        buyUrl: "https://amzn.to/3TbcucH",
      },
      {
        key: "m3x10-screw",
        qty: () => "2",
        name: "M3x10 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x10Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x10Screw.notes"),
        buyUrl: "https://amzn.to/3TbcucH",
        optional: "classic-hopper",
      },
      {
        key: "m3-washer",
        qty: () => "2",
        name: "M3 washer",
        part: (t) => t("bom.groups.fasteners.items.m3Washer.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3Washer.notes"),
        buyUrl: "https://amzn.to/3TbcucH",
      },
      {
        key: "m3x8-screw",
        qty: () => "2",
        name: "M3x8 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x8Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x8Screw.notes"),
        buyUrl: "https://amzn.to/3TbcucH",
        optional: "new-hopper",
      },
      {
        key: "m3x25-screw",
        qty: () => "1",
        name: "M3x25 screw",
        part: (t) => t("bom.groups.fasteners.items.m3x25Screw.part"),
        notes: (t) => t("bom.groups.fasteners.items.m3x25Screw.notes"),
        optional: "new-hopper",
        buyUrl: "https://amzn.to/3TbcucH",
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
        qty: (n) => String(20 + (n - 2) * 6 + 7 + (n + 1)),
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
            irCount: n + 1,
            board: BOARD_INFO[boardType].shortName,
          }),
        buyUrl: "https://amzn.to/3UmCJx8",
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
        buyUrl: "https://amzn.to/45T0LCt",
      },
      {
        key: "wago-connectors",
        qty: () => "2",
        name: "Wago connectors",
        part: (t) => t("bom.groups.fasteners.items.wagoConnectors.part"),
        notes: (t) => t("bom.groups.fasteners.items.wagoConnectors.notes"),
        buyUrl: "https://amzn.to/3UJSq1u",
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
        buyUrl: "https://amzn.to/4zWaIwO",
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
        buyUrl: "https://amzn.to/3SvwSVM",
      },
      {
        key: "camera-mount-screw",
        qty: () => "1",
        name: '1/4"-20 camera mount screw',
        part: (t) => t("bom.groups.optional.items.cameraMountScrew.part"),
        notes: (t) => t("bom.groups.optional.items.cameraMountScrew.notes"),
        buyUrl: "https://amzn.to/4gKMoVS",
      },
    ],
  },
];

const STORAGE_KEY = "magic-vault:build-parts-checklist";

function usePartsChecklist() {
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

function GroupTable({
  group,
  moduleCount,
  boardType,
  checked,
  toggle,
}: {
  group: Group;
  moduleCount: number;
  boardType: BoardType;
  checked: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  const { t } = useTranslation("build");

  return (
    <div>
      <h3 className="mb-2 font-heading text-sm font-semibold tracking-wide text-foreground/70 uppercase">
        {t(`bom.groups.${group.key}.title`)}
      </h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-120 border-collapse text-sm/relaxed">
          <thead>
            <tr className="bg-secondary/40">
              <th className="w-8 border-b px-3 py-2" />
              <th className="w-16 border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.qty")}
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.part")}
              </th>
              <th className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.notes")}
              </th>
              <th className="w-12 border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-foreground/70 uppercase">
                {t("bom.table.buy")}
              </th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row, i) => {
              const qty = row.qty(moduleCount);
              return (
                <tr
                  key={row.key}
                  className={cn(
                    "hover:bg-secondary/30",
                    i !== group.rows.length - 1 && "border-b",
                  )}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={t("bom.checkboxAriaLabel", {
                        qty: qty === "-" ? "" : qty,
                      })}
                      checked={!!checked[row.key]}
                      onChange={() => toggle(row.key)}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70 tabular-nums">
                    {qty}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-medium",
                      checked[row.key] &&
                        "text-foreground/70 line-through decoration-foreground/70",
                    )}
                  >
                    {row.part(t, boardType)}
                    {row.optional && (
                      <span className="ml-2 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground uppercase no-underline">
                        {optionalBadgeLabel(t, row.optional)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/70">
                    {row.notes(t, moduleCount, boardType)}
                  </td>
                  <td className="px-3 py-2.5">
                    {resolveRowBuyUrl(row, boardType) && (
                      <a
                        href={resolveRowBuyUrl(row, boardType)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("bom.buyAriaLabel", {
                          part: resolveRowName(row, boardType),
                        })}
                        className="external-icon-only inline-flex items-center text-foreground/70 transition-colors hover:text-foreground"
                      >
                        <IconExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BuildBom() {
  const { t } = useTranslation("build");
  const { checked, toggle } = usePartsChecklist();
  const { moduleCount, setModuleCount } = useModuleCount();
  const { boardType, setBoardType } = useBoardType();

  const allRows = useMemo(() => GROUPS.flatMap((g) => g.rows), []);
  const doneCount = allRows.filter((r) => checked[r.key]).length;
  const pct = allRows.length
    ? Math.round((doneCount / allRows.length) * 100)
    : 0;

  const channelsUsed = moduleCount * 3 + 1;

  return (
    <section id="parts" className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {t("bom.heading")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("bom.description", {
          modules: moduleCount,
          irSensors: moduleCount + 1,
          channelsUsed,
          channelsFree: 16 - channelsUsed,
        })}
      </p>
      <div className="mt-4 flex max-w-2xl items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm/relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
        <span>{t("bom.affiliateDisclaimer")}</span>
      </div>
      <div className="mt-3 flex max-w-2xl items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-sm/relaxed text-blue-900 dark:bg-blue-500/10 dark:text-blue-300">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
        <span>{t("bom.hopperNote")}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/70 uppercase">
            {t("bom.moduleCount.label")}
          </span>
          <div className="flex items-center gap-1.5 rounded-md border p-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("bom.moduleCount.decreaseAria")}
              disabled={moduleCount <= MIN_MODULES}
              onClick={() => setModuleCount(moduleCount - 1)}
            >
              <IconMinus />
            </Button>
            <span className="w-4 text-center font-mono text-sm font-medium tabular-nums">
              {moduleCount}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("bom.moduleCount.increaseAria")}
              disabled={moduleCount >= MAX_MODULES}
              onClick={() => setModuleCount(moduleCount + 1)}
            >
              <IconPlus />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/70 uppercase">
            {t("hero.boardType.label")}
          </span>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button
              variant={boardType === "uno_r4" ? "secondary" : "ghost"}
              size="sm"
              className={cn(boardType !== "uno_r4" && "text-foreground/70")}
              onClick={() => setBoardType("uno_r4")}
            >
              {t("hero.boardType.unoR4")}
            </Button>
            <Button
              variant={boardType === "esp32" ? "secondary" : "ghost"}
              size="sm"
              className={cn(boardType !== "esp32" && "text-foreground/70")}
              onClick={() => setBoardType("esp32")}
            >
              {t("hero.boardType.esp32")}
            </Button>
            <Button
              variant={boardType === "esp32_wroom" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                boardType !== "esp32_wroom" && "text-foreground/70",
              )}
              onClick={() => setBoardType("esp32_wroom")}
            >
              {t("hero.boardType.esp32Wroom")}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-foreground/70">
          <span>
            {t("bom.progress.partsCount", {
              done: doneCount,
              total: allRows.length,
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

      <div className="mt-8 flex flex-col gap-8">
        {GROUPS.map((group) => (
          <GroupTable
            key={group.key}
            group={group}
            moduleCount={moduleCount}
            boardType={boardType}
            checked={checked}
            toggle={toggle}
          />
        ))}
      </div>
    </section>
  );
}
