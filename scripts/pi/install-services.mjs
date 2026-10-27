import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const root = realpathSync(process.argv[2]);
if (/[\r\n]/.test(root)) throw new Error("The checkout path cannot contain line breaks.");
const unitDirectory = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
  "systemd/user",
);

function unitPath(path, command) {
  if (!command) return `${path.replaceAll("%", "%%")}/.`;
  let escaped = path
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
    .replaceAll("%", "%%");
  escaped = escaped.replaceAll("$", () => "$$");
  return `"${escaped}"`;
}

mkdirSync(unitDirectory, { recursive: true });
for (const unit of ["mault-api.service", "mault-web.service", "mault-camera.service"]) {
  const template = readFileSync(join(root, "scripts/pi", unit), "utf8");
  const rendered = template.split("\n").map((line) =>
    line.replace(/%h\/mault(?:\/[^\s"']*)?/g, (path) =>
      unitPath(`${root}${path.slice("%h/mault".length)}`, line.startsWith("Exec")),
    ),
  ).join("\n");
  writeFileSync(join(unitDirectory, unit), rendered, { mode: 0o644 });
}
