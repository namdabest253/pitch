import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export function spawnClaude(opts: {
  message: string;
  model?: string;
  systemPrompt?: string;
  resumeSessionId?: string;
  allowedTools?: string[];
  dangerouslySkipPermissions?: boolean;
}): ChildProcess {
  const parts = ["claude", "-p", shellEscape(opts.message)];
  parts.push("--output-format", "stream-json");
  parts.push("--verbose");
  parts.push("--model", opts.model || "sonnet");

  let tmpFile: string | null = null;

  if (opts.resumeSessionId) {
    parts.push("--resume", shellEscape(opts.resumeSessionId));
  }

  if (opts.systemPrompt) {
    tmpFile = path.join(os.tmpdir(), `speaker-prompt-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(tmpFile, opts.systemPrompt, "utf-8");
    parts.push("--system-prompt", `"$(cat ${shellEscape(tmpFile)})"`);
  }

  if (opts.allowedTools && opts.allowedTools.length > 0) {
    parts.push("--allowedTools", opts.allowedTools.map(shellEscape).join(" "));
  } else if (!opts.resumeSessionId) {
    parts.push("--tools", '""');
  }

  if (opts.dangerouslySkipPermissions) {
    parts.push("--dangerously-skip-permissions");
  }

  const cmd = parts.join(" ");
  console.log("[spawn-claude] Command:", cmd.slice(0, 300) + (cmd.length > 300 ? "..." : ""));
  console.log("[spawn-claude] Spawning at:", new Date().toISOString());

  // Use setsid to detach from the parent terminal session.
  // Without this, the claude process inherits the Next.js terminal
  // and can hang waiting for TTY access.
  const proc = spawn("setsid", ["sh", "-c", cmd], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  console.log("[spawn-claude] Process PID:", proc.pid);

  if (tmpFile) {
    const f = tmpFile;
    proc.on("close", () => {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    });
  }

  return proc;
}
