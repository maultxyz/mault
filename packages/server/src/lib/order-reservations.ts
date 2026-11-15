import { sql, type SQL } from "drizzle-orm";

export function reservedByOpenPicksScanIdsSql(orgId: string): SQL {
  return sql`ARRAY(
    SELECT allocation
    FROM fulfilment_orders fo
    CROSS JOIN LATERAL jsonb_array_elements(fo.lines) AS order_line
    CROSS JOIN LATERAL jsonb_array_elements_text(order_line -> 'allocations') AS allocation
    WHERE fo.org_id = ${orgId}
      AND fo.status = 'open'
      AND fo.is_deleted = false
  )`;
}

export function notReservedByOpenPicksSql(orgId: string, scanIdColumn: SQL): SQL {
  return sql`NOT (${scanIdColumn}::text = ANY(${reservedByOpenPicksScanIdsSql(orgId)}))`;
}
