import type {
  BinConfig,
  BinSet,
  EmptyAllBinsInput,
  PickListFoundInput,
  PickListFoundResult,
  Result,
  ScanOnlyConfig,
} from "@magic-vault/shared";
import { apiPost, apiPut, unwrap } from "@/lib/api/client";
import type { AlphabetConfigInput, BinSaveInput, ChaosConfigInput, RepackConfigInput } from "@/lib/interfaces/rules";

export function activateBinSet(guid: string): Promise<BinSet[]> {
  return unwrap(apiPut<Result<BinSet[]>>(`/api/bins/${guid}/active`));
}

export function markPickListFound(binGuid: string, input: PickListFoundInput): Promise<PickListFoundResult> {
  return unwrap(apiPost<Result<PickListFoundResult>>(`/api/bins/bins/${binGuid}/pick-list/found`, input));
}

export function emptyBins(binNumbers: number[], gameGuid: string | undefined): Promise<BinSet[]> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  const input: EmptyAllBinsInput = { binNumbers };
  return unwrap(apiPost<Result<BinSet[]>>(`/api/bins/bins/empty-all${params}`, input));
}

export function saveBinConfig({ binNumber, gameGuid, ...body }: BinSaveInput): Promise<BinConfig[]> {
  const params = gameGuid ? `?${new URLSearchParams({ gameGuid })}` : "";
  return unwrap(apiPut<Result<BinConfig[]>>(`/api/bins/bins/${binNumber}${params}`, body));
}

export function setScanOnly(guid: string, config: ScanOnlyConfig): Promise<BinSet[]> {
  return unwrap(apiPut<Result<BinSet[]>>(`/api/bins/${guid}/scan-only`, config));
}

export function setAutoAssignField(guid: string, field: string | null): Promise<BinSet[]> {
  return unwrap(apiPut<Result<BinSet[]>>(`/api/bins/${guid}/auto-assign`, { field }));
}

export function resetAutoAssign(guid: string): Promise<BinSet[]> {
  return unwrap(apiPost<Result<BinSet[]>>(`/api/bins/${guid}/auto-assign/reset`));
}

export function setRepackConfig(guid: string, config: RepackConfigInput): Promise<BinSet[]> {
  return unwrap(apiPut<Result<BinSet[]>>(`/api/bins/${guid}/repack`, config));
}

export function setAlphabetConfig(guid: string, { isAlphabetMode, pass, prefix }: AlphabetConfigInput): Promise<BinSet[]> {
  return unwrap(
    apiPut<Result<BinSet[]>>(`/api/bins/${guid}/alphabet`, { isAlphabetMode, alphabetPass: pass, alphabetPrefix: prefix }),
  );
}

export function setChaosMode(guid: string, config: ChaosConfigInput): Promise<BinSet[]> {
  return unwrap(apiPut<Result<BinSet[]>>(`/api/bins/${guid}/chaos`, config));
}

export function setSkipSaving(guid: string, skipSaving: boolean): Promise<BinSet[]> {
  return unwrap(apiPut<Result<BinSet[]>>(`/api/bins/${guid}/skip-saving`, { skipSaving }));
}
