import { randomInt } from "node:crypto";
import { SHORT_LINK_CODE_ALPHABET, SHORT_LINK_CODE_LENGTH } from "@magic-vault/shared";

export function generateShortLinkCode(): string {
  let code = "";
  for (let index = 0; index < SHORT_LINK_CODE_LENGTH; index++) {
    code += SHORT_LINK_CODE_ALPHABET[randomInt(SHORT_LINK_CODE_ALPHABET.length)];
  }
  return code;
}
