import * as Crypto from "expo-crypto";
import { Directory, File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { WIDGET_CARD_IMAGES_DIRECTORY } from "@/lib/constants/widgets";

async function imageFileName(url: string): Promise<string> {
  return `${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, url)}.img`;
}

async function downloadImage(url: string, file: File): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) return;
  const bytes = new Uint8Array(await response.arrayBuffer());
  file.create({ overwrite: true });
  file.write(bytes);
}

export async function cacheWidgetCardImages(imageUrls: string[]): Promise<Map<string, string>> {
  const fileUrisByImageUrl = new Map<string, string>();
  if (!widgetsDirectory) return fileUrisByImageUrl;
  const directory = new Directory(widgetsDirectory, WIDGET_CARD_IMAGES_DIRECTORY);
  if (!directory.exists) directory.create({ intermediates: true });
  const keptFileNames = new Set<string>();
  await Promise.all(
    [...new Set(imageUrls)].map(async (url) => {
      const fileName = await imageFileName(url);
      keptFileNames.add(fileName);
      const file = new File(directory, fileName);
      if (!file.exists) await downloadImage(url, file).catch(() => undefined);
      if (file.exists) fileUrisByImageUrl.set(url, file.uri);
    }),
  );
  for (const entry of directory.list()) {
    if (entry instanceof File && !keptFileNames.has(entry.name)) entry.delete();
  }
  return fileUrisByImageUrl;
}
