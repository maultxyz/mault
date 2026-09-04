import { BuildAssembly } from "@/app/routes/build/assembly";
import { BuildBom } from "@/app/routes/build/bom";
import { BuildFooter } from "@/app/routes/build/footer";
import { BuildHero } from "@/app/routes/build/hero";
import { BoardTypeProvider } from "@/app/routes/build/use-board-type";
import { ModuleCountProvider } from "@/app/routes/build/use-module-count";
import { BuildWiring } from "@/app/routes/build/wiring";
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
