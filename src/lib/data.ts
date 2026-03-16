import fs from "fs";
import path from "path";
import type { Project } from "@/types";

const dataDir = path.join(process.cwd(), "data");

export function getResume(): string {
  return fs.readFileSync(path.join(dataDir, "resume.md"), "utf-8");
}

export function getProjects(): Project[] {
  const raw = fs.readFileSync(path.join(dataDir, "projects.json"), "utf-8");
  return JSON.parse(raw);
}
