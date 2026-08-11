# Coding Interview — Problem Solving in JavaScript (Part 1)

> **The most-asked LeetCode problems, solved in JavaScript, explained so you can rebuild them from scratch.**
> Every problem follows the same 6-block format: **Question → Signal → Strategy → Code → Trace → Complexity & Pitfalls**.
> Part 1 = the meta layer + the 8 highest-frequency patterns. Part 2 = [Trees, Heaps, Greedy, Backtracking, DP, Graphs](03b-coding-challenges-advanced-patterns.md).

**Coverage:** 55 problems in this file (P1–P55), 62 in Part 2 (P56–P117) → the 117 problems that cover ~90% of what HackerRank / Codility / CodeSignal / Karat / on-site rounds actually ask.

---

## In 60 seconds — how to use this guide

1. **Pattern recognition is the entire skill.** There are not hundreds of problems; there are
   about thirteen patterns. Once you can name the pattern in the first 60 seconds, the code is
   mechanical.
2. **The highest-frequency pattern by far is hashing.** "Have I seen this before?" or "how many
   of each?" — a `Map` or `Set` turns an O(n²) scan into O(n). Roughly 30% of screening
   problems.
3. **The signal → pattern table below is what to memorise**, not the solutions:

   | If the problem says | Reach for |
   |---|---|
   | "seen before", "count of each", "pairs summing to" | Hash map / Set |
   | "sorted array", "find a pair", "in place" | Two pointers |
   | "longest/shortest substring", "window of size k" | Sliding window |
   | "sorted" + "find" + "O(log n)" | Binary search |
   | "matching brackets", "next greater element" | Stack |
   | "top K", "k largest" | Heap |
   | "all combinations", "all permutations" | Backtracking |
   | "shortest path", "connected", "grid" | BFS / DFS |

4. **Talk before you type**, even in a silent automated test — narrating forces you to pick the
   pattern deliberately instead of drifting into brute force.
5. **Write the brute force first if you are stuck.** It banks partial credit and it very often
   reveals the optimisation.
6. **Test the empty case, the single-element case, and duplicates.** That is where hidden test
   cases live.

**Every problem here follows the same six-part format:** Question → Signal (how to recognise
it) → Strategy (in plain English) → Code → Trace table → Complexity & pitfalls. **Read the
Signal section even for problems you skip** — that is the part that transfers.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Time complexity** | How runtime grows as input grows. O(n) = doubles when input doubles |
| **Space complexity** | How much extra memory you use, beyond the input |
| **O(1)** | Constant — same cost regardless of size |
| **O(log n)** | Halving each step. Binary search |
| **O(n log n)** | The cost of sorting. Usually the best achievable for comparison problems |
| **O(n²)** | Nested loops. Fine at n=1,000, fatal at n=100,000 |
| **In place** | Modifying the input without allocating a new array |
| **Two pointers** | Two indices moving through an array, often from both ends |
| **Sliding window** | A moving range over an array, expanded and shrunk |
| **Prefix sum** | Precomputed running totals, so any range sum is O(1) |
| **Hash map / Set** | O(1) lookup by key · O(1) membership test |
| **Monotonic stack** | A stack kept sorted, used for "next greater element" problems |
| **BFS** | Breadth-First Search — explore level by level. Finds shortest paths |
| **DFS** | Depth-First Search — go deep before backtracking |
| **Memoisation** | Caching results of repeated subproblems |
| **Greedy** | Take the locally best option each step. Fast when it works, wrong when it does not |
| **Edge case** | Empty input, one element, duplicates, negatives, overflow |

---

## Table of Contents

**Part A — The Meta Layer (read this first)**
1. [The 6-Step Ritual — how to attack any problem](#the-6-step-ritual)
2. [Pattern Recognition Table — signal → pattern](#pattern-recognition-table)
3. [Complexity Budget — what `n` tells you about the answer](#complexity-budget)
4. [The JavaScript Interview Toolkit (and its traps)](#the-javascript-interview-toolkit)
5. [How to explain your solution out loud](#how-to-explain-your-solution-out-loud)

**Part B — Patterns & Problems**

| # | Pattern | Problems | Why it matters |
|---|---------|----------|----------------|
| 1 | [Hashing & Frequency Counting](#pattern-1--hashing--frequency-counting) | P1–P9 | The single most common bucket. "Can I trade memory for time?" |
| 2 | [Prefix / Running Values](#pattern-2--prefix--running-values) | P10–P14 | Turns O(n²) scans into one pass |
| 3 | [Two Pointers](#pattern-3--two-pointers) | P15–P21 | Sorted arrays, palindromes, in-place partitioning |
| 4 | [Sliding Window](#pattern-4--sliding-window) | P22–P27 | "Longest/shortest substring or subarray such that…" |
| 5 | [Strings & Ad-hoc](#pattern-5--strings--ad-hoc) | P28–P36 | Parsing, palindromes, encoding — the assessment favourite |
| 6 | [Stack & Monotonic Stack](#pattern-6--stack--monotonic-stack) | P37–P43 | Matching, "next greater", expression evaluation |
| 7 | [Binary Search](#pattern-7--binary-search) | P44–P50 | On arrays *and* on answers |
| 8 | [Linked Lists](#pattern-8--linked-lists) | P51–P55 | Pointer surgery — heavily asked at senior level |

[Continue to Part 2 →](03b-coding-challenges-advanced-patterns.md)

---
---

# Part A — The Meta Layer

## The 6-Step Ritual

Do not start typing. Interviewers score *process* as much as output, and 80% of failed screens are failures of process, not knowledge.

### Step 1 — Restate & pin the contract (30 sec)

Say back what you were asked, then nail down what the statement left vague:

- **Input domain:** can the array be empty? Can it contain negatives? Zeros? Duplicates? Is it sorted?
- **Size:** `n ≤ 100` or `n ≤ 10^5`? This *chooses the algorithm for you* (see [Complexity Budget](#complexity-budget)).
- **Output shape:** the value, the index, all answers, or just a count? Any answer or the lexicographically smallest?
- **Mutation:** am I allowed to modify the input, or sort it?

> **Script:** *"So I'm given an unsorted integer array and a target, and I return the indices of the two numbers that add to it. Can I assume exactly one solution exists? Can numbers be negative? Is the array large enough that O(n²) is out?"*

### Step 2 — Work a tiny example by hand (60 sec)

Pick an example with **4–6 elements** and at least one edge property (a duplicate, a negative, a tie). Solve it *on paper* the way a human would. The human method is almost always the algorithm — you're just formalising your own intuition.

### Step 3 — State the brute force, out loud, then kill it

Always name it: *"Brute force is check every pair — O(n²). That's my correctness baseline."*
This does three things: it proves you understood the problem, it gives you something to fall back to if time runs out, and it frames the optimisation as *removing specific redundant work*.

Then ask the one magic question: **"What am I recomputing?"** Every optimisation in this document is an answer to it:

| Redundancy | The fix | Pattern |
|---|---|---|
| Re-scanning for "have I seen this?" | Remember it in a hash map | Hashing |
| Re-summing the same prefix | Keep a running sum | Prefix sums |
| Re-examining pairs in a sorted array | Move two pointers inward | Two pointers |
| Re-scanning a window that only shifts by one | Add-right / remove-left | Sliding window |
| Re-searching a sorted range | Halve the range | Binary search |
| Re-solving the same subproblem | Memoise / tabulate | DP |

### Step 4 — Announce the plan before coding

3–4 sentences: data structure, invariant, loop, why it's correct.
The **invariant** is the sentence that makes the code obvious: *"At every step, `left` is the smallest index where the window is still valid."* If you can't state the invariant, you'll write a buggy loop.

### Step 5 — Code in the boring, readable way

Named variables (`left`, `right`, `seen`, `best`), no cleverness, no one-liner golf. Handle the empty/single-element case in the first two lines. Interviewers cannot give credit for code they can't follow.

### Step 6 — Dry-run and stress the edges (mandatory)

Trace your *own* code line by line on your Step-2 example, then deliberately test:

`[]` · `[x]` · all-equal `[2,2,2]` · already sorted · reverse sorted · negatives & zero · target not present · duplicates at the boundary · `n=1` window.

> **Rule:** finding your own bug scores *higher* than never having one, because it demonstrates verification skill. Never say "it should work" — say "let me trace it."

---

## Pattern Recognition Table

Read the problem statement, find the phrase, get the pattern. This table is the highest-leverage thing in this file — memorise the left column.

| The phrase in the problem | Almost certainly | Go to |
|---|---|---|
| "two numbers that sum to…" (unsorted) | Hash map complement lookup | [P1](#p1-two-sum) |
| "two numbers that sum to…" (**sorted**) | Two pointers from both ends | [P16](#p16-two-sum-ii--input-array-is-sorted) |
| "does it contain a duplicate" / "count occurrences" | `Set` / `Map` frequency count | [P2](#p2-contains-duplicate), [P3](#p3-valid-anagram) |
| "group / bucket things that are equivalent" | Hash map keyed by a **canonical form** | [P4](#p4-group-anagrams) |
| "top K" / "K most frequent" | Bucket sort or a heap of size K | [P5](#p5-top-k-frequent-elements) |
| "subarray sums to K" / "count subarrays with…" | Prefix sum + hash map | [P12](#p12-subarray-sum-equals-k) |
| "product/sum of everything except self", "without division" | Prefix + suffix arrays | [P10](#p10-product-of-array-except-self) |
| "maximum subarray sum" | Kadane's running max | [P13](#p13-maximum-subarray-kadane) |
| "longest / shortest substring such that…" | Sliding window | [P22](#p22-longest-substring-without-repeating-characters) |
| "at most K distinct / K replacements" | Sliding window + frequency map | [P23](#p23-longest-repeating-character-replacement) |
| "contains a permutation / anagram of" | **Fixed-size** sliding window | [P24](#p24-permutation-in-string) |
| "palindrome" | Two pointers inward, or expand-around-center | [P15](#p15-valid-palindrome), [P28](#p28-longest-palindromic-substring) |
| "in-place, O(1) extra space" on an array | Two pointers (read/write) | [P20](#p20-move-zeroes), [P21](#p21-sort-colors-dutch-national-flag) |
| "valid parentheses / brackets / nesting" | Stack | [P37](#p37-valid-parentheses) |
| "next greater / next warmer / previous smaller" | **Monotonic** stack | [P40](#p40-daily-temperatures) |
| "evaluate expression / undo history / decode nested" | Stack | [P39](#p39-evaluate-reverse-polish-notation), [P43](#p43-decode-string) |
| input is **sorted** and you need a position | Binary search | [P44](#p44-binary-search--the-only-template-you-need) |
| "rotated sorted array" | Modified binary search | [P46](#p46-search-in-rotated-sorted-array) |
| "minimum capacity / speed / days such that it fits" | **Binary search on the answer** | [P48](#p48-koko-eating-bananas-binary-search-on-the-answer) |
| "cycle in a linked list", "find the middle" | Fast & slow pointers (Floyd) | [P53](#p53-linked-list-cycle--find-where-it-starts) |
| "reverse a list / reorder nodes" | Iterative 3-pointer reversal | [P51](#p51-reverse-a-linked-list) |
| "merge overlapping ranges", "meeting rooms" | Sort by start/end, then sweep | Part 2 |
| "all subsets / permutations / combinations" | Backtracking | Part 2 |
| "count the ways", "min cost to reach", "can I make X" | Dynamic programming | Part 2 |
| "grid / islands / shortest path / dependencies" | BFS, DFS, topological sort | Part 2 |
| "find the single non-duplicate", "count bits" | XOR / bit tricks | Part 2 |

---

## Complexity Budget

Judges (HackerRank, Codility, LeetCode) time out at roughly **10⁸ simple operations/second**. Read the constraint, then read this table — it eliminates wrong approaches before you write them.

| `n` up to | Required complexity | What that means you must write |
|---|---|---|
| 10 | O(n!) / O(2ⁿ) | Brute-force permutations, backtracking — fine |
| 20 | O(2ⁿ) | Subsets, bitmask DP |
| 500 | O(n³) | Triple loop, Floyd–Warshall |
| 5,000 | O(n²) | Nested loop, 2-D DP |
| 10⁵ – 10⁶ | **O(n log n)** or **O(n)** | Sort, hash map, two pointers, sliding window, heap |
| 10⁹ or "huge range" | **O(log n)** or O(1) | Binary search on the answer, math formula |

**Corollary you can say out loud:** *"n is 10⁵, so O(n²) is 10¹⁰ operations — that times out. I need at worst O(n log n), which means sorting, a hash map, or a single pass."* That one sentence tells the interviewer you think like an engineer.

### Space complexity cheatsheet
- Recursion costs O(depth) stack. Tree recursion = O(h); worst case O(n) for a degenerate tree. Say this — people forget it.
- A hash map of all elements = O(n) space. "O(1) space" in the constraints is a hint to use **two pointers** or **in-place marking**, not a map.

### Cost of JS operations (know these)
| Operation | Cost |
|---|---|
| `map.get/set/has`, `set.add/has` | O(1) average |
| `arr.push/pop` | O(1) amortised |
| `arr.shift/unshift`, `arr.splice(i,…)` | **O(n)** — never inside a loop |
| `arr.includes/indexOf` | **O(n)** — the #1 accidental O(n²) |
| `arr.sort()` | O(n log n) |
| `str + str`, `str.slice` | O(length) — building a string in a loop can be O(n²) |
| spread `[...arr]`, `Object.keys` | O(n) — watch out inside loops |

---

## The JavaScript Interview Toolkit

JS-specific traps cost more interviews than algorithms do. These are the ones that actually bite.

### 1. `sort()` is lexicographic by default — the classic killer

```js
[10, 9, 100, 1].sort();                 // [1, 10, 100, 9]   ❌ string comparison!
[10, 9, 100, 1].sort((a, b) => a - b);  // [1, 9, 10, 100]   ✅ always pass a comparator
```
`sort` also mutates in place and is **not stable across all engines for large arrays** (V8's is stable, but don't rely on it in interviews without saying so).

```js
// Sorting pairs / intervals
intervals.sort((a, b) => a[0] - b[0]);              // by start
words.sort((a, b) => a.length - b.length || a.localeCompare(b)); // multi-key
```

### 2. `Map` vs plain object — prefer `Map`

```js
const freq = new Map();
freq.set(k, (freq.get(k) ?? 0) + 1);   // the counting idiom — memorise it
freq.get(k) ?? 0                        // safe read
for (const [k, v] of freq) { }          // insertion-ordered iteration
[...freq.entries()].sort((a, b) => b[1] - a[1]); // sort by count desc
```
Why `Map`: any key type (objects, numbers stay numbers), no prototype-key collisions (`"constructor"`, `"__proto__"`), `size` in O(1), and reliable insertion order. Plain objects coerce every key to a string.

`Set` for membership: `new Set(arr)`, `.has`, `.add`, `.delete`, `.size`.

### 3. Strings are immutable — build with arrays

```js
// ❌ O(n²) in the worst case
let out = ''; for (const c of s) out += c.toUpperCase();

// ✅ O(n)
const parts = []; for (const c of s) parts.push(c.toUpperCase());
const out2 = parts.join('');

// Reverse a string
const rev = s.split('').reverse().join('');   // or [...s].reverse().join('')
```
Use `[...s]` (not `s.split('')`) when the string may contain emoji/surrogate pairs.

### 4. Characters ↔ codes, and the 26-slot array trick

```js
'a'.charCodeAt(0);                 // 97
String.fromCharCode(97);           // 'a'
const idx = c.charCodeAt(0) - 97;  // 'a'→0 … 'z'→25

const count = new Array(26).fill(0);       // faster than a Map for lowercase-only
for (const c of s) count[c.charCodeAt(0) - 97]++;
```

### 5. Creating arrays and grids correctly

```js
new Array(5).fill(0);                                  // [0,0,0,0,0]
Array.from({ length: 5 }, (_, i) => i);                // [0,1,2,3,4]

// ❌ every row is the SAME array reference
const bad = new Array(3).fill(new Array(3).fill(0));
// ✅ independent rows
const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));
```

### 6. Integer math and division

```js
Math.floor(7 / 2);   // 3
(7 / 2) | 0;         // 3   (bitwise truncation — 32-bit only)
(lo + hi) >> 1;      // safe midpoint for interview-sized inputs
7 % 3;               // 1
-7 % 3;              // -1  ⚠️ JS keeps the sign of the dividend
((-7 % 3) + 3) % 3;  // 2   ← the "always positive modulo" idiom
Number.MAX_SAFE_INTEGER; // 2^53 - 1 → beyond this use BigInt
```
All numbers are doubles. `0.1 + 0.2 !== 0.3`. Bitwise operators truncate to **32-bit signed** — that matters for bit problems.

### 7. There is no built-in heap / deque / queue

- **Queue:** don't use `shift()` (O(n)). Use an array plus a head index:
  ```js
  const q = [start]; let head = 0;
  while (head < q.length) { const cur = q[head++]; /* … */ }
  ```
- **Heap:** you must hand-roll it. The 25-line `MinHeap` is in [Part 2](03b-coding-challenges-advanced-patterns.md#the-minheap-you-must-be-able-to-write). Learn to type it from memory — it unlocks a whole problem class.

### 8. Comparison & equality traps

```js
[1,2] === [1,2];        // false — reference equality
JSON.stringify(a) === JSON.stringify(b);  // cheap deep compare for interviews
0 == '0';    // true    → always use ===
[] == false; // true    → coercion madness
null ?? 5;   // 5       → ?? only falls through for null/undefined (0 and '' survive)
Math.max();  // -Infinity  ⚠️ Math.max(...[]) on an empty array
Math.max(...huge); // ⚠️ stack overflow past ~10^5 args — use a reduce loop instead
```

### 9. Fast input reading (HackerRank / Codility harness)

```js
process.stdin.resume();
let input = '';
process.stdin.on('data', d => { input += d; });
process.stdin.on('end', () => {
  const lines = input.trim().split('\n');
  const n = Number(lines[0]);
  const arr = lines[1].trim().split(/\s+/).map(Number);
  console.log(solve(n, arr));
});
```

---

## How to Explain Your Solution Out Loud

Use this 5-sentence template every time. It's what separates a "hire" from a "no signal" on the same working code.

1. **Pattern:** *"This is a sliding-window problem because it asks for the longest substring with a property."*
2. **Data structure:** *"I keep a `Map` of character → count for the current window."*
3. **Invariant:** *"The window `[left, right]` is always valid — at most one character needs replacing."*
4. **Why it terminates / is correct:** *"`right` only moves forward, and `left` never passes `right`, so each character is added and removed at most once."*
5. **Complexity:** *"O(n) time, O(k) space where k is the alphabet size."*

**If you go blank:** say the brute force, code the brute force, then optimise. A working O(n²) with a clear explanation of the O(n) idea beats a broken O(n) every time.

---
---

# Part B — Patterns & Problems

# Pattern 1 — Hashing & Frequency Counting

**Core idea:** a hash map converts "search the array again" (O(n)) into "look it up" (O(1)). You are trading O(n) memory for O(n) time. Any time you catch yourself writing a nested loop where the inner loop *searches*, a map removes it.

**Three shapes it takes:**
1. **Complement / seen-set** — "have I already met the thing that completes this?" (P1, P2)
2. **Frequency count** — "how many of each?" (P3, P5, P8)
3. **Canonical key bucketing** — "map each item to a signature, group by signature" (P4)

---

## P1: Two Sum

`Easy` · The most-asked question in the industry. If you fumble this, nothing else gets evaluated.

**Q:** Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers that add up to `target`. Exactly one solution exists; you may not use the same element twice.

```
nums = [2, 7, 11, 15], target = 9   →  [0, 1]      (2 + 7)
nums = [3, 2, 4],       target = 6   →  [1, 2]
nums = [3, 3],          target = 6   →  [0, 1]
```

**Signal:** "two numbers that sum to X", array **not sorted**, need **indices** (so you can't sort — sorting destroys indices).

**Strategy — the complement flip:**
Brute force asks *"for each pair, do they sum to target?"* — O(n²). Flip the question: for the current number `x`, the partner I need is **exactly** `target - x`. There's only ever one candidate, so I don't need to search for it — I need to *remember* whether I've already passed it.

So: walk once, and for each `x` ask "is `target - x` in my map of things I've already seen?" If yes, done. If no, record `x → its index` and continue. Because I only look **backwards** at already-stored numbers, I can never pair an element with itself.

```js
function twoSum(nums, target) {
  const seen = new Map();            // value -> index of that value

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];   // the exact partner this number requires

    if (seen.has(need)) {
      return [seen.get(need), i];    // earlier index first
    }
    seen.set(nums[i], i);            // record AFTER checking → no self-pairing
  }
  return [];                          // unreachable given the problem guarantee
}
```

**Trace** (`nums = [2,7,11,15]`, `target = 9`):

| i | nums[i] | need | `seen` before | has(need)? | action |
|---|---|---|---|---|---|
| 0 | 2 | 7 | `{}` | no | store `2→0` |
| 1 | 7 | 2 | `{2:0}` | **yes** | return `[0, 1]` |

**Complexity:** O(n) time, O(n) space.

**Pitfalls:**
- Storing before checking → `[3,3]` style inputs break, or an element pairs with itself when `target = 2*x`.
- Returning the *values* instead of the indices. Re-read the return spec.
- Don't sort: it invalidates the indices. (If the problem returns *values*, sorting + two pointers is O(n log n) with O(1) space — see [P16](#p16-two-sum-ii--input-array-is-sorted).)

**Follow-ups you should expect:** array is sorted → two pointers. Need *all* pairs → keep counts, watch duplicates. Three numbers → [3Sum](#p17-3sum). Called repeatedly on the same array → build the map once in a constructor.

---

## P2: Contains Duplicate

`Easy`

**Q:** Return `true` if any value appears at least twice.

```
[1,2,3,1] → true       [1,2,3,4] → false
```

**Strategy:** A `Set` answers "seen before?" in O(1). Either compare sizes (concise) or early-exit while inserting (better — stops at the first duplicate instead of always scanning everything).

```js
// One-liner — fine to say, but always mention the early-exit version too
const containsDuplicate = nums => new Set(nums).size !== nums.length;

// Preferred in interviews: early exit, O(1) best case
function containsDuplicate2(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
```

**Complexity:** O(n) / O(n). If asked for **O(1) space**: sort first (O(n log n)) and compare neighbours.

---

## P3: Valid Anagram

`Easy`

**Q:** Are `s` and `t` anagrams (same characters, same counts)?

```
s = "anagram", t = "nagaram" → true
s = "rat",     t = "car"     → false
```

**Strategy:** Two strings are anagrams iff their character-frequency maps are identical. Length mismatch is an instant `false`. Then: **increment for `s`, decrement for `t`** in a single map — if every count lands back at zero, they match. The single-pass +1/−1 trick is nicer than building two maps and comparing.

```js
function isAnagram(s, t) {
  if (s.length !== t.length) return false;

  const count = new Array(26).fill(0);       // lowercase a–z only
  for (let i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++;           // add from s
    count[t.charCodeAt(i) - 97]--;           // remove for t
  }
  return count.every(c => c === 0);
}

// Unicode-safe version (interviewer says "what about emoji / any charset?")
function isAnagramUnicode(s, t) {
  if ([...s].length !== [...t].length) return false;
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) ?? 0) + 1);
  for (const c of t) {
    const left = (count.get(c) ?? 0) - 1;
    if (left < 0) return false;              // t has a char s doesn't
    count.set(c, left);
  }
  return true;
}
```

**Complexity:** O(n) time, O(1) space (26 slots) or O(k) for the general alphabet.
**Pitfall:** `sort` both and compare is O(n log n) — acceptable but say you know the O(n) version. Also ask whether case and spaces matter.

---

## P4: Group Anagrams

`Medium` · The "canonical key" pattern — worth internalising beyond this problem.

**Q:** Group the strings that are anagrams of each other.

```
["eat","tea","tan","ate","nat","bat"]
→ [["eat","tea","ate"], ["tan","nat"], ["bat"]]
```

**Signal:** "group / bucket items that are equivalent under some transformation."

**Strategy:** You need one **canonical form** — a value that is *identical* for every member of a group and *different* across groups. Then a hash map keyed by that form does all the grouping for you in one pass.

Two valid keys:
- **Sorted string:** `"eat" → "aet"`. Simple, O(k log k) per word.
- **Count signature:** the 26 counts joined, `"eat" → "1,0,0,0,1,…,1,…"`. O(k) per word — better when words are long.

```js
function groupAnagrams(strs) {
  const groups = new Map();                 // canonicalKey -> array of words

  for (const word of strs) {
    // canonical form #1: sorted letters
    const key = word.split('').sort().join('');

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}

// O(n * k) variant — count signature instead of sorting
function groupAnagramsCount(strs) {
  const groups = new Map();
  for (const word of strs) {
    const count = new Array(26).fill(0);
    for (const c of word) count[c.charCodeAt(0) - 97]++;
    const key = count.join(',');            // ',' matters: prevents 1,11 vs 11,1 collisions
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}
```

**Complexity:** sorted-key O(n · k log k); count-key O(n · k). Space O(n · k).
**Pitfall:** joining counts **without a separator** collides (`[1,11]` and `[11,1]` both become `"111"`). Say this out loud — interviewers love it.

---

## P5: Top K Frequent Elements

`Medium` · Tests whether you know that "top K" ≠ "must sort".

**Q:** Return the `k` most frequent elements.

```
nums = [1,1,1,2,2,3], k = 2 → [1,2]
```

**Strategy — three tiers, present them in this order:**

1. Count with a map, **sort** by count, take `k` → O(n log n). Always correct, easy to write.
2. Count, push into a **min-heap of size k** → O(n log k). The general answer when `k ≪ n`.
3. **Bucket sort** → O(n). The trick: a frequency can never exceed `n`, so make `n+1` buckets where `bucket[f]` holds every value that appears exactly `f` times. Walk the buckets from high frequency down and take the first `k`. No comparisons needed at all.

```js
// Tier 3 — O(n) bucket sort
function topKFrequent(nums, k) {
  const count = new Map();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);

  // buckets[f] = all values whose frequency is exactly f
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, freq] of count) buckets[freq].push(value);

  const result = [];
  for (let f = buckets.length - 1; f >= 1 && result.length < k; f--) {
    for (const value of buckets[f]) {
      result.push(value);
      if (result.length === k) return result;
    }
  }
  return result;
}

// Tier 1 — the "I'll start simple" version
function topKFrequentSort(nums, k) {
  const count = new Map();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([value]) => value);
}
```

**Why bucket sort is O(n):** the bucket array has `n+1` slots and the total number of items across all buckets is at most `n` (one per distinct value), so the downward walk touches O(n) cells total.

**Complexity:** O(n) time, O(n) space.
**Pitfall:** the inner `if (result.length === k) return` matters — without it a fat bucket can overshoot `k`.

---

## P6: Longest Consecutive Sequence

`Medium` · Beautiful use of a set to avoid sorting.

**Q:** Given an unsorted array, return the length of the longest run of consecutive integers. Must be O(n).

```
[100, 4, 200, 1, 3, 2] → 4     (1,2,3,4)
[0,3,7,2,5,8,4,6,0,1]  → 9
```

**Strategy:** Sorting is O(n log n) and explicitly ruled out. Put everything in a `Set`, then notice: a number `x` is the **start** of a sequence only if `x - 1` is not in the set. So for each candidate start, walk upward (`x+1`, `x+2`, …) counting. Every number is visited at most twice overall — once as a candidate and once during exactly one upward walk — so the total is O(n) despite the nested loop.

```js
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;

  for (const n of set) {                 // iterate the SET → duplicates handled free
    if (set.has(n - 1)) continue;        // not a sequence start, skip

    let length = 1;
    while (set.has(n + length)) length++; // walk up the run
    best = Math.max(best, length);
  }
  return best;
}
```

**Trace** (`[100,4,200,1,3,2]`): `100` — is 99 present? no → run = {100} → 1. `4` — 3 present → skip. `200` → 1. `1` — 0 absent → walk 2,3,4 → **4**. `3`,`2` → skipped. Answer 4.

**Complexity:** O(n) time (amortised), O(n) space.
**Pitfall:** the "is this a start?" guard is the whole trick. Without it you get O(n²) on `[1,2,3,…,n]`. Iterate the *set*, not the array, or duplicates re-do work.

---

## P7: Majority Element (Boyer–Moore Voting)

`Easy` to state, `clever` to solve in O(1) space.

**Q:** An element appears more than `⌊n/2⌋` times. Find it. O(1) space.

```
[2,2,1,1,1,2,2] → 2
```

**Strategy — vote cancellation:** With a map it's trivial O(n)/O(n). For O(1) space, think of it as a brawl: keep a `candidate` and a `count`. A matching element is a supporter (`count++`); a different element cancels one supporter (`count--`). When count hits 0, the current element becomes the new candidate. Because the majority element outnumbers *everything else combined*, it can never be fully cancelled — whoever is standing at the end is the majority.

```js
function majorityElement(nums) {
  let candidate = nums[0], count = 0;

  for (const n of nums) {
    if (count === 0) candidate = n;       // no one standing → new candidate
    count += (n === candidate) ? 1 : -1;  // supporter or canceller
  }
  return candidate;
}
```

**Complexity:** O(n) time, O(1) space.
**Pitfall:** this only works when a majority is **guaranteed**. If not, do a second pass to verify the candidate actually exceeds n/2. Mention that.

---

## P8: First Unique Character in a String

`Easy`

**Q:** Return the index of the first non-repeating character, or `-1`.

```
"leetcode" → 0      "loveleetcode" → 2      "aabb" → -1
```

**Strategy:** You can't know if a character is unique until you've seen the whole string → **two passes**. Pass 1 counts, pass 2 returns the first index whose count is 1. Return the *index*, so the second pass must go over the string (which is ordered), not the map.

```js
function firstUniqChar(s) {
  const count = new Map();
  for (const c of s) count.set(c, (count.get(c) ?? 0) + 1);

  for (let i = 0; i < s.length; i++) {
    if (count.get(s[i]) === 1) return i;
  }
  return -1;
}
```

**Complexity:** O(n) time, O(k) space.
**Follow-up:** *streaming* version (characters arrive one at a time, query "current first unique" any time) → a `Map` of counts plus a queue of candidates; pop from the queue front while its count > 1.

---

## P9: Two Sum — All Pairs / K-diff Pairs

`Medium` · The realistic variant of P1 that trips people up on duplicates.

**Q:** Count **unique** pairs `(a, b)` in the array with `a - b = k` (`k ≥ 0`).

```
nums = [3,1,4,1,5], k = 2 → 2      pairs (1,3) and (3,5)
nums = [1,3,1,5,4], k = 0 → 1      pair  (1,1)
```

**Strategy:** Count frequencies, then iterate over **distinct** keys — that's what makes pairs unique automatically. Two cases:
- `k > 0`: a key `x` forms a pair iff `x + k` also exists.
- `k = 0`: a key pairs with *itself*, which requires `count[x] ≥ 2`.

Splitting on `k === 0` is the entire difficulty of this problem.

```js
function findPairs(nums, k) {
  const count = new Map();
  for (const n of nums) count.set(n, (count.get(n) ?? 0) + 1);

  let pairs = 0;
  for (const [x, c] of count) {
    if (k === 0) {
      if (c >= 2) pairs++;            // (x, x) needs two copies
    } else if (count.has(x + k)) {
      pairs++;                        // each distinct x counted once → no double count
    }
  }
  return pairs;
}
```

**Complexity:** O(n) / O(n).
**Pitfall:** only ever looking "upward" (`x + k`, never `x - k`) is what prevents counting each pair twice.

---
---

# Pattern 2 — Prefix / Running Values

**Core idea:** if the answer for position `i` can be built from the answer for `i-1`, you never need an inner loop. This is the seed of dynamic programming, and it's the most common way an O(n²) becomes O(n).

The question to ask: **"What single value, carried along, is enough to decide this position?"** — a running sum, a running minimum, a running max-so-far.

---

## P10: Product of Array Except Self

`Medium` · Constant-space trick, extremely commonly asked.

**Q:** Return `answer` where `answer[i]` is the product of all elements *except* `nums[i]`. **No division**, O(n) time.

```
[1,2,3,4] → [24,12,8,6]
[-1,1,0,-3,3] → [0,0,9,0,0]
```

**Signal:** "except self", "without division" → prefix × suffix.

**Strategy:** Everything except `i` = (everything to the **left** of `i`) × (everything to the **right** of `i`). So:
1. Sweep left→right filling `answer[i]` with the product of all elements before `i`.
2. Sweep right→left multiplying in the product of all elements after `i`, carrying that suffix product in a single variable.

The output array doubles as the prefix storage, so extra space is O(1).

```js
function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n).fill(1);

  // Pass 1: answer[i] = product of everything LEFT of i
  let prefix = 1;
  for (let i = 0; i < n; i++) {
    answer[i] = prefix;        // write BEFORE including nums[i] → excludes self
    prefix *= nums[i];
  }

  // Pass 2: multiply in the product of everything RIGHT of i
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= suffix;
    suffix *= nums[i];
  }
  return answer;
}
```

**Trace** (`[1,2,3,4]`):

| step | answer |
|---|---|
| after pass 1 (prefixes) | `[1, 1, 2, 6]` |
| pass 2, i=3 (suffix 1) | `[1, 1, 2, 6]` → suffix becomes 4 |
| i=2 (suffix 4) | `[1, 1, 8, 6]` → suffix 12 |
| i=1 (suffix 12) | `[1, 12, 8, 6]` → suffix 24 |
| i=0 (suffix 24) | `[24, 12, 8, 6]` ✅ |

**Complexity:** O(n) time, O(1) extra space (output excluded).
**Pitfall:** the write-before-multiply ordering is what excludes self. Division would break on zeros — that's exactly why it's banned.

---

## P11: Best Time to Buy and Sell Stock

`Easy` · Ubiquitous. Everyone recognises the greedy one-liner.

**Q:** `prices[i]` is the price on day `i`. Buy once, sell later. Max profit, or 0.

```
[7,1,5,3,6,4] → 5    (buy at 1, sell at 6)
[7,6,4,3,1]   → 0    (never profitable)
```

**Strategy:** For each day, the best sale on that day = today's price − the **cheapest price seen so far**. So carry one variable, `minSoFar`. Update the answer, then update the minimum. Order matters: you must buy *before* you sell.

```js
function maxProfit(prices) {
  let minPrice = Infinity, best = 0;

  for (const price of prices) {
    best = Math.max(best, price - minPrice); // sell today at the best past buy
    minPrice = Math.min(minPrice, price);    // then consider buying today
  }
  return best;
}
```

**Complexity:** O(n) / O(1).
**Pitfalls:** initialise `best = 0` (no transaction is allowed). Don't update `minPrice` before computing profit or you'll allow same-day buy/sell (harmless here, wrong in stricter variants).
**Follow-up (Stock II — unlimited transactions):** grab every upward step — `sum(max(0, p[i] - p[i-1]))`. That's the greedy in [Part 2](03b-coding-challenges-advanced-patterns.md).

---

## P12: Subarray Sum Equals K

`Medium` · Prefix-sum + hash map. This combination shows up constantly; learn it as a unit.

**Q:** Count the number of **contiguous** subarrays whose sum equals `k`. Values may be negative.

```
nums = [1,1,1], k = 2 → 2
nums = [1,2,3], k = 3 → 2       ([1,2] and [3])
```

**Strategy:** Let `P[i]` = sum of the first `i` elements. Then `sum(j..i) = P[i+1] - P[j]`. We want that to equal `k`, i.e.

> `P[j] = P[i+1] - k`

So while sweeping and maintaining the running prefix, the question becomes *"how many earlier prefixes equal `current - k`?"* — a hash map of **prefix value → how many times it occurred** answers that in O(1).

Seed the map with `{0: 1}`: one empty prefix exists before the array starts, which is what lets a subarray *starting at index 0* be counted.

Note why sliding window **does not work here**: negatives mean the sum isn't monotonic as the window grows, so you can't shrink-when-too-big.

```js
function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]);   // prefixSum -> how many times seen; empty prefix = 1
  let running = 0, count = 0;

  for (const n of nums) {
    running += n;
    count += seen.get(running - k) ?? 0;      // every matching earlier prefix = one subarray
    seen.set(running, (seen.get(running) ?? 0) + 1);
  }
  return count;
}
```

**Trace** (`[1,1,1]`, `k=2`):

| n | running | need `running-k` | count from map | map after |
|---|---|---|---|---|
| 1 | 1 | −1 | 0 | `{0:1, 1:1}` |
| 1 | 2 | 0 | **+1** (total 1) | `{0:1,1:1,2:1}` |
| 1 | 3 | 1 | **+1** (total 2) | `{0:1,1:1,2:1,3:1}` |

**Complexity:** O(n) / O(n).
**Pitfalls:** forgetting the `{0:1}` seed (misses subarrays from index 0); counting *before* inserting the current prefix (insert after, or a zero-length subarray can self-match when `k = 0`).
**Same skeleton solves:** "subarray sum divisible by K" (key on `running % k`, normalised positive), "contiguous array with equal 0s and 1s" (map 0→−1 and look for prefix repeats), "longest subarray summing to K" (store the *first* index of each prefix).

---

## P13: Maximum Subarray (Kadane)

`Medium` · The canonical "greedy = tiny DP" problem.

**Q:** Find the contiguous subarray with the largest sum and return that sum.

```
[-2,1,-3,4,-1,2,1,-5,4] → 6     ([4,-1,2,1])
[-1] → -1
```

**Strategy — one decision per element:** At index `i`, the best subarray ending at `i` either **extends** the best subarray ending at `i-1`, or **starts fresh** at `i`. So:

> `bestEndingHere = max(nums[i], bestEndingHere + nums[i])`

If the running total ever goes negative, it's dead weight — any future subarray is better off restarting. Track the global max separately.

```js
function maxSubArray(nums) {
  let current = nums[0], best = nums[0];

  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]); // extend or restart
    best = Math.max(best, current);
  }
  return best;
}

// Variant: also return the indices (interviewers love this follow-up)
function maxSubArrayRange(nums) {
  let current = nums[0], best = nums[0], start = 0, bestStart = 0, bestEnd = 0;
  for (let i = 1; i < nums.length; i++) {
    if (current + nums[i] < nums[i]) { current = nums[i]; start = i; } // restart
    else current += nums[i];
    if (current > best) { best = current; bestStart = start; bestEnd = i; }
  }
  return { sum: best, start: bestStart, end: bestEnd };
}
```

**Complexity:** O(n) / O(1).
**Pitfall:** initialising `best = 0` breaks all-negative inputs (`[-3,-1,-2]` should be `-1`, not `0`). Seed with `nums[0]`.

---

## P14: Maximum Product Subarray

`Medium` · Kadane with a twist that catches most people.

**Q:** Find the contiguous subarray with the largest **product**.

```
[2,3,-2,4]  → 6     ([2,3])
[-2,0,-1]   → 0
[-2,3,-4]   → 24    (all three: -2 * 3 * -4)
```

**Strategy:** Products aren't monotonic like sums — a big **negative** becomes the maximum the moment another negative arrives. So track **both** the running max and the running min. On a negative number, the roles swap. Zeros reset both to the element itself.

```js
function maxProduct(nums) {
  let curMax = nums[0], curMin = nums[0], best = nums[0];

  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];
    // compute both from the PREVIOUS pair before overwriting
    const candidates = [n, curMax * n, curMin * n];
    curMax = Math.max(...candidates);
    curMin = Math.min(...candidates);
    best = Math.max(best, curMax);
  }
  return best;
}
```

**Trace** (`[-2,3,-4]`): start max=min=best=−2. → n=3: candidates `[3,−6,−6]` → max 3, min −6, best 3. → n=−4: candidates `[−4,−12,24]` → max **24**, min −12, best **24**. ✅

**Complexity:** O(n) / O(1).
**Pitfall:** updating `curMax` before using the old value to compute `curMin` — snapshot both first.

---
---

# Pattern 3 — Two Pointers

**Core idea:** two indices moving under a rule, so that each element is visited O(1) times. Three flavours:

| Flavour | Pointers | Used for |
|---|---|---|
| **Converging** | `left = 0`, `right = n-1`, move inward | sorted-array pair sums, palindromes, container/area problems |
| **Read/Write (fast–slow same direction)** | `write` lags `read` | in-place removal/compaction |
| **Cycle detection (Floyd)** | `slow += 1`, `fast += 2` | linked-list cycles, middles, duplicate numbers |

**Why converging pointers are correct** — this is the sentence to say: at each step you can *prove* one pointer's current element cannot be part of any better answer, so discarding it loses nothing. That's how O(n²) pairs collapse into O(n) steps.

---

## P15: Valid Palindrome

`Easy`

**Q:** Is `s` a palindrome, considering only alphanumerics and ignoring case?

```
"A man, a plan, a canal: Panama" → true
"race a car" → false
```

**Strategy:** Converging pointers. Skip non-alphanumerics from either end, lowercase-compare, step inward. Doing it in place avoids building a cleaned copy (O(1) space instead of O(n)).

```js
const isAlnum = c => /[a-z0-9]/i.test(c);

function isPalindrome(s) {
  let left = 0, right = s.length - 1;

  while (left < right) {
    while (left  < right && !isAlnum(s[left]))  left++;   // skip junk from the left
    while (left  < right && !isAlnum(s[right])) right--;  // and from the right

    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++; right--;
  }
  return true;
}
```

**Complexity:** O(n) / O(1).
**Pitfalls:** the inner skip loops **must** re-check `left < right` or you run off the end on `",,,"`. Regex per character is slowish — for tight limits compare char codes directly.
**Simpler-but-O(n)-space version to mention:** `const t = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return t === [...t].reverse().join('');`

---

## P16: Two Sum II — Input Array Is Sorted

`Medium` · The same question as P1 with one extra fact, and the fact changes everything.

**Q:** Sorted array, find two numbers summing to `target`; return their 1-based indices. **O(1) space.**

```
[2,7,11,15], target = 9 → [1,2]
```

**Strategy — the discard argument:** Point at the smallest and largest. Their sum tells you which end is wrong:
- sum **too small** → the smallest element is too small *with even the largest partner*, so it can never work → `left++`.
- sum **too big** → the largest element is too big *even with the smallest partner* → `right--`.
- equal → done.

Each step permanently eliminates one element, so it's O(n) with no extra memory. This "one end is provably useless" logic is the heart of every converging-pointer solution.

```js
function twoSumSorted(numbers, target) {
  let left = 0, right = numbers.length - 1;

  while (left < right) {
    const sum = numbers[left] + numbers[right];
    if (sum === target) return [left + 1, right + 1];  // 1-based!
    if (sum < target) left++;                          // need bigger
    else right--;                                      // need smaller
  }
  return [];
}
```

**Complexity:** O(n) / O(1).
**Pitfall:** the 1-based index requirement. Read the spec twice.

---

## P17: 3Sum

`Medium` · The classic "sort + fix one + two pointers" template, plus duplicate handling that people always get wrong.

**Q:** Find all **unique** triplets summing to zero.

```
[-1,0,1,2,-1,-4] → [[-1,-1,2], [-1,0,1]]
```

**Strategy — reduce dimension:** Sort (O(n log n), and it makes duplicates adjacent). Then fix the first element `nums[i]` and the problem becomes *2Sum-on-a-sorted-array for target `-nums[i]`* → O(n) inner scan. Total O(n²), which beats O(n³).

Deduplication, the actual difficulty — three rules:
1. Skip `i` if `nums[i] === nums[i-1]` (same first element already fully explored).
2. After recording a hit, advance `left` past equal values and `right` back past equal values.
3. Early break when `nums[i] > 0` — with a sorted array the remaining numbers are all positive, so no triplet can reach zero.

```js
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < nums.length - 2; i++) {
    if (nums[i] > 0) break;                       // rest are positive → impossible
    if (i > 0 && nums[i] === nums[i - 1]) continue; // dedupe the fixed element

    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];

      if (sum < 0) left++;
      else if (sum > 0) right--;
      else {
        result.push([nums[i], nums[left], nums[right]]);
        // dedupe both moving pointers
        while (left < right && nums[left]  === nums[left + 1])  left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++; right--;
      }
    }
  }
  return result;
}
```

**Complexity:** O(n²) time, O(1) extra space (ignoring output and sort recursion).
**Pitfalls:** deduping with a `Set` of stringified triplets works but is a red flag — do it structurally. `i > 0 &&` is required or `i-1` reads `undefined`.
**Follow-ups:** *3Sum Closest* — track the minimum `|sum − target|` and never break early. *4Sum* — one more outer loop, O(n³).

---

## P18: Container With Most Water

`Medium` · The purest demonstration of the discard argument.

**Q:** `height[i]` is a vertical line at `x = i`. Pick two lines that with the x-axis hold the most water.

```
[1,8,6,2,5,4,8,3,7] → 49    (lines at index 1 and 8: min(8,7) * 7)
```

**Strategy:** Area = `min(h[l], h[r]) × (r - l)`. Start at the widest pair and walk inward. Any inward move *loses* width, so it can only pay off by *gaining* height — and height is capped by the **shorter** line. Therefore move the shorter one: keeping it can never produce a better area, because every remaining pairing with it is narrower and still capped by the same height. Moving the taller one would be throwing away the only line that could improve.

```js
function maxArea(height) {
  let left = 0, right = height.length - 1, best = 0;

  while (left < right) {
    const h = Math.min(height[left], height[right]);
    best = Math.max(best, h * (right - left));

    // move the shorter side — the only one with upside
    if (height[left] < height[right]) left++;
    else right--;
  }
  return best;
}
```

**Complexity:** O(n) / O(1).
**Pitfall:** don't confuse with Trapping Rain Water — here the bars have no width and only two are used.

---

## P19: Trapping Rain Water

`Hard` · Frequently asked; the two-pointer version is the one to know.

**Q:** How much water is trapped between the bars?

```
[0,1,0,2,1,0,1,3,2,1,2,1] → 6
```

**Strategy:** Water above column `i` = `min(tallestToTheLeft, tallestToTheRight) − height[i]` (clamped at 0). The naive version recomputes those maxima → O(n²); precomputing two arrays → O(n) time / O(n) space.

The O(1)-space insight: process from whichever side currently has the **smaller** max. If `leftMax < rightMax`, then for the left pointer the limiting wall *is* `leftMax` — the right side is guaranteed to have something at least as tall, so `min(...)` is `leftMax` no matter what lies between. That lets you settle each column immediately with only two running maxima.

```js
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      // leftMax is the binding constraint for column `left`
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];
      left++;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];
      right--;
    }
  }
  return water;
}
```

**Complexity:** O(n) time, O(1) space.
**Pitfall:** updating the max *before* adding water keeps the term non-negative — no `Math.max(0, …)` needed.
**Also solvable with:** a monotonic decreasing stack — mention it, then use the two-pointer version.

---

## P20: Move Zeroes

`Easy` · The read/write pointer template.

**Q:** Move all `0`s to the end **in place**, keeping the relative order of the non-zeros.

```
[0,1,0,3,12] → [1,3,12,0,0]
```

**Strategy:** `read` scans everything; `write` marks where the next non-zero belongs. Copy each non-zero to `write` and advance it. Swapping (rather than overwriting then padding) finishes the job in a single pass.

```js
function moveZeroes(nums) {
  let write = 0;

  for (let read = 0; read < nums.length; read++) {
    if (nums[read] !== 0) {
      [nums[write], nums[read]] = [nums[read], nums[write]];
      write++;
    }
  }
  return nums;
}
```

**Complexity:** O(n) / O(1).
**Same template solves:** *Remove Duplicates from Sorted Array* (`if (nums[read] !== nums[write - 1]) nums[write++] = nums[read]`), *Remove Element*, *Remove Duplicates II* (allow two — compare against `nums[write - 2]`).

---

## P21: Sort Colors (Dutch National Flag)

`Medium` · Three-way partitioning — the same routine that powers quicksort's 3-way split.

**Q:** Sort an array of `0`s, `1`s and `2`s in place, **one pass**, O(1) space.

```
[2,0,2,1,1,0] → [0,0,1,1,2,2]
```

**Strategy:** Three pointers carving the array into four regions, with this invariant at all times:

```
[0 … low-1] = 0s   [low … mid-1] = 1s   [mid … high] = unknown   [high+1 … n-1] = 2s
```

Look at `nums[mid]`:
- `0` → swap into the 0-zone: `swap(low, mid)`, `low++`, `mid++` (the value swapped in is a known 1, safe to pass).
- `1` → already correct: `mid++`.
- `2` → swap to the 2-zone: `swap(mid, high)`, `high--`, and **do not advance `mid`** — the value just pulled in from the right is unexamined.

```js
function sortColors(nums) {
  let low = 0, mid = 0, high = nums.length - 1;

  while (mid <= high) {
    if (nums[mid] === 0) {
      [nums[low], nums[mid]] = [nums[mid], nums[low]];
      low++; mid++;
    } else if (nums[mid] === 1) {
      mid++;
    } else {                                   // === 2
      [nums[mid], nums[high]] = [nums[high], nums[mid]];
      high--;                                  // mid stays: re-inspect the new value
    }
  }
  return nums;
}
```

**Complexity:** O(n) / O(1).
**Pitfall:** advancing `mid` in the `2` branch is *the* bug in this problem. Also the loop is `mid <= high`, not `<`.

---
---

# Pattern 4 — Sliding Window

**Core idea:** when you need the best contiguous run satisfying a property, don't re-examine each candidate range from scratch. Grow the window on the right; when it becomes invalid, shrink from the left. Each index enters once and leaves once → O(n).

### The universal variable-window template

```js
function slidingWindow(s) {
  let left = 0, best = 0;
  const state = new Map();                 // whatever describes the window

  for (let right = 0; right < s.length; right++) {
    add(s[right], state);                  // 1. grow

    while (!isValid(state)) {              // 2. shrink until valid again
      remove(s[left], state);
      left++;
    }

    best = Math.max(best, right - left + 1); // 3. record
  }
  return best;
}
```

**Two variants, and knowing which you're in matters:**
- **Longest** valid window → `while (invalid) shrink;` then record **after** the while.
- **Shortest** valid window → `while (valid) { record; shrink; }` — record **inside** the while.

**Fixed-size window** (P24): grow to size `k`, then each step adds one on the right and drops one on the left — no inner loop at all.

⚠️ **Sliding window requires monotonicity:** growing the window must move validity in one direction only. That's why it works for "sum of positives ≥ target" but **not** for [Subarray Sum Equals K with negatives](#p12-subarray-sum-equals-k) — there, use prefix sums.

---

## P22: Longest Substring Without Repeating Characters

`Medium` · Probably the single most-asked medium in existence.

**Q:** Length of the longest substring with no repeated characters.

```
"abcabcbb" → 3   ("abc")
"bbbbb"    → 1   ("b")
"pwwkew"   → 3   ("wke")
```

**Strategy:** Keep a window that never contains a duplicate. Extend right; if the new character is already inside the window, shrink from the left until it isn't. The set of characters in `[left, right]` is the state.

The optimised version stores each character's **last index** and jumps `left` straight past the previous occurrence — one move instead of several. Guard with `Math.max` so a *stale* index (from before the current window) can't drag `left` backwards.

```js
// Version A — set + shrink loop. Clearer; write this one first.
function lengthOfLongestSubstring(s) {
  const inWindow = new Set();
  let left = 0, best = 0;

  for (let right = 0; right < s.length; right++) {
    while (inWindow.has(s[right])) {     // shrink until the duplicate is gone
      inWindow.delete(s[left]);
      left++;
    }
    inWindow.add(s[right]);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

// Version B — last-index map, left jumps directly. O(n) with no inner loop.
function lengthOfLongestSubstringJump(s) {
  const lastSeen = new Map();            // char -> last index seen
  let left = 0, best = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (lastSeen.has(c)) {
      left = Math.max(left, lastSeen.get(c) + 1); // max() ignores stale positions
    }
    lastSeen.set(c, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

**Trace of B on `"pwwkew"`:**

| right | c | lastSeen[c] | left | window | best |
|---|---|---|---|---|---|
| 0 | p | – | 0 | `p` | 1 |
| 1 | w | – | 0 | `pw` | 2 |
| 2 | w | 1 | 2 | `w` | 2 |
| 3 | k | – | 2 | `wk` | 2 |
| 4 | e | – | 2 | `wke` | **3** |
| 5 | w | 2 | 3 | `kew` | 3 |

**Complexity:** O(n) time, O(min(n, alphabet)) space.
**Pitfall:** omitting `Math.max` in version B — `"abba"` then gives 3 instead of 2. Trace that input if you use B.

---

## P23: Longest Repeating Character Replacement

`Medium` · The window whose validity depends on a *derived* quantity.

**Q:** You may replace at most `k` characters with any letter. Find the longest substring of a single repeated character achievable.

```
s = "ABAB", k = 2 → 4
s = "AABABBA", k = 1 → 4    ("AABA" → "AAAA")
```

**Strategy:** Keep the best strategy in mind: inside any window, you'd convert everything into the character that already appears most often. So

> **replacements needed = windowLength − maxFrequencyInWindow**

The window is valid while that's `≤ k`. Grow right, and when it exceeds `k`, shrink from the left.

The neat subtlety: you can let `maxFreq` be a **historical high-water mark** and never decrease it. A stale (too large) `maxFreq` only makes the validity check *too permissive*, which can never *grow* the recorded answer beyond a genuinely achievable length — `best` only increases when a real, longer valid window is found. Keeping it monotone avoids rescanning the frequency table. (If this feels hand-wavy under pressure, recompute `Math.max(...count.values())` — it's O(26) and still fine.)

```js
function characterReplacement(s, k) {
  const count = new Map();
  let left = 0, maxFreq = 0, best = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    count.set(c, (count.get(c) ?? 0) + 1);
    maxFreq = Math.max(maxFreq, count.get(c));      // high-water mark

    // window invalid: more than k characters would need replacing
    while ((right - left + 1) - maxFreq > k) {
      count.set(s[left], count.get(s[left]) - 1);
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

**Complexity:** O(n) time, O(26) space.
**Pitfall:** thinking you must decrement `maxFreq` when shrinking. Be ready to justify why you don't — that's the interview question hidden inside the problem.

---

## P24: Permutation in String

`Medium` · Fixed-size window — the cheapest window variant.

**Q:** Does `s2` contain a permutation of `s1` as a substring?

```
s1 = "ab", s2 = "eidbaooo" → true   ("ba")
s1 = "ab", s2 = "eidboaoo" → false
```

**Strategy:** A permutation has the *same length and same character counts*. So this is a fixed window of size `s1.length` sliding across `s2`, comparing count vectors. Naively comparing 26 slots per position is O(26n) — fine. Better: maintain a `matches` counter of how many of the 26 slots currently agree, updating only the two slots that changed per step → O(n).

```js
function checkInclusion(s1, s2) {
  if (s1.length > s2.length) return false;

  const need = new Array(26).fill(0);
  const have = new Array(26).fill(0);
  const at = c => c.charCodeAt(0) - 97;

  for (const c of s1) need[at(c)]++;
  for (let i = 0; i < s1.length; i++) have[at(s2[i])]++;   // first window

  let matches = 0;
  for (let i = 0; i < 26; i++) if (need[i] === have[i]) matches++;

  for (let right = s1.length; right < s2.length; right++) {
    if (matches === 26) return true;

    // add s2[right]
    const inIdx = at(s2[right]);
    have[inIdx]++;
    if (have[inIdx] === need[inIdx]) matches++;
    else if (have[inIdx] === need[inIdx] + 1) matches--;    // just broke a match

    // remove s2[right - s1.length]
    const outIdx = at(s2[right - s1.length]);
    have[outIdx]--;
    if (have[outIdx] === need[outIdx]) matches++;
    else if (have[outIdx] === need[outIdx] - 1) matches--;
  }
  return matches === 26;
}
```

**Complexity:** O(n) time, O(1) space.
**Pitfall:** the final `return matches === 26` — the loop checks *before* sliding, so the last window needs checking after the loop. Off-by-one here is the standard failure.
**Sibling problem:** *Find All Anagrams in a String* — identical code, but push `left` into a results array instead of returning early.

---

## P25: Minimum Window Substring

`Hard` · The hardest window problem that still gets asked routinely. Master the "formed/required" bookkeeping.

**Q:** Smallest substring of `s` containing **all** characters of `t`, including multiplicities. `""` if none.

```
s = "ADOBECODEBANC", t = "ABC" → "BANC"
```

**Strategy — shortest-window variant:** grow right until the window is *valid* (contains all of `t`), then shrink from the left as far as possible while staying valid, recording the best length at each valid moment.

The bookkeeping that makes validity O(1):
- `need` = required count per character; `required` = number of **distinct** characters in `t`.
- `formed` = how many distinct characters currently have `windowCount ≥ needCount`.
- Valid ⟺ `formed === required`. Update `formed` only on the exact transitions (`window[c] === need[c]` on add, `window[c] < need[c]` on remove).

```js
function minWindow(s, t) {
  if (t.length === 0 || s.length < t.length) return '';

  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);

  const window = new Map();
  const required = need.size;
  let formed = 0, left = 0;
  let bestLen = Infinity, bestStart = 0;

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) ?? 0) + 1);
    if (need.has(c) && window.get(c) === need.get(c)) formed++;   // exactly satisfied

    // valid → try to shrink
    while (formed === required) {
      if (right - left + 1 < bestLen) {
        bestLen = right - left + 1;
        bestStart = left;
      }
      const lc = s[left];
      window.set(lc, window.get(lc) - 1);
      if (need.has(lc) && window.get(lc) < need.get(lc)) formed--; // broke validity
      left++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestStart, bestStart + bestLen);
}
```

**Trace sketch** (`s="ADOBECODEBANC"`, `t="ABC"`): first valid window at `right=5` → `"ADOBEC"` (len 6). Shrinking drops `A` → invalid, so right advances. Next valid `"CODEBA"` (len 6) → wait, `A..C` window `"ODEBANC"`… the recorded minima go 6 → 6 → **4** at `"BANC"`. Return `"BANC"`.

**Complexity:** O(|s| + |t|) time, O(|t|) space. Each index enters and leaves the window once.
**Pitfalls:** using `>=` instead of `===` when updating `formed` (double counting); recording the answer *outside* the shrink loop (you'd miss the true minimum); returning the window contents by slicing with a stale `left` — store `bestStart` explicitly.

---

## P26: Sliding Window Maximum

`Hard` · Monotonic **deque** — the window pattern crossed with the monotonic-stack pattern.

**Q:** For every window of size `k`, output the maximum.

```
nums = [1,3,-1,-3,5,3,6,7], k = 3 → [3,3,5,5,6,7]
```

**Strategy:** Recomputing the max per window is O(nk). Instead keep a deque of **indices** whose values are in decreasing order. Two rules:
1. Before pushing `i`, pop from the back every index whose value is `≤ nums[i]` — a smaller element with a *smaller* index can never be the max again while `i` is in the window, so it's permanently useless.
2. Pop from the front any index that has slid out of the window (`front ≤ i - k`).

The front is then always the current window's maximum. Each index is pushed and popped once → O(n).

```js
function maxSlidingWindow(nums, k) {
  const deque = [];        // indices, values decreasing front → back
  const result = [];

  for (let i = 0; i < nums.length; i++) {
    // 1. drop smaller-and-older values: they can never win again
    while (deque.length && nums[deque[deque.length - 1]] <= nums[i]) deque.pop();
    deque.push(i);

    // 2. drop indices that fell out of the window
    if (deque[0] <= i - k) deque.shift();

    // 3. once the first full window exists, the front is its max
    if (i >= k - 1) result.push(nums[deque[0]]);
  }
  return result;
}
```

**Complexity:** O(n) time, O(k) space. (`shift()` is O(n) in JS in general, but it runs at most once per index here and on a tiny array; for strict performance use a head index or a real deque.)
**Pitfall:** storing values instead of indices — then you can't tell when something leaves the window.

---

## P27: Minimum Size Subarray Sum

`Medium` · The clean "shortest window" drill.

**Q:** Given **positive** integers, find the shortest contiguous subarray with sum `≥ target`. Return 0 if none.

```
target = 7, nums = [2,3,1,2,4,3] → 2    ([4,3])
```

**Strategy:** All values positive ⇒ growing the window only increases the sum (monotonic ⇒ window is legal). Grow right until `sum ≥ target`, then shrink from the left while still `≥ target`, recording lengths. Record **inside** the shrink loop — that's the shortest-variant signature.

```js
function minSubArrayLen(target, nums) {
  let left = 0, sum = 0, best = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];

    while (sum >= target) {              // valid → record, then try shorter
      best = Math.min(best, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}
```

**Complexity:** O(n) / O(1).
**Pitfall:** with negative numbers allowed, this breaks — you'd need prefix sums plus a monotonic deque. Say so; it shows you know *why* the window works.

---
---

# Pattern 5 — Strings & Ad-hoc

Assessment platforms love string problems: no fancy data structures needed, easy to auto-grade, and they reveal whether you can handle indices and edge cases carefully. There's no single algorithm here — the skill is **decomposition**: state the transformation precisely, then implement it without index bugs.

**Universal string checklist:** empty string · length 1 · all identical characters · case sensitivity · leading/trailing spaces · multiple consecutive spaces · non-ASCII · numeric overflow when parsing.

---

## P28: Longest Palindromic Substring

`Medium` · Expand-around-center is the version to know cold.

**Q:** Return the longest palindromic substring of `s`.

```
"babad" → "bab"  (or "aba")
"cbbd"  → "bb"
```

**Strategy:** Checking every substring is O(n³). Key insight: every palindrome has a **center** and is symmetric around it, so instead of testing substrings, *generate* palindromes by expanding from each possible center. There are `2n − 1` centers: `n` single characters (odd-length palindromes) and `n − 1` gaps between characters (even-length ones). Expanding from each is O(n) → O(n²) total, O(1) space.

```js
function longestPalindrome(s) {
  if (s.length < 2) return s;
  let bestStart = 0, bestLen = 1;

  // expand outward while the characters match; returns nothing, updates the best
  const expand = (left, right) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--; right++;
    }
    // loop exits one step too far → the palindrome is (left+1 … right-1)
    const len = right - left - 1;
    if (len > bestLen) { bestLen = len; bestStart = left + 1; }
  };

  for (let i = 0; i < s.length; i++) {
    expand(i, i);       // odd length, centered on i
    expand(i, i + 1);   // even length, centered between i and i+1
  }
  return s.slice(bestStart, bestStart + bestLen);
}
```

**Trace** (`"cbbd"`): centers `(0,0)`→"c"; `(0,1)` c≠b stop; `(1,1)`→"b"; **`(1,2)` b==b → expand to (0,3): c≠d stop → len 2, start 1 → "bb"**; rest shorter. → `"bb"`.

**Complexity:** O(n²) time, O(1) space. (Manacher's is O(n) — name it, don't write it.)
**Pitfall:** the `len = right - left - 1` and `start = left + 1` arithmetic, because the while loop always overshoots by one on each side. Derive it on paper once and it'll stick.

---

## P29: Palindromic Substrings (Count)

`Medium` · Same engine, different accumulator.

**Q:** Count how many palindromic substrings `s` contains (different positions count separately).

```
"abc"  → 3    ("a","b","c")
"aaa"  → 6    ("a","a","a","aa","aa","aaa")
```

**Strategy:** Every successful expansion step *is* one palindrome. So reuse expand-around-center and increment a counter on each successful match instead of tracking a maximum.

```js
function countSubstrings(s) {
  let count = 0;

  const expand = (left, right) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      count++;          // each matching expansion = one more palindrome
      left--; right++;
    }
  };

  for (let i = 0; i < s.length; i++) {
    expand(i, i);
    expand(i, i + 1);
  }
  return count;
}
```

**Complexity:** O(n²) / O(1).

---

## P30: Encode and Decode Strings

`Medium` · A design question disguised as a string problem. Very common at senior level.

**Q:** Serialise a list of strings into one string, and decode it back. Strings may contain **any** characters, including your delimiter.

**Strategy:** Any single delimiter fails, because the payload may contain it. Escaping works but is fiddly. The robust answer is **length prefixing**: write `<length>#<payload>` per string. When decoding, read digits until `#` — that tells you exactly how many characters to consume, so the payload is never parsed. This is precisely how HTTP `Content-Length`, Redis RESP, and most binary protocols do framing; say that out loud.

```js
function encode(strs) {
  let out = '';
  for (const s of strs) out += `${s.length}#${s}`;   // e.g. 5#hello3#abc
  return out;
}

function decode(str) {
  const result = [];
  let i = 0;

  while (i < str.length) {
    let j = i;
    while (str[j] !== '#') j++;              // find the length delimiter
    const len = Number(str.slice(i, j));     // digits before '#'
    result.push(str.slice(j + 1, j + 1 + len)); // exactly len chars, verbatim
    i = j + 1 + len;                         // jump past this record
  }
  return result;
}
```

**Complexity:** O(total length) both ways.
**Pitfall:** `["", ""]` must round-trip → `"0#0#"` decodes to two empty strings. Test it.
**Related:** the same length-prefix idea underpins *Serialize/Deserialize Binary Tree* in Part 2.

---

## P31: Longest Common Prefix

`Easy`

**Q:** Longest common prefix across an array of strings; `""` if none.

```
["flower","flow","flight"] → "fl"
["dog","racecar","car"]    → ""
```

**Strategy:** Vertical scan — compare column by column across all words, stopping at the first mismatch or the first word that ends. No need to sort or nest cleverly.

```js
function longestCommonPrefix(strs) {
  if (strs.length === 0) return '';

  for (let i = 0; i < strs[0].length; i++) {
    const c = strs[0][i];
    for (const word of strs) {
      if (i === word.length || word[i] !== c) {
        return strs[0].slice(0, i);     // mismatch or word ran out
      }
    }
  }
  return strs[0];                        // the first word IS the prefix
}
```

**Complexity:** O(total characters) worst case, O(1) space.
**Alternative worth mentioning:** sort the array and compare only the first and last strings — O(n log n · k) but two lines. For many prefix queries, build a **Trie**.

---

## P32: Roman to Integer / Integer to Roman

`Easy` / `Medium` · Classic ad-hoc parsing pair.

**Q:** Convert `"MCMXCIV"` → `1994`, and `1994` → `"MCMXCIV"`.

**Strategy (Roman → Int):** Values normally descend. A character worth *less* than the one after it means subtraction (`IV = 4`, `CM = 900`). So scan left to right: if `value[i] < value[i+1]`, subtract, else add. No special-case table needed.

**Strategy (Int → Roman):** Greedy with an ordered value/symbol table that **includes the subtractive pairs** (900/CM, 400/CD, 90/XC, …). Repeatedly take the largest symbol that fits. Because the table is pre-expanded with those pairs, plain greedy is provably optimal.

```js
function romanToInt(s) {
  const V = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;

  for (let i = 0; i < s.length; i++) {
    const cur = V[s[i]], next = V[s[i + 1]] ?? 0;
    total += (cur < next) ? -cur : cur;   // smaller-before-larger → subtract
  }
  return total;
}

function intToRoman(num) {
  const table = [
    [1000,'M'], [900,'CM'], [500,'D'], [400,'CD'],
    [100,'C'],  [90,'XC'],  [50,'L'],  [40,'XL'],
    [10,'X'],   [9,'IX'],   [5,'V'],   [4,'IV'], [1,'I'],
  ];
  let out = '';
  for (const [value, symbol] of table) {
    while (num >= value) { out += symbol; num -= value; }  // greedy, largest first
  }
  return out;
}
```

**Complexity:** O(n) and O(1) (bounded by 3999).
**Pitfall:** in `romanToInt`, `V[s[i+1]] ?? 0` handles the final character cleanly — don't special-case the last index.

---

## P33: String Compression / Run-Length Encoding

`Medium` · Very common on HackerRank and Codility.

**Q:** Compress in place: replace each run of repeated characters with the character followed by the run length (length 1 → no number). Return the new length.

```
["a","a","b","b","c","c","c"] → 6, chars = "a2b2c3"
["a"] → 1, chars = "a"
["a","b","b","b","b","b","b","b","b","b","b","b","b"] → 4, "ab12"
```

**Strategy:** Read/write pointers. `read` finds the extent of each run; `write` emits the character, then the digits of the count when > 1. Multi-digit counts must be written digit by digit (`12` → `'1','2'`) — that's the trap. In-place is safe because the compressed output is never longer than the input up to the current read position.

```js
function compress(chars) {
  let write = 0, read = 0;

  while (read < chars.length) {
    const c = chars[read];
    let runLength = 0;

    while (read < chars.length && chars[read] === c) { read++; runLength++; }

    chars[write++] = c;
    if (runLength > 1) {
      for (const digit of String(runLength)) chars[write++] = digit; // "12" → '1','2'
    }
  }
  return write;
}
```

**Complexity:** O(n) time, O(1) space.
**Pitfall:** writing `runLength` as a number instead of separate digit characters.

---

## P34: Isomorphic Strings / Word Pattern

`Easy` · Bijection checking — the mapping must be consistent in **both** directions.

**Q:** Are `s` and `t` isomorphic — can each character of `s` be replaced consistently to get `t`, with no two characters mapping to the same target?

```
"egg","add"   → true    (e→a, g→d)
"foo","bar"   → false   (o would need →a and →r)
"badc","baba" → false   (d and c both →b: not injective)
```

**Strategy:** One map is not enough — it catches "one source → two targets" but misses "two sources → one target". Maintain **two** maps and require both to agree.

```js
function isIsomorphic(s, t) {
  if (s.length !== t.length) return false;

  const forward = new Map(), backward = new Map();

  for (let i = 0; i < s.length; i++) {
    const a = s[i], b = t[i];

    if (forward.has(a) && forward.get(a) !== b) return false;   // a already maps elsewhere
    if (backward.has(b) && backward.get(b) !== a) return false; // b already claimed

    forward.set(a, b);
    backward.set(b, a);
  }
  return true;
}
```

**Complexity:** O(n) / O(k).
**Same code solves:** *Word Pattern* — split the sentence on whitespace and map pattern characters ↔ words.

---

## P35: Valid Parenthesis String / Reverse Words in a String

`Easy`–`Medium` · Two quick ad-hoc drills that show up in timed tests.

**Q (Reverse Words):** `"  the   sky is  blue  "` → `"blue is sky the"` — single spaces, no leading/trailing.

```js
function reverseWords(s) {
  return s.trim().split(/\s+/).reverse().join(' ');
}

// O(1)-extra-space version on a char array (the follow-up they ask for):
// 1) reverse the whole array, 2) reverse each word in place, 3) compact spaces.
```

**Q (Valid Palindrome II):** may delete **at most one** character — still a palindrome?

**Strategy:** Two pointers inward; on the first mismatch you have exactly two options — drop the left character or drop the right one. Check whether either remaining span is a plain palindrome. Because you're only allowed one deletion, there is no recursion: one mismatch, two candidate substrings, done.

```js
function validPalindromeII(s) {
  const isPal = (l, r) => {
    while (l < r) { if (s[l] !== s[r]) return false; l++; r--; }
    return true;
  };

  let left = 0, right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) {
      // spend the single deletion on one side or the other
      return isPal(left + 1, right) || isPal(left, right - 1);
    }
    left++; right--;
  }
  return true;
}
```

**Complexity:** O(n) / O(1).

---

## P36: Implement `strStr` (Find the Needle)

`Easy` to state, `deep` if pushed to KMP.

**Q:** Return the index of the first occurrence of `needle` in `haystack`, or `-1`.

```
haystack = "sadbutsad", needle = "sad" → 0
haystack = "leetcode",  needle = "leeto" → -1
```

**Strategy:** Start with the honest sliding comparison: try each start position and compare `needle.length` characters → O(n·m). Say the worst case out loud (`"aaaaab"` in `"aaaaaaaaab"`), then explain KMP's improvement: precompute, for each prefix of the needle, the length of the longest proper prefix that is also a suffix (`lps`). On a mismatch, instead of restarting, jump the pattern forward by that amount — you already know those characters match, so you never re-examine a haystack character → O(n + m).

```js
// Straightforward O(n*m) — usually accepted, always correct
function strStr(haystack, needle) {
  if (needle.length === 0) return 0;

  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let j = 0;
    while (j < needle.length && haystack[i + j] === needle[j]) j++;
    if (j === needle.length) return i;
  }
  return -1;
}

// KMP — O(n + m). Know the shape; you rarely need to write it.
function strStrKMP(haystack, needle) {
  if (needle.length === 0) return 0;

  // lps[i] = length of the longest proper prefix of needle[0..i] that is also a suffix
  const lps = new Array(needle.length).fill(0);
  for (let i = 1, len = 0; i < needle.length; ) {
    if (needle[i] === needle[len]) lps[i++] = ++len;
    else if (len > 0) len = lps[len - 1];      // fall back within the pattern
    else lps[i++] = 0;
  }

  for (let i = 0, j = 0; i < haystack.length; ) {
    if (haystack[i] === needle[j]) { i++; j++; if (j === needle.length) return i - j; }
    else if (j > 0) j = lps[j - 1];            // shift the pattern, never rewind i
    else i++;
  }
  return -1;
}
```

**Complexity:** naive O(n·m) / O(1); KMP O(n+m) / O(m).
**Pitfall:** the loop bound `i + needle.length <= haystack.length` — using `i < haystack.length` wastes work and can read past the end.

---
---

# Pattern 6 — Stack & Monotonic Stack

**Core idea:** a stack remembers *"things I've seen but haven't resolved yet."* Two distinct uses:

1. **Matching / nesting** — parentheses, expression evaluation, nested decoding. The stack mirrors the nesting depth.
2. **Monotonic stack** — keep elements in sorted order; when the new element violates the order, *pop and resolve*. The signal is **"next greater / next smaller / previous greater / previous smaller"**, and it turns O(n²) pairwise comparisons into O(n) because each element is pushed and popped at most once.

**The monotonic stack template:**
```js
const stack = [];                               // holds indices
for (let i = 0; i < arr.length; i++) {
  while (stack.length && violates(arr[stack.at(-1)], arr[i])) {
    const j = stack.pop();
    resolve(j, i);                              // arr[i] is j's "next greater/smaller"
  }
  stack.push(i);
}
```
Decreasing stack (pop when `arr[i]` is **bigger**) → finds *next greater*. Increasing stack → finds *next smaller*.

---

## P37: Valid Parentheses

`Easy` · The canonical stack question.

**Q:** Given a string of `()[]{}`, is it validly nested and closed?

```
"()[]{}" → true      "(]" → false      "([)]" → false      "{[]}" → true
```

**Strategy:** Every closer must match the **most recent** unmatched opener — that's LIFO, i.e. a stack. Push openers; on a closer, pop and verify the pair. Two failure modes: mismatched pair, or a closer with nothing to pop. At the end, a non-empty stack means unclosed openers.

```js
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };  // closer -> its opener
  const stack = [];

  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);
    } else {
      if (stack.pop() !== pairs[c]) return false;  // mismatch OR empty (undefined)
    }
  }
  return stack.length === 0;                       // nothing left unclosed
}
```

**Complexity:** O(n) time, O(n) space.
**Pitfall:** forgetting the final emptiness check — `"((("` would pass. `stack.pop()` on an empty array returns `undefined`, which conveniently fails the comparison.
**Follow-up:** *Longest Valid Parentheses* — stack of indices with a `-1` sentinel, or a two-pass left/right counter.

---

## P38: Min Stack

`Medium` · Tests whether you can trade space for an O(1) guarantee.

**Q:** Design a stack supporting `push`, `pop`, `top`, and `getMin` — **all O(1)**.

**Strategy:** Scanning for the minimum on demand is O(n). Instead, store the minimum **alongside each element**: when pushing, record `min(newValue, currentMin)`. Every stack level then knows the minimum of everything at or below it, so popping automatically restores the previous minimum with no recomputation.

```js
class MinStack {
  constructor() {
    this.stack = [];      // values
    this.mins  = [];      // mins[i] = min of stack[0..i]
  }

  push(val) {
    this.stack.push(val);
    const currentMin = this.mins.length ? this.mins[this.mins.length - 1] : val;
    this.mins.push(Math.min(val, currentMin));
  }

  pop()    { this.mins.pop(); return this.stack.pop(); }
  top()    { return this.stack[this.stack.length - 1]; }
  getMin() { return this.mins[this.mins.length - 1]; }
}
```

**Complexity:** O(1) for every operation, O(n) space.
**Space optimisation to mention:** push onto `mins` only when `val <= currentMin`, and pop from it only when the popped value equals the current min. Use `<=`, not `<`, or duplicate minima break it.

---

## P39: Evaluate Reverse Polish Notation

`Medium`

**Q:** Evaluate a postfix expression given as tokens.

```
["2","1","+","3","*"] → 9       ((2+1)*3)
["4","13","5","/","+"] → 6      (4 + 13/5)
```

**Strategy:** Postfix needs no precedence rules — that's the point of it. Push numbers; on an operator, pop the two most recent operands, apply, push the result. **Order matters** for `-` and `/`: the *second* pop is the left operand.

```js
function evalRPN(tokens) {
  const stack = [];
  const ops = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => Math.trunc(a / b),   // truncate toward zero, not Math.floor
  };

  for (const token of tokens) {
    if (token in ops) {
      const b = stack.pop();            // right operand popped FIRST
      const a = stack.pop();
      stack.push(ops[token](a, b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack.pop();
}
```

**Complexity:** O(n) / O(n).
**Pitfalls:** `Math.floor(-7/2) = -4` but truncation gives `-3` — the spec wants truncation toward zero, so use `Math.trunc`. Also don't test operators with `isNaN(token)`; `"-5"` is a valid number, and `in ops` is unambiguous.

---

## P40: Daily Temperatures

`Medium` · The monotonic stack, in its purest form.

**Q:** For each day, how many days until a warmer temperature? 0 if never.

```
[73,74,75,71,69,72,76,73] → [1,1,4,2,1,1,0,0]
```

**Strategy:** Days waiting for a warmer day sit on a stack. Because any day *cooler* than a day already waiting would be resolved later anyway, the stack naturally stays **decreasing in temperature**. When today is warmer than the top, today is exactly that day's answer — pop and record the index distance. Each index is pushed and popped once → O(n).

```js
function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0);
  const stack = [];                       // indices, temps decreasing

  for (let i = 0; i < temperatures.length; i++) {
    // today resolves every colder day still waiting
    while (stack.length && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const day = stack.pop();
      answer[day] = i - day;
    }
    stack.push(i);
  }
  return answer;                          // days left on the stack keep their 0
}
```

**Trace** (`[73,74,75,71,69,72,76,73]`): push 0. `74>73` → pop 0, ans[0]=1, push 1. `75>74` → ans[1]=1, push 2. `71` → push 3. `69` → push 4. `72>69` → ans[4]=1; `72>71` → ans[3]=2; push 5. `76` → pops 5,2 → ans[5]=1, ans[2]=4; push 6. `73` → push 7. Leftovers 6,7 stay 0. ✅

**Complexity:** O(n) time, O(n) space.
**Same template:** *Next Greater Element I/II* (circular → loop twice over `i % n`), *Stock Span*, *Online Stock Span*.

---

## P41: Car Fleet

`Medium` · A sorting-plus-stack problem where the physical intuition is the whole solution.

**Q:** Cars at `position[i]` with `speed[i]` drive toward `target`. A faster car catching a slower one joins its fleet and inherits its speed. How many fleets arrive?

```
target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3] → 3
```

**Strategy:** Sort cars by position **descending** (closest to the target first) and compute each car's solo arrival time `(target − position) / speed`. Process front to back: if a car's solo time is **≤** the time of the fleet ahead of it, it catches up and merges (its arrival becomes the slower one's — so the *ahead* time still governs). If its time is **greater**, it can never catch up and starts a new fleet. Only the current fleet's arrival time needs remembering — a single variable, no actual stack required.

```js
function carFleet(target, position, speed) {
  const cars = position
    .map((p, i) => [p, speed[i]])
    .sort((a, b) => b[0] - a[0]);      // closest to target first

  let fleets = 0, slowestTimeAhead = 0;

  for (const [p, s] of cars) {
    const time = (target - p) / s;
    if (time > slowestTimeAhead) {     // can't catch the fleet ahead → new fleet
      fleets++;
      slowestTimeAhead = time;
    }
  }
  return fleets;
}
```

**Complexity:** O(n log n) time (the sort dominates), O(n) space.
**Pitfall:** sorting ascending, or using `>=` instead of `>` (equal times mean they arrive together — one fleet).

---

## P42: Largest Rectangle in Histogram

`Hard` · The hardest monotonic-stack problem, and the parent of "Maximal Rectangle".

**Q:** Bars of width 1 with the given heights — largest rectangle area contained in the histogram.

```
[2,1,5,6,2,3] → 10      (heights 5 and 6, width 2)
```

**Strategy:** A rectangle is defined by a bar's height and how far it can extend left and right before hitting something **shorter**. So for each bar you need its *previous smaller* and *next smaller* — the monotonic stack's specialty.

Keep indices on an **increasing-height** stack. When the incoming bar is shorter than the top, the top's rightward extension is blocked *right here*: pop it, and its left boundary is the element now below it on the stack (plus one). Width = `i − (newTop + 1)`. Appending a virtual `0` bar at the end flushes everything left on the stack.

```js
function largestRectangleArea(heights) {
  const stack = [];          // indices with increasing heights
  let best = 0;

  for (let i = 0; i <= heights.length; i++) {
    const h = (i === heights.length) ? 0 : heights[i];   // sentinel flushes the stack

    while (stack.length && heights[stack[stack.length - 1]] >= h) {
      const top = stack.pop();
      // left boundary: just right of whatever remains below (or 0 if empty)
      const left = stack.length ? stack[stack.length - 1] + 1 : 0;
      best = Math.max(best, heights[top] * (i - left));
    }
    stack.push(i);
  }
  return best;
}
```

**Trace** (`[2,1,5,6,2,3]`): push 0. `h=1 < 2` → pop 0: area 2×(1−0)=2. push 1. push 2 (5). push 3 (6). `h=2` → pop 3: 6×(4−3)=6; pop 2: 5×(4−2)=**10**. push 4. push 5. sentinel `0` → pop 5: 3×(6−5)=3; pop 4: 2×(6−2)=8; pop 1: 1×6=6. Best **10**. ✅

**Complexity:** O(n) time, O(n) space.
**Pitfall:** the `left` computation. After popping, the new stack top is the nearest *shorter* bar to the left, so the rectangle starts at `top + 1`, not at `top`.

---

## P43: Decode String

`Medium` · Nested structure → save state on a stack.

**Q:** Decode `k[encoded]` patterns, arbitrarily nested.

```
"3[a]2[bc]"    → "aaabcbc"
"3[a2[c]]"     → "accaccacc"
"2[abc]3[cd]ef" → "abcabccdcdcdef"
```

**Strategy:** On `[` you must *suspend* what you're building and start a fresh inner string; on `]` you finish the inner one, repeat it, and append it to the suspended outer one. That "suspend and resume" is exactly a stack — one for the pending prefixes, one for the repeat counts.

Multi-digit numbers accumulate with `num = num * 10 + digit`.

```js
function decodeString(s) {
  const countStack = [];      // pending repeat counts
  const stringStack = [];     // pending prefixes
  let current = '', num = 0;

  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      num = num * 10 + Number(ch);            // handles "12[ab]"
    } else if (ch === '[') {
      countStack.push(num);                   // suspend
      stringStack.push(current);
      num = 0; current = '';
    } else if (ch === ']') {
      const repeat = countStack.pop();        // resume
      current = stringStack.pop() + current.repeat(repeat);
    } else {
      current += ch;
    }
  }
  return current;
}
```

**Trace** (`"3[a2[c]]"`): `3` → num=3. `[` → push 3, push `""`; reset. `a` → current="a". `2` → num=2. `[` → push 2, push `"a"`; reset. `c` → current="c". `]` → `"a" + "c".repeat(2)` = `"acc"`. `]` → `"" + "acc".repeat(3)` = `"accaccacc"`. ✅

**Complexity:** O(output length) time and space.
**Pitfall:** `num = num * 10 + digit` — a naive `Number(ch)` breaks on counts ≥ 10.

---
---

# Pattern 7 — Binary Search

**Core idea:** if you can, in O(1), decide *"is the answer at or to the right of here?"*, you can halve the search space each step → O(log n). This applies to sorted arrays and, more powerfully, to **monotonic predicates over an answer range** — "binary search on the answer."

### The one template to use (`lo < hi`, no `mid ± 1` off-by-ones)

```js
let lo = 0, hi = n;                 // hi is EXCLUSIVE — the "not found" slot
while (lo < hi) {
  const mid = lo + ((hi - lo) >> 1);
  if (predicate(mid)) hi = mid;     // mid might be the answer → keep it
  else lo = mid + 1;                // mid is definitely not → discard it
}
return lo;                          // first index where predicate is true
```

Invariant: **`predicate` is false for everything left of `lo` and true for everything at or right of `hi`.** The loop shrinks the unknown region until `lo === hi`, and that's the boundary. Every binary search below is this shape with a different `predicate`.

**Requirements to state out loud:** the predicate must be **monotonic** — false…false, true…true. If it flips more than once, binary search is invalid.

---

## P44: Binary Search — the only template you need

`Easy`

**Q:** Return the index of `target` in a sorted array, else `-1`.

```js
// Classic form
function binarySearch(nums, target) {
  let lo = 0, hi = nums.length - 1;

  while (lo <= hi) {                       // inclusive both ends
    const mid = lo + ((hi - lo) >> 1);     // avoids overflow in other languages
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;  // answer is strictly right
    else hi = mid - 1;                     // answer is strictly left
  }
  return -1;
}

// Boundary form — "first index with nums[i] >= target" (lower_bound).
// Use this for insert positions, first/last occurrence, and answer-space searches.
function lowerBound(nums, target) {
  let lo = 0, hi = nums.length;            // hi exclusive
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] >= target) hi = mid;
    else lo = mid + 1;
  }
  return lo;                                // == nums.length if all are smaller
}
```

**Complexity:** O(log n) / O(1).
**Pitfalls:** the two forms have *different* loop conditions and updates (`<=` with `mid±1` vs `<` with `hi = mid`). Mixing them causes infinite loops. Pick one, memorise it exactly.

---

## P45: Find First and Last Position of Element in Sorted Array

`Medium` · Boundary search, twice.

**Q:** Return `[firstIndex, lastIndex]` of `target`, or `[-1,-1]`.

```
nums = [5,7,7,8,8,10], target = 8 → [3,4]
```

**Strategy:** Two boundary searches. `first = lowerBound(target)`; `last = lowerBound(target + 1) - 1`. The second trick — searching for the first element *greater* than the target and stepping back one — avoids writing a second, subtly different search.

```js
function searchRange(nums, target) {
  const lowerBound = t => {
    let lo = 0, hi = nums.length;
    while (lo < hi) {
      const mid = lo + ((hi - lo) >> 1);
      if (nums[mid] >= t) hi = mid; else lo = mid + 1;
    }
    return lo;
  };

  const first = lowerBound(target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, lowerBound(target + 1) - 1];
}
```

**Complexity:** O(log n) / O(1).
**Pitfall:** you must validate `nums[first] === target` — `lowerBound` returns an insertion point even when the target is absent.

---

## P46: Search in Rotated Sorted Array

`Medium` · Extremely common. The trick is figuring out which half is intact.

**Q:** A sorted array was rotated at an unknown pivot. Find `target` in O(log n).

```
[4,5,6,7,0,1,2], target = 0 → 4
[4,5,6,7,0,1,2], target = 3 → -1
```

**Strategy:** After any rotation, splitting at `mid` always leaves **at least one half properly sorted**. Identify it (`nums[lo] <= nums[mid]` ⟹ the left half is sorted), then ask whether the target lies inside that sorted half's value range:
- yes → search there;
- no → search the other half.

Either way you discard half the array, so it stays O(log n).

```js
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;

    if (nums[lo] <= nums[mid]) {                 // LEFT half is sorted
      if (target >= nums[lo] && target < nums[mid]) hi = mid - 1;  // inside it
      else lo = mid + 1;
    } else {                                     // RIGHT half is sorted
      if (target > nums[mid] && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
```

**Complexity:** O(log n) / O(1).
**Pitfalls:** `<=` in `nums[lo] <= nums[mid]` matters for 2-element ranges. Get the inclusive/exclusive bounds right in the range checks: `target >= nums[lo]` but `target < nums[mid]` (mid was already tested).
**Follow-up:** with **duplicates** allowed (Search in Rotated Sorted Array II), when `nums[lo] === nums[mid] === nums[hi]` you cannot tell which side is sorted — shrink both ends by one, degrading to O(n) worst case. Mention that; it's the expected answer.

---

## P47: Find Minimum in Rotated Sorted Array

`Medium`

**Q:** Find the smallest element of a rotated sorted array in O(log n).

```
[3,4,5,1,2] → 1        [11,13,15,17] → 11
```

**Strategy:** Compare `nums[mid]` with `nums[hi]`. If `nums[mid] > nums[hi]`, the rotation point (and hence the minimum) is strictly to the **right** of mid → `lo = mid + 1`. Otherwise mid could itself be the minimum → `hi = mid`. Comparing against `hi` rather than `lo` is what makes the non-rotated case fall out correctly.

```js
function findMin(nums) {
  let lo = 0, hi = nums.length - 1;

  while (lo < hi) {                         // stop when the range is one element
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] > nums[hi]) lo = mid + 1; // minimum is to the right
    else hi = mid;                          // mid may BE the minimum
  }
  return nums[lo];
}
```

**Complexity:** O(log n) / O(1).
**Pitfall:** comparing with `nums[lo]` instead of `nums[hi]` needs an extra "already sorted" special case. Use `hi`.

---

## P48: Koko Eating Bananas (binary search on the answer)

`Medium` · Learn this shape — it converts many "minimum X such that Y fits" problems into O(n log range).

**Q:** `piles[i]` bananas per pile, `h` hours. Each hour Koko eats up to `k` bananas from one pile (a partial pile still costs the full hour). Find the smallest `k` that finishes within `h` hours.

```
piles = [3,6,7,11], h = 8 → 4
piles = [30,11,23,4,20], h = 5 → 30
```

**Signal:** "**minimum** speed / capacity / size **such that** it fits in the limit" — and crucially, the feasibility is **monotonic**: if speed `k` works, every larger speed also works.

**Strategy:** You're not searching the array — you're searching the *answer range* `[1, max(piles)]`. Write a feasibility check `hours(k) = Σ ceil(pile / k)` and binary search for the first `k` where `hours(k) <= h`. That's the same boundary template with a computed predicate.

```js
function minEatingSpeed(piles, h) {
  const hoursNeeded = k => {
    let hours = 0;
    for (const p of piles) hours += Math.ceil(p / k);   // partial pile = full hour
    return hours;
  };

  let lo = 1, hi = Math.max(...piles);      // slowest useful … fastest useful speed
  while (lo < hi) {
    const k = lo + ((hi - lo) >> 1);
    if (hoursNeeded(k) <= h) hi = k;        // feasible → try slower
    else lo = k + 1;                        // too slow
  }
  return lo;                                 // first feasible speed
}
```

**Complexity:** O(n log(max pile)) time, O(1) space.
**Pitfalls:** `lo` must start at 1, not 0 (division by zero). `Math.max(...piles)` blows the stack for very large arrays — use a reduce loop then.
**Same template solves:** *Capacity to Ship Packages in D Days*, *Split Array Largest Sum*, *Minimum Number of Days to Make m Bouquets*, *Divide Chocolate*, *Minimum Speed to Arrive on Time*. Recognising this family is worth several problems at once.

---

## P49: Search a 2D Matrix

`Medium`

**Q:** Each row is sorted, and the first element of each row exceeds the last of the previous row. Find `target` in O(log(m·n)).

**Strategy:** The stated ordering means the matrix, read row by row, is **one sorted array of length m·n**. So run a single binary search over the virtual index `i` and translate: `row = Math.floor(i / cols)`, `col = i % cols`.

```js
function searchMatrix(matrix, target) {
  const rows = matrix.length, cols = matrix[0].length;
  let lo = 0, hi = rows * cols - 1;

  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    const value = matrix[Math.floor(mid / cols)][mid % cols];   // 1-D → 2-D

    if (value === target) return true;
    if (value < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}
```

**Complexity:** O(log(m·n)) / O(1).
**Different problem, don't confuse:** *Search a 2D Matrix II* (rows and columns sorted, but rows don't chain) → start at the **top-right** corner and walk: too big → move left, too small → move down. O(m + n).

---

## P50: Median of Two Sorted Arrays

`Hard` · Asked at the top end. Know the partition idea even if you fumble the indices.

**Q:** Median of two sorted arrays in O(log(m+n)).

```
[1,3], [2]    → 2.0
[1,2], [3,4]  → 2.5
```

**Strategy:** The median splits the combined elements into a left half and a right half of (nearly) equal size, where **every element on the left ≤ every element on the right**. Choose how many elements to take from the shorter array (`i`); the count from the other array is then forced (`j = half − i`). Binary search on `i` for the split where

> `aLeft ≤ bRight` **and** `bLeft ≤ aRight`

Use `±Infinity` sentinels when a side is empty so the boundary cases need no special code. Search the **shorter** array to keep the range small and `j` in bounds.

```js
function findMedianSortedArrays(a, b) {
  if (a.length > b.length) return findMedianSortedArrays(b, a);  // search the shorter

  const m = a.length, n = b.length;
  const half = (m + n + 1) >> 1;              // size of the left partition
  let lo = 0, hi = m;

  while (lo <= hi) {
    const i = lo + ((hi - lo) >> 1);          // take i from a
    const j = half - i;                       // forced: take j from b

    const aLeft  = i > 0 ? a[i - 1] : -Infinity;
    const aRight = i < m ? a[i]     :  Infinity;
    const bLeft  = j > 0 ? b[j - 1] : -Infinity;
    const bRight = j < n ? b[j]     :  Infinity;

    if (aLeft <= bRight && bLeft <= aRight) {          // correct partition
      if ((m + n) % 2 === 1) return Math.max(aLeft, bLeft);        // odd → left max
      return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2;
    }
    if (aLeft > bRight) hi = i - 1;           // took too many from a
    else lo = i + 1;                           // took too few
  }
  return 0;                                    // unreachable for valid input
}
```

**Complexity:** O(log min(m, n)) time, O(1) space.
**Pitfall:** `half = (m + n + 1) >> 1` puts the extra element on the left, which is why the odd case is `max(aLeft, bLeft)`. Change one and you must change the other.

---
---

# Pattern 8 — Linked Lists

**Core idea:** you can only move forward, one node at a time, so everything is about **pointer discipline**. Three tools cover almost every question:

1. **Dummy head** — `const dummy = {next: head}` removes all "what if it's the first node" special cases. Return `dummy.next`.
2. **Fast & slow pointers** — cycle detection, finding the middle, finding the k-th from the end.
3. **Iterative reversal** — the `prev / curr / next` three-step dance.

**Always ask:** can the list be empty? Can it have one node? Am I allowed to mutate it? Do I need to return the new head?

```js
// Node shape used throughout
class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}
```

---

## P51: Reverse a Linked List

`Easy` · The building block for half of all list problems. You should be able to write it in 20 seconds.

**Q:** Reverse a singly linked list and return the new head.

```
1→2→3→4→5→null  ⟶  5→4→3→2→1→null
```

**Strategy:** Walk forward re-pointing each node backwards. You need three references at all times: `prev` (the part already reversed), `curr` (the node being flipped), and a saved `next` — because the moment you set `curr.next = prev`, the rest of the list becomes unreachable unless you stashed it.

```js
function reverseList(head) {
  let prev = null, curr = head;

  while (curr) {
    const next = curr.next;   // 1. stash the rest of the list
    curr.next = prev;         // 2. flip this node's pointer
    prev = curr;              // 3. advance prev
    curr = next;              // 4. advance curr
  }
  return prev;                // curr is null; prev is the new head
}

// Recursive version — O(n) stack; mention the trade-off
function reverseListRec(head) {
  if (!head || !head.next) return head;      // empty or last node
  const newHead = reverseListRec(head.next); // reverse everything after
  head.next.next = head;                     // point the next node back at me
  head.next = null;                           // I become the new tail
  return newHead;
}
```

**Complexity:** O(n) time; O(1) space iterative, O(n) recursive.
**Pitfall:** returning `head` (now the tail) instead of `prev`.
**Follow-up:** *Reverse Nodes in k-Group*, *Reverse a Sublist [m,n]* — same dance plus a dummy head and boundary bookkeeping.

---

## P52: Merge Two Sorted Lists

`Easy` · The dummy-head pattern.

**Q:** Merge two sorted lists into one sorted list, splicing the existing nodes.

```
1→2→4  and  1→3→4  →  1→1→2→3→4→4
```

**Strategy:** Standard merge: repeatedly attach whichever head is smaller. The dummy node means you never write "if the result is empty, set head, else append" — you just always append to `tail`. When one list runs out, attach the remainder wholesale (it's already sorted).

```js
function mergeTwoLists(list1, list2) {
  const dummy = new ListNode(0);     // sentinel: no empty-result special case
  let tail = dummy;

  while (list1 && list2) {
    if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; }
    else                        { tail.next = list2; list2 = list2.next; }
    tail = tail.next;
  }
  tail.next = list1 ?? list2;        // attach whatever remains — already sorted

  return dummy.next;
}
```

**Complexity:** O(m + n) time, O(1) space.
**Pitfall:** forgetting the leftover attach truncates the result. Use `<=` to keep the merge stable.

---

## P53: Linked List Cycle + Find Where It Starts

`Easy` / `Medium` · Floyd's tortoise and hare. Memorise both halves.

**Q:** Detect a cycle. Then return the node where the cycle begins.

**Strategy (detect):** Move `slow` one step and `fast` two. With no cycle, `fast` reaches the end. With a cycle, both end up inside the loop and `fast` gains one position per step on `slow`, so it must eventually land on it — no extra memory needed.

**Strategy (find the start):** Let `L` = distance from head to the cycle entrance and `K` = distance from the entrance to the meeting point, with cycle length `C`. When they meet, `slow` has travelled `L + K` and `fast` `2(L + K)`, and the difference is a whole number of laps: `L + K = nC`. So `L = nC − K` — the distance from the head to the entrance equals the distance from the meeting point forward to the entrance (mod laps). Therefore: reset one pointer to `head`, advance **both one step at a time**, and they meet exactly at the entrance.

```js
function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;      // gained a full lap
  }
  return false;
}

function detectCycle(head) {
  let slow = head, fast = head;

  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;

    if (slow === fast) {                 // phase 2: locate the entrance
      let p = head;
      while (p !== slow) { p = p.next; slow = slow.next; }  // one step each
      return p;
    }
  }
  return null;
}
```

**Complexity:** O(n) time, O(1) space.
**Pitfall:** the loop guard must be `fast && fast.next` — otherwise `fast.next.next` throws on an odd-length list.
**Same trick solves:** *Find the Duplicate Number* (treat `nums[i]` as a "next" pointer → the duplicate is the cycle entrance), *Happy Number* (cycle in the digit-square sequence), *Middle of the Linked List* (when `fast` hits the end, `slow` is the middle).

---

## P54: Remove Nth Node From End / Reorder List

`Medium` · Two-pointer offset, then the full composition problem.

**Q (Remove Nth From End):** Delete the n-th node from the end in one pass.

**Strategy:** Advance `fast` by `n` first, then move both together. When `fast` hits the end, `slow` sits exactly `n` nodes from it. Start `slow` at a **dummy** so deleting the head needs no special case.

```js
function removeNthFromEnd(head, n) {
  const dummy = new ListNode(0, head);
  let slow = dummy, fast = dummy;

  for (let i = 0; i < n; i++) fast = fast.next;   // create the gap

  while (fast.next) { slow = slow.next; fast = fast.next; }  // slide the gap to the end

  slow.next = slow.next.next;                     // slow is just BEFORE the target
  return dummy.next;
}
```

**Q (Reorder List):** Rearrange `L0→L1→…→Ln` into `L0→Ln→L1→Ln-1→…` in place.

**Strategy — three known routines composed:** (1) find the middle with fast/slow, (2) reverse the second half, (3) weave the two halves alternately. Decomposition *is* the answer; say the three steps before writing any of them.

```js
function reorderList(head) {
  if (!head || !head.next) return;

  // 1. find the middle (slow ends at the last node of the first half)
  let slow = head, fast = head.next;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }

  // 2. reverse the second half and detach it
  let second = slow.next;
  slow.next = null;
  let prev = null;
  while (second) {
    const next = second.next;
    second.next = prev;
    prev = second;
    second = next;
  }

  // 3. weave: first, second, first, second, …
  let first = head;
  second = prev;
  while (second) {
    const n1 = first.next, n2 = second.next;
    first.next = second;
    second.next = n1;
    first = n1;
    second = n2;
  }
}
```

**Complexity:** O(n) time, O(1) space.
**Pitfall:** `fast = head.next` (not `head`) makes `slow` land on the end of the *first* half for even lengths, which keeps the weave loop simple. And you must cut `slow.next = null`, or step 3 loops forever.

---

## P55: LRU Cache

`Medium`–`Hard` · The most-asked *design* question in backend interviews. Expect it in system-design rounds too.

**Q:** Implement `get(key)` and `put(key, value)` with a fixed capacity, evicting the **least recently used** entry. Both must be **O(1)**.

**Strategy:** You need two things at once — O(1) key lookup and O(1) reordering by recency. That's a **hash map + doubly linked list**: the map gives direct node access, and the list maintains recency order with O(1) unlink/relink (which a plain array can't do — reordering there is O(n)).

In JavaScript there's a shortcut worth knowing and worth explaining: **`Map` preserves insertion order**, and `map.keys().next().value` gives the oldest key in O(1). Deleting and re-setting a key moves it to the newest position. So a `Map` *is* the hash-map-plus-list, and the whole cache is 15 lines. Show this, then show you also know the manual version.

```js
// Idiomatic JS: Map insertion order == recency order
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();                 // oldest key first, newest last
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const value = this.map.get(key);
    this.map.delete(key);                 // remove + re-insert → becomes newest
    this.map.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);   // refresh position
    this.map.set(key, value);

    if (this.map.size > this.capacity) {
      const oldestKey = this.map.keys().next().value;   // front = least recent
      this.map.delete(oldestKey);
    }
  }
}
```

```js
// Explicit hash map + doubly linked list — the language-agnostic answer
class LRUCacheDLL {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();                       // key -> node
    // sentinels remove all null checks: head.next = most recent, tail.prev = least
    this.head = { key: null, value: null, prev: null, next: null };
    this.tail = { key: null, value: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  #remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  #addFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return -1;
    this.#remove(node);
    this.#addFront(node);                       // mark as most recently used
    return node.value;
  }

  put(key, value) {
    const existing = this.map.get(key);
    if (existing) { this.#remove(existing); this.map.delete(key); }

    const node = { key, value, prev: null, next: null };
    this.#addFront(node);
    this.map.set(key, node);

    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;               // just before the tail sentinel
      this.#remove(lru);
      this.map.delete(lru.key);                 // ← why nodes must store their key
    }
  }
}
```

**Complexity:** O(1) for both operations, O(capacity) space.
**Pitfalls:** nodes must carry their `key` or you can't evict them from the map. `get` must also count as a use. Head/tail sentinels eliminate every null check — without them this problem becomes a bug farm.
**Follow-ups you'll get as a backend engineer:** thread safety / concurrency (a lock or striped locks); **LFU** (frequency buckets, each a DLL); TTL expiry (store an expiry timestamp, lazily evict on read); why Redis uses *approximated* LRU (samples a handful of keys instead of maintaining exact order — cheaper, nearly as good). See also [Redis Deep Dive](../phase-3-databases-data/02-redis-deep-dive.md).

---

## Continue

**[→ Part 2: Trees, Heaps, Greedy, Intervals, Backtracking, DP, Graphs, Bit Manipulation](03b-coding-challenges-advanced-patterns.md)**

Part 2 also contains the **4-week practice plan**, the **timed-assessment triage strategy**, and the **Top 40 must-do list**.

**Related files in this repo:**
- [Online Assessment Platform Playbook](00-platform-playbook.md) — which platform asks what, and how it's scored
- [JavaScript / TypeScript Deep Dive](../phase-1-core-programming/01-javascript-typescript-deep-dive.md) — the language semantics behind the toolkit section
- [Node.js Fundamentals](../phase-1-core-programming/02-nodejs-fundamentals.md) — event loop, streams, memory
