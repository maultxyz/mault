export function webUrl(): string {
  return process.env.WEB_URL ?? "http://localhost:5173";
}
