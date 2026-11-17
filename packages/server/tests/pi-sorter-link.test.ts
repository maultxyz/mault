import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import type { SerialPort } from "serialport";
import { SorterLink } from "../src/lib/pi-scan/sorter-link";

class FakePort extends EventEmitter {
  isOpen = true;
  writes: Record<string, unknown>[] = [];
  write(text: string, callback: (error?: Error) => void) {
    this.writes.push(JSON.parse(text));
    callback();
  }
  reply(data: object) {
    this.emit("data", Buffer.from(`${JSON.stringify(data)}\n`));
  }
}

function connection() {
  const port = new FakePort();
  const link = new SorterLink(port as unknown as SerialPort);
  return { port, link };
}

test("Pi sorter ignores boot, feed events and unrelated replies while matching seq", async () => {
  const { port, link } = connection();
  const pending = link.command({ getStatus: true }, 1000);
  const seq = port.writes[0].seq;
  port.reply({ status: "ready" });
  port.reply({ event: "fed" });
  port.reply({ seq: 999, status: "routed" });
  port.reply({ seq, id: "sorter-1" });
  assert.equal((await pending).id, "sorter-1");
  link.close();
});

test("Pi sorter records downstream jams without consuming the command reply", async () => {
  const { port, link } = connection();
  const pending = link.command(
    { route: { module: 2, direction: "left" } },
    1000,
  );
  port.reply({ error: "jam", module: 2 });
  port.reply({ seq: port.writes[0].seq, status: "routed" });
  assert.equal((await pending).status, "routed");
  assert.equal(link.jamModule, 2);
  link.close();
});

test("Pi sorter supports a single unnumbered reply on older firmware", async () => {
  const { port, link } = connection();
  const pending = link.command({ getStatus: true }, 1000);
  port.reply({ id: "old-sorter" });
  assert.equal((await pending).id, "old-sorter");
  link.close();
});

test("Pi sorter drops a timed-out seq instead of applying it to the next command", async () => {
  const { port, link } = connection();
  const status = link.command({ getStatus: true }, 1000);
  port.reply({ seq: port.writes[0].seq, id: "sorter" });
  await status;
  await assert.rejects(link.command({ neutral: true }, 5), /in time/);
  const pending = link.command({ feeder: true }, 1000);
  port.reply({ seq: port.writes[1].seq, status: "neutral" });
  port.reply({ seq: port.writes[2].seq, detected: true });
  assert.equal((await pending).detected, true);
  link.close();
});

test("Pi sorter rejects pending work immediately on disconnect", async () => {
  const { port, link } = connection();
  const pending = link.command({ feeder: true }, 1000);
  port.emit("close");
  await assert.rejects(pending, /disconnected/);
  await assert.rejects(link.command({ feeder: true }, 1000), /closed/);
});
