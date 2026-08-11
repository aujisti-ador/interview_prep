export type TaskKind =
  | 'read'
  | 'dsa'
  | 'design'
  | 'quiz'
  | 'behavioral'
  | 'project'
  | 'admin'
  | 'mock';

export interface PlanTaskSeed {
  kind: TaskKind;
  title: string;
  detail?: string;
  /** relative path into the interview_prep repo, or an in-app route like `practice?pattern=Arrays` */
  ref?: string;
  minutes: number;
}

export interface PlanDaySeed {
  id: number;
  week: number;
  title: string;
  theme: string;
  focus: string;
  /** What a hiring manager is actually testing when this material comes up. */
  hiringLens: string;
  targetMins?: number;
  tasks: PlanTaskSeed[];
}

export type ArgType = 'raw' | 'list' | 'listCycle' | 'listArray' | 'tree' | 'graph';

export type CompareMode =
  | 'deep'
  /** flat arrays, order irrelevant */
  | 'unordered'
  /** array of arrays; outer order irrelevant, inner order preserved */
  | 'unorderedOuter'
  /** array of arrays; both outer and inner order irrelevant */
  | 'unorderedNested'
  /** `expected` is a list of acceptable answers */
  | 'oneOf';

export interface TestSpec {
  /**
   * call   — invoke the function with `args`
   * ops    — construct a class then replay a method sequence
   * driver — run a bespoke async script against the submission
   */
  mode?: 'call' | 'ops' | 'driver';
  argTypes?: ArgType[];
  returnType?: ArgType;
  compare?: CompareMode;
  cases: Array<{
    args?: any[];
    ops?: string[];
    /** source of `async (fnOrClass) => any`, used when mode === 'driver' */
    driver?: string;
    expected: any;
    note?: string;
  }>;
}

export interface ProblemSeed {
  id: string;
  title: string;
  pattern: string;
  difficulty: 'easy' | 'medium' | 'hard';
  week: number;
  /** 1..5 — how often this shape shows up in real online assessments. */
  frequency: number;
  prompt: string;
  functionName: string;
  starterCode: string;
  hints: string[];
  solution: string;
  complexity?: string;
  companies?: string[];
  tests: TestSpec;
}

export interface QuizSeed {
  id: string;
  topic: string;
  phase?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  ref?: string;
}

export interface RubricItem {
  id: string;
  label: string;
  weight: number;
  hint: string;
}

export interface DrillSeed {
  id: string;
  title: string;
  kind: 'hld' | 'lld' | 'architecture';
  difficulty: 'easy' | 'medium' | 'hard';
  timeboxMin: number;
  prompt: string;
  constraints?: string;
  rubric: RubricItem[];
  ref?: string;
}

export interface StarPromptSeed {
  id: string;
  competency: string;
  prompt: string;
  whatGoodLooksLike: string;
  redFlags: string;
}

export interface DocSeed {
  id: string;
  title: string;
  body: string;
}
