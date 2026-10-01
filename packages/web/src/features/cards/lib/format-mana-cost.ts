export function formatManaCost(manaCost: string): string {
  return manaCost.replace(/[{}]/g, " ").trim().replace(/\s+/g, " ");
}
