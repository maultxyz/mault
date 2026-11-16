export function isAbsoluteWebUrl(target: string): boolean {
  return target.startsWith("https://") || target.startsWith("http://");
}
