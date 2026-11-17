import {
  ORDER_SUBSTITUTE_FINISH_DIFFERENCE_COST,
  ORDER_SUBSTITUTE_PRINTING_DIFFERENCE_COST,
  ORDER_SUBSTITUTE_WORSE_CONDITION_EXTRA_COST,
} from "./constants/business.constant";
import { CARD_CONDITIONS } from "./constants/card-condition.constant";
import type {
  OrderLineInput,
  OrderSubstituteCandidate,
  OrderSubstituteDifference,
} from "./interfaces/business.interface";

function sameText(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? "").trim().toLowerCase() === (right ?? "").trim().toLowerCase();
}

function sameSetName(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalize = (value: string | null | undefined) =>
    (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalize(left) === normalize(right);
}

export function orderSubstituteDifferences(
  line: OrderLineInput,
  candidate: OrderSubstituteCandidate,
): OrderSubstituteDifference[] {
  const differences: OrderSubstituteDifference[] = [];
  const printingDiffers =
    (line.setCode ? !sameText(line.setCode, candidate.setCode) : false) ||
    (!line.setCode && line.setName ? !sameSetName(line.setName, candidate.setName) : false) ||
    (line.collectorNumber ? !sameText(line.collectorNumber, candidate.collectorNumber) : false);
  if (printingDiffers) differences.push("printing");
  if (line.condition && line.condition !== candidate.condition) differences.push("condition");
  if (line.isFoil != null && line.isFoil !== candidate.isFoil) differences.push("finish");
  return differences;
}

export function orderSubstituteCost(
  line: OrderLineInput,
  candidate: OrderSubstituteCandidate,
): number {
  const differences = orderSubstituteDifferences(line, candidate);
  let cost = 0;
  if (differences.includes("printing")) cost += ORDER_SUBSTITUTE_PRINTING_DIFFERENCE_COST;
  if (differences.includes("finish")) cost += ORDER_SUBSTITUTE_FINISH_DIFFERENCE_COST;
  if (line.condition && differences.includes("condition")) {
    const requestedIndex = CARD_CONDITIONS.indexOf(line.condition);
    const candidateIndex = CARD_CONDITIONS.indexOf(candidate.condition);
    cost += Math.abs(candidateIndex - requestedIndex);
    if (candidateIndex > requestedIndex) cost += ORDER_SUBSTITUTE_WORSE_CONDITION_EXTRA_COST;
  }
  return cost;
}
