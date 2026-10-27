import os
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


UPDATER = Path(__file__).resolve().parents[1] / "update.sh"


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.source.mkdir()
        self.git(self.source, "init", "--initial-branch=pi-host")
        self.git(self.source, "config", "user.name", "Update test")
        self.git(self.source, "config", "user.email", "update@example.invalid")
        scripts = self.source / "scripts/pi"
        scripts.mkdir(parents=True)
        shutil.copyfile(UPDATER, scripts / "update.sh")
        shutil.copyfile(UPDATER.parent / "install-services.mjs", scripts / "install-services.mjs")
        (scripts / "session.sh").write_text("pi_require_user() { :; }\npi_ensure_user_bus() { :; }\n")
        for name in ["api", "web", "camera"]:
            shutil.copyfile(UPDATER.parent / f"mault-{name}.service", scripts / f"mault-{name}.service")
        (self.source / ".gitignore").write_text(".env\n")
        (self.source / "package.json").write_text('{"version":"1.0.0"}\n')
        self.git(self.source, "add", ".")
        self.git(self.source, "commit", "-m", "Initial installation")
        self.repo = self.root / "projects/mault-pi-host"
        self.repo.parent.mkdir()
        self.git(self.root, "clone", str(self.source), str(self.repo))
        (self.repo / ".env").write_text("PI_HOST=1\n")
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.log = self.root / "commands.log"
        self.env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}",
                        XDG_CONFIG_HOME=str(self.root / "config"), UPDATE_TEST_LOG=str(self.log),
                        UPDATE_TEST_NODE=shutil.which("node"))
        for name in ["pnpm", "systemctl", "curl", "node", "sleep"]:
            script = self.bin / name
            script.write_text(
                '#!/bin/bash\nprintf "%s %s\\n" "${0##*/}" "$*" >> "$UPDATE_TEST_LOG"\n'
                'if [[ "${0##*/}" == curl && "${UPDATE_TEST_CURL_FAILURE:-}" != "" ]]; then\n'
                '  if [[ "$*" == *S* ]]; then echo "curl: (7) Failed to connect" >&2; fi\n'
                '  if [[ "$UPDATE_TEST_CURL_FAILURE" == always || ! -f "$UPDATE_TEST_LOG.retry" ]]; then\n'
                '    touch "$UPDATE_TEST_LOG.retry"; exit 7\n'
                '  fi\n'
                'fi\n'
                'if [[ "${0##*/}" == systemctl && "${UPDATE_TEST_UNLOADED:-}" == 1 ]]; then\n'
                '  if [[ "$*" == *is-failed* ]]; then exit 3; fi\n'
                '  if [[ "$*" == *reset-failed* ]]; then echo "Unit not loaded" >&2; exit 1; fi\n'
                'fi\n'
                'if [[ "${0##*/}" == node && "$1" == */install-services.mjs ]]; then exec "$UPDATE_TEST_NODE" "$@"; fi\n'
                'if [[ "${0##*/}" == pnpm && "${FAIL_BUILD:-}" == 1 && "$*" == *build* ]]; then exit 1; fi\n'
                'if [[ "${0##*/}" == node ]]; then echo 1.0.1; fi\n'
            )
            script.chmod(0o755)

    def git(self, directory, *args):
        return subprocess.run(["git", "-C", str(directory), *args], check=True,
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()

    def publish(self):
        (self.source / "package.json").write_text('{"version":"1.0.1"}\n')
        self.git(self.source, "commit", "-am", "Release update")

    def update(self):
        return subprocess.run(["bash", "scripts/pi/update.sh"], cwd=self.repo, env=self.env,
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    def test_update_builds_before_starting_and_refreshes_units(self):
        self.publish()
        result = self.update()
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(self.git(self.repo, "rev-parse", "HEAD"), self.git(self.source, "rev-parse", "HEAD"))
        calls = self.log.read_text()
        self.assertLess(calls.index("systemctl --user stop"), calls.index("pnpm install --frozen-lockfile"))
        self.assertLess(calls.index("@magic-vault/web build"), calls.index("systemctl --user start"))
        self.assertIn("systemctl --user daemon-reload", calls)
        self.assertIn("is-active --quiet mault-camera.service", calls)
        self.assertTrue((self.root / "config/systemd/user/mault-api.service").exists())
        self.assertEqual((self.repo / ".env").read_text(), "PI_HOST=1\n")
        units = self.root / "config/systemd/user"
        api = (units / "mault-api.service").read_text()
        web = (units / "mault-web.service").read_text()
        camera = (units / "mault-camera.service").read_text()
        self.assertIn(f'WorkingDirectory={self.repo}/.', api)
        self.assertIn(f'ExecStart=/bin/bash "{self.repo}/scripts/pi/run-api.sh"', api)
        self.assertIn(f'WorkingDirectory={self.repo}/packages/web/.', web)
        self.assertIn(f'ExecStart=/usr/bin/python3 "{self.repo}/scripts/pi/camera-ctl.py"', camera)
        self.assertNotIn("%h/mault", api + web + camera)
        for unit in ["mault-web.service", "mault-api.service", "mault-camera.service"]:
            self.assertIn(f"systemctl --user reset-failed {unit}", calls)

    def test_unloaded_units_do_not_prevent_service_start(self):
        self.publish()
        self.env["UPDATE_TEST_UNLOADED"] = "1"
        result = self.update()
        self.assertEqual(result.returncode, 0, result.stdout)
        calls = self.log.read_text()
        self.assertNotIn("reset-failed", calls)
        self.assertIn("systemctl --user start --no-block", calls)

    def test_startup_connection_failure_is_quiet_and_retried(self):
        self.env["UPDATE_TEST_CURL_FAILURE"] = "once"
        result = self.update()
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertNotIn("curl: (7)", result.stdout)
        self.assertIn("is running. Reload your browsers.", result.stdout)
        self.assertEqual(self.log.read_text().count("http://127.0.0.1:3001/public/version"), 2)

    def test_startup_timeout_still_reports_failure_and_service_status(self):
        self.env["UPDATE_TEST_CURL_FAILURE"] = "always"
        result = self.update()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("curl: (7)", result.stdout)
        self.assertIn("Services did not become ready", result.stdout)
        self.assertNotIn("is running. Reload your browsers.", result.stdout)
        self.assertIn("systemctl --user --no-pager --full status", self.log.read_text())

    def test_service_paths_escape_spaces_and_systemd_expansions(self):
        destination = self.root / 'Mault beta % $HOME "test"'
        self.repo.rename(destination)
        self.repo = destination
        self.publish()
        result = self.update()
        self.assertEqual(result.returncode, 0, result.stdout)
        units = self.root / "config/systemd/user"
        working = str(self.repo).replace('%', '%%')
        executable = working.replace('"', '\\"').replace('$', '$$')
        api = (units / "mault-api.service").read_text()
        self.assertIn(f'WorkingDirectory={working}/.', api)
        self.assertIn(f'ExecStart=/bin/bash "{executable}/scripts/pi/run-api.sh"', api)
        self.assertEqual((self.repo / ".env").read_text(), "PI_HOST=1\n")

    def test_dirty_checkout_does_not_stop_services(self):
        (self.repo / "local-work.txt").write_text("Keep this work")
        result = self.update()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Local changes found", result.stdout)
        self.assertFalse(self.log.exists())

    def test_detached_checkout_does_not_stop_services(self):
        self.git(self.repo, "checkout", "--detach")
        result = self.update()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Check out the installed branch", result.stdout)
        self.assertFalse(self.log.exists())

    def test_tracked_changes_are_preserved(self):
        changed = '{"version":"local"}\n'
        (self.repo / "package.json").write_text(changed)
        result = self.update()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.repo / "package.json").read_text(), changed)
        self.assertFalse(self.log.exists())

    def test_missing_upstream_does_not_stop_services(self):
        self.git(self.repo, "branch", "--unset-upstream")
        result = self.update()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no tracking branch", result.stdout)
        self.assertFalse(self.log.exists())

    def test_local_commits_do_not_get_overwritten(self):
        self.publish()
        self.git(self.repo, "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                 "commit", "--allow-empty", "-m", "Local work")
        before = self.git(self.repo, "rev-parse", "HEAD")
        result = self.update()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Local commits differ", result.stdout)
        self.assertEqual(self.git(self.repo, "rev-parse", "HEAD"), before)
        self.assertFalse(self.log.exists())

    def test_failed_build_never_starts_services(self):
        self.publish()
        self.env["FAIL_BUILD"] = "1"
        result = self.update()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Update failed", result.stdout)
        self.assertNotIn("systemctl --user start", self.log.read_text())

    def test_background_runner_persists_success_and_failure(self):
        self.bin.joinpath("node").unlink()
        runner = self.repo / "scripts/pi/run-update.sh"
        shutil.copyfile(UPDATER.parent / "run-update.sh", runner)
        state_home = self.root / "state"
        directory = state_home / "mault"
        directory.mkdir(parents=True)
        state = directory / "update.json"
        self.env["XDG_STATE_HOME"] = str(state_home)
        for code, expected in [(0, "succeeded"), (1, "failed")]:
            with self.subTest(code=code):
                state.write_text(json.dumps({"phase": "running", "startedAt": 123, "message": None}))
                (self.repo / "scripts/pi/update.sh").write_text(f"#!/bin/bash\nexit {code}\n")
                result = subprocess.run(["bash", str(runner)], cwd=self.repo, env=self.env)
                self.assertEqual(result.returncode, code)
                saved = json.loads(state.read_text())
                self.assertEqual(saved["phase"], expected)
                self.assertEqual(saved["startedAt"], 123)
                self.assertEqual(state.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
