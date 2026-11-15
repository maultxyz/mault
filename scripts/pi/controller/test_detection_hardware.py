import sys
import types
import unittest
from unittest.mock import Mock, patch

from .hardware import Hardware, IR_PINS, HOPPER_PIN, ZERO4_IR_PINS, ZERO4_HOPPER_PIN


class FakeLgpio:
    class error(Exception):
        pass

    SET_PULL_UP = "up"
    SET_PULL_DOWN = "down"

    def __init__(self):
        self.bias = {}
        self.signals = {}
        self.events = []
        self.fail_claim = []
        self.fail_read = False

    def gpiochip_open(self, chip):
        return 7

    def gpiochip_close(self, handle):
        pass

    def gpio_claim_input(self, handle, pin, bias):
        self.events.append(("claim", handle, pin, bias))
        if self.fail_claim and self.fail_claim[0] == bias:
            self.fail_claim.pop(0)
            raise self.error("claim failed")
        self.bias.setdefault(pin, bias)

    def gpio_free(self, handle, pin):
        self.events.append(("free", handle, pin))
        if pin not in self.bias:
            raise self.error("not claimed")
        del self.bias[pin]

    def gpio_read(self, handle, pin):
        self.events.append(("read", handle, pin))
        if self.fail_read and self.bias[pin] == "down":
            raise self.error("read failed")
        return self.signals.get(pin, int(self.bias[pin] == "up"))


class FakeRequest:
    def __init__(self, config):
        self.settings = {pin: settings for pins, settings in config.items() for pin in pins}
        self.signals = {}
        self.configs = []
        self.fail_reconfigure = False
        self.fail_read = False

    def get_value(self, pin):
        if self.fail_read and self.settings[pin].bias == "down":
            raise OSError("read failed")
        physical = self.signals.get(pin, int(self.settings[pin].bias == "up"))
        return "active" if physical == 0 else "inactive"

    def reconfigure_lines(self, *, config):
        self.configs.append(config)
        if self.fail_reconfigure:
            self.fail_reconfigure = False
            raise OSError("reconfigure failed")
        self.settings = {pin: config.get(pin, types.SimpleNamespace()) for pin in self.settings}

    def release(self):
        pass


class SensorDetectionHardwareTests(unittest.TestCase):
    def raspberry(self):
        gpio = FakeLgpio()
        hardware = Hardware.__new__(Hardware)
        hardware.bus = Mock()
        with patch.dict(sys.modules, {"lgpio": gpio}):
            hardware.open_raspberry_pi_gpio(4)
        gpio.events.clear()
        return hardware, gpio

    def zero4(self):
        line = types.SimpleNamespace(
            Bias=types.SimpleNamespace(PULL_UP="up", PULL_DOWN="down"),
            Direction=types.SimpleNamespace(INPUT="input"),
            Value=types.SimpleNamespace(ACTIVE="active"),
        )
        requests = []

        def request_lines(path, *, consumer, config):
            request = FakeRequest(config)
            requests.append(request)
            return request

        gpiod = types.SimpleNamespace(LineSettings=lambda **kwargs: types.SimpleNamespace(**kwargs),
                                      request_lines=request_lines)
        hardware = Hardware.__new__(Hardware)
        hardware.bus = Mock()
        with patch.dict(sys.modules, {"gpiod": gpiod, "gpiod.line": line}):
            hardware.open_zero4_gpio(0)
        return hardware, requests[0]

    def test_raspberry_detects_low_high_and_floating_without_outputs(self):
        for signal, expected in ((0, True), (1, True), (None, False)):
            with self.subTest(signal=signal), patch("scripts.pi.controller.hardware.time.sleep") as sleep:
                hardware, gpio = self.raspberry()
                if signal is not None:
                    gpio.signals[IR_PINS[0]] = signal
                self.assertEqual(hardware.sensor_connected(1), expected)
                self.assertEqual(gpio.bias, {pin: "up" for pin in (*IR_PINS, HOPPER_PIN)})
                self.assertTrue(all(event[2] == IR_PINS[0] for event in gpio.events))
                hardware.bus.assert_not_called()
                self.assertEqual(hardware.bus.mock_calls, [])
                if signal == 0:
                    sleep.assert_not_called()
                else:
                    self.assertEqual(sleep.call_count, 2)
                    self.assertTrue(all(call.args[0] >= 0.002 for call in sleep.call_args_list))
                    self.assertEqual([event[0] for event in gpio.events],
                                     ["read", "free", "claim", "read", "free", "claim"])

    def test_raspberry_restores_after_claim_or_read_failure(self):
        for failure in ("claim", "read"):
            with self.subTest(failure=failure), patch("scripts.pi.controller.hardware.time.sleep"):
                hardware, gpio = self.raspberry()
                if failure == "claim":
                    gpio.fail_claim = ["down"]
                else:
                    gpio.fail_read = True
                with self.assertRaises(OSError):
                    hardware.sensor_connected(1)
                self.assertEqual(gpio.bias[IR_PINS[0]], "up")
                self.assertEqual(gpio.events[-1], ("claim", 7, IR_PINS[0], "up"))

    def test_raspberry_does_not_hide_restore_failure(self):
        hardware, gpio = self.raspberry()
        gpio.fail_claim = ["up"]
        with patch("scripts.pi.controller.hardware.time.sleep"), self.assertRaises(OSError):
            hardware.sensor_connected(1)

    def test_zero4_detects_low_high_and_floating_preserving_all_inputs(self):
        for signal, expected in ((0, True), (1, True), (None, False)):
            with self.subTest(signal=signal), patch("scripts.pi.controller.hardware.time.sleep") as sleep:
                hardware, request = self.zero4()
                if signal is not None:
                    request.signals[ZERO4_IR_PINS[2]] = signal
                self.assertEqual(hardware.sensor_connected(3), expected)
                self.assertEqual(hardware.bus.mock_calls, [])
                self.assertEqual(len(request.configs), 0 if signal == 0 else 2)
                for index, config in enumerate(request.configs):
                    self.assertEqual(set(config), {*ZERO4_IR_PINS, ZERO4_HOPPER_PIN})
                    for pin, settings in config.items():
                        self.assertEqual(settings.direction, "input")
                        self.assertIs(settings.active_low, True)
                        self.assertEqual(settings.bias,
                                         "down" if index == 0 and pin == ZERO4_IR_PINS[2] else "up")
                self.assertTrue(all(settings.bias == "up" for settings in request.settings.values()))
                self.assertEqual(sleep.call_count, 0 if signal == 0 else 2)

    def test_zero4_restores_after_reconfigure_or_read_failure(self):
        for failure in ("reconfigure", "read"):
            with self.subTest(failure=failure), patch("scripts.pi.controller.hardware.time.sleep"):
                hardware, request = self.zero4()
                request.fail_reconfigure = failure == "reconfigure"
                request.fail_read = failure == "read"
                with self.assertRaises(OSError):
                    hardware.sensor_connected(1)
                self.assertTrue(all(settings.bias == "up" for settings in request.settings.values()))
                self.assertEqual(len(request.configs), 2)

    def test_zero4_does_not_hide_restore_failure(self):
        hardware, request = self.zero4()
        reconfigure = request.reconfigure_lines

        def fail_restore(*, config):
            if all(settings.bias == "up" for settings in config.values()):
                raise OSError("restore failed")
            reconfigure(config=config)

        request.reconfigure_lines = fail_restore
        with patch("scripts.pi.controller.hardware.time.sleep"), self.assertRaisesRegex(OSError, "restore failed"):
            hardware.sensor_connected(1)
