import type { FirmwareFeature } from "@magic-vault/shared";
import type { ReactNode } from "react";

export interface FirmwareFeatureStatus {
  isLocked: boolean;
  minVersion: string;
}

export interface FirmwareFeatureGateProps {
  feature: FirmwareFeature;
  className?: string;
  children: ReactNode;
}
