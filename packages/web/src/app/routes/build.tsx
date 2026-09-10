import { BuildAssembly } from "@/features/build/components/assembly";
import { BuildBom } from "@/features/build/components/bom";
import { BuildFooter } from "@/features/build/components/footer";
import { BuildHero } from "@/features/build/components/hero";
import { BoardTypeProvider } from "@/features/build/api/use-board-type";
import { ModuleCountProvider } from "@/features/build/api/use-module-count";
import { BuildWiring } from "@/features/build/components/wiring";
import { PublicGlow } from "@/components/public-glow";
import { PublicNav } from "@/components/public-nav";

export default function BuildGuidePage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <PublicGlow />
      <PublicNav containerClassName="max-w-4xl" />
      <main className="flex-1">
        <BoardTypeProvider>
          <ModuleCountProvider>
            <BuildHero />
            <BuildBom />
            <BuildWiring />
            <BuildAssembly />
          </ModuleCountProvider>
        </BoardTypeProvider>
      </main>
      <BuildFooter />
    </div>
  );
}
