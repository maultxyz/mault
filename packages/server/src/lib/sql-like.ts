export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function containsLikePattern(value: string): string {
  return `%${escapeLikePattern(value)}%`;
}
