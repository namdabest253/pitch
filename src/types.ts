export type Mode = "interviewer" | "layman";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Project {
  name: string;
  url: string;
  description: string;
  technologies: string[];
  keyDecisions: string[];
}

export interface ChatRequest {
  message: string;
  mode: Mode;
  sessionId?: string; // Claude Code session ID for --resume
}
