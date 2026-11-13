import { Asset } from "expo-asset";
import { Directory, File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { WIDGET_LOGO_ASSETS } from "@/lib/constants/widget-logo";
import { EMPTY_WIDGET_LOGO, WIDGET_LOGO_DIRECTORY } from "@/lib/constants/widgets";
import type { WidgetLogo } from "@/lib/interfaces/widgets";

async function copyLogo(moduleId: number, fileName: string, directory: Directory): Promise<string> {
  const target = new File(directory, fileName);
  if (target.exists) return target.uri;
  const [asset] = await Asset.loadAsync(moduleId);
  if (!asset.localUri) return "";
  new File(asset.localUri).copy(target);
  return target.uri;
}

export async function cacheWidgetLogo(): Promise<WidgetLogo> {
  if (!widgetsDirectory) return EMPTY_WIDGET_LOGO;
  const directory = new Directory(widgetsDirectory, WIDGET_LOGO_DIRECTORY);
  if (!directory.exists) directory.create({ intermediates: true });
  const [light, dark] = await Promise.all([
    copyLogo(WIDGET_LOGO_ASSETS.light, "logo-light.png", directory),
    copyLogo(WIDGET_LOGO_ASSETS.dark, "logo-dark.png", directory),
  ]);
  return { light, dark };
}
