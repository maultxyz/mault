import importlib.util
import os
from pathlib import Path
import tempfile
import subprocess
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "install-mode.py"
SPEC = importlib.util.spec_from_file_location("install_mode", SCRIPT)
MODE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODE)


class InstallModeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / ".env"
        self.path.write_text("PI_HOST=0\nOTHER_SETTING=preserved\n")
        environment = patch.dict(os.environ, {"PI_SORTER": "", "MAULT_HOSTING": "self", "MAULT_LINK_URL": ""})
        environment.start()
        self.addCleanup(environment.stop)

    def test_first_install_gpio_choice_sets_host_and_private_paths(self):
        self.assertTrue(MODE.configure(self.path, choose=lambda prompt: "1"))
        settings = MODE.read_settings(self.path)
        self.assertEqual(settings["PI_HOST"], "1")
        self.assertEqual(settings["PI_SORTER"], "1")
        self.assertEqual(settings["OTHER_SETTING"], "preserved")
        self.assertEqual(settings["PI_CONTROLLER_CONFIG"], str(self.path.parent / ".pi-controller/calibration.json"))
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)

    def test_usb_default_does_not_add_controller_paths(self):
        self.assertFalse(MODE.configure(self.path, choose=lambda prompt: ""))
        settings = MODE.read_settings(self.path)
        self.assertEqual(settings["PI_SORTER"], "0")
        self.assertEqual(settings["PI_HOST"], "1")
        self.assertNotIn("PI_CONTROLLER_SOCKET", settings)

    def test_rerun_preserves_choice_and_calibration_location_without_prompt(self):
        self.path.write_text('PI_SORTER=1\nPI_CONTROLLER_CONFIG="/tmp/custom config.json"\n')
        MODE.configure(self.path, choose=lambda prompt: self.fail("unexpected prompt"))
        self.assertEqual(MODE.read_settings(self.path)["PI_CONTROLLER_CONFIG"], "/tmp/custom config.json")

    def test_headless_mode_requires_explicit_choice(self):
        def no_input(prompt):
            raise EOFError
        original = self.path.read_text()
        with self.assertRaisesRegex(ValueError, "Set PI_SORTER"):
            MODE.configure(self.path, choose=no_input)
        self.assertEqual(self.path.read_text(), original)

    def test_invalid_choice_or_relative_socket_does_not_change_env(self):
        self.path.write_text("PI_SORTER=1\nPI_CONTROLLER_SOCKET=relative.sock\n")
        original = self.path.read_text()
        with self.assertRaisesRegex(ValueError, "absolute"):
            MODE.configure(self.path)
        self.assertEqual(self.path.read_text(), original)

    def test_generated_paths_are_literal_when_env_is_loaded_by_shell(self):
        directory = self.path.parent / 'path with $HOME and `printf injected`'
        directory.mkdir()
        path = directory / ".env"
        MODE.configure(path, choose=lambda prompt: "1")
        result = subprocess.run(["bash", "-c", 'source "$1"; printf "%s" "$PI_CONTROLLER_SOCKET"', "test", str(path)],
                                capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout, str(directory / ".pi-controller/controller.sock"))



class HostingChoiceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / ".env"
        self.path.write_text("DATABASE_URL=postgresql://local\nPI_SORTER=0\n")
        environment = patch.dict(os.environ, {"PI_SORTER": "", "MAULT_HOSTING": "", "MAULT_LINK_URL": ""})
        environment.start()
        self.addCleanup(environment.stop)

    def test_first_install_recommends_mault_xyz(self):
        prompts = []
        MODE.configure(self.path, choose=lambda prompt: prompts.append(prompt) or "")
        settings = MODE.read_settings(self.path)
        self.assertEqual(prompts, ["Select 1 or 2 [1]: "])
        self.assertEqual(settings["MAULT_HOSTING"], "hosted")
        self.assertEqual(settings["MAULT_LINK_URL"], "https://mault.xyz/api")
        self.assertEqual(settings["DATABASE_URL"], "postgresql://local")

    def test_choosing_this_board_removes_the_link(self):
        self.path.write_text("PI_SORTER=0\nMAULT_LINK_URL='https://mault.xyz/api'\n")
        MODE.configure(self.path, choose=lambda prompt: "2")
        settings = MODE.read_settings(self.path)
        self.assertEqual(settings["MAULT_HOSTING"], "self")
        self.assertNotIn("MAULT_LINK_URL", settings)

    def test_existing_install_without_a_choice_stays_self_hosted(self):
        MODE.configure(self.path, choose=lambda prompt: self.fail("unexpected prompt"), existing_install=True)
        self.assertEqual(MODE.read_settings(self.path)["MAULT_HOSTING"], "self")

    def test_stored_choice_is_kept_without_prompting(self):
        self.path.write_text("PI_SORTER=0\nMAULT_HOSTING=hosted\nMAULT_LINK_URL=https://dev.mault.example/api\n")
        MODE.configure(self.path, choose=lambda prompt: self.fail("unexpected prompt"), existing_install=True)
        settings = MODE.read_settings(self.path)
        self.assertEqual(settings["MAULT_HOSTING"], "hosted")
        self.assertEqual(settings["MAULT_LINK_URL"], "https://dev.mault.example/api")

    def test_headless_install_requires_a_hosting_choice(self):
        def no_input(prompt):
            raise EOFError
        original = self.path.read_text()
        with self.assertRaisesRegex(ValueError, "MAULT_HOSTING"):
            MODE.configure(self.path, choose=no_input)
        self.assertEqual(self.path.read_text(), original)

    def test_environment_choice_and_link_address_are_used(self):
        with patch.dict(os.environ, {"MAULT_HOSTING": "mault.xyz", "MAULT_LINK_URL": "http://192.168.1.5:8080/api/"}):
            MODE.configure(self.path, choose=lambda prompt: self.fail("unexpected prompt"))
        settings = MODE.read_settings(self.path)
        self.assertEqual(settings["MAULT_HOSTING"], "hosted")
        self.assertEqual(settings["MAULT_LINK_URL"], "http://192.168.1.5:8080/api")

    def test_invalid_choice_or_address_does_not_change_env(self):
        original = self.path.read_text()
        with patch.dict(os.environ, {"MAULT_HOSTING": "cloud"}):
            with self.assertRaisesRegex(ValueError, "hosted or self"):
                MODE.configure(self.path)
        with patch.dict(os.environ, {"MAULT_HOSTING": "hosted", "MAULT_LINK_URL": "https://x.example/api'; rm -rf /"}):
            with self.assertRaisesRegex(ValueError, "http"):
                MODE.configure(self.path)
        self.assertEqual(self.path.read_text(), original)

    def test_plain_http_is_only_accepted_on_the_local_network(self):
        original = self.path.read_text()
        with patch.dict(os.environ, {"MAULT_HOSTING": "hosted", "MAULT_LINK_URL": "http://mault.example/api"}):
            with self.assertRaisesRegex(ValueError, "https"):
                MODE.configure(self.path)
        self.assertEqual(self.path.read_text(), original)
        with patch.dict(os.environ, {"MAULT_HOSTING": "hosted", "MAULT_LINK_URL": "http://mault.local:8080/api"}):
            MODE.configure(self.path, choose=lambda prompt: self.fail("unexpected prompt"))
        self.assertEqual(MODE.read_settings(self.path)["MAULT_LINK_URL"], "http://mault.local:8080/api")

    def test_print_hosting_reads_the_stored_choice(self):
        self.path.write_text("MAULT_HOSTING=hosted\n")
        result = subprocess.run(["python3" if os.name != "nt" else "python", str(SCRIPT), "--env", str(self.path), "--print-hosting"],
                                capture_output=True, text=True, check=True, cwd=SCRIPT.parent)
        self.assertEqual(result.stdout.strip(), "hosted")


if __name__ == "__main__":
    unittest.main()
