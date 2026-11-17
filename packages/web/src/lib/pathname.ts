export function trimTrailingSlashes(pathname: string): string {
  let trimmed = pathname;
  while (trimmed.length > 1 && trimmed.endsWith("/")) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}
