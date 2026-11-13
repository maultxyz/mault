import asyncio
import json
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from .core import Controller
from .hardware import Hardware
from .server import ControllerServer


class FakeHardware:
    def __init__(self):
        self.sensors = [False] * 5
        self.hopper_present = True
        self.driver_present = True
        self.writes = []
        self.releases = 0
        self.on_write = None

    def pwm(self, channel, pulse):
        self.writes.append((channel, pulse))
        if self.on_write:
            self.on_write(channel, pulse)

    def release(self):
        self.releases += 1

    def present(self, module):
        return self.sensors[module - 1]

    def hopper(self):
        return self.hopper_present

    def present_driver(self):
        return self.driver_present


class HardwareTests(unittest.TestCase):
    def test_rp1_discovery_and_pwm_startup_release_without_motion(self):
        writes = []
        claims = []
        closed = []
        active_inputs = set()

        class Bus:
            def __init__(self, number):
                self.number = number

            def write_byte_data(self, address, register, value):
                writes.append((register, value))

            def write_i2c_block_data(self, address, register, values):
                writes.append((register, values))

            def close(self):
                pass

        gpio = types.SimpleNamespace(
            SET_PULL_UP=32, gpiochip_open=lambda chip: chip,
            gpio_get_chip_info=lambda chip: [0, 54, "gpiochip", "pinctrl-rp1" if chip == 4 else "other"],
            gpiochip_close=closed.append,
            gpio_claim_input=lambda handle, pin, flags: claims.append((handle, pin, flags)),
            gpio_read=lambda handle, pin: 0 if pin in active_inputs else 1,
        )
        with patch.dict("sys.modules", {"lgpio": gpio, "smbus": types.SimpleNamespace(SMBus=Bus)}), \
                patch("scripts.pi.controller.hardware.glob.glob", return_value=["/dev/gpiochip0", "/dev/gpiochip4"]):
            hardware = Hardware()
            self.assertEqual(closed, [0])
            self.assertEqual([item[1] for item in claims], [17, 27, 22, 24, 25, 23])
            for expected_module, pin in enumerate((17, 27, 22, 24, 25), 1):
                active_inputs.clear()
                active_inputs.add(pin)
                self.assertEqual([hardware.present(module) for module in range(1, 6)],
                                 [module == expected_module for module in range(1, 6)])
                self.assertFalse(hardware.hopper())
            active_inputs.clear()
            active_inputs.add(23)
            self.assertTrue(hardware.hopper())
            self.assertFalse(any(hardware.present(module) for module in range(1, 6)))
            self.assertEqual(writes[:16], [(0x09 + channel * 4, 0x10) for channel in range(16)])
            self.assertIn((0xFE, 121), writes)
            hardware.pwm(15, 315)
            self.assertEqual(writes[-1], (0x42, [0, 0, 59, 1]))
            hardware.pwm(15, 0)
            self.assertEqual(writes[-1], (0x42, [0, 0, 0, 16]))
            hardware.close()
            self.assertEqual(closed, [0, 4])


class ControllerTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.hardware = FakeHardware()
        self.now = 0.0

        async def sleep(seconds):
            self.now += seconds

        self.controller = Controller(self.hardware, Path(self.directory.name) / "config.json",
                                     "test-pi", clock=lambda: self.now, sleep=sleep)
        self.events = []

    async def emit(self, event):
        self.events.append(event)

    async def command(self, command):
        return await self.controller.command(command, self.emit)

    async def test_loaded_last_card_is_not_reported_empty(self):
        self.hardware.sensors[0] = True
        self.hardware.hopper_present = False
        self.assertTrue((await self.command(dict(feeder=True)))["detected"])
        self.assertEqual(self.hardware.writes, [])

    async def test_feed_timeout_and_empty_stop_the_motor(self):
        response = await self.command(dict(feeder=True))
        self.assertIn("timeout", response["error"])
        self.assertEqual(self.hardware.writes[-1], (15, 0))
        self.hardware.hopper_present = False
        self.assertTrue((await self.command(dict(feeder=True)))["empty"])
        self.assertEqual(self.hardware.writes[-1], (15, 0))

    async def test_raw_pusher_opens_paddle_and_waits_before_motion(self):
        await self.command(dict(channel=2, value=295))
        self.assertEqual(self.hardware.writes[:2], [(1, 310), (2, 295)])
        self.assertGreaterEqual(self.now, 0.3)
        await self.command(dict(channelStop=1))
        self.assertNotIn(1, self.controller.paddle_opened)

    async def test_bounded_foil_nudges_keep_paddle_closed(self):
        await self.command(dict(setConfig=dict(module=1, pusherLeft=250,
                                               pusherNeutral=300, pusherRight=350)))
        self.hardware.writes.clear()
        started = self.now
        for pulse in (280, 320, 300):
            await self.command(dict(servo="pusher", module=1, value=pulse))
        self.assertEqual(self.hardware.writes, [(2, 280), (2, 320), (2, 300)])
        self.assertAlmostEqual(self.now - started, 0.6)
        status = await self.command(dict(getStatus=True))
        self.assertEqual(status["pusherNudgeMaxPulse"], 20)
        self.assertEqual(status["pusherNudgeMaxTravelPercent"], 50)

    async def test_nudge_limits_require_both_pulse_and_directional_travel_bounds(self):
        for left, right, pulse in ((250, 350, 279), (295, 305, 297),
                                   (350, 295, 297), (350, 295, 310)):
            await self.command(dict(setConfig=dict(module=1, pusherLeft=left,
                                                   pusherNeutral=300, pusherRight=right)))
            self.hardware.writes.clear()
            self.controller.paddle_opened.clear()
            await self.command(dict(servo="pusher", module=1, value=pulse))
            if (left, right, pulse) == (350, 295, 310):
                self.assertEqual(self.hardware.writes, [(2, pulse)])
            else:
                self.assertEqual(self.hardware.writes[:2], [(1, 310), (2, pulse)])

    async def test_routes_through_modules_and_preserves_mirrored_direction(self):
        self.hardware.sensors[0] = True

        def advance(channel, pulse):
            if channel in (0, 3) and pulse == 310:
                self.hardware.sensors[channel // 3] = False
                self.hardware.sensors[channel // 3 + 1] = True

        self.hardware.on_write = advance
        response = await self.command(dict(route=dict(module=3, direction="left")))
        self.assertEqual(response, dict(status="routed", module=3, direction="left"))
        self.assertIn((8, 295), self.hardware.writes)
        self.assertLess(self.hardware.writes.index((0, 310)), self.hardware.writes.index((3, 310)))

    async def test_pipeline_reports_next_card_after_arrival_at_target(self):
        self.hardware.sensors[0] = True

        def advance(channel, pulse):
            if channel == 0 and pulse == 310:
                self.hardware.sensors[0] = False
                self.hardware.sensors[1] = True
            elif channel == 15 and pulse == 315:
                self.hardware.sensors[0] = True
            elif channel == 3 and pulse == 310:
                self.hardware.sensors[1] = False
                self.hardware.sensors[2] = True

        async def emit(event):
            self.assertTrue(self.hardware.sensors[0])
            self.assertTrue(self.hardware.sensors[2])
            self.events.append(event)

        self.hardware.on_write = advance
        response = await self.controller.command(
            dict(route=dict(module=3, direction="left", feedNext=True)), emit)
        self.assertEqual(self.events, [dict(event="fed", status="ok", detected=True, empty=False)])
        self.assertTrue(response["fedNext"])
        self.assertEqual(response["status"], "routed")
        self.assertTrue(self.hardware.sensors[0])

    async def test_drop_through_does_not_require_intermediate_sensor_arrivals(self):
        self.hardware.sensors[0] = True

        def arrive(channel, pulse):
            if (channel, pulse) == (6, 310):
                self.hardware.sensors[0] = False
                self.hardware.sensors[3] = True

        self.hardware.on_write = arrive
        response = await self.command(dict(route=dict(module=4, direction="right")))
        self.assertEqual(response["status"], "routed")
        self.assertLess(self.hardware.writes.index((0, 310)), self.hardware.writes.index((3, 310)))
        self.assertLess(self.hardware.writes.index((3, 310)), self.hardware.writes.index((6, 310)))
        self.assertFalse(any(self.hardware.sensors[1:3]))

    async def test_drop_through_recovers_the_last_module_with_a_card(self):
        self.hardware.sensors[0] = True

        def arrive(channel, pulse):
            if (channel, pulse) == (3, 310):
                self.hardware.sensors[0] = False
                self.hardware.sensors[1] = True
            elif (channel, pulse) == (4, 310):
                self.hardware.sensors[1] = False
                self.hardware.sensors[3] = True

        self.hardware.on_write = arrive
        response = await self.command(dict(route=dict(module=4, direction="left")))
        self.assertEqual(response["status"], "routed")
        self.assertIn((4, 310), self.hardware.writes)
        self.assertNotIn((1, 310), self.hardware.writes)

    async def test_route_jam_retries_then_reports_destination(self):
        self.hardware.sensors[0] = True
        response = await self.command(dict(route=dict(module=2, direction="bottom")))
        self.assertIn("module 2", response["error"])
        self.assertGreaterEqual(self.now, 6)
        self.assertGreaterEqual(self.hardware.writes.count((1, 310)), 3)

    async def test_feed_next_emits_event_before_route_reply(self):
        self.hardware.sensors[0] = True
        response = await self.command(dict(route=dict(module=1, direction="right", feedNext=True)))
        self.assertTrue(response["fedNext"])
        self.assertEqual(self.events[0]["event"], "fed")

    async def test_partial_calibration_persists_atomically_and_validates(self):
        await self.command(dict(setConfig=dict(module=2, paddleOpenDelay=450)))
        self.assertTrue((await self.command(dict(storeConfig=True)))["written"])
        self.assertFalse((await self.command(dict(storeConfig=True)))["written"])
        replacement = Controller(self.hardware, self.controller.path, "test-pi")
        self.assertEqual(replacement.config["modules"][1]["paddleOpenDelay"], 450)
        with self.assertRaises(ValueError):
            await self.command(dict(setFeederConfig=dict(reverseDuration=-1)))
        self.controller.path.write_text('{"layout": 99}')
        with self.assertRaises(ValueError):
            Controller(self.hardware, self.controller.path, "test-pi")

    async def test_self_test_refuses_blocked_sensor_and_missing_driver(self):
        self.hardware.sensors[2] = True
        self.assertEqual((await self.command(dict(test=True)))["module"], 3)
        self.assertEqual(self.hardware.writes, [])
        self.hardware.driver_present = False
        self.assertEqual((await self.command(dict(test=True)))["servoDriver"], "missing")

    async def test_layout_switch_releases_previous_feeder_channel(self):
        await self.command(dict(feederValue=315))
        await self.command(dict(setChannelOffset=4))
        self.assertEqual(self.hardware.releases, 1)
        self.assertEqual(self.controller.feeder_channel, 13)
        self.assertEqual(self.controller.count, 3)
        with self.assertRaises(ValueError):
            await self.command(dict(setChannelOffset=2))

    async def test_self_test_keeps_gates_open_through_both_pusher_directions(self):
        await self.command(dict(setConfig=dict(module=1, bottomOpen=183, bottomClosed=453,
                                               paddleOpen=209, paddleClosed=453,
                                               pusherLeft=268, pusherNeutral=305, pusherRight=342)))
        response = await self.command(dict(test=True))
        self.assertEqual(response["status"], "test_complete")
        opened = self.hardware.writes.index((0, 183))
        self.assertEqual(self.hardware.writes[opened:opened + 7],
                         [(0, 183), (1, 209), (2, 268), (2, 342), (2, 305), (1, 453), (0, 453)])
        self.assertEqual(self.hardware.writes[-2:], [(15, 315), (15, 0)])

    async def test_preview_has_deadman_timeout_and_idle_releases_paddle_state(self):
        await self.command(dict(feederValue=315))
        await self.command(dict(channel=1, value=310))
        self.now += 5.1
        await self.controller.maintenance(self.emit)
        self.assertIsNone(self.controller.preview_started)
        self.assertEqual(self.controller.paddle_opened, {})
        self.assertIn((15, 0), self.hardware.writes)


class SocketTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.hardware = FakeHardware()
        self.controller = Controller(self.hardware, Path(self.directory.name) / "config.json", "test-pi")
        self.service = ControllerServer(self.controller)
        self.path = str(Path(self.directory.name) / "controller.sock")
        self.server = await asyncio.start_unix_server(self.service.connect, path=self.path, limit=4096)
        self.addAsyncCleanup(self.shutdown)

    async def shutdown(self):
        self.server.close()
        await self.server.wait_closed()

    async def test_seq_busy_exclusive_owner_and_disconnect_cancels_motion(self):
        reader, writer = await asyncio.open_unix_connection(self.path)
        writer.write(b'{"seq":7,"getStatus":true}\n')
        reply = json.loads(await asyncio.wait_for(reader.readline(), 1))
        self.assertEqual(reply["seq"], 7)
        self.assertEqual(reply["version"], "pi-0.1.0")
        other_reader, other_writer = await asyncio.open_unix_connection(self.path)
        self.assertEqual(json.loads(await other_reader.readline())["error"], "busy")
        other_writer.close()
        await other_writer.wait_closed()
        writer.write(b'{"seq":8,"feeder":true}\n')
        await asyncio.sleep(0.02)
        writer.write(b'{"seq":9,"neutral":true}\n')
        reply = json.loads(await asyncio.wait_for(reader.readline(), 1))
        self.assertEqual(reply, dict(error="busy", reason="another command is in progress", seq=9))
        writer.close()
        await writer.wait_closed()
        for attempt in range(100):
            if self.service.owner is None:
                break
            await asyncio.sleep(0.01)
        self.assertIsNone(self.service.owner)
        self.assertGreater(self.hardware.releases, 0)
        self.assertEqual(self.hardware.writes[-1], (15, 0))


if __name__ == "__main__":
    unittest.main()
