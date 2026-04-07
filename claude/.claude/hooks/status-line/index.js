#!/usr/bin/env node

import { execSync } from "node:child_process";
import path from "node:path";

let input = "";

process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const model = data.model?.display_name || data.model?.name || "Claude";
    const dir = path.basename(data.workspace?.current_dir || process.cwd());
    const cost = Number(data.cost?.total_cost_usd || 0);
    const pct = Math.floor(Number(data.context_window?.used_percentage || 0));
    const durationMs = Number(data.cost?.total_duration_ms || 0);

    const CYAN = "\x1b[36m";
    const GREEN = "\x1b[32m";
    const YELLOW = "\x1b[33m";
    const RED = "\x1b[31m";
    const RESET = "\x1b[0m";

    let barColor = GREEN;
    if (pct >= 90) {
      barColor = RED;
    } else if (pct >= 70) {
      barColor = YELLOW;
    }

    const filled = Math.max(0, Math.min(10, Math.floor(pct / 10)));
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);

    let branch = "";
    try {
      branch = execSync("git branch --show-current", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();
      branch = branch ? ` | 🌿 ${branch}` : "";
    } catch {
      branch = "";
    }

    process.stdout.write(`${CYAN}[${model}]${RESET} 📁 ${dir}${branch}\n`);
    process.stdout.write(
      `${barColor}${bar}${RESET} ${pct}% | ${YELLOW}$${cost.toFixed(2)}${RESET} | ⏱️ ${mins}m ${secs}s\n`,
    );
  } catch {
    process.stdout.write("Claude\n");
  }
});
