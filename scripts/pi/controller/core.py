import asyncio
import copy
import json
import os
import time
from pathlib import Path


VERSION = "pi-0.1.0"
MODULE_DEFAULTS = dict(bottomClosed=300, bottomOpen=310, paddleClosed=300,
                       paddleOpen=310, pusherLeft=295, pusherNeutral=300,
                       pusherRight=305, pusherHoldDuration=150,
                       paddleCloseDelay=150, paddleOpenDelay=300)
FEEDER_DEFAULTS = dict(speed=315, duration=1000, pulseDuration=40,
                       pauseDuration=100, settleDuration=100,
                       reverseSpeed=295, reverseDuration=0)
PARTS = ("bottom", "paddle", "pusher")


def integer(value, minimum, maximum):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"expected integer from {minimum} to {maximum}")
    return value


def merge_config(current, incoming):
    if not isinstance(incoming, dict):
        raise ValueError("configuration must be an object")
    updated = dict(current)
    for key in current:
        if key in incoming:
            is_pulse = key in MODULE_DEFAULTS and not key.endswith(("Duration", "Delay"))
            is_pulse = is_pulse or key in ("speed", "reverseSpeed")
            updated[key] = integer(incoming[key], 120 if is_pulse else 0,
                                   490 if is_pulse else 5000)
    return updated


class Controller:
    def __init__(self, hardware, config_path, device_id, clock=time.monotonic,
                 sleep=asyncio.sleep):
        self.hardware = hardware
        self.path = Path(config_path)
        self.device_id = device_id
        self.clock = clock
        self.sleep = sleep
        self.started = clock()
        self.config = dict(channelOffset=0, modules=[dict(MODULE_DEFAULTS) for _ in range(5)],
                           feeder=dict(FEEDER_DEFAULTS))
        self.stored = None
        self.paddle_opened = {}
        self.last_move = clock()
        self.preview_started = None
        self.jams = {}
        self.load()

    @property
    def count(self):
        return (15 - self.config["channelOffset"]) // 3

    @property
    def feeder_channel(self):
        return self.config["channelOffset"] + self.count * 3

    def channel(self, module, part):
        return self.config["channelOffset"] + (module - 1) * 3 + PARTS.index(part)

    def module(self, value):
        return integer(value, 1, self.count)

    def load(self):
        if not self.path.exists():
            return
        data = json.loads(self.path.read_text())
        if data.get("layout") != 1 or data.get("channelOffset") not in (0, 4):
            raise ValueError("invalid stored controller configuration")
        if not isinstance(data.get("modules"), list) or len(data["modules"]) != 5:
            raise ValueError("stored configuration must contain five modules")
        self.config = dict(channelOffset=data["channelOffset"],
                           modules=[merge_config(MODULE_DEFAULTS, item) for item in data["modules"]],
                           feeder=merge_config(FEEDER_DEFAULTS, data["feeder"]))
        self.stored = copy.deepcopy(self.config)

    def store(self):
        if self.stored == self.config:
            return False
        self.path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        with temporary.open("w") as output:
            os.chmod(temporary, 0o600)
            json.dump(dict(layout=1, **self.config), output)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, self.path)
        self.stored = copy.deepcopy(self.config)
        return True

    def stop(self):
        self.hardware.pwm(self.feeder_channel, 0)
        self.preview_started = None

    def release(self):
        self.hardware.release()
        self.paddle_opened.clear()
        self.preview_started = None

    async def wait(self, milliseconds):
        await self.sleep(max(0, milliseconds) / 1000)

    async def move(self, channel, pulse):
        integer(channel, 0, 15)
        pulse = max(120, min(490, pulse))
        relative = channel - self.config["channelOffset"]
        if 0 <= relative < self.count * 3:
            module = relative // 3 + 1
            part = relative % 3
            config = self.config["modules"][module - 1]
            if part == 2 and pulse != config["pusherNeutral"]:
                if module not in self.paddle_opened:
                    await self.move(self.channel(module, "paddle"), config["paddleOpen"])
                await self.wait(config["paddleOpenDelay"] -
                                (self.clock() - self.paddle_opened[module]) * 1000)
            if part == 1:
                if pulse == config["paddleOpen"]:
                    self.paddle_opened[module] = self.clock()
                else:
                    self.paddle_opened.pop(module, None)
        self.hardware.pwm(channel, pulse)
        self.last_move = self.clock()

    async def neutral_module(self, module, stagger=0):
        config = self.config["modules"][module - 1]
        for part, field in zip(PARTS, ("bottomClosed", "paddleClosed", "pusherNeutral")):
            await self.move(self.channel(module, part), config[field])
            await self.wait(stagger)

    async def neutral(self):
        self.stop()
        for module in range(1, self.count + 1):
            await self.neutral_module(module, 25)
        await self.wait(200)

    async def wait_sensor(self, module, present=True, timeout=3000):
        deadline = self.clock() + timeout / 1000
        while self.clock() < deadline:
            if self.hardware.present(module) == present:
                return True
            await self.wait(2)
        return False

    async def feed(self):
        config = self.config["feeder"]
        if self.hardware.present(1):
            return dict(status="ok", detected=True, empty=False)
        deadline = self.clock() + config["duration"] / 1000
        try:
            if not self.hardware.hopper():
                await self.move(self.feeder_channel, config["speed"])
                await self.wait(config["pulseDuration"] or 200)
                self.stop()
                if self.hardware.present(1):
                    return dict(status="ok", detected=True, empty=False)
                if not self.hardware.hopper():
                    return dict(error="empty: feeder hopper is out of cards", empty=True)
            while self.clock() < deadline:
                await self.move(self.feeder_channel, config["speed"])
                if config["pulseDuration"]:
                    window = min(config["pulseDuration"], max(0, (deadline - self.clock()) * 1000))
                else:
                    window = max(0, (deadline - self.clock()) * 1000)
                detected = await self.wait_sensor(1, timeout=window)
                if detected and not self.hardware.hopper():
                    await self.wait(config["settleDuration"])
                self.stop()
                if detected or self.hardware.present(1):
                    if self.hardware.hopper() and config["reverseDuration"]:
                        await self.move(self.feeder_channel, config["reverseSpeed"])
                        await self.wait(config["reverseDuration"])
                    return dict(status="ok", detected=True, empty=False)
                await self.wait(config["pauseDuration"])
            return dict(error="timeout: feeder did not deliver card to module 1", empty=False)
        finally:
            self.stop()

    async def push(self, module, direction, settings, reset=False):
        config = self.config["modules"][module - 1]
        timings = merge_config(config, settings)
        await self.move(self.channel(module, "paddle"), config["paddleOpen"])
        await self.wait(timings["paddleOpenDelay"])
        await self.move(self.channel(module, "pusher"), config["pusherLeft" if direction == "left" else "pusherRight"])
        fired = self.clock()
        await self.wait(timings["pusherHoldDuration"])
        await self.move(self.channel(module, "pusher"), config["pusherNeutral"])
        if reset:
            for preceding in range(1, module):
                await self.neutral_module(preceding)
        await self.wait(timings["paddleCloseDelay"] - (self.clock() - fired) * 1000)
        await self.move(self.channel(module, "bottom"), config["bottomClosed"])
        await self.move(self.channel(module, "paddle"), config["paddleClosed"])
        await self.wait(200)

    async def recover(self, module):
        config = self.config["modules"][module - 1]
        for attempt in range(3):
            await self.move(self.channel(module, "paddle"), config["paddleOpen"])
            await self.move(self.channel(module, "bottom"), (config["bottomOpen"] + config["bottomClosed"]) // 2)
            await self.wait(150)
            await self.move(self.channel(module, "paddle"), config["paddleClosed"])
            await self.move(self.channel(module, "bottom"), config["bottomOpen"])
            await self.wait(150)
            if not self.hardware.present(module):
                break

    async def route(self, route, emit):
        module = self.module(route.get("module"))
        direction = route.get("direction")
        if direction not in ("left", "right", "bottom"):
            raise ValueError("direction must be left, right, or bottom")
        loaded = await self.feed()
        if "error" in loaded:
            return loaded
        feed_next = route.get("feedNext") is True
        fed = False
        for preceding in range(1, module):
            config = self.config["modules"][preceding - 1]
            await self.move(self.channel(preceding, "bottom"), config["bottomOpen"])
            if not await self.wait_sensor(preceding + 1):
                await self.recover(preceding)
                if not await self.wait_sensor(preceding + 1):
                    await self.neutral()
                    return dict(error=f"timeout: no card detected at module {preceding + 1}")
            if preceding == 1 and feed_next and await self.wait_sensor(1, False):
                await self.wait(300)
                await self.neutral_module(1)
                await self.wait(200)
                await emit(dict(event="fed", **await self.feed()))
                fed = True
        if module > 1:
            await self.wait(300)
        if direction == "bottom":
            await self.move(self.channel(module, "bottom"), self.config["modules"][module - 1]["bottomOpen"])
            await self.wait(600)
            await self.neutral()
            await self.wait(200)
        else:
            await self.push(module, direction, {}, reset=True)
        if feed_next and not fed:
            await emit(dict(event="fed", **await self.feed()))
        return dict(status="routed", module=module, direction=direction,
                    **({"fedNext": True} if feed_next else {}))

    async def maintenance(self, emit):
        now = self.clock()
        if self.preview_started is not None and now - self.preview_started >= 5:
            self.stop()
        if now - self.last_move >= 1.5:
            for module in range(1, self.count + 1):
                for part in PARTS:
                    self.hardware.pwm(self.channel(module, part), 0)
            self.paddle_opened.clear()
        for module in range(1, self.count + 1):
            if not self.hardware.present(module):
                self.jams.pop(module, None)
                continue
            since, alerted = self.jams.get(module, (now, False))
            if not alerted and now - max(since, self.last_move) >= 20:
                await emit(dict(error="jam", module=module))
                alerted = True
            self.jams[module] = (since, alerted)

    async def command(self, data, emit):
        if not isinstance(data, dict):
            raise ValueError("command must be an object")
        if data.get("getStatus") is True:
            return dict(status="ready", version=VERSION, board="raspberry_pi",
                        id=self.device_id, ble="none", resetReason="software",
                        servoDriver="ok" if self.hardware.present_driver() else "missing",
                        uptimeMs=int((self.clock() - self.started) * 1000))
        if data.get("readIR") is True:
            return dict(status="ok", ir=[self.hardware.present(module) for module in range(1, self.count + 1)],
                        hopper=self.hardware.hopper())
        if "setConfig" in data:
            config = data["setConfig"]
            module = self.module(config.get("module"))
            self.config["modules"][module - 1] = merge_config(self.config["modules"][module - 1], config)
            return dict(status="ok", module=module)
        if "setFeederConfig" in data:
            self.config["feeder"] = merge_config(self.config["feeder"], data["setFeederConfig"])
            self.stop()
            return dict(status="ok")
        if data.get("storeConfig") is True:
            return dict(status="ok", written=self.store())
        if "getStoredConfig" in data:
            section = data["getStoredConfig"]
            if section is True:
                return dict(status="ok", stored=self.stored is not None,
                            dirty=self.stored != self.config, channelOffset=self.config["channelOffset"], modules=5)
            if self.stored is None:
                return dict(error="no stored config")
            if section == "feeder":
                return dict(status="ok", feeder=self.stored["feeder"])
            module = integer(section, 1, 5)
            return dict(status="ok", module=module, **self.stored["modules"][module - 1])
        if not self.hardware.present_driver():
            return dict(error="servo driver not detected - check PCA9685 I2C wiring and power", servoDriver="missing")
        if "setChannelOffset" in data:
            offset = integer(data["setChannelOffset"], 0, 4)
            if offset not in (0, 4):
                raise ValueError("channel offset must be 0 or 4")
            self.release()
            self.config["channelOffset"] = offset
            await self.neutral()
        elif "route" in data:
            return await self.route(data["route"], emit)
        elif data.get("feeder") is True:
            return await self.feed()
        elif "feederValue" in data:
            await self.move(self.feeder_channel, integer(data["feederValue"], 120, 490))
            self.preview_started = self.clock()
        elif data.get("feederStop") is True:
            self.stop()
        elif "channelStop" in data:
            channel = integer(data["channelStop"], 0, 15)
            self.hardware.pwm(channel, 0)
            relative = channel - self.config["channelOffset"]
            if 0 <= relative < self.count * 3 and relative % 3 == 1:
                self.paddle_opened.pop(relative // 3 + 1, None)
        elif "channel" in data:
            channel = integer(data["channel"], 0, 15)
            await self.move(channel, integer(data.get("value"), 120, 490))
            if channel == self.feeder_channel:
                self.preview_started = self.clock()
            return dict(status="ok", channel=channel)
        elif "servo" in data:
            module = self.module(data.get("module"))
            part = data["servo"]
            if part not in PARTS:
                raise ValueError("servo must be bottom, paddle, or pusher")
            if "value" in data:
                pulse = integer(data["value"], 120, 490)
            else:
                positions = ("left", "neutral", "right") if part == "pusher" else ("open", "closed")
                position = data.get("position")
                if position not in positions:
                    raise ValueError("invalid position")
                pulse = self.config["modules"][module - 1][part + position.capitalize()]
            await self.move(self.channel(module, part), pulse)
            await self.wait(200)
            return dict(status="ok", module=module, servo=part)
        elif "pushTest" in data:
            settings = data["pushTest"]
            module = self.module(settings.get("module"))
            direction = settings.get("direction")
            if direction not in ("left", "right"):
                raise ValueError("direction must be left or right")
            await self.push(module, direction, settings)
            return dict(status="pushed", module=module, direction=direction)
        elif data.get("neutral") is True:
            await self.neutral()
        elif data.get("clearDevice") is True:
            for module in range(1, self.count + 1):
                await self.move(self.channel(module, "bottom"), self.config["modules"][module - 1]["bottomOpen"])
                await self.wait(25)
            await self.wait(600)
            await self.neutral()
            return dict(status="cleared")
        elif data.get("test") is True:
            for module in range(1, self.count + 1):
                if self.hardware.present(module):
                    return dict(error=f"module {module} sensor is blocked - clear the device before testing", module=module)
            await self.neutral()
            for module in range(1, self.count + 1):
                config = self.config["modules"][module - 1]
                await self.move(self.channel(module, "bottom"), config["bottomOpen"])
                await self.wait(25)
                await self.move(self.channel(module, "paddle"), config["paddleOpen"])
                await self.wait(600)
                await self.move(self.channel(module, "pusher"), config["pusherLeft"])
                await self.wait(600)
                await self.move(self.channel(module, "pusher"), config["pusherRight"])
                await self.wait(600)
                await self.move(self.channel(module, "pusher"), config["pusherNeutral"])
                await self.wait(25)
                await self.move(self.channel(module, "paddle"), config["paddleClosed"])
                await self.wait(25)
                await self.move(self.channel(module, "bottom"), config["bottomClosed"])
                await self.wait(250)
            await self.move(self.feeder_channel, self.config["feeder"]["speed"])
            await self.wait(500)
            self.stop()
            await self.wait(200)
            return dict(status="test_complete")
        else:
            return dict(error="unknown command")
        return dict(status="ok")
