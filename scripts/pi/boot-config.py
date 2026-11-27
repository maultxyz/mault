#!/usr/bin/env python3
# Applies the login, SSH and Wi-Fi settings from mault-config.txt on the SD
# card's boot partition (mault-boot-config.service, every boot, as root, with
# python3 -I from /usr/local/lib/mault, never from a release).
# Raspberry Pi Imager doesn't offer OS customisation for custom images, so this
# file is how an image owner gets a login. Applied passwords are erased from
# the file and a Status line records the result, readable from any computer.
# hosting= is read once by setup.sh on first boot (--print-hosting).
import datetime
import re
import subprocess
import sys
from pathlib import Path

DEFAULT_PATH = Path("/boot/firmware/mault-config.txt")
SECRET_KEYS = ("password", "wifi_password")
USERNAME_PATTERN = re.compile(r"[a-z][a-z0-9_-]{0,31}")
COUNTRY_PATTERN = re.compile(r"[A-Z]{2}")
RESERVED_USERNAMES = {"root", "mault-service"}
FIRST_REGULAR_UID = 1000
LOGIN_GROUPS = ("sudo", "adm", "video", "dialout", "gpio", "i2c", "plugdev", "netdev", "bluetooth")
WIFI_CONNECTION_NAME = "mault-wifi"
STATUS_PREFIX = "# Status:"
SETTING = re.compile(r"\s*([a-z_]+)\s*=(.*)")
HOSTING_CHOICES = {"mault.xyz": "hosted", "hosted": "hosted", "self": "self", "self-hosted": "self"}


def read_settings(text):
    settings = {}
    for line in text.splitlines():
        match = SETTING.fullmatch(line)
        if match:
            settings[match[1]] = match[2].strip()
    return settings


def hosting_choice(settings):
    value = settings.get("hosting", "").strip().lower()
    return HOSTING_CHOICES.get(value) if value else None


def rewrite(text, status):
    lines = []
    for line in text.splitlines():
        match = SETTING.fullmatch(line)
        if match and match[1] in SECRET_KEYS:
            line = f"{match[1]}="
        elif line.startswith(STATUS_PREFIX):
            line = f"{STATUS_PREFIX} {status}"
        lines.append(line)
    if not any(line.startswith(STATUS_PREFIX) for line in lines):
        lines.insert(0, f"{STATUS_PREFIX} {status}")
    return "\n".join(lines) + "\n"


def user_uid(username):
    import pwd

    try:
        return pwd.getpwnam(username).pw_uid
    except KeyError:
        return None


def existing_groups(names):
    import grp

    found = []
    for name in names:
        try:
            grp.getgrnam(name)
            found.append(name)
        except KeyError:
            pass
    return found


def validate(settings, uid_of=user_uid):
    errors = []
    username = settings.get("username", "")
    password = settings.get("password", "")
    if password and not username:
        errors.append("password is set but username is empty")
    if username and password:
        if not USERNAME_PATTERN.fullmatch(username) or username in RESERVED_USERNAMES:
            errors.append(f"username {username!r} isn't allowed")
        else:
            uid = uid_of(username)
            if uid is not None and uid < FIRST_REGULAR_UID:
                errors.append(f"username {username!r} is a system account")
    if settings.get("hosting", "").strip() and hosting_choice(settings) is None:
        errors.append("hosting must be mault.xyz or self")
    if settings.get("ssh", "no").lower() not in ("yes", "no", ""):
        errors.append("ssh must be yes or no")
    wifi_name = settings.get("wifi_name", "")
    wifi_password = settings.get("wifi_password", "")
    if wifi_password and not wifi_name:
        errors.append("wifi_password is set but wifi_name is empty")
    if wifi_name and wifi_password:
        if not 8 <= len(wifi_password) <= 63:
            errors.append("wifi_password must be 8 to 63 characters")
        if not COUNTRY_PATTERN.fullmatch(settings.get("wifi_country", "").upper()):
            errors.append("wifi_country must be a two-letter country code")
    return errors


def apply_login(username, password, run, uid_of=user_uid, groups_of=existing_groups):
    groups = ",".join(groups_of(LOGIN_GROUPS))
    if uid_of(username) is None:
        run(["useradd", "--create-home", "--shell", "/bin/bash", "--groups", groups, username])
    else:
        run(["usermod", "--append", "--groups", groups, username])
    run(["chpasswd"], input=f"{username}:{password}\n")


def apply_ssh(run):
    run(["systemctl", "enable", "ssh"])
    run(["systemctl", "start", "--no-block", "ssh"])


def apply_wifi(name, password, country, run):
    run(["raspi-config", "nonint", "do_wifi_country", country], check=False)
    run(["rfkill", "unblock", "wifi"], check=False)
    run(["nmcli", "connection", "delete", WIFI_CONNECTION_NAME], check=False)
    run(["nmcli", "connection", "add", "type", "wifi", "con-name", WIFI_CONNECTION_NAME,
         "ifname", "wlan0", "ssid", name, "wifi-sec.key-mgmt", "wpa-psk", "wifi-sec.psk", password,
         "connection.autoconnect", "yes"])
    run(["nmcli", "--wait", "20", "connection", "up", WIFI_CONNECTION_NAME], check=False)


def system_run(arguments, input=None, check=True):
    return subprocess.run(arguments, input=input, text=True, check=check,
                          stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def apply(settings, run=system_run, uid_of=user_uid, groups_of=existing_groups):
    errors = validate(settings, uid_of)
    if errors:
        return "error: " + "; ".join(errors)
    applied = []
    username = settings.get("username", "")
    password = settings.get("password", "")
    if username and password:
        apply_login(username, password, run, uid_of, groups_of)
        applied.append(f"login {username}")
    if settings.get("ssh", "no").lower() == "yes":
        apply_ssh(run)
        applied.append("SSH on")
    wifi_name = settings.get("wifi_name", "")
    wifi_password = settings.get("wifi_password", "")
    if wifi_name and wifi_password:
        apply_wifi(wifi_name, wifi_password, settings["wifi_country"].upper(), run)
        applied.append(f"Wi-Fi {wifi_name}")
    return "applied " + ", ".join(applied) if applied else None


def main(path, run=system_run, uid_of=user_uid, groups_of=existing_groups):
    if not path.is_file():
        return 0
    text = path.read_text(encoding="utf-8-sig")
    try:
        result = apply(read_settings(text), run, uid_of, groups_of)
    except subprocess.CalledProcessError as error:
        result = f"error: {' '.join(error.cmd[:2])} failed ({(error.stderr or '').strip()[:200]})"
    if result is None:
        return 0
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    path.write_text(rewrite(text, f"{result} ({stamp})"), encoding="utf-8")
    print(f"[boot-config] {result}")
    return 1 if result.startswith("error") else 0


def print_hosting(path):
    if path.is_file():
        print(hosting_choice(read_settings(path.read_text(encoding="utf-8-sig"))) or "")
    return 0


if __name__ == "__main__":
    if sys.argv[1:2] == ["--print-hosting"]:
        sys.exit(print_hosting(Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_PATH))
    sys.exit(main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH))
