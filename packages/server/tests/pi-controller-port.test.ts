import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  isFirmwareFeatureSupported,
  isFirmwareVersionOutdated,
} from "@magic-vault/shared";
import { PiControllerClient } from "../src/lib/pi-controller-hub";
import { SorterLink } from "../src/lib/pi-scan/sorter-link";
import {
  claimSorterPort,
  releaseSorterPort,
  SorterPortError,
} from "../src/lib/pi-serial-port";

test("local controller shares browser connections while preserving an exclusive scan owner", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "pi-controller-"));
  const path = join(directory, "controller.sock");
  const server = createServer((socket) => {
    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      while (buffer.includes("\n")) {
        const newline = buffer.indexOf("\n");
        const command = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        socket.write(
          `${JSON.stringify({ seq: command.seq, status: "ready", board: "raspberry_pi", version: "pi-0.1.0" })}\n`,
        );
      }
    });
  });
  const previousSorter = process.env.PI_SORTER;
  const previousHost = process.env.PI_HOST;
  const previousSocket = process.env.PI_CONTROLLER_SOCKET;
  context.after(async () => {
    releaseSorterPort("session");
    releaseSorterPort("bridge");
    if (previousSorter === undefined) delete process.env.PI_SORTER;
    else process.env.PI_SORTER = previousSorter;
    if (previousHost === undefined) delete process.env.PI_HOST;
    else process.env.PI_HOST = previousHost;
    if (previousSocket === undefined) delete process.env.PI_CONTROLLER_SOCKET;
    else process.env.PI_CONTROLLER_SOCKET = previousSocket;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  server.listen(path);
  await once(server, "listening");
  process.env.PI_HOST = "1";
  process.env.PI_SORTER = "1";
  process.env.PI_CONTROLLER_SOCKET = path;
  const port = await claimSorterPort("session");
  assert.ok(port instanceof PiControllerClient);
  const viewer = await claimSorterPort("bridge");
  assert.ok(viewer.isOpen);
  await assert.rejects(
    claimSorterPort("session"),
    (error: unknown) =>
      error instanceof SorterPortError && error.reason === "busy",
  );
  const link = new SorterLink(port);
  const status = await link.command({ getStatus: true }, 1000);
  assert.equal(status.board, "raspberry_pi");
  assert.equal(status.version, "pi-0.1.0");
  link.close();
  releaseSorterPort("session");
  const next = await claimSorterPort("bridge");
  assert.ok(next.isOpen);
});

test("Pi version reports its implemented features without implying Arduino Wi-Fi support", () => {
  for (const feature of [
    "pipelinedFeed",
    "feederRollback",
    "storedCalibration",
    "paddleOpenDelay",
  ] as const) {
    assert.equal(isFirmwareFeatureSupported("pi-0.1.0", feature), true);
  }
  assert.equal(isFirmwareFeatureSupported("pi-0.1.0", "wifiRemote"), false);
  assert.equal(isFirmwareVersionOutdated("pi-0.1.0", "2.10.0"), false);
  assert.equal(isFirmwareVersionOutdated("pi-0.1.0", "pi-0.2.0"), true);
  assert.equal(isFirmwareFeatureSupported("2.6.0", "storedCalibration"), true);
});
