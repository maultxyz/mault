export function onlyPriceRecord<T>(records: T[]): T | undefined {
  return records.length === 1 ? records[0] : undefined;
}
