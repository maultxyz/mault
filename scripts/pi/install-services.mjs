import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";

const root = realpathSync(process.argv[2]);
if (/[\r\n]/.test(root))
  throw new Error("The checkout path cannot contain line breaks.");
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
const envPath = join(root, ".env");
const settings = existsSync(envPath)
  ? parseEnv(readFileSync(envPath, "utf8"))
  : {};
const builtin = /^(1|true|on)$/i.test(settings.PI_SORTER ?? "");
const units = [
  "mault-api.service",
  "mault-web.service",
  "mault-camera.service",
];
if (builtin) units.push("mault-controller.service");
for (const unit of units) {
  const template = readFileSync(join(root, "scripts/pi", unit), "utf8");
  let rendered = template
    .split("\n")
    .map((line) =>
      line.replace(/%h\/mault(?:\/[^\s"']*)?/g, (path) =>
        unitPath(
          `${root}${path.slice("%h/mault".length)}`,
          line.startsWith("Exec"),
        ),
      ),
    )
    .join("\n");
  if (builtin && unit === "mault-api.service") {
    rendered = rendered.replace(
      "After=network.target",
      "After=network.target mault-controller.service\nWants=mault-controller.service",
    );
  }
  writeFileSync(join(unitDirectory, unit), rendered, { mode: 0o644 });
}
