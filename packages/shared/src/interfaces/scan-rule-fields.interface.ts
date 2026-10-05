export interface ScanRuleState {
  isFoil?: boolean;
  foilType?: string | null;
}

export interface ScanRuleFieldLabels {
  foil: string;
  foilType: string;
  matchPercent: string;
  marketValueUsd: string;
  marketValueEur: string;
  foilOption: string;
  nonFoilOption: string;
}
