import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CSV_IMPORT_FIELDS,
  composeCsvInventoryRows,
  composeCsvOrders,
  composeCsvPickEntries,
  composeCsvShipments,
  inferComposition,
  inferCsvMapping,
  inferCsvMappingForPreset,
  missingRequiredCsvFields,
  parseCsvTable,
} from "@magic-vault/shared";
import type { CsvImportMapping } from "@magic-vault/shared";

function mappingWithColumns(
  type: CsvImportMapping["type"],
  headers: string[],
  columnsByKey: Record<string, string>,
  composition: CsvImportMapping["composition"] = "reference",
): CsvImportMapping {
  const mapping = inferCsvMapping(type, headers);
  for (const [key, header] of Object.entries(columnsByKey)) {
    mapping.columns[key as keyof typeof mapping.columns] = headers.indexOf(header);
  }
  return { ...mapping, composition };
}

describe("inferCsvMapping", () => {
  it("prefills generic aliases", () => {
    const headers = ["Card Name", "Set", "Quantity", "Order #"];
    const mapping = inferCsvMapping("orders", headers);
    assert.equal(mapping.columns.name, 0);
    assert.equal(mapping.columns.setName, 1);
    assert.equal(mapping.columns.quantity, 2);
    assert.equal(mapping.columns.orderRef, 3);
  });

  it("maps Shopify lineitem headers and resolves the name column to orderRef", () => {
    const headers = ["Name", "Lineitem name", "Lineitem quantity", "Lineitem price"];
    const mapping = inferCsvMapping("orders", headers);
    assert.equal(mapping.columns.name, 1);
    assert.equal(mapping.columns.orderRef, 0);
    assert.equal(mapping.columns.quantity, 2);
    assert.equal(mapping.columns.unitPrice, 3);
  });

  it("infers customer fields", () => {
    const mapping = inferCsvMapping("orders", ["Order #", "Customer Name", "Shipping Address", "Card Name"]);
    assert.equal(mapping.columns.customerName, 1);
    assert.equal(mapping.columns.shippingAddress, 2);
  });

  it("reports missing required fields per type", () => {
    const orders = inferCsvMapping("orders", ["Quantity", "Set"]);
    assert.deepEqual(missingRequiredCsvFields("orders", orders), ["name"]);
    const shipments = inferCsvMapping("shipments", ["Carrier", "Tracking Number"]);
    assert.deepEqual(missingRequiredCsvFields("shipments", shipments), ["orderRef"]);
    const picks = inferCsvMapping("picks", ["Quantity"]);
    assert.deepEqual(missingRequiredCsvFields("picks", picks), ["name"]);
  });
});

describe("inferComposition", () => {
  const headers = ["Order #", "Customer Name", "Card Name", "Quantity"];

  it("detects reference composition when the reference repeats on rows", () => {
    const mapping = inferCsvMapping("orders", headers);
    const rows = [
      ["1001", "Ann", "Lightning Bolt", "2"],
      ["1001", "Ann", "Giant Growth", "1"],
      ["1002", "Bob", "Counterspell", "4"],
    ];
    assert.equal(inferComposition(rows, mapping), "reference");
  });

  it("detects master-detail composition", () => {
    const mapping = inferCsvMapping("orders", headers);
    const rows = [
      ["1001", "Ann", "", ""],
      ["", "", "Lightning Bolt", "2"],
      ["1002", "Bob", "", ""],
      ["", "", "Counterspell", "4"],
    ];
    assert.equal(inferComposition(rows, mapping), "master-detail");
  });

  it("falls back to single order", () => {
    const mapping = inferCsvMapping("orders", ["Card Name", "Quantity"]);
    const rows = [["Lightning Bolt", "2"], ["Giant Growth", "1"]];
    assert.equal(inferComposition(rows, mapping), "single");
  });

  it("stays single for other import types", () => {
    const mapping = inferCsvMapping("picks", ["Name", "Quantity"]);
    assert.equal(inferComposition([["Lightning Bolt", "2"]], mapping), "single");
  });
});

describe("composeCsvOrders", () => {
  it("groups rows by reference and reads order fields from the first row", () => {
    const headers = ["Order #", "Customer Name", "Card Name", "Quantity", "Unit Price"];
    const mapping = mappingWithColumns("orders", headers, {});
    const result = composeCsvOrders(
      [
        ["1001", "Ann", "Lightning Bolt", "2", "1.50"],
        ["1001", "Ann", "Giant Growth", "1", "0.10"],
        ["1002", "Bob", "Counterspell", "4", "0.75"],
      ],
      mapping,
    );
    assert.equal(result.orders.length, 2);
    const [first, second] = result.orders;
    assert.equal(first.reference, "1001");
    assert.equal(first.customerName, "Ann");
    assert.equal(first.lines.length, 2);
    assert.equal(first.lines[0].name, "Lightning Bolt");
    assert.equal(first.lines[0].quantity, 2);
    assert.equal(first.lines[0].unitPrice, 1.5);
    assert.equal(second.reference, "1002");
    assert.equal(second.lines[0].quantity, 4);
    assert.equal(result.skippedRows, 0);
    assert.deepEqual(result.conflicts, []);
  });

  it("merges duplicate lines inside one order", () => {
    const headers = ["Order #", "Card Name", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {});
    const result = composeCsvOrders(
      [
        ["1001", "Lightning Bolt", "2"],
        ["1001", "Lightning Bolt", "3"],
      ],
      mapping,
    );
    assert.equal(result.orders.length, 1);
    assert.equal(result.orders[0].lines.length, 1);
    assert.equal(result.orders[0].lines[0].quantity, 5);
  });

  it("reports conflicting order field values inside one group", () => {
    const headers = ["Order #", "Customer Name", "Card Name", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {});
    const result = composeCsvOrders(
      [
        ["1001", "Ann", "Lightning Bolt", "1"],
        ["1001", "Anne", "Giant Growth", "1"],
      ],
      mapping,
    );
    assert.equal(result.orders[0].customerName, "Ann");
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].field, "customerName");
    assert.equal(result.conflicts[0].firstValue, "Ann");
    assert.equal(result.conflicts[0].conflictingValue, "Anne");
  });

  it("keeps order-info-only rows as field sources and skips empty rows", () => {
    const headers = ["Order #", "Customer Name", "Card Name", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {});
    const result = composeCsvOrders(
      [
        ["1001", "Ann", "", ""],
        ["1001", "", "Lightning Bolt", "1"],
        ["", "", "", ""],
      ],
      mapping,
    );
    assert.equal(result.orders.length, 1);
    assert.equal(result.orders[0].customerName, "Ann");
    assert.equal(result.skippedRows, 1);
  });

  it("composes master-detail rows positionally", () => {
    const headers = ["Order #", "Customer Name", "Card Name", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {}, "master-detail");
    const result = composeCsvOrders(
      [
        ["1001", "Ann", "", ""],
        ["", "", "Lightning Bolt", "2"],
        ["", "", "Giant Growth", "1"],
        ["1002", "Bob", "", ""],
        ["", "", "Counterspell", "4"],
      ],
      mapping,
    );
    assert.equal(result.orders.length, 2);
    const [first, second] = result.orders;
    assert.equal(first.reference, "1001");
    assert.equal(first.customerName, "Ann");
    assert.deepEqual(
      first.lines.map((line) => line.name),
      ["Lightning Bolt", "Giant Growth"],
    );
    assert.equal(second.reference, "1002");
    assert.equal(second.customerName, "Bob");
    assert.equal(second.lines[0].quantity, 4);
  });

  it("groups master-less item rows into one order in master-detail mode", () => {
    const headers = ["Order #", "Card Name", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {}, "master-detail");
    const result = composeCsvOrders(
      [
        ["", "Lightning Bolt", "2"],
        ["", "Counterspell", "4"],
      ],
      mapping,
    );
    assert.equal(result.orders.length, 1);
    assert.equal(result.orders[0].reference, null);
    assert.equal(result.orders[0].lines.length, 2);
  });

  it("composes a single order from all rows", () => {
    const headers = ["Card Name", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {}, "single");
    mapping.singleOrderName = "My import";
    const result = composeCsvOrders(
      [
        ["Lightning Bolt", "2"],
        ["Counterspell", "4"],
      ],
      mapping,
    );
    assert.equal(result.orders.length, 1);
    assert.equal(result.orders[0].reference, "My import");
    assert.equal(result.orders[0].lines.length, 2);
  });

  it("parses condition and foil columns", () => {
    const headers = ["Order #", "Card Name", "Condition", "Foil", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {});
    const result = composeCsvOrders(
      [
        ["1001", "Lightning Bolt", "Near Mint", "yes", "1"],
        ["1001", "Counterspell", "HP", "no", "1"],
      ],
      mapping,
    );
    const [bolt, counter] = result.orders[0].lines;
    assert.equal(bolt.condition, "NM");
    assert.equal(bolt.isFoil, true);
    assert.equal(counter.condition, "HP");
    assert.equal(counter.isFoil, false);
  });

  it("normalizes card language names to language codes", () => {
    const headers = ["Order #", "Card Name", "Language", "Quantity"];
    const mapping = mappingWithColumns("orders", headers, {});
    const result = composeCsvOrders(
      [
        ["1001", "Trainers' Mail", "English", "1"],
        ["1001", "Shaymin EX", "German", "2"],
      ],
      mapping,
    );
    assert.deepEqual(
      result.orders[0].lines.map((line) => line.language),
      ["en", "de"],
    );
  });

  it("drops groups with zero valid item rows", () => {
    const headers = ["Order #", "Customer Name", "Card Name"];
    const mapping = mappingWithColumns("orders", headers, {});
    const result = composeCsvOrders([["1001", "Ann", ""]], mapping);
    assert.equal(result.orders.length, 0);
    assert.equal(result.emptyOrders, 1);
  });

  it("parses a full Shopify export end to end", () => {
    const headers = ["Name", "Lineitem name", "Lineitem quantity", "Lineitem price"];
    const mapping = inferCsvMapping("orders", headers);
    const rows = [
      ["1001", "Lightning Bolt - Foil", "2", "$1.50"],
      ["1001", "Giant Growth", "1", "$0.10"],
      ["1002", "Counterspell", "4", "$0.75"],
    ];
    assert.equal(missingRequiredCsvFields("orders", mapping).length, 0);
    assert.equal(inferComposition(rows, mapping), "reference");
    const composed = composeCsvOrders(rows, { ...mapping, composition: "reference" });
    assert.equal(composed.orders.length, 2);
    assert.equal(composed.orders[0].reference, "1001");
    assert.equal(composed.orders[0].lines[0].isFoil, true);
    assert.equal(composed.orders[0].lines[0].unitPrice, 1.5);
  });
});

describe("inferCsvMappingForPreset", () => {
  it("maps Shopify preset headers when the file is not auto-detected", () => {
    const headers = ["Name", "Email", "Lineitem name", "Lineitem quantity", "Lineitem price"];
    const mapping = inferCsvMappingForPreset("orders", headers, "shopify");
    assert.equal(mapping.columns.name, 2);
    assert.equal(mapping.columns.quantity, 3);
    assert.equal(mapping.columns.unitPrice, 4);
    assert.equal(mapping.columns.orderRef, 0);
  });

  it("falls back to generic aliases for the tcgplayer preset", () => {
    const headers = ["Product Name", "Set", "Quantity", "Order #"];
    const mapping = inferCsvMappingForPreset("orders", headers, "tcgplayer");
    assert.equal(mapping.columns.name, 0);
    assert.equal(mapping.columns.orderRef, 3);
  });
});

describe("composeCsvPickEntries", () => {
  it("merges duplicate names and skips empty rows", () => {
    const mapping = mappingWithColumns("picks", ["Card Name", "Quantity"], {}, "single");
    const result = composeCsvPickEntries(
      [
        ["Lightning Bolt", "2"],
        ["Lightning Bolt", "3"],
        ["", "1"],
      ],
      mapping,
    );
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].quantity, 5);
    assert.equal(result.skippedRows, 1);
  });
});

describe("composeCsvInventoryRows", () => {
  it("maps inventory fields", () => {
    const headers = ["Card Name", "Set Code", "Collector Number", "Quantity", "Condition", "Foil", "Storage Location"];
    const mapping = mappingWithColumns("inventory", headers, {}, "single");
    const result = composeCsvInventoryRows(
      [["Lightning Bolt", "2X2", "128", "3", "LP", "true", "Binder A"]],
      mapping,
    );
    assert.equal(result.rows.length, 1);
    const row = result.rows[0];
    assert.equal(row.name, "Lightning Bolt");
    assert.equal(row.setCode, "2X2");
    assert.equal(row.collectorNumber, "128");
    assert.equal(row.quantity, 3);
    assert.equal(row.condition, "LP");
    assert.equal(row.isFoil, true);
    assert.equal(row.storageLocation, "Binder A");
  });
});

describe("composeCsvShipments", () => {
  it("maps shipment fields and skips rows without a reference", () => {
    const headers = ["Order #", "Carrier", "Tracking Number", "Label Url"];
    const mapping = mappingWithColumns("shipments", headers, {}, "single");
    const result = composeCsvShipments(
      [
        ["1001", "DHL", "JD0001", "https://example.com/1"],
        ["", "DHL", "JD0002", ""],
      ],
      mapping,
    );
    assert.equal(result.shipments.length, 1);
    assert.equal(result.shipments[0].orderRef, "1001");
    assert.equal(result.shipments[0].carrier, "DHL");
    assert.equal(result.shipments[0].trackingNumber, "JD0001");
    assert.equal(result.shipments[0].labelUrl, "https://example.com/1");
    assert.equal(result.skippedRows, 1);
  });
});

describe("parseCsvTable", () => {
  it("strips a UTF-8 BOM from the first header", () => {
    const table = parseCsvTable("\uFEFFOrder #,Card Name,Quantity\n1001,Lightning Bolt,2");
    assert.deepEqual(table.headers, ["Order #", "Card Name", "Quantity"]);
    const mapping = inferCsvMapping("orders", table.headers);
    assert.equal(mapping.columns.orderRef, 0);
    assert.equal(mapping.columns.name, 1);
  });

  it("splits headers from body rows and handles quotes", () => {
    const table = parseCsvTable('Order #,Card Name,Quantity\n1001,"Lightning, Bolt",2');
    assert.deepEqual(table.headers, ["Order #", "Card Name", "Quantity"]);
    assert.deepEqual(table.rows, [["1001", "Lightning, Bolt", "2"]]);
  });
});

describe("CSV_IMPORT_FIELDS", () => {
  it("keeps item fields scoped per type", () => {
    const orders = CSV_IMPORT_FIELDS.orders;
    assert(orders.some((spec) => spec.key === "unitPrice" && spec.scope === "item"));
    assert(orders.some((spec) => spec.key === "customerName" && spec.scope === "order"));
    assert(!CSV_IMPORT_FIELDS.picks.some((spec) => spec.key === "unitPrice"));
    assert(!CSV_IMPORT_FIELDS.shipments.some((spec) => spec.scope === "item"));
  });
});
