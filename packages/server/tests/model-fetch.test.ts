import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { test } from "node:test";
import { fetchPinnedModel } from "../../web/src/features/scanner/lib/model-fetch";

for (const native of [true, false]) {
  test(`model checksums verify downloads ${native ? "with Web Crypto" : "over plain HTTP without crypto.subtle"}`, async (t) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: native ? webcrypto : {},
    });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
    });
    const bytes = Buffer.from("Mault model fixture");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    t.mock.method(globalThis, "fetch", async () => new Response(bytes));
    const model = {
      repo: "test/model",
      filename: "model.onnx",
      revision: "test",
      sha256,
    };
    assert.deepEqual(Buffer.from(await fetchPinnedModel(model)), bytes);
    await assert.rejects(
      fetchPinnedModel({ ...model, sha256: "0".repeat(64) }),
      /Checksum mismatch/,
    );
  });
}
