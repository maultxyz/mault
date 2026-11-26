import contextlib
import importlib.util
import io
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch


SCRIPTS = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("trusted_tree", SCRIPTS / "trusted-tree.py")
TRUSTED_TREE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TRUSTED_TREE)

ROOT_SCRIPTS = ("install.sh", "secure-layout.sh", "mault.sh", "setup.sh", "update.sh", "run-update.sh", "os-updates.sh")
ROOT_UNITS = ("mault-boot-config.service", "mault-update.service", "mault-setup.service")
PINNED_PATH = 'if [[ "$EUID" -eq 0 ]]; then export PATH=/usr/sbin:/usr/bin:/sbin:/bin; fi'


def script(name):
    return (SCRIPTS / name).read_text(encoding="utf-8")


def code_lines(name):
    return [line for line in script(name).splitlines() if not line.lstrip().startswith("#")]


@unittest.skipUnless(hasattr(os, "getuid"), "needs POSIX ownership")
class TrustedTreeTests(unittest.TestCase):
    def setUp(self):
        self.top = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.top)
        os.chmod(self.top, 0o755)
        self.releases = self.top / "opt/mault/releases"
        self.release = self.make_release("1.0.0")
        self.current = self.top / "opt/mault/current"
        self.current.symlink_to(self.release)

    def make_release(self, version):
        release = self.releases / version
        (release / "scripts/pi/controller").mkdir(parents=True)
        (release / "release.json").write_text('{"version": "%s"}' % version)
        (release / "scripts/pi/mault.sh").write_text("echo trusted\n")
        (release / "scripts/pi/controller/core.py").write_text("")
        for directory, _, _ in os.walk(self.top):
            os.chmod(directory, 0o755)
        return release

    def problems(self, **options):
        return TRUSTED_TREE.release_problems(str(self.current), os.getuid(), str(self.top), **options)

    def assertRefused(self, fragment):
        problems = self.problems()
        self.assertTrue(problems, "the release was trusted")
        self.assertTrue(any(fragment in problem for problem in problems), problems)

    def test_untouched_release_is_trusted(self):
        self.assertEqual(self.problems(), [])

    def test_group_writable_release_script_is_refused(self):
        os.chmod(self.release / "scripts/pi/mault.sh", 0o664)
        self.assertRefused("mault.sh is writable by group or others")

    def test_world_writable_release_directory_is_refused(self):
        os.chmod(self.release / "scripts/pi/controller", 0o777)
        self.assertRefused("controller is writable by group or others")

    def test_writable_releases_parent_is_refused(self):
        os.chmod(self.releases, 0o775)
        self.assertRefused("releases is writable by group or others")

    def test_group_writable_opt_is_refused(self):
        os.chmod(self.top / "opt", 0o775)
        self.assertRefused("/opt is writable by group or others")

    def test_writable_release_json_is_refused(self):
        os.chmod(self.release / "release.json", 0o666)
        self.assertRefused("release.json is writable by group or others")

    def test_current_repointed_to_a_writable_release_is_refused(self):
        planted = self.make_release("9.9.9")
        os.chmod(planted / "scripts/pi", 0o777)
        self.current.unlink()
        self.current.symlink_to(planted)
        self.assertRefused("9.9.9/scripts/pi is writable by group or others")

    def test_current_repointed_outside_the_trusted_tree_is_refused(self):
        outside = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, outside)
        self.current.unlink()
        self.current.symlink_to(outside)
        self.assertRefused("is outside")

    def test_current_pointing_through_a_parent_directory_is_refused(self):
        self.current.unlink()
        self.current.symlink_to("releases/../releases/1.0.0")
        self.assertRefused("points through a parent directory")

    def test_symlink_planted_in_release_scripts_is_refused(self):
        core = self.release / "scripts/pi/controller/core.py"
        core.unlink()
        core.symlink_to(self.top / "service-data.py")
        self.assertRefused("core.py is a symlink")

    def test_script_owned_by_another_account_is_refused(self):
        script_path = str(self.release / "scripts/pi/mault.sh")

        def lstat_with_service_owner(path):
            info = os.lstat(path)
            if os.path.realpath(path) == os.path.realpath(script_path):
                values = list(info)
                values[4] = os.getuid() + 1
                return os.stat_result(values)
            return info

        problems = self.problems(lstat=lstat_with_service_owner)
        self.assertTrue(any("mault.sh is owned by uid" in problem for problem in problems), problems)

    def test_current_symlink_owned_by_another_account_is_refused(self):
        def lstat_with_service_owned_current(path):
            info = os.lstat(path)
            if path == str(self.current):
                values = list(info)
                values[4] = os.getuid() + 1
                return os.stat_result(values)
            return info

        problems = self.problems(lstat=lstat_with_service_owned_current)
        self.assertTrue(any("current is owned by uid" in problem for problem in problems), problems)

    def test_installed_helper_directory_is_checked_with_its_parents(self):
        helpers = self.top / "usr/local/lib/mault"
        helpers.mkdir(parents=True)
        (helpers / "run-update.sh").write_text("echo trusted\n")
        for directory, _, _ in os.walk(self.top):
            os.chmod(directory, 0o755)
        check = lambda: TRUSTED_TREE.path_problems(str(helpers), os.getuid(), str(self.top))
        self.assertEqual(check(), [])
        os.chmod(self.top / "usr/local", 0o777)
        self.assertTrue(any("usr/local is writable" in problem for problem in check()), check())
        os.chmod(self.top / "usr/local", 0o755)
        os.chmod(helpers / "run-update.sh", 0o666)
        self.assertTrue(any("run-update.sh is writable" in problem for problem in check()), check())

    def test_missing_release_is_refused(self):
        self.current.unlink()
        self.current.symlink_to(self.releases / "0.0.0")
        self.assertRefused("is missing")


@unittest.skipUnless(shutil.which("bash") and shutil.which("find") and hasattr(os, "getuid"), "needs bash and find")
class InstallerMigrationTests(unittest.TestCase):
    def run_removal(self, home, legacy_command):
        function = re.search(r"^remove_untrusted_install\(\) \{.*?^\}", script("install.sh"), re.S | re.M)[0]
        subprocess.run(
            ["bash", "-c", f'set -euo pipefail\n{function}\nremove_untrusted_install'],
            env=dict(os.environ, MAULT_HOME=str(home), MAULT_USER="mault-test-account-that-does-not-exist",
                     LEGACY_MAULT_COMMAND=str(legacy_command)),
            check=True, capture_output=True)

    def make_install(self):
        directory = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, directory, True)
        home = directory / "opt-mault"
        (home / "releases/1.0.0/scripts/pi").mkdir(parents=True)
        (home / "releases/1.0.0/scripts/pi/mault.sh").write_text("echo old\n")
        (home / "current").symlink_to(home / "releases/1.0.0")
        legacy_command = directory / "mault"
        legacy_command.symlink_to(home / "current/scripts/pi/mault.sh")
        for path, _, _ in os.walk(home):
            os.chmod(path, 0o755)
        return home, legacy_command

    def test_tree_the_service_could_write_is_deleted_not_adopted(self):
        home, legacy_command = self.make_install()
        os.chmod(home / "releases/1.0.0/scripts/pi/mault.sh", 0o666)
        self.run_removal(home, legacy_command)
        self.assertFalse(home.exists())
        self.assertFalse(legacy_command.is_symlink())

    @unittest.skipUnless(hasattr(os, "geteuid") and os.geteuid() == 0, "needs root to own the tree")
    def test_root_owned_tree_is_kept(self):
        home, legacy_command = self.make_install()
        self.run_removal(home, legacy_command)
        self.assertTrue((home / "current/scripts/pi/mault.sh").exists())

    @unittest.skipIf(hasattr(os, "geteuid") and os.geteuid() == 0, "the tree is root-owned when run as root")
    def test_tree_owned_by_another_account_is_deleted(self):
        home, legacy_command = self.make_install()
        self.run_removal(home, legacy_command)
        self.assertFalse(home.exists())


class InstallerParentTests(unittest.TestCase):
    def check_parent(self, mode=0o755, uid=0, kind=0o040000, overrides=None):
        source = re.search(r"<<'PYPARENT'\n(.*?)\nPYPARENT", script("install.sh"), re.S)[1]

        def lstat(path):
            permissions, owner = (mode, uid) if str(path) == "/opt" else (0o755, 0)
            entry_kind = kind if str(path) == "/opt" else 0o040000
            if overrides and str(path) in overrides:
                value = overrides[str(path)]
                if isinstance(value, Exception):
                    raise value
                permissions, owner, entry_kind = value
            return os.stat_result((entry_kind | permissions, 0, 0, 1, owner, 0, 0, 0, 0, 0))

        output = io.StringIO()
        with patch("sys.argv", ["-", "/opt/mault", "/var/lib/mault"]), patch.object(Path, "lstat", lstat), contextlib.redirect_stderr(output):
            try:
                exec(compile(source, "install-parent-check", "exec"), {})
            except SystemExit as error:
                return error.code, output.getvalue()
        return 0, output.getvalue()

    def test_root_owned_parent_is_accepted(self):
        self.assertEqual(self.check_parent(), (0, ""))

    def test_writable_parent_explains_how_to_recover(self):
        for mode in (0o775, 0o777):
            with self.subTest(mode=oct(mode)):
                code, output = self.check_parent(mode=mode)
                self.assertEqual(code, 1)
                self.assertIn("/opt is writable by group or others", output)
                self.assertIn("sudo chmod go-w -- /opt", output)
                self.assertIn("rerun this installer", output)

    def test_non_root_parent_is_refused(self):
        code, output = self.check_parent(uid=1000)
        self.assertEqual(code, 1)
        self.assertIn("/opt is owned by uid 1000", output)

    def test_symlink_parent_is_refused_without_suggesting_chmod(self):
        code, output = self.check_parent(kind=0o120000)
        self.assertEqual(code, 1)
        self.assertIn("/opt is not a real directory", output)
        self.assertNotIn("sudo chmod", output)

    def test_all_system_parent_locations_are_checked(self):
        for parent in ("/", "/opt", "/usr", "/usr/local", "/usr/local/sbin",
                       "/usr/local/bin", "/usr/local/lib", "/usr/local/lib/mault",
                       "/var", "/var/lib", "/var/lib/mault-system", "/etc",
                       "/etc/systemd", "/etc/systemd/system", "/etc/nginx",
                       "/etc/nginx/sites-available", "/etc/nginx/sites-enabled",
                       "/etc/apt", "/etc/apt/apt.conf.d"):
            with self.subTest(parent=parent):
                code, output = self.check_parent(overrides={parent: (0o775, 0, 0o040000)})
                self.assertEqual(code, 1)
                self.assertIn(f"{parent} is writable by group or others", output)

    def test_multiple_independent_problems_are_reported_together(self):
        code, output = self.check_parent(mode=0o775, overrides={"/usr": (0o777, 1000, 0o040000)})
        self.assertEqual(code, 1)
        self.assertIn("/opt is writable", output)
        self.assertIn("/usr is owned by uid 1000 and is writable", output)
        self.assertEqual(output.count("sudo chmod go-w -- /usr"), 1)
        self.assertIn("sudo chown root:root -- /usr", output)

    def test_missing_parent_can_be_created_by_installer(self):
        self.assertEqual(self.check_parent(overrides={
            "/usr/local/lib/mault": FileNotFoundError(),
            "/var/lib/mault-system": FileNotFoundError(),
        }), (0, ""))

    def test_symlink_ancestor_is_not_followed(self):
        code, output = self.check_parent(overrides={
            "/usr": (0o777, 0, 0o120000),
            "/usr/local": AssertionError("followed a symlink"),
        })
        self.assertEqual(code, 1)
        self.assertIn("/usr is not a real directory", output)

    def test_unreadable_parent_reports_error(self):
        code, output = self.check_parent(overrides={"/usr": PermissionError(13, "Permission denied")})
        self.assertEqual(code, 1)
        self.assertIn("/usr cannot be inspected: Permission denied", output)

    def test_parent_is_checked_before_system_changes(self):
        lines = code_lines("install.sh")
        check = lines.index("require_trusted_install_parent")
        self.assertLess(check, lines.index("apt-get update"))
        self.assertLess(check, lines.index("remove_untrusted_install"))


class RootBoundaryTests(unittest.TestCase):
    def test_root_units_run_helpers_from_root_owned_locations(self):
        for unit in ROOT_UNITS:
            commands = [line.split("=", 1)[1] for line in script(unit).splitlines() if line.startswith("Exec")]
            self.assertTrue(commands, unit)
            for command in commands:
                if "python3" in command:
                    self.assertIn("python3 -I ", command, unit)
                if unit != "mault-setup.service":
                    self.assertNotIn("/opt/mault", command, unit)
                    self.assertRegex(command, r" /usr/local/lib/mault/", unit)

    def test_first_boot_setup_checks_the_release_before_running_it(self):
        lines = [line for line in script("mault-setup.service").splitlines() if line.startswith("Exec")]
        self.assertEqual(lines[0],
                         "ExecStartPre=/usr/bin/python3 -I /usr/local/lib/mault/trusted-tree.py"
                         " --release /opt/mault/current --path /usr/local/lib/mault")
        self.assertTrue(lines[1].startswith("ExecStart=/bin/bash /opt/mault/current/"))

    def test_helpers_referenced_by_units_and_the_command_are_installed_by_secure_layout(self):
        helpers = re.search(r"^ROOT_HELPERS=\(([^)]*)\)", script("secure-layout.sh"), re.M)[1].split()
        referenced = set()
        for name in ROOT_UNITS + ("mault.sh", "run-update.sh", "install.sh"):
            referenced.update(re.findall(r"/usr/local/lib/mault/([\w.-]+)", script(name)))
            referenced.update(re.findall(r"\$MAULT_LIB/([\w.-]+)", script(name)))
        self.assertTrue(referenced)
        self.assertLessEqual(referenced, set(helpers))
        for helper in helpers:
            self.assertTrue((SCRIPTS / helper).is_file(), helper)
        self.assertIn('trusted-tree.py" --path /usr/local/sbin/mault --path "$MAULT_LIB"', script("secure-layout.sh"))
        self.assertIn('install_root_file "$SCRIPTS/mault.sh" /usr/local/sbin/mault 755', script("secure-layout.sh"))

    def test_root_scripts_pin_path_and_isolate_python(self):
        python_command = re.compile(r"(?<![\w-])python3(?![\w-])(?! -I\b)")
        for name in ROOT_SCRIPTS:
            self.assertIn(PINNED_PATH, script(name), name)
            for line in code_lines(name):
                if line.lstrip().startswith("packages") or "as_service_user" in line or "runuser" in line:
                    continue
                self.assertIsNone(python_command.search(line), f"{name}: {line.strip()}")

    def test_root_never_reads_or_writes_service_data_itself(self):
        service_path = re.compile(r'"\$(MAULT_DATA|ENV_FILE)')
        file_command = re.compile(r"(?<![\w-])(sed|tail|grep|cat|cp|chown|mkdir|tee|python3)(?![\w-])")
        for name in ("mault.sh", "setup.sh"):
            for line in code_lines(name):
                if service_path.search(line) and file_command.search(line):
                    self.assertTrue("as_service_user" in line or "runuser" in line, f"{name}: {line.strip()}")

    def test_mault_command_runs_release_scripts_only_after_the_trust_check(self):
        text = script("mault.sh")
        self.assertEqual(len(re.findall(r'bash "\$SCRIPTS/', text)), 1)
        runner = re.search(r"^run_release_script\(\) \{(.*?)^\}", text, re.S | re.M)[1]
        self.assertLess(runner.index("require_trusted_release"), runner.index('bash "$SCRIPTS/'))
        self.assertIn('python3 -I "$MAULT_LIB/trusted-tree.py" --release "$ROOT" --path /usr/local/sbin/mault'
                      ' --path "$MAULT_LIB"', text)
        self.assertIn('bash "$MAULT_LIB/os-updates.sh"', text)
        self.assertNotIn("$SCRIPTS/os-updates.sh", text)

    def test_root_updater_checks_the_release_before_and_after_updating(self):
        steps = [line.strip() for line in code_lines("run-update.sh")
                 if "trusted-tree.py" in line or 'bash "$CURRENT' in line]
        self.assertEqual(steps, [
            'python3 -I "$MAULT_LIB/trusted-tree.py" --release "$CURRENT" --path "$MAULT_LIB"',
            'bash "$CURRENT/scripts/pi/update.sh"',
            'python3 -I "$MAULT_LIB/trusted-tree.py" --release "$CURRENT" --path "$MAULT_LIB"',
            'bash "$CURRENT/scripts/pi/secure-layout.sh"',
        ])

    def test_installer_removes_untrusted_trees_before_fetching_and_ignores_their_manifest(self):
        lines = code_lines("install.sh")
        removal = lines.index("remove_untrusted_install")
        fetch = next(index for index, line in enumerate(lines) if line == 'release="$(fetch_release)"')
        self.assertLess(removal, fetch)
        self.assertNotIn("current/release.json", script("install.sh"))
        os_updates = lines.index("bash /usr/local/lib/mault/os-updates.sh")
        secure_layout = lines.index('bash "$MAULT_HOME/current/scripts/pi/secure-layout.sh"')
        self.assertLess(secure_layout, os_updates)
        self.assertNotIn("ln -sfn \"$MAULT_HOME/current/scripts/pi/mault.sh\"", script("install.sh"))

    def test_updater_application_steps_run_as_the_service_account(self):
        for line in code_lines("update.sh"):
            if re.search(r"(?<![\w/-])(node|systemctl --user)(?![\w/-])", line) and "as_service_user()" not in line:
                self.assertIn("as_service_user", line, line.strip())


if __name__ == "__main__":
    unittest.main()
