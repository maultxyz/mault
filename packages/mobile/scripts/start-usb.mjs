import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const FORWARDED_PORTS = [8081, 5173];

function resolveAdb() {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (sdk) {
    const adb = join(sdk, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
    if (existsSync(adb)) return adb;
  }
  return "adb";
}

const adb = resolveAdb();

for (const port of FORWARDED_PORTS) {
  const result = spawnSync(adb, ["reverse", `tcp:${port}`, `tcp:${port}`], { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    console.error(`adb reverse tcp:${port} failed. Is the phone plugged in with USB debugging on?`);
    process.exit(1);
  }
}

const expo = spawn("expo", ["start", "--dev-client", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1" },
});

expo.on("exit", (code) => process.exit(code ?? 0));
