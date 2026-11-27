import assert from "node:assert/strict";
import { test } from "node:test";
import { isPiLinkAllowedRoute } from "../src/lib/scan-actor-routes";

const collection = "0f8fad5b-d9cb-469f-a165-70867728950e";

test("a linked Pi may call only the routes a scan needs", () => {
  assert.ok(isPiLinkAllowedRoute("POST", `/collections/${collection}/cards`));
  assert.ok(isPiLinkAllowedRoute("POST", `/collections/${collection}/cards/sorted`));
  assert.ok(isPiLinkAllowedRoute("POST", `/collections/${collection}/unmatched`));
  assert.ok(isPiLinkAllowedRoute("GET", `/collections/${collection}/cards/copies?cardIds=a,b`));
  assert.ok(isPiLinkAllowedRoute("POST", `/collections/${collection}/cards/remove-bulk`));
  assert.ok(isPiLinkAllowedRoute("PUT", "/bins/bins/4?gameGuid=x"));
  assert.ok(isPiLinkAllowedRoute("POST", `/bins/bins/${collection}/pick-list/found`));
  assert.ok(isPiLinkAllowedRoute("POST", "/scan-host/context"));
  assert.ok(isPiLinkAllowedRoute("POST", "/scan-host/apply-target"));
});

test("a linked Pi cannot reach anything else in the org", () => {
  assert.equal(isPiLinkAllowedRoute("DELETE", `/collections/${collection}`), false);
  assert.equal(isPiLinkAllowedRoute("DELETE", `/collections/${collection}/cards`), false);
  assert.equal(isPiLinkAllowedRoute("GET", `/collections/${collection}/cards`), false);
  assert.equal(isPiLinkAllowedRoute("POST", "/collections"), false);
  assert.equal(isPiLinkAllowedRoute("DELETE", "/bins/bins/4"), false);
  assert.equal(isPiLinkAllowedRoute("PUT", "/bins/bins/4/extra"), false);
  assert.equal(isPiLinkAllowedRoute("GET", "/scan-host/context"), false);
  assert.equal(isPiLinkAllowedRoute("POST", "/scan-host/../billing"), false);
  assert.equal(isPiLinkAllowedRoute("POST", "/api-keys"), false);
  assert.equal(isPiLinkAllowedRoute("POST", `/collections/${collection}/cards/../../x`), false);
});
