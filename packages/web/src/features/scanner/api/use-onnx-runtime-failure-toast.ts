import { useOnnxRuntimeFailure } from "@/features/scanner/lib/onnx-runtime";
import { ONNX_RUNTIME_FAILURE_TOAST_ID } from "@/lib/constants/scanner";
import { toast } from "@/lib/toast";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useOnnxRuntimeFailureToast() {
  const { t } = useTranslation("scanner");
  const failure = useOnnxRuntimeFailure();

  useEffect(() => {
    if (!failure) return;
    toast.warning(t("onnxRuntimeFailure.title"), {
      id: ONNX_RUNTIME_FAILURE_TOAST_ID,
      description: t("onnxRuntimeFailure.description"),
      duration: Infinity,
      action: {
        label: t("onnxRuntimeFailure.reload"),
        onClick: () => window.location.reload(),
      },
    });
  }, [failure, t]);
}
