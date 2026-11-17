import getpass
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1]
RELEASE_FILES = ("update.sh", "install.sh", "run-update.sh", "install-services.mjs", "controller-ready.mjs",
                 "mault-api.service", "mault-camera.service", "mault-controller.service",
                 "mault-prices.service", "mault-prices.timer")
FAKE_SYSTEMCTL = """#!/bin/bash
echo "systemctl $*" >> "$CALL_LOG"
"""
FAKE_CURL = """#!/bin/bash
echo "curl $* current=$(readlink -f "$MAULT_HOME/current")" >> "$CALL_LOG"
for argument in "$@"; do
  case "$argument" in
    *manifest.json) printf '{"version":"%s","bundle":"bundle.tar.gz","sha256":"unused"}' "$LATEST_VERSION"; exit 0 ;;
  esac
done
if [[ -n "${BROKEN_VERSION:-}" && "$(readlink -f "$MAULT_HOME/current")" == */"$BROKEN_VERSION" ]]; then
  exit 7
fi
exit 0
"""


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.home = self.root / "opt"
        self.data = self.root / "data"
        self.data.mkdir()
        (self.data / ".env").write_text("PI_HOST=1\nPI_SORTER=0\n")
        (self.data / ".pi-controller").mkdir()
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for name, script in (("systemctl", FAKE_SYSTEMCTL), ("curl", FAKE_CURL)):
            (self.bin / name).write_text(script)
            (self.bin / name).chmod(0o755)
        self.log = self.root / "calls.log"
        self.log.touch()
        installed = self.release("1.0.0")
        (self.home / "releases").mkdir(parents=True)
        shutil.move(str(installed), self.home / "releases/1.0.0")
        (self.home / "releases/1.0.0/.env").symlink_to(self.data / ".env")
        (self.home / "current").symlink_to(self.home / "releases/1.0.0")
        self.env = dict(
            os.environ,
            PATH=f"{self.bin}:{os.environ['PATH']}",
            MAULT_HOME=str(self.home),
            MAULT_DATA=str(self.data),
            MAULT_USER=getpass.getuser(),
            XDG_STATE_HOME=str(self.root / "state"),
            XDG_CONFIG_HOME=str(self.root / "config"),
            CALL_LOG=str(self.log),
            MAULT_UPDATE_HEALTH_ATTEMPTS="2",
            LATEST_VERSION="1.0.1",
        )

    def release(self, version):
        release = self.root / f"build-{version}"
        scripts = release / "scripts/pi"
        scripts.mkdir(parents=True)
        for name in RELEASE_FILES:
            shutil.copyfile(SCRIPTS / name, scripts / name)
        (release / "node/bin").mkdir(parents=True)
        (release / "node/bin/node").symlink_to(shutil.which("node"))
        (release / "release.json").write_text(json.dumps({
            "version": version,
            "manifestUrl": "https://example.test/pi-latest/manifest.json",
        }))
        return release

    def bundle(self, version):
        release = self.release(version)
        path = self.root / f"mault-{version}.tar.gz"
        with tarfile.open(path, "w:gz") as archive:
            for child in release.iterdir():
                archive.add(child, arcname=child.name)
        return path

    def update(self, *arguments):
        return subprocess.run(["bash", str(self.home / "current/scripts/pi/update.sh"), *arguments],
                              env=self.env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    def current(self):
        return (self.home / "current").resolve().name

    def test_update_switches_release_and_renders_units_after_stopping(self):
        (self.home / "releases/0.9.0").mkdir()
        result = self.update("--bundle", str(self.bundle("1.0.1")))
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertEqual(self.current(), "1.0.1")
        self.assertTrue((self.home / "releases/1.0.0").exists())
        self.assertFalse((self.home / "releases/0.9.0").exists())
        self.assertEqual((self.home / "current/.env").resolve(), (self.data / ".env").resolve())
        calls = self.log.read_text()
        self.assertLess(calls.index("systemctl --user stop"), calls.index("systemctl --user daemon-reload"))
        self.assertLess(calls.index("systemctl --user daemon-reload"), calls.index("systemctl --user start"))
        api = (self.root / "config/systemd/user/mault-api.service").read_text()
        self.assertIn("releases/1.0.1/scripts/pi/run-api.sh", api)
        self.assertNotIn("%h/mault", api)
        self.assertTrue((self.root / "config/systemd/user/mault-prices.timer").exists())

    def test_release_that_does_not_start_rolls_back(self):
        self.env["BROKEN_VERSION"] = "1.0.1"
        result = self.update("--bundle", str(self.bundle("1.0.1")))
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("Going back to 1.0.0", result.stdout)
        self.assertEqual(self.current(), "1.0.0")
        api = (self.root / "config/systemd/user/mault-api.service").read_text()
        self.assertIn("releases/1.0.0/scripts/pi/run-api.sh", api)

    def test_latest_version_already_installed_leaves_services_running(self):
        self.env["LATEST_VERSION"] = "1.0.0"
        result = self.update()
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertIn("already the latest version", result.stdout)
        self.assertNotIn("systemctl --user stop", self.log.read_text())

    def test_other_users_cannot_update(self):
        self.env["MAULT_USER"] = "someone-else"
        result = self.update("--bundle", str(self.bundle("1.0.1")))
        self.assertEqual(result.returncode, 1)
        self.assertIn("sudo mault update", result.stdout)
        self.assertEqual(self.current(), "1.0.0")

    def test_background_runner_persists_failure(self):
        state = self.root / "state/mault"
        state.mkdir(parents=True)
        (state / "update.json").write_text('{"phase":"running","startedAt":1,"message":null}')
        self.env["MAULT_USER"] = "someone-else"
        subprocess.run(["bash", str(self.home / "current/scripts/pi/run-update.sh")], env=self.env)
        saved = json.loads((state / "update.json").read_text())
        self.assertEqual(saved["phase"], "failed")
        self.assertIn("sudo mault logs update", saved["message"])


if __name__ == "__main__":
    unittest.main()
