const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ---------------------------------------------------------------- types

export interface Stats {
  readiness: number;
  sessionNumber: number;
  sessionsTotal: number;
  sessionsDone: number;
  components: { dsa: number; design: number; recall: number; narrative: number; plan: number };
  counts: {
    tasksDone: number;
    tasksTotal: number;
    problemsSolved: number;
    problemsTotal: number;
    problemsMastered: number;
    quizSessions: number;
    quizAccuracy: number;
    drillAttempts: number;
    stories: number;
    storiesRehearsed: number;
    applications: number;
    unratedSkills: number;
  };
}

export interface PlanTask {
  id: string;
  dayId: number;
  order: number;
  kind: string;
  title: string;
  detail: string;
  ref: string;
  minutes: number;
  progress?: { status: string; notes: string; minutesSpent: number } | null;
}

export interface PlanDay {
  id: number;
  week: number;
  title: string;
  theme: string;
  focus: string;
  hiringLens: string;
  targetMins: number;
  tasks: PlanTask[];
  done?: number;
  total?: number;
}

export interface ProblemListItem {
  id: string;
  title: string;
  pattern: string;
  difficulty: string;
  week: number;
  frequency: number;
  companies: string[];
  status: string;
  confidence: number;
  timesSolved: number;
  nextReviewAt: string | null;
}

export interface Problem {
  id: string;
  title: string;
  pattern: string;
  difficulty: string;
  week: number;
  frequency: number;
  prompt: string;
  functionName: string;
  starterCode: string;
  hints: string[];
  solution: string;
  complexity: string;
  companies: string[];
  /** LeetCode slug. Empty for the Node Practical set, which has no equivalent. */
  leetcode: string;
  tests: any;
  status?: { status: string; savedCode: string; confidence: number; timesSolved: number } | null;
}

export interface Drill {
  id: string;
  title: string;
  kind: string;
  difficulty: string;
  timeboxMin: number;
  prompt: string;
  constraints: string;
  rubric: { id: string; label: string; weight: number; hint: string }[];
  ref: string;
  attempts?: DrillAttempt[];
}

export interface DrillAttempt {
  id: string;
  notes: string;
  scores: Record<string, number>;
  totalScore: number;
  maxScore: number;
  durationMin: number;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  demand: number;
  level: number;
  rated: boolean;
  gap: number;
  priority: string;
  why: string;
  proveIt: string;
  ref: string;
  note: string;
  assumed: number;
}

export interface StarStory {
  id: string;
  promptId: string | null;
  title: string;
  competency: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics: string;
  tags: string[];
  rehearsals: number;
  confidence: number;
}

export interface StarPrompt {
  id: string;
  competency: string;
  prompt: string;
  whatGoodLooksLike: string;
  redFlags: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  market: string;
  source: string;
  status: string;
  compNote: string;
  nextAction: string;
  link: string;
  appliedAt: string | null;
  updatedAt: string;
}
