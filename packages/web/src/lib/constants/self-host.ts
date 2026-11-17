import { REPO_URL } from "@/lib/constants/links";
import { MARKETING_PAGE_PATHS } from "@/lib/constants/marketing-pages";
import type {
  SelfHostAuth,
  SelfHostBoard,
  SelfHostSorter,
  SelfHostHost,
  SelfHostOption,
  SelfHostSection,
  SelfHostSetupState,
} from "@/lib/interfaces/self-host";
import {
  IconBrandDocker,
  IconCloud,
  IconCloudUpload,
  IconDatabase,
  IconCpu,
  IconPlug,
} from "@tabler/icons-react";

export const SELF_HOST_PATH = MARKETING_PAGE_PATHS.selfHost;

export const SELF_HOST_SETUP_ANCHOR = "setup";

export const SELF_HOST_SETUP_PARAMS = {
  host: "host",
  auth: "auth",
  sorter: "sorter",
  board: "board",
} as const;

export const DEFAULT_SELF_HOST_SETUP: SelfHostSetupState = {
  host: "compose",
  auth: "local",
  sorter: "usb",
  board: "raspberry-pi",
};

export const SELF_HOST_HOST_OPTIONS: SelfHostOption<SelfHostHost>[] = [
  { value: "compose", icon: IconBrandDocker },
  { value: "coolify", icon: IconCloudUpload },
  { value: "pi", icon: IconCpu },
];

export const SELF_HOST_SORTER_OPTIONS: SelfHostOption<SelfHostSorter>[] = [
  { value: "gpio", icon: IconCpu },
  { value: "usb", icon: IconPlug },
];

export const SELF_HOST_BOARD_OPTIONS: SelfHostOption<SelfHostBoard>[] = [
  { value: "raspberry-pi", icon: IconCpu },
  { value: "orange-pi-zero4", icon: IconCpu },
];

export const SELF_HOST_AUTH_OPTIONS: SelfHostOption<SelfHostAuth>[] = [
  { value: "local", icon: IconDatabase },
  { value: "neon", icon: IconCloud },
];

export const SELF_HOST_PRICE_CRON = `0 4 * * * cd /opt/mault && docker compose exec -T server sh -c 'if [ "$AUTH_PROVIDER" = local ]; then export DATABASE_URL="\${DATABASE_URL:-postgresql://mault:$POSTGRES_PASSWORD@postgres:5432/mault}" DATABASE_SSL="\${DATABASE_SSL:-false}"; fi; exec node packages/server/dist/scripts/sync-prices.js' >> /var/log/mault-prices.log 2>&1`;

export const SELF_HOST_PI_RELEASE_URL = `${REPO_URL}/releases?q=pi-v&expanded=true`;

export const SELF_HOST_PI_INSTALL_COMMAND = `curl -fsSL ${REPO_URL}/releases/download/pi-latest/install.sh | sudo bash`;

const NEON_MIGRATE = "pnpm --filter @magic-vault/server db:migrate";

export const SELF_HOST_SECTIONS: SelfHostSection[] = [
  {
    key: "requirements",
    steps: [
      {
        key: "docker",
        code: "docker compose version",
        when: { host: "compose" },
      },
      { key: "git", when: { host: "compose" } },
      { key: "coolify", when: { host: "coolify" } },
      { key: "neonAccount", when: { auth: "neon" } },
      { key: "node", code: "corepack enable", when: { auth: "neon" } },
      { key: "piSystem", when: { host: "pi" } },
      { key: "piHardware", when: { host: "pi" } },
      { key: "huggingface" },
      { key: "domain", when: { host: "compose" } },
    ],
  },
  {
    key: "configure",
    when: { host: "compose" },
    steps: [
      { key: "clone", code: `git clone ${REPO_URL}.git\ncd mault` },
      {
        key: "env",
        code: "cp .env.docker.example .env",
        when: { auth: "local" },
      },
      {
        key: "envNeon",
        code: "cp .env.neon.example .env",
        when: { auth: "neon" },
      },
      {
        key: "secrets",
        code: "openssl rand -hex 32",
        hasNote: true,
        when: { auth: "local" },
      },
      {
        key: "secretsNeon",
        code: "openssl rand -hex 32",
        when: { auth: "neon" },
      },
      { key: "webUrl", when: { auth: "local" } },
      { key: "webUrlNeon", when: { auth: "neon" } },
      { key: "userAgent" },
    ],
  },
  {
    key: "neon",
    when: { auth: "neon" },
    steps: [
      { key: "project", code: "CREATE EXTENSION IF NOT EXISTS vector;" },
      { key: "auth" },
      { key: "urls" },
      { key: "storage" },
      { key: "envCompose", when: { host: "compose" } },
      {
        key: "clone",
        code: `git clone ${REPO_URL}.git\ncd mault\ncp .env.neon.example .env`,
        when: { host: "coolify" },
      },
      { key: "migrate", code: `pnpm install\n${NEON_MIGRATE}`, hasNote: true },
    ],
  },
  {
    key: "coolify",
    when: { host: "coolify" },
    steps: [
      { key: "compose", code: REPO_URL },
      {
        key: "images",
        code: "ghcr.io/dishwasher-detergent/mault-server\nghcr.io/dishwasher-detergent/mault-web\nghcr.io/dishwasher-detergent/mault-bot",
      },
      {
        key: "env",
        code: "openssl rand -hex 32",
        hasNote: true,
        when: { auth: "local" },
      },
      {
        key: "envNeon",
        code: "AUTH_PROVIDER=neon\nVITE_AUTH_PROVIDER=neon\nDATABASE_SSL=true",
        hasNote: true,
        when: { auth: "neon" },
      },
      { key: "domain" },
      { key: "deploy" },
    ],
  },
  {
    key: "start",
    when: { host: "compose" },
    steps: [
      { key: "up", code: "docker compose up --build -d" },
      {
        key: "logs",
        code: "docker compose logs -f server",
        when: { auth: "local" },
      },
      {
        key: "logsNeon",
        code: "docker compose logs -f server",
        when: { auth: "neon" },
      },
      { key: "ports", when: { auth: "local" } },
      { key: "portsNeon", when: { auth: "neon" } },
    ],
  },
  {
    key: "piHardware",
    when: { host: "pi" },
    steps: [
      { key: "gpio", when: { sorter: "gpio" } },
      {
        key: "raspberry",
        when: { sorter: "gpio", board: "raspberry-pi" },
      },
      {
        key: "orange",
        hasNote: true,
        when: { sorter: "gpio", board: "orange-pi-zero4" },
      },
      { key: "usb", when: { sorter: "usb" } },
      { key: "bluetooth", hasNote: true, when: { sorter: "usb" } },
    ],
  },
  {
    key: "piInstall",
    when: { host: "pi" },
    steps: [
      {
        key: "flash",
        code: SELF_HOST_PI_RELEASE_URL,
        hasNote: true,
        when: { board: "raspberry-pi" },
      },
      { key: "boot", hasNote: true, when: { board: "raspberry-pi" } },
      {
        key: "installOther",
        code: SELF_HOST_PI_INSTALL_COMMAND,
        hasNote: true,
      },
      { key: "services", hasNote: true },
      { key: "settings", hasNote: true },
    ],
  },
  {
    key: "piOpen",
    when: { host: "pi" },
    steps: [
      { key: "address", code: "sudo mault urls", hasNote: true },
      { key: "account" },
      { key: "game", hasNote: true },
      { key: "scan" },
    ],
  },
  {
    key: "piPrices",
    when: { host: "pi" },
    steps: [
      { key: "firstPull", code: "sudo mault prices", hasNote: true },
      {
        key: "check",
        code: "sudo systemctl --user -M mault-service@ list-timers mault-prices.timer",
      },
    ],
  },
  {
    key: "piMaintain",
    when: { host: "pi" },
    steps: [
      { key: "update", code: "sudo mault update", hasNote: true },
      {
        key: "backup",
        code: "sudo -u postgres pg_dump mault > mault-backup.sql",
        hasNote: true,
      },
      { key: "logs", code: "sudo mault logs" },
      { key: "automatic" },
      { key: "start", code: "sudo mault start" },
      { key: "stop", code: "sudo mault stop" },
    ],
  },
  {
    key: "firstRun",
    when: { host: ["compose", "coolify"] },
    steps: [
      { key: "signUp", hasNote: true, when: { auth: "local" } },
      { key: "signUpNeon", when: { auth: "neon" } },
      {
        key: "adminNeon",
        code: "UPDATE neon_auth.user SET role = 'admin'\nWHERE email = 'you@example.com';",
        when: { auth: "neon" },
      },
      { key: "game" },
      {
        key: "admins",
        code: "INSERT INTO platform_user_roles (user_id, role)\nVALUES ('<own_auth_users.id>', 'admin')\nON CONFLICT (user_id) DO UPDATE SET role = 'admin';",
        when: { auth: "local" },
      },
    ],
  },
  {
    key: "prices",
    when: { host: ["compose", "coolify"] },
    steps: [
      {
        key: "cron",
        code: SELF_HOST_PRICE_CRON,
        hasNote: true,
        when: { host: "compose" },
      },
      { key: "firstPull", when: { host: "compose" } },
      {
        key: "coolify",
        code: "node packages/server/dist/scripts/sync-prices.js",
        hasNote: true,
        when: { host: "coolify" },
      },
    ],
  },
  {
    key: "optional",
    when: { host: ["compose", "coolify"] },
    steps: [
      {
        key: "discord",
        code: "docker compose --profile bot up --build -d",
        when: { host: "compose" },
      },
      { key: "discordCoolify", when: { host: "coolify" } },
      { key: "storage", when: { auth: "local" } },
      { key: "email", when: { auth: "local" } },
      { key: "wifi" },
    ],
  },
  {
    key: "maintain",
    when: { host: ["compose", "coolify"] },
    steps: [
      {
        key: "migrateNeon",
        code: `git pull\npnpm install\n${NEON_MIGRATE}`,
        when: { auth: "neon" },
      },
      {
        key: "update",
        code: "git pull\ndocker compose up --build -d",
        when: { host: "compose" },
      },
      { key: "updateCoolify", when: { host: "coolify" } },
      {
        key: "backup",
        code: "docker compose exec -T postgres pg_dump -U mault mault > mault-backup.sql",
        when: { host: "compose", auth: "local" },
      },
      {
        key: "backupCoolify",
        when: { host: "coolify", auth: "local" },
      },
      { key: "backupNeon", when: { auth: "neon" } },
      { key: "secrets", when: { auth: "local" } },
    ],
  },
];
