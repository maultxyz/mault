import assert from "node:assert/strict";
import { test } from "node:test";
import { proxiedImageUrl } from "@magic-vault/shared";
import { syncImageUrl } from "../../web/src/features/admin/lib/sync-image-url";
import { imageProxyRoute } from "../src/routes/card/image-proxy";

test("Yu-Gi-Oh browser sync uses the existing image proxy for both image faces", () => {
  for (const imageUrl of [
    "https://images.ygoprodeck.com/images/cards/5479217.jpg",
    "https://images.ygoprodeck.com/images/cards/93170499.jpg",
  ]) {
    assert.equal(syncImageUrl(imageUrl, ""), proxiedImageUrl(imageUrl));
    assert.equal(
      syncImageUrl(imageUrl, "https://mault.example"),
      `https://mault.example${proxiedImageUrl(imageUrl)}`,
    );
  }
  const scryfall = "https://cards.scryfall.io/normal/front/a/b/card.jpg";
  assert.equal(syncImageUrl(scryfall, ""), scryfall);
  assert.equal(syncImageUrl("/local-card.jpg", ""), "/local-card.jpg");
});

test("existing proxy relays YGOPRODeck image bytes and keeps its host restrictions", async (t) => {
  const imageUrl = "https://images.ygoprodeck.com/images/cards/5479217.jpg";
  const image = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  let fetches = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    fetches++;
    assert.equal(url, imageUrl);
    return new Response(image, { headers: { "Content-Type": "image/jpeg" } });
  });
  const response = await imageProxyRoute.request(
    `/image-proxy?url=${encodeURIComponent(imageUrl)}`,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/jpeg");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), image);
  for (const blocked of [
    "http://images.ygoprodeck.com/images/cards/1.jpg",
    "https://images.ygoprodeck.com.attacker.example/1.jpg",
    "http://127.0.0.1/private",
  ]) {
    assert.equal(
      (
        await imageProxyRoute.request(
          `/image-proxy?url=${encodeURIComponent(blocked)}`,
        )
      ).status,
      400,
    );
  }
  assert.equal(fetches, 1);
});
