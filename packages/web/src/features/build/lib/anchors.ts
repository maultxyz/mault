import { BOM_ANCHOR_PREFIX } from "@/lib/constants/build";

export const bomGroupAnchorId = (groupKey: string) =>
  `${BOM_ANCHOR_PREFIX}${groupKey}`;

export const wiringAnchorId = (sectionKey: string) => `wiring-${sectionKey}`;

export const phaseAnchorId = (phaseKey: string) => `assembly-${phaseKey}`;

export const stepAnchorId = (stepKey: string) => `step-${stepKey}`;

export function anchorUrl(id: string) {
  const url = new URL(window.location.href);
  url.hash = id;
  return url.toString();
}
