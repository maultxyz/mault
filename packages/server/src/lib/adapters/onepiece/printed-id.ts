import {
  ONE_PIECE_NAME_TAG_PATTERNS,
  ONE_PIECE_PRINTED_ID_PATTERN,
} from "../../constants/onepiece";

export function onePiecePrintedId(id: string): string {
  for (const segment of id.split("_")) {
    const printed = segment.replace(/-(?:pr|r|p)\d+$/, "");
    if (ONE_PIECE_PRINTED_ID_PATTERN.test(printed)) return printed;
  }
  const idx = id.indexOf("_");
  return idx > 0 ? id.slice(0, idx) : id;
}

export function onePiecePrintedName(cardName: string): string {
  let name = cardName.trim();
  for (;;) {
    let stripped = name;
    for (const pattern of ONE_PIECE_NAME_TAG_PATTERNS) {
      stripped = stripped.replace(pattern, "").trim();
    }
    if (stripped === name || stripped.length === 0) return name;
    name = stripped;
  }
}
