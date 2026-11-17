declare const __APP_VERSION__: string;
declare const __BUILD_YEAR__: number;

interface Window {
  __ENV__?: Partial<Record<string, string>>;
  maultDesktop?: import("@magic-vault/shared").DesktopBridge;
}
