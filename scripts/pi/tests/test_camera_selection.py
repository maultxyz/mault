import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("camera_selection", Path(__file__).resolve().parents[1] / "camera-ctl.py")
HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPER)


class CameraSelectionTests(unittest.TestCase):
    def setUp(self):
        HELPER.CAMERAS.clear()

    def test_unknown_camera_does_not_open_or_fall_back(self):
        with patch.object(HELPER, "find_webcams", return_value=["/dev/video-test-a"]), patch.object(HELPER.Camera, "start") as start:
            with self.assertRaisesRegex(ValueError, "not connected"):
                HELPER.selected_camera("/dev/video-test-b")
            start.assert_not_called()
            self.assertIs(HELPER.selected_camera(None), HELPER.CAMERA)

    def test_distinct_cameras_keep_buffers_and_focus_separate(self):
        with patch.object(HELPER, "find_webcams", return_value=["/dev/video-test-a", "/dev/video-test-b"]), patch.object(HELPER.Camera, "start") as start, patch.object(HELPER.Camera, "healthy", return_value=True):
            first = HELPER.selected_camera("/dev/video-test-a")
            second = HELPER.selected_camera("/dev/video-test-b")
            self.assertIsNot(first, second)
            self.assertIsNot(first.buffer, second.buffer)
            self.assertNotEqual(first.focus_state_path, second.focus_state_path)
            self.assertIs(HELPER.selected_camera("/dev/video-test-a"), first)
            self.assertEqual(start.call_count, 0)

    def test_selecting_default_by_device_does_not_open_it_twice(self):
        with patch.object(HELPER, "find_webcams", return_value=["/dev/video-test-a"]), patch.object(HELPER.CAMERA, "device", "/dev/video-test-a"), patch.object(HELPER.Camera, "start") as start, patch.object(HELPER.CAMERA, "healthy", return_value=True):
            self.assertIs(HELPER.selected_camera("/dev/video-test-a"), HELPER.CAMERA)
            start.assert_not_called()

    def test_initial_open_receives_selected_device_and_reuses_healthy_process(self):
        with patch.object(HELPER, "find_webcams", return_value=["/dev/video-test-a"]), patch.object(HELPER.Camera, "start") as start, patch.object(HELPER.Camera, "healthy", side_effect=[False, True]):
            first = HELPER.selected_camera("/dev/video-test-a")
            self.assertIs(HELPER.selected_camera("/dev/video-test-a"), first)
            start.assert_called_once_with("/dev/video-test-a")
