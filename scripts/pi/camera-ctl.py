#!/usr/bin/env python3
"""Serve the USB webcam plugged into the Pi to every browser on the network.

One process owns the webcam. Browsers, including one on another computer,
read a JPEG stream from this helper instead of their own camera.
"""

from __future__ import annotations

import hashlib
import glob
import json
import os
import re
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

HOST = "127.0.0.1"
LOOPBACK_HOST_NAMES = frozenset({"127.0.0.1", "localhost"})
PORT = 8765
SIZES = ((1920, 1080), (1280, 720), (640, 480))
FRAME_INTERVAL_S = 0.1
FOCUS_STARTUP_SETTLE_S = 2
FOCUS_STATE_PATH = Path.home() / ".local/state/mault/camera-focus.json"
ZOOM_STATE_PATH = Path.home() / ".local/state/mault/camera-zoom.json"


class JpegBuffer:
    def __init__(self) -> None:
        self.frame: bytes | None = None
        self.sequence = 0
        self.condition = threading.Condition()

    def publish(self, frame: bytes) -> None:
        with self.condition:
            self.frame = frame
            self.sequence += 1
            self.condition.notify_all()


def device_label(device: str) -> str:
    name_path = f"/sys/class/video4linux/{os.path.basename(os.path.realpath(device))}/name"
    try:
        raw = open(name_path, encoding="utf-8").read().strip()
    except OSError:
        return "USB webcam"
    head = raw.split(":", 1)[0]
    return " ".join(head.split()) or "USB webcam"


def find_webcams() -> list[str]:
    aliases = {}
    for path in sorted(glob.glob("/dev/v4l/by-id/*-video-index0")):
        aliases.setdefault(os.path.realpath(path), path)
    matches = []
    for node in sorted(glob.glob("/sys/class/video4linux/video*")):
        try:
            index = (Path(node) / "index").read_text(encoding="utf-8").strip()
        except OSError:
            continue
        if index != "0" or not any(
            (parent / "subsystem").resolve() == Path("/sys/bus/usb")
            for parent in Path(node).resolve().parents
        ):
            continue
        device = "/dev/" + os.path.basename(node)
        matches.append(aliases.get(os.path.realpath(device), device))
    override = os.environ.get("WEBCAM_DEVICE", "").strip()
    if override and not any(os.path.realpath(device) == os.path.realpath(override) for device in matches):
        matches.insert(0, override)
    return matches


def find_webcam() -> str:
    override = os.environ.get("WEBCAM_DEVICE", "").strip()
    matches = find_webcams()
    if override:
        return override
    if not matches:
        raise RuntimeError("no USB webcam found")
    return matches[0]


def read_control_range(device: str, control: str) -> dict[str, int] | None:
    proc = subprocess.run(
        ["v4l2-ctl", "-d", device, "--list-ctrls"],
        capture_output=True,
        text=True,
        check=False,
    )
    for line in proc.stdout.splitlines():
        if not re.match(rf"\s*{control}\b", line):
            continue

        def grab(key: str) -> int | None:
            match = re.search(rf"{key}=(-?\d+)", line)
            return int(match.group(1)) if match else None

        minimum, maximum, step = grab("min"), grab("max"), grab("step")
        if minimum is None or maximum is None:
            return None
        if maximum <= minimum:
            return None
        return {"min": minimum, "max": maximum, "step": step or 1}
    return None


def read_focus_range(device: str) -> dict[str, int] | None:
    return read_control_range(device, "focus_absolute")


def read_zoom_range(device: str) -> dict[str, int] | None:
    return read_control_range(device, "zoom_absolute")


class Camera:
    def __init__(self) -> None:
        self.focus_state_path: Path | None = None
        self.zoom_state_path: Path | None = None
        self.buffer = JpegBuffer()
        self.error: str | None = None
        self.device: str | None = None
        self.label = "USB webcam"
        self.width = SIZES[0][0]
        self.height = SIZES[0][1]
        self.focus: dict[str, int] | None = None
        self.zoom: dict[str, int] | None = None
        self.proc: subprocess.Popen[bytes] | None = None
        self.focus_lock = threading.RLock()

    def healthy(self) -> bool:
        return (
            self.buffer.frame is not None
            and self.proc is not None
            and self.proc.poll() is None
        )

    def start(self, device: str | None = None) -> None:
        self.device = device or find_webcam()
        self.label = device_label(self.device)
        self.focus = read_focus_range(self.device)
        self.zoom = read_zoom_range(self.device)
        last_error = "webcam produced no frames"
        for width, height in SIZES:
            self._stop_proc()
            self.buffer.frame = None
            self.width = width
            self.height = height
            self.proc = subprocess.Popen(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-fflags",
                    "nobuffer",
                    "-flags",
                    "low_delay",
                    "-f",
                    "v4l2",
                    "-input_format",
                    "mjpeg",
                    "-framerate",
                    "30",
                    "-video_size",
                    f"{width}x{height}",
                    "-i",
                    self.device,
                    "-r",
                    "10",
                    "-c:v",
                    "mjpeg",
                    "-q:v",
                    "5",
                    "-bsf:v",
                    "mjpeg2jpeg",
                    "-f",
                    "mjpeg",
                    "-",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
            )
            threading.Thread(target=self._pump, args=(self.proc,), daemon=True).start()
            with self.buffer.condition:
                if self.buffer.frame is None:
                    self.buffer.condition.wait(timeout=8)
            if self.buffer.frame is not None and self.proc.poll() is None:
                self.restore_zoom()
                self.restore_focus()
                return
            last_error = self.error or f"no frames at {width}x{height}"
        self._stop_proc()
        self.error = last_error
        raise RuntimeError(last_error)

    def _pump(self, proc: subprocess.Popen[bytes]) -> None:
        stream = proc.stdout
        if stream is None:
            return
        data = bytearray()
        try:
            while True:
                # BufferedReader.read may wait to fill 64 KiB, delaying a
                # small JPEG until later frames arrive. Consume available bytes.
                chunk = stream.read1(65536)
                if not chunk:
                    break
                data.extend(chunk)
                while True:
                    start = data.find(b"\xff\xd8")
                    if start < 0:
                        if len(data) > 1:
                            del data[:-1]
                        break
                    end = data.find(b"\xff\xd9", start + 2)
                    if end < 0:
                        if start > 0:
                            del data[:start]
                        break
                    if self.proc is proc:
                        self.buffer.publish(bytes(data[start : end + 2]))
                    del data[: end + 2]
        finally:
            code = proc.poll()
            if code not in (None, 0) and self.proc is proc:
                self.error = f"webcam exited ({code})"
            with self.buffer.condition:
                self.buffer.condition.notify_all()

    def _stop_proc(self) -> None:
        proc = self.proc
        self.proc = None
        if proc is None:
            return
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill()

    def focus_settings(self) -> dict:
        with self.focus_lock:
            proc = subprocess.run(
                ["v4l2-ctl", "-d", self.device,
                 "--get-ctrl=focus_automatic_continuous,focus_absolute"],
                capture_output=True, text=True, check=False,
            )
            auto = re.search(r"focus_automatic_continuous:\s*([01])", proc.stdout)
            position = re.search(r"focus_absolute:\s*(-?\d+)", proc.stdout)
            if proc.returncode != 0 or auto is None or position is None:
                raise RuntimeError("could not read webcam focus settings")
            return {"focusMode": "auto" if auto.group(1) == "1" else "manual",
                    "lensPosition": int(position.group(1))}

    def zoom_settings(self) -> dict:
        with self.focus_lock:
            proc = subprocess.run(
                ["v4l2-ctl", "-d", self.device, "--get-ctrl=zoom_absolute"],
                capture_output=True, text=True, check=False,
            )
            level = re.search(r"zoom_absolute:\s*(-?\d+)", proc.stdout)
            if proc.returncode != 0 or level is None:
                raise RuntimeError("could not read webcam zoom")
            return {"zoomLevel": int(level.group(1))}

    def restore_zoom(self) -> None:
        state_path = self.zoom_state_path or ZOOM_STATE_PATH
        if self.zoom is None or not state_path.exists():
            return
        saved = json.loads(state_path.read_text())
        try:
            self.set_zoom(saved.get("zoomLevel"))
        except (ValueError, RuntimeError) as exc:
            print("[camera-ctl] could not restore zoom:", exc)

    def set_zoom(self, zoom_level: float | None) -> int:
        with self.focus_lock:
            if self.device is None or not self.healthy():
                raise RuntimeError(self.error or "camera is not running")
            if self.zoom is None:
                raise ValueError("this webcam has no zoom control")
            if zoom_level is None:
                raise ValueError("zoomLevel is required")
            if not self.zoom["min"] <= zoom_level <= self.zoom["max"]:
                raise ValueError("zoomLevel is outside the webcam zoom range")
            value = int(round(zoom_level))
            self._set_control(f"zoom_absolute={value}")
            state_path = self.zoom_state_path or ZOOM_STATE_PATH
            state_path.parent.mkdir(parents=True, exist_ok=True)
            temporary = state_path.with_suffix(".tmp")
            temporary.write_text(json.dumps({"zoomLevel": value}))
            temporary.replace(state_path)
            return value

    def restore_focus(self) -> None:
        state_path = self.focus_state_path or FOCUS_STATE_PATH
        if not state_path.exists():
            return
        saved = json.loads(state_path.read_text())
        self.set_focus(saved["mode"], saved.get("lensPosition"))
        if saved["mode"] == "manual":
            time.sleep(FOCUS_STARTUP_SETTLE_S)
            self.set_focus("manual", saved.get("lensPosition"))

    def set_focus(self, mode: str, lens_position: float | None, persist: bool = True) -> int | None:
        with self.focus_lock:
            position = self._apply_focus(mode, lens_position)
            if not persist:
                return position
            saved = {"mode": "auto" if mode == "auto" else "manual",
                     "lensPosition": position if mode == "lock" else lens_position}
            state_path = self.focus_state_path or FOCUS_STATE_PATH
            state_path.parent.mkdir(parents=True, exist_ok=True)
            temporary = state_path.with_suffix(".tmp")
            temporary.write_text(json.dumps(saved))
            temporary.replace(state_path)
            return position

    def _apply_focus(self, mode: str, lens_position: float | None) -> int | None:
        device = self.device
        if device is None or not self.healthy():
            raise RuntimeError(self.error or "camera is not running")
        if mode == "auto":
            self._set_control("focus_automatic_continuous=1")
            return
        if mode == "lock":
            self._set_control("focus_automatic_continuous=0")
            proc = subprocess.run(
                ["v4l2-ctl", "-d", device, "--get-ctrl=focus_absolute"],
                capture_output=True, text=True, check=False,
            )
            match = re.search(r"focus_absolute:\s*(-?\d+)", proc.stdout)
            if proc.returncode != 0 or match is None:
                raise RuntimeError("could not read webcam focus position")
            position = int(match.group(1))
            self._write_manual_position(position, position)
            return position
        if mode != "manual":
            raise ValueError("mode must be auto, manual, or lock")
        if lens_position is None:
            raise ValueError("lensPosition is required for manual focus")
        if self.focus is not None and not (
            self.focus["min"] <= lens_position <= self.focus["max"]
        ):
            raise ValueError("lensPosition is outside the webcam focus range")
        value = int(round(lens_position))
        # The driver rejects focus_absolute while autofocus is still active,
        # even when both controls are supplied in one v4l2-ctl invocation.
        self._set_control("focus_automatic_continuous=0")
        self._write_manual_position(value, value)

    def _write_manual_position(self, value: int, previous: int) -> None:
        # Some UVC cameras keep the last manual value cached during autofocus.
        # Repeating it can be ignored even though autofocus moved the lens.
        # A one-step write forces the requested manual position to reach hardware.
        if value == previous and self.focus:
            step = self.focus["step"]
            adjacent = value + step if value + step <= self.focus["max"] else value - step
            if self.focus["min"] <= adjacent <= self.focus["max"] and adjacent != value:
                self._set_control(f"focus_absolute={adjacent}")
        self._set_control(f"focus_absolute={value}")

    def _set_control(self, control: str) -> None:
        device = self.device
        if device is None:
            raise RuntimeError("camera is not running")
        proc = subprocess.run(
            ["v4l2-ctl", "-d", device, "-c", control],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout).strip()
            raise RuntimeError(detail or f"could not set webcam control {control}")


CAMERA = Camera()
CAMERAS: dict[str, Camera] = {}
CAMERAS_LOCK = threading.RLock()


def selected_camera(camera_id: str | None) -> Camera:
    if camera_id is None:
        return CAMERA
    devices = find_webcams()
    if camera_id not in devices:
        raise ValueError("camera is not connected")
    key = os.path.realpath(camera_id)
    with CAMERAS_LOCK:
        if CAMERA.device and os.path.realpath(CAMERA.device) == key:
            if not CAMERA.healthy():
                CAMERA.start(camera_id)
            return CAMERA
        camera = CAMERAS.get(key)
        if camera is None:
            camera = Camera()
            suffix = hashlib.sha256(camera_id.encode()).hexdigest()[:16]
            camera.focus_state_path = FOCUS_STATE_PATH.with_name(f"camera-focus-{suffix}.json")
            camera.zoom_state_path = ZOOM_STATE_PATH.with_name(f"camera-zoom-{suffix}.json")
            CAMERAS[key] = camera
        if not camera.healthy():
            camera.start(camera_id)
        return camera



class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _host_is_loopback(self) -> bool:
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0]
        if host in LOOPBACK_HOST_NAMES:
            return True
        self._send(403, b"forbidden", "text/plain")
        return False

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(405, b"method not allowed", "text/plain")

    def do_GET(self) -> None:  # noqa: N802
        if not self._host_is_loopback():
            return
        path = self.path.split("?", 1)[0]
        if path == "/devices":
            devices = [{"id": device, "label": f"{device_label(device)} ({os.path.basename(device)})"} for device in find_webcams()]
            self._send(200, json.dumps({"devices": devices}).encode(), "application/json")
            return
        if path not in ("/health", "/frame", "/stream"):
            self._send(404, b"not found", "text/plain")
            return
        try:
            camera = selected_camera(parse_qs(urlsplit(self.path).query).get("cameraId", [None])[0])
        except (ValueError, RuntimeError, OSError) as exc:
            self._send(503, str(exc).encode(), "text/plain")
            return
        if path == "/health":
            if not camera.healthy():
                self._send(
                    503,
                    (camera.error or "camera is not running").encode(),
                    "text/plain",
                )
                return
            try:
                focus_settings = camera.focus_settings() if camera.focus else {}
                zoom_settings = camera.zoom_settings() if camera.zoom else {}
            except RuntimeError as exc:
                self._send(503, str(exc).encode(), "text/plain")
                return
            payload = json.dumps(
                {
                    "ok": True,
                    "id": next((device for device in find_webcams() if os.path.realpath(device) == os.path.realpath(camera.device or "")), camera.device),
                    "label": camera.label,
                    "width": camera.width,
                    "height": camera.height,
                    "focus": camera.focus,
                    "focusPreview": True,
                    "zoom": camera.zoom,
                    **focus_settings,
                    **zoom_settings,
                }
            ).encode()
            self._send(200, payload, "application/json")
            return
        if path == "/frame":
            with camera.buffer.condition:
                if parse_qs(urlsplit(self.path).query).get("fresh") == ["1"]:
                    sequence = camera.buffer.sequence
                    arrived = camera.buffer.condition.wait_for(
                        lambda: camera.buffer.sequence > sequence, timeout=3
                    )
                    if not arrived:
                        self._send(503, b"camera produced no fresh frame", "text/plain")
                        return
                frame = camera.buffer.frame
            if not camera.healthy() or frame is None:
                self._send(
                    503,
                    (camera.error or "camera is not running").encode(),
                    "text/plain",
                )
                return
            self._send(200, frame, "image/jpeg")
            return
        if path != "/stream":
            self._send(404, b"not found", "text/plain")
            return
        if not camera.healthy():
            self._send(
                503,
                (camera.error or "camera is not running").encode(),
                "text/plain",
            )
            return
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-cache, no-store")
        self.send_header("Pragma", "no-cache")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Transfer-Encoding", "chunked")
        self.end_headers()
        try:
            next_at = 0.0
            while camera.healthy():
                with camera.buffer.condition:
                    if camera.buffer.frame is None:
                        camera.buffer.condition.wait()
                    frame = camera.buffer.frame
                now = time.monotonic()
                if now < next_at:
                    time.sleep(next_at - now)
                    frame = camera.buffer.frame
                if not frame:
                    continue
                part = (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    + f"Content-Length: {len(frame)}\r\n\r\n".encode()
                    + frame
                    + b"\r\n"
                )
                self.wfile.write(f"{len(part):x}\r\n".encode())
                self.wfile.write(part)
                self.wfile.write(b"\r\n")
                self.wfile.flush()
                next_at = time.monotonic() + FRAME_INTERVAL_S
        except (BrokenPipeError, ConnectionResetError):
            return

    def do_POST(self) -> None:  # noqa: N802
        if not self._host_is_loopback():
            return
        path = self.path.split("?", 1)[0]
        if path == "/zoom":
            self._post_zoom()
            return
        if path != "/focus":
            self._send(404, b"not found", "text/plain")
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        try:
            camera = selected_camera(parse_qs(urlsplit(self.path).query).get("cameraId", [None])[0])
            body = json.loads(self.rfile.read(length) or b"{}")
            lens = body.get("lensPosition")
            if "persist" in body and not isinstance(body["persist"], bool):
                raise ValueError("persist must be a boolean")
            options = {"persist": False} if body.get("persist") is False else {}
            position = camera.set_focus(
                str(body.get("mode", "")),
                None if lens is None else float(lens),
                **options,
            )
        except (ValueError, RuntimeError, OSError, json.JSONDecodeError) as exc:
            self._send(400, str(exc).encode(), "text/plain")
            return
        if position is not None:
            self._send(200, json.dumps({"lensPosition": position}).encode(), "application/json")
        else:
            self._send(204, b"", "text/plain")

    def _post_zoom(self) -> None:
        length = int(self.headers.get("Content-Length", "0") or "0")
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
            level = body.get("zoomLevel")
            camera = selected_camera(parse_qs(urlsplit(self.path).query).get("cameraId", [None])[0])
            value = camera.set_zoom(None if level is None else float(level))
        except (ValueError, RuntimeError, OSError, json.JSONDecodeError) as exc:
            self._send(400, str(exc).encode(), "text/plain")
            return
        self._send(200, json.dumps({"zoomLevel": value}).encode(), "application/json")

    def log_message(self, fmt: str, *args) -> None:
        print("[camera-ctl]", fmt % args)


def main() -> None:
    CAMERA.start()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(
        f"[camera-ctl] {CAMERA.label} {CAMERA.width}x{CAMERA.height} "
        f"from {CAMERA.device} on http://{HOST}:{PORT}"
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
