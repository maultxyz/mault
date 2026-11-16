import assert from "node:assert/strict";
import { test } from "node:test";
import { proxiedImageUrl } from "@magic-vault/shared";
import { syncImageUrl } from "../../web/src/features/admin/lib/sync-image-url";
import { imageProxyRoute } from "../src/routes/card/image-proxy";

test("Browser sync proxies image hosts without CORS support for both faces", () => {
  for (const imageUrl of [
    "https://images.ygoprodeck.com/images/cards/5479217.jpg",
    "https://images.ygoprodeck.com/images/cards/93170499.jpg",
    "https://cdn.swu-db.com/images/cards/SOR/010.png",
    "https://cdn.swu-db.com/images/cards/SOR/010-back.png",
    "https://www.gundam-gcg.com/en/images/cards/card/EB01-001.webp?261016",
    "https://gundam-gcg.com/en/images/cards/card/EB01-001.webp",
    "https://cards.lorcast.io/card/digital/large/sample.avif?1",
    "https://optcgapi.com/media/static/Card_Images/ST01-016.jpg",
    "https://images.fleshcube.com/large/MST131.webp",
    "https://cmsassets.rgpub.io/sanity/images/sample.png?accountingTag=RB",
    "https://dstcynss47vun.cloudfront.net/prod/cyberpunk/sample.webp?Expires=123&Signature=a%2Bb",
    "https://cdn.tcgtracking.com/product/494102_1000w.jpg",
  ]) {
    assert.equal(syncImageUrl(imageUrl, ""), proxiedImageUrl(imageUrl));
    assert.equal(
      syncImageUrl(imageUrl, "https://mault.example"),
      `https://mault.example${proxiedImageUrl(imageUrl)}`,
    );
  }
  for (const imageUrl of [
    "https://cards.scryfall.io/normal/front/a/b/card.jpg",
    "https://assets.tcgdex.net/en/base/base1/1/high.webp",
    "https://api.gatcg.com/cards/images/example.jpg",
  ])
    assert.equal(syncImageUrl(imageUrl, ""), imageUrl);
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

test("image proxy refuses redirects off the allowlist and SVG responses", async (t) => {
  const imageUrl = "https://images.ygoprodeck.com/images/cards/5479217.jpg";
  const requestedUrls: string[] = [];
  let upstreamResponse = () =>
    new Response(null, {
      status: 302,
      headers: { Location: "http://169.254.169.254/latest/meta-data" },
    });
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requestedUrls.push(url);
    return upstreamResponse();
  });
  const proxied = () =>
    imageProxyRoute.request(`/image-proxy?url=${encodeURIComponent(imageUrl)}`);

  assert.equal((await proxied()).status, 502);
  assert.deepEqual(requestedUrls, [imageUrl]);

  upstreamResponse = () =>
    new Response("<svg/>", { headers: { "Content-Type": "image/svg+xml" } });
  assert.equal((await proxied()).status, 502);
});

test("new browser proxy hosts relay AVIF and signed image URLs without changing the query", async (t) => {
  const samples = [
    "https://www.gundam-gcg.com/en/images/cards/card/EB01-001.webp?261016",
    "https://cards.lorcast.io/card/digital/large/sample.avif?1709690747",
    "https://optcgapi.com/media/static/Card_Images/ST01-016.jpg",
    "https://images.fleshcube.com/large/MST131.webp",
    "https://cmsassets.rgpub.io/sanity/images/sample.png?accountingTag=RB",
    "https://dstcynss47vun.cloudfront.net/prod/cyberpunk/sample.webp?Expires=123&Signature=a%2Bb",
  ];
  let requested = "";
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requested = url;
    return new Response(Uint8Array.from([1, 2, 3]), {
      headers: { "Content-Type": "image/avif" },
    });
  });
  for (const image of samples) {
    const response = await imageProxyRoute.request(
      `/image-proxy?url=${encodeURIComponent(image)}`,
    );
    assert.equal(response.status, 200, image);
    assert.equal(requested, image);
    assert.equal(
      response.headers.get("Cross-Origin-Resource-Policy"),
      "cross-origin",
    );
    assert.equal(response.headers.get("Content-Type"), "image/avif");
  }
  assert.equal(
    (
      await imageProxyRoute.request(
        `/image-proxy?url=${encodeURIComponent("https://unrelated.cloudfront.net/private")}`,
      )
    ).status,
    400,
  );
});
