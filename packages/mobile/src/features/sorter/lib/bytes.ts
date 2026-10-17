const BASE64_CHUNK = 0x8000;

export function encodeUtf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000)
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return Uint8Array.from(bytes);
}

export class Utf8StreamDecoder {
  private pending: number[] = [];

  decode(chunk: Uint8Array): string {
    const bytes = this.pending.length ? [...this.pending, ...chunk] : Array.from(chunk);
    this.pending = [];
    let out = "";
    let i = 0;
    while (i < bytes.length) {
      const b = bytes[i];
      const size = b < 0x80 ? 1 : b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1;
      if (i + size > bytes.length) {
        this.pending = bytes.slice(i);
        break;
      }
      let code = size === 1 ? b : b & (0xff >> (size + 1));
      for (let k = 1; k < size; k++) code = (code << 6) | (bytes[i + k] & 0x3f);
      out += String.fromCodePoint(code);
      i += size;
    }
    return out;
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
