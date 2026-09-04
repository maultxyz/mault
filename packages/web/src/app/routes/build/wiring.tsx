import { BOARD_INFO } from "@/app/routes/build/board-info";
import { useBoardType } from "@/app/routes/build/use-board-type";
import { useModuleCount } from "@/app/routes/build/use-module-count";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

function Pin({ children }: { children?: ReactNode }) {
  return (
    <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </code>
  );
}

function MiniTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-100 border-collapse text-sm/relaxed">
        <thead>
          <tr className="bg-secondary/40">
            {columns.map((col) => (
              <th
                key={col}
                className="border-b px-3 py-2 text-left font-mono text-[10px] font-semibold tracking-wide text-foreground/70 uppercase"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "hover:bg-secondary/30",
                i !== rows.length - 1 && "border-b",
              )}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BuildWiring() {
  const { t } = useTranslation("build");
  const { moduleCount } = useModuleCount();
  const { boardType } = useBoardType();
  const board = BOARD_INFO[boardType];
  const isEsp32 = boardType !== "uno_r4";

  const irSensorCount = moduleCount + 1;
  const irSensorRows: [string, ReactNode][] = [
    ...Array.from({ length: moduleCount }, (_, i) => i + 1).map(
      (n): [string, ReactNode] => [
        t("wiring.irTable.moduleGate", { n }),
        <Pin
          key={`ir-${n}`}
        >{`${isEsp32 ? "GPIO" : "D"}${board.irPins[n - 1]}`}</Pin>,
      ],
    ),
    [
      t("wiring.irTable.hopperThroat"),
      <Pin key="ir-hopper">{`${isEsp32 ? "GPIO" : "D"}${board.hopperIrPin}`}</Pin>,
    ],
  ];

  const REFERENCE_MODULE_COUNT = 3;
  const FEEDER_CHANNEL = 15;
  const moduleChannelRows: [string, string][] = Array.from(
    { length: REFERENCE_MODULE_COUNT },
    (_, m) => m + 1,
  ).flatMap((n) =>
    (["bottom", "paddle", "pusher"] as const).map(
      (part, offset) =>
        [
          String((n - 1) * 3 + offset),
          t("wiring.channelMap.modulePart", {
            n,
            part: t(`wiring.parts.${part}`),
          }),
        ] as [string, string],
    ),
  );
  const lastModuleChannel = REFERENCE_MODULE_COUNT * 3;
  const unusedChannels: [string, string][] = Array.from(
    { length: FEEDER_CHANNEL - lastModuleChannel },
    (_, i) =>
      [String(lastModuleChannel + i), t("wiring.channelMap.unused")] as [
        string,
        string,
      ],
  );

  const CHANNEL_MAP: [string, string][] = [
    ...moduleChannelRows,
    ...unusedChannels,
    [String(FEEDER_CHANNEL), t("wiring.channelMap.feeder")],
  ];

  return (
    <section id="wiring" className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {t("wiring.heading")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-foreground/70">
        <Trans
          t={t}
          i18nKey="wiring.description"
          values={{ count: irSensorCount, board: board.shortName }}
          components={{ pin: <Pin /> }}
        />
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold tracking-wide text-foreground/70 uppercase">
            {t("wiring.sections.i2c.title")}
          </h3>
          <MiniTable
            columns={[t("wiring.i2cTable.colPcaPin"), board.displayName]}
            rows={[
              [<Pin key="a">SDA</Pin>, <Pin key="b">{board.i2cSda}</Pin>],
              [<Pin key="a">SCL</Pin>, <Pin key="b">{board.i2cScl}</Pin>],
              [
                t("wiring.i2cTable.vccLogic"),
                <Pin key="b">{board.logicVoltage}</Pin>,
              ],
              [<Pin key="a">GND</Pin>, <Pin key="b">GND</Pin>],
            ]}
          />
          {isEsp32 && (
            <p className="mt-2 text-[11px]/relaxed text-foreground/70">
              {t("wiring.sections.i2c.esp32Note")}
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold tracking-wide text-foreground/70 uppercase">
            {t("wiring.sections.servoPower.title")}
          </h3>
          <MiniTable
            columns={[
              t("wiring.servoPowerTable.colFrom"),
              t("wiring.servoPowerTable.colTo"),
            ]}
            rows={[
              [
                t("wiring.servoPowerTable.psuPlus"),
                <Trans
                  key="to-plus"
                  t={t}
                  i18nKey="wiring.servoPowerTable.toPositive"
                  components={{ pin: <Pin /> }}
                />,
              ],
              [
                t("wiring.servoPowerTable.psuMinus"),
                <Trans
                  key="to-minus"
                  t={t}
                  i18nKey="wiring.servoPowerTable.toNegative"
                  values={{ board: board.shortName }}
                  components={{
                    pin: <Pin />,
                    em: <em className="text-foreground/70 not-italic" />,
                  }}
                />,
              ],
            ]}
          />
        </div>

        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold tracking-wide text-foreground/70 uppercase">
            {t("wiring.sections.irSensors.title")}
          </h3>
          <p className="mb-3 text-sm/relaxed text-foreground/70">
            <Trans
              t={t}
              i18nKey="wiring.irSensors.description"
              values={{ count: irSensorCount, board: board.shortName }}
              components={{
                strong: <strong className="text-foreground" />,
                pin: <Pin />,
              }}
            />
          </p>
          <MiniTable
            columns={[
              t("wiring.irTable.colSensor"),
              t("wiring.irTable.colPin"),
            ]}
            rows={irSensorRows}
          />
          {isEsp32 && (
            <p className="mt-2 text-[11px]/relaxed text-foreground/70">
              {t("wiring.irSensors.esp32Note")}
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold tracking-wide text-foreground/70 uppercase">
            {t("wiring.sections.channelMap.title")}
          </h3>
          <MiniTable
            columns={[
              t("wiring.channelTable.colCh"),
              t("wiring.channelTable.colAssignment"),
            ]}
            rows={CHANNEL_MAP.map(([ch, assignment]) => [
              <span key="ch" className="font-mono tabular-nums">
                {ch}
              </span>,
              assignment,
            ])}
          />
        </div>

        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold tracking-wide text-foreground/70 uppercase">
            {t("wiring.sections.diagram.title")}
          </h3>
          <img
            src="/instructions/wiring_diagram.png"
            alt={t("wiring.sections.diagram.alt")}
            className="w-full rounded-lg border"
          />
          {isEsp32 && (
            <p className="mt-2 text-[11px]/relaxed text-foreground/70">
              {t("wiring.sections.diagram.esp32Note")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
