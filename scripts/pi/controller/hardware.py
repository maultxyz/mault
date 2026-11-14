import contextlib
import glob
import time
from pathlib import Path


BOARDS = ("raspberry-pi", "orange-pi-zero4")
IR_PINS = (17, 27, 22, 24, 25)
HOPPER_PIN = 23
ZERO4_IR_PINS = (32, 33, 139, 131, 129)
ZERO4_HOPPER_PIN = 130
ZERO4_GPIO_PARENT = "2000000.pinctrl"
ZERO4_TWI0 = "2510000.twi"


def require_zero4():
    for filename in ("/etc/orangepi-release", "/etc/armbian-release"):
        path = Path(filename)
        if path.exists() and "BOARD=orangepizero4" in path.read_text().splitlines():
            return
    raise RuntimeError("Orange Pi Zero 4 profile requires a Zero 4 system image")


def zero4_device_number(device_class, prefix, parent):
    for entry in Path(device_class).glob(f"{prefix}*"):
        if parent in entry.resolve().parts:
            return int(entry.name.removeprefix(prefix))
    raise RuntimeError(f"Linux device for {parent} is unavailable")


class Hardware:
    def __init__(self, chip=None, bus=None, address=0x40, board="raspberry-pi"):
        from smbus import SMBus

        self.close_gpio = None
        self.bus = None
        self.address = address
        try:
            if board == "orange-pi-zero4":
                require_zero4()
                if bus is None:
                    try:
                        bus = zero4_device_number("/sys/class/i2c-dev", "i2c-", ZERO4_TWI0)
                    except RuntimeError as error:
                        raise RuntimeError("Enable the Zero 4 header TWI0 (i2c0 overlay) and reboot") from error
                self.open_zero4_gpio(chip)
            elif board == "raspberry-pi":
                self.open_raspberry_pi_gpio(chip)
                if bus is None:
                    bus = 1
            else:
                raise ValueError(f"Unsupported sorter board: {board}")
            self.bus = SMBus(bus)
            self.release()
            self.bus.write_byte_data(address, 0x00, 0x10)
            self.bus.write_byte_data(address, 0xFE, 121)
            self.bus.write_byte_data(address, 0x01, 0x04)
            self.bus.write_byte_data(address, 0x00, 0x20)
            time.sleep(0.005)
            self.bus.write_byte_data(address, 0x00, 0xA0)
        except BaseException:
            self.close()
            raise

    def open_raspberry_pi_gpio(self, chip):
        import lgpio

        if chip is None:
            for path in sorted(glob.glob("/dev/gpiochip*")):
                candidate = lgpio.gpiochip_open(int(path.split("gpiochip")[-1]))
                if lgpio.gpio_get_chip_info(candidate)[3] == "pinctrl-rp1":
                    handle = candidate
                    break
                lgpio.gpiochip_close(candidate)
            else:
                raise RuntimeError("Pi 5 RP1 GPIO chip not found; use --gpio-chip after checking gpioinfo")
        else:
            handle = lgpio.gpiochip_open(chip)
        self.close_gpio = lambda: lgpio.gpiochip_close(handle)
        self.ir_pins, self.hopper_pin = IR_PINS, HOPPER_PIN
        for pin in (*self.ir_pins, self.hopper_pin):
            lgpio.gpio_claim_input(handle, pin, lgpio.SET_PULL_UP)
        self.active = lambda pin: lgpio.gpio_read(handle, pin) == 0

    def open_zero4_gpio(self, chip):
        import gpiod
        from gpiod.line import Bias, Direction, Value

        if chip is None:
            chip = zero4_device_number("/sys/bus/gpio/devices", "gpiochip", ZERO4_GPIO_PARENT)
        self.ir_pins, self.hopper_pin = ZERO4_IR_PINS, ZERO4_HOPPER_PIN
        inputs = gpiod.LineSettings(direction=Direction.INPUT, bias=Bias.PULL_UP, active_low=True)
        request = gpiod.request_lines(
            f"/dev/gpiochip{chip}", consumer="mault-sorter",
            config={(*self.ir_pins, self.hopper_pin): inputs},
        )
        self.close_gpio = request.release
        self.active = lambda pin: request.get_value(pin) == Value.ACTIVE

    def pwm(self, channel, pulse):
        self.bus.write_i2c_block_data(self.address, 0x06 + channel * 4,
                                     [0, 0, pulse & 255, pulse >> 8 if pulse else 0x10])

    def release(self):
        for channel in range(16):
            self.bus.write_byte_data(self.address, 0x09 + channel * 4, 0x10)

    def present(self, module):
        return self.active(self.ir_pins[module - 1])

    def hopper(self):
        return self.active(self.hopper_pin)

    def present_driver(self):
        try:
            self.bus.read_byte_data(self.address, 0x00)
            return True
        except OSError:
            return False

    def close(self):
        try:
            if self.bus is not None:
                try:
                    with contextlib.suppress(OSError):
                        self.release()
                finally:
                    self.bus.close()
                    self.bus = None
        finally:
            if self.close_gpio is not None:
                self.close_gpio()
                self.close_gpio = None
