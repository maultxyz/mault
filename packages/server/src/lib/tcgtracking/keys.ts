import { TCGTRACKING_PRODUCT_NUMBER_SUFFIX_PATTERN } from "../constants/tcgtracking";
import type {
  TcgtrackingGameConfig,
  TcgtrackingProduct,
} from "../interfaces/tcgtracking";

export function collectorNumberKey(number: string): string {
  const head = number.split("/")[0].trim().toUpperCase();
  return /^\d+$/.test(head) ? String(Number(head)) : head;
}

export function cardNameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function baseCardNameKey(name: string): string {
  return cardNameKey(
    name
      .replace(/\([^)]*\)/g, " ")
      .replace(/\s+-\s+[A-Za-z]*\d+[A-Za-z]?\/\d+.*$/, ""),
  );
}

export function setCodeKey(setCode: string): string {
  return setCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function comparableProductName(
  config: TcgtrackingGameConfig,
  product: TcgtrackingProduct,
): string {
  const name = product.name.replace(
    TCGTRACKING_PRODUCT_NUMBER_SUFFIX_PATTERN,
    "",
  );
  return config.comparableProductName?.(name) ?? name;
}
