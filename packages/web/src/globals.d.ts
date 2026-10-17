declare const __APP_VERSION__: string;

interface Window {
  __ENV__?: Partial<Record<string, string>>;
}
