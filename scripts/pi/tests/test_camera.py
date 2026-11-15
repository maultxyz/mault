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


class CameraFrameTimingTests(unittest.TestCase):
    def test_pump_consumes_available_bytes_without_waiting_for_64k(self):
        import io

        class Stream(io.BytesIO):
            def read(self, *args):
                raise AssertionError('read can wait to fill the requested size')

        class Process:
            stdout = Stream(b'\xff\xd8tiny jpeg\xff\xd9')

            def poll(self):
                return 0

        camera = CAMERA_HELPER.Camera()
        camera.proc = Process()
        camera._pump(camera.proc)
        self.assertEqual(camera.buffer.frame, b'\xff\xd8tiny jpeg\xff\xd9')
        self.assertEqual(camera.buffer.sequence, 1)

    def test_fresh_request_waits_for_next_publication(self):
        import threading
        camera = CAMERA_HELPER.Camera()
        camera.buffer.publish(b'old')
        handler = CAMERA_HELPER.Handler.__new__(CAMERA_HELPER.Handler)
        handler.path = '/frame?fresh=1'
        handler.headers = {'Host': '127.0.0.1:8765'}
        replies = []
        handler._send = lambda *reply: replies.append(reply)
        timer = threading.Timer(0.05, lambda: camera.buffer.publish(b'new'))
        with patch.object(CAMERA_HELPER, 'CAMERA', camera), patch.object(camera, 'healthy', return_value=True):
            timer.start()
            try:
                handler.do_GET()
            finally:
                timer.join()
        self.assertEqual(replies, [(200, b'new', 'image/jpeg')])

    def test_fresh_request_does_not_return_old_frame_on_timeout(self):
        camera = CAMERA_HELPER.Camera()
        camera.buffer.publish(b'old')
        handler = CAMERA_HELPER.Handler.__new__(CAMERA_HELPER.Handler)
        handler.path = '/frame?fresh=1'
        handler.headers = {'Host': '127.0.0.1:8765'}
        replies = []
        handler._send = lambda *reply: replies.append(reply)
        with patch.object(CAMERA_HELPER, 'CAMERA', camera), patch.object(
            camera.buffer.condition, 'wait_for', return_value=False
        ):
            handler.do_GET()
        self.assertEqual(replies[0][0], 503)


    def test_rejects_requests_for_other_host_names(self):
        handler = CAMERA_HELPER.Handler.__new__(CAMERA_HELPER.Handler)
        handler.path = '/frame'
        handler.headers = {'Host': 'attacker.example:8765'}
        replies = []
        handler._send = lambda *reply: replies.append(reply)
        handler.do_GET()
        handler.do_POST()
        self.assertEqual([reply[0] for reply in replies], [403, 403])


class CameraFocusTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        state = patch.object(CAMERA_HELPER, "FOCUS_STATE_PATH", Path(temp.name) / "focus.json")
        state.start()
        self.addCleanup(state.stop)
        from types import SimpleNamespace
        controls = patch.object(CAMERA_HELPER.subprocess, "run", return_value=SimpleNamespace(
            returncode=0, stdout="focus_automatic_continuous: 0\nfocus_absolute: 0\n"
        ))
        controls.start()
        self.addCleanup(controls.stop)

    def test_saved_manual_focus_is_restored_after_restart(self):
        first = CAMERA_HELPER.Camera()
        first.device = "/dev/video0"
        with patch.object(first, "healthy", return_value=True), patch.object(first, "_set_control"):
            first.set_focus("manual", 123)
        second = CAMERA_HELPER.Camera()
        second.device = "/dev/video0"
        with patch.object(second, "healthy", return_value=True), patch.object(second, "_set_control") as control, patch.object(CAMERA_HELPER.time, "sleep"):
            second.restore_focus()
        self.assertEqual([call.args[0] for call in control.call_args_list], [
            "focus_automatic_continuous=0", "focus_absolute=123"
        ] * 2)

    def test_health_reads_actual_hardware_focus_mode(self):
        from types import SimpleNamespace
        camera = CAMERA_HELPER.Camera()
        camera.device = "/dev/video0"
        with patch.object(CAMERA_HELPER.subprocess, "run", return_value=SimpleNamespace(
            returncode=0, stdout="focus_automatic_continuous: 0\nfocus_absolute: 123\n"
        )):
            self.assertEqual(camera.focus_settings(), {
                "focusMode": "manual", "lensPosition": 123
            })

    def test_failed_focus_write_does_not_persist_new_setting(self):
        camera = CAMERA_HELPER.Camera()
        camera.device = "/dev/video0"
        with patch.object(camera, "healthy", return_value=True), patch.object(
            camera, "_set_control", side_effect=RuntimeError("driver rejected")
        ):
            with self.assertRaises(RuntimeError):
                camera.set_focus("manual", 123)
        self.assertFalse(CAMERA_HELPER.FOCUS_STATE_PATH.exists())

    def test_manual_focus_disables_auto_in_separate_control_write(self):
        camera = CAMERA_HELPER.Camera()
        camera.device = "/dev/video0"
        with patch.object(camera, "healthy", return_value=True), patch.object(
            camera, "_set_control"
        ) as control:
            camera.set_focus("manual", 123)
        self.assertEqual([call.args[0] for call in control.call_args_list], [
            "focus_automatic_continuous=0", "focus_absolute=123"
        ])

    def test_repeated_manual_value_is_forced_after_autofocus(self):
        camera = CAMERA_HELPER.Camera()
        camera.device = "/dev/video0"
        camera.focus = {"min": 1, "max": 831, "step": 1}
        with patch.object(camera, "healthy", return_value=True), patch.object(
            camera, "focus_settings", return_value={"focusMode": "auto", "lensPosition": 387}
        ), patch.object(camera, "_set_control") as control:
            camera.set_focus("manual", 387)
        self.assertEqual([call.args[0] for call in control.call_args_list], [
            "focus_automatic_continuous=0", "focus_absolute=388", "focus_absolute=387"
        ])

    def test_reapply_stays_within_focus_range_at_maximum(self):
        camera = CAMERA_HELPER.Camera()
        camera.focus = {"min": 1, "max": 831, "step": 1}
        with patch.object(camera, "_set_control") as control:
            camera._write_manual_position(831, 831)
        self.assertEqual([call.args[0] for call in control.call_args_list], [
            "focus_absolute=830", "focus_absolute=831"
        ])

    def test_lock_disables_autofocus_before_reading_actual_position(self):
        from types import SimpleNamespace
        camera = CAMERA_HELPER.Camera()
        camera.device = "/dev/video0"
        camera.focus = {"min": 1, "max": 831, "step": 1}
        events = []
        def read_position(*args, **kwargs):
            events.append("read")
            self.assertEqual(args[0][-1], "--get-ctrl=focus_absolute")
            return SimpleNamespace(returncode=0, stdout="focus_absolute: 37\n")
        with patch.object(camera, "healthy", return_value=True), patch.object(
            camera, "_set_control", side_effect=events.append
        ), patch.object(CAMERA_HELPER.subprocess, "run", side_effect=read_position):
            self.assertEqual(camera.set_focus("lock", None), 37)
        self.assertEqual(events, ["focus_automatic_continuous=0", "read",
                                  "focus_absolute=38", "focus_absolute=37"])

    def test_lock_endpoint_returns_position_for_browser_to_save(self):
        import io
        import json
        handler = CAMERA_HELPER.Handler.__new__(CAMERA_HELPER.Handler)
        body = b'{"mode":"lock"}'
        handler.path = "/focus"
        handler.headers = {"Content-Length": str(len(body)), "Host": "127.0.0.1:8765"}
        handler.rfile = io.BytesIO(body)
        replies = []
        handler._send = lambda *reply: replies.append(reply)
        with patch.object(CAMERA_HELPER.CAMERA, "set_focus", return_value=37) as focus:
            handler.do_POST()
        focus.assert_called_once_with("lock", None)
        self.assertEqual(replies[0][0], 200)
        self.assertEqual(json.loads(replies[0][1]), {"lensPosition": 37})

    def test_lock_does_not_invent_position_when_read_fails(self):
        from types import SimpleNamespace
        camera = CAMERA_HELPER.Camera()
        camera.device = "/dev/video0"
        with patch.object(camera, "healthy", return_value=True), patch.object(
            camera, "_set_control"
        ), patch.object(CAMERA_HELPER.subprocess, "run", return_value=SimpleNamespace(
            returncode=1, stdout=""
        )):
            with self.assertRaisesRegex(RuntimeError, "could not read"):
                camera.set_focus("lock", None)


class CameraZoomTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        state = patch.object(CAMERA_HELPER, "ZOOM_STATE_PATH", Path(temp.name) / "zoom.json")
        state.start()
        self.addCleanup(state.stop)

    def camera_with_zoom(self):
        camera = CAMERA_HELPER.Camera()
        camera.device = "/dev/video0"
        camera.zoom = {"min": 100, "max": 500, "step": 1}
        return camera

    def test_zoom_range_reads_only_zoom_absolute(self):
        from types import SimpleNamespace
        listing = (
            "  zoom_absolute_extra 0x1 (int) : min=0 max=9 step=1\n"
            "  zoom_absolute 0x009a090d (int) : min=100 max=500 step=1 default=100 value=100\n"
        )
        with patch.object(CAMERA_HELPER.subprocess, "run", return_value=SimpleNamespace(
            returncode=0, stdout=listing
        )):
            self.assertEqual(CAMERA_HELPER.read_zoom_range("/dev/video0"), {
                "min": 100, "max": 500, "step": 1
            })

    def test_saved_zoom_is_restored_after_restart(self):
        first = self.camera_with_zoom()
        with patch.object(first, "healthy", return_value=True), patch.object(first, "_set_control"):
            self.assertEqual(first.set_zoom(240.4), 240)
        second = self.camera_with_zoom()
        with patch.object(second, "healthy", return_value=True), patch.object(second, "_set_control") as control:
            second.restore_zoom()
        control.assert_called_once_with("zoom_absolute=240")

    def test_zoom_outside_range_is_rejected_without_writing(self):
        camera = self.camera_with_zoom()
        with patch.object(camera, "healthy", return_value=True), patch.object(camera, "_set_control") as control:
            with self.assertRaises(ValueError):
                camera.set_zoom(900)
        control.assert_not_called()
        self.assertFalse(CAMERA_HELPER.ZOOM_STATE_PATH.exists())

    def test_zoom_endpoint_returns_applied_level(self):
        import io
        import json
        handler = CAMERA_HELPER.Handler.__new__(CAMERA_HELPER.Handler)
        body = b'{"zoomLevel":240}'
        handler.path = "/zoom"
        handler.headers = {"Content-Length": str(len(body)), "Host": "127.0.0.1:8765"}
        handler.rfile = io.BytesIO(body)
        replies = []
        handler._send = lambda *reply: replies.append(reply)
        with patch.object(CAMERA_HELPER.CAMERA, "set_zoom", return_value=240) as zoom:
            handler.do_POST()
        zoom.assert_called_once_with(240.0)
        self.assertEqual(replies[0][0], 200)
        self.assertEqual(json.loads(replies[0][1]), {"zoomLevel": 240})


if __name__ == "__main__":
    unittest.main()


class CameraFocusPreviewTests(unittest.TestCase):
    def test_focus_preview_leaves_saved_focus_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            saved = Path(directory) / "focus.json"
            original = b'{"mode":"manual","lensPosition":37}'
            saved.write_bytes(original)
            camera = CAMERA_HELPER.Camera()
            camera.focus_state_path = saved
            with patch.object(camera, "_apply_focus", return_value=45) as apply:
                self.assertEqual(camera.set_focus("manual", 45, persist=False), 45)
                apply.assert_called_once_with("manual", 45)
            self.assertEqual(saved.read_bytes(), original)

    def test_focus_preview_endpoint_passes_nonpersistent_mode(self):
        import io
        handler = CAMERA_HELPER.Handler.__new__(CAMERA_HELPER.Handler)
        body = b'{"mode":"manual","lensPosition":45,"persist":false}'
        handler.path = "/focus"
        handler.headers = {"Host": "127.0.0.1:8765", "Content-Length": str(len(body))}
        handler.rfile = io.BytesIO(body)
        handler._send = lambda *reply: None
        with patch.object(CAMERA_HELPER.CAMERA, "set_focus", return_value=45) as focus:
            handler.do_POST()
        focus.assert_called_once_with("manual", 45.0, persist=False)


class CameraSelectedZoomTests(unittest.TestCase):
    def test_zoom_endpoint_uses_selected_camera(self):
        import io
        from unittest.mock import Mock
        handler = CAMERA_HELPER.Handler.__new__(CAMERA_HELPER.Handler)
        body = b'{"zoomLevel":240}'
        handler.path = "/zoom?cameraId=%2Fdev%2Fcamera-b"
        handler.headers = {"Host": "127.0.0.1:8765", "Content-Length": str(len(body))}
        handler.rfile = io.BytesIO(body)
        handler._send = Mock()
        selected = Mock()
        selected.set_zoom.return_value = 240
        with patch.object(CAMERA_HELPER, "selected_camera", return_value=selected) as choose, patch.object(CAMERA_HELPER.CAMERA, "set_zoom") as original:
            handler.do_POST()
        choose.assert_called_once_with("/dev/camera-b")
        selected.set_zoom.assert_called_once_with(240.0)
        original.assert_not_called()
        self.assertEqual(handler._send.call_args.args[0], 200)

    def test_secondary_camera_zoom_does_not_overwrite_default_camera(self):
        with tempfile.TemporaryDirectory() as temporary:
            default = Path(temporary) / "camera-zoom.json"
            default.write_text('{"zoomLevel":100}')
            second = CAMERA_HELPER.Camera()
            second.device = "/dev/camera-b"
            second.zoom = {"min": 100, "max": 500, "step": 1}
            second.zoom_state_path = Path(temporary) / "camera-zoom-b.json"
            with patch.object(CAMERA_HELPER, "ZOOM_STATE_PATH", default), patch.object(second, "healthy", return_value=True), patch.object(second, "_set_control"):
                second.set_zoom(240)
            self.assertEqual(default.read_text(), '{"zoomLevel":100}')
            import json
            self.assertEqual(json.loads(second.zoom_state_path.read_text()), {"zoomLevel": 240})
