import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function shareCsv(csv: string, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: filename,
  });
}
