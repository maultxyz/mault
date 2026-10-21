import { REPO_URL } from "@/lib/constants/links";
import type {
  SelfHostAuth,
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
} from "@tabler/icons-react";

export const SELF_HOST_PATH = "/self-host";

export const SELF_HOST_SETUP_ANCHOR = "setup";

export const SELF_HOST_SETUP_PARAMS = {
  host: "host",
  auth: "auth",
} as const;

export const DEFAULT_SELF_HOST_SETUP: SelfHostSetupState = {
  host: "compose",
  auth: "local",
};

export const SELF_HOST_HOST_OPTIONS: SelfHostOption<SelfHostHost>[] = [
  { value: "compose", icon: IconBrandDocker },
  { value: "coolify", icon: IconCloudUpload },
];

export const SELF_HOST_AUTH_OPTIONS: SelfHostOption<SelfHostAuth>[] = [
  { value: "local", icon: IconDatabase },
  { value: "neon", icon: IconCloud },
];

export const SELF_HOST_PRICE_CRON = `0 4 * * * cd /opt/mault && docker compose exec -T server sh -c 'if [ "$AUTH_PROVIDER" = local ]; then export DATABASE_URL="\${DATABASE_URL:-postgresql://mault:$POSTGRES_PASSWORD@postgres:5432/mault}" DATABASE_SSL="\${DATABASE_SSL:-false}"; fi; exec node packages/server/dist/scripts/sync-prices.js' >> /var/log/mault-prices.log 2>&1`;

export const SELF_HOST_COOLIFY_COMPOSE_URL =
  "https://raw.githubusercontent.com/dishwasher-detergent/mault/master/docker-compose-coolify.yml";

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
      { key: "compose", code: `curl -fsSL ${SELF_HOST_COOLIFY_COMPOSE_URL}` },
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
    key: "firstRun",
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
