export type Operation = "+" | "-" | "×" | "÷";
export interface Step {
  question: string;
  answer: number;
  hints: [string, string];
}
export interface Exercise {
  text: string;
  topic: string;
  operation: Operation;
  steps: Step[];
}
export interface Message {
  id: string;
  role: "student" | "tutor";
  content: string;
  createdAt: string;
}
export interface Attempt {
  id: string;
  answer: string;
  correct: boolean;
  step: number;
  hintLevel: number;
  createdAt: string;
}
export interface Session {
  id: string;
  studentId: string;
  problem: string;
  topic: string;
  grade: 3;
  status: "active" | "completed";
  step: number;
  hintLevel: number;
  hintsUsed: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  attempts: Attempt[];
}
export interface SessionView extends Session {
  totalSteps: number;
  storage: "file" | "postgres";
}
