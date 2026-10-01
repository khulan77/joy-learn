import type { Session, Attempt } from "./index";
export type Difficulty = 1 | 2 | 3;
export interface Skill {
  id: string;
  name: string;
  topicId: string;
  topic: string;
  concept: string;
  grade: 3;
  subject: "math";
}
export interface CommonMistake {
  id: string;
  answer: number;
  explanation: string;
  remediationHint: string;
}
export interface StructuredExercise {
  id: string;
  version: 1;
  source: "sample";
  skillId: string;
  grade: 3;
  subject: "math";
  topicId: string;
  difficulty: Difficulty;
  question: string;
  correctAnswer: number;
  solutionSteps: string[];
  hints: [string, string, string];
  commonMistakes: CommonMistake[];
  reinforcement: string;
}
export interface PracticeData {
  exercise: StructuredExercise;
  skill: Skill;
  selectionReason: string;
}
export interface MasteryChange {
  attemptId: string;
  sessionId: string;
  skillId: string;
  before: number;
  after: number;
  delta: number;
  createdAt: string;
}
export interface SkillProgress {
  skill: Skill;
  score: number;
  attempts: number;
  correct: number;
  hintsUsed: number;
  practiced: boolean;
  history: MasteryChange[];
}
export interface ProgressView {
  skills: SkillProgress[];
  recommendedSkillId: string;
  storage: "file" | "postgres";
}
export interface PracticeView {
  id: string;
  skill: Skill;
  exercise: Pick<
    StructuredExercise,
    "id" | "question" | "difficulty" | "source"
  >;
  status: Session["status"];
  version: number;
  hintLevel: number;
  hintsUsed: number;
  messages: Session["messages"];
  attempts: Attempt[];
  storage: "file" | "postgres";
  selectionReason: string;
}
