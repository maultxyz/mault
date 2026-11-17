"""Exit 0 when a PCA9685 servo driver answers on the Raspberry Pi header I2C bus."""

import sys


def main():
    try:
        from smbus import SMBus

        with SMBus(1) as bus:
            bus.read_byte_data(0x40, 0x00)
    except Exception:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
