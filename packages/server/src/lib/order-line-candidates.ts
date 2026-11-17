import type { OrderLineInput } from "@magic-vault/shared";
import type {
  OrderLineCandidateDemand,
  OrderLineCandidateRequest,
  OrderLineCandidateRow,
} from "./interfaces/order-line-candidates";
import { ORDER_LINE_CARD_NAME_FACE_SEPARATOR } from "./constants/business";

export function normalizeOrderLineCandidateName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeOrderLineSetName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function orderLineCandidateOverlapKey(normalizedName: string): string {
  return normalizedName.split(ORDER_LINE_CARD_NAME_FACE_SEPARATOR)[0];
}

export function orderLineCandidateLimits(demands: OrderLineCandidateDemand[]): number[] {
  const missingBeforeByOverlapKey = new Map<string, number>();
  return demands.map(({ normalizedName, missing }) => {
    if (missing <= 0) return 0;
    const overlapKey = orderLineCandidateOverlapKey(normalizedName);
    const missingBefore = missingBeforeByOverlapKey.get(overlapKey) ?? 0;
    missingBeforeByOverlapKey.set(overlapKey, missingBefore + missing);
    return missing + missingBefore;
  });
}

export function toOrderLineCandidateRequest(
  line: OrderLineInput,
  lineIndex: number,
  candidateLimit: number,
): OrderLineCandidateRequest {
  const setCode = line.setCode?.toLowerCase() || null;
  const setName = line.setName ? normalizeOrderLineSetName(line.setName) : null;
  return {
    line_index: lineIndex,
    name: normalizeOrderLineCandidateName(line.name),
    set_code: setCode,
    set_name: !setCode && setName ? setName : null,
    collector_number: line.collectorNumber?.toLowerCase() || null,
    condition: line.condition || null,
    is_foil: line.isFoil ?? null,
    candidate_limit: candidateLimit,
  };
}

export function groupOrderLineCandidates(
  rows: OrderLineCandidateRow[],
): Map<number, string[]> {
  const candidatesByLineIndex = new Map<number, string[]>();
  for (const row of rows) {
    const lineIndex = Number(row.line_index);
    const candidates = candidatesByLineIndex.get(lineIndex);
    if (candidates) candidates.push(row.scan_id);
    else candidatesByLineIndex.set(lineIndex, [row.scan_id]);
  }
  return candidatesByLineIndex;
}

export function takeOrderLineCandidates(
  candidates: readonly string[],
  excluded: ReadonlySet<string>,
  missing: number,
): string[] {
  const taken: string[] = [];
  for (const scanId of candidates) {
    if (taken.length >= missing) break;
    if (!excluded.has(scanId)) taken.push(scanId);
  }
  return taken;
}
