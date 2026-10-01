export interface ScanRuleState {
  isFoil?: boolean;
  foilType?: string | null;
}

export interface ScanRuleFieldLabels {
  foil: string;
  foilType: string;
  foilOption: string;
  nonFoilOption: string;
}
