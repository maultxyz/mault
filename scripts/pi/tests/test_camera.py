import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


HELPER_PATH = Path(__file__).resolve().parents[1] / "camera-ctl.py"
SPEC = importlib.util.spec_from_file_location("camera_ctl", HELPER_PATH)
CAMERA_HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CAMERA_HELPER)


class CameraDiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.nodes = []
        environment = patch.dict(os.environ, {"WEBCAM_DEVICE": ""})
        environment.start()
        self.addCleanup(environment.stop)
        devices = patch.object(CAMERA_HELPER.glob, "glob", return_value=self.nodes)
        devices.start()
        self.addCleanup(devices.stop)

    def add_device(self, number, name, usb, index=0):
        parent = self.root / f"device{number}"
        node = parent / "video4linux" / f"video{number}"
        node.mkdir(parents=True)
        (parent / "subsystem").symlink_to("/sys/bus/usb" if usb else "/sys/bus/platform")
        (node / "name").write_text(name)
        (node / "index").write_text(str(index))
        link = self.root / f"video{number}"
        link.symlink_to(node)
        self.nodes.append(str(link))

    def test_usb_camera_without_usb_in_name_is_detected(self):
        self.add_device(0, "Arducam-219-8MP-HDR", usb=True)
        self.add_device(1, "Arducam-219-8MP-HDR", usb=True, index=1)
        self.assertEqual(CAMERA_HELPER.find_webcam(), "/dev/video0")

    def test_platform_devices_are_skipped_even_with_usb_in_name(self):
        self.add_device(0, "USB platform device", usb=False)
        self.add_device(2, "USB Camera", usb=True)
        self.assertEqual(CAMERA_HELPER.find_webcam(), "/dev/video2")

    def test_metadata_node_is_not_selected(self):
        self.add_device(1, "USB Camera", usb=True, index=1)
        with self.assertRaisesRegex(RuntimeError, "no USB webcam found"):
            CAMERA_HELPER.find_webcam()

    def test_explicit_device_override_is_preserved(self):
        with patch.dict(os.environ, {"WEBCAM_DEVICE": "/dev/video4"}):
            self.assertEqual(CAMERA_HELPER.find_webcam(), "/dev/video4")


if __name__ == "__main__":
    unittest.main()
