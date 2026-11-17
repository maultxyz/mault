#!/usr/bin/env python3
import argparse
import asyncio
import base64
import importlib.util
import json
import re
import subprocess
import sys


def capabilities():
    if not sys.platform.startswith("linux") or importlib.util.find_spec("bleak") is None:
        return {"supported": False}
    try:
        result = subprocess.run(["bluetoothctl", "show"], capture_output=True, text=True, timeout=4, env={"PATH": "/usr/bin:/bin", "LC_ALL": "C"})
        supported = result.returncode == 0 and bool(re.search(r"Controller [0-9A-Fa-f:]{17}", result.stdout))
        return {"supported": supported, "powered": supported and "Powered: yes" in result.stdout}
    except (OSError, subprocess.TimeoutExpired):
        return {"supported": False}


def emit(value):
    print(json.dumps(value), flush=True)


async def discover(service):
    from bleak import BleakScanner
    found = await BleakScanner.discover(timeout=5, service_uuids=[service], return_adv=True)
    return [{"id": "ble:" + device.address.upper(), "label": advertisement.local_name or device.name or device.address, "builtin": False, "busy": False}
            for device, advertisement in found.values()
            if service.lower() in [uuid.lower() for uuid in advertisement.service_uuids]]


async def bridge(address, service, rx, tx):
    from bleak import BleakClient, BleakScanner
    device = await BleakScanner.find_device_by_address(address, timeout=8, service_uuids=[service])
    if device is None:
        raise RuntimeError("Bluetooth sorter is not advertising")
    loop = asyncio.get_running_loop()
    disconnected = asyncio.Event()
    client = BleakClient(device, disconnected_callback=lambda _: disconnected.set(), timeout=15)
    async with client:
        if client.services.get_service(service) is None:
            raise RuntimeError("Device does not expose the sorter Bluetooth service")
        rx_char = client.services.get_characteristic(rx)
        tx_char = client.services.get_characteristic(tx)
        if rx_char is None or tx_char is None:
            raise RuntimeError("Device is missing sorter Bluetooth characteristics")
        response = "write-without-response" not in rx_char.properties
        if response and "write" not in rx_char.properties:
            raise RuntimeError("Sorter Bluetooth characteristic is not writable")
        await client.start_notify(tx_char, lambda _, data: emit({"type": "data", "data": base64.b64encode(data).decode()}))
        reader = asyncio.StreamReader(limit=131072)
        transport, _ = await loop.connect_read_pipe(lambda: asyncio.StreamReaderProtocol(reader), sys.stdin.buffer)
        emit({"type": "ready"})
        try:
            while not disconnected.is_set():
                read = asyncio.create_task(reader.readline())
                gone = asyncio.create_task(disconnected.wait())
                done, pending = await asyncio.wait([read, gone], return_when=asyncio.FIRST_COMPLETED)
                for task in pending:
                    task.cancel()
                await asyncio.gather(*pending, return_exceptions=True)
                if gone in done:
                    raise RuntimeError("Bluetooth sorter disconnected")
                line = read.result()
                if not line:
                    break
                message = json.loads(line)
                data = base64.b64decode(message["data"], validate=True)
                if len(data) > 65536:
                    raise ValueError("Bluetooth write too large")
                for offset in range(0, len(data), 20):
                    await client.write_gatt_char(rx_char, data[offset:offset + 20], response=response)
                emit({"type": "written", "id": message["id"]})
        finally:
            transport.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["capabilities", "discover", "connect"])
    parser.add_argument("--service")
    parser.add_argument("--rx")
    parser.add_argument("--tx")
    parser.add_argument("--address")
    args = parser.parse_args()
    if args.action == "capabilities":
        emit(capabilities())
        return
    if not args.service or not capabilities().get("powered"):
        raise RuntimeError("Host Bluetooth adapter is unavailable or powered off")
    if args.action == "discover":
        emit({"devices": asyncio.run(discover(args.service))})
    else:
        if not args.address or not re.fullmatch(r"(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}", args.address) or not args.rx or not args.tx:
            raise ValueError("Invalid Bluetooth sorter selection")
        asyncio.run(bridge(args.address, args.service, args.rx, args.tx))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit({"type": "error", "message": str(error)})
        sys.exit(1)
