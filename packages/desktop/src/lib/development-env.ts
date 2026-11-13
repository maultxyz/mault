import { app } from "electron";
import { existsSync } from "fs";
import path from "path";
import { ROOT_ENV_FILE_RELATIVE_PATH } from "./constants/desktop";

export function loadDevelopmentEnv() {
  if (app.isPackaged) return;
  const envFilePath = path.resolve(app.getAppPath(), ROOT_ENV_FILE_RELATIVE_PATH);
  if (existsSync(envFilePath)) process.loadEnvFile(envFilePath);
}
