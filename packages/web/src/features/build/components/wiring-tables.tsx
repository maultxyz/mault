import { Callout } from "@/components/callout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useBuildSetup } from "@/features/build/api/use-build-setup";
import { AnchorLinkButton } from "@/features/build/components/anchor-link-button";
import {
  Pin,
  WireSwatch,
  WiringDiagram,
  WiringReference,
  WiringTable,
} from "@/features/build/components/wiring-reference";
import { wiringAnchorId } from "@/features/build/lib/anchors";
import {
  BOARD_INFO,
  BUILD_WIRING_ANCHOR,
  PCA9685_FEEDER_CHANNEL,
} from "@/lib/constants/build";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

export function WiringOverview() {
  const { t } = useTranslation("build");
  const { moduleCount, boardType } = useBuildSetup();
  const board = BOARD_INFO[boardType];
  const diagramId = wiringAnchorId("diagram");
  const [open, setOpen] = useState<string[]>([]);
  const { hash } = useLocation();

  useEffect(() => {
    if (hash !== `#${diagramId}`) return;
    setOpen((prev) => (prev.includes("diagram") ? prev : [...prev, "diagram"]));
  }, [hash, diagramId]);

  return (
    <div
      id={BUILD_WIRING_ANCHOR}
      className="flex scroll-mt-32 flex-col gap-2 pb-3"
    >
      <p className="text-sm/relaxed text-foreground/70">
        <Trans
          t={t}
          i18nKey="wiring.description"
          values={{ count: moduleCount + 1, board: board.shortName }}
          components={{ pin: <Pin /> }}
        />
      </p>
      <Callout
        variant="info"
        icon={IconInfoCircle}
        className="px-3 py-2 text-sm/relaxed"
      >
        {t("wiring.wireColorNote")}
      </Callout>
      <Accordion multiple value={open} onValueChange={setOpen}>
        <AccordionItem
          value="diagram"
          id={diagramId}
          className="scroll-mt-32 border-b-0"
        >
          <div className="group/anchor flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <AccordionTrigger className="text-sm font-semibold">
                {t("wiring.overview.fullDiagram")}
              </AccordionTrigger>
            </div>
            <AnchorLinkButton id={diagramId} />
          </div>
          <AccordionContent className="pb-0">
            <WiringDiagram />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function I2cWiringReference() {
  const { t } = useTranslation("build");
  const { boardType } = useBuildSetup();
  const board = BOARD_INFO[boardType];
  const isEsp32 = boardType !== "uno_r4";

  return (
    <WiringReference
      anchorKey="i2c"
      title={t("wiring.sections.i2c.title")}
      footnote={isEsp32 ? t("wiring.sections.i2c.esp32Note") : undefined}
    >
      <WiringTable
        columns={[
          t("wiring.i2cTable.colPcaPin"),
          board.displayName,
          t("wiring.reference.colWire"),
        ]}
        rows={[
          [
            <Pin key="a">SDA</Pin>,
            <Pin key="b">{board.i2cSda}</Pin>,
            <WireSwatch key="c" wire="sda" />,
          ],
          [
            <Pin key="a">SCL</Pin>,
            <Pin key="b">{board.i2cScl}</Pin>,
            <WireSwatch key="c" wire="scl" />,
          ],
          [
            t("wiring.i2cTable.vccLogic"),
            <Pin key="b">{board.logicVoltage}</Pin>,
            <WireSwatch key="c" wire="vcc" />,
          ],
          [
            <Pin key="a">GND</Pin>,
            <Pin key="b">GND</Pin>,
            <WireSwatch key="c" wire="gnd" />,
          ],
        ]}
      />
    </WiringReference>
  );
}

export function ServoPowerWiringReference() {
  const { t } = useTranslation("build");
  const { boardType } = useBuildSetup();
  const board = BOARD_INFO[boardType];

  return (
    <WiringReference
      anchorKey="servo-power"
      title={t("wiring.sections.servoPower.title")}
    >
      <WiringTable
        columns={[
          t("wiring.servoPowerTable.colFrom"),
          t("wiring.servoPowerTable.colTo"),
          t("wiring.reference.colWire"),
        ]}
        rows={[
          [
            t("wiring.servoPowerTable.psuPlus"),
            <span key="to-plus">
              <Trans
                t={t}
                i18nKey="wiring.servoPowerTable.toPositive"
                components={{ pin: <Pin /> }}
              />
            </span>,
            <WireSwatch key="wire" wire="psuPositive" />,
          ],
          [
            t("wiring.servoPowerTable.psuMinus"),
            <span key="to-minus">
              <Trans
                t={t}
                i18nKey="wiring.servoPowerTable.toNegative"
                values={{ board: board.shortName }}
                components={{
                  pin: <Pin />,
                  em: <em className="font-semibold not-italic" />,
                }}
              />
            </span>,
            <WireSwatch key="wire" wire="psuNegative" />,
          ],
        ]}
      />
    </WiringReference>
  );
}

export function IrSensorWiringReference() {
  const { t } = useTranslation("build");
  const { moduleCount, boardType } = useBuildSetup();
  const board = BOARD_INFO[boardType];
  const isEsp32 = boardType !== "uno_r4";
  const prefix = isEsp32 ? "GPIO" : "D";

  const rows = [
    ...Array.from({ length: moduleCount }, (_, i) => [
      t("wiring.irTable.moduleGate", { n: i + 1 }),
      <Pin key="pin">{`${prefix}${board.irPins[i]}`}</Pin>,
      <WireSwatch key="wire" wire="irSignal" />,
    ]),
    [
      t("wiring.irTable.hopperThroat"),
      <Pin key="pin">{`${prefix}${board.hopperIrPin}`}</Pin>,
      <WireSwatch key="wire" wire="irSignal" />,
    ],
  ];

  return (
    <WiringReference
      anchorKey="ir-sensors"
      title={t("wiring.sections.irSensors.title")}
      description={
        <Trans
          t={t}
          i18nKey="wiring.irSensors.description"
          values={{ count: moduleCount + 1, board: board.shortName }}
          components={{
            strong: <strong className="text-foreground" />,
            pin: <Pin />,
          }}
        />
      }
      footnote={isEsp32 ? t("wiring.irSensors.esp32Note") : undefined}
    >
      <WiringTable
        columns={[
          t("wiring.irTable.colSensor"),
          t("wiring.irTable.colPin"),
          t("wiring.reference.colSignalWire"),
        ]}
        rows={rows}
      />
    </WiringReference>
  );
}

export function ChannelMapWiringReference() {
  const { t } = useTranslation("build");
  const { moduleCount } = useBuildSetup();
  const lastModuleChannel = moduleCount * 3;

  const rows: [string, string][] = [
    ...Array.from({ length: moduleCount }, (_, m) => m + 1).flatMap((n) =>
      (["bottom", "paddle", "pusher"] as const).map(
        (part, offset): [string, string] => [
          String((n - 1) * 3 + offset),
          t("wiring.channelMap.modulePart", {
            n,
            part: t(`wiring.parts.${part}`),
          }),
        ],
      ),
    ),
    ...Array.from(
      { length: PCA9685_FEEDER_CHANNEL - lastModuleChannel },
      (_, i): [string, string] => [
        String(lastModuleChannel + i),
        t("wiring.channelMap.unused"),
      ],
    ),
    [String(PCA9685_FEEDER_CHANNEL), t("wiring.channelMap.feeder")],
  ];

  return (
    <WiringReference
      anchorKey="channel-map"
      title={t("wiring.sections.channelMap.title")}
    >
      <WiringTable
        columns={[
          t("wiring.channelTable.colCh"),
          t("wiring.channelTable.colAssignment"),
        ]}
        rows={rows.map(([ch, assignment]) => [
          <span key="ch" className="font-mono tabular-nums">
            {ch}
          </span>,
          assignment,
        ])}
      />
    </WiringReference>
  );
}
