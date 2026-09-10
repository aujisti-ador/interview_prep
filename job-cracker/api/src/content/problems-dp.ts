import { ProblemSeed } from './types';

/** Week 4: dynamic programming — 1-D then 2-D. */
export const dpProblems: ProblemSeed[] = [
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    pattern: 'Dynamic Programming',
    difficulty: 'easy',
    week: 4,
    frequency: 4,
    prompt: 'You are climbing a staircase of `n` steps. Each time you can climb 1 or 2 steps. In how many distinct ways can you reach the top?',
    functionName: 'climbStairs',
    starterCode: 'function climbStairs(n) {\n  // your code here\n}',
    hints: [
      'ways(n) = ways(n-1) + ways(n-2). It is Fibonacci wearing a hat.',
      'Naive recursion is O(2^n). Memoise, or just keep two rolling variables for O(1) space.',
    ],
    solution:
      'function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) {\n    const c = a + b;\n    a = b;\n    b = c;\n  }\n  return b;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'climbing-stairs',
    tests: {
      cases: [
        { args: [2], expected: 2 },
        { args: [3], expected: 3 },
        { args: [5], expected: 8 },
        { args: [1], expected: 1 },
        { args: [10], expected: 89 },
      ],
    },
  },
  {
    id: 'house-robber',
    title: 'House Robber',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 4,
    prompt: 'Given an array `nums` of money in each house, return the maximum you can rob without robbing two adjacent houses.',
    functionName: 'rob',
    starterCode: 'function rob(nums) {\n  // your code here\n}',
    hints: [
      'At each house: skip it (carry the previous best) or take it (previous-previous best + this house).',
      'dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Two rolling variables suffice.',
    ],
    solution:
      'function rob(nums) {\n  let prev = 0, curr = 0;\n  for (const n of nums) {\n    const next = Math.max(curr, prev + n);\n    prev = curr;\n    curr = next;\n  }\n  return curr;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'house-robber',
    tests: {
      cases: [
        { args: [[1, 2, 3, 1]], expected: 4 },
        { args: [[2, 7, 9, 3, 1]], expected: 12 },
        { args: [[]], expected: 0 },
        { args: [[5]], expected: 5 },
      ],
    },
  },
  {
    id: 'house-robber-ii',
    title: 'House Robber II',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 3,
    prompt: 'Same as House Robber, but the houses are arranged in a circle — the first and last are adjacent.',
    functionName: 'robCircular',
    starterCode: 'function robCircular(nums) {\n  // your code here\n}',
    hints: [
      'The circle means you can never take both the first and the last house.',
      'So run the linear solution twice: once excluding the last house, once excluding the first. Take the max. Handle n === 1 separately.',
    ],
    solution:
      'function robCircular(nums) {\n  if (nums.length === 0) return 0;\n  if (nums.length === 1) return nums[0];\n  const linear = (arr) => {\n    let prev = 0, curr = 0;\n    for (const n of arr) {\n      const next = Math.max(curr, prev + n);\n      prev = curr;\n      curr = next;\n    }\n    return curr;\n  };\n  return Math.max(linear(nums.slice(0, -1)), linear(nums.slice(1)));\n}',
    complexity: 'O(n) time, O(n) space for the slices (O(1) if you use index bounds).',
    leetcode: 'house-robber-ii',
    tests: {
      cases: [
        { args: [[2, 3, 2]], expected: 3 },
        { args: [[1, 2, 3, 1]], expected: 4 },
        { args: [[1, 2, 3]], expected: 3 },
        { args: [[1]], expected: 1 },
      ],
    },
  },
  {
    id: 'coin-change',
    title: 'Coin Change',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 5,
    prompt:
      'Given an array of `coins` and an `amount`, return the fewest number of coins needed to make up that amount. Return -1 if it cannot be made. You have infinite coins of each denomination.',
    functionName: 'coinChange',
    starterCode: 'function coinChange(coins, amount) {\n  // your code here\n}',
    hints: [
      'Greedy (largest coin first) is wrong — [1,3,4] for amount 6 breaks it. Say this out loud; interviewers like it.',
      'Bottom-up: dp[a] = 1 + min(dp[a - coin]) over all coins that fit. Initialise with Infinity.',
    ],
    solution:
      'function coinChange(coins, amount) {\n  const dp = new Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let a = 1; a <= amount; a++) {\n    for (const c of coins) {\n      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;\n    }\n  }\n  return dp[amount] === Infinity ? -1 : dp[amount];\n}',
    complexity: 'O(amount * coins) time, O(amount) space.',
    leetcode: 'coin-change',
    tests: {
      cases: [
        { args: [[1, 2, 5], 11], expected: 3 },
        { args: [[2], 3], expected: -1 },
        { args: [[1], 0], expected: 0 },
        { args: [[1, 3, 4], 6], expected: 2 },
      ],
    },
  },
  {
    id: 'longest-increasing-subsequence',
    title: 'Longest Increasing Subsequence',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 4,
    prompt: 'Given an integer array `nums`, return the length of the longest strictly increasing subsequence.',
    functionName: 'lengthOfLIS',
    starterCode: 'function lengthOfLIS(nums) {\n  // your code here\n}',
    hints: [
      'O(n^2) DP: dp[i] = 1 + max(dp[j]) for all j < i with nums[j] < nums[i].',
      'O(n log n): maintain a "tails" array and binary-search the insertion point. tails is not the actual subsequence — only its length is meaningful.',
    ],
    solution:
      'function lengthOfLIS(nums) {\n  const tails = [];\n  for (const n of nums) {\n    let lo = 0, hi = tails.length;\n    while (lo < hi) {\n      const mid = (lo + hi) >> 1;\n      if (tails[mid] < n) lo = mid + 1;\n      else hi = mid;\n    }\n    tails[lo] = n;\n  }\n  return tails.length;\n}',
    complexity: 'O(n log n) time, O(n) space.',
    leetcode: 'longest-increasing-subsequence',
    tests: {
      cases: [
        { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expected: 4 },
        { args: [[0, 1, 0, 3, 2, 3]], expected: 4 },
        { args: [[7, 7, 7, 7]], expected: 1 },
        { args: [[]], expected: 0 },
      ],
    },
  },
  {
    id: 'word-break',
    title: 'Word Break',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 4,
    prompt: 'Given a string `s` and a dictionary `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of dictionary words. Words may be reused.',
    functionName: 'wordBreak',
    starterCode: 'function wordBreak(s, wordDict) {\n  // your code here\n}',
    hints: [
      'dp[i] = "the first i characters can be segmented".',
      'dp[i] is true if some j < i has dp[j] true and s.slice(j, i) is in the dictionary. Use a Set for the lookup.',
    ],
    solution:
      'function wordBreak(s, wordDict) {\n  const words = new Set(wordDict);\n  const dp = new Array(s.length + 1).fill(false);\n  dp[0] = true;\n  for (let i = 1; i <= s.length; i++) {\n    for (let j = 0; j < i; j++) {\n      if (dp[j] && words.has(s.slice(j, i))) { dp[i] = true; break; }\n    }\n  }\n  return dp[s.length];\n}',
    complexity: 'O(n^2 * k) time, O(n) space.',
    leetcode: 'word-break',
    tests: {
      cases: [
        { args: ['leetcode', ['leet', 'code']], expected: true },
        { args: ['applepenapple', ['apple', 'pen']], expected: true },
        { args: ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], expected: false },
        { args: ['a', []], expected: false },
      ],
    },
  },
  {
    id: 'decode-ways',
    title: 'Decode Ways',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 3,
    prompt:
      'A message of digits is decoded with the mapping A=1 ... Z=26. Given a string `s` of digits, return the number of ways to decode it. Leading zeros make a group invalid.',
    functionName: 'numDecodings',
    starterCode: 'function numDecodings(s) {\n  // your code here\n}',
    hints: [
      'Like Climbing Stairs, but each step is conditional on the digits being a legal letter.',
      'One-digit step is legal if s[i] !== "0". Two-digit step is legal if the pair is between 10 and 26.',
    ],
    solution:
      'function numDecodings(s) {\n  if (!s || s[0] === "0") return 0;\n  let prev = 1, curr = 1;\n  for (let i = 1; i < s.length; i++) {\n    let count = 0;\n    if (s[i] !== "0") count += curr;\n    const two = Number(s.slice(i - 1, i + 1));\n    if (two >= 10 && two <= 26) count += prev;\n    prev = curr;\n    curr = count;\n  }\n  return curr;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'decode-ways',
    tests: {
      cases: [
        { args: ['12'], expected: 2 },
        { args: ['226'], expected: 3 },
        { args: ['06'], expected: 0 },
        { args: ['10'], expected: 1 },
        { args: ['2101'], expected: 1 },
      ],
    },
  },
  {
    id: 'longest-palindromic-substring',
    title: 'Longest Palindromic Substring',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 4,
    prompt: 'Given a string `s`, return the longest palindromic substring. If several tie, return the earliest one.',
    functionName: 'longestPalindrome',
    starterCode: 'function longestPalindrome(s) {\n  // your code here\n}',
    hints: [
      'Expand around centre is O(n^2) time and O(1) space — simpler than the DP table and usually preferred live.',
      'There are 2n-1 centres: n single characters and n-1 gaps between characters.',
    ],
    solution:
      'function longestPalindrome(s) {\n  if (s.length < 2) return s;\n  let bestStart = 0, bestLen = 1;\n  const expand = (l, r) => {\n    while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }\n    const len = r - l - 1;\n    if (len > bestLen) { bestLen = len; bestStart = l + 1; }\n  };\n  for (let i = 0; i < s.length; i++) {\n    expand(i, i);\n    expand(i, i + 1);\n  }\n  return s.slice(bestStart, bestStart + bestLen);\n}',
    complexity: 'O(n^2) time, O(1) space.',
    leetcode: 'longest-palindromic-substring',
    tests: {
      cases: [
        { args: ['babad'], expected: 'bab' },
        { args: ['cbbd'], expected: 'bb' },
        { args: ['a'], expected: 'a' },
        { args: ['ac'], expected: 'a' },
      ],
    },
  },
  {
    id: 'unique-paths',
    title: 'Unique Paths',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 3,
    prompt: 'A robot starts at the top-left of an `m x n` grid and can only move right or down. How many unique paths are there to the bottom-right corner?',
    functionName: 'uniquePaths',
    starterCode: 'function uniquePaths(m, n) {\n  // your code here\n}',
    hints: ['dp[r][c] = dp[r-1][c] + dp[r][c-1], with the first row and column all 1.', 'A single rolling row reduces the space to O(n).'],
    solution:
      'function uniquePaths(m, n) {\n  let row = new Array(n).fill(1);\n  for (let r = 1; r < m; r++) {\n    for (let c = 1; c < n; c++) row[c] += row[c - 1];\n  }\n  return row[n - 1];\n}',
    complexity: 'O(m*n) time, O(n) space.',
    leetcode: 'unique-paths',
    tests: {
      cases: [
        { args: [3, 7], expected: 28 },
        { args: [3, 2], expected: 3 },
        { args: [1, 1], expected: 1 },
        { args: [7, 3], expected: 28 },
      ],
    },
  },
  {
    id: 'longest-common-subsequence',
    title: 'Longest Common Subsequence',
    pattern: 'Dynamic Programming',
    difficulty: 'medium',
    week: 4,
    frequency: 4,
    prompt: 'Given two strings `text1` and `text2`, return the length of their longest common subsequence (characters in order, not necessarily contiguous).',
    functionName: 'longestCommonSubsequence',
    starterCode: 'function longestCommonSubsequence(text1, text2) {\n  // your code here\n}',
    hints: [
      'Classic 2-D grid DP. dp[i][j] = LCS of the first i chars of text1 and first j of text2.',
      'Match -> 1 + dp[i-1][j-1]. Mismatch -> max(dp[i-1][j], dp[i][j-1]).',
    ],
    solution:
      'function longestCommonSubsequence(text1, text2) {\n  const m = text1.length, n = text2.length;\n  let prev = new Array(n + 1).fill(0);\n  for (let i = 1; i <= m; i++) {\n    const curr = new Array(n + 1).fill(0);\n    for (let j = 1; j <= n; j++) {\n      curr[j] = text1[i - 1] === text2[j - 1]\n        ? prev[j - 1] + 1\n        : Math.max(prev[j], curr[j - 1]);\n    }\n    prev = curr;\n  }\n  return prev[n];\n}',
    complexity: 'O(m*n) time, O(n) space.',
    leetcode: 'longest-common-subsequence',
    tests: {
      cases: [
        { args: ['abcde', 'ace'], expected: 3 },
        { args: ['abc', 'abc'], expected: 3 },
        { args: ['abc', 'def'], expected: 0 },
        { args: ['', 'abc'], expected: 0 },
      ],
    },
  },
  {
    id: 'edit-distance',
    title: 'Edit Distance',
    pattern: 'Dynamic Programming',
    difficulty: 'hard',
    week: 4,
    frequency: 3,
    prompt:
      'Given two words `word1` and `word2`, return the minimum number of single-character insertions, deletions or replacements needed to turn `word1` into `word2`.',
    functionName: 'minDistance',
    starterCode: 'function minDistance(word1, word2) {\n  // your code here\n}',
    hints: [
      'Three operations map to three neighbouring cells: delete = dp[i-1][j], insert = dp[i][j-1], replace = dp[i-1][j-1].',
      'Base cases: turning a prefix into the empty string costs its length.',
    ],
    solution:
      'function minDistance(word1, word2) {\n  const m = word1.length, n = word2.length;\n  let prev = Array.from({ length: n + 1 }, (_, j) => j);\n  for (let i = 1; i <= m; i++) {\n    const curr = new Array(n + 1).fill(0);\n    curr[0] = i;\n    for (let j = 1; j <= n; j++) {\n      curr[j] = word1[i - 1] === word2[j - 1]\n        ? prev[j - 1]\n        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);\n    }\n    prev = curr;\n  }\n  return prev[n];\n}',
    complexity: 'O(m*n) time, O(n) space.',
    leetcode: 'edit-distance',
    tests: {
      cases: [
        { args: ['horse', 'ros'], expected: 3 },
        { args: ['intention', 'execution'], expected: 5 },
        { args: ['', 'abc'], expected: 3 },
        { args: ['abc', 'abc'], expected: 0 },
      ],
    },
  },
];
