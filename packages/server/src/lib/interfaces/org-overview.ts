import type { SQL } from "drizzle-orm";

export interface OrgOverviewCardsQuery {
  where?: SQL;
  orderBy: SQL;
  limit: number;
}
