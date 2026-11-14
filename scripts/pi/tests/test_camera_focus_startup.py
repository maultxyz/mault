import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


HELPER_PATH = Path(__file__).resolve().parents[1] / "camera-ctl.py"
SPEC = importlib.util.spec_from_file_location("camera_focus_startup", HELPER_PATH)
CAMERA_HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CAMERA_HELPER)


class CameraFocusStartupTests(unittest.TestCase):
    def test_start_restores_physical_manual_focus_despite_stale_driver_cache(self):
        for saved_position in (1, 387, 831):
            with self.subTest(saved_position=saved_position), tempfile.TemporaryDirectory() as directory:
                state_path = Path(directory) / "focus.json"
                state_path.write_text(json.dumps({"mode": "manual", "lensPosition": saved_position}))
                device = {"auto": True, "cached": 100, "physical": 100}
                writes = []

                def run_control(arguments, **kwargs):
                    if arguments[-1].startswith("--get-ctrl="):
                        return SimpleNamespace(returncode=0, stdout=(
                            f"focus_automatic_continuous: {int(device['auto'])}\n"
                            f"focus_absolute: {device['cached']}\n"
                        ))
                    control = arguments[-1]
                    writes.append(control)
                    name, value = control.split("=")
                    value = int(value)
                    if name == "focus_automatic_continuous":
                        device["auto"] = bool(value)
                        device["cached"] = saved_position
                    else:
                        self.assertFalse(device["auto"])
                        self.assertGreaterEqual(value, 1)
                        self.assertLessEqual(value, 831)
                        if value != device["cached"]:
                            device["physical"] = value
                        device["cached"] = value
                    return SimpleNamespace(returncode=0, stdout="", stderr="")

                def finish_camera_startup(seconds):
                    self.assertEqual(seconds, CAMERA_HELPER.FOCUS_STARTUP_SETTLE_S)
                    self.assertEqual(device["physical"], saved_position)
                    device["physical"] = 100
                    device["cached"] = saved_position

                camera = CAMERA_HELPER.Camera()
                process = SimpleNamespace(poll=lambda: None)
                with (
                    patch.object(CAMERA_HELPER, "FOCUS_STATE_PATH", state_path),
                    patch.object(CAMERA_HELPER, "find_webcam", return_value="/dev/video-test"),
                    patch.object(CAMERA_HELPER, "device_label", return_value="Test webcam"),
                    patch.object(CAMERA_HELPER, "read_focus_range", return_value={"min": 1, "max": 831, "step": 1}),
                    patch.object(CAMERA_HELPER.subprocess, "Popen", return_value=process),
                    patch.object(CAMERA_HELPER.subprocess, "run", side_effect=run_control),
                    patch.object(CAMERA_HELPER.time, "sleep", side_effect=finish_camera_startup) as settle,
                    patch.object(camera, "_pump", side_effect=lambda proc: camera.buffer.publish(b"frame")),
                ):
                    camera.start()

                self.assertTrue(camera.healthy())
                settle.assert_called_once()
                self.assertEqual(device["physical"], saved_position)
                self.assertEqual(json.loads(state_path.read_text()), {
                    "mode": "manual", "lensPosition": saved_position,
                })
                adjacent = saved_position + 1 if saved_position < 831 else saved_position - 1
                self.assertEqual(writes, [
                    "focus_automatic_continuous=0",
                    f"focus_absolute={adjacent}",
                    f"focus_absolute={saved_position}",
                ] * 2)

    def test_startup_auto_focus_is_not_replaced_with_manual_focus(self):
        with tempfile.TemporaryDirectory() as directory:
            state_path = Path(directory) / "focus.json"
            state_path.write_text(json.dumps({"mode": "auto", "lensPosition": None}))
            camera = CAMERA_HELPER.Camera()
            camera.device = "/dev/video-test"
            with (
                patch.object(CAMERA_HELPER, "FOCUS_STATE_PATH", state_path),
                patch.object(camera, "healthy", return_value=True),
                patch.object(camera, "_set_control") as control,
                patch.object(CAMERA_HELPER.time, "sleep") as settle,
            ):
                camera.restore_focus()
            control.assert_called_once_with("focus_automatic_continuous=1")
            settle.assert_not_called()


if __name__ == "__main__":
    unittest.main()
