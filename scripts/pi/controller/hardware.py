import glob
import contextlib
import time


IR_PINS = (17, 27, 22, 24, 25)
HOPPER_PIN = 23


class Hardware:
    def __init__(self, chip=None, bus=1, address=0x40):
        import lgpio
        from smbus import SMBus

        self.gpio = lgpio
        self.handle = None
        self.bus = None
        self.address = address
        try:
            if chip is None:
                for path in sorted(glob.glob("/dev/gpiochip*")):
                    candidate = lgpio.gpiochip_open(int(path.split("gpiochip")[-1]))
                    if lgpio.gpio_get_chip_info(candidate)[3] == "pinctrl-rp1":
                        self.handle = candidate
                        break
                    lgpio.gpiochip_close(candidate)
                if self.handle is None:
                    raise RuntimeError("Pi 5 RP1 GPIO chip not found; use --gpio-chip after checking gpioinfo")
            else:
                self.handle = lgpio.gpiochip_open(chip)
            for pin in (*IR_PINS, HOPPER_PIN):
                lgpio.gpio_claim_input(self.handle, pin, lgpio.SET_PULL_UP)
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

    def pwm(self, channel, pulse):
        self.bus.write_i2c_block_data(self.address, 0x06 + channel * 4,
                                     [0, 0, pulse & 255, pulse >> 8 if pulse else 0x10])

    def release(self):
        for channel in range(16):
            self.bus.write_byte_data(self.address, 0x09 + channel * 4, 0x10)

    def present(self, module):
        return self.gpio.gpio_read(self.handle, IR_PINS[module - 1]) == 0

    def hopper(self):
        return self.gpio.gpio_read(self.handle, HOPPER_PIN) == 0

    def present_driver(self):
        try:
            self.bus.read_byte_data(self.address, 0x00)
            return True
        except OSError:
            return False

    def close(self):
        if self.bus is not None:
            try:
                with contextlib.suppress(OSError):
                    self.release()
            finally:
                self.bus.close()
                self.bus = None
        if self.handle is not None:
            self.gpio.gpiochip_close(self.handle)
            self.handle = None
