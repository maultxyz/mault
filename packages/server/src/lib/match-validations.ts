import {
  MATCH_VALIDATION_TOP_ORG_COUNT,
  type MatchValidationTopOrg,
} from "@magic-vault/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import { authProvider } from "../auth";
import { db } from "../db";
import { orgSettings } from "../db/schema";
import { createCachedValue } from "./cached-value";
import {
  MATCH_VALIDATION_CANDIDATES_MAX_AGE_MS,
  MATCH_VALIDATION_SCANNED_BEFORE,
  MATCH_VALIDATION_SCANNED_FROM,
  MATCH_VALIDATION_SCANS_PER_GAME,
} from "./constants/match-validations";
import type {
  MatchValidationCandidate,
  MatchValidationCandidateRow,
  MatchValidationValidatorOrgRow,
  MatchValidationVoteRow,
  MatchValidationVotes,
} from "./interfaces/match-validations";

export const scansInValidationSql = sql`
  cc.scanned_at >= ${MATCH_VALIDATION_SCANNED_FROM}::timestamp
  AND cc.scanned_at < ${MATCH_VALIDATION_SCANNED_BEFORE}::timestamp
  AND cc.is_reviewed = false
  AND (cc.captured_image_key IS NOT NULL OR cc.captured_image_data_url IS NOT NULL)
`;

const candidatesCache = createCachedValue(async (): Promise<MatchValidationCandidate[]> => {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        cc.guid::text AS scan_id,
        cc.low_confidence_match,
        g.key AS game_key,
        g.name AS game_name,
        row_number() OVER (
          PARTITION BY g.key
          ORDER BY
            EXISTS (SELECT 1 FROM platform_match_validations v WHERE v.scan_id = cc.guid) DESC,
            cc.low_confidence_match DESC,
            md5(cc.guid::text)
        ) AS game_rank
      FROM collection_cards cc
      JOIN collections col ON col.id = cc.collection_id AND col.is_deleted = false
      LEFT JOIN games g ON g.id = col.game_id
      WHERE ${scansInValidationSql}
    )
    SELECT scan_id, low_confidence_match, game_key, game_name
    FROM ranked
    WHERE game_rank <= ${MATCH_VALIDATION_SCANS_PER_GAME}
    ORDER BY game_rank, game_key
  `);
  return (result.rows as unknown as MatchValidationCandidateRow[]).map((row) => ({
    scanId: row.scan_id,
    lowConfidenceMatch: row.low_confidence_match,
    gameKey: row.game_key,
    gameName: row.game_name,
  }));
});

export function loadMatchValidationCandidates(): Promise<MatchValidationCandidate[]> {
  return candidatesCache.get(MATCH_VALIDATION_CANDIDATES_MAX_AGE_MS);
}

export async function loadMatchValidationVotes(userId: string | null): Promise<MatchValidationVotes> {
  const result = await db.execute(sql`
    SELECT
      v.scan_id::text AS scan_id,
      count(*)::int AS review_count,
      (count(*) FILTER (WHERE v.is_correct_match AND NOT v.is_bad_scan))::int AS correct_count,
      (count(*) FILTER (WHERE NOT v.is_correct_match AND NOT v.is_bad_scan))::int AS incorrect_count,
      (count(*) FILTER (WHERE v.is_bad_scan))::int AS bad_scan_count,
      max(
        CASE
          WHEN v.validated_by_user_id IS DISTINCT FROM ${userId} THEN NULL
          WHEN v.is_bad_scan THEN 'badScan'
          WHEN v.is_correct_match THEN 'correct'
          ELSE 'incorrect'
        END
      ) AS your_verdict
    FROM platform_match_validations v
    GROUP BY v.scan_id
  `);
  const rows = result.rows as unknown as MatchValidationVoteRow[];
  return {
    byScanId: new Map(rows.map((row) => [row.scan_id, row])),
    validatedByYou: rows.filter((row) => row.your_verdict !== null).length,
    validatedByCommunity: rows.reduce((sum, row) => sum + row.review_count, 0),
  };
}

async function attributedValidatorOrgId(row: MatchValidationValidatorOrgRow): Promise<string | null> {
  if (row.validator_org_id) return row.validator_org_id;
  const organisations = await authProvider.listUserOrganisations(row.user_id);
  return organisations.length === 1 ? organisations[0].id : null;
}

export async function loadMatchValidationTopOrgs(): Promise<MatchValidationTopOrg[]> {
  const result = await db.execute(sql`
    SELECT v.validator_org_id, v.validated_by_user_id AS user_id, count(*)::int AS review_count
    FROM platform_match_validations v
    GROUP BY v.validator_org_id, v.validated_by_user_id
  `);
  const rows = result.rows as unknown as MatchValidationValidatorOrgRow[];
  const reviewCountByOrgId = new Map<string, number>();
  for (const row of rows) {
    const orgId = await attributedValidatorOrgId(row);
    if (orgId) reviewCountByOrgId.set(orgId, (reviewCountByOrgId.get(orgId) ?? 0) + row.review_count);
  }
  const topOrgs = [...reviewCountByOrgId.entries()]
    .sort(([firstOrgId, first], [secondOrgId, second]) => second - first || firstOrgId.localeCompare(secondOrgId))
    .slice(0, MATCH_VALIDATION_TOP_ORG_COUNT);
  if (topOrgs.length === 0) return [];
  const optedInRows = await db
    .select({ orgId: orgSettings.orgId })
    .from(orgSettings)
    .where(
      and(
        inArray(orgSettings.orgId, topOrgs.map(([orgId]) => orgId)),
        eq(orgSettings.leaderboardOptIn, true),
      ),
    );
  const optedInOrgIds = optedInRows.map((row) => row.orgId);
  const names = await authProvider.getOrganisationNames(optedInOrgIds);
  return topOrgs.map(([orgId, reviewCount]) => {
    const isAnonymous = !optedInOrgIds.includes(orgId);
    return {
      name: isAnonymous ? null : (names.get(orgId) ?? null),
      reviewCount,
      isAnonymous,
    };
  });
}

export function scanIdArraySql(scanIds: string[]) {
  return sql`${`{${scanIds.join(",")}}`}::uuid[]`;
}
