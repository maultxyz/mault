import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOrgProfileUrl,
  orgProfileFormSchema,
  parseOrgProfileHandleFromPath,
  shortenerRegisterLinksSchema,
  suggestOrgProfileHandle,
} from "@magic-vault/shared";
import { parseSharePreviewPath, profileSharePreviewText } from "../src/lib/share-preview-html";

const VALID_PROFILE = {
  handle: "Kennys-Cards",
  displayName: "Kenny's Cards",
  bio: "",
  links: [{ kind: "instagram", url: "instagram.com/kennyscards", label: "" }],
  showcaseScanIds: [],
  shopCatalogGuids: [],
  showsPrices: false,
  isPublished: true,
};

test("profile handles are lowercased and links gain an https scheme", () => {
  const parsed = orgProfileFormSchema.parse(VALID_PROFILE);
  assert.equal(parsed.handle, "kennys-cards");
  assert.equal(parsed.links[0].url, "https://instagram.com/kennyscards");
});

test("profile handles reject bad shapes and reserved words", () => {
  for (const handle of ["ab", "-abc", "abc-", "has space", "admin", "s", "a".repeat(31)]) {
    assert.equal(orgProfileFormSchema.safeParse({ ...VALID_PROFILE, handle }).success, false, handle);
  }
});

test("profile links only accept web urls", () => {
  for (const url of ["javascript:alert(1)", "mailto:a@b.c", "localhost", ""]) {
    const result = orgProfileFormSchema.safeParse({
      ...VALID_PROFILE,
      links: [{ kind: "website", url, label: "" }],
    });
    assert.equal(result.success, false, url);
  }
});

test("org names suggest a usable handle", () => {
  assert.equal(suggestOrgProfileHandle("Kenny's Card Shop!"), "kenny-s-card-shop");
  assert.equal(suggestOrgProfileHandle("Pokémon Palace"), "pokemon-palace");
  assert.equal(suggestOrgProfileHandle("??"), "");
  assert.equal(suggestOrgProfileHandle("Admin"), "");
});

test("profile urls prefer the short link", () => {
  assert.equal(
    buildOrgProfileUrl("https://mault.example/", { handle: "kenny", shortUrl: null }),
    "https://mault.example/@kenny",
  );
  assert.equal(
    buildOrgProfileUrl("https://mault.example", { handle: "kenny", shortUrl: "https://mlt.to/kenny" }),
    "https://mlt.to/kenny",
  );
});

test("profile path segments resolve to handles", () => {
  assert.equal(parseOrgProfileHandleFromPath("@Kenny"), "kenny");
  assert.equal(parseOrgProfileHandleFromPath("kenny"), null);
  assert.equal(parseOrgProfileHandleFromPath("@app"), null);
});

test("profile pages get link previews", () => {
  assert.deepEqual(parseSharePreviewPath("/@kenny"), {
    kind: "profile",
    subjectKey: "kenny",
    token: null,
    pathWithQuery: "/@kenny",
  });
  assert.equal(parseSharePreviewPath("/%40kenny/")?.subjectKey, "kenny");
  assert.equal(parseSharePreviewPath("/@kenny/cards"), null);
  assert.equal(parseSharePreviewPath("/@ab"), null);
});

test("profile preview text falls back to a showcase summary", () => {
  const summary = { subjectName: "Kenny", cardCount: 2, games: [], isTradeLink: false };
  assert.equal(profileSharePreviewText(summary, "Vintage singles").description, "Vintage singles");
  assert.equal(profileSharePreviewText(summary, " ").description, "See 2 cards showcased by Kenny.");
});

test("the shortener accepts profile handles as codes", () => {
  const result = shortenerRegisterLinksSchema.safeParse({
    links: [{ code: "kennys-cards", targetPath: "/@kennys-cards", expiresAt: null }],
  });
  assert.equal(result.success, true);
});
