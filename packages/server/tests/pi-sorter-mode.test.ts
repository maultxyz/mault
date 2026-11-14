import assert from "node:assert/strict";
import { test } from "node:test";
import { isPiSorter, piControllerSocket } from "../src/lib/pi-host";

test("PI_SORTER is explicit, requires Pi hosting and never guesses a USB fallback", (context) => {
  const previous = {
    host: process.env.PI_HOST,
    sorter: process.env.PI_SORTER,
    socket: process.env.PI_CONTROLLER_SOCKET,
  };
  context.after(() => {
    for (const [key, value] of [
      ["PI_HOST", previous.host],
      ["PI_SORTER", previous.sorter],
      ["PI_CONTROLLER_SOCKET", previous.socket],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  });
  process.env.PI_HOST = "1";
  delete process.env.PI_SORTER;
  assert.equal(isPiSorter(), false);
  process.env.PI_SORTER = "1";
  assert.equal(isPiSorter(), true);
  process.env.PI_HOST = "0";
  assert.equal(isPiSorter(), false);
  delete process.env.PI_CONTROLLER_SOCKET;
  assert.throws(piControllerSocket, /absolute/);
  process.env.PI_CONTROLLER_SOCKET = "/tmp/private-sorter/controller.sock";
  assert.equal(piControllerSocket(), "/tmp/private-sorter/controller.sock");
});
