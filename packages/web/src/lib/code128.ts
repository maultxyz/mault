import {
  CODE128_CHECKSUM_MODULUS,
  CODE128_PATTERNS,
  CODE128_QUIET_ZONE_MODULES,
  CODE128_SET_B_FIRST_CHAR_CODE,
  CODE128_SET_B_LAST_CHAR_CODE,
  CODE128_START_B,
  CODE128_STOP,
} from "@/lib/constants/code128";
import type { Code128Bars } from "@/lib/interfaces/code128";

export function encodeCode128(text: string): Code128Bars {
  const values = [...text].map((character) => {
    const code = character.charCodeAt(0);
    if (code < CODE128_SET_B_FIRST_CHAR_CODE || code >= CODE128_SET_B_LAST_CHAR_CODE) {
      throw new Error(`Code 128 set B can't encode "${character}"`);
    }
    return code - CODE128_SET_B_FIRST_CHAR_CODE;
  });
  const checksum =
    values.reduce((sum, value, index) => sum + value * (index + 1), CODE128_START_B) %
    CODE128_CHECKSUM_MODULUS;
  const symbols = [CODE128_START_B, ...values, checksum, CODE128_STOP];
  const bars: Code128Bars["bars"] = [];
  let module = CODE128_QUIET_ZONE_MODULES;
  for (const symbol of symbols) {
    [...CODE128_PATTERNS[symbol]].forEach((width, index) => {
      const modules = Number(width);
      if (index % 2 === 0) bars.push({ x: module, width: modules });
      module += modules;
    });
  }
  return { bars, totalModules: module + CODE128_QUIET_ZONE_MODULES };
}
