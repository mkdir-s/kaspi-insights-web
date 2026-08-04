import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const minimum = [22, 13, 0];

function versionOf(executable) {
  if (!executable || !existsSync(executable)) return null;
  const result = spawnSync(executable, ["--version"], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const match = result.stdout.trim().match(/^v(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

function isCompatible(version) {
  if (!version) return false;
  return version[0] > minimum[0] ||
    (version[0] === minimum[0] && version[1] >= minimum[1]);
}

function nvmCandidates() {
  const root = join(homedir(), ".nvm", "versions", "node");
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .sort()
    .reverse()
    .map((directory) => join(root, directory, "bin", "node"));
}

const candidates = [
  process.env.KASPI_NODE,
  process.execPath,
  join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "bin", "node"),
  ...nvmCandidates(),
  "/opt/homebrew/opt/node@24/bin/node",
  "/opt/homebrew/opt/node@22/bin/node",
  "/opt/homebrew/bin/node",
  "/usr/local/bin/node",
].filter(Boolean);

const executable = candidates.find((candidate) => isCompatible(versionOf(candidate)));

if (!executable) {
  console.error("\nKaspi Insights требует Node.js 22.13 или новее.");
  console.error(`Сейчас используется ${process.version}.`);
  console.error("Установите актуальный Node.js: brew install node@22");
  console.error("Или укажите путь вручную: KASPI_NODE=/path/to/node npm run dev\n");
  process.exit(1);
}

if (resolve(executable) !== resolve(process.execPath)) {
  const version = versionOf(executable)?.join(".");
  console.log(`Используется совместимый Node.js ${version}: ${executable}`);
}

const requested = process.argv.slice(2);
const pagesBuild = requested[0] === "pages";
const cli = pagesBuild
  ? resolve("node_modules", "vite", "bin", "vite.js")
  : resolve("node_modules", "vinext", "dist", "cli.js");
const args = pagesBuild
  ? ["build", "--config", "vite.pages.config.ts"]
  : requested;
const result = spawnSync(executable, [cli, ...args], {
  stdio: "inherit",
  env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
});

process.exit(result.status ?? 1);
