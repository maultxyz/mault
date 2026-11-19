import type {
  CardsPageEntryRow,
  GroupedCardMemberRow,
  GroupedCardRanking,
  GroupedCardRankingPage,
  GroupedCardRankingPageEntry,
  GroupedCardRankingRow,
  GroupedCardRepresentativeRow,
} from "./interfaces/collections";

export function buildGroupedCardRanking(
  rowsInRankOrder: GroupedCardRankingRow[],
): GroupedCardRanking {
  const entryIndexByEntryRank = new Map<number, number>();
  const memberCounts: number[] = [];
  const storedCounts: number[] = [];
  const entryIndexOfRow = new Int32Array(rowsInRankOrder.length);
  rowsInRankOrder.forEach((row, rowIndex) => {
    const entryRank = Number(row.entry_rank);
    let entryIndex = entryIndexByEntryRank.get(entryRank);
    if (entryIndex === undefined) {
      entryIndex = memberCounts.length;
      entryIndexByEntryRank.set(entryRank, entryIndex);
      memberCounts.push(0);
      storedCounts.push(0);
    }
    memberCounts[entryIndex] += 1;
    if (row.is_stored) storedCounts[entryIndex] += 1;
    entryIndexOfRow[rowIndex] = entryIndex;
  });

  const entryMemberOffsets = new Int32Array(memberCounts.length + 1);
  memberCounts.forEach((memberCount, entryIndex) => {
    entryMemberOffsets[entryIndex + 1] = entryMemberOffsets[entryIndex] + memberCount;
  });
  const nextMemberSlot = entryMemberOffsets.slice(0, memberCounts.length);
  const memberRowIds = new Int32Array(rowsInRankOrder.length);
  rowsInRankOrder.forEach((row, rowIndex) => {
    const entryIndex = entryIndexOfRow[rowIndex];
    memberRowIds[nextMemberSlot[entryIndex]] = Number(row.row_id);
    nextMemberSlot[entryIndex] += 1;
  });
  return {
    memberRowIds,
    entryMemberOffsets,
    entryStoredCounts: Int32Array.from(storedCounts),
  };
}

export function groupedCardRankingPage(
  ranking: GroupedCardRanking,
  page: number,
  pageSize: number,
): GroupedCardRankingPage {
  const totalEntries = ranking.entryStoredCounts.length;
  const firstEntry = Math.min(page * pageSize, totalEntries);
  const lastEntry = Math.min(firstEntry + pageSize, totalEntries);
  const entries: GroupedCardRankingPageEntry[] = [];
  for (let entryIndex = firstEntry; entryIndex < lastEntry; entryIndex += 1) {
    const memberRowIds = Array.from(
      ranking.memberRowIds.subarray(
        ranking.entryMemberOffsets[entryIndex],
        ranking.entryMemberOffsets[entryIndex + 1],
      ),
    );
    entries.push({
      representativeRowId: memberRowIds[0],
      memberRowIds,
      storedCount: ranking.entryStoredCounts[entryIndex],
    });
  }
  return { entries, totalEntries, totalCards: ranking.memberRowIds.length };
}

export function groupedCardPageRows(
  rankingPage: GroupedCardRankingPage,
  representatives: GroupedCardRepresentativeRow[],
  otherMembers: GroupedCardMemberRow[],
): CardsPageEntryRow[] {
  const representativeByRowId = new Map(
    representatives.map((row) => [Number(row.row_id), row]),
  );
  const scanIdByRowId = new Map<number, string>([
    ...representatives.map((row) => [Number(row.row_id), row.guid] as const),
    ...otherMembers.map((row) => [Number(row.row_id), row.guid] as const),
  ]);
  return rankingPage.entries.flatMap((entry) => {
    const representative = representativeByRowId.get(entry.representativeRowId);
    if (!representative) return [];
    const scanIds = entry.memberRowIds.flatMap(
      (rowId) => scanIdByRowId.get(rowId) ?? [],
    );
    const { row_id: _rowId, ...card } = representative;
    return [
      {
        ...card,
        scan_ids: scanIds,
        quantity: scanIds.length,
        stored_count: Math.min(entry.storedCount, scanIds.length),
      },
    ];
  });
}
