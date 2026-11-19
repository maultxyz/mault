import importlib.util
import io
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "install-user-agent.py"
SPEC = importlib.util.spec_from_file_location("install_user_agent", SCRIPT)
AGENT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AGENT)


class InstallUserAgentTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / ".env"
        self.path.write_text("AUTH_PROVIDER=local\nOTHER_SETTING=preserved\n")
        environment = patch.dict(os.environ, {"CARD_API_USER_AGENT": ""})
        environment.start()
        self.addCleanup(environment.stop)
        output = redirect_stdout(io.StringIO())
        output.__enter__()
        self.addCleanup(output.__exit__, None, None, None)

    def value(self):
        for line in self.path.read_text().splitlines():
            match = AGENT.SETTING.fullmatch(line)
            if match:
                return " ".join(shlex.split(match[1], comments=True))
        return None

    def test_prompts_for_custom_name_and_keeps_other_settings_private(self):
        self.assertEqual(AGENT.configure(self.path, choose=lambda _: "CardRoom Pi/1.0"), "CardRoom Pi/1.0")
        self.assertEqual(self.value(), "CardRoom Pi/1.0")
        self.assertIn("OTHER_SETTING=preserved\n", self.path.read_text())
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)

    def test_enter_accepts_a_unique_generated_default(self):
        with patch.object(AGENT.socket, "gethostname", return_value="cardscan"), patch.object(AGENT.secrets, "token_hex", return_value="1234abcd"):
            AGENT.configure(self.path, choose=lambda _: "")
        self.assertEqual(self.value(), "Mault-cardscan-1234abcd/1.0")

    def test_reruns_preserve_existing_agent_without_prompt_or_rewrite(self):
        self.path.write_text("CARD_API_USER_AGENT='Saved Pi/1.0'\nOTHER=keep\n")
        original = self.path.read_bytes()
        AGENT.configure(self.path, choose=lambda _: self.fail("unexpected prompt"))
        self.assertEqual(self.path.read_bytes(), original)

    def test_shared_default_is_replaced_with_the_chosen_name(self):
        for default in ("Mault-SelfHosted/1.0", "Mault-NewSelfHosted/1.0"):
            with self.subTest(default=default):
                self.path.write_text(f"CARD_API_USER_AGENT={default}\n")
                AGENT.configure(self.path, choose=lambda _: "My unique install")
                self.assertEqual(self.value(), "My unique install")

    def test_environment_value_supports_unattended_install(self):
        with patch.dict(os.environ, {"CARD_API_USER_AGENT": "Unattended-Pi/1.0"}):
            AGENT.configure(self.path, choose=lambda _: self.fail("unexpected prompt"))
        self.assertEqual(self.value(), "Unattended-Pi/1.0")

    def test_saved_name_takes_precedence_over_environment_on_rerun(self):
        self.path.write_text("CARD_API_USER_AGENT='Saved-Pi/1.0'\n")
        with patch.dict(os.environ, {"CARD_API_USER_AGENT": "Different"}):
            AGENT.configure(self.path, choose=lambda _: self.fail("unexpected prompt"))
        self.assertEqual(self.value(), "Saved-Pi/1.0")

    def test_missing_noninteractive_input_leaves_env_unchanged(self):
        original = self.path.read_bytes()
        def no_input(_):
            raise EOFError
        with self.assertRaisesRegex(ValueError, "Set CARD_API_USER_AGENT"):
            AGENT.configure(self.path, choose=no_input)
        self.assertEqual(self.path.read_bytes(), original)

    def test_invalid_header_input_is_reprompted(self):
        answers = iter(["Bad\x00name", "Valid-Pi/1.0"])
        AGENT.configure(self.path, choose=lambda _: next(answers))
        self.assertEqual(self.value(), "Valid-Pi/1.0")

    def test_invalid_environment_value_does_not_modify_env(self):
        original = self.path.read_bytes()
        with patch.dict(os.environ, {"CARD_API_USER_AGENT": "Bad\nname"}):
            with self.assertRaisesRegex(ValueError, "printable ASCII"):
                AGENT.configure(self.path)
        self.assertEqual(self.path.read_bytes(), original)

    def test_replaces_duplicate_empty_or_default_entries_once(self):
        self.path.write_text("export CARD_API_USER_AGENT=''\nOTHER=keep\nCARD_API_USER_AGENT=Mault-SelfHosted/1.0\n")
        AGENT.configure(self.path, choose=lambda _: "Unique-Pi")
        self.assertEqual(self.path.read_text().count("CARD_API_USER_AGENT="), 1)
        self.assertEqual(self.value(), "Unique-Pi")
        self.assertIn("OTHER=keep", self.path.read_text())

    def test_shell_and_node_read_special_characters_literally(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node is needed for the env-file compatibility check")
        for value in ['Mault "quoted" $HOME $(printf injected) `printf injected` #1/1.0', "John's Pi/1.0"]:
            self.path.write_text("OTHER=keep\n")
            AGENT.configure(self.path, choose=lambda _, value=value: value)
            shell = subprocess.run(["bash", "-c", 'source "$1"; printf "%s" "$CARD_API_USER_AGENT"', "test", str(self.path)], capture_output=True, text=True, check=True)
            self.assertEqual(shell.stdout, value)
            node_environment = {key: content for key, content in os.environ.items() if key != "CARD_API_USER_AGENT"}
            result = subprocess.run([node, "--max-old-space-size=64", f"--env-file={self.path}", "-p", "JSON.stringify(process.env.CARD_API_USER_AGENT)"], env=node_environment, capture_output=True, text=True, check=True)
            self.assertEqual(json.loads(result.stdout), value)

    def test_cli_reads_interactive_input(self):
        result = subprocess.run(["python3", str(SCRIPT), "--env", str(self.path)], input="CLI-Pi/1.0\n", capture_output=True, text=True, check=True)
        self.assertIn("CARD_API_USER_AGENT [", result.stdout)
        self.assertEqual(self.value(), "CLI-Pi/1.0")

    def test_setup_saves_a_generated_name_before_starting_services(self):
        setup = SCRIPT.with_name("setup.sh").read_text()
        call = 'as_service_user python3 "$SCRIPTS/install-user-agent.py" --env "$ENV_FILE"'
        self.assertIn(call, setup)
        self.assertLess(setup.index('CARD_API_USER_AGENT="Mault-'), setup.index(call))
        self.assertLess(setup.index(call), setup.index('install-services.mjs'))

if __name__ == "__main__":
    unittest.main()
