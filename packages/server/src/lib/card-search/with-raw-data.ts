export function withRawData<T extends object>(
  card: T,
  raw: unknown,
): T & { data: string } {
  return { ...card, data: JSON.stringify(raw) };
}
