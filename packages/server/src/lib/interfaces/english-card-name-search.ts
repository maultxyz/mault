import type { SQL } from "drizzle-orm";

export interface EnglishCardNameSearchColumns {
  gameKey: SQL;
  lang: SQL;
  setCode: SQL;
  collectorNumber: SQL;
}
