import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useBuildSetup } from "@/features/build/api/use-build-setup";
import { AnchorLinkButton } from "@/components/guide/anchor-link-button";
import { wiringAnchorId } from "@/features/build/lib/anchors";
import {
  BOARD_INFO,
  BOARD_WIRE_COLORS,
  BUILD_PIN_BADGE_CLASS,
  WIRE_COLOR_CLASSES,
  WIRING_VIEW_MODE_ICONS,
  WIRING_VIEW_MODES,
} from "@/lib/constants/build";
import type {
  WireSwatchProps,
  WiringPinProps,
  WiringReferenceProps,
  WiringTableProps,
  WiringViewMode,
} from "@/lib/interfaces/build";
import { cn } from "@/lib/utils";
import { IconExternalLink, IconPlugConnected } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function Pin({ children }: WiringPinProps) {
  return (
    <code className={BUILD_PIN_BADGE_CLASS}>
      {children}
    </code>
  );
}

export function WireSwatch({ wire }: WireSwatchProps) {
  const { t } = useTranslation("build");
  const { boardType } = useBuildSetup();
  const color = BOARD_WIRE_COLORS[boardType][wire];
  const label = t("wiring.wireColor", {
    color: t(`wiring.colors.${color}`),
  });

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-block size-3 shrink-0 rounded-full ring-1 ring-foreground/40",
        WIRE_COLOR_CLASSES[color],
      )}
    />
  );
}

export function WiringTable({ columns, rows }: WiringTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card dark:border-foreground/15">
      <table className="w-full min-w-72 border-collapse text-sm/relaxed">
        <thead>
          <tr className="bg-muted">
            {columns.map((col) => (
              <th
                key={col}
                className="border-b px-2.5 py-1.5 text-left text-sm font-semibold text-foreground dark:border-foreground/15"
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
                "hover:bg-muted/50",
                i !== rows.length - 1 && "border-b dark:border-foreground/10",
              )}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-2.5 py-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    {cell}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WiringDiagram() {
  const { t } = useTranslation("build");
  const { boardType } = useBuildSetup();
  const src = BOARD_INFO[boardType].wiringDiagramSrc;

  return (
    <div className="flex flex-col gap-2">
      <a href={src} target="_blank" rel="noopener noreferrer">
        <img
          src={src}
          alt={t("wiring.sections.diagram.alt")}
          className="w-full rounded-md border bg-card dark:border-foreground/15"
        />
      </a>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm/relaxed text-foreground/70">
        <span>{t("wiring.sections.diagram.anyColorNote")}</span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
        >
          <IconExternalLink className="size-4" />
          {t("wiring.reference.openFullSize")}
        </a>
      </div>
    </div>
  );
}

export function WiringReference({
  anchorKey,
  title,
  description,
  footnote,
  children,
}: WiringReferenceProps) {
  const { t } = useTranslation("build");
  const [mode, setMode] = useState<WiringViewMode>("table");
  const id = wiringAnchorId(anchorKey);

  return (
    <div
      id={id}
      className="flex scroll-mt-32 flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5 dark:border-primary/70 dark:bg-primary/15"
    >
      <div className="group/anchor flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground">
          <IconPlugConnected className="size-4" />
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <h4 className="font-heading text-sm font-semibold">{title}</h4>
          <AnchorLinkButton id={id} />
        </div>
        <ButtonGroup
          aria-label={t("wiring.reference.viewMode")}
          className="ml-auto"
        >
          {WIRING_VIEW_MODES.map((option) => {
            const Icon = WIRING_VIEW_MODE_ICONS[option];
            const active = option === mode;
            return (
              <Button
                key={option}
                type="button"
                variant={active ? "outline-selected" : "outline"}
                aria-pressed={active}
                onClick={() => setMode(option)}
                className="text-sm"
              >
                <Icon />
                {t(`wiring.reference.${option}`)}
              </Button>
            );
          })}
        </ButtonGroup>
      </div>
      {mode === "table" ? (
        <>
          {description && (
            <p className="text-sm/relaxed text-foreground/70">{description}</p>
          )}
          {children}
          {footnote && (
            <p className="text-sm/relaxed text-foreground/70">{footnote}</p>
          )}
        </>
      ) : (
        <WiringDiagram />
      )}
    </div>
  );
}
