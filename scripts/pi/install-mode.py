import argparse
import ipaddress
import os
import re
import shlex
from pathlib import Path
from urllib.parse import urlsplit

try:
    from scripts.pi.controller.hardware import BOARDS
except ModuleNotFoundError as error:
    if error.name != "scripts":
        raise
    # Direct execution from outside the checkout puts scripts/pi on sys.path.
    from controller.hardware import BOARDS


HOSTED_LINK_URL = "https://mault.xyz/api"
HOSTING_CHOICES = {"hosted": "hosted", "mault.xyz": "hosted", "self": "self", "self-hosted": "self"}


def read_settings(path):
    settings = {}
    for line in path.read_text().splitlines() if path.exists() else []:
        match = re.match(r"\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$", line)
        if match:
            settings[match[1]] = " ".join(shlex.split(match[2], comments=True))
    return settings


def choose_hosting(settings, choose, existing_install):
    selection = settings.get("MAULT_HOSTING") or os.environ.get("MAULT_HOSTING", "")
    selection = selection.strip().lower()
    if not selection and existing_install:
        return "self"
    if not selection:
        print("Where should this sorter keep your cards?")
        print("  1) Your Mault account at mault.xyz (recommended)")
        print("  2) A database on this board, with its own accounts")
        while True:
            try:
                choice = choose("Select 1 or 2 [1]: ").strip()
            except EOFError as error:
                raise ValueError("No hosting choice available. Set MAULT_HOSTING=hosted or MAULT_HOSTING=self.") from error
            if choice in ("", "1", "2"):
                return "self" if choice == "2" else "hosted"
    if selection not in HOSTING_CHOICES:
        raise ValueError("MAULT_HOSTING must be hosted or self")
    return HOSTING_CHOICES[selection]


def is_local_host(host):
    if host == "localhost" or host.endswith(".local"):
        return True
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    return address.is_private or address.is_loopback


def hosted_link_url(settings):
    url = (os.environ.get("MAULT_LINK_URL") or settings.get("MAULT_LINK_URL") or HOSTED_LINK_URL).strip()
    if not re.fullmatch(r"https?://[A-Za-z0-9.:\-]+(/[A-Za-z0-9._~/-]*)?", url):
        raise ValueError("MAULT_LINK_URL must be an http(s) address")
    if url.startswith("http://") and not is_local_host(urlsplit(url).hostname or ""):
        raise ValueError("MAULT_LINK_URL must use https unless it points at this network")
    return url.rstrip("/")


def configure(path, choose=input, existing_install=False):
    settings = read_settings(path)
    hosting = choose_hosting(settings, choose, existing_install)
    selection = settings.get("PI_SORTER", os.environ.get("PI_SORTER", "")).strip().lower()
    prompted_for_mode = not selection
    if prompted_for_mode:
        print("How will this sorter be controlled?")
        print("  1) This board directly, using GPIO and I2C")
        print("  2) An Arduino or ESP32 over USB or Bluetooth")
        while True:
            try:
                choice = choose("Select 1 or 2 [2]: ").strip()
            except EOFError as error:
                raise ValueError("No install choice available. Set PI_SORTER=1 for GPIO or PI_SORTER=0 for USB/Bluetooth.") from error
            if choice in ("", "1", "2"):
                selection = "1" if choice == "1" else "0"
                break
    if selection not in ("1", "true", "on", "0", "false", "off"):
        raise ValueError("PI_SORTER must be 1 or 0")
    builtin = selection in ("1", "true", "on")
    updates = dict(PI_HOST="1", MAULT_HOSTING=hosting, PI_SORTER="1" if builtin else "0")
    removals = set()
    if hosting == "hosted":
        updates["MAULT_LINK_URL"] = hosted_link_url(settings)
    else:
        removals.add("MAULT_LINK_URL")
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
        if match and match[1] in removals:
            continue
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
    print(f"[install] PI_HOST=1, MAULT_HOSTING={hosting}, PI_SORTER={updates['PI_SORTER']}")
    return builtin


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Select Pi sorter hardware on first install")
    parser.add_argument("--env", type=Path, required=True)
    output = parser.add_mutually_exclusive_group()
    output.add_argument("--print-mode", action="store_true")
    output.add_argument("--print-board", action="store_true")
    output.add_argument("--print-hosting", action="store_true")
    parser.add_argument("--existing-install", action="store_true")
    arguments = parser.parse_args()
    if arguments.print_mode:
        value = read_settings(arguments.env).get("PI_SORTER", "0").lower()
        print("gpio" if value in ("1", "true", "on") else "usb")
    elif arguments.print_board:
        print(read_settings(arguments.env).get("PI_SORTER_BOARD") or "raspberry-pi")
    elif arguments.print_hosting:
        print(read_settings(arguments.env).get("MAULT_HOSTING") or "self")
    else:
        configure(arguments.env.resolve(), existing_install=arguments.existing_install)
