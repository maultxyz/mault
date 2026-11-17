import { app } from "electron";
import {
  APP_URL_ENV,
  DEFAULT_LOCALE,
  DESKTOP_STRINGS,
  DEVELOPMENT_APP_URL,
  PRODUCTION_APP_URL,
  START_PATH,
} from "./constants/desktop";
import type { DesktopLocale, DesktopStrings } from "./interfaces/desktop";

export function getAppOrigin(): string {
  const configured = process.env[APP_URL_ENV];
  const url = configured || (app.isPackaged ? PRODUCTION_APP_URL : DEVELOPMENT_APP_URL);
  return new URL(url).origin;
}

export function getStartUrl(): string {
  return new URL(START_PATH, getAppOrigin()).toString();
}

export function isAppOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === getAppOrigin();
  } catch {
    return false;
  }
}

export function getStrings(): DesktopStrings {
  const language = app.getLocale().split("-")[0];
  const locale = (language in DESKTOP_STRINGS ? language : DEFAULT_LOCALE) as DesktopLocale;
  return DESKTOP_STRINGS[locale];
}
