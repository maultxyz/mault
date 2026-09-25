import { BuildAssembly } from "@/features/build/components/assembly";
import { BuildBom } from "@/features/build/components/bom";
import { BuildFooter } from "@/features/build/components/footer";
import { BuildHero } from "@/features/build/components/hero";
import { BoardTypeProvider } from "@/features/build/api/use-board-type";
import { Esp32MountTypeProvider } from "@/features/build/api/use-esp32-mount-type";
import { KitModeProvider } from "@/features/build/api/use-kit-mode";
import { ModuleCountProvider } from "@/features/build/api/use-module-count";
import { BuildWiring } from "@/features/build/components/wiring";
import { PublicAnnouncementBanner } from "@/components/public-announcement-banner";
import { PublicGlow } from "@/components/public-glow";
import { PublicNav } from "@/components/public-nav";

export default function BuildGuidePage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <PublicGlow />
      <PublicAnnouncementBanner />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <KitModeProvider>
          <BoardTypeProvider>
            <ModuleCountProvider>
              <Esp32MountTypeProvider>
                <BuildHero />
                <BuildBom />
                <BuildWiring />
                <BuildAssembly />
              </Esp32MountTypeProvider>
            </ModuleCountProvider>
          </BoardTypeProvider>
        </KitModeProvider>
      </main>
      <BuildFooter />
    </div>
  );
}
