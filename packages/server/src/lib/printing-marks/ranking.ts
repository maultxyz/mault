import {
  alignToReference,
  encodePrintingMarkGrids,
  PRINTING_MARK_CONFIRM_MARGIN,
  PRINTING_MARK_REORDER_MARGIN,
  printingMarkEvidence,
  type PrintingMarkAlignment,
  type PrintingMarkCandidateDiagnostic,
  type PrintingMarkCandidateReference,
  type PrintingMarkKey,
  type PrintingMarkReference,
  type PrintingMarkScanGrid,
  type PrintingMarkScanGrids,
  type PrintingMarkSkipReason,
} from "@magic-vault/shared";
import type {
  PrintingMarkCandidate,
  PrintingMarkRanking,
  PrintingMarkReferenceSet,
} from "../interfaces/printing-marks";
import { candidateReference } from "./references";

function cachedAligner(grid: PrintingMarkScanGrid) {
  const alignments = new Map<PrintingMarkReference, PrintingMarkAlignment>();
  return (reference: PrintingMarkReference) => {
    let alignment = alignments.get(reference);
    if (!alignment) {
      alignment = alignToReference(grid, reference);
      alignments.set(reference, alignment);
    }
    return alignment;
  };
}

function correlationOf(
  reference: PrintingMarkCandidateReference,
  align: (reference: PrintingMarkReference) => PrintingMarkAlignment,
): number | null {
  return reference && reference !== "absent"
    ? align(reference).correlation
    : null;
}

function compare(
  grids: PrintingMarkScanGrids,
  aligners: ((reference: PrintingMarkReference) => PrintingMarkAlignment)[],
  references: PrintingMarkReferenceSet,
  candidate: PrintingMarkCandidate,
  leader: PrintingMarkCandidate,
): PrintingMarkCandidateDiagnostic {
  const diagnostic: PrintingMarkCandidateDiagnostic = {
    cardId: candidate.cardId,
    evidence: 0,
    areas: {},
  };
  grids.grids.forEach((grid, index) => {
    const candidateAreaReference = candidateReference(
      references,
      grid.region.key,
      candidate.groups,
    );
    const leaderAreaReference = candidateReference(
      references,
      grid.region.key,
      leader.groups,
    );
    const evidence = printingMarkEvidence(
      grid,
      candidateAreaReference,
      leaderAreaReference,
      aligners[index],
    );
    diagnostic.evidence += evidence;
    diagnostic.areas[grid.region.key as PrintingMarkKey] = {
      evidence,
      candidateCorrelation: correlationOf(candidateAreaReference, aligners[index]),
      leaderCorrelation: correlationOf(leaderAreaReference, aligners[index]),
    };
  });
  return diagnostic;
}

function skipped(
  leader: PrintingMarkCandidate | undefined,
  reason: PrintingMarkSkipReason,
): PrintingMarkRanking {
  return {
    winnerCardId: null,
    evidenceByCardId: new Map(),
    diagnostics: {
      cardId: null,
      replacedCardId: leader?.cardId ?? null,
      evidence: 0,
      confirmed: false,
      candidates: [],
      skipped: reason,
    },
  };
}

export function rankByPrintingMarks(
  grids: PrintingMarkScanGrids | null | undefined,
  references: PrintingMarkReferenceSet | null,
  candidates: PrintingMarkCandidate[],
): PrintingMarkRanking {
  const [leader, ...challengers] = candidates;
  if (!leader || challengers.length === 0) {
    return skipped(leader, "singlePrinting");
  }
  if (!grids) return skipped(leader, "noScanAreas");
  if (!references) return skipped(leader, "noReferences");

  const aligners = grids.grids.map(cachedAligner);
  const diagnostics = challengers.map((challenger) =>
    compare(grids, aligners, references, challenger, leader),
  );
  const evidenceByCardId = new Map(
    diagnostics.map((diagnostic) => [diagnostic.cardId, diagnostic.evidence]),
  );
  const best = diagnostics.reduce((top, diagnostic) =>
    diagnostic.evidence > top.evidence ? diagnostic : top,
  );
  const hasWinner = best.evidence >= PRINTING_MARK_REORDER_MARGIN;
  return {
    winnerCardId: hasWinner ? best.cardId : null,
    evidenceByCardId,
    diagnostics: {
      cardId: hasWinner ? best.cardId : null,
      replacedCardId: leader.cardId,
      evidence: best.evidence,
      confirmed: hasWinner && best.evidence >= PRINTING_MARK_CONFIRM_MARGIN,
      candidates: diagnostics,
      scanAreas: encodePrintingMarkGrids(grids),
    },
  };
}
