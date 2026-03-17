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

export interface BehavioralStory {
  title: string;
  tags: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  lessons: string;
}

export interface BehavioralData {
  strengths: string[];
  weaknesses: string[];
  stories: BehavioralStory[];
  values: string[];
  goals: string[];
}

export interface ChatRequest {
  message: string;
  mode: Mode;
  sessionId?: string;
}

export interface FeedbackRequest {
  userMessage: string;
  agentQuestion: string;
  mode: Mode;
}

export interface Feedback {
  userMessageIndex: number;
  content: string;
}

export interface SessionLog {
  id: string;
  mode: Mode;
  startedAt: string;
  messages: Message[];
  feedbacks: Feedback[];
}
