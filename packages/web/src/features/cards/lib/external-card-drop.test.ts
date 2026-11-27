import {
  findDroppedDeckLink,
  isExternalCardDrag,
  parseExternalCardDrop,
} from "@/features/cards/lib/external-card-drop";
import { describe, expect, it } from "vitest";

const SCRYFALL_ID = "0afa0e33-4804-4b00-b625-c2d6b61090fc";

function drop(data: Partial<Parameters<typeof parseExternalCardDrop>[0]>) {
  return parseExternalCardDrop({ uriList: "", html: "", plainText: "", ...data });
}

describe("parseExternalCardDrop", () => {
  it("reads the Scryfall id and name from a dragged Scryfall image", () => {
    const imageUrl = `https://cards.scryfall.io/large/front/0/a/${SCRYFALL_ID}.jpg?1562`;
    expect(
      drop({
        uriList: imageUrl,
        html: `<img src="${imageUrl}" alt="Sol Ring">`,
      }),
    ).toEqual([
      {
        scryfallId: SCRYFALL_ID,
        setCode: undefined,
        collectorNumber: undefined,
        name: "Sol Ring",
      },
    ]);
  });

  it("reads set, collector number and name from a Scryfall card link", () => {
    expect(
      drop({ uriList: "https://scryfall.com/card/MH2/259/urzas-saga" }),
    ).toEqual([
      {
        scryfallId: undefined,
        setCode: "mh2",
        collectorNumber: "259",
        name: "urzas saga",
      },
    ]);
  });

  it("keeps the image's alt text as the name for Moxfield cards", () => {
    expect(
      drop({
        uriList: "https://assets.moxfield.net/cards/card-OJ5wD-normal.webp",
        html: '<img src="https://assets.moxfield.net/cards/card-OJ5wD-normal.webp" alt="Lightning Bolt">',
      }),
    ).toEqual([
      {
        scryfallId: undefined,
        setCode: undefined,
        collectorNumber: undefined,
        name: "Lightning Bolt",
      },
    ]);
  });

  it("reads the Scryfall id from Archidekt's image bucket", () => {
    const [reference] = drop({
      uriList: `https://storage.googleapis.com/archidekt-card-images/mh2/${SCRYFALL_ID}_art_crop.jpg`,
    });
    expect(reference?.scryfallId).toBe(SCRYFALL_ID);
  });

  it("ignores links from other sites", () => {
    expect(
      drop({
        uriList: `https://example.com/${SCRYFALL_ID}.jpg`,
        html: '<img src="https://example.com/a.jpg" alt="Sol Ring">',
      }),
    ).toEqual([]);
    expect(
      drop({
        uriList: "https://storage.googleapis.com/other-bucket/card.jpg",
      }),
    ).toEqual([]);
  });

  it("returns one reference per listed card link", () => {
    expect(
      drop({
        uriList: [
          "# comment",
          "https://scryfall.com/card/lea/1/animate-wall",
          "https://scryfall.com/card/lea/2/armageddon",
        ].join("\r\n"),
      }),
    ).toHaveLength(2);
  });

  it("reads a plain-text card URL", () => {
    const [reference] = drop({
      plainText: `https://api.scryfall.com/cards/${SCRYFALL_ID}`,
    });
    expect(reference?.scryfallId).toBe(SCRYFALL_ID);
  });
});

describe("isExternalCardDrag", () => {
  it("accepts link and HTML drags but not plain files", () => {
    expect(isExternalCardDrag(["text/uri-list"])).toBe(true);
    expect(isExternalCardDrag(["Files", "text/html"])).toBe(true);
    expect(isExternalCardDrag(["Files"])).toBe(false);
  });
});

describe("findDroppedDeckLink", () => {
  it("finds Moxfield and Archidekt deck links", () => {
    expect(
      findDroppedDeckLink({
        uriList: "https://moxfield.com/decks/aBc-123_x",
        html: "",
        plainText: "",
      }),
    ).toBe("https://moxfield.com/decks/aBc-123_x");
    expect(
      findDroppedDeckLink({
        uriList: "",
        html: '<a href="https://archidekt.com/decks/123456/my_deck">My deck</a>',
        plainText: "",
      }),
    ).toBe("https://archidekt.com/decks/123456/my_deck");
  });

  it("ignores card links", () => {
    expect(
      findDroppedDeckLink({
        uriList: "https://scryfall.com/card/mh2/259/urzas-saga",
        html: "",
        plainText: "",
      }),
    ).toBeNull();
  });
});
