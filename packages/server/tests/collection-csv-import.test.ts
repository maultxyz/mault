import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCollectionCsv } from "@magic-vault/shared";
import type { CollectionCsvImportRow } from "@magic-vault/shared";
import {
  pickNamedCandidate,
  pickPrintingCandidate,
} from "../src/lib/collection-csv-import";
import type { CatalogImportCandidate } from "../src/lib/interfaces/collection-csv-import";

function importRow(overrides: Partial<CollectionCsvImportRow>): CollectionCsvImportRow {
  return {
    lineNumber: 2,
    name: "Lightning Bolt",
    setCode: null,
    setName: null,
    collectorNumber: null,
    catalogId: null,
    quantity: 1,
    isFoil: null,
    condition: null,
    language: null,
    ...overrides,
  };
}

function candidate(overrides: Partial<CatalogImportCandidate>): CatalogImportCandidate {
  return {
    card_id: "card",
    name: "Lightning Bolt",
    set_code: "lea",
    set_name: "Limited Edition Alpha",
    collector_number: "161",
    ...overrides,
  };
}

describe("parseCollectionCsv", () => {
  it("reads a Moxfield collection export", () => {
    const parsed = parseCollectionCsv(
      [
        '"Count","Tradelist Count","Name","Edition","Condition","Language","Foil","Tags","Last Modified","Collector Number","Alter","Proxy","Purchase Price"',
        '"2","0","Lightning Bolt","2xm","Lightly Played","English","foil","","2026-01-01","117","False","False",""',
        '"1","0","Brazen Borrower // Petty Theft","eld","Near Mint","German","etched","","2026-01-01","39","False","False",""',
      ].join("\n"),
    );
    assert.equal(parsed.format, "moxfield");
    assert.deepEqual(parsed.rows[0], {
      lineNumber: 2,
      name: "Lightning Bolt",
      setCode: "2xm",
      setName: null,
      collectorNumber: "117",
      catalogId: null,
      quantity: 2,
      isFoil: true,
      condition: "LP",
      language: "en",
    });
    assert.equal(parsed.rows[1].isFoil, true);
    assert.equal(parsed.rows[1].language, "de");
  });

  it("reads Archidekt, ManaBox, Deckbox and Dragon Shield exports", () => {
    const archidekt = parseCollectionCsv(
      "Quantity,Name,Finish,Condition,Date Added,Language,Purchase Price,Tags,Edition Name,Edition Code,Multiverse Id,Scryfall ID,MTGO ID,Collector Number\n3,Sol Ring,Normal,NM,2026-01-01,EN,,,Commander Masters,cmm,,f1b2c3d4-0000-0000-0000-000000000000,,400",
    );
    assert.equal(archidekt.format, "archidekt");
    assert.equal(archidekt.rows[0].quantity, 3);
    assert.equal(archidekt.rows[0].isFoil, false);
    assert.equal(archidekt.rows[0].setCode, "cmm");
    assert.equal(archidekt.rows[0].setName, "Commander Masters");
    assert.equal(archidekt.rows[0].catalogId, "f1b2c3d4-0000-0000-0000-000000000000");

    const manabox = parseCollectionCsv(
      "Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency\nCounterspell,MH2,Modern Horizons 2,267,normal,uncommon,1,1,abc,0.5,false,false,near_mint,en,USD",
    );
    assert.equal(manabox.format, "manabox");
    assert.equal(manabox.rows[0].condition, "NM");
    assert.equal(manabox.rows[0].isFoil, false);

    const deckbox = parseCollectionCsv(
      "Count,Tradelist Count,Name,Edition,Edition Code,Card Number,Condition,Language,Foil,Signed,Artist Proof,Altered Art,Misprint,Promo,Textless,Printing Id,Printing Note,Tags,My Price\n4,0,Island,Unlimited Edition,2ED,293,Good (Lightly Played),English,,,,,,,,,,,",
    );
    assert.equal(deckbox.format, "deckbox");
    assert.equal(deckbox.rows[0].setCode, "2ED");
    assert.equal(deckbox.rows[0].collectorNumber, "293");

    const dragonShield = parseCollectionCsv(
      'sep=,\n"Folder Name","Quantity","Trade Quantity","Card Name","Set Code","Set Name","Card Number","Condition","Printing","Language","Price Bought","Date Bought","LOW","MID","MARKET"\n"Binder","1","0","Thoughtseize","THS","Theros","107","NearMint","Foil","English","0","2026-01-01","1","2","3"',
    );
    assert.equal(dragonShield.format, "dragonShield");
    assert.equal(dragonShield.rows[0].name, "Thoughtseize");
    assert.equal(dragonShield.rows[0].condition, "NM");
    assert.equal(dragonShield.rows[0].isFoil, true);
  });

  it("falls back to generic headers and skips rows without a name or with zero copies", () => {
    const parsed = parseCollectionCsv("Card,Qty,Set\nOpt,2,Dominaria\n,1,Dominaria\nShock,0,Dominaria\n\n");
    assert.equal(parsed.format, "generic");
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].setName, "Dominaria");
    assert.equal(parsed.skippedRows, 2);
    assert.equal(parsed.hasNameColumn, true);
  });

  it("reports a file without a name column", () => {
    assert.equal(parseCollectionCsv("Foo,Bar\n1,2").hasNameColumn, false);
  });
});

describe("collection CSV catalog picks", () => {
  it("matches a printing by set code and unpadded collector number", () => {
    const picked = pickPrintingCandidate(
      importRow({ setCode: "LEA", collectorNumber: "0161" }),
      [candidate({ card_id: "other", set_code: "leb" }), candidate({ card_id: "alpha" })],
    );
    assert.equal(picked?.card_id, "alpha");
  });

  it("matches set-prefixed collector numbers", () => {
    const picked = pickPrintingCandidate(
      importRow({ name: "Monkey.D.Luffy", setCode: "OP01", collectorNumber: "024" }),
      [candidate({ card_id: "luffy", name: "Monkey.D.Luffy", set_code: "OP01", collector_number: "OP01-024" })],
    );
    assert.equal(picked?.card_id, "luffy");
  });

  it("prefers the named set and otherwise the first printing in shown order", () => {
    const candidates = [
      candidate({ card_id: "newest", set_code: "2x2", set_name: "Double Masters 2022" }),
      candidate({ card_id: "alpha" }),
    ];
    assert.equal(pickNamedCandidate(importRow({ setName: "limited edition alpha" }), candidates)?.card_id, "alpha");
    assert.equal(pickNamedCandidate(importRow({}), candidates)?.card_id, "newest");
    assert.equal(pickNamedCandidate(importRow({ name: "Shock" }), candidates), null);
  });

  it("matches a double-faced card by its front face", () => {
    const picked = pickNamedCandidate(importRow({ name: "Delver of Secrets" }), [
      candidate({ card_id: "delver", name: "Delver of Secrets // Insectile Aberration" }),
    ]);
    assert.equal(picked?.card_id, "delver");
  });
});
