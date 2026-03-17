import fs from "fs";
import path from "path";
import type { Project, BehavioralData, SessionLog } from "@/types";

const dataDir = path.join(process.cwd(), "data");
const logsDir = path.join(process.cwd(), "logs");

export function getResume(): string {
  return fs.readFileSync(path.join(dataDir, "resume.md"), "utf-8");
}

export function getProjects(): Project[] {
  const raw = fs.readFileSync(path.join(dataDir, "projects.json"), "utf-8");
  return JSON.parse(raw);
}

export function getBehavioral(): BehavioralData {
  const raw = fs.readFileSync(path.join(dataDir, "behavioral.json"), "utf-8");
  return JSON.parse(raw);
}

export function saveSessionLog(log: SessionLog): void {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const filename = `${log.startedAt.replace(/[:.]/g, "-")}_${log.mode}_${log.id}.json`;
  fs.writeFileSync(
    path.join(logsDir, filename),
    JSON.stringify(log, null, 2),
    "utf-8"
  );
}

export function getSessionLogs(): { filename: string; summary: { id: string; mode: string; startedAt: string; messageCount: number } }[] {
  if (!fs.existsSync(logsDir)) return [];
  const files = fs.readdirSync(logsDir).filter((f) => f.endsWith(".json"));
  return files
    .sort()
    .reverse()
    .map((filename) => {
      const raw = fs.readFileSync(path.join(logsDir, filename), "utf-8");
      const log: SessionLog = JSON.parse(raw);
      return {
        filename,
        summary: {
          id: log.id,
          mode: log.mode,
          startedAt: log.startedAt,
          messageCount: log.messages.length,
        },
      };
    });
}

export function getSessionLog(filename: string): SessionLog | null {
  const filepath = path.join(logsDir, filename);
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(raw);
}
