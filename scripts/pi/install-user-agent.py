"""Choose and save the installation's card/price API User-Agent."""

import argparse
import os
from pathlib import Path
import re
import secrets
import shlex
import socket
import tempfile


DEFAULT_USER_AGENT = "Mault-NewSelfHosted/1.0"
SHARED_USER_AGENTS = {DEFAULT_USER_AGENT, "Mault-SelfHosted/1.0"}
SETTING = re.compile(r"\s*(?:export\s+)?CARD_API_USER_AGENT\s*=\s*(.*?)\s*$")


def quote_user_agent(value):
    # .env is read by both Node's --env-file and the installer's shell source.
    # Use literal quoting understood by both, without shell expansion.
    if any(ord(character) < 32 or ord(character) > 126 for character in value):
        raise ValueError("Use printable ASCII characters for the HTTP User-Agent.")
    value = value.strip()
    if not value:
        raise ValueError("Enter a non-empty User-Agent name.")
    if "'" not in value:
        return value, f"'{value}'"
    if not any(character in value for character in '\\"$`'):
        return value, f'"{value}"'
    raise ValueError("Choose a name without single quotes, or without double quotes, backslashes, $ and backticks.")


def configure(path, choose=input):
    lines = path.read_text().splitlines() if path.exists() else []
    saved = ""
    for line in lines:
        match = SETTING.fullmatch(line)
        if match:
            saved = " ".join(shlex.split(match[1], comments=True))
    if saved and saved not in SHARED_USER_AGENTS:
        quote_user_agent(saved)
        print("[install] Keeping the saved CARD_API_USER_AGENT.")
        return saved

    supplied = os.environ.get("CARD_API_USER_AGENT", "")
    if supplied:
        value, quoted = quote_user_agent(supplied)
    else:
        host = re.sub(r"[^A-Za-z0-9._-]", "-", socket.gethostname()).strip("-") or "host"
        default = f"Mault-{host}-{secrets.token_hex(4)}/1.0"
        print("Choose a unique name for this installation's card and price API requests.")
        while True:
            try:
                answer = choose(f"CARD_API_USER_AGENT [{default}]: ")
            except EOFError as error:
                raise ValueError("No User-Agent input available. Set CARD_API_USER_AGENT in the environment or rerun the installer interactively.") from error
            try:
                value, quoted = quote_user_agent(answer if answer else default)
                break
            except ValueError as error:
                print(f"[install] {error}")

    output = []
    written = False
    for line in lines:
        if SETTING.fullmatch(line):
            if not written:
                output.append(f"CARD_API_USER_AGENT={quoted}")
                written = True
        else:
            output.append(line)
    if not written:
        output.append(f"CARD_API_USER_AGENT={quoted}")

    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, prefix=f"{path.name}.user-agent-", delete=False) as file:
            temporary = Path(file.name)
            file.write("\n".join(output) + "\n")
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    print("[install] Saved CARD_API_USER_AGENT in .env.")
    return value


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env", type=Path, required=True)
    args = parser.parse_args()
    try:
        configure(args.env.resolve())
    except ValueError as error:
        parser.exit(1, f"[install] {error}\n")
