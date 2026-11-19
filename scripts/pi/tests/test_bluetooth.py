import asyncio
import base64
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import types
import unittest
from unittest.mock import AsyncMock, Mock, patch

spec = importlib.util.spec_from_file_location("bluetooth_ctl", Path(__file__).resolve().parents[1] / "bluetooth-ctl.py")
bluetooth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bluetooth)


class BluetoothTests(unittest.TestCase):
    def test_capability_requires_runtime_and_adapter_but_reports_power_off(self):
        with patch.object(bluetooth.importlib.util, "find_spec", return_value=None):
            self.assertEqual(bluetooth.capabilities(), {"supported": False})
        result = types.SimpleNamespace(returncode=0, stdout="Controller AA:BB:CC:DD:EE:FF test\nPowered: no\n")
        with patch.object(bluetooth.importlib.util, "find_spec", return_value=True), patch.object(bluetooth.subprocess, "run", return_value=result):
            self.assertEqual(bluetooth.capabilities(), {"supported": True, "powered": False})
            result.stdout = result.stdout.replace("no", "yes")
            self.assertEqual(bluetooth.capabilities(), {"supported": True, "powered": True})
        with patch.object(bluetooth.importlib.util, "find_spec", return_value=True), patch.object(bluetooth.subprocess, "run", side_effect=subprocess.TimeoutExpired("bluetoothctl", 4)):
            self.assertFalse(bluetooth.capabilities()["supported"])

    def test_discovery_filters_non_sorters_and_uses_stable_addresses(self):
        device = types.SimpleNamespace(address="aa:bb:cc:dd:ee:ff", name="ESP32")
        other = types.SimpleNamespace(address="00:11:22:33:44:55", name="Headphones")
        scanner = types.SimpleNamespace(discover=AsyncMock(return_value={
            "sorter": (device, types.SimpleNamespace(service_uuids=["SERVICE"], local_name="Card Sorter")),
            "other": (other, types.SimpleNamespace(service_uuids=["other"], local_name=None)),
        }))
        with patch.dict(sys.modules, {"bleak": types.SimpleNamespace(BleakScanner=scanner)}):
            devices = asyncio.run(bluetooth.discover("service"))
        self.assertEqual([device["id"] for device in devices], ["ble:AA:BB:CC:DD:EE:FF"])
        self.assertEqual(devices[0]["label"], "Card Sorter")
        scanner.discover.assert_awaited_once_with(timeout=5, service_uuids=["service"], return_adv=True)

    def test_bridge_subscribes_before_ready_and_chunks_writes_without_changing_protocol(self):
        async def run():
            service = types.SimpleNamespace(properties=["write-without-response"])
            client = AsyncMock()
            client.__aenter__.return_value = client
            client.services = Mock()
            client.services.get_service.return_value = object()
            client.services.get_characteristic.return_value = service
            scanner = types.SimpleNamespace(find_device_by_address=AsyncMock(return_value=object()))
            reader = asyncio.StreamReader()
            payload = b'{"seq":1,"getStatus":true}\n'
            reader.feed_data((json.dumps({"id": 9, "data": base64.b64encode(payload).decode()}) + "\n").encode())
            reader.feed_eof()
            pipe = Mock()
            loop = asyncio.get_running_loop()
            output = []
            with patch.dict(sys.modules, {"bleak": types.SimpleNamespace(BleakScanner=scanner, BleakClient=Mock(return_value=client))}), patch.object(loop, "connect_read_pipe", AsyncMock(return_value=(pipe, None))), patch.object(bluetooth.asyncio, "StreamReader", return_value=reader), patch.object(bluetooth, "emit", side_effect=output.append):
                await bluetooth.bridge("AA:BB:CC:DD:EE:FF", "service", "rx", "tx")
            client.start_notify.assert_awaited_once()
            writes = client.write_gatt_char.await_args_list
            self.assertEqual(b"".join(call.args[1] for call in writes), payload)
            self.assertTrue(all(len(call.args[1]) <= 20 and call.kwargs["response"] is False for call in writes))
            self.assertEqual(output, [{"type": "ready"}, {"type": "written", "id": 9}])
            pipe.close.assert_called_once()
        asyncio.run(run())

    def test_invalid_or_unavailable_selection_does_not_connect(self):
        with patch.object(sys, "argv", ["bluetooth-ctl.py", "connect", "--address", "not-an-address", "--service", "service", "--rx", "rx", "--tx", "tx"]), patch.object(bluetooth, "capabilities", return_value={"supported": True, "powered": True}), patch.object(bluetooth, "bridge") as bridge:
            with self.assertRaises(ValueError):
                bluetooth.main()
            bridge.assert_not_called()
