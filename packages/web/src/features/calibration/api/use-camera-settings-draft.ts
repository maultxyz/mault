import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type { CameraSettingsDraft, CameraSettingsValues } from "@/lib/interfaces/calibration";

export function useCameraSettingsDraft(): CameraSettingsDraft {
  const { selectedCameraId, focusDistance, status, selectCamera, applyFocusDistance } = useCameraContext();
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const [isSaving, setIsSaving] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const { watch, setValue, reset, getValues, formState } = useForm<CameraSettingsValues>({
    defaultValues: { cameraId: selectedCameraId ?? "", focusDistance },
  });
  const { isDirty, dirtyFields } = formState;
  const cameraId = watch("cameraId");
  const savedFocus = useRef(focusDistance);
  const savedCamera = useRef(selectedCameraId ?? "");
  const restoreCamera = useRef<(() => Promise<void>) | null>(null);
  const restoreFocus = useRef<(() => Promise<void>) | null>(null);
  const queue = useRef(Promise.resolve());
  const reportFailure = useRef(() => toast.error(t("useCalibrationPage.toasts.saveCalibrationFailed")));
  reportFailure.current = () => toast.error(t("useCalibrationPage.toasts.saveCalibrationFailed"));

  useEffect(() => {
    if (isDirty || restoreFocus.current || restoreCamera.current || status !== "ready") return;
    savedFocus.current = focusDistance;
    savedCamera.current = selectedCameraId ?? "";
    reset({ cameraId: selectedCameraId ?? "", focusDistance });
  }, [selectedCameraId, focusDistance, status, isDirty, reset]);

  useEffect(() => () => {
    if (restoreFocus.current || restoreCamera.current) void queue.current.catch(() => {}).then(async () => {
      await restoreFocus.current?.();
      await restoreCamera.current?.();
    }).catch(() => reportFailure.current());
  }, []);

  const previewFocus = useCallback((value: number | null) => {
    if (!restoreFocus.current) {
      const original = savedFocus.current;
      restoreFocus.current = () => applyFocusDistance(original, false);
    }
    setValue("focusDistance", value, { shouldDirty: true });
    queue.current = queue.current.catch(() => {}).then(async () => {
      await applyFocusDistance(value, false);
      setPreviewFailed(false);
    });
    void queue.current.catch(() => { setPreviewFailed(true); reportFailure.current(); });
  }, [applyFocusDistance, setValue]);

  const setCamera = useCallback((id: string) => {
    const restore = restoreFocus.current;
    if (restore) {
      queue.current = queue.current.catch(() => {}).then(async () => {
        await restore();
        setPreviewFailed(false);
        if (restoreFocus.current === restore) restoreFocus.current = null;
      });
      void queue.current.catch(() => { setPreviewFailed(true); reportFailure.current(); });
    }
    setValue("focusDistance", savedFocus.current, { shouldDirty: true });
    setValue("cameraId", id, { shouldDirty: true });
    if (!restoreCamera.current) {
      const original = savedCamera.current;
      restoreCamera.current = async () => {
        if (original && !(await selectCamera(original))) throw new Error("Camera could not be restored");
      };
    }
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (!(await selectCamera(id, false))) throw new Error("Camera could not be selected");
      setPreviewFailed(false);
    });
    void queue.current.catch(() => { setPreviewFailed(true); reportFailure.current(); });
  }, [setValue, selectCamera]);

  const commit = useCallback(async () => {
    setIsSaving(true);
    try {
      queue.current = queue.current.catch(() => {}).then(async () => {
        const values = getValues();
        if (values.cameraId && (values.cameraId !== savedCamera.current || restoreCamera.current)) {
          await restoreFocus.current?.();
          if (!(await selectCamera(values.cameraId))) throw new Error("Camera could not be selected");
        } else if (dirtyFields.focusDistance || restoreFocus.current) {
          await applyFocusDistance(values.focusDistance, true);
        }
        restoreFocus.current = null;
        restoreCamera.current = null;
        savedCamera.current = values.cameraId;
        setPreviewFailed(false);
        savedFocus.current = values.focusDistance;
        reset(values);
      });
      await queue.current;
    } finally {
      setIsSaving(false);
    }
  }, [getValues, selectCamera, dirtyFields.focusDistance, applyFocusDistance, reset]);

  const discard = useCallback(async () => {
    setIsSaving(true);
    try {
      const restore = restoreFocus.current;
      queue.current = queue.current.catch(() => {}).then(restore ?? (() => Promise.resolve()));
      await queue.current;
      await restoreCamera.current?.();
      if (!restoreCamera.current && status !== "ready" && savedCamera.current && !(await selectCamera(savedCamera.current)))
        throw new Error("Camera could not be restored");
      restoreFocus.current = null;
      restoreCamera.current = null;
      setPreviewFailed(false);
      reset({ cameraId: savedCamera.current, focusDistance: savedFocus.current });
    } finally {
      setIsSaving(false);
    }
  }, [reset, status, selectCamera]);

  return {
    cameraId,
    isCameraChanged: cameraId !== savedCamera.current,
    isDirty: isDirty || previewFailed,
    isSaving,
    setCamera,
    previewFocus,
    commit,
    discard,
  };
}
