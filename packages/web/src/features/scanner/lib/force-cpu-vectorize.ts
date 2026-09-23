import { useExecutionProviderPreference } from "@/features/scanner/lib/onnx-runtime";

export function useForceCpuVectorize() {
  const [preference, setPreference] = useExecutionProviderPreference();
  const setForceCpu = (value: boolean) =>
    setPreference(value ? "wasm" : "auto");
  return [preference === "wasm", setForceCpu] as const;
}
