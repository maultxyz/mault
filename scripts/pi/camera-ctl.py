#!/usr/bin/env python3
"""Serve the USB webcam plugged into the Pi to every browser on the network.

One process owns the webcam. Browsers, including one on another computer,
read a JPEG stream from this helper instead of their own camera.
"""

from __future__ import annotations

import glob
import json
import os
import re
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = 8765
SIZES = ((1920, 1080), (1280, 720), (640, 480))
FRAME_INTERVAL_S = 0.1


class JpegBuffer:
    def __init__(self) -> None:
        self.frame: bytes | None = None
        self.condition = threading.Condition()

    def publish(self, frame: bytes) -> None:
        with self.condition:
            self.frame = frame
            self.condition.notify_all()


def device_label(device: str) -> str:
    name_path = f"/sys/class/video4linux/{os.path.basename(device)}/name"
    try:
        raw = open(name_path, encoding="utf-8").read().strip()
    except OSError:
        return "USB webcam"
    head = raw.split(":", 1)[0]
    return " ".join(head.split()) or "USB webcam"


def find_webcam() -> str:
    override = os.environ.get("WEBCAM_DEVICE", "").strip()
    if override:
        return override
    matches: list[str] = []
    for node in sorted(glob.glob("/sys/class/video4linux/video*")):
        try:
            name = open(os.path.join(node, "name"), encoding="utf-8").read()
            index = open(os.path.join(node, "index"), encoding="utf-8").read().strip()
        except OSError:
            continue
        if "usb" not in name.lower() or index != "0":
            continue
        matches.append("/dev/" + os.path.basename(node))
    if not matches:
        raise RuntimeError("no USB webcam found")
    return matches[0]


def read_focus_range(device: str) -> dict[str, int] | None:
    proc = subprocess.run(
        ["v4l2-ctl", "-d", device, "--list-ctrls"],
        capture_output=True,
        text=True,
        check=False,
    )
    for line in proc.stdout.splitlines():
        if "focus_absolute" not in line:
            continue

        def grab(key: str) -> int | None:
            match = re.search(rf"{key}=(-?\d+)", line)
            return int(match.group(1)) if match else None

        minimum, maximum, step = grab("min"), grab("max"), grab("step")
        if minimum is None or maximum is None:
            return None
        return {"min": minimum, "max": maximum, "step": step or 1}
    return None


class Camera:
    def __init__(self) -> None:
        self.buffer = JpegBuffer()
        self.error: str | None = None
        self.device: str | None = None
        self.label = "USB webcam"
        self.width = SIZES[0][0]
        self.height = SIZES[0][1]
        self.focus: dict[str, int] | None = None
        self.proc: subprocess.Popen[bytes] | None = None

    def healthy(self) -> bool:
        return (
            self.buffer.frame is not None
            and self.proc is not None
            and self.proc.poll() is None
        )

    def start(self) -> None:
        self.device = find_webcam()
        self.label = device_label(self.device)
        self.focus = read_focus_range(self.device)
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
                chunk = stream.read(65536)
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

    def set_focus(self, mode: str, lens_position: float | None) -> None:
        device = self.device
        if device is None or not self.healthy():
            raise RuntimeError(self.error or "camera is not running")
        if mode == "auto":
            self._set_control("focus_automatic_continuous=1")
            return
        if mode != "manual":
            raise ValueError("mode must be auto or manual")
        if lens_position is None:
            raise ValueError("lensPosition is required for manual focus")
        if self.focus is not None and not (
            self.focus["min"] <= lens_position <= self.focus["max"]
        ):
            raise ValueError("lensPosition is outside the webcam focus range")
        value = int(round(lens_position))
        self._set_control(
            f"focus_automatic_continuous=0,focus_absolute={value}"
        )

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
            raise RuntimeError(detail or "could not set webcam focus")


CAMERA = Camera()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(405, b"method not allowed", "text/plain")

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path == "/health":
            if not CAMERA.healthy():
                self._send(
                    503,
                    (CAMERA.error or "camera is not running").encode(),
                    "text/plain",
                )
                return
            payload = json.dumps(
                {
                    "ok": True,
                    "label": CAMERA.label,
                    "width": CAMERA.width,
                    "height": CAMERA.height,
                    "focus": CAMERA.focus,
                }
            ).encode()
            self._send(200, payload, "application/json")
            return
        if path == "/frame":
            frame = CAMERA.buffer.frame
            if not CAMERA.healthy() or frame is None:
                self._send(
                    503,
                    (CAMERA.error or "camera is not running").encode(),
                    "text/plain",
                )
                return
            self._send(200, frame, "image/jpeg")
            return
        if path != "/stream":
            self._send(404, b"not found", "text/plain")
            return
        if not CAMERA.healthy():
            self._send(
                503,
                (CAMERA.error or "camera is not running").encode(),
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
            while True:
                with CAMERA.buffer.condition:
                    if CAMERA.buffer.frame is None:
                        CAMERA.buffer.condition.wait()
                    frame = CAMERA.buffer.frame
                now = time.monotonic()
                if now < next_at:
                    time.sleep(next_at - now)
                    frame = CAMERA.buffer.frame
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
        if self.path.split("?", 1)[0] != "/focus":
            self._send(404, b"not found", "text/plain")
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
            lens = body.get("lensPosition")
            CAMERA.set_focus(
                str(body.get("mode", "")),
                None if lens is None else float(lens),
            )
        except (ValueError, RuntimeError, json.JSONDecodeError) as exc:
            self._send(400, str(exc).encode(), "text/plain")
            return
        self._send(204, b"", "text/plain")

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
