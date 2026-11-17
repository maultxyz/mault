import assert from "node:assert/strict";
import { test } from "node:test";
import { getApiHost } from "../src/lib/constants/server";

for (const [pi, configured, expected] of [
  ["1", undefined, "127.0.0.1"],
  ["0", undefined, "0.0.0.0"],
  ["0", "127.0.0.1", "127.0.0.1"],
  ["1", "0.0.0.0", "0.0.0.0"],
  ["1", "   ", "127.0.0.1"],
] as const) {
  test(`API bind with PI_HOST=${pi}, API_HOST=${String(configured)} resolves to ${expected}`, (t) => {
    const previousPi = process.env.PI_HOST;
    const previousHost = process.env.API_HOST;
    t.after(() => {
      if (previousPi === undefined) delete process.env.PI_HOST;
      else process.env.PI_HOST = previousPi;
      if (previousHost === undefined) delete process.env.API_HOST;
      else process.env.API_HOST = previousHost;
    });
    process.env.PI_HOST = pi;
    if (configured === undefined) delete process.env.API_HOST;
    else process.env.API_HOST = configured;
    assert.equal(getApiHost(), expected);
  });
}
