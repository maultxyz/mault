import assert from "node:assert/strict";
import { test } from "node:test";
import { PI_LINK_PAIRING_SECRET_HEADER } from "@magic-vault/shared";
import { pairPiLink, piLinkPairingRuntime } from "../src/lib/pi-link-device/pairing";

const baseUrl = "https://mault.example/api";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: status < 400, data }), { status });
}

function scriptPairing(responses: ((url: string, init?: RequestInit) => Response)[]) {
  const requests: { url: string; init?: RequestInit }[] = [];
  piLinkPairingRuntime.wait = async () => {};
  piLinkPairingRuntime.now = () => 0;
  piLinkPairingRuntime.fetch = async (url, init) => {
    requests.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error(`Unexpected request to ${url}`);
    return next(url, init);
  };
  return requests;
}

const created = (code: string) => () =>
  jsonResponse({ code, pollSecret: `secret-${code}`, expiresAt: new Date(60_000).toISOString() });

test("pairing shows a code, polls with the secret header and returns the token once claimed", async () => {
  const requests = scriptPairing([
    created("ABCD2345"),
    () => jsonResponse({ status: "pending", expiresAt: new Date(60_000).toISOString() }),
    () =>
      jsonResponse({
        status: "claimed",
        token: "mvpi_token",
        orgId: "org-1",
        hostGuid: "host-1",
        hostName: "Workbench Pi",
      }),
  ]);
  const shownCodes: string[] = [];
  const credential = await pairPiLink(baseUrl, "raspberrypi", (pairing) => shownCodes.push(pairing.code));
  assert.deepEqual(credential, {
    baseUrl,
    token: "mvpi_token",
    orgId: "org-1",
    hostGuid: "host-1",
    hostName: "Workbench Pi",
  });
  assert.deepEqual(shownCodes, ["ABCD2345"]);
  assert.equal(requests[0].url, `${baseUrl}/public/pi-link/pairings`);
  assert.equal(JSON.parse(requests[0].init!.body as string).name, "raspberrypi");
  assert.equal(requests[1].url, `${baseUrl}/public/pi-link/pairings/ABCD2345`);
  assert.equal(
    (requests[1].init!.headers as Record<string, string>)[PI_LINK_PAIRING_SECRET_HEADER],
    "secret-ABCD2345",
  );
  assert.ok(!requests[1].url.includes("secret"));
});

test("an expired code is replaced by a new one and a failed request is retried", async () => {
  scriptPairing([
    () => new Response("down", { status: 503 }),
    created("AAAA2222"),
    () => jsonResponse({ status: "expired" }),
    created("BBBB3333"),
    () => {
      throw new Error("network");
    },
    () =>
      jsonResponse({ status: "claimed", token: "t", orgId: "o", hostGuid: "h", hostName: "n" }),
  ]);
  const shownCodes: string[] = [];
  const credential = await pairPiLink(baseUrl, "pi", (pairing) => shownCodes.push(pairing.code));
  assert.deepEqual(shownCodes, ["AAAA2222", "BBBB3333"]);
  assert.equal(credential.token, "t");
});
