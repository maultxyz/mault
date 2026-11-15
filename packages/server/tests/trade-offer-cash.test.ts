import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TRADE_OFFER_CASH_AMOUNT_MAX,
  parseTradeOfferCashInput,
  tradeOfferFormSchema,
  tradeOfferOfferKind,
  tradeOfferRequestSchema,
  type TradeOfferOfferedCard,
} from "@magic-vault/shared";

const offeredCard: TradeOfferOfferedCard = {
  gameKey: "mtg",
  lang: "en",
  cardId: "card-1",
  name: "Card",
  setCode: "set",
  setName: "Set",
  collectorNumber: "1",
  imageUrl: null,
  quantity: 1,
  condition: "NM",
  isFoil: false,
};

test("parseTradeOfferCashInput reads dot and comma decimals and ignores empty or zero", () => {
  assert.equal(parseTradeOfferCashInput("12"), 12);
  assert.equal(parseTradeOfferCashInput(" 12.5 "), 12.5);
  assert.equal(parseTradeOfferCashInput("12,50"), 12.5);
  assert.equal(parseTradeOfferCashInput(""), null);
  assert.equal(parseTradeOfferCashInput("0"), null);
  assert.equal(parseTradeOfferCashInput("12.345"), null);
  assert.equal(parseTradeOfferCashInput("-3"), null);
  assert.equal(parseTradeOfferCashInput("abc"), null);
});

test("tradeOfferFormSchema accepts an empty or valid cash amount and rejects bad ones", () => {
  const base = { guestName: "Sam", guestContact: "sam@example.com", guestNote: "" };
  assert.equal(tradeOfferFormSchema.safeParse({ ...base, offeredCash: "" }).success, true);
  assert.equal(tradeOfferFormSchema.safeParse({ ...base, offeredCash: "20,00" }).success, true);
  assert.equal(tradeOfferFormSchema.safeParse({ ...base, offeredCash: "twenty" }).success, false);
  assert.equal(
    tradeOfferFormSchema.safeParse({ ...base, offeredCash: String(TRADE_OFFER_CASH_AMOUNT_MAX + 1) }).success,
    false,
  );
});

test("tradeOfferRequestSchema allows cash only, nothing, and requests from store app versions", () => {
  const base = {
    guestName: "Sam",
    guestContact: "sam@example.com",
    guestNote: "",
    wantedScanIds: ["0d6f1a52-3b8e-4c3f-9a51-3b0f0f7f9e11"],
  };
  assert.equal(tradeOfferRequestSchema.safeParse({ ...base, offered: [] }).success, true);
  assert.equal(
    tradeOfferRequestSchema.safeParse({ ...base, offered: [], offeredCashAmount: 15 }).success,
    true,
  );
  assert.equal(
    tradeOfferRequestSchema.safeParse({ ...base, offered: [], offeredCashAmount: -1 }).success,
    false,
  );
  assert.equal(
    tradeOfferRequestSchema.safeParse({
      ...base,
      offered: [{ gameKey: "mtg", lang: "en", cardId: "card-1", quantity: 1, condition: "NM", isFoil: false }],
    }).success,
    true,
  );
});

test("tradeOfferOfferKind tells cards, cash, both and nothing apart", () => {
  const cash = { amount: 10, currency: "USD" };
  assert.equal(tradeOfferOfferKind({ offered: [offeredCard], offeredCash: null }), "cards");
  assert.equal(tradeOfferOfferKind({ offered: [], offeredCash: cash }), "cash");
  assert.equal(tradeOfferOfferKind({ offered: [offeredCard], offeredCash: cash }), "cardsAndCash");
  assert.equal(tradeOfferOfferKind({ offered: [], offeredCash: null }), "nothing");
});
