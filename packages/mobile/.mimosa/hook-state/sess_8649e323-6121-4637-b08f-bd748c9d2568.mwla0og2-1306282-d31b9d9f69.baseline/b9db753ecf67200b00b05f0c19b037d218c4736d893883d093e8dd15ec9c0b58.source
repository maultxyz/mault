import * as Crypto from "expo-crypto";
import type { BinConfig, BinSet } from "@magic-vault/shared";

export function configsFromSet(set: BinSet | undefined, binCount: number): BinConfig[] {
  const filled: BinConfig[] = [];
  for (let i = 1; i <= binCount; i++) {
    const existing = set?.bins.find((c) => c.binNumber === i);
    filled.push(
      existing ?? {
        guid: Crypto.randomUUID(),
        binNumber: i,
        rules: { id: Crypto.randomUUID(), combinator: "and", conditions: [] },
      },
    );
  }
  return filled;
}
