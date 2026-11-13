import argparse
import asyncio
import contextlib
import fcntl
import hashlib
import json
import os
import signal
from pathlib import Path

from .core import Controller
from .hardware import BOARDS, Hardware


class ControllerServer:
    def __init__(self, controller):
        self.controller = controller
        self.owner = None

    async def connect(self, reader, writer):
        async def emit(message):
            writer.write((json.dumps(message, separators=(",", ":")) + "\n").encode())
            await writer.drain()

        if self.owner is not None:
            await emit(dict(error="busy", reason="another client owns the controller"))
            writer.close()
            await writer.wait_closed()
            return
        self.owner = writer
        command_task = None

        async def execute(message):
            try:
                response = await self.controller.command(message, emit)
            except (ValueError, TypeError, KeyError, AttributeError) as error:
                response = dict(error=str(error))
            except OSError:
                with contextlib.suppress(OSError):
                    self.controller.release()
                response = dict(error="hardware I/O failed; outputs released where possible")
            if type(message.get("seq")) is int and 0 <= message["seq"] <= 0xFFFFFFFF:
                response["seq"] = message["seq"]
            await emit(response)

        try:
            while True:
                try:
                    raw = await asyncio.wait_for(reader.readline(), timeout=0.1)
                except asyncio.TimeoutError:
                    if command_task is None or command_task.done():
                        if command_task is not None:
                            command_task.result()
                        await self.controller.maintenance(emit)
                    continue
                if not raw:
                    break
                try:
                    message = json.loads(raw)
                    if not isinstance(message, dict):
                        raise ValueError("command must be an object")
                except (ValueError, UnicodeDecodeError):
                    await emit(dict(error="invalid JSON command"))
                    continue
                if command_task is not None and not command_task.done():
                    response = dict(error="busy", reason="another command is in progress")
                    if type(message.get("seq")) is int:
                        response["seq"] = message["seq"]
                    await emit(response)
                    continue
                if command_task is not None:
                    command_task.result()
                command_task = asyncio.create_task(execute(message))
        except (ConnectionError, OSError, ValueError):
            pass
        finally:
            if command_task is not None:
                command_task.cancel()
                with contextlib.suppress(asyncio.CancelledError, ConnectionError, OSError, ValueError):
                    await command_task
            try:
                self.controller.release()
            finally:
                self.owner = None
                writer.close()
                with contextlib.suppress(ConnectionError, OSError):
                    await writer.wait_closed()


async def serve(arguments):
    os.umask(0o077)
    path = Path(arguments.socket)
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock = path.with_suffix(".lock").open("w")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    hardware = Hardware(chip=arguments.gpio_chip, board=arguments.board)
    try:
        machine_id = Path("/etc/machine-id").read_text().strip()
        device_id = hashlib.sha256((machine_id + ":mault-pi-controller").encode()).hexdigest()[:12]
        controller = Controller(hardware, arguments.config, device_id)
        service = ControllerServer(controller)
        path.unlink(missing_ok=True)
        server = await asyncio.start_unix_server(service.connect, path=str(path), limit=4096)
        stopped = asyncio.Event()
        loop = asyncio.get_running_loop()
        for name in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(name, stopped.set)
        async with server:
            print(f"Pi sorter controller listening on {path}", flush=True)
            await stopped.wait()
        if service.owner is not None:
            service.owner.close()
            await service.owner.wait_closed()
            while service.owner is not None:
                await asyncio.sleep(0.01)
    finally:
        hardware.close()
        path.unlink(missing_ok=True)
        lock.close()


def main():
    parser = argparse.ArgumentParser(description="Native sorter GPIO/I2C controller")
    parser.add_argument("--socket", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--board", choices=BOARDS, default="raspberry-pi")
    parser.add_argument("--gpio-chip", type=int)
    parser.add_argument("--enable-motion", action="store_true",
                        help="acknowledge that connected clients can move the sorter")
    arguments = parser.parse_args()
    if not arguments.enable_motion:
        parser.error("--enable-motion is required; disconnect servo power for initial wiring checks")
    asyncio.run(serve(arguments))


if __name__ == "__main__":
    main()
