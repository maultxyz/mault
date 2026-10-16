import type { BinConfig, BinSet, Result } from "@magic-vault/shared";
import { apiPut, unwrap } from "@/lib/api/client";
import type { BinSaveInput } from "@/lib/interfaces/rules";

export function activateBinSet(guid: string): Promise<BinSet[]> {
  return unwrap(apiPut<Result<BinSet[]>>(`/api/bins/${guid}/active`));
}

export function saveBinConfig({ binNumber, gameGuid, ...body }: BinSaveInput): Promise<BinConfig[]> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  return unwrap(apiPut<Result<BinConfig[]>>(`/api/bins/bins/${binNumber}${params}`, body));
}
