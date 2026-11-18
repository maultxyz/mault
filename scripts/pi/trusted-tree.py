#!/usr/bin/env python3
"""Exits 0 only when root may run code from a Mault release.

Every path component leading to the release's release.json and scripts/pi
(following the current symlink) and every entry under scripts/pi must be owned
by root and not writable by group or others, and scripts/pi may hold no
symlinks. The mault command, the root updater and first-boot setup run this
with python3 -I from /usr/local/lib/mault before executing anything from
/opt/mault, so a release the service account could change is never run as root.
--path applies the same check to an installed helper (and everything under it
when it is a directory); secure-layout.sh checks its own installs with it.
"""

import argparse
import os
import stat
import sys

MAX_FOLLOWED_SYMLINKS = 8
WRITABLE_BY_GROUP_OR_OTHERS = stat.S_IWGRP | stat.S_IWOTH


def entry_problem(path, info, trusted_uid):
    if info.st_uid != trusted_uid:
        return f"{path} is owned by uid {info.st_uid}"
    if not stat.S_ISLNK(info.st_mode) and info.st_mode & WRITABLE_BY_GROUP_OR_OTHERS:
        return f"{path} is writable by group or others"
    return None


def chain_problems(path, trusted_uid, top="/", lstat=os.lstat, readlink=os.readlink, followed_symlinks=0):
    path = os.path.normpath(path)
    top = os.path.normpath(top)
    if not os.path.isabs(path) or os.path.commonpath([top, path]) != top:
        return [f"{path} is outside {top}"]
    current = top
    remaining = [] if path == top else os.path.relpath(path, top).split(os.sep)
    problem = entry_problem(current, lstat(current), trusted_uid)
    if problem:
        return [problem]
    for index, part in enumerate(remaining):
        current = os.path.join(current, part)
        try:
            info = lstat(current)
        except FileNotFoundError:
            return [f"{current} is missing"]
        problem = entry_problem(current, info, trusted_uid)
        if problem:
            return [problem]
        if stat.S_ISLNK(info.st_mode):
            if followed_symlinks >= MAX_FOLLOWED_SYMLINKS:
                return [f"{current} follows too many symlinks"]
            target = readlink(current)
            if ".." in target.split("/"):
                return [f"{current} points through a parent directory"]
            if not os.path.isabs(target):
                target = os.path.join(os.path.dirname(current), target)
            return chain_problems(os.path.join(target, *remaining[index + 1:]), trusted_uid, top, lstat, readlink,
                                  followed_symlinks + 1)
    return []


def tree_problems(directory, trusted_uid, lstat=os.lstat):
    problems = []

    def raise_walk_error(error):
        raise error

    for parent, directories, files in os.walk(directory, onerror=raise_walk_error):
        for name in directories + files:
            path = os.path.join(parent, name)
            info = lstat(path)
            if stat.S_ISLNK(info.st_mode):
                problems.append(f"{path} is a symlink")
                continue
            problem = entry_problem(path, info, trusted_uid)
            if problem:
                problems.append(problem)
    return problems


def release_problems(release, trusted_uid=0, top="/", lstat=os.lstat, readlink=os.readlink):
    scripts = os.path.join(release, "scripts", "pi")
    problems = (chain_problems(os.path.join(release, "release.json"), trusted_uid, top, lstat, readlink)
                + chain_problems(scripts, trusted_uid, top, lstat, readlink))
    if problems:
        return list(dict.fromkeys(problems))
    return tree_problems(os.path.realpath(scripts), trusted_uid, lstat)


def path_problems(path, trusted_uid=0, top="/", lstat=os.lstat, readlink=os.readlink):
    problems = chain_problems(path, trusted_uid, top, lstat, readlink)
    if problems or not os.path.isdir(path):
        return problems
    return tree_problems(os.path.realpath(path), trusted_uid, lstat)


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--release")
    parser.add_argument("--path", action="append", default=[])
    arguments = parser.parse_args(argv)
    if not arguments.release and not arguments.path:
        parser.error("pass --release or --path")
    checks = [(arguments.release, release_problems(arguments.release))] if arguments.release else []
    checks += [(path, path_problems(path)) for path in arguments.path]
    for checked, problems in checks:
        for problem in problems:
            print(f"[mault] Refusing to run {checked} as root: {problem}", file=sys.stderr)
    return 1 if any(problems for _, problems in checks) else 0


if __name__ == "__main__":
    sys.exit(main())
