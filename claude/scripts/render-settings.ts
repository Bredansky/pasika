import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClaudeSettings {
  $schema?: string;
  attribution?: Record<string, unknown>;
  permissions?: {
    ask?: string[];
    deny?: string[];
  };
  hooks: {
    Notification?: HookMatcherEntry[];
    PreToolUse?: HookMatcherEntry[];
    [key: string]: unknown;
  };
  statusLine: {
    type?: string;
    command: string;
  };
  [key: string]: unknown;
}

interface CommandHook {
  type?: string;
  command: string;
  [key: string]: unknown;
}

interface HookMatcherEntry {
  matcher?: string;
  hooks: CommandHook[];
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const isClaudeSettings = (value: unknown): value is ClaudeSettings => {
  if (!isRecord(value)) {
    return false;
  }

  const hooks = value.hooks;
  const statusLine = value.statusLine;

  if (!isRecord(hooks) || !isRecord(statusLine) || typeof statusLine.command !== "string") {
    return false;
  }

  const notification = hooks.Notification;
  if (notification !== undefined && !Array.isArray(notification)) {
    return false;
  }

  const preToolUse = hooks.PreToolUse;
  return preToolUse === undefined || Array.isArray(preToolUse);
};

const readClaudeSettings = async (templatePath: string): Promise<ClaudeSettings> => {
  const templateRaw = await readFile(templatePath, "utf8");
  const parsed: unknown = JSON.parse(templateRaw);

  if (!isClaudeSettings(parsed)) {
    throw new Error("Claude settings template has an invalid shape.");
  }

  return parsed;
};

const mergeStringArrays = (left: string[] = [], right: string[] = []): string[] =>
  Array.from(new Set([...left, ...right]));

const upsertHookMatcherEntry = (
  entries: HookMatcherEntry[] | undefined,
  matcher: string,
  command: string,
): HookMatcherEntry[] => {
  const nextEntries = [...(entries ?? [])];
  const existingIndex = nextEntries.findIndex((entry) => (entry.matcher ?? "") === matcher);
  const hook: CommandHook = { type: "command", command };

  if (existingIndex === -1) {
    nextEntries.push({ matcher, hooks: [hook] });
    return nextEntries;
  }

  const existingEntry = nextEntries[existingIndex];
  nextEntries[existingIndex] = { ...existingEntry, hooks: [hook] };
  return nextEntries;
};

const mergeClaudeSettings = (
  existingSettings: ClaudeSettings,
  baseSettings: ClaudeSettings,
  packagePath: string,
): ClaudeSettings => {
  const notificationCommand = `${packagePath}/hooks/notification.sh`;
  const protectFilesCommand = `${packagePath}/hooks/protect-files.sh`;
  const statusLineCommand = `node ${packagePath}/hooks/status-line/index.js`;

  return {
    ...existingSettings,
    $schema: baseSettings.$schema ?? existingSettings.$schema,
    attribution: { ...(baseSettings.attribution ?? {}), ...(existingSettings.attribution ?? {}) },
    permissions: {
      ...(existingSettings.permissions ?? {}),
      ...(baseSettings.permissions ?? {}),
      ask: mergeStringArrays(baseSettings.permissions?.ask, existingSettings.permissions?.ask),
      deny: mergeStringArrays(baseSettings.permissions?.deny, existingSettings.permissions?.deny),
    },
    hooks: {
      ...existingSettings.hooks,
      Notification: upsertHookMatcherEntry(existingSettings.hooks.Notification, "", notificationCommand),
      PreToolUse: upsertHookMatcherEntry(existingSettings.hooks.PreToolUse, "Edit|Write", protectFilesCommand),
    },
    statusLine: {
      ...existingSettings.statusLine,
      ...baseSettings.statusLine,
      type: "command",
      command: statusLineCommand,
    },
  };
};

export const renderClaude = async (targetDir: string, force: boolean, packageRoot: string): Promise<string[]> => {
  const templatePath = path.join(packageRoot, "claude/settings.base.json");
  const baseSettings = await readClaudeSettings(templatePath);
  const packagePath = "./node_modules/pasika/claude";
  const notificationEntries = upsertHookMatcherEntry(
    baseSettings.hooks.Notification,
    "",
    `${packagePath}/hooks/notification.sh`,
  );
  const preToolUseEntries = upsertHookMatcherEntry(
    baseSettings.hooks.PreToolUse,
    "Edit|Write",
    `${packagePath}/hooks/protect-files.sh`,
  );
  const settings: ClaudeSettings = {
    ...baseSettings,
    hooks: {
      ...baseSettings.hooks,
      Notification: notificationEntries,
      PreToolUse: preToolUseEntries,
    },
    statusLine: {
      ...baseSettings.statusLine,
      type: "command",
      command: `node ${packagePath}/hooks/status-line/index.js`,
    },
  };

  const outputDir = path.join(targetDir, ".claude");
  const outputPath = path.join(outputDir, "settings.json");
  const hooksOutputDir = path.join(outputDir, "hooks");

  await mkdir(outputDir, { recursive: true });
  await mkdir(hooksOutputDir, { recursive: true });

  const finalSettings =
    !force && (await fileExists(outputPath))
      ? mergeClaudeSettings(await readClaudeSettings(outputPath), settings, packagePath)
      : settings;

  await writeFile(outputPath, `${JSON.stringify(finalSettings, null, 2)}\n`, "utf8");

  const outputs = [outputPath];
  const hookDocFiles = ["AGENTS.md", "CLAUDE.md"] as const;

  for (const fileName of hookDocFiles) {
    const sourcePath = path.join(packageRoot, "claude/hooks", fileName);
    if (!(await fileExists(sourcePath))) {
      continue;
    }

    const destinationPath = path.join(hooksOutputDir, fileName);
    await copyFile(sourcePath, destinationPath);
    outputs.push(destinationPath);
  }

  return outputs;
};

const isDirectRun = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const getArgValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index === -1) {
      return undefined;
    }

    return args[index + 1];
  };

  const targetDir = path.resolve(process.cwd(), getArgValue("--target-dir") ?? ".");
  const force = args.includes("--force");
  const packageRoot = path.resolve(__dirname, "../..");

  try {
    const outputs = await renderClaude(targetDir, force, packageRoot);
    for (const output of outputs) {
      process.stdout.write(`Wrote ${output}\n`);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
