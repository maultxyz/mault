import argparse
import asyncio
import json

from .core import Controller
from .hardware import Hardware


async def run(arguments):
    preview = Controller(object(), arguments.config, "bench-test")
    if preview.stored is None:
        raise ValueError("Stored calibration is required before testing installed servos")
    print(f"Loaded {preview.count} calibrated modules; feeder channel {preview.feeder_channel}.")
    print("Sequence: staggered neutral; each module opens its bottom and paddle,")
    print("sweeps its pusher left/right, returns neutral and closes; feeder runs 500 ms.")
    if not arguments.run:
        print("Preview only. No hardware accessed. Use --run after clearing all cards and hands.")
        return
    hardware = Hardware()
    try:
        controller = Controller(hardware, arguments.config, "bench-test")

        async def emit(event):
            print(json.dumps(event), flush=True)

        response = await controller.command(dict(test=True), emit)
        print(json.dumps(response), flush=True)
        if response.get("status") != "test_complete":
            raise RuntimeError("Self-test did not complete")
    finally:
        hardware.close()


def main():
    parser = argparse.ArgumentParser(description="Calibrated, attended sorter self-test")
    parser.add_argument("--config", required=True)
    parser.add_argument("--run", action="store_true", help="move all modules and briefly run the feeder")
    arguments = parser.parse_args()
    asyncio.run(run(arguments))


if __name__ == "__main__":
    main()
