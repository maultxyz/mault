import { sql, type SQL } from "drizzle-orm";
import { UUID_PATTERN } from "./constants/validation";

export function pgTextArray(values: string[]): string {
  const quoted = values.map(
    (v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
  );
  return `{${quoted.join(",")}}`;
}

export function uuidArraySql(ids: string[]): SQL {
  return sql`${pgTextArray(ids.filter((id) => UUID_PATTERN.test(id)))}::uuid[]`;
}
