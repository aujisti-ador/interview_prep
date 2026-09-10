/**
 * Test harness for coding problems.
 *
 * Deliberately environment-agnostic: it uses nothing but standard JS, so the
 * exact same file runs (a) in the Node validation script that proves every
 * bundled solution passes its own tests, and (b) inside the browser Web Worker
 * that runs the candidate's code.
 *
 * NOTE: `web/src/lib/harness.ts` is a copy of this file. If you change the
 * semantics here, change it there too — the validation script is what keeps
 * the content honest, and the worker is what the user actually experiences.
 */

export interface HarnessTestCase {
  args?: any[];
  ops?: string[];
  driver?: string;
  expected: any;
  note?: string;
}

export interface HarnessSpec {
  mode?: 'call' | 'ops' | 'driver';
  argTypes?: string[];
  returnType?: string;
  compare?: string;
  cases: HarnessTestCase[];
}

export interface CaseResult {
  index: number;
  ok: boolean;
  note?: string;
  input: string;
  expected: string;
  actual: string;
  error?: string;
  durationMs: number;
}

export interface HarnessResult {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  compileError?: string;
  results: CaseResult[];
}

// ---------------------------------------------------------------- structures

interface ListNode {
  val: any;
  next: ListNode | null;
}

interface TreeNode {
  val: any;
  left: TreeNode | null;
  right: TreeNode | null;
}

function arrayToList(values: any[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = { val: values[i], next: head };
  return head;
}

function listToArray(node: ListNode | null): any[] {
  const out: any[] = [];
  let guard = 0;
  while (node) {
    out.push(node.val);
    node = node.next;
    if (++guard > 100000) throw new Error('cycle detected in returned list');
  }
  return out;
}

function arrayToCyclicList(spec: { values: any[]; pos: number }): ListNode | null {
  const nodes = spec.values.map((v) => ({ val: v, next: null as ListNode | null }));
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].next = nodes[i + 1];
  if (spec.pos >= 0 && nodes.length) nodes[nodes.length - 1].next = nodes[spec.pos];
  return nodes[0] ?? null;
}

/** LeetCode level-order serialisation, with `null` for absent children. */
function arrayToTree(values: any[]): TreeNode | null {
  if (!values.length || values[0] === null || values[0] === undefined) return null;
  const root: TreeNode = { val: values[0], left: null, right: null };
  const queue: TreeNode[] = [root];
  let i = 1;
  while (queue.length && i < values.length) {
    const node = queue.shift();
    if (i < values.length) {
      const v = values[i++];
      if (v !== null && v !== undefined) {
        node.left = { val: v, left: null, right: null };
        queue.push(node.left);
      }
    }
    if (i < values.length) {
      const v = values[i++];
      if (v !== null && v !== undefined) {
        node.right = { val: v, left: null, right: null };
        queue.push(node.right);
      }
    }
  }
  return root;
}

function treeToArray(root: TreeNode | null): any[] {
  if (!root) return [];
  const out: any[] = [];
  const queue: (TreeNode | null)[] = [root];
  while (queue.length) {
    const node = queue.shift();
    if (node) {
      out.push(node.val);
      queue.push(node.left, node.right);
    } else {
      out.push(null);
    }
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

interface GraphNode {
  val: number;
  neighbors: GraphNode[];
}

/** adjList[i] holds the neighbours (1-indexed labels) of node i+1. */
function adjToGraph(adjList: number[][]): GraphNode | null {
  if (!adjList || adjList.length === 0) return null;
  const nodes: GraphNode[] = adjList.map((_, i) => ({ val: i + 1, neighbors: [] }));
  adjList.forEach((neighbors, i) => {
    for (const label of neighbors) nodes[i].neighbors.push(nodes[label - 1]);
  });
  return nodes[0];
}

function graphToAdj(node: GraphNode | null): number[][] {
  if (!node) return [];
  const seen = new Map<number, GraphNode>();
  const stack = [node];
  while (stack.length) {
    const n = stack.pop();
    if (seen.has(n.val)) continue;
    seen.set(n.val, n);
    for (const nb of n.neighbors) if (!seen.has(nb.val)) stack.push(nb);
  }
  const labels = [...seen.keys()].sort((a, b) => a - b);
  return labels.map((label) => seen.get(label).neighbors.map((n) => n.val).sort((a, b) => a - b));
}

// ---------------------------------------------------------------- comparison

function canonical(value: any): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    if (value instanceof Map) return 'Map{' + [...value.entries()].map(([k, v]) => canonical(k) + ':' + canonical(v)).join(',') + '}';
    if (value instanceof Set) return 'Set{' + [...value].map(canonical).join(',') + '}';
    if (value instanceof Date) return 'Date(' + value.getTime() + ')';
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sortStrings(items: any[]): any[] {
  return [...items].sort((a, b) => (canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0));
}

function equals(actual: any, expected: any, mode = 'deep'): boolean {
  switch (mode) {
    case 'unordered':
      if (!Array.isArray(actual) || !Array.isArray(expected)) return canonical(actual) === canonical(expected);
      return canonical(sortStrings(actual)) === canonical(sortStrings(expected));
    case 'unorderedOuter':
      if (!Array.isArray(actual) || !Array.isArray(expected)) return canonical(actual) === canonical(expected);
      return canonical(sortStrings(actual)) === canonical(sortStrings(expected));
    case 'unorderedNested': {
      if (!Array.isArray(actual) || !Array.isArray(expected)) return canonical(actual) === canonical(expected);
      const normalise = (arr: any[]) => sortStrings(arr.map((inner) => (Array.isArray(inner) ? sortStrings(inner) : inner)));
      return canonical(normalise(actual)) === canonical(normalise(expected));
    }
    case 'oneOf':
      return (expected as any[]).some((candidate) => canonical(actual) === canonical(candidate));
    default:
      return canonical(actual) === canonical(expected);
  }
}

function preview(value: any, limit = 220): string {
  let text: string;
  try {
    text = typeof value === 'string' ? JSON.stringify(value) : canonical(value);
  } catch {
    text = String(value);
  }
  return text.length > limit ? text.slice(0, limit) + '…' : text;
}

// ---------------------------------------------------------------- transforms

function transformArg(value: any, type = 'raw'): any {
  switch (type) {
    case 'list':
      return arrayToList(value ?? []);
    case 'listCycle':
      return arrayToCyclicList(value);
    case 'listArray':
      return (value ?? []).map((v: any[]) => arrayToList(v ?? []));
    case 'tree':
      return arrayToTree(value ?? []);
    case 'graph':
      return adjToGraph(value ?? []);
    default:
      return value;
  }
}

function transformResult(value: any, type = 'raw'): any {
  switch (type) {
    case 'list':
      return listToArray(value ?? null);
    case 'tree':
      return treeToArray(value ?? null);
    case 'graph':
      return graphToAdj(value ?? null);
    default:
      return value;
  }
}

// ---------------------------------------------------------------- runner

function compile(userCode: string, symbol: string): any {
  const factory = new Function(
    `"use strict";\n${userCode}\n;return typeof ${symbol} !== "undefined" ? ${symbol} : undefined;`,
  );
  const value = factory();
  if (value === undefined) {
    throw new Error(
      `Could not find \`${symbol}\` in your code. Keep the function or class name exactly as given.`,
    );
  }
  return value;
}

async function runOne(
  target: any,
  spec: HarnessSpec,
  testCase: HarnessTestCase,
): Promise<{ actual: any; input: string }> {
  const mode = spec.mode ?? 'call';

  if (mode === 'driver') {
    const driver = new Function(`"use strict";return (${testCase.driver});`)();
    const actual = await driver(target);
    return { actual, input: testCase.note ?? 'scripted scenario' };
  }

  if (mode === 'ops') {
    const ops = testCase.ops ?? [];
    const argSets = (testCase.args ?? []) as any[][];
    const out: any[] = [];
    let instance: any = null;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const args = argSets[i] ?? [];
      if (i === 0) {
        instance = new target(...args);
        out.push(null);
      } else {
        const returned = instance[op](...args);
        out.push(returned === undefined ? null : returned);
      }
    }
    return { actual: out, input: preview({ ops, args: argSets }) };
  }

  const rawArgs = testCase.args ?? [];
  const args = rawArgs.map((value, i) => transformArg(value, spec.argTypes?.[i] ?? 'raw'));
  const returned = await target(...args);
  return { actual: transformResult(returned, spec.returnType ?? 'raw'), input: preview(rawArgs) };
}

export async function runTests(
  userCode: string,
  symbol: string,
  spec: HarnessSpec,
): Promise<HarnessResult> {
  let target: any;
  try {
    target = compile(userCode, symbol);
  } catch (err: any) {
    return {
      passed: false,
      passedCount: 0,
      totalCount: spec.cases.length,
      compileError: err?.message ?? String(err),
      results: [],
    };
  }

  const results: CaseResult[] = [];
  for (let i = 0; i < spec.cases.length; i++) {
    const testCase = spec.cases[i];
    const started = Date.now();
    try {
      const { actual, input } = await runOne(target, spec, testCase);
      const ok = equals(actual, testCase.expected, spec.compare ?? 'deep');
      results.push({
        index: i,
        ok,
        note: testCase.note,
        input,
        expected: preview(testCase.expected),
        actual: preview(actual),
        durationMs: Date.now() - started,
      });
    } catch (err: any) {
      // A rejection can be the expected outcome, expressed as { __error: message }.
      const message = err?.message ?? String(err);
      const expectsError =
        testCase.expected && typeof testCase.expected === 'object' && '__error' in testCase.expected;
      const ok = expectsError && (testCase.expected as any).__error === message;
      results.push({
        index: i,
        ok,
        note: testCase.note,
        input: preview(testCase.args ?? testCase.note ?? ''),
        expected: preview(testCase.expected),
        actual: `threw: ${message}`,
        error: ok ? undefined : message,
        durationMs: Date.now() - started,
      });
    }
  }

  const passedCount = results.filter((r) => r.ok).length;
  return {
    passed: passedCount === results.length && results.length > 0,
    passedCount,
    totalCount: results.length,
    results,
  };
}
