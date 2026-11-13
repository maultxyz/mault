import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPTS = Path(__file__).resolve().parents[1]


class ControllerServiceTests(unittest.TestCase):
    def test_gpio_mode_adds_controller_dependency_and_usb_mode_removes_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "separate checkout"
            scripts = root / "scripts/pi"
            scripts.mkdir(parents=True)
            for name in ("install-services.mjs", "mault-api.service", "mault-web.service",
                         "mault-camera.service", "mault-controller.service"):
                shutil.copyfile(SCRIPTS / name, scripts / name)
            config = Path(directory) / "user-config"
            environment = dict(os.environ, XDG_CONFIG_HOME=str(config))
            (root / ".env").write_text("PI_HOST=1\nPI_SORTER=1\n")
            subprocess.run(["node", str(scripts / "install-services.mjs"), str(root)], env=environment, check=True)
            units = config / "systemd/user"
            api = (units / "mault-api.service").read_text()
            self.assertIn("Wants=mault-controller.service", api)
            controller = (units / "mault-controller.service").read_text()
            self.assertIn(str(root), controller)
            self.assertIn("PartOf=mault-api.service", controller)
            self.assertIn("run-controller.sh", controller)
            (root / ".env").write_text("PI_HOST=1\nPI_SORTER=0\n")
            subprocess.run(["node", str(scripts / "install-services.mjs"), str(root)], env=environment, check=True)
            self.assertNotIn("mault-controller.service", (units / "mault-api.service").read_text())


if __name__ == "__main__":
    unittest.main()
