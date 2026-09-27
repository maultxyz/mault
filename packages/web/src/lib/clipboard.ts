export async function copyTextFromPromise(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then(
            (value) => new Blob([value], { type: "text/plain" }),
          ),
        }),
      ]);
      return;
    } catch {
      await text;
    }
  }
  await navigator.clipboard.writeText(await text);
}
