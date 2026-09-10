import type { BinConfig, BinRoute, FeederCalibration, ServoCalibration } from "@magic-vault/shared";
import type { ReactNode } from "react";

// Generic display shape the shared AuditDrawer component renders — each
// domain's own *AuditEntry (below) gets mapped into this before display.
export interface AuditEntry {
  guid: string;
  createdAt: string;
  label?: string;
  body: ReactNode;
}

export interface BinSetAuditEntry {
  guid: string;
  binSetGuid: string;
  snapshot: BinConfig[];
  createdAt: string;
}

export interface BinRouteAuditEntry {
  guid: string;
  route: BinRoute;
  createdAt: string;
}

export interface FeederConfigAuditEntry {
  guid: string;
  calibration: FeederCalibration;
  createdAt: string;
}

export interface ModuleConfigAuditEntry {
  guid: string;
  moduleNumber: number;
  calibration: ServoCalibration;
  createdAt: string;
}
