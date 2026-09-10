import { ProblemSeed } from './types';

/** Graphs, backtracking, intervals and greedy — the week 3 block. */
export const graphProblems: ProblemSeed[] = [
  // ------------------------------------------------- Graphs
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 5,
    prompt:
      'Given an `m x n` grid of "1" (land) and "0" (water), return the number of islands. An island is surrounded by water and formed by connecting adjacent land cells horizontally or vertically.',
    functionName: 'numIslands',
    starterCode: 'function numIslands(grid) {\n  // your code here\n}',
    hints: [
      'Scan every cell; when you hit unvisited land, that is a new island — then flood-fill it.',
      'Sinking the island in place (setting cells to "0") avoids a separate visited set. Say out loud that you are mutating the input.',
    ],
    solution:
      'function numIslands(grid) {\n  if (!grid.length) return 0;\n  const rows = grid.length, cols = grid[0].length;\n  let count = 0;\n  const sink = (r, c) => {\n    const stack = [[r, c]];\n    while (stack.length) {\n      const [cr, cc] = stack.pop();\n      if (cr < 0 || cc < 0 || cr >= rows || cc >= cols || grid[cr][cc] !== "1") continue;\n      grid[cr][cc] = "0";\n      stack.push([cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]);\n    }\n  };\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) {\n      if (grid[r][c] === "1") { count++; sink(r, c); }\n    }\n  }\n  return count;\n}',
    complexity: 'O(m*n) time, O(m*n) worst-case stack space.',
    companies: ['Very common in remote screens'],
    leetcode: 'number-of-islands',
    tests: {
      cases: [
        {
          args: [[['1', '1', '1', '1', '0'], ['1', '1', '0', '1', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '0', '0', '0']]],
          expected: 1,
        },
        {
          args: [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]],
          expected: 3,
        },
        { args: [[['0']]], expected: 0 },
      ],
    },
  },
  {
    id: 'max-area-of-island',
    title: 'Max Area of Island',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt: 'Given a binary grid, return the area (number of cells) of the largest island. Return 0 if there is no island.',
    functionName: 'maxAreaOfIsland',
    starterCode: 'function maxAreaOfIsland(grid) {\n  // your code here\n}',
    hints: ['Same flood fill as Number of Islands, but the fill returns a count.', 'Track the max across all fills.'],
    solution:
      'function maxAreaOfIsland(grid) {\n  const rows = grid.length, cols = grid[0].length;\n  let best = 0;\n  const fill = (r, c) => {\n    if (r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] !== 1) return 0;\n    grid[r][c] = 0;\n    return 1 + fill(r + 1, c) + fill(r - 1, c) + fill(r, c + 1) + fill(r, c - 1);\n  };\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) {\n      if (grid[r][c] === 1) best = Math.max(best, fill(r, c));\n    }\n  }\n  return best;\n}',
    complexity: 'O(m*n) time and space.',
    leetcode: 'max-area-of-island',
    tests: {
      cases: [
        { args: [[[1, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 1]]], expected: 3 },
        { args: [[[0, 0], [0, 0]]], expected: 0 },
        { args: [[[1]]], expected: 1 },
      ],
    },
  },
  {
    id: 'clone-graph',
    title: 'Clone Graph',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt:
      'Given a reference to a node in a connected undirected graph, return a deep copy of the graph.\n\nEach node is `{ val, neighbors }`. Input is given as an adjacency list where `adjList[i]` are the neighbours of node `i + 1`; the runner builds the real graph and serialises your clone back.',
    functionName: 'cloneGraph',
    starterCode: 'function cloneGraph(node) {\n  // your code here\n}',
    hints: [
      'The trap is infinite recursion on cycles.',
      'Keep a Map from original node -> clone. Create the clone and register it BEFORE recursing into neighbours.',
    ],
    solution:
      'function cloneGraph(node) {\n  if (!node) return null;\n  const seen = new Map();\n  const dfs = (n) => {\n    if (seen.has(n)) return seen.get(n);\n    const copy = { val: n.val, neighbors: [] };\n    seen.set(n, copy);\n    for (const nb of n.neighbors) copy.neighbors.push(dfs(nb));\n    return copy;\n  };\n  return dfs(node);\n}',
    complexity: 'O(V + E) time, O(V) space.',
    leetcode: 'clone-graph',
    tests: {
      argTypes: ['graph'],
      returnType: 'graph',
      cases: [
        { args: [[[2, 4], [1, 3], [2, 4], [1, 3]]], expected: [[2, 4], [1, 3], [2, 4], [1, 3]] },
        { args: [[[]]], expected: [[]] },
        { args: [[]], expected: [] },
      ],
    },
  },
  {
    id: 'rotting-oranges',
    title: 'Rotting Oranges',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt:
      'In a grid, 0 is empty, 1 is a fresh orange, 2 is rotten. Each minute, a fresh orange adjacent to a rotten one becomes rotten. Return the minutes until no fresh orange remains, or -1 if that is impossible.',
    functionName: 'orangesRotting',
    starterCode: 'function orangesRotting(grid) {\n  // your code here\n}',
    hints: [
      'This is multi-source BFS: every rotten orange starts in the queue at time 0.',
      'Count fresh oranges up front so you can detect the unreachable case at the end.',
    ],
    solution:
      'function orangesRotting(grid) {\n  const rows = grid.length, cols = grid[0].length;\n  let fresh = 0;\n  let queue = [];\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) {\n      if (grid[r][c] === 1) fresh++;\n      else if (grid[r][c] === 2) queue.push([r, c]);\n    }\n  }\n  let minutes = 0;\n  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];\n  while (queue.length && fresh > 0) {\n    const next = [];\n    for (const [r, c] of queue) {\n      for (const [dr, dc] of dirs) {\n        const nr = r + dr, nc = c + dc;\n        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] !== 1) continue;\n        grid[nr][nc] = 2;\n        fresh--;\n        next.push([nr, nc]);\n      }\n    }\n    queue = next;\n    minutes++;\n  }\n  return fresh === 0 ? minutes : -1;\n}',
    complexity: 'O(m*n) time and space.',
    leetcode: 'rotting-oranges',
    tests: {
      cases: [
        { args: [[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], expected: 4 },
        { args: [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], expected: -1 },
        { args: [[[0, 2]]], expected: 0 },
      ],
    },
  },
  {
    id: 'pacific-atlantic-water-flow',
    title: 'Pacific Atlantic Water Flow',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt:
      'Given an `m x n` matrix of heights, the Pacific touches the top and left edges and the Atlantic touches the bottom and right edges. Water flows from a cell to a neighbour of equal or lower height. Return all coordinates `[r, c]` from which water can reach both oceans. Order does not matter.',
    functionName: 'pacificAtlantic',
    starterCode: 'function pacificAtlantic(heights) {\n  // your code here\n}',
    hints: [
      'Simulating downhill from every cell is O((mn)^2). Invert the problem.',
      'Start from the ocean edges and walk UPHILL, marking reachable cells. Intersect the two reachable sets.',
    ],
    solution:
      'function pacificAtlantic(heights) {\n  if (!heights.length) return [];\n  const rows = heights.length, cols = heights[0].length;\n  const pac = Array.from({ length: rows }, () => new Array(cols).fill(false));\n  const atl = Array.from({ length: rows }, () => new Array(cols).fill(false));\n  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];\n  const dfs = (r, c, seen) => {\n    seen[r][c] = true;\n    for (const [dr, dc] of dirs) {\n      const nr = r + dr, nc = c + dc;\n      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;\n      if (seen[nr][nc] || heights[nr][nc] < heights[r][c]) continue;\n      dfs(nr, nc, seen);\n    }\n  };\n  for (let c = 0; c < cols; c++) { dfs(0, c, pac); dfs(rows - 1, c, atl); }\n  for (let r = 0; r < rows; r++) { dfs(r, 0, pac); dfs(r, cols - 1, atl); }\n  const out = [];\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) {\n      if (pac[r][c] && atl[r][c]) out.push([r, c]);\n    }\n  }\n  return out;\n}',
    complexity: 'O(m*n) time and space.',
    leetcode: 'pacific-atlantic-water-flow',
    tests: {
      compare: 'unorderedOuter',
      cases: [
        {
          args: [[[1, 2, 2, 3, 5], [3, 2, 3, 4, 4], [2, 4, 5, 3, 1], [6, 7, 1, 4, 5], [5, 1, 1, 2, 4]]],
          expected: [[0, 4], [1, 3], [1, 4], [2, 2], [3, 0], [3, 1], [4, 0]],
        },
        { args: [[[1]]], expected: [[0, 0]] },
      ],
    },
  },
  {
    id: 'course-schedule',
    title: 'Course Schedule',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 5,
    prompt:
      'There are `numCourses` courses labelled `0..numCourses-1` and a list of `prerequisites` where `[a, b]` means you must take `b` before `a`. Return `true` if you can finish all courses.',
    functionName: 'canFinish',
    starterCode: 'function canFinish(numCourses, prerequisites) {\n  // your code here\n}',
    hints: [
      'Restate it: "does this directed graph have a cycle?"',
      'Kahn\'s algorithm: repeatedly remove nodes with in-degree 0. If you cannot remove all of them, there is a cycle.',
    ],
    solution:
      'function canFinish(numCourses, prerequisites) {\n  const adj = Array.from({ length: numCourses }, () => []);\n  const indeg = new Array(numCourses).fill(0);\n  for (const [a, b] of prerequisites) {\n    adj[b].push(a);\n    indeg[a]++;\n  }\n  const queue = [];\n  for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) queue.push(i);\n  let taken = 0;\n  while (queue.length) {\n    const n = queue.pop();\n    taken++;\n    for (const nb of adj[n]) {\n      if (--indeg[nb] === 0) queue.push(nb);\n    }\n  }\n  return taken === numCourses;\n}',
    complexity: 'O(V + E) time and space.',
    leetcode: 'course-schedule',
    tests: {
      cases: [
        { args: [2, [[1, 0]]], expected: true },
        { args: [2, [[1, 0], [0, 1]]], expected: false },
        { args: [5, [[1, 0], [2, 1], [3, 2], [4, 3]]], expected: true },
        { args: [3, []], expected: true },
      ],
    },
  },
  {
    id: 'course-schedule-ii',
    title: 'Course Schedule II',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt:
      'Same setup as Course Schedule, but return a valid ordering of courses. If none exists, return an empty array. Any valid topological order is accepted.',
    functionName: 'findOrder',
    starterCode: 'function findOrder(numCourses, prerequisites) {\n  // your code here\n}',
    hints: ['Kahn\'s algorithm again — this time record the removal order.', 'If the recorded order is shorter than numCourses, there was a cycle; return [].'],
    solution:
      'function findOrder(numCourses, prerequisites) {\n  const adj = Array.from({ length: numCourses }, () => []);\n  const indeg = new Array(numCourses).fill(0);\n  for (const [a, b] of prerequisites) {\n    adj[b].push(a);\n    indeg[a]++;\n  }\n  const queue = [];\n  for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) queue.push(i);\n  const order = [];\n  while (queue.length) {\n    const n = queue.shift();\n    order.push(n);\n    for (const nb of adj[n]) {\n      if (--indeg[nb] === 0) queue.push(nb);\n    }\n  }\n  return order.length === numCourses ? order : [];\n}',
    complexity: 'O(V + E) time and space.',
    leetcode: 'course-schedule-ii',
    tests: {
      compare: 'oneOf',
      cases: [
        { args: [2, [[1, 0]]], expected: [[0, 1]] },
        { args: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], expected: [[0, 1, 2, 3], [0, 2, 1, 3]] },
        { args: [1, []], expected: [[0]] },
        { args: [2, [[1, 0], [0, 1]]], expected: [[]] },
      ],
    },
  },
  {
    id: 'network-delay-time',
    title: 'Network Delay Time',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt:
      'You are given `times` as a list of `[u, v, w]` travel times on directed edges, `n` nodes labelled `1..n`, and a starting node `k`. Return the time for all nodes to receive the signal, or -1 if some node is unreachable.',
    functionName: 'networkDelayTime',
    starterCode: 'function networkDelayTime(times, n, k) {\n  // your code here\n}',
    hints: [
      'This is single-source shortest path with non-negative weights — Dijkstra.',
      'The answer is the maximum of all shortest distances. Unreachable node means -1.',
    ],
    solution:
      'function networkDelayTime(times, n, k) {\n  const adj = new Map();\n  for (const [u, v, w] of times) {\n    if (!adj.has(u)) adj.set(u, []);\n    adj.get(u).push([v, w]);\n  }\n  const dist = new Map();\n  // Small n, so a linear-scan priority queue is fine and easy to defend.\n  const pq = [[0, k]];\n  while (pq.length) {\n    pq.sort((a, b) => a[0] - b[0]);\n    const [d, node] = pq.shift();\n    if (dist.has(node)) continue;\n    dist.set(node, d);\n    for (const [nb, w] of adj.get(node) || []) {\n      if (!dist.has(nb)) pq.push([d + w, nb]);\n    }\n  }\n  if (dist.size !== n) return -1;\n  return Math.max(...dist.values());\n}',
    complexity: 'O(E log V) with a real heap; the linear-scan queue here is O(E * V).',
    leetcode: 'network-delay-time',
    tests: {
      cases: [
        { args: [[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2], expected: 2 },
        { args: [[[1, 2, 1]], 2, 1], expected: 1 },
        { args: [[[1, 2, 1]], 2, 2], expected: -1 },
      ],
    },
  },
  {
    id: 'connected-components',
    title: 'Number of Connected Components',
    pattern: 'Graphs',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt: 'Given `n` nodes labelled `0..n-1` and a list of undirected `edges`, return the number of connected components.',
    functionName: 'countComponents',
    starterCode: 'function countComponents(n, edges) {\n  // your code here\n}',
    hints: ['DFS from every unvisited node works.', 'Union-Find is the answer interviewers are usually fishing for — start with n components and decrement on each successful union.'],
    solution:
      'function countComponents(n, edges) {\n  const parent = Array.from({ length: n }, (_, i) => i);\n  const find = (x) => {\n    while (parent[x] !== x) {\n      parent[x] = parent[parent[x]];\n      x = parent[x];\n    }\n    return x;\n  };\n  let components = n;\n  for (const [a, b] of edges) {\n    const ra = find(a), rb = find(b);\n    if (ra !== rb) { parent[ra] = rb; components--; }\n  }\n  return components;\n}',
    complexity: 'Near O(E * α(n)) time, O(n) space.',
    leetcode: 'number-of-connected-components',
    tests: {
      cases: [
        { args: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2 },
        { args: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], expected: 1 },
        { args: [4, []], expected: 4 },
      ],
    },
  },

  // ------------------------------------------------- Backtracking
  {
    id: 'subsets',
    title: 'Subsets',
    pattern: 'Backtracking',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt: 'Given an array of unique integers `nums`, return all possible subsets (the power set). Order does not matter.',
    functionName: 'subsets',
    starterCode: 'function subsets(nums) {\n  // your code here\n}',
    hints: [
      'For each element you make a binary choice: include it or not.',
      'The backtracking template: push, recurse with i+1, pop. Record the current path at every node, not just at leaves.',
    ],
    solution:
      'function subsets(nums) {\n  const out = [];\n  const path = [];\n  const backtrack = (start) => {\n    out.push([...path]);\n    for (let i = start; i < nums.length; i++) {\n      path.push(nums[i]);\n      backtrack(i + 1);\n      path.pop();\n    }\n  };\n  backtrack(0);\n  return out;\n}',
    complexity: 'O(n * 2^n) time, O(n) recursion depth.',
    leetcode: 'subsets',
    tests: {
      compare: 'unorderedNested',
      cases: [
        { args: [[1, 2, 3]], expected: [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]] },
        { args: [[0]], expected: [[], [0]] },
      ],
    },
  },
  {
    id: 'combination-sum',
    title: 'Combination Sum',
    pattern: 'Backtracking',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt:
      'Given an array of distinct integers `candidates` and a `target`, return all unique combinations that sum to the target. The same number may be reused unlimited times.',
    functionName: 'combinationSum',
    starterCode: 'function combinationSum(candidates, target) {\n  // your code here\n}',
    hints: [
      'Reuse is allowed, so recurse with `i` rather than `i + 1`.',
      'To avoid permutation duplicates, never look at indices before `start`.',
    ],
    solution:
      'function combinationSum(candidates, target) {\n  const out = [];\n  const path = [];\n  const backtrack = (start, remaining) => {\n    if (remaining === 0) { out.push([...path]); return; }\n    if (remaining < 0) return;\n    for (let i = start; i < candidates.length; i++) {\n      path.push(candidates[i]);\n      backtrack(i, remaining - candidates[i]);\n      path.pop();\n    }\n  };\n  backtrack(0, target);\n  return out;\n}',
    complexity: 'Exponential in the worst case; bounded by target / min(candidates) depth.',
    leetcode: 'combination-sum',
    tests: {
      compare: 'unorderedNested',
      cases: [
        { args: [[2, 3, 6, 7], 7], expected: [[2, 2, 3], [7]] },
        { args: [[2, 3, 5], 8], expected: [[2, 2, 2, 2], [2, 3, 3], [3, 5]] },
        { args: [[2], 1], expected: [] },
      ],
    },
  },
  {
    id: 'permutations',
    title: 'Permutations',
    pattern: 'Backtracking',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt: 'Given an array of distinct integers `nums`, return all possible permutations. Order does not matter.',
    functionName: 'permute',
    starterCode: 'function permute(nums) {\n  // your code here\n}',
    hints: ['Unlike subsets there is no `start` index — every unused element is a candidate at every level.', 'Track used elements with a boolean array or by swapping in place.'],
    solution:
      'function permute(nums) {\n  const out = [];\n  const path = [];\n  const used = new Array(nums.length).fill(false);\n  const backtrack = () => {\n    if (path.length === nums.length) { out.push([...path]); return; }\n    for (let i = 0; i < nums.length; i++) {\n      if (used[i]) continue;\n      used[i] = true;\n      path.push(nums[i]);\n      backtrack();\n      path.pop();\n      used[i] = false;\n    }\n  };\n  backtrack();\n  return out;\n}',
    complexity: 'O(n * n!) time, O(n) recursion depth.',
    leetcode: 'permutations',
    tests: {
      compare: 'unorderedOuter',
      cases: [
        {
          args: [[1, 2, 3]],
          expected: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]],
        },
        { args: [[0, 1]], expected: [[0, 1], [1, 0]] },
        { args: [[1]], expected: [[1]] },
      ],
    },
  },
  {
    id: 'word-search',
    title: 'Word Search',
    pattern: 'Backtracking',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt:
      'Given an `m x n` grid of characters and a `word`, return `true` if the word can be constructed from letters of sequentially adjacent cells. The same cell may not be used twice.',
    functionName: 'exist',
    starterCode: 'function exist(board, word) {\n  // your code here\n}',
    hints: [
      'DFS from every cell that matches the first letter.',
      'Mark the cell as visited before recursing and restore it after — that restore is the "backtrack" step people forget.',
    ],
    solution:
      'function exist(board, word) {\n  const rows = board.length, cols = board[0].length;\n  const dfs = (r, c, i) => {\n    if (i === word.length) return true;\n    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== word[i]) return false;\n    const tmp = board[r][c];\n    board[r][c] = "#";\n    const found =\n      dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1) || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);\n    board[r][c] = tmp;\n    return found;\n  };\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) {\n      if (dfs(r, c, 0)) return true;\n    }\n  }\n  return false;\n}',
    complexity: 'O(m * n * 4^L) time, O(L) recursion depth.',
    leetcode: 'word-search',
    tests: {
      cases: [
        { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCCED'], expected: true },
        { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'SEE'], expected: true },
        { args: [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCB'], expected: false },
      ],
    },
  },
  {
    id: 'palindrome-partitioning',
    title: 'Palindrome Partitioning',
    pattern: 'Backtracking',
    difficulty: 'medium',
    week: 3,
    frequency: 2,
    prompt: 'Given a string `s`, partition it so that every substring is a palindrome. Return all possible partitionings. Order does not matter.',
    functionName: 'partition',
    starterCode: 'function partition(s) {\n  // your code here\n}',
    hints: ['At each position, try every prefix that is a palindrome, then recurse on the rest.', 'A helper `isPal(l, r)` with two pointers keeps it readable.'],
    solution:
      'function partition(s) {\n  const out = [];\n  const path = [];\n  const isPal = (l, r) => {\n    while (l < r) {\n      if (s[l] !== s[r]) return false;\n      l++; r--;\n    }\n    return true;\n  };\n  const backtrack = (start) => {\n    if (start === s.length) { out.push([...path]); return; }\n    for (let end = start; end < s.length; end++) {\n      if (!isPal(start, end)) continue;\n      path.push(s.slice(start, end + 1));\n      backtrack(end + 1);\n      path.pop();\n    }\n  };\n  backtrack(0);\n  return out;\n}',
    complexity: 'O(n * 2^n) time.',
    leetcode: 'palindrome-partitioning',
    tests: {
      compare: 'unorderedOuter',
      cases: [
        { args: ['aab'], expected: [['a', 'a', 'b'], ['aa', 'b']] },
        { args: ['a'], expected: [['a']] },
      ],
    },
  },

  // ------------------------------------------------- Intervals
  {
    id: 'insert-interval',
    title: 'Insert Interval',
    pattern: 'Intervals',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt:
      'Given a list of non-overlapping `intervals` sorted by start, insert `newInterval` and merge where necessary. Return the resulting sorted list.',
    functionName: 'insertInterval',
    starterCode: 'function insertInterval(intervals, newInterval) {\n  // your code here\n}',
    hints: ['Three phases: everything strictly before, everything overlapping (merge), everything strictly after.', 'Overlap test: `a.start <= b.end && b.start <= a.end`.'],
    solution:
      'function insertInterval(intervals, newInterval) {\n  const out = [];\n  let [start, end] = newInterval;\n  let i = 0;\n  while (i < intervals.length && intervals[i][1] < start) out.push(intervals[i++]);\n  while (i < intervals.length && intervals[i][0] <= end) {\n    start = Math.min(start, intervals[i][0]);\n    end = Math.max(end, intervals[i][1]);\n    i++;\n  }\n  out.push([start, end]);\n  while (i < intervals.length) out.push(intervals[i++]);\n  return out;\n}',
    complexity: 'O(n) time, O(n) space.',
    leetcode: 'insert-interval',
    tests: {
      cases: [
        { args: [[[1, 3], [6, 9]], [2, 5]], expected: [[1, 5], [6, 9]] },
        { args: [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], expected: [[1, 2], [3, 10], [12, 16]] },
        { args: [[], [5, 7]], expected: [[5, 7]] },
      ],
    },
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    pattern: 'Intervals',
    difficulty: 'medium',
    week: 3,
    frequency: 5,
    prompt: 'Given an array of `intervals`, merge all overlapping intervals and return the result sorted by start.',
    functionName: 'mergeIntervals',
    starterCode: 'function mergeIntervals(intervals) {\n  // your code here\n}',
    hints: ['Sort by start — almost every interval problem opens this way.', 'Then a single pass: extend the last merged interval, or push a new one.'],
    solution:
      'function mergeIntervals(intervals) {\n  if (intervals.length === 0) return [];\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const out = [sorted[0].slice()];\n  for (let i = 1; i < sorted.length; i++) {\n    const last = out[out.length - 1];\n    if (sorted[i][0] <= last[1]) last[1] = Math.max(last[1], sorted[i][1]);\n    else out.push(sorted[i].slice());\n  }\n  return out;\n}',
    complexity: 'O(n log n) time, O(n) space.',
    leetcode: 'merge-intervals',
    tests: {
      cases: [
        { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
        { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
        { args: [[[1, 4], [0, 4]]], expected: [[0, 4]] },
        { args: [[]], expected: [] },
      ],
    },
  },
  {
    id: 'non-overlapping-intervals',
    title: 'Non-overlapping Intervals',
    pattern: 'Intervals',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt: 'Given an array of intervals, return the minimum number you must remove so that the rest are non-overlapping.',
    functionName: 'eraseOverlapIntervals',
    starterCode: 'function eraseOverlapIntervals(intervals) {\n  // your code here\n}',
    hints: [
      'Equivalent problem: keep the maximum number of non-overlapping intervals.',
      'Sort by END time and greedily keep the earliest-ending compatible interval — the classic activity-selection argument.',
    ],
    solution:
      'function eraseOverlapIntervals(intervals) {\n  if (intervals.length === 0) return 0;\n  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);\n  let kept = 1;\n  let end = sorted[0][1];\n  for (let i = 1; i < sorted.length; i++) {\n    if (sorted[i][0] >= end) { kept++; end = sorted[i][1]; }\n  }\n  return intervals.length - kept;\n}',
    complexity: 'O(n log n) time, O(1) extra space.',
    leetcode: 'non-overlapping-intervals',
    tests: {
      cases: [
        { args: [[[1, 2], [2, 3], [3, 4], [1, 3]]], expected: 1 },
        { args: [[[1, 2], [1, 2], [1, 2]]], expected: 2 },
        { args: [[[1, 2], [2, 3]]], expected: 0 },
      ],
    },
  },
  {
    id: 'meeting-rooms-ii',
    title: 'Meeting Rooms II',
    pattern: 'Intervals',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt: 'Given an array of meeting time `intervals`, return the minimum number of conference rooms required.',
    functionName: 'minMeetingRooms',
    starterCode: 'function minMeetingRooms(intervals) {\n  // your code here\n}',
    hints: [
      'You only care about how many meetings are concurrent at any instant.',
      'Sweep line: sort start times and end times separately, walk both, +1 on a start, -1 on an end, track the max.',
    ],
    solution:
      'function minMeetingRooms(intervals) {\n  const starts = intervals.map((i) => i[0]).sort((a, b) => a - b);\n  const ends = intervals.map((i) => i[1]).sort((a, b) => a - b);\n  let rooms = 0, best = 0, e = 0;\n  for (let s = 0; s < starts.length; s++) {\n    while (e < ends.length && ends[e] <= starts[s]) { rooms--; e++; }\n    rooms++;\n    best = Math.max(best, rooms);\n  }\n  return best;\n}',
    complexity: 'O(n log n) time, O(n) space.',
    leetcode: 'meeting-rooms-ii',
    tests: {
      cases: [
        { args: [[[0, 30], [5, 10], [15, 20]]], expected: 2 },
        { args: [[[7, 10], [2, 4]]], expected: 1 },
        { args: [[[1, 5], [2, 6], [3, 7]]], expected: 3 },
        { args: [[]], expected: 0 },
      ],
    },
  },

  // ------------------------------------------------- Greedy
  {
    id: 'maximum-subarray',
    title: 'Maximum Subarray',
    pattern: 'Greedy',
    difficulty: 'medium',
    week: 3,
    frequency: 5,
    prompt: 'Given an integer array `nums`, find the contiguous subarray with the largest sum and return that sum.',
    functionName: 'maxSubArray',
    starterCode: 'function maxSubArray(nums) {\n  // your code here\n}',
    hints: [
      'Kadane: at each index, either extend the previous subarray or start fresh here.',
      'A running sum that is negative can never help you — reset it.',
    ],
    solution:
      'function maxSubArray(nums) {\n  let best = -Infinity, curr = 0;\n  for (const n of nums) {\n    curr = Math.max(n, curr + n);\n    best = Math.max(best, curr);\n  }\n  return best;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'maximum-subarray',
    tests: {
      cases: [
        { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
        { args: [[1]], expected: 1 },
        { args: [[5, 4, -1, 7, 8]], expected: 23 },
        { args: [[-3, -2, -5]], expected: -2 },
      ],
    },
  },
  {
    id: 'jump-game',
    title: 'Jump Game',
    pattern: 'Greedy',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt:
      'You are given an array `nums` where each element is the maximum jump length from that position. Starting at index 0, return `true` if you can reach the last index.',
    functionName: 'canJump',
    starterCode: 'function canJump(nums) {\n  // your code here\n}',
    hints: [
      'DP works but is O(n^2) if done naively. Greedy is O(n).',
      'Track the furthest index reachable so far. If you ever stand on an index beyond it, you are stuck.',
    ],
    solution:
      'function canJump(nums) {\n  let reach = 0;\n  for (let i = 0; i < nums.length; i++) {\n    if (i > reach) return false;\n    reach = Math.max(reach, i + nums[i]);\n  }\n  return true;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'jump-game',
    tests: {
      cases: [
        { args: [[2, 3, 1, 1, 4]], expected: true },
        { args: [[3, 2, 1, 0, 4]], expected: false },
        { args: [[0]], expected: true },
        { args: [[2, 0, 0]], expected: true },
      ],
    },
  },
  {
    id: 'gas-station',
    title: 'Gas Station',
    pattern: 'Greedy',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt:
      'There are `n` gas stations in a circle. `gas[i]` is the fuel available at station `i` and `cost[i]` is the fuel needed to travel to station `i+1`. Return the starting index that lets you complete the circuit once, or -1 if impossible. The answer is unique.',
    functionName: 'canCompleteCircuit',
    starterCode: 'function canCompleteCircuit(gas, cost) {\n  // your code here\n}',
    hints: [
      'If total gas < total cost, no answer exists — check that first.',
      'If the running tank goes negative at index i, no start between the current start and i can work. Restart at i + 1.',
    ],
    solution:
      'function canCompleteCircuit(gas, cost) {\n  let total = 0, tank = 0, start = 0;\n  for (let i = 0; i < gas.length; i++) {\n    const diff = gas[i] - cost[i];\n    total += diff;\n    tank += diff;\n    if (tank < 0) { start = i + 1; tank = 0; }\n  }\n  return total < 0 ? -1 : start;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'gas-station',
    tests: {
      cases: [
        { args: [[1, 2, 3, 4, 5], [3, 4, 5, 1, 2]], expected: 3 },
        { args: [[2, 3, 4], [3, 4, 3]], expected: -1 },
        { args: [[5, 1, 2, 3, 4], [4, 4, 1, 5, 1]], expected: 4 },
      ],
    },
  },
];
