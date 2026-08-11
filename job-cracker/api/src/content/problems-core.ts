import { ProblemSeed } from './types';

/** Week 1-2 fundamentals: arrays & hashing, two pointers, sliding window, stack, binary search. */
export const coreProblems: ProblemSeed[] = [
  // ------------------------------------------------- Arrays & Hashing
  {
    id: 'two-sum',
    title: 'Two Sum',
    pattern: 'Arrays & Hashing',
    difficulty: 'easy',
    week: 1,
    frequency: 5,
    prompt:
      'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nEach input has exactly one solution and you may not use the same element twice. Return the indices in any order.',
    functionName: 'twoSum',
    starterCode: 'function twoSum(nums, target) {\n  // your code here\n}',
    hints: [
      'The brute force is O(n^2). What would let you check "have I seen target - x?" in O(1)?',
      'Store value -> index in a Map as you scan.',
      'Check the map BEFORE inserting the current number, or you will match an element with itself.',
    ],
    solution:
      'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}',
    complexity: 'O(n) time, O(n) space. One pass, hash map of value -> index.',
    companies: ['Almost every OA', 'Pathao', 'Toptal screen'],
    tests: {
      compare: 'unordered',
      cases: [
        { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { args: [[3, 2, 4], 6], expected: [1, 2] },
        { args: [[3, 3], 6], expected: [0, 1] },
        { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      ],
    },
  },
  {
    id: 'contains-duplicate',
    title: 'Contains Duplicate',
    pattern: 'Arrays & Hashing',
    difficulty: 'easy',
    week: 1,
    frequency: 4,
    prompt: 'Return `true` if any value appears at least twice in `nums`, and `false` if every element is distinct.',
    functionName: 'containsDuplicate',
    starterCode: 'function containsDuplicate(nums) {\n  // your code here\n}',
    hints: ['A Set gives O(1) membership.', 'You can short-circuit: compare set size to array length, or return early on first repeat.'],
    solution:
      'function containsDuplicate(nums) {\n  const seen = new Set();\n  for (const n of nums) {\n    if (seen.has(n)) return true;\n    seen.add(n);\n  }\n  return false;\n}',
    complexity: 'O(n) time, O(n) space.',
    tests: {
      cases: [
        { args: [[1, 2, 3, 1]], expected: true },
        { args: [[1, 2, 3, 4]], expected: false },
        { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected: true },
        { args: [[]], expected: false },
      ],
    },
  },
  {
    id: 'valid-anagram',
    title: 'Valid Anagram',
    pattern: 'Arrays & Hashing',
    difficulty: 'easy',
    week: 1,
    frequency: 4,
    prompt: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`.',
    functionName: 'isAnagram',
    starterCode: 'function isAnagram(s, t) {\n  // your code here\n}',
    hints: [
      'Sorting both is O(n log n) and acceptable, but counting is better.',
      'Count characters of s, decrement for t, and bail the moment a count goes negative.',
    ],
    solution:
      'function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  const count = new Map();\n  for (const ch of s) count.set(ch, (count.get(ch) || 0) + 1);\n  for (const ch of t) {\n    const c = count.get(ch);\n    if (!c) return false;\n    count.set(ch, c - 1);\n  }\n  return true;\n}',
    complexity: 'O(n) time, O(k) space where k is the alphabet size.',
    tests: {
      cases: [
        { args: ['anagram', 'nagaram'], expected: true },
        { args: ['rat', 'car'], expected: false },
        { args: ['', ''], expected: true },
        { args: ['aacc', 'ccac'], expected: false },
      ],
    },
  },
  {
    id: 'group-anagrams',
    title: 'Group Anagrams',
    pattern: 'Arrays & Hashing',
    difficulty: 'medium',
    week: 1,
    frequency: 4,
    prompt:
      'Given an array of strings `strs`, group the anagrams together. Return the groups in any order, and the strings within each group in any order.',
    functionName: 'groupAnagrams',
    starterCode: 'function groupAnagrams(strs) {\n  // your code here\n}',
    hints: [
      'Every anagram group needs a canonical key.',
      'Sorted characters works. A 26-length count signature avoids the log factor.',
    ],
    solution:
      'function groupAnagrams(strs) {\n  const groups = new Map();\n  for (const s of strs) {\n    const count = new Array(26).fill(0);\n    for (const ch of s) count[ch.charCodeAt(0) - 97]++;\n    const key = count.join("#");\n    if (!groups.has(key)) groups.set(key, []);\n    groups.get(key).push(s);\n  }\n  return [...groups.values()];\n}',
    complexity: 'O(n * k) time with the count signature, O(n * k) space.',
    tests: {
      compare: 'unorderedNested',
      cases: [
        { args: [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], expected: [['bat'], ['nat', 'tan'], ['ate', 'eat', 'tea']] },
        { args: [['']], expected: [['']] },
        { args: [['a']], expected: [['a']] },
      ],
    },
  },
  {
    id: 'top-k-frequent',
    title: 'Top K Frequent Elements',
    pattern: 'Arrays & Hashing',
    difficulty: 'medium',
    week: 1,
    frequency: 4,
    prompt: 'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements, in any order.',
    functionName: 'topKFrequent',
    starterCode: 'function topKFrequent(nums, k) {\n  // your code here\n}',
    hints: [
      'Count frequencies first — that part is forced.',
      'Sorting by frequency is O(n log n). Bucket sort by frequency gets you O(n) because frequency is bounded by n.',
    ],
    solution:
      'function topKFrequent(nums, k) {\n  const freq = new Map();\n  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);\n  const buckets = Array.from({ length: nums.length + 1 }, () => []);\n  for (const [val, c] of freq) buckets[c].push(val);\n  const out = [];\n  for (let c = buckets.length - 1; c >= 0 && out.length < k; c--) {\n    for (const v of buckets[c]) {\n      out.push(v);\n      if (out.length === k) break;\n    }\n  }\n  return out;\n}',
    complexity: 'O(n) time, O(n) space using bucket sort on frequency.',
    tests: {
      compare: 'unordered',
      cases: [
        { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
        { args: [[1], 1], expected: [1] },
        { args: [[4, 4, 4, 5, 5, 6], 3], expected: [4, 5, 6] },
      ],
    },
  },
  {
    id: 'product-except-self',
    title: 'Product of Array Except Self',
    pattern: 'Arrays & Hashing',
    difficulty: 'medium',
    week: 1,
    frequency: 4,
    prompt:
      'Given an integer array `nums`, return an array `answer` where `answer[i]` is the product of all elements of `nums` except `nums[i]`. Solve it without division and in O(n).',
    functionName: 'productExceptSelf',
    starterCode: 'function productExceptSelf(nums) {\n  // your code here\n}',
    hints: [
      'answer[i] = (product of everything left of i) * (product of everything right of i).',
      'Two passes: prefix products left-to-right into the output, then a running suffix product right-to-left.',
    ],
    solution:
      'function productExceptSelf(nums) {\n  const n = nums.length;\n  const out = new Array(n).fill(1);\n  let prefix = 1;\n  for (let i = 0; i < n; i++) {\n    out[i] = prefix;\n    prefix *= nums[i];\n  }\n  let suffix = 1;\n  for (let i = n - 1; i >= 0; i--) {\n    out[i] *= suffix;\n    suffix *= nums[i];\n  }\n  return out;\n}',
    complexity: 'O(n) time, O(1) extra space (output array excluded).',
    tests: {
      cases: [
        { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
        { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0] },
        { args: [[2, 3]], expected: [3, 2] },
      ],
    },
  },
  {
    id: 'longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    pattern: 'Arrays & Hashing',
    difficulty: 'medium',
    week: 1,
    frequency: 3,
    prompt:
      'Given an unsorted array of integers `nums`, return the length of the longest sequence of consecutive integers. Your algorithm must run in O(n).',
    functionName: 'longestConsecutive',
    starterCode: 'function longestConsecutive(nums) {\n  // your code here\n}',
    hints: [
      'Sorting is O(n log n) — the constraint rules it out.',
      'Put everything in a Set. Only start counting from a number whose predecessor is absent — that makes each sequence walked exactly once.',
    ],
    solution:
      'function longestConsecutive(nums) {\n  const set = new Set(nums);\n  let best = 0;\n  for (const n of set) {\n    if (set.has(n - 1)) continue;\n    let len = 1;\n    while (set.has(n + len)) len++;\n    if (len > best) best = len;\n  }\n  return best;\n}',
    complexity: 'O(n) time, O(n) space. Each element is visited at most twice.',
    tests: {
      cases: [
        { args: [[100, 4, 200, 1, 3, 2]], expected: 4 },
        { args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], expected: 9 },
        { args: [[]], expected: 0 },
        { args: [[1, 2, 0, 1]], expected: 3 },
      ],
    },
  },

  // ------------------------------------------------- Two Pointers
  {
    id: 'valid-palindrome',
    title: 'Valid Palindrome',
    pattern: 'Two Pointers',
    difficulty: 'easy',
    week: 1,
    frequency: 4,
    prompt:
      'A phrase is a palindrome if, after lowercasing and removing all non-alphanumeric characters, it reads the same forwards and backwards. Return `true` if `s` is a palindrome.',
    functionName: 'isPalindrome',
    starterCode: 'function isPalindrome(s) {\n  // your code here\n}',
    hints: [
      'You can build a cleaned string first — but the in-place two-pointer version is what interviewers want.',
      'Advance the left pointer past non-alphanumerics, retreat the right pointer likewise, then compare.',
    ],
    solution:
      'function isPalindrome(s) {\n  const ok = (c) => /[a-z0-9]/i.test(c);\n  let l = 0, r = s.length - 1;\n  while (l < r) {\n    while (l < r && !ok(s[l])) l++;\n    while (l < r && !ok(s[r])) r--;\n    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;\n    l++; r--;\n  }\n  return true;\n}',
    complexity: 'O(n) time, O(1) space.',
    tests: {
      cases: [
        { args: ['A man, a plan, a canal: Panama'], expected: true },
        { args: ['race a car'], expected: false },
        { args: [' '], expected: true },
        { args: ['0P'], expected: false },
      ],
    },
  },
  {
    id: 'two-sum-ii',
    title: 'Two Sum II — Sorted Input',
    pattern: 'Two Pointers',
    difficulty: 'medium',
    week: 1,
    frequency: 3,
    prompt:
      'Given a 1-indexed array `numbers` sorted in non-decreasing order, find two numbers that add up to `target`. Return their 1-based indices as `[index1, index2]`. Use O(1) extra space.',
    functionName: 'twoSumII',
    starterCode: 'function twoSumII(numbers, target) {\n  // your code here\n}',
    hints: [
      'Sorted input is the whole hint — a hash map wastes the ordering.',
      'If the pair sum is too small, only moving the left pointer right can help. Too large, move right pointer left.',
    ],
    solution:
      'function twoSumII(numbers, target) {\n  let l = 0, r = numbers.length - 1;\n  while (l < r) {\n    const sum = numbers[l] + numbers[r];\n    if (sum === target) return [l + 1, r + 1];\n    if (sum < target) l++;\n    else r--;\n  }\n  return [];\n}',
    complexity: 'O(n) time, O(1) space.',
    tests: {
      cases: [
        { args: [[2, 7, 11, 15], 9], expected: [1, 2] },
        { args: [[2, 3, 4], 6], expected: [1, 3] },
        { args: [[-1, 0], -1], expected: [1, 2] },
      ],
    },
  },
  {
    id: 'three-sum',
    title: '3Sum',
    pattern: 'Two Pointers',
    difficulty: 'medium',
    week: 1,
    frequency: 5,
    prompt:
      'Given an integer array `nums`, return all unique triplets `[a, b, c]` such that `a + b + c == 0`. The solution set must not contain duplicate triplets. Order does not matter.',
    functionName: 'threeSum',
    starterCode: 'function threeSum(nums) {\n  // your code here\n}',
    hints: [
      'Sort first. Then it is "for each i, run Two Sum II on the rest".',
      'Skip duplicate values at i, and skip duplicates for both pointers after recording a hit — that is where most people lose the test cases.',
    ],
    solution:
      'function threeSum(nums) {\n  const a = [...nums].sort((x, y) => x - y);\n  const out = [];\n  for (let i = 0; i < a.length - 2; i++) {\n    if (a[i] > 0) break;\n    if (i > 0 && a[i] === a[i - 1]) continue;\n    let l = i + 1, r = a.length - 1;\n    while (l < r) {\n      const sum = a[i] + a[l] + a[r];\n      if (sum < 0) l++;\n      else if (sum > 0) r--;\n      else {\n        out.push([a[i], a[l], a[r]]);\n        l++; r--;\n        while (l < r && a[l] === a[l - 1]) l++;\n        while (l < r && a[r] === a[r + 1]) r--;\n      }\n    }\n  }\n  return out;\n}',
    complexity: 'O(n^2) time, O(1) extra space beyond the sort.',
    tests: {
      compare: 'unorderedNested',
      cases: [
        { args: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]] },
        { args: [[0, 1, 1]], expected: [] },
        { args: [[0, 0, 0]], expected: [[0, 0, 0]] },
        { args: [[-2, 0, 1, 1, 2]], expected: [[-2, 0, 2], [-2, 1, 1]] },
      ],
    },
  },
  {
    id: 'container-with-most-water',
    title: 'Container With Most Water',
    pattern: 'Two Pointers',
    difficulty: 'medium',
    week: 1,
    frequency: 4,
    prompt:
      'Given an array `height` where `height[i]` is the height of a vertical line at position `i`, find two lines that together with the x-axis form a container holding the most water. Return the maximum area.',
    functionName: 'maxArea',
    starterCode: 'function maxArea(height) {\n  // your code here\n}',
    hints: [
      'Start with the widest possible container: pointers at both ends.',
      'Moving the taller wall inward can never increase the area — the width shrinks and the height is still capped by the shorter wall. So always move the shorter one.',
    ],
    solution:
      'function maxArea(height) {\n  let l = 0, r = height.length - 1, best = 0;\n  while (l < r) {\n    const area = Math.min(height[l], height[r]) * (r - l);\n    if (area > best) best = area;\n    if (height[l] < height[r]) l++;\n    else r--;\n  }\n  return best;\n}',
    complexity: 'O(n) time, O(1) space.',
    tests: {
      cases: [
        { args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
        { args: [[1, 1]], expected: 1 },
        { args: [[4, 3, 2, 1, 4]], expected: 16 },
      ],
    },
  },
  {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    pattern: 'Two Pointers',
    difficulty: 'hard',
    week: 1,
    frequency: 3,
    prompt:
      'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water can be trapped after raining.',
    functionName: 'trap',
    starterCode: 'function trap(height) {\n  // your code here\n}',
    hints: [
      'Water above index i = min(maxLeft[i], maxRight[i]) - height[i], floored at 0.',
      'The O(n) space version precomputes both max arrays. The O(1) version walks two pointers, always advancing the side with the smaller running max.',
    ],
    solution:
      'function trap(height) {\n  if (height.length === 0) return 0;\n  let l = 0, r = height.length - 1;\n  let leftMax = height[l], rightMax = height[r], total = 0;\n  while (l < r) {\n    if (leftMax < rightMax) {\n      l++;\n      leftMax = Math.max(leftMax, height[l]);\n      total += leftMax - height[l];\n    } else {\n      r--;\n      rightMax = Math.max(rightMax, height[r]);\n      total += rightMax - height[r];\n    }\n  }\n  return total;\n}',
    complexity: 'O(n) time, O(1) space.',
    tests: {
      cases: [
        { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
        { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
        { args: [[]], expected: 0 },
        { args: [[3, 0, 3]], expected: 3 },
      ],
    },
  },

  // ------------------------------------------------- Sliding Window
  {
    id: 'best-time-to-buy-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    pattern: 'Sliding Window',
    difficulty: 'easy',
    week: 1,
    frequency: 4,
    prompt:
      'You are given an array `prices` where `prices[i]` is the price of a stock on day `i`. Choose one day to buy and a later day to sell. Return the maximum profit, or 0 if no profit is possible.',
    functionName: 'maxProfit',
    starterCode: 'function maxProfit(prices) {\n  // your code here\n}',
    hints: ['Track the cheapest price seen so far.', 'At each day, the best sale today is price - minSoFar.'],
    solution:
      'function maxProfit(prices) {\n  let min = Infinity, best = 0;\n  for (const p of prices) {\n    if (p < min) min = p;\n    else if (p - min > best) best = p - min;\n  }\n  return best;\n}',
    complexity: 'O(n) time, O(1) space.',
    tests: {
      cases: [
        { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
        { args: [[7, 6, 4, 3, 1]], expected: 0 },
        { args: [[2, 4, 1]], expected: 2 },
        { args: [[]], expected: 0 },
      ],
    },
  },
  {
    id: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    pattern: 'Sliding Window',
    difficulty: 'medium',
    week: 1,
    frequency: 5,
    prompt: 'Given a string `s`, return the length of the longest substring without repeating characters.',
    functionName: 'lengthOfLongestSubstring',
    starterCode: 'function lengthOfLongestSubstring(s) {\n  // your code here\n}',
    hints: [
      'Maintain a window that is always valid (no duplicates) and take the max length.',
      'When you hit a duplicate, shrink from the left until the duplicate is gone. Or jump the left pointer straight to lastIndex + 1.',
    ],
    solution:
      'function lengthOfLongestSubstring(s) {\n  const last = new Map();\n  let left = 0, best = 0;\n  for (let r = 0; r < s.length; r++) {\n    const ch = s[r];\n    if (last.has(ch) && last.get(ch) >= left) left = last.get(ch) + 1;\n    last.set(ch, r);\n    best = Math.max(best, r - left + 1);\n  }\n  return best;\n}',
    complexity: 'O(n) time, O(k) space.',
    tests: {
      cases: [
        { args: ['abcabcbb'], expected: 3 },
        { args: ['bbbbb'], expected: 1 },
        { args: ['pwwkew'], expected: 3 },
        { args: [''], expected: 0 },
        { args: ['tmmzuxt'], expected: 5 },
      ],
    },
  },
  {
    id: 'longest-repeating-character-replacement',
    title: 'Longest Repeating Character Replacement',
    pattern: 'Sliding Window',
    difficulty: 'medium',
    week: 1,
    frequency: 3,
    prompt:
      'Given a string `s` of uppercase letters and an integer `k`, you may change at most `k` characters to any other uppercase letter. Return the length of the longest substring containing a single repeated letter you can produce.',
    functionName: 'characterReplacement',
    starterCode: 'function characterReplacement(s, k) {\n  // your code here\n}',
    hints: [
      'A window is valid when (windowLength - countOfMostFrequentChar) <= k.',
      'You do not need to recompute the max count exactly when shrinking — a stale maximum still gives the right answer, and that is the trick that keeps it O(n).',
    ],
    solution:
      'function characterReplacement(s, k) {\n  const count = new Map();\n  let left = 0, maxCount = 0, best = 0;\n  for (let r = 0; r < s.length; r++) {\n    count.set(s[r], (count.get(s[r]) || 0) + 1);\n    maxCount = Math.max(maxCount, count.get(s[r]));\n    while (r - left + 1 - maxCount > k) {\n      count.set(s[left], count.get(s[left]) - 1);\n      left++;\n    }\n    best = Math.max(best, r - left + 1);\n  }\n  return best;\n}',
    complexity: 'O(n) time, O(26) space.',
    tests: {
      cases: [
        { args: ['ABAB', 2], expected: 4 },
        { args: ['AABABBA', 1], expected: 4 },
        { args: ['AAAA', 0], expected: 4 },
        { args: ['ABCDE', 1], expected: 2 },
      ],
    },
  },
  {
    id: 'permutation-in-string',
    title: 'Permutation in String',
    pattern: 'Sliding Window',
    difficulty: 'medium',
    week: 1,
    frequency: 3,
    prompt: 'Given two strings `s1` and `s2`, return `true` if `s2` contains a permutation of `s1` as a substring.',
    functionName: 'checkInclusion',
    starterCode: 'function checkInclusion(s1, s2) {\n  // your code here\n}',
    hints: [
      'A permutation is just a character-count match — order is irrelevant.',
      'Use a fixed-size window of length s1.length and keep a running count of how many letters currently match.',
    ],
    solution:
      'function checkInclusion(s1, s2) {\n  if (s1.length > s2.length) return false;\n  const need = new Array(26).fill(0);\n  const win = new Array(26).fill(0);\n  const idx = (c) => c.charCodeAt(0) - 97;\n  for (let i = 0; i < s1.length; i++) {\n    need[idx(s1[i])]++;\n    win[idx(s2[i])]++;\n  }\n  const same = () => need.every((v, i) => v === win[i]);\n  if (same()) return true;\n  for (let r = s1.length; r < s2.length; r++) {\n    win[idx(s2[r])]++;\n    win[idx(s2[r - s1.length])]--;\n    if (same()) return true;\n  }\n  return false;\n}',
    complexity: 'O(26n) time, O(26) space.',
    tests: {
      cases: [
        { args: ['ab', 'eidbaooo'], expected: true },
        { args: ['ab', 'eidboaoo'], expected: false },
        { args: ['adc', 'dcda'], expected: true },
        { args: ['abc', 'ab'], expected: false },
      ],
    },
  },
  {
    id: 'minimum-window-substring',
    title: 'Minimum Window Substring',
    pattern: 'Sliding Window',
    difficulty: 'hard',
    week: 1,
    frequency: 3,
    prompt:
      'Given strings `s` and `t`, return the minimum-length substring of `s` that contains every character of `t` including duplicates. Return `""` if no such window exists.',
    functionName: 'minWindow',
    starterCode: 'function minWindow(s, t) {\n  // your code here\n}',
    hints: [
      'Expand right until the window is valid, then contract left while it stays valid, recording the best.',
      'Track a single counter "how many required characters are still missing" instead of comparing whole maps each step.',
    ],
    solution:
      'function minWindow(s, t) {\n  if (!t || !s || s.length < t.length) return "";\n  const need = new Map();\n  for (const c of t) need.set(c, (need.get(c) || 0) + 1);\n  let missing = t.length, left = 0, bestLen = Infinity, bestStart = 0;\n  for (let r = 0; r < s.length; r++) {\n    const c = s[r];\n    if (need.has(c)) {\n      if (need.get(c) > 0) missing--;\n      need.set(c, need.get(c) - 1);\n    }\n    while (missing === 0) {\n      if (r - left + 1 < bestLen) { bestLen = r - left + 1; bestStart = left; }\n      const lc = s[left];\n      if (need.has(lc)) {\n        need.set(lc, need.get(lc) + 1);\n        if (need.get(lc) > 0) missing++;\n      }\n      left++;\n    }\n  }\n  return bestLen === Infinity ? "" : s.slice(bestStart, bestStart + bestLen);\n}',
    complexity: 'O(n + m) time, O(m) space.',
    tests: {
      cases: [
        { args: ['ADOBECODEBANC', 'ABC'], expected: 'BANC' },
        { args: ['a', 'a'], expected: 'a' },
        { args: ['a', 'aa'], expected: '' },
        { args: ['ab', 'b'], expected: 'b' },
      ],
    },
  },

  // ------------------------------------------------- Stack
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    pattern: 'Stack',
    difficulty: 'easy',
    week: 1,
    frequency: 5,
    prompt:
      'Given a string `s` containing only `()[]{}`, determine if the input is valid: brackets closed by the same type, in the correct order, and every closing bracket has a matching opener.',
    functionName: 'isValidParentheses',
    starterCode: 'function isValidParentheses(s) {\n  // your code here\n}',
    hints: ['Push openers, pop on closers.', 'Do not forget the two failure modes: wrong pop, and a non-empty stack at the end.'],
    solution:
      'function isValidParentheses(s) {\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  const stack = [];\n  for (const ch of s) {\n    if (ch in pairs) {\n      if (stack.pop() !== pairs[ch]) return false;\n    } else {\n      stack.push(ch);\n    }\n  }\n  return stack.length === 0;\n}',
    complexity: 'O(n) time, O(n) space.',
    tests: {
      cases: [
        { args: ['()'], expected: true },
        { args: ['()[]{}'], expected: true },
        { args: ['(]'], expected: false },
        { args: ['([)]'], expected: false },
        { args: ['{[]}'], expected: true },
        { args: [']'], expected: false },
      ],
    },
  },
  {
    id: 'min-stack',
    title: 'Min Stack',
    pattern: 'Stack',
    difficulty: 'medium',
    week: 1,
    frequency: 4,
    prompt:
      'Design a stack supporting `push(val)`, `pop()`, `top()` and `getMin()` — all in O(1).\n\nImplement a class named `MinStack`.',
    functionName: 'MinStack',
    starterCode:
      'class MinStack {\n  constructor() {\n    // your code here\n  }\n  push(val) {}\n  pop() {}\n  top() {}\n  getMin() {}\n}',
    hints: [
      'You cannot scan for the minimum — it must be O(1).',
      'Keep a parallel stack of "minimum at or below this depth". Push min(val, currentMin) alongside every value.',
    ],
    solution:
      'class MinStack {\n  constructor() {\n    this.stack = [];\n    this.mins = [];\n  }\n  push(val) {\n    this.stack.push(val);\n    const m = this.mins.length === 0 ? val : Math.min(val, this.mins[this.mins.length - 1]);\n    this.mins.push(m);\n  }\n  pop() {\n    this.mins.pop();\n    return this.stack.pop();\n  }\n  top() {\n    return this.stack[this.stack.length - 1];\n  }\n  getMin() {\n    return this.mins[this.mins.length - 1];\n  }\n}',
    complexity: 'O(1) per operation, O(n) space.',
    tests: {
      mode: 'ops',
      cases: [
        {
          ops: ['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'],
          args: [[], [-2], [0], [-3], [], [], [], []],
          expected: [null, null, null, null, -3, -3, 0, -2],
        },
        {
          ops: ['MinStack', 'push', 'push', 'getMin', 'push', 'getMin', 'pop', 'getMin'],
          args: [[], [5], [3], [], [7], [], [], []],
          expected: [null, null, null, 3, null, 3, 7, 3],
        },
      ],
    },
  },
  {
    id: 'evaluate-rpn',
    title: 'Evaluate Reverse Polish Notation',
    pattern: 'Stack',
    difficulty: 'medium',
    week: 1,
    frequency: 3,
    prompt:
      'Evaluate an arithmetic expression in Reverse Polish Notation. Valid operators are `+`, `-`, `*`, `/`. Division truncates toward zero.',
    functionName: 'evalRPN',
    starterCode: 'function evalRPN(tokens) {\n  // your code here\n}',
    hints: ['Push numbers; on an operator, pop two and push the result.', 'Order matters: the first pop is the right operand. And `Math.trunc`, not `Math.floor`.'],
    solution:
      'function evalRPN(tokens) {\n  const st = [];\n  for (const t of tokens) {\n    if (t === "+" || t === "-" || t === "*" || t === "/") {\n      const b = st.pop(), a = st.pop();\n      if (t === "+") st.push(a + b);\n      else if (t === "-") st.push(a - b);\n      else if (t === "*") st.push(a * b);\n      else st.push(Math.trunc(a / b));\n    } else {\n      st.push(Number(t));\n    }\n  }\n  return st.pop();\n}',
    complexity: 'O(n) time, O(n) space.',
    tests: {
      cases: [
        { args: [['2', '1', '+', '3', '*']], expected: 9 },
        { args: [['4', '13', '5', '/', '+']], expected: 6 },
        { args: [['10', '6', '9', '3', '+', '-11', '*', '/', '*', '17', '+', '5', '+']], expected: 22 },
        { args: [['-7', '2', '/']], expected: -3 },
      ],
    },
  },
  {
    id: 'daily-temperatures',
    title: 'Daily Temperatures',
    pattern: 'Stack',
    difficulty: 'medium',
    week: 1,
    frequency: 3,
    prompt:
      'Given an array `temperatures`, return an array `answer` where `answer[i]` is the number of days you must wait after day `i` to get a warmer temperature. If there is no such day, put 0.',
    functionName: 'dailyTemperatures',
    starterCode: 'function dailyTemperatures(temperatures) {\n  // your code here\n}',
    hints: [
      'This is the monotonic stack pattern — recognise it and the code writes itself.',
      'Keep a stack of indices with decreasing temperatures. When a warmer day arrives, pop and resolve every index it beats.',
    ],
    solution:
      'function dailyTemperatures(temperatures) {\n  const out = new Array(temperatures.length).fill(0);\n  const stack = [];\n  for (let i = 0; i < temperatures.length; i++) {\n    while (stack.length && temperatures[i] > temperatures[stack[stack.length - 1]]) {\n      const j = stack.pop();\n      out[j] = i - j;\n    }\n    stack.push(i);\n  }\n  return out;\n}',
    complexity: 'O(n) time, O(n) space. Each index is pushed and popped once.',
    tests: {
      cases: [
        { args: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0] },
        { args: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
        { args: [[30, 60, 90]], expected: [1, 1, 0] },
      ],
    },
  },

  // ------------------------------------------------- Binary Search
  {
    id: 'binary-search',
    title: 'Binary Search',
    pattern: 'Binary Search',
    difficulty: 'easy',
    week: 2,
    frequency: 4,
    prompt: 'Given a sorted array of distinct integers `nums` and a `target`, return its index, or -1 if it is not present. O(log n) required.',
    functionName: 'search',
    starterCode: 'function search(nums, target) {\n  // your code here\n}',
    hints: ['Use `lo + Math.floor((hi - lo) / 2)` and half-open or closed intervals consistently.', 'Pick one loop invariant and stick to it — mixing them is how off-by-ones happen.'],
    solution:
      'function search(nums, target) {\n  let lo = 0, hi = nums.length - 1;\n  while (lo <= hi) {\n    const mid = lo + Math.floor((hi - lo) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}',
    complexity: 'O(log n) time, O(1) space.',
    tests: {
      cases: [
        { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
        { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
        { args: [[5], 5], expected: 0 },
        { args: [[], 1], expected: -1 },
      ],
    },
  },
  {
    id: 'search-2d-matrix',
    title: 'Search a 2D Matrix',
    pattern: 'Binary Search',
    difficulty: 'medium',
    week: 2,
    frequency: 3,
    prompt:
      'You are given an `m x n` matrix where each row is sorted ascending and the first element of each row is greater than the last element of the previous row. Return `true` if `target` is present.',
    functionName: 'searchMatrix',
    starterCode: 'function searchMatrix(matrix, target) {\n  // your code here\n}',
    hints: ['The constraint means the matrix is one sorted array, folded.', 'Binary search over 0..m*n-1 and map index -> [row, col] with divide and modulo.'],
    solution:
      'function searchMatrix(matrix, target) {\n  const m = matrix.length;\n  if (m === 0) return false;\n  const n = matrix[0].length;\n  let lo = 0, hi = m * n - 1;\n  while (lo <= hi) {\n    const mid = lo + Math.floor((hi - lo) / 2);\n    const val = matrix[Math.floor(mid / n)][mid % n];\n    if (val === target) return true;\n    if (val < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return false;\n}',
    complexity: 'O(log(m*n)) time, O(1) space.',
    tests: {
      cases: [
        { args: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], expected: true },
        { args: [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], expected: false },
        { args: [[[1]], 1], expected: true },
        { args: [[[1]], 2], expected: false },
      ],
    },
  },
  {
    id: 'koko-eating-bananas',
    title: 'Koko Eating Bananas',
    pattern: 'Binary Search',
    difficulty: 'medium',
    week: 2,
    frequency: 4,
    prompt:
      'Koko has `piles` of bananas and `h` hours. Each hour she picks one pile and eats up to `k` bananas from it; if the pile has fewer she finishes it and stops for that hour. Return the minimum integer `k` such that she finishes all piles within `h` hours.',
    functionName: 'minEatingSpeed',
    starterCode: 'function minEatingSpeed(piles, h) {\n  // your code here\n}',
    hints: [
      'This is binary search on the ANSWER, not on the array — recognise the "minimum k such that feasible(k)" shape.',
      'feasible(k) = sum of ceil(pile / k) <= h. It is monotonic in k, which is what makes binary search legal.',
    ],
    solution:
      'function minEatingSpeed(piles, h) {\n  const hours = (k) => piles.reduce((acc, p) => acc + Math.ceil(p / k), 0);\n  let lo = 1, hi = Math.max(...piles);\n  while (lo < hi) {\n    const mid = lo + Math.floor((hi - lo) / 2);\n    if (hours(mid) <= h) hi = mid;\n    else lo = mid + 1;\n  }\n  return lo;\n}',
    complexity: 'O(n log(max pile)) time, O(1) space.',
    tests: {
      cases: [
        { args: [[3, 6, 7, 11], 8], expected: 4 },
        { args: [[30, 11, 23, 4, 20], 5], expected: 30 },
        { args: [[30, 11, 23, 4, 20], 6], expected: 23 },
        { args: [[312884470], 968709470], expected: 1 },
      ],
    },
  },
  {
    id: 'search-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    pattern: 'Binary Search',
    difficulty: 'medium',
    week: 2,
    frequency: 5,
    prompt:
      'An ascending sorted array of distinct integers was rotated at an unknown pivot. Given the rotated array `nums` and a `target`, return its index or -1. O(log n) required.',
    functionName: 'searchRotated',
    starterCode: 'function searchRotated(nums, target) {\n  // your code here\n}',
    hints: [
      'At any midpoint, at least one half is properly sorted.',
      'Determine which half is sorted, check whether the target lies inside that half\'s range, and discard accordingly.',
    ],
    solution:
      'function searchRotated(nums, target) {\n  let lo = 0, hi = nums.length - 1;\n  while (lo <= hi) {\n    const mid = lo + Math.floor((hi - lo) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[lo] <= nums[mid]) {\n      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;\n      else lo = mid + 1;\n    } else {\n      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;\n      else hi = mid - 1;\n    }\n  }\n  return -1;\n}',
    complexity: 'O(log n) time, O(1) space.',
    tests: {
      cases: [
        { args: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
        { args: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
        { args: [[1], 0], expected: -1 },
        { args: [[5, 1, 3], 3], expected: 2 },
      ],
    },
  },
  {
    id: 'find-minimum-rotated',
    title: 'Find Minimum in Rotated Sorted Array',
    pattern: 'Binary Search',
    difficulty: 'medium',
    week: 2,
    frequency: 4,
    prompt: 'Given a rotated sorted array of unique elements, return the minimum element in O(log n).',
    functionName: 'findMin',
    starterCode: 'function findMin(nums) {\n  // your code here\n}',
    hints: [
      'Compare mid against the RIGHT end, not the left — it avoids an extra case.',
      'If nums[mid] > nums[hi], the minimum is strictly to the right of mid.',
    ],
    solution:
      'function findMin(nums) {\n  let lo = 0, hi = nums.length - 1;\n  while (lo < hi) {\n    const mid = lo + Math.floor((hi - lo) / 2);\n    if (nums[mid] > nums[hi]) lo = mid + 1;\n    else hi = mid;\n  }\n  return nums[lo];\n}',
    complexity: 'O(log n) time, O(1) space.',
    tests: {
      cases: [
        { args: [[3, 4, 5, 1, 2]], expected: 1 },
        { args: [[4, 5, 6, 7, 0, 1, 2]], expected: 0 },
        { args: [[11, 13, 15, 17]], expected: 11 },
        { args: [[2, 1]], expected: 1 },
      ],
    },
  },
];
