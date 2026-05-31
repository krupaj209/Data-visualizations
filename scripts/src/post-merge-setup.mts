/**
 * Post-merge setup script.
 *
 * Run automatically after task merges to flag any guide-impacting changes.
 * Not a gate — just a reminder logged to stdout so developers notice.
 *
 * Usage: pnpm --filter @workspace/scripts run post-merge-setup
 */

import { execSync } from "child_process";

const SENTINEL_FILES = [
  "artifacts/api-server/src/lib/research-pipeline.ts",
  "artifacts/api-server/src/lib/chart-spec.ts",
  "lib/question-bank/src/assembler.ts",
  "lib/question-bank/src/page-templates.ts",
  "lib/question-bank/src/bundles.ts",
];

function getChangedFiles(): string[] {
  try {
    const output = execSync("git diff --name-only HEAD~1 HEAD 2>/dev/null", {
      encoding: "utf8",
    }).trim();
    if (!output) return [];
    return output.split("\n").map((f) => f.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  console.log("🔧 Running post-merge setup checks…");

  const changed = getChangedFiles();

  if (changed.length === 0) {
    console.log("ℹ️  Could not determine changed files (no prior commit or git unavailable).");
    return;
  }

  const sentinelChanged = SENTINEL_FILES.filter((s) =>
    changed.some((c) => c.endsWith(s) || c === s),
  );

  if (sentinelChanged.length > 0) {
    console.log("");
    console.warn(
      "⚠️  Guide may need updating — the following files changed and have guide-facing documentation:",
    );
    for (const f of sentinelChanged) {
      console.warn(`   • ${f}`);
    }
    console.warn("   → Check the narrative sections at /guide and update if needed.");
    console.log("");
  } else {
    console.log("✅ No sentinel files changed — /guide is likely still current.");
  }

  console.log("🔧 Post-merge setup complete.");
}

main();
