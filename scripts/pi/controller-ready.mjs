import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { createConnection } from "node:net";

const root = process.argv[2];
const settings = parseEnv(readFileSync(join(root, ".env"), "utf8"));
const builtin = /^(1|true|on)$/i.test(settings.PI_SORTER ?? "");
if (process.argv[3] === "--mode") {
  console.log(builtin ? "builtin" : "usb");
} else if (builtin) {
  await new Promise((resolve, reject) => {
    const socket = createConnection({
      path: settings.PI_CONTROLLER_SOCKET || join(root, ".pi-controller/controller.sock"),
    });
    let buffer = "";
    const timer = setTimeout(() => finish(new Error("Controller readiness timed out.")), 2000);
    function finish(error) {
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve();
    }
    socket.once("error", finish);
    socket.once("end", () => finish(new Error("Controller closed before readiness reply.")));
    socket.once("connect", () => socket.write('{"getStatus":true,"seq":1}\n'));
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      if (buffer.length > 4096) return finish(new Error("Controller reply is too large."));
      while (buffer.includes("\n")) {
        const newline = buffer.indexOf("\n");
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        let reply;
        try {
          reply = JSON.parse(line);
        } catch {
          return finish(new Error("Invalid controller readiness reply."));
        }
        if (reply?.seq !== 1) continue;
        return finish(
          reply.status === "ready" && typeof reply.version === "string" && reply.servoDriver === "ok"
            ? undefined
            : new Error("Controller hardware is not ready."),
        );
      }
    });
  });
}
