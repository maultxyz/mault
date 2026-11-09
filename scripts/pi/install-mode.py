import argparse
import os
import re
import shlex
from pathlib import Path

try:
    from scripts.pi.controller.hardware import BOARDS
except ModuleNotFoundError as error:
    if error.name != "scripts":
        raise
    # Direct execution from outside the checkout puts scripts/pi on sys.path.
    from controller.hardware import BOARDS


def read_settings(path):
    settings = {}
    for line in path.read_text().splitlines() if path.exists() else []:
        match = re.match(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$", line)
        if match:
            settings[match[1]] = " ".join(shlex.split(match[2], comments=True))
    return settings


def configure(path, choose=input):
    settings = read_settings(path)
    selection = settings.get("PI_SORTER", os.environ.get("PI_SORTER", "")).strip().lower()
    prompted_for_mode = not selection
    if prompted_for_mode:
        print("How will this sorter be controlled?")
        print("  1) This board directly, using GPIO and I2C")
        print("  2) A USB-connected Arduino or ESP32")
        while True:
            try:
                choice = choose("Select 1 or 2 [2]: ").strip()
            except EOFError as error:
                raise ValueError("No install choice available. Set PI_SORTER=1 for GPIO or PI_SORTER=0 for USB.") from error
            if choice in ("", "1", "2"):
                selection = "1" if choice == "1" else "0"
                break
    if selection not in ("1", "true", "on", "0", "false", "off"):
        raise ValueError("PI_SORTER must be 1 or 0")
    builtin = selection in ("1", "true", "on")
    updates = dict(PI_HOST="1", PI_SORTER="1" if builtin else "0")
    if builtin:
        board = settings.get("PI_SORTER_BOARD") or os.environ.get("PI_SORTER_BOARD", "")
        if not board and prompted_for_mode:
            print("Which board is wired directly to the sorter?")
            print("  1) Raspberry Pi")
            print("  2) Orange Pi Zero 4")
            while True:
                try:
                    choice = choose("Select 1 or 2 [1]: ").strip()
                except EOFError as error:
                    raise ValueError("Set PI_SORTER_BOARD=raspberry-pi or orange-pi-zero4.") from error
                if choice in ("", "1", "2"):
                    board = "orange-pi-zero4" if choice == "2" else "raspberry-pi"
                    break
        board = board or "raspberry-pi"
        if board not in BOARDS:
            raise ValueError("PI_SORTER_BOARD must be raspberry-pi or orange-pi-zero4")
        updates["PI_SORTER_BOARD"] = board
        updates["PI_CONTROLLER_SOCKET"] = settings.get("PI_CONTROLLER_SOCKET") or str(path.parent / ".pi-controller/controller.sock")
        updates["PI_CONTROLLER_CONFIG"] = settings.get("PI_CONTROLLER_CONFIG") or str(path.parent / ".pi-controller/calibration.json")
    for key in ("PI_CONTROLLER_SOCKET", "PI_CONTROLLER_CONFIG"):
        if key in updates and not Path(updates[key]).is_absolute():
            raise ValueError(f"{key} must be an absolute path")
        if key in updates and any(character in updates[key] for character in ("'", "\n", "\r")):
            raise ValueError(f"{key} cannot contain single quotes or line breaks")
    lines = path.read_text().splitlines() if path.exists() else []
    remaining = dict(updates)
    output = []
    for line in lines:
        match = re.match(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
        if match and match[1] in updates:
            if match[1] in remaining:
                output.append(f"{match[1]}='{remaining.pop(match[1])}'")
        else:
            output.append(line)
    output.extend(f"{key}='{value}'" for key, value in remaining.items())
    temporary = path.with_name(path.name + ".install-tmp")
    temporary.write_text("\n".join(output) + "\n")
    temporary.chmod(0o600)
    os.replace(temporary, path)
    print(f"[install] PI_HOST=1, PI_SORTER={updates['PI_SORTER']}")
    return builtin


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Select Pi sorter hardware on first install")
    parser.add_argument("--env", type=Path, required=True)
    output = parser.add_mutually_exclusive_group()
    output.add_argument("--print-mode", action="store_true")
    output.add_argument("--print-board", action="store_true")
    arguments = parser.parse_args()
    if arguments.print_mode:
        value = read_settings(arguments.env).get("PI_SORTER", "0").lower()
        print("gpio" if value in ("1", "true", "on") else "usb")
    elif arguments.print_board:
        print(read_settings(arguments.env).get("PI_SORTER_BOARD") or "raspberry-pi")
    else:
        configure(arguments.env.resolve())
