import importlib.util
from pathlib import Path
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("boot_config", SCRIPTS / "boot-config.py")
CONFIG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CONFIG)
TEMPLATE = (SCRIPTS / "mault-config.txt").read_text(encoding="utf-8")


def filled(**values):
    text = TEMPLATE
    for key, value in values.items():
        text = text.replace(f"\n{key}=\n", f"\n{key}={value}\n")
        text = text.replace(f"\n{key}=no\n", f"\n{key}={value}\n")
    return text


class RecordingRunner:
    def __init__(self):
        self.calls = []

    def __call__(self, arguments, input=None, check=True):
        self.calls.append((arguments, input))

    def commands(self):
        return [arguments[:2] for arguments, _ in self.calls]


def no_user(username):
    return None


def all_groups(names):
    return list(names)


class BootConfigTests(unittest.TestCase):
    def test_template_applies_nothing(self):
        runner = RecordingRunner()
        self.assertIsNone(CONFIG.apply(CONFIG.read_settings(TEMPLATE), runner, no_user, all_groups))
        self.assertEqual(runner.calls, [])

    def test_login_ssh_and_wifi_are_applied(self):
        settings = CONFIG.read_settings(filled(username="kenny", password="s3cret pass", ssh="yes",
                                               wifi_name="Home Net", wifi_password="wifipass1"))
        runner = RecordingRunner()
        result = CONFIG.apply(settings, runner, no_user, all_groups)
        self.assertEqual(result, "applied login kenny, SSH on, Wi-Fi Home Net")
        self.assertIn(["useradd", "--create-home"], runner.commands())
        self.assertIn((["chpasswd"], "kenny:s3cret pass\n"), runner.calls)
        self.assertIn(["systemctl", "enable", "ssh"], [call for call, _ in runner.calls])
        add = next(call for call, _ in runner.calls if call[:3] == ["nmcli", "connection", "add"])
        self.assertIn("Home Net", add)
        self.assertIn("wifipass1", add)

    def test_existing_user_only_changes_password_and_groups(self):
        settings = CONFIG.read_settings(filled(username="kenny", password="pw"))
        runner = RecordingRunner()
        CONFIG.apply(settings, runner, lambda name: 1001, all_groups)
        self.assertEqual(runner.commands(), [["usermod", "--append"], ["chpasswd"]])

    def test_invalid_settings_change_nothing(self):
        cases = [
            filled(username="mault-service", password="pw"),
            filled(username="Bad Name", password="pw"),
            filled(password="pw"),
            filled(ssh="maybe"),
            filled(wifi_name="Home", wifi_password="short"),
            filled(wifi_password="wifipass1"),
        ]
        for text in cases:
            runner = RecordingRunner()
            result = CONFIG.apply(CONFIG.read_settings(text), runner, no_user, all_groups)
            self.assertTrue(result.startswith("error:"), result)
            self.assertEqual(runner.calls, [])

    def test_system_accounts_are_refused(self):
        settings = CONFIG.read_settings(filled(username="daemon", password="pw"))
        result = CONFIG.apply(settings, RecordingRunner(), lambda name: 1, all_groups)
        self.assertIn("system account", result)

    def test_rewrite_erases_secrets_and_updates_status(self):
        text = filled(username="kenny", password="pw", wifi_name="Home", wifi_password="wifipass1")
        rewritten = CONFIG.rewrite(text, "applied login kenny")
        settings = CONFIG.read_settings(rewritten)
        self.assertEqual(settings["password"], "")
        self.assertEqual(settings["wifi_password"], "")
        self.assertEqual(settings["username"], "kenny")
        self.assertIn("# Status: applied login kenny", rewritten)
        self.assertNotIn("not applied yet", rewritten)

    def test_main_reads_windows_line_endings_and_writes_back(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "mault-config.txt"
            path.write_bytes(("﻿" + filled(username="kenny", password="pw", ssh="yes"))
                             .replace("\n", "\r\n").encode("utf-8"))
            runner = RecordingRunner()
            self.assertEqual(CONFIG.main(path, runner, no_user, all_groups), 0)
            settings = CONFIG.read_settings(path.read_text(encoding="utf-8"))
            self.assertEqual(settings["password"], "")
            self.assertIn((["chpasswd"], "kenny:pw\n"), runner.calls)

    def test_missing_file_is_ignored(self):
        self.assertEqual(CONFIG.main(Path(tempfile.gettempdir()) / "no-such-mault-config.txt"), 0)


if __name__ == "__main__":
    unittest.main()
