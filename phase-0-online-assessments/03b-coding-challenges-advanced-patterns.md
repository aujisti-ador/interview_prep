# Coding Interview — Advanced Patterns in JavaScript (Part 2)

> Trees, Heaps, Greedy, Intervals, Backtracking, Dynamic Programming, Graphs, Bit Manipulation.
> Same 6-block format as [Part 1](03-coding-challenges-dsa-javascript.md): **Question → Signal → Strategy → Code → Trace → Complexity & Pitfalls**.
> If you haven't read Part 1's [meta layer](03-coding-challenges-dsa-javascript.md#the-6-step-ritual) — the 6-step ritual, the pattern-recognition table, the JS toolkit — start there.

---

## In 60 seconds — how to use this guide

1. **This is Part 2: the patterns that decide the *hard* question** on an assessment. Part 1
   gets you a passing score; this gets you the top band.
2. **Trees are almost always recursion, and almost always the same three lines:** handle the
   null case, recurse left, recurse right. Once you see that skeleton, most tree problems
   collapse.
3. **Dynamic programming is the one people fear, and it has a fixed recipe:**
   ```
   1. What is the state?        (what do I need to know at step i?)
   2. What is the recurrence?   (how does step i depend on earlier steps?)
   3. What are the base cases?
   4. Which order do I fill it in?
   ```
   If you can write the recurrence out loud, the code is five lines.
4. **Start every DP problem with the recursive brute force, then add memoisation.** Going
   straight to a bottom-up table is how people get stuck at step zero.
5. **Graphs: BFS for shortest path in an unweighted graph, DFS for "is it connected / find all
   paths", topological sort for dependency ordering.** Grid problems are graph problems where
   the neighbours are up/down/left/right.
6. **Backtracking is DFS that undoes its move.** Choose → recurse → un-choose. That third step
   is the one people forget.

**The realistic advice:** you will not master DP in 30 days. Learn the six standard shapes
(climbing stairs, house robber, coin change, longest increasing subsequence, word break,
knapsack). Most DP questions in real assessments are one of those wearing a costume.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Recursion** | A function calling itself on a smaller input |
| **Base case** | The condition that stops recursion. Missing it = stack overflow |
| **Call stack** | The chain of in-progress function calls. Deep recursion overflows it |
| **Tree traversal** | Pre-order (node first), in-order (left, node, right), post-order (children first) |
| **BST** | Binary Search Tree — left subtree smaller, right subtree larger. In-order gives sorted output |
| **Heap** | A tree that always gives you the min or max next. Basis of priority queues |
| **Top-K** | Find the k largest/smallest. A heap of size k does it in O(n log k) |
| **Greedy** | Take the best local option. Must be proved correct, not assumed |
| **Interval problems** | Sort by start or end first. That sort *is* the trick |
| **Backtracking** | Try an option, recurse, undo it, try the next |
| **Pruning** | Abandoning a branch early when it cannot lead to a solution |
| **DP** | Dynamic Programming — solve subproblems once, reuse the answers |
| **Memoisation** | Top-down DP: recursion plus a cache |
| **Tabulation** | Bottom-up DP: fill a table iteratively |
| **State** | The variables that fully describe where you are in a DP problem |
| **Recurrence relation** | The formula expressing a state in terms of earlier states |
| **Topological sort** | Ordering nodes so every dependency comes first. Detects cycles |
| **Adjacency list** | Graph stored as node → list of neighbours. The usual representation |
| **Union-Find** | A structure for "are these two connected?" questions |
| **Bit manipulation** | Using binary operations — XOR to find a unique element, masks for subsets |

---

## Table of Contents

| # | Pattern | Problems | The one idea |
|---|---------|----------|--------------|
| 9 | [Trees & Recursion](#pattern-9--trees--recursion) | P56–P68 | Trust the recursion: solve for a node, assume children are solved |
| 10 | [Heaps & Top-K](#pattern-10--heaps--top-k) | P69–P73 | You only ever need the extreme element, not a full sort |
| 11 | [Greedy](#pattern-11--greedy) | P74–P79 | A locally best choice that provably can't hurt |
| 12 | [Intervals](#pattern-12--intervals) | P80–P84 | Sort by start or by end — the choice *is* the algorithm |
| 13 | [Backtracking](#pattern-13--backtracking) | P85–P91 | Choose → explore → **un-choose** |
| 14 | [Dynamic Programming](#pattern-14--dynamic-programming) | P92–P101 | Define the state in English before writing any code |
| 15 | [Graphs](#pattern-15--graphs) | P102–P109 | BFS for shortest, DFS for reachability, topo-sort for order |
| 16 | [Bit Manipulation, Math & Matrix](#pattern-16--bit-manipulation-math--matrix) | P110–P117 | Tricks worth memorising outright |

**Closing material**
- [The 4-Week Practice Plan](#the-4-week-practice-plan)
- [Timed Assessment Triage](#timed-assessment-triage)
- [The Top 40 Must-Do List](#the-top-40-must-do-list)
- [When You Get Stuck — the recovery script](#when-you-get-stuck--the-recovery-script)

---
---

# Pattern 9 — Trees & Recursion

**Core idea — "trust the recursion."** Don't trace the whole tree in your head. Write the function assuming it *already works* on the children, and answer exactly three questions:

1. **Base case:** what do I return for `null`? (Almost always `0`, `true`, or `null`.)
2. **What do the children give me?** One recursive call each.
3. **How do I combine their answers with this node's value?**

That's it. Every tree problem below is those three lines.

### The two orders you need

| Order | Shape | Use for |
|---|---|---|
| **Top-down (pre-order)** | do work → recurse | passing constraints *down* (valid BST bounds, path-so-far) |
| **Bottom-up (post-order)** | recurse → do work | aggregating *up* (depth, diameter, "is balanced", subtree sums) |

**Complexity for all of them:** O(n) time (every node visited once) and **O(h) space** for the recursion stack — `h = log n` if balanced, `n` if degenerate. Say the O(h) part; interviewers listen for it.

```js
// Node shape used throughout
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}
```

### Traversals — write these from memory

```js
// DFS recursive — the three orders differ only in WHERE you visit the node
const preorder  = (n, out = []) => { if (n) { out.push(n.val); preorder(n.left, out);  preorder(n.right, out); } return out; };
const inorder   = (n, out = []) => { if (n) { inorder(n.left, out);  out.push(n.val); inorder(n.right, out); } return out; };
const postorder = (n, out = []) => { if (n) { postorder(n.left, out); postorder(n.right, out); out.push(n.val); } return out; };

// Iterative in-order — the one they ask you to write without recursion.
// In a BST this emits values in SORTED order (see P63).
function inorderIterative(root) {
  const out = [], stack = [];
  let node = root;
  while (node || stack.length) {
    while (node) { stack.push(node); node = node.left; }  // dive left
    node = stack.pop();
    out.push(node.val);                                   // visit
    node = node.right;                                    // then go right
  }
  return out;
}

// BFS level-order — a queue, and NEVER shift() (O(n)); use a head index
function bfs(root) {
  if (!root) return [];
  const out = [], queue = [root];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    out.push(node.val);
    if (node.left)  queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
  return out;
}
```

---

## P56: Maximum Depth of a Binary Tree

`Easy` · The template problem — internalise this one and the rest follow.

**Q:** Return the number of nodes along the longest root-to-leaf path.

**Strategy:** Depth of a node = 1 + the deeper of its two subtrees. Base case: an empty tree has depth 0. That's literally the whole solution.

```js
function maxDepth(root) {
  if (!root) return 0;                                     // base case
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));  // combine
}

// Iterative BFS — count levels. Useful when the tree could be 10^5 deep (stack overflow).
function maxDepthBFS(root) {
  if (!root) return 0;
  let queue = [root], depth = 0;
  while (queue.length) {
    const next = [];
    for (const node of queue) {
      if (node.left)  next.push(node.left);
      if (node.right) next.push(node.right);
    }
    queue = next;
    depth++;
  }
  return depth;
}
```

**Complexity:** O(n) time, O(h) space recursive / O(width) iterative.
**Follow-up:** *Minimum Depth* is **not** symmetric — a node with one `null` child is not a leaf, so you can't just use `Math.min`. You must skip missing children. This asymmetry is a favourite trap.

---

## P57: Invert Binary Tree

`Easy` · Famous for the Homebrew tweet. Three lines.

**Q:** Mirror the tree — swap every node's children.

**Strategy:** Swap this node's children, then invert both subtrees. Order doesn't matter (swap first or recurse first), because the operations are independent.

```js
function invertTree(root) {
  if (!root) return null;

  [root.left, root.right] = [root.right, root.left];   // swap at this node
  invertTree(root.left);                                // recurse both sides
  invertTree(root.right);

  return root;
}
```

**Complexity:** O(n) / O(h).

---

## P58: Same Tree & Subtree of Another Tree

`Easy` · Structural comparison, then comparison used as a helper.

**Q1:** Are two trees identical in structure and values?
**Q2:** Does `root` contain a subtree identical to `subRoot`?

**Strategy (Same Tree):** Both null → true. One null → false. Values differ → false. Otherwise both subtrees must match.

**Strategy (Subtree):** Two nested recursions, and keeping them separate is the point: an **outer** walk tries every node as a candidate root, and an **inner** `isSameTree` tests that candidate. Trying to do both in one function is where people tangle themselves.

```js
function isSameTree(p, q) {
  if (!p && !q) return true;              // both empty → match
  if (!p || !q || p.val !== q.val) return false;  // one empty, or values differ
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}

function isSubtree(root, subRoot) {
  if (!subRoot) return true;              // empty tree is a subtree of anything
  if (!root) return false;                // ran out of tree, still have a pattern
  if (isSameTree(root, subRoot)) return true;   // this node works as the anchor
  return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}
```

**Complexity:** Same Tree O(n). Subtree O(n · m) worst case — mention that serialising both trees and running a substring search gets it to O(n + m).

---

## P59: Balanced Binary Tree

`Easy` to state, `Medium` to do in one pass.

**Q:** Is every node's left/right subtree height difference at most 1?

**Strategy:** The naive version calls `height()` inside a recursive check → O(n²) because heights get recomputed. Fix it by making one post-order pass that returns **either the height or a failure sentinel**: return `-1` the moment any subtree is unbalanced, and propagate that `-1` straight up. One pass, O(n).

```js
function isBalanced(root) {
  // returns the height, or -1 meaning "unbalanced somewhere below"
  const height = node => {
    if (!node) return 0;

    const left = height(node.left);
    if (left === -1) return -1;              // short-circuit

    const right = height(node.right);
    if (right === -1) return -1;

    if (Math.abs(left - right) > 1) return -1;   // this node is the violation
    return 1 + Math.max(left, right);
  };

  return height(root) !== -1;
}
```

**Complexity:** O(n) / O(h).
**Pitfall:** the "sentinel return value" trick is reusable — any time a check needs a computed value from below, return both by encoding failure in the value (or return a small object/tuple).

---

## P60: Diameter of a Binary Tree

`Medium` · The "answer lives at a node, but the return value is different" pattern. Learn this shape — it recurs constantly.

**Q:** Length (in edges) of the longest path between any two nodes. The path need not pass through the root.

```
      1
     / \
    2   3        → 3   (4 → 2 → 1 → 3)
   / \
  4   5
```

**Strategy:** The key realisation: at each node there are **two different quantities**.
- The best path **through** this node = `leftDepth + rightDepth` — a candidate for the global answer, but it can't be extended upward (it already turned a corner).
- The value the parent needs = `1 + max(leftDepth, rightDepth)` — a path going *down* only.

So compute depth as the return value, and update a global maximum as a side effect.

```js
function diameterOfBinaryTree(root) {
  let best = 0;

  const depth = node => {
    if (!node) return 0;

    const left = depth(node.left);
    const right = depth(node.right);

    best = Math.max(best, left + right);   // path bending at this node (in edges)
    return 1 + Math.max(left, right);       // what the parent can extend
  };

  depth(root);
  return best;
}
```

**Complexity:** O(n) / O(h).
**Same shape solves:** *Binary Tree Maximum Path Sum* ([P67](#p67-binary-tree-maximum-path-sum--path-sum)), *Longest Univalue Path*, *Count Good Nodes*. Whenever the answer can bend at a node but the return value can't, use this.

---

## P61: Level Order Traversal & Right Side View

`Medium` · BFS with explicit level boundaries.

**Q1:** Return the node values grouped by level.
**Q2:** Return the rightmost node of each level.

**Strategy:** Plain BFS loses level boundaries. Fix it by snapshotting `queue.length` at the start of each round — that count *is* the current level's size, since anything pushed afterwards belongs to the next level. Then the right-side view is just the last element of each level (or the first, for the left view).

```js
function levelOrder(root) {
  if (!root) return [];
  const result = [];
  let queue = [root];

  while (queue.length) {
    const level = [], next = [];
    for (const node of queue) {              // this whole array IS one level
      level.push(node.val);
      if (node.left)  next.push(node.left);
      if (node.right) next.push(node.right);
    }
    result.push(level);
    queue = next;
  }
  return result;
}

function rightSideView(root) {
  return levelOrder(root).map(level => level[level.length - 1]);
}
```

**Complexity:** O(n) time, O(width) space.
**Follow-ups:** *Zigzag Level Order* — reverse alternate levels. *Average of Levels*, *Largest Value in Each Row*, *Binary Tree Vertical Order* — all the same skeleton with a different accumulator.

---

## P62: Validate Binary Search Tree

`Medium` · The #1 tree mistake in interviews: checking only parent-vs-child.

**Q:** Is the tree a valid BST — every node in the left subtree strictly smaller, every node in the right strictly larger?

```
    5
   / \
  1   4      → false: 3 is in 5's RIGHT subtree but 3 < 5
     / \
    3   6
```

**Strategy:** Comparing each node only to its immediate children is wrong — the constraint is over the whole subtree, not the local pair. The fix is **top-down bound passing**: each node inherits an open interval `(low, high)`; going left tightens `high` to the node's value, going right tightens `low`. A node is valid iff it lies strictly inside its interval.

```js
function isValidBST(root) {
  const validate = (node, low, high) => {
    if (!node) return true;                                  // empty is valid
    if (node.val <= low || node.val >= high) return false;   // outside its window

    return validate(node.left,  low, node.val)      // left: capped by me
        && validate(node.right, node.val, high);    // right: floored by me
  };

  return validate(root, -Infinity, Infinity);
}

// Alternative: in-order traversal must be strictly increasing
function isValidBSTInorder(root) {
  let prev = -Infinity, ok = true;
  const walk = node => {
    if (!node || !ok) return;
    walk(node.left);
    if (node.val <= prev) ok = false;      // not strictly increasing
    prev = node.val;
    walk(node.right);
  };
  walk(root);
  return ok;
}
```

**Complexity:** O(n) / O(h).
**Pitfalls:** use strict `<=` / `>=` if duplicates are disallowed (read the spec!). `-Infinity/Infinity` sentinels avoid null-checking the bounds. In other languages this is where integer overflow bites — in JS it doesn't, and saying so shows awareness.

---

## P63: Kth Smallest Element in a BST

`Medium`

**Q:** Return the k-th smallest value (1-indexed) in a BST.

**Strategy:** In-order traversal of a BST visits values in **sorted order**. So walk in-order and stop at the k-th visit. Use the *iterative* version so you can return early without unwinding a recursion — with recursion you'd need a flag or an exception.

```js
function kthSmallest(root, k) {
  const stack = [];
  let node = root;

  while (node || stack.length) {
    while (node) { stack.push(node); node = node.left; }   // go as left as possible

    node = stack.pop();
    if (--k === 0) return node.val;                        // the k-th visit

    node = node.right;
  }
  return -1;
}
```

**Complexity:** O(h + k) time — you stop early, you don't traverse all n. O(h) space.
**Follow-up (very common):** *"What if this is called often and the tree is modified?"* → store a subtree-size in each node; then finding the k-th is O(h) by descending and comparing against left-subtree sizes, and updates keep the counts current. That's a genuinely senior answer.

---

## P64: Lowest Common Ancestor

`Medium` · Two versions; know which one the interviewer means.

**Q1 (BST):** LCA of two nodes in a **BST**.
**Q2 (general binary tree):** LCA in a plain binary tree.

**Strategy (BST):** Use the ordering. Start at the root: if both targets are smaller, the LCA is left; if both larger, it's right. The moment they **split** (or one equals the current node), that node is the LCA — it's the first point where their paths diverge. No recursion needed.

**Strategy (general tree):** No ordering to exploit, so search. Post-order: ask each subtree "did you find either target?" If the left subtree found one and the right found the other, *this* node is the split point → the LCA. If only one side reports a find, propagate it up.

```js
// BST — O(h), iterative
function lowestCommonAncestorBST(root, p, q) {
  let node = root;
  while (node) {
    if (p.val < node.val && q.val < node.val) node = node.left;       // both left
    else if (p.val > node.val && q.val > node.val) node = node.right; // both right
    else return node;                                                  // split point
  }
  return null;
}

// General binary tree — O(n)
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;   // found one, or ran out

  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  if (left && right) return root;    // targets are on opposite sides → I'm the LCA
  return left ?? right;              // otherwise pass up whichever side found something
}
```

**Complexity:** BST O(h) / O(1). General O(n) / O(h).
**Pitfall:** the general version assumes both nodes exist in the tree. If that's not guaranteed you need explicit found-flags, otherwise it returns the one node it did find. Ask about this.

---

## P65: Construct Binary Tree from Preorder and Inorder

`Medium` · Tests whether you actually understand what the traversals encode.

**Q:** Rebuild the tree from its preorder and inorder traversals (values are unique).

```
preorder = [3,9,20,15,7]      →     3
inorder  = [9,3,15,20,7]           / \
                                  9  20
                                    /  \
                                   15   7
```

**Strategy:** Two facts do all the work:
- **Preorder's first element is always the current subtree's root.**
- **In inorder, everything left of the root belongs to the left subtree; everything right belongs to the right.**

So: take the root from preorder, find it in inorder to learn the left subtree's *size*, recurse on the corresponding slices. Use a `Map` of value → inorder index so the lookup is O(1) instead of O(n), and a single moving pointer into preorder instead of slicing arrays (slicing turns this into O(n²) and hides the index arithmetic).

```js
function buildTree(preorder, inorder) {
  const indexOf = new Map();
  inorder.forEach((val, i) => indexOf.set(val, i));

  let pre = 0;   // moving pointer into preorder — never rewinds

  // build the subtree covering inorder[lo..hi]
  const build = (lo, hi) => {
    if (lo > hi) return null;

    const val = preorder[pre++];        // preorder order == construction order
    const node = new TreeNode(val);
    const mid = indexOf.get(val);       // where the root splits inorder

    node.left  = build(lo, mid - 1);    // MUST come first: preorder is root,L,R
    node.right = build(mid + 1, hi);

    return node;
  };

  return build(0, inorder.length - 1);
}
```

**Complexity:** O(n) time, O(n) space.
**Pitfalls:** building `right` before `left` silently produces a wrong tree, because the shared `pre` pointer consumes preorder in the wrong order. Also: **preorder + postorder is not enough** to reconstruct a binary tree — inorder is what disambiguates the split. That's a great thing to say unprompted.

---

## P66: Serialize and Deserialize a Binary Tree

`Hard` · A design-flavoured problem; the same framing question as [Encode/Decode Strings](03-coding-challenges-dsa-javascript.md#p30-encode-and-decode-strings).

**Q:** Turn a tree into a string and back. The tree may contain any integers, including negatives, and any shape.

**Strategy:** A traversal alone is ambiguous — you must record the **null children** to pin down the shape. Preorder with `#` for null is fully self-describing: reading it back, each token is either "make a node then recursively build its two children" or "this branch stops here." No index arithmetic, no length prefixes.

```js
function serialize(root) {
  const out = [];

  const dfs = node => {
    if (!node) { out.push('#'); return; }   // explicit null marker = the shape
    out.push(String(node.val));
    dfs(node.left);
    dfs(node.right);
  };

  dfs(root);
  return out.join(',');
}

function deserialize(data) {
  const tokens = data.split(',');
  let i = 0;

  const build = () => {
    const token = tokens[i++];
    if (token === '#') return null;

    const node = new TreeNode(Number(token));
    node.left = build();      // consumes exactly its own subtree
    node.right = build();
    return node;
  };

  return build();
}
```

**Complexity:** O(n) both ways, O(n) space.
**Pitfalls:** the delimiter must not appear in the data — commas are safe for integers, not for arbitrary strings (then length-prefix instead). A BFS format works too and is nicer for debugging. For huge trees, recursion may overflow the stack — mention the explicit-stack version.

---

## P67: Binary Tree Maximum Path Sum & Path Sum

`Hard` / `Easy` · The diameter pattern with values, plus its simpler cousin.

**Q1 (Max Path Sum):** Maximum sum along any path (any node to any node, at least one node). Values may be negative.
**Q2 (Path Sum):** Is there a root-to-leaf path summing to `target`?

**Strategy (Max Path Sum):** Exactly [P60](#p60-diameter-of-a-binary-tree)'s two-quantity structure, plus one new decision: a subtree contributing a **negative** total is worse than not using it at all, so clamp each child's contribution at 0 (`Math.max(0, …)`) — that's "prune the branch." The global best considers `node.val + left + right`; the return value can only take one side.

```js
function maxPathSum(root) {
  let best = -Infinity;

  const gain = node => {
    if (!node) return 0;

    const left  = Math.max(0, gain(node.left));   // negative branch → take nothing
    const right = Math.max(0, gain(node.right));

    best = Math.max(best, node.val + left + right);  // path bending here
    return node.val + Math.max(left, right);          // straight path for the parent
  };

  gain(root);
  return best;
}

function hasPathSum(root, target) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === target;   // leaf: exact match

  const remaining = target - root.val;    // pass the shrinking target DOWN
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}
```

**Complexity:** O(n) / O(h).
**Pitfall:** `best` must start at `-Infinity`, not 0 — an all-negative tree's answer is its least-negative node. In `hasPathSum`, the leaf test must be "no children," not "node is null," or `[1, 2, null]` with `target = 1` wrongly returns true.

---

## P68: Implement a Trie (Prefix Tree)

`Medium` · Extremely common, and directly relevant to backend work (autocomplete, routing tables, IP prefix lookup).

**Q:** Implement `insert(word)`, `search(word)` (exact) and `startsWith(prefix)`.

**Strategy:** A tree where each edge is a character, so a path from the root *spells* a prefix. Every node holds a children map and a boolean `isWord` flag — the flag is what distinguishes "`app` is a stored word" from "`app` is only a prefix of `apple`." Lookups cost O(word length), completely independent of how many words are stored. That's the whole appeal versus a hash set: a hash set can't answer prefix queries at all.

```js
class Trie {
  constructor() {
    this.root = { children: new Map(), isWord: false };
  }

  insert(word) {
    let node = this.root;
    for (const c of word) {
      if (!node.children.has(c)) {
        node.children.set(c, { children: new Map(), isWord: false });
      }
      node = node.children.get(c);
    }
    node.isWord = true;             // mark the END of a complete word
  }

  // walk the prefix; return the node it ends at, or null
  #walk(prefix) {
    let node = this.root;
    for (const c of prefix) {
      node = node.children.get(c);
      if (!node) return null;
    }
    return node;
  }

  search(word)      { const n = this.#walk(word);   return n !== null && n.isWord; }
  startsWith(prefix) { return this.#walk(prefix) !== null; }
}
```

**Complexity:** insert/search/startsWith all O(L) where L = word length. Space O(total characters inserted).
**Follow-ups:** *Design Add and Search Words* (support `.` wildcards → branch over all children at a `.`), *Word Search II* (a trie + grid DFS: prune the whole branch the moment the prefix leaves the trie — this is the reason the problem is tractable), *autocomplete* (DFS from the prefix node collecting the first k words).

---
---

# Pattern 10 — Heaps & Top-K

**Core idea:** when you only ever need the **current minimum or maximum**, a full sort is overkill. A binary heap gives O(1) peek and O(log n) push/pop.

**When to reach for it:** "K largest / smallest / closest", "median of a stream", "merge K sorted things", "always process the cheapest next" (Dijkstra, task scheduling).

**Heap vs sorting — the decision:**
| Situation | Use |
|---|---|
| Need everything ordered, one shot | `sort()` — O(n log n) |
| Need the top K, `K ≪ n` | Heap of size K — O(n log K) |
| Data arrives as a **stream** (no full array) | Heap — sorting isn't even possible |
| Need the exact k-th element only, one shot | **Quickselect** — O(n) average |

## The MinHeap you must be able to write

JavaScript has no built-in heap. Type this from memory — it unlocks Dijkstra, median-of-stream, top-K and task scheduling in one go. The comparator makes it a max-heap too: `new MinHeap((a, b) => b - a)`.

```js
class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.data = [];
    this.cmp = compare;               // cmp(a,b) < 0 means a has higher priority
  }

  size() { return this.data.length; }
  peek() { return this.data[0]; }

  push(value) {
    this.data.push(value);
    let i = this.data.length - 1;

    while (i > 0) {                             // sift UP
      const parent = (i - 1) >> 1;
      if (this.cmp(this.data[i], this.data[parent]) >= 0) break;  // in order → stop
      [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
      i = parent;
    }
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();

    if (this.data.length > 0) {
      this.data[0] = last;                      // move the last leaf to the root
      let i = 0;
      const n = this.data.length;

      while (true) {                            // sift DOWN
        const left = 2 * i + 1, right = left + 1;
        let best = i;
        if (left  < n && this.cmp(this.data[left],  this.data[best]) < 0) best = left;
        if (right < n && this.cmp(this.data[right], this.data[best]) < 0) best = right;
        if (best === i) break;
        [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
        i = best;
      }
    }
    return top;
  }
}
```

**Why the index math works:** the heap is a complete binary tree flattened into an array — node `i`'s children are `2i+1` and `2i+2`, its parent is `(i-1)>>1`. The tree stays balanced automatically, so its height is `log n`, which is why push/pop are O(log n).

---

## P69: Kth Largest Element in an Array

`Medium` · Three valid answers; presenting all three in order is the strong response.

**Q:** Return the k-th largest element (k-th in sorted-descending order, duplicates counted).

```
[3,2,1,5,6,4], k = 2 → 5
```

**Strategy:**
1. **Sort descending, index `k-1`** — O(n log n). Say it, then improve.
2. **Min-heap of size k** — push everything; whenever the heap exceeds k, pop the smallest. The heap ends holding the k largest, and its root is the answer. O(n log k), and it works on a **stream** where you can't hold all of `n`.
3. **Quickselect** — O(n) average. Partition like quicksort, but recurse into only the side containing the target index. Because you halve the work each time on average, the total is `n + n/2 + n/4 + … = 2n`.

```js
// Heap of size k — O(n log k), streamable
function findKthLargestHeap(nums, k) {
  const heap = new MinHeap();               // min at the root
  for (const n of nums) {
    heap.push(n);
    if (heap.size() > k) heap.pop();        // evict the smallest → keep the k largest
  }
  return heap.peek();                       // smallest of the k largest
}

// Quickselect — O(n) average, O(1) extra space, mutates the input
function findKthLargest(nums, k) {
  const target = nums.length - k;           // k-th largest = index target when ascending
  let lo = 0, hi = nums.length - 1;

  const partition = (lo, hi) => {
    // random pivot avoids the O(n^2) worst case on sorted input
    const r = lo + Math.floor(Math.random() * (hi - lo + 1));
    [nums[r], nums[hi]] = [nums[hi], nums[r]];

    const pivot = nums[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (nums[j] < pivot) { [nums[i], nums[j]] = [nums[j], nums[i]]; i++; }
    }
    [nums[i], nums[hi]] = [nums[hi], nums[i]];
    return i;                               // nums[i] is now in its final position
  };

  while (true) {
    const p = partition(lo, hi);
    if (p === target) return nums[p];
    if (p < target) lo = p + 1;             // recurse into ONE side only
    else hi = p - 1;
  }
}
```

**Complexity:** heap O(n log k) / O(k). Quickselect O(n) average, O(n²) worst (mitigated by the random pivot), O(1) space.
**Pitfall:** `nums.length - k` (not `k - 1`) is the ascending index of the k-th *largest*. Off-by-one here is the standard error.

---

## P70: K Closest Points to Origin

`Medium`

**Q:** Return the `k` points closest to `(0,0)`.

**Strategy:** Same top-K shape. Compare by **squared** distance — `x² + y²` — because `Math.sqrt` is monotonic and therefore changes nothing about the ordering while costing time and introducing float error. Keep a **max-heap of size k**: the root is the worst of the current best k, so a new point either evicts it or is discarded.

```js
function kClosest(points, k) {
  const dist = ([x, y]) => x * x + y * y;          // no sqrt needed

  // max-heap on distance: root = the farthest of the ones we're keeping
  const heap = new MinHeap((a, b) => dist(b) - dist(a));

  for (const p of points) {
    heap.push(p);
    if (heap.size() > k) heap.pop();               // drop the farthest
  }
  return heap.data;
}
```

**Complexity:** O(n log k) time, O(k) space. (Sorting is O(n log n); quickselect gives O(n) average.)

---

## P71: Task Scheduler

`Medium` · A greedy-with-a-formula problem. The math derivation is the interview.

**Q:** Tasks labelled A–Z, and a cooldown `n`: two identical tasks must be at least `n` intervals apart. Minimum total intervals (including idles) to run all of them?

```
tasks = ["A","A","A","B","B","B"], n = 2 → 8    (A B idle A B idle A B)
tasks = ["A","A","A","B","B","B"], n = 0 → 6
```

**Strategy:** The **most frequent** task dictates the skeleton. If it appears `maxCount` times, it creates `maxCount − 1` gaps, each needing `n + 1` slots (the task plus its cooldown), and then one final occurrence:

> `slots = (maxCount − 1) × (n + 1) + (number of tasks tied at maxCount)`

Other tasks fill the idle slots for free. But if there are *many* distinct tasks, the schedule is dense enough that no idling is ever needed — then the answer is simply `tasks.length`. Take the max of the two:

> `answer = max(tasks.length, (maxCount − 1) × (n + 1) + tiedCount)`

```js
function leastInterval(tasks, n) {
  const count = new Map();
  for (const t of tasks) count.set(t, (count.get(t) ?? 0) + 1);

  const maxCount = Math.max(...count.values());
  const tied = [...count.values()].filter(c => c === maxCount).length;

  const skeleton = (maxCount - 1) * (n + 1) + tied;
  return Math.max(tasks.length, skeleton);   // dense schedules need no idling
}
```

**Trace** (`AAABBB`, `n=2`): maxCount 3, tied 2 → `(3-1)*3 + 2 = 8`; `tasks.length = 6` → answer **8**. ✅
With `n=0`: `(3-1)*1 + 2 = 4` vs `6` → **6**. ✅

**Complexity:** O(n) time, O(26) space.
**Pitfall:** forgetting the `Math.max(tasks.length, …)` clamp. Test with many distinct tasks — that's the case it protects.
**Heap variant:** if asked to output the *actual* schedule, use a max-heap by remaining count plus a cooldown queue of `[count, readyTime]`.

---

## P72: Find Median from Data Stream

`Hard` · The two-heaps design problem. Common in senior interviews because it's a *streaming* design question.

**Q:** Support `addNum(num)` and `findMedian()` on an unbounded stream.

**Strategy:** Split the numbers into two halves and keep each half's *boundary* immediately available:
- `low` = a **max-heap** of the smaller half → its root is the largest of the small numbers.
- `high` = a **min-heap** of the larger half → its root is the smallest of the large numbers.

The median is then either `low`'s root (odd count) or the average of the two roots (even count) — O(1).

Two invariants to maintain on every insert:
1. **Order:** everything in `low` ≤ everything in `high`. Enforce it by *always* pushing into `low` first, then moving `low`'s root over to `high`. That single hop guarantees the new number lands on the correct side without any comparisons.
2. **Balance:** sizes differ by at most 1. Rebalance by moving `high`'s root back if it got bigger.

```js
class MedianFinder {
  constructor() {
    this.low  = new MinHeap((a, b) => b - a);   // MAX-heap: smaller half
    this.high = new MinHeap((a, b) => a - b);   // MIN-heap: larger half
  }

  addNum(num) {
    this.low.push(num);                  // always in via low…
    this.high.push(this.low.pop());      // …then hand its max to high → ordering holds

    if (this.high.size() > this.low.size()) {
      this.low.push(this.high.pop());    // keep low the same size or one larger
    }
  }

  findMedian() {
    if (this.low.size() > this.high.size()) return this.low.peek();      // odd count
    return (this.low.peek() + this.high.peek()) / 2;                     // even count
  }
}
```

**Trace:** add 1 → low[1], high[] → median 1. add 2 → low pushes 2, pops 2 to high → low[1], high[2] → median 1.5. add 3 → low[1,3]→pop 3 to high → high[2,3] bigger → move 2 back → low[1,2], high[3] → median **2**. ✅

**Complexity:** `addNum` O(log n), `findMedian` O(1), space O(n).
**Follow-ups:** *sliding-window median* (needs lazy deletion or a balanced BST/order-statistic tree); *bounded integer range* (use a counting array + prefix counts — O(1) amortised); *percentiles at scale* (t-digest / HdrHistogram — a great real-world tangent for a backend candidate).

---

## P73: Merge k Sorted Lists

`Hard` · Two good answers; the divide-and-conquer one needs no heap.

**Q:** Merge `k` sorted linked lists into one sorted list.

**Strategy A (heap):** Push all `k` heads into a min-heap. Pop the smallest, append it, push its `next`. The heap holds at most `k` nodes, so each of the `N` total nodes costs O(log k) → O(N log k).

**Strategy B (divide & conquer):** Merge lists pairwise, halving the count each round: `k → k/2 → k/4 → …`. That's `log k` rounds, each touching all `N` nodes → O(N log k) with **O(1)** extra space and no heap to implement. Under time pressure this is the better choice in JS.

Why *not* merge one at a time into an accumulator: the growing list gets re-traversed every round → O(N·k).

```js
// B — divide and conquer, reusing mergeTwoLists from Part 1
function mergeKLists(lists) {
  if (lists.length === 0) return null;

  while (lists.length > 1) {
    const merged = [];
    for (let i = 0; i < lists.length; i += 2) {
      merged.push(mergeTwoLists(lists[i], lists[i + 1] ?? null));  // pair them up
    }
    lists = merged;                        // half as many lists each round
  }
  return lists[0];
}

// A — min-heap of the current heads
function mergeKListsHeap(lists) {
  const heap = new MinHeap((a, b) => a.val - b.val);
  for (const node of lists) if (node) heap.push(node);

  const dummy = new ListNode(0);
  let tail = dummy;

  while (heap.size()) {
    const node = heap.pop();
    tail.next = node;
    tail = node;
    if (node.next) heap.push(node.next);   // refill from the same list
  }
  return dummy.next;
}
```

**Complexity:** both O(N log k); D&C uses O(1) extra space, heap uses O(k).
**Pitfall:** `lists[i + 1] ?? null` — an odd count leaves a lone list on the last pairing.

---
---

# Pattern 11 — Greedy

**Core idea:** make the locally optimal choice and never reconsider it. The hard part isn't the code — greedy solutions are usually 5 lines — it's **arguing that local optimality doesn't destroy global optimality**.

### How to tell greedy from DP

| Greedy works when… | You need DP when… |
|---|---|
| One irrevocable choice at each step is provably safe | The best choice depends on later choices |
| An **exchange argument** holds: swapping in the greedy choice never makes a solution worse | Choices interact; you must compare combinations |
| Sorting reveals the right order to process in | The state space genuinely branches |

**Two sentences to have ready:**
- *"Exchange argument: take any optimal solution; if it doesn't make my choice, I can swap mine in without making it worse — so an optimal solution containing my choice exists."*
- *"Coin Change with arbitrary denominations is the classic counterexample: greedy on `[1,3,4]` for 6 gives 4+1+1 = 3 coins, but 3+3 = 2 is better. That's why it needs DP."*

---

## P74: Jump Game

`Medium`

**Q:** `nums[i]` is the maximum jump length from index `i`. Starting at index 0, can you reach the last index?

```
[2,3,1,1,4] → true
[3,2,1,0,4] → false
```

**Strategy:** Forget *how* you get anywhere — track only the **farthest index reachable so far**. Sweep left to right: if the current index is beyond that frontier, it's unreachable and everything after it is too → `false`. Otherwise extend the frontier with `i + nums[i]`. This works because reachability is contiguous: if you can reach index `i`, you can reach every index before it.

```js
function canJump(nums) {
  let farthest = 0;

  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;              // this index is unreachable
    farthest = Math.max(farthest, i + nums[i]);  // extend the frontier
    if (farthest >= nums.length - 1) return true; // early exit
  }
  return true;
}
```

**Complexity:** O(n) / O(1).
**Alternative framing worth mentioning:** walk backwards keeping the leftmost index that can reach the end — same O(n), also greedy.

---

## P75: Jump Game II

`Medium` · Greedy BFS-by-levels. A genuinely elegant one.

**Q:** Same setup, but return the **minimum number of jumps** to reach the last index (reachability guaranteed).

```
[2,3,1,1,4] → 2     (0→1, then 1→4)
```

**Strategy:** Think of it as BFS over "levels," where level `j` is the set of indices reachable in exactly `j` jumps. While scanning, `currentEnd` is the last index of the current level and `farthest` is the frontier the current level can reach. When `i` hits `currentEnd`, you've exhausted this level → increment the jump count and let the next level extend to `farthest`. That's BFS without ever building a queue.

```js
function jump(nums) {
  let jumps = 0, currentEnd = 0, farthest = 0;

  // stop before the last index: arriving there needs no further jump
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);

    if (i === currentEnd) {        // finished this level
      jumps++;
      currentEnd = farthest;       // the next level reaches this far
    }
  }
  return jumps;
}
```

**Trace** (`[2,3,1,1,4]`): i=0: farthest 2; i===end(0) → jumps 1, end 2. i=1: farthest max(2, 4)=4. i=2: farthest 4; i===end(2) → jumps **2**, end 4. i=3 is the last index → loop ends. → 2 ✅

**Complexity:** O(n) / O(1).
**Pitfall:** the loop bound `nums.length - 1`. Including the last index over-counts by one jump.

---

## P76: Gas Station

`Medium` · Two greedy insights stacked.

**Q:** A circular route of stations; `gas[i]` available, `cost[i]` to reach the next. Starting with an empty tank, find the unique starting index that lets you complete the circuit, or `-1`.

```
gas = [1,2,3,4,5], cost = [3,4,5,1,2] → 3
```

**Strategy — two claims:**
1. **Feasibility:** if `Σgas < Σcost`, no start works. If `Σgas ≥ Σcost`, a valid start *must* exist.
2. **Which start:** sweep once with a running tank. If the tank goes negative at index `i`, then **no station from the current start through `i`** can be the answer — every one of them would arrive at `i` with a tank no larger than what you just had. So discard them all at once and restart at `i + 1`.

Together: one pass, O(1) space.

```js
function canCompleteCircuit(gas, cost) {
  let total = 0, tank = 0, start = 0;

  for (let i = 0; i < gas.length; i++) {
    const net = gas[i] - cost[i];
    total += net;   // for the feasibility test
    tank  += net;   // for the current candidate run

    if (tank < 0) {  // candidate failed → every start up to i fails too
      start = i + 1;
      tank = 0;
    }
  }
  return total < 0 ? -1 : start;
}
```

**Complexity:** O(n) / O(1).
**Pitfall:** you must check `total` separately — a `start` value is always produced by the loop, even when the circuit is impossible.

---

## P77: Partition Labels

`Medium` · Greedy with a precomputed lookahead.

**Q:** Partition the string into as many pieces as possible so that each letter appears in only one piece. Return the piece sizes.

```
"ababcbacadefegdehijhklij" → [9,7,8]
```

**Strategy:** A piece can only close once it contains the **last occurrence** of every letter inside it. So precompute `lastIndex[c]` in one pass. Then sweep, extending the current piece's required end to `max(end, lastIndex[s[i]])`. When `i` finally equals `end`, nothing inside needs to reach further — cut there. Cutting at the earliest legal point maximises the number of pieces, which is the greedy claim.

```js
function partitionLabels(s) {
  const last = new Map();
  for (let i = 0; i < s.length; i++) last.set(s[i], i);   // final occurrence of each char

  const sizes = [];
  let start = 0, end = 0;

  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last.get(s[i]));   // this piece must reach at least here

    if (i === end) {                       // nothing inside reaches beyond → cut
      sizes.push(end - start + 1);
      start = i + 1;
    }
  }
  return sizes;
}
```

**Complexity:** O(n) time, O(26) space.

---

## P78: Hand of Straights

`Medium` · Greedy driven by "the smallest remaining card has no choice."

**Q:** Can the hand be rearranged into groups of `groupSize` consecutive cards?

```
hand = [1,2,3,6,2,3,4,7,8], groupSize = 3 → true    ([1,2,3],[2,3,4],[6,7,8])
hand = [1,2,3,4,5], groupSize = 4 → false
```

**Strategy:** The **smallest remaining card** must be the start of a group — nothing smaller exists to precede it. That removes all choice, so greedy is forced and therefore safe. Count frequencies, walk the distinct values in ascending order, and for each still-available value `k` with count `c`, consume `c` copies of `k, k+1, …, k+groupSize-1`. Any shortfall → impossible.

```js
function isNStraightHand(hand, groupSize) {
  if (hand.length % groupSize !== 0) return false;    // quick impossibility check

  const count = new Map();
  for (const c of hand) count.set(c, (count.get(c) ?? 0) + 1);

  for (const k of [...count.keys()].sort((a, b) => a - b)) {
    const need = count.get(k);
    if (need === 0) continue;                          // already consumed

    for (let v = k; v < k + groupSize; v++) {          // build `need` groups from k
      if ((count.get(v) ?? 0) < need) return false;    // not enough to continue the run
      count.set(v, count.get(v) - need);
    }
  }
  return true;
}
```

**Complexity:** O(n log n + n·groupSize) time, O(n) space.
**Pitfall:** consuming `need` groups at once (not one at a time) is what keeps it efficient.

---

## P79: Best Time to Buy and Sell Stock II

`Medium` · The greedy that looks like it should be DP.

**Q:** Unlimited transactions (buy and sell as often as you like, one share at a time). Maximum profit?

```
[7,1,5,3,6,4] → 7    (buy 1 sell 5, buy 3 sell 6)
[1,2,3,4,5]   → 4    (one trade, or four — same total)
```

**Strategy:** Any multi-day gain decomposes into the sum of its consecutive daily changes, so capturing **every upward step** captures every profitable move, and skipping every downward step loses nothing. You never need to identify the actual peaks and valleys — `(1→5)` and `(1→3)+(3→5)` are the same number.

```js
function maxProfitII(prices) {
  let profit = 0;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) profit += prices[i] - prices[i - 1];  // take every rise
  }
  return profit;
}
```

**Complexity:** O(n) / O(1).
**Note:** add a cooldown (Stock with Cooldown) or a transaction fee, or cap the number of trades, and greedy **breaks** — those are DP (state machine: holding / not holding / cooling down). Knowing where the boundary is matters more than the code.

---
---

# Pattern 12 — Intervals

**Core idea:** almost every interval problem is *sort, then sweep once*. The only real decision is **what you sort by** — and that choice determines the algorithm:

| Sort by | Because | Problems |
|---|---|---|
| **start** | you want to detect and merge overlaps in order | Merge Intervals, Insert Interval |
| **end** | you want to keep as many non-overlapping intervals as possible (finishing early leaves the most room) | Non-overlapping Intervals, Arrows, Activity Selection |
| **both, separately** | you only care about *counts* over time, not which interval is which | Meeting Rooms II |

**The overlap test — memorise it:** `[a1,a2]` and `[b1,b2]` overlap ⟺ `a1 <= b2 && b1 <= a2`. Use `<` instead of `<=` if touching endpoints don't count (always ask).

---

## P80: Insert Interval

`Medium`

**Q:** Insert `newInterval` into a list of sorted, non-overlapping intervals, merging as needed.

```
intervals = [[1,3],[6,9]], newInterval = [2,5] → [[1,5],[6,9]]
```

**Strategy:** Three phases in one pass, no sorting needed (the input is already sorted):
1. Copy every interval that ends **before** the new one starts — strictly to the left.
2. Absorb every interval that overlaps, widening the new interval: `start = min(...)`, `end = max(...)`.
3. Copy the rest.

Writing it as three sequential loops is clearer than one loop with branches, and easier to prove correct out loud.

```js
function insert(intervals, newInterval) {
  const result = [];
  let [start, end] = newInterval;
  let i = 0;

  // 1. entirely before the new interval
  while (i < intervals.length && intervals[i][1] < start) result.push(intervals[i++]);

  // 2. overlapping → swallow them into [start, end]
  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0]);
    end   = Math.max(end,   intervals[i][1]);
    i++;
  }
  result.push([start, end]);

  // 3. entirely after
  while (i < intervals.length) result.push(intervals[i++]);

  return result;
}
```

**Complexity:** O(n) time, O(n) output.
**Pitfall:** the boundary comparisons (`<` in phase 1, `<=` in phase 2) decide whether touching intervals like `[1,2]` and `[2,3]` merge. Ask, then be consistent.

---

## P81: Merge Intervals

`Medium` · The one to know cold; it appears in real backend work (calendar merging, log-range compaction, rate-limit windows).

**Q:** Merge all overlapping intervals.

```
[[1,3],[2,6],[8,10],[15,18]] → [[1,6],[8,10],[15,18]]
```

**Strategy:** Sort by start. Then a single sweep suffices, because after sorting, an interval can only overlap the one immediately being built — anything earlier has already been closed off. If the current interval starts at or before the running interval's end, extend the end; otherwise push the finished one and start fresh.

```js
function merge(intervals) {
  if (intervals.length === 0) return [];

  intervals.sort((a, b) => a[0] - b[0]);      // by start
  const result = [intervals[0].slice()];       // copy: don't mutate the input

  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const [start, end] = intervals[i];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);       // overlap → extend (max, not end!)
    } else {
      result.push([start, end]);              // gap → begin a new interval
    }
  }
  return result;
}
```

**Trace** (`[[1,3],[2,6],[8,10],[15,18]]`): start `[1,3]`. `[2,6]`: 2 ≤ 3 → extend to `[1,6]`. `[8,10]`: 8 > 6 → push. `[15,18]`: push. → `[[1,6],[8,10],[15,18]]` ✅

**Complexity:** O(n log n) time (the sort), O(n) space.
**Pitfall:** `last[1] = end` instead of `Math.max(last[1], end)` breaks on a fully contained interval like `[[1,10],[2,3]]` — it would shrink to `[1,3]`.

---

## P82: Non-overlapping Intervals

`Medium` · The "sort by **end**" family. Understanding *why* end-sorting is right is the interview.

**Q:** Minimum number of intervals to remove so that the rest don't overlap.

```
[[1,2],[2,3],[3,4],[1,3]] → 1     (remove [1,3])
```

**Strategy:** Equivalent to *keeping* the maximum number of non-overlapping intervals — the classic activity-selection problem. Greedily keep the interval that **finishes earliest**, because finishing earliest leaves the most room for everything after it, and it can never be worse than any alternative (exchange argument: swap any other first choice for the earliest-finishing one and the rest of the solution still fits).

So sort by end, then keep an interval whenever it starts at or after the last kept end; otherwise count it as removed.

```js
function eraseOverlapIntervals(intervals) {
  intervals.sort((a, b) => a[1] - b[1]);       // by END — this is the whole trick

  let removed = 0, lastEnd = -Infinity;

  for (const [start, end] of intervals) {
    if (start >= lastEnd) lastEnd = end;       // no overlap → keep it
    else removed++;                             // overlaps the kept one → remove
  }
  return removed;
}
```

**Complexity:** O(n log n) / O(1).
**Pitfall:** sorting by *start* here needs extra "which one do I drop" logic and is easy to get wrong. Sort by end.
**Identical problem:** *Minimum Number of Arrows to Burst Balloons* — count the intervals you *keep* (each kept group needs one arrow) instead of the ones you remove.

---

## P83: Meeting Rooms I & II

`Easy` / `Medium` · The classic "how many resources concurrently?" question. Directly applicable to capacity planning.

**Q1:** Can one person attend all meetings (no overlaps)?
**Q2:** Minimum number of rooms needed for all meetings?

```
[[0,30],[5,10],[15,20]] → I: false,  II: 2
[[7,10],[2,4]]          → I: true,   II: 1
```

**Strategy (I):** Sort by start; any meeting starting before its predecessor ends is a conflict.

**Strategy (II) — the sweep line:** The answer is the maximum number of meetings running **at the same instant**. You don't need to know *which* meetings — just the timeline of events. So split the intervals into two sorted arrays of start times and end times, then walk the starts: each start needs a room, but first release any room whose end time has already passed. Track the running peak.

The heap version is equivalent: a min-heap of end times, and the heap size *is* the number of rooms.

```js
function canAttendMeetings(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) return false;   // starts before prior end
  }
  return true;
}

// Sweep line — O(n log n), no heap needed
function minMeetingRooms(intervals) {
  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
  const ends   = intervals.map(i => i[1]).sort((a, b) => a - b);

  let rooms = 0, peak = 0, e = 0;

  for (let s = 0; s < starts.length; s++) {
    // free every room whose meeting already ended
    while (e < ends.length && ends[e] <= starts[s]) { rooms--; e++; }
    rooms++;                                   // this meeting takes a room
    peak = Math.max(peak, rooms);
  }
  return peak;
}
```

**Trace** (`[[0,30],[5,10],[15,20]]`): starts `[0,5,15]`, ends `[10,20,30]`. s=0: no end ≤ 0 → rooms 1, peak 1. s=5: no end ≤ 5 → rooms **2**, peak 2. s=15: end 10 ≤ 15 → rooms 1; then rooms 2, peak 2. → **2** ✅

**Complexity:** O(n log n) time, O(n) space.
**Backend framing to mention:** this is exactly how you size a connection pool or worker fleet from a request trace — peak concurrency, not total volume.

---

## P84: Minimum Interval to Include Each Query

`Hard` · Intervals + heap + offline sorting. Good stretch problem.

**Q:** For each query `q`, return the length of the **smallest** interval containing `q`, or `-1`.

```
intervals = [[1,4],[2,4],[3,6],[4,4]], queries = [2,3,4,5] → [3,3,1,4]
```

**Strategy — process queries offline in sorted order:** Sort the queries ascending (remembering their original positions, since the output must be in the original order) and sort the intervals by start. For each query, push in every interval that has *started* by now, then discard from the heap any interval that has already *ended*. The heap is ordered by length, so its root is the shortest currently-covering interval — the answer.

Sorting the queries is what makes this work: it lets each interval be added exactly once instead of re-scanned per query.

```js
function minInterval(intervals, queries) {
  intervals.sort((a, b) => a[0] - b[0]);

  // keep original positions so we can write answers back in order
  const order = queries.map((q, i) => [q, i]).sort((a, b) => a[0] - b[0]);

  const heap = new MinHeap((a, b) => a[0] - b[0]);   // [length, end]
  const answer = new Array(queries.length).fill(-1);
  let i = 0;

  for (const [q, idx] of order) {
    // add every interval that has begun
    while (i < intervals.length && intervals[i][0] <= q) {
      const [s, e] = intervals[i++];
      heap.push([e - s + 1, e]);
    }
    // drop intervals that already ended before q
    while (heap.size() && heap.peek()[1] < q) heap.pop();

    if (heap.size()) answer[idx] = heap.peek()[0];   // shortest still covering q
  }
  return answer;
}
```

**Complexity:** O((n + q) log(n + q)) time, O(n) space.
**Pitfall:** you must restore the original query order — that's what the `[q, i]` pairing is for.

---
---

# Pattern 13 — Backtracking

**Core idea:** systematically explore a decision tree, undoing each choice on the way back out. Three lines, always the same shape:

```
choose  →  explore (recurse)  →  un-choose (undo)
```

### The universal template

```js
function solve(input) {
  const result = [], path = [];

  const backtrack = (start /* or other position state */) => {
    if (isComplete(path)) { result.push([...path]); return; }   // ← COPY the path!

    for (let i = start; i < input.length; i++) {
      if (!isValid(input[i], path)) continue;   // prune: skip impossible branches

      path.push(input[i]);        // choose
      backtrack(i + 1);           // explore
      path.pop();                 // un-choose  ← forgetting this is the classic bug
    }
  };

  backtrack(0);
  return result;
}
```

### The three things that decide which problem you're solving

| Recursive call | Meaning | Problem type |
|---|---|---|
| `backtrack(i + 1)` | each element used at most once, order fixed | **Combinations / subsets** |
| `backtrack(i)` | the same element may be reused | **Combination Sum** |
| `backtrack(0)` + a `used[]` array | every element, all orderings | **Permutations** |

### Two rules that prevent 90% of backtracking bugs
1. **Push a copy:** `result.push([...path])` — pushing `path` itself stores a reference that you then mutate into garbage.
2. **Prune early:** checking validity *before* recursing (rather than at the base case) is what turns an intractable search into a fast one. In sorted problems, `break` instead of `continue` once the remainder is impossible.

**Complexity:** these are exponential by nature. State it honestly: subsets O(n·2ⁿ), permutations O(n·n!), and the `n` factor is the cost of copying each result.

---

## P85: Subsets & Subsets II

`Medium` · The template in its simplest form.

**Q1:** All subsets of a distinct-integer array (the power set).
**Q2:** Same, but the input may contain duplicates and the output must have no duplicate subsets.

```
[1,2,3]  → [[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]
[1,2,2]  → [[],[1],[1,2],[1,2,2],[2],[2,2]]
```

**Strategy (I):** Every node of the recursion tree *is* a valid subset, so record on entry — no separate base case needed. `start` prevents revisiting earlier elements, which is what stops `[1,2]` and `[2,1]` both appearing.

**Strategy (II):** Sort so duplicates are adjacent, then **skip a duplicate at the same decision level**: `if (i > start && nums[i] === nums[i-1]) continue`. The `i > start` part is essential — it allows a duplicate to be used *deeper* in the path (giving `[2,2]`) while forbidding it as a *sibling* choice (which would give a second `[2]`).

```js
function subsets(nums) {
  const result = [], path = [];

  const backtrack = start => {
    result.push([...path]);                 // every node is a valid subset

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      backtrack(i + 1);                     // i+1: no reuse, no reordering
      path.pop();
    }
  };

  backtrack(0);
  return result;
}

function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b);               // duplicates become adjacent
  const result = [], path = [];

  const backtrack = start => {
    result.push([...path]);

    for (let i = start; i < nums.length; i++) {
      if (i > start && nums[i] === nums[i - 1]) continue;  // skip duplicate SIBLINGS
      path.push(nums[i]);
      backtrack(i + 1);
      path.pop();
    }
  };

  backtrack(0);
  return result;
}
```

**Complexity:** O(n · 2ⁿ) time, O(n) recursion depth.
**Pitfall:** writing `i > 0` instead of `i > start` in Subsets II — that wrongly kills `[2,2]`.

---

## P86: Combination Sum

`Medium` · Reuse allowed → `backtrack(i)`, not `i + 1`.

**Q:** All unique combinations of `candidates` (distinct values) summing to `target`. Each number may be used **unlimited** times.

```
candidates = [2,3,6,7], target = 7 → [[2,2,3],[7]]
```

**Strategy:** Pass `remaining` down instead of recomputing sums. Recursing with `i` (not `i + 1`) allows reuse; still passing `i` rather than `0` prevents permuted duplicates like `[3,2,2]`. Two prunes: stop at `remaining === 0` (record), and stop when `candidate > remaining` — and since the array is sorted, that's a `break`, not a `continue`, because every later candidate is also too big.

```js
function combinationSum(candidates, target) {
  candidates.sort((a, b) => a - b);          // enables the break-prune
  const result = [], path = [];

  const backtrack = (start, remaining) => {
    if (remaining === 0) { result.push([...path]); return; }

    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;   // sorted → all later ones fail too

      path.push(candidates[i]);
      backtrack(i, remaining - candidates[i]); // `i`, not i+1 → reuse allowed
      path.pop();
    }
  };

  backtrack(0, target);
  return result;
}
```

**Complexity:** exponential; bounded roughly by O(n^(target/min)) — say "exponential in target/minCandidate."
**Variant (Combination Sum II — each number used once, input has duplicates):** recurse with `i + 1` **and** add the Subsets-II duplicate skip.

---

## P87: Permutations

`Medium`

**Q:** All permutations of a distinct-integer array.

```
[1,2,3] → [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

**Strategy:** Order matters here, so there's no `start` index — every position considers **every** unused element. A `used[]` boolean array tracks what's already in the path. The base case is a full-length path.

```js
function permute(nums) {
  const result = [], path = [];
  const used = new Array(nums.length).fill(false);

  const backtrack = () => {
    if (path.length === nums.length) { result.push([...path]); return; }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;              // already in the current path

      used[i] = true;  path.push(nums[i]);      // choose
      backtrack();                               // explore
      path.pop();      used[i] = false;          // un-choose (BOTH parts)
    }
  };

  backtrack();
  return result;
}
```

**Complexity:** O(n · n!) time, O(n) space beyond the output.
**Pitfall:** undoing only `path` and not `used` (or vice versa) — they must be reverted together.
**With duplicates (Permutations II):** sort, then `if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) continue;` — only use a duplicate if its identical predecessor is already in the path, which fixes one canonical ordering among identical values.

---

## P88: Letter Combinations of a Phone Number

`Medium` · Backtracking over *positions*, not over a set of choices.

**Q:** Given digits 2–9, return all letter combinations they could spell.

```
"23" → ["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

**Strategy:** Each digit is a position and contributes exactly one character, so the recursion depth is fixed at `digits.length` and the branching factor is that digit's letter count. Recurse on the digit index; the base case is having consumed all digits.

```js
function letterCombinations(digits) {
  if (!digits) return [];

  const pad = { 2:'abc', 3:'def', 4:'ghi', 5:'jkl', 6:'mno', 7:'pqrs', 8:'tuv', 9:'wxyz' };
  const result = [], path = [];

  const backtrack = index => {
    if (index === digits.length) { result.push(path.join('')); return; }

    for (const letter of pad[digits[index]]) {
      path.push(letter);
      backtrack(index + 1);        // move to the NEXT digit
      path.pop();
    }
  };

  backtrack(0);
  return result;
}
```

**Complexity:** O(4ⁿ · n) time (4 letters max per digit), O(n) depth.
**Pitfall:** the empty-input check — `""` must return `[]`, not `[""]`.

---

## P89: Word Search

`Medium` · Backtracking on a grid, with in-place marking as the visited set.

**Q:** Does `word` exist in the grid as a path of horizontally/vertically adjacent cells, without reusing a cell?

**Strategy:** DFS from every cell that matches the first letter. The elegant trick: instead of a separate `visited` set, **temporarily overwrite the cell** with a sentinel like `'#'` before recursing and restore it afterwards. That's O(1) extra space and cannot get out of sync with the path.

Prune hard: return false immediately on out-of-bounds or a character mismatch. That pruning is what makes the exponential bound acceptable in practice.

```js
function exist(board, word) {
  const rows = board.length, cols = board[0].length;

  const dfs = (r, c, i) => {
    if (i === word.length) return true;                       // matched everything
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (board[r][c] !== word[i]) return false;                // mismatch → prune

    const saved = board[r][c];
    board[r][c] = '#';                                        // mark visited

    const found = dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1)
               || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);

    board[r][c] = saved;                                      // restore (un-choose)
    return found;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}
```

**Complexity:** O(rows · cols · 4^L) worst case where L = word length; O(L) recursion depth.
**Pitfall:** restoring the cell on **every** exit path. Returning early without restoring corrupts the board for later searches.
**Follow-up:** *Word Search II* (many words) — put the words in a **trie** and walk the grid once, pruning the moment the current prefix leaves the trie. Searching each word independently is far too slow.

---

## P90: N-Queens

`Hard` · The canonical constraint-propagation problem. Diagonal indexing is the trick.

**Q:** Place `n` queens on an `n×n` board so none attack another; return all distinct solutions.

**Strategy:** Place exactly one queen per **row** (so rows can never conflict by construction) and recurse row by row. For O(1) conflict checks, keep three sets:
- `cols` — occupied columns.
- `diag1` — occupied "↘" diagonals, identified by **`row - col`** (constant along that diagonal).
- `diag2` — occupied "↙" diagonals, identified by **`row + col`**.

Those two diagonal identities are the whole insight; derive them once on a 3×3 grid and they'll stick.

```js
function solveNQueens(n) {
  const result = [];
  const queenCol = [];                    // queenCol[row] = column
  const cols = new Set(), diag1 = new Set(), diag2 = new Set();

  const backtrack = row => {
    if (row === n) {                      // all rows filled → a valid board
      result.push(queenCol.map(c => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1)));
      return;
    }

    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;

      cols.add(col); diag1.add(row - col); diag2.add(row + col);
      queenCol.push(col);

      backtrack(row + 1);

      queenCol.pop();
      cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
    }
  };

  backtrack(0);
  return result;
}
```

**Complexity:** O(n!) in the worst case, but the constraint checks prune enormously. O(n) space for the sets.
**Pitfall:** mixing up `row - col` and `row + col`. Also remember to remove **all three** markers when undoing.

---

## P91: Generate Parentheses

`Medium` · Backtracking where the *validity rule* replaces an explicit candidate list.

**Q:** All combinations of `n` well-formed parenthesis pairs.

```
n = 3 → ["((()))","(()())","(())()","()(())","()()()"]
```

**Strategy:** Generating all `2^(2n)` strings and filtering is wasteful. Instead build only valid prefixes by enforcing two rules while constructing:
- Add `'('` while `open < n`.
- Add `')'` only while `close < open` — that single condition is exactly what guarantees the string never closes more than it has opened, so every leaf reached is valid.

No validity check at the base case is needed; correctness is built into the construction.

```js
function generateParenthesis(n) {
  const result = [], path = [];

  const backtrack = (open, close) => {
    if (path.length === 2 * n) { result.push(path.join('')); return; }

    if (open < n) {                          // room for another opener
      path.push('('); backtrack(open + 1, close); path.pop();
    }
    if (close < open) {                      // only close what's already open
      path.push(')'); backtrack(open, close + 1); path.pop();
    }
  };

  backtrack(0, 0);
  return result;
}
```

**Complexity:** O(4ⁿ / √n) — the n-th Catalan number times the cost of copying. Just say "Catalan number of results."
**Pitfall:** `close < open`, not `close < n`. The latter generates invalid strings like `")("`.

---
---

# Pattern 14 — Dynamic Programming

**Core idea:** the problem has **overlapping subproblems** (the same subproblem is reached many times) and an **optimal substructure** (the best answer is built from the best answers to smaller pieces). Solve each subproblem once and reuse it.

### The 6-step derivation — do these *in order*, on paper, before coding

1. **Define the state in one English sentence.** *"`dp[i]` = the maximum money robbable from the first `i` houses."* If you can't finish this sentence, you don't have a DP yet — and this is where nearly every failure happens.
2. **Write the recurrence.** What choices exist at step `i`? The answer is the best over those choices, each expressed in terms of *smaller* states.
3. **Base cases.** `dp[0]` and sometimes `dp[1]`. Make them consistent with the recurrence, not with intuition.
4. **Iteration order.** Every state must be computed *after* everything it depends on.
5. **Where's the answer?** Usually `dp[n]`, sometimes `max(dp)`. Check.
6. **Optimise space.** If `dp[i]` only reads `dp[i-1]` and `dp[i-2]`, two variables replace the array (O(n) → O(1)). If a 2-D table only reads the previous row, one row suffices.

### Top-down vs bottom-up

| | Memoised recursion (top-down) | Tabulation (bottom-up) |
|---|---|---|
| Write it as | the recurrence + a cache | loops filling an array |
| Pros | mirrors the recurrence, only visits reachable states | no stack limits, easy to space-optimise |
| Cons | recursion depth, function-call overhead | must get the iteration order right |
| **Interview advice** | derive the recurrence with memoisation, then convert | present the table version if asked for optimal space |

```js
// Memoisation skeleton — the fastest way from a recurrence to working code
function solve(n) {
  const memo = new Map();
  const go = i => {
    if (i <= 0) return baseCase;
    if (memo.has(i)) return memo.get(i);
    const answer = /* recurrence using go(i-1), go(i-2), … */;
    memo.set(i, answer);
    return answer;
  };
  return go(n);
}
```

### The classic families
| Family | State | Examples |
|---|---|---|
| **Linear / 1-D** | `dp[i]` = best using the first `i` items | Climbing Stairs, House Robber, Decode Ways |
| **Knapsack** | `dp[i][capacity]` (often collapsed to 1-D) | Coin Change, Partition Equal Subset Sum |
| **Two sequences** | `dp[i][j]` over prefixes of both | LCS, Edit Distance |
| **Grid** | `dp[r][c]` | Unique Paths, Min Path Sum |
| **Interval** | `dp[i][j]` over a range | Burst Balloons, Matrix Chain |

---

## P92: Climbing Stairs

`Easy` · The Hello World of DP. Derive it properly; the habit is what transfers.

**Q:** You climb 1 or 2 steps at a time. How many distinct ways to reach step `n`?

```
n = 3 → 3    (1+1+1, 1+2, 2+1)
```

**Strategy:** `dp[i]` = number of ways to reach step `i`. To be standing on step `i`, your last move came from `i-1` (a 1-step) or `i-2` (a 2-step), and those two sets of paths are disjoint and cover everything → `dp[i] = dp[i-1] + dp[i-2]`. That's Fibonacci. Since only the last two values are ever read, keep two variables.

```js
function climbStairs(n) {
  let twoBack = 1, oneBack = 1;      // dp[0] = 1 (empty path), dp[1] = 1

  for (let i = 2; i <= n; i++) {
    const current = oneBack + twoBack;
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack;
}
```

**Complexity:** O(n) time, O(1) space.
**Pitfall:** `dp[0] = 1` (there is exactly one way to stand still), not 0. Getting base cases from the recurrence rather than from intuition is the discipline to build here.

---

## P93: House Robber I & II

`Medium` · Linear DP with a "take or skip" choice, then the circular twist.

**Q1:** Non-negative values in a row of houses; you can't rob two adjacent houses. Maximum total?
**Q2:** Same, but the houses are arranged in a **circle** (first and last are adjacent).

```
[1,2,3,1]   → 4     (houses 0 and 2)
[2,7,9,3,1] → 12    (houses 0, 2, 4)
circular [2,3,2] → 3
```

**Strategy (I):** `dp[i]` = the best takeable from houses `0..i`. At house `i` there are exactly two options: **rob it** (`nums[i] + dp[i-2]` — skipping the neighbour) or **skip it** (`dp[i-1]`). Take the max. Only two previous values are needed → O(1) space.

**Strategy (II):** The circle means houses 0 and n−1 conflict, so they can never both be robbed. Split into two ordinary linear problems and take the better: rob `0..n-2` (excluding the last), or rob `1..n-1` (excluding the first). Reducing a hard variant to a solved one is the move to demonstrate.

```js
function rob(nums) {
  let skip = 0, take = 0;          // skip = best up to i-2, take = best up to i-1

  for (const value of nums) {
    const best = Math.max(take, skip + value);   // skip this house, or rob it
    skip = take;
    take = best;
  }
  return take;
}

function robCircular(nums) {
  if (nums.length === 1) return nums[0];         // no "circle" to break
  return Math.max(
    rob(nums.slice(0, -1)),   // exclude the last house
    rob(nums.slice(1)),       // exclude the first house
  );
}
```

**Complexity:** O(n) / O(1).
**Pitfall:** the single-house case in the circular version — both slices would be empty and return 0.

---

## P94: Coin Change

`Medium` · Unbounded knapsack. Also the canonical proof that greedy fails.

**Q:** Fewest coins summing to `amount`, or `-1` if impossible. Unlimited coins of each denomination.

```
coins = [1,2,5], amount = 11 → 3     (5+5+1)
coins = [2], amount = 3      → -1
```

**Strategy:** `dp[a]` = the fewest coins that make amount `a`. The last coin used was some `c`, so `dp[a] = 1 + min(dp[a - c])` over all coins `c ≤ a`. Base case `dp[0] = 0`. Initialise the rest to `Infinity` meaning "unreachable" — that value propagates correctly, so no special-casing is needed.

**Why not greedy:** for `coins = [1,3,4]` and `amount = 6`, greedy takes 4+1+1 = 3 coins, but 3+3 = 2 is optimal. The largest coin isn't always in the best solution, so you must compare combinations.

```js
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;                                   // zero coins make amount 0

  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) {
        dp[a] = dp[a - c] + 1;                 // use coin c as the last one
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

**Trace** (`coins=[1,2,5]`, up to 6): dp = `[0,1,1,2,2,1,2]` → `dp[6] = 2` (5+1). ✅

**Complexity:** O(amount · coins) time, O(amount) space.
**Variant (Coin Change II — count the *combinations*):** swap the loop order — coins **outer**, amount inner. That ordering counts each multiset once instead of counting orderings. The loop order carrying that much meaning is a great thing to explain.

---

## P95: Longest Increasing Subsequence

`Medium` · Know both the O(n²) DP and the O(n log n) patience version.

**Q:** Length of the longest strictly increasing subsequence (elements need not be contiguous).

```
[10,9,2,5,3,7,101,18] → 4    ([2,3,7,101])
```

**Strategy (O(n²) DP):** `dp[i]` = length of the longest increasing subsequence **ending exactly at `i`**. For each `i`, look at every earlier `j` with `nums[j] < nums[i]` and extend the best one. The answer is `max(dp)` — not `dp[n-1]`, because the subsequence can end anywhere.

**Strategy (O(n log n)):** Keep `tails`, where `tails[k]` is the **smallest possible tail value** of an increasing subsequence of length `k+1`. `tails` is always sorted, so binary search for the first element `≥ nums[i]` and overwrite it (or append if none). Overwriting keeps tails as small as possible, which maximises future extension room. `tails.length` is the answer. Note `tails` is *not* necessarily an actual subsequence — only its length is meaningful.

```js
// O(n^2) — derive this one first
function lengthOfLISQuadratic(nums) {
  const dp = new Array(nums.length).fill(1);   // every element alone is length 1

  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
    }
  }
  return Math.max(...dp);                       // best ending anywhere
}

// O(n log n) — patience sorting
function lengthOfLIS(nums) {
  const tails = [];      // tails[k] = smallest tail of an increasing subseq of length k+1

  for (const n of nums) {
    // binary search: first index with tails[index] >= n
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] >= n) hi = mid; else lo = mid + 1;
    }
    tails[lo] = n;       // replace (keeps tails minimal) or append at the end
  }
  return tails.length;
}
```

**Complexity:** O(n²)/O(n) and O(n log n)/O(n).
**Pitfall:** for a *non-decreasing* subsequence, change the predicate to `tails[mid] > n`. Get that boundary right.

---

## P96: Word Break

`Medium` · String DP with a set lookup.

**Q:** Can `s` be segmented into a space-separated sequence of dictionary words? (Words may be reused.)

```
s = "leetcode", dict = ["leet","code"] → true
s = "catsandog", dict = ["cats","dog","sand","and","cat"] → false
```

**Strategy:** `dp[i]` = "the first `i` characters can be fully segmented." For each `i`, try every split point `j < i`: if `dp[j]` is true **and** `s[j..i)` is in the dictionary, then `dp[i]` is true. `dp[0] = true` (an empty string is trivially segmentable) and that base case is what seeds everything.

Put the dictionary in a `Set` — using `includes` on the array makes this O(n²·m) instead of O(n²).

```js
function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true;                                     // empty prefix is segmentable

  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && words.has(s.slice(j, i))) {      // valid split at j
        dp[i] = true;
        break;                                       // one witness is enough
      }
    }
  }
  return dp[s.length];
}
```

**Complexity:** O(n² · L) time (slicing costs L), O(n) space.
**Optimisation:** only try `j` values where `i - j <= maxWordLength` — a big constant-factor win.
**Follow-up:** *Word Break II* (return all segmentations) → backtracking **with memoisation on the start index**, because the same suffix gets re-segmented otherwise.

---

## P97: Partition Equal Subset Sum

`Medium` · 0/1 knapsack, and the reason the inner loop runs backwards.

**Q:** Can the array be split into two subsets with equal sums?

```
[1,5,11,5] → true    ([1,5,5] and [11])
[1,2,3,5]  → false
```

**Strategy:** Equal halves means each has sum `total / 2`, so an odd total is an instant `false`. The question becomes: *is there a subset summing to exactly `target = total/2`?* — subset-sum, i.e. 0/1 knapsack. `dp[s]` = "some subset sums to `s`." For each number, `dp[s] |= dp[s - num]`.

**The critical detail:** iterate `s` **downwards**. Going upwards would let the *same* number be used more than once within its own pass (you'd read a `dp[s-num]` you already updated in this iteration), turning 0/1 knapsack into unbounded knapsack. Being able to explain that direction is the whole point of this problem.

```js
function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 !== 0) return false;              // odd total can't be halved

  const target = total / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;                                    // the empty subset sums to 0

  for (const num of nums) {
    for (let s = target; s >= num; s--) {          // DOWNWARD → each num used once
      if (dp[s - num]) dp[s] = true;
    }
    if (dp[target]) return true;                   // early exit
  }
  return dp[target];
}
```

**Complexity:** O(n · target) time, O(target) space — pseudo-polynomial (it depends on the *value* of the sum, not just `n`). Say "pseudo-polynomial"; it's the correct term and it signals real understanding.

---

## P98: Longest Common Subsequence

`Medium` · The two-sequence DP template. Learn this grid and Edit Distance follows.

**Q:** Length of the longest subsequence common to both strings.

```
"abcde", "ace" → 3    ("ace")
"abc", "def"   → 0
```

**Strategy:** `dp[i][j]` = LCS length of `a`'s first `i` characters and `b`'s first `j`. Two cases:
- **Characters match** (`a[i-1] === b[j-1]`): that character is in the LCS → `1 + dp[i-1][j-1]` (both shrink).
- **They don't:** the LCS must drop one character from one of the two strings → `max(dp[i-1][j], dp[i][j-1])`.

Row/column 0 mean "one string is empty" → LCS 0, so the padded first row and column of zeros gives free base cases and removes all boundary checks. That 1-offset padding is the trick worth carrying to every two-sequence DP.

```js
function longestCommonSubsequence(a, b) {
  const m = a.length, n = b.length;
  // (m+1) x (n+1) grid: row/col 0 = "empty string" base case
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = 1 + dp[i - 1][j - 1];              // match: take it, shrink both
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); // drop from one side
      }
    }
  }
  return dp[m][n];
}
```

**Complexity:** O(m·n) time and space; O(min(m,n)) space if you keep only two rows.
**Related:** *Longest Common Substring* (must be contiguous) — reset to 0 on a mismatch and track the global max. Different problem, one-line difference.

---

## P99: Edit Distance (Levenshtein)

`Hard` · Same grid, three choices instead of two. Genuinely useful in real systems (fuzzy search, spell check, diff).

**Q:** Minimum number of single-character insertions, deletions or replacements to turn `a` into `b`.

```
"horse" → "ros" : 3     (replace h→r, delete r, delete e)
```

**Strategy:** `dp[i][j]` = minimum edits to turn `a`'s first `i` characters into `b`'s first `j`.
- Characters match → no edit needed: `dp[i-1][j-1]`.
- Otherwise, take the cheapest of three edits, each costing 1:
  - **delete** from `a` → `dp[i-1][j]`
  - **insert** into `a` → `dp[i][j-1]`
  - **replace** → `dp[i-1][j-1]`

Base cases: turning a length-`i` string into an empty one costs `i` deletions (first column = `i`), and vice versa (first row = `j`).

```js
function minDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;   // delete everything
  for (let j = 0; j <= n; j++) dp[0][j] = j;   // insert everything

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];           // free: characters already agree
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],      // delete a[i-1]
          dp[i][j - 1],      // insert b[j-1]
          dp[i - 1][j - 1],  // replace a[i-1] with b[j-1]
        );
      }
    }
  }
  return dp[m][n];
}
```

**Complexity:** O(m·n) time and space (reducible to O(min(m,n))).
**Pitfall:** mapping each `dp` neighbour to the right operation. Draw the 3×3 corner of the grid once and label the arrows — then it's permanent.

---

## P100: Unique Paths & Minimum Path Sum

`Medium` · Grid DP, the most visual family.

**Q1:** Moving only right or down, how many paths from the top-left to the bottom-right of an `m × n` grid?
**Q2:** Given a cost grid, what's the minimum-sum path?

**Strategy:** Every cell is entered from exactly one of two places — above or to the left. So `paths[r][c] = paths[r-1][c] + paths[r][c-1]`, with the first row and column being 1 (a single straight-line path). For minimum path sum, the same structure with `min` instead of `+`. Since each row only depends on the row above and the cell to the left, a **single 1-D array updated in place** suffices.

```js
function uniquePaths(m, n) {
  // dp[c] = number of paths to the current row's column c
  const dp = new Array(n).fill(1);            // first row: exactly one path each

  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      dp[c] += dp[c - 1];                     // from above (old dp[c]) + from the left
    }
  }
  return dp[n - 1];
}

function minPathSum(grid) {
  const rows = grid.length, cols = grid[0].length;
  const dp = new Array(cols).fill(Infinity);
  dp[0] = 0;                                   // entering the start costs nothing extra

  for (let r = 0; r < rows; r++) {
    dp[0] += grid[r][0];                       // first column: only from above
    for (let c = 1; c < cols; c++) {
      dp[c] = grid[r][c] + Math.min(dp[c], dp[c - 1]);  // dp[c]=above, dp[c-1]=left
    }
  }
  return dp[cols - 1];
}
```

**Complexity:** O(m·n) time, O(n) space.
**Note:** `uniquePaths` also has a closed form, `C(m+n-2, m-1)` — mention it, it's a nice touch.
**Variant:** *Unique Paths II* (obstacles) → set `dp[c] = 0` at an obstacle; blocked cells contribute no paths.

---

## P101: Decode Ways

`Medium` · Fibonacci-shaped DP with nasty validity rules. The edge cases *are* the problem.

**Q:** A digit string was encoded with A=1 … Z=26. How many ways can it be decoded?

```
"12"   → 2    ("AB", "L")
"226"  → 3    ("BZ", "VF", "BBF")
"06"   → 0    (leading zero is never valid)
```

**Strategy:** `dp[i]` = number of ways to decode the first `i` characters. The last piece was either
- **one digit** — valid only if it isn't `'0'` → add `dp[i-1]`; or
- **two digits** — valid only if the pair is in `10..26` (which automatically excludes a leading zero) → add `dp[i-2]`.

Same recurrence shape as Climbing Stairs, but each term is gated by a validity test. Only two previous values are needed → O(1) space.

```js
function numDecodings(s) {
  if (s.length === 0 || s[0] === '0') return 0;   // can't start with 0

  let twoBack = 1, oneBack = 1;      // dp[0] = 1 (empty), dp[1] = 1 (validated above)

  for (let i = 1; i < s.length; i++) {
    let ways = 0;

    if (s[i] !== '0') ways += oneBack;                 // single digit 1–9

    const pair = Number(s[i - 1] + s[i]);
    if (pair >= 10 && pair <= 26) ways += twoBack;     // valid two-digit letter

    twoBack = oneBack;
    oneBack = ways;                                     // may legitimately be 0
  }
  return oneBack;
}
```

**Trace** (`"226"`): start twoBack=1, oneBack=1. i=1 (`'2'`): single ok → +1; pair 22 ∈ [10,26] → +1 → ways 2. Now twoBack=1, oneBack=2. i=2 (`'6'`): single ok → +2; pair 26 ok → +1 → ways **3**. ✅

**Complexity:** O(n) / O(1).
**Pitfalls:** `"30"` → 0 (3 then 0 is invalid, and 30 > 26). `"100"` → 0. `"10"` → 1. Test all of these — this problem is graded on edge cases.

---
---

# Pattern 15 — Graphs

**Core idea:** nodes and edges. Once you see a graph, the algorithm follows almost mechanically from what's being asked:

| The question | The algorithm |
|---|---|
| "Are these connected?" / "how many groups?" | DFS or BFS or Union-Find |
| "**Shortest** path, unweighted" | **BFS** (levels = distance) |
| "Shortest path, weighted, non-negative" | **Dijkstra** (BFS + a min-heap) |
| "Any valid ordering respecting dependencies" | **Topological sort** (Kahn's, or DFS post-order) |
| "Is there a cycle?" | DFS with a recursion-state array, or Kahn's leftover count |
| "Spread from many sources at once" | **Multi-source BFS** (seed the queue with all of them) |
| "Connect everything at minimum cost" | MST — Prim's or Kruskal's + Union-Find |

**Grid problems are graph problems.** Cell `(r,c)` is a node; its neighbours are the 4 (or 8) adjacent cells. You never build an adjacency list — you compute neighbours on the fly.

```js
const DIRECTIONS = [[1,0], [-1,0], [0,1], [0,-1]];   // down, up, right, left
```

**Two universal reminders:** always track `visited` (or a graph with a cycle loops forever), and mark a node visited **when you enqueue it**, not when you dequeue it — otherwise the same node enters the queue many times.

---

## P102: Number of Islands

`Medium` · The grid-DFS template. Everything else in this pattern is a variation.

**Q:** Count the connected groups of `'1'`s (4-directionally) in a grid of `'1'`/`'0'`.

```
[["1","1","0","0"],
 ["1","1","0","0"],
 ["0","0","1","0"],
 ["0","0","0","1"]]   → 3
```

**Strategy:** Scan every cell. When you find unvisited land, that's a **new island** — increment the counter, then flood-fill (DFS or BFS) the entire connected region so its cells are never counted again. The counter increments once per *discovery*; the flood fill guarantees exactly one discovery per island.

Sinking visited land by overwriting `'1'` → `'0'` avoids a separate visited set (mention that it mutates the input — offer a `visited` set if that's not acceptable).

```js
function numIslands(grid) {
  const rows = grid.length, cols = grid[0].length;
  let islands = 0;

  const sink = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;

    grid[r][c] = '0';                     // mark visited by sinking the land
    for (const [dr, dc] of DIRECTIONS) sink(r + dr, c + dc);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        islands++;                        // a new, undiscovered island
        sink(r, c);                       // consume all of it
      }
    }
  }
  return islands;
}
```

**Complexity:** O(rows · cols) — each cell is visited a constant number of times. Space O(rows · cols) worst-case recursion depth (an all-land grid) — for very large grids use an explicit stack or BFS.
**Same template:** *Max Area of Island* (return the fill size), *Flood Fill*, *Surrounded Regions*, *Number of Distinct Islands* (record the shape as a normalised path signature).

---

## P103: Clone Graph

`Medium` · Tests whether you understand the visited-map's dual purpose.

**Q:** Deep-copy a connected undirected graph given a node reference.

**Strategy:** DFS, with a `Map` from **original node → its clone**. That map does two jobs at once: it's the visited set (preventing infinite recursion around cycles) *and* the lookup that lets two different neighbours point at the *same* clone instead of duplicating it. Recognising that one structure serves both purposes is the insight.

Order matters: create the clone and register it in the map **before** recursing into neighbours, or a cycle will recurse forever.

```js
function cloneGraph(node) {
  if (!node) return null;
  const clones = new Map();          // original -> clone (also acts as visited)

  const dfs = original => {
    if (clones.has(original)) return clones.get(original);   // already cloned

    const copy = { val: original.val, neighbors: [] };
    clones.set(original, copy);      // register BEFORE recursing → cycles terminate

    for (const neighbor of original.neighbors) {
      copy.neighbors.push(dfs(neighbor));
    }
    return copy;
  };

  return dfs(node);
}
```

**Complexity:** O(V + E) time, O(V) space.
**Pitfall:** registering the clone after the neighbour loop → infinite recursion on any cycle.

---

## P104: Rotting Oranges

`Medium` · Multi-source BFS. The go-to example for "simultaneous spread."

**Q:** Grid cells are `0` empty, `1` fresh, `2` rotten. Each minute, every rotten orange rots its 4-adjacent fresh neighbours. Minutes until none are fresh, or `-1` if impossible.

**Strategy:** Because *all* rotten oranges spread at once, seed the BFS queue with **every** initial rotten cell. Then each BFS level is exactly one minute — that's what makes BFS (not DFS) the right tool: BFS explores in distance order, and here distance *is* time.

Count fresh oranges up front so you can distinguish "all rotted" from "some are unreachable" at the end.

```js
function orangesRotting(grid) {
  const rows = grid.length, cols = grid[0].length;
  const queue = [];
  let fresh = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2) queue.push([r, c]);   // ALL sources start together
      else if (grid[r][c] === 1) fresh++;
    }
  }
  if (fresh === 0) return 0;                      // nothing to rot

  let head = 0, minutes = 0;

  while (head < queue.length && fresh > 0) {
    const levelSize = queue.length - head;        // this minute's rotten oranges
    minutes++;

    for (let i = 0; i < levelSize; i++) {
      const [r, c] = queue[head++];

      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (grid[nr][nc] !== 1) continue;

        grid[nr][nc] = 2;                         // mark on ENQUEUE
        fresh--;
        queue.push([nr, nc]);
      }
    }
  }
  return fresh === 0 ? minutes : -1;              // leftovers = unreachable
}
```

**Complexity:** O(rows · cols) time and space.
**Pitfalls:** returning 0 when there were no fresh oranges to begin with; counting an extra minute after the last spread (the `fresh > 0` loop guard prevents that).

---

## P105: Pacific Atlantic Water Flow

`Medium` · The classic "invert the direction of the search" trick.

**Q:** Water flows from a cell to a 4-adjacent cell of **equal or lower** height. Return all cells from which water can reach **both** the Pacific (top/left edges) and the Atlantic (bottom/right edges).

**Strategy:** Doing a search *from* every cell to find whether it reaches both oceans is O((mn)²). Reverse it: start **at the oceans** and walk *uphill* (to neighbours with height `≥` current). That marks every cell that can drain into that ocean. Do it for each ocean and intersect the two sets — two passes, O(mn).

"Search backwards from the goal" is a reusable move whenever the destinations are few and the sources are many.

```js
function pacificAtlantic(heights) {
  const rows = heights.length, cols = heights[0].length;
  const pacific = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const atlantic = Array.from({ length: rows }, () => new Array(cols).fill(false));

  // walk UPHILL from an ocean edge, marking everything that can drain to it
  const climb = (r, c, seen, prevHeight) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (seen[r][c]) return;
    if (heights[r][c] < prevHeight) return;      // water can't flow uphill to here

    seen[r][c] = true;
    for (const [dr, dc] of DIRECTIONS) climb(r + dr, c + dc, seen, heights[r][c]);
  };

  for (let r = 0; r < rows; r++) {
    climb(r, 0, pacific, -Infinity);              // left edge  → Pacific
    climb(r, cols - 1, atlantic, -Infinity);      // right edge → Atlantic
  }
  for (let c = 0; c < cols; c++) {
    climb(0, c, pacific, -Infinity);              // top edge    → Pacific
    climb(rows - 1, c, atlantic, -Infinity);      // bottom edge → Atlantic
  }

  const result = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pacific[r][c] && atlantic[r][c]) result.push([r, c]);   // reaches both
    }
  }
  return result;
}
```

**Complexity:** O(rows · cols) time and space.
**Pitfall:** the comparison direction. Going *outward from the ocean* means you require `heights[r][c] >= prevHeight` — the opposite of the flow rule stated in the problem.

---

## P106: Course Schedule I & II

`Medium` · Cycle detection and topological sort. Directly relevant to build systems, migrations and dependency resolution.

**Q1:** Given prerequisite pairs `[a, b]` ("to take `a` you must first take `b`"), can all courses be finished?
**Q2:** Return a valid course order (or `[]` if impossible).

```
numCourses = 2, prerequisites = [[1,0]]       → I: true,  II: [0,1]
numCourses = 2, prerequisites = [[1,0],[0,1]] → I: false, II: []
```

**Strategy — Kahn's algorithm (BFS topological sort):** Build an adjacency list plus an **in-degree** count (how many unmet prerequisites each course has). Start with every zero-in-degree course (no prerequisites) and process them; each time you finish a course, decrement its dependents' in-degrees and enqueue any that hit zero.

If you manage to output all `n` courses, there was no cycle. If fewer, the remainder are stuck in a cycle — one algorithm answers both questions, which is why this framing beats DFS colouring here.

```js
function findOrder(numCourses, prerequisites) {
  const adjacency = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);

  for (const [course, prereq] of prerequisites) {
    adjacency[prereq].push(course);   // finishing prereq unlocks course
    inDegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) if (inDegree[i] === 0) queue.push(i);

  const order = [];
  let head = 0;

  while (head < queue.length) {
    const course = queue[head++];
    order.push(course);

    for (const next of adjacency[course]) {
      if (--inDegree[next] === 0) queue.push(next);   // all prerequisites met
    }
  }

  return order.length === numCourses ? order : [];    // short → a cycle exists
}

const canFinish = (n, prerequisites) => findOrder(n, prerequisites).length === n;
```

**Complexity:** O(V + E) time and space.
**Pitfalls:** edge direction — `[a, b]` means `b → a`. Reversing it produces a valid-looking but wrong order. Note the order isn't unique; any topological order is acceptable.
**DFS alternative:** three-colour marking (`0` unvisited, `1` in the current recursion stack, `2` finished). Hitting a `1` means a cycle. Reverse post-order gives the topological order. Know both; Kahn's is easier to get right under pressure.

---

## P107: Union-Find — Connected Components & Redundant Connection

`Medium` · The data structure for "are these in the same group?" under incremental merging.

**Q1:** Count connected components in an undirected graph with `n` nodes and an edge list.
**Q2:** In a graph that is a tree **plus one extra edge**, return that redundant edge.

**Strategy:** Union-Find (Disjoint Set Union) keeps each element pointing at a representative of its set. Two optimisations make it effectively O(1) per operation:
- **Path compression** — during `find`, re-point nodes directly at the root, flattening the tree.
- **Union by size/rank** — always attach the smaller tree under the larger, keeping trees shallow.

Then: component count = `n` minus the number of *successful* unions (each merge reduces the count by one). And the redundant edge is the first edge whose endpoints are **already** in the same set — adding it would create a cycle.

Union-Find beats DFS when edges arrive incrementally or you need many "same group?" queries; DFS beats it when you need the actual paths.

```js
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);  // each its own root
    this.size = new Array(n).fill(1);
    this.components = n;
  }

  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];   // path compression (halving)
      x = this.parent[x];
    }
    return x;
  }

  // returns false if a and b were ALREADY connected (i.e. this edge makes a cycle)
  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;

    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];  // attach smaller → larger
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    this.components--;
    return true;
  }
}

function countComponents(n, edges) {
  const dsu = new DSU(n);
  for (const [a, b] of edges) dsu.union(a, b);
  return dsu.components;
}

function findRedundantConnection(edges) {
  const dsu = new DSU(edges.length + 1);        // nodes are 1-indexed
  for (const [a, b] of edges) {
    if (!dsu.union(a, b)) return [a, b];        // already connected → the cycle edge
  }
  return [];
}
```

**Complexity:** near O(1) amortised per operation (inverse-Ackermann, α(n) < 5 for any realistic n). O(n) space.
**Also solves:** *Number of Islands II* (islands appearing one at a time — DFS would need a full re-scan per addition), *Accounts Merge*, *Kruskal's MST*, *Satisfiability of Equality Equations*.

---

## P108: Network Delay Time (Dijkstra)

`Medium` · Weighted shortest path = BFS with a priority queue.

**Q:** Directed edges `[u, v, w]` with travel time `w`. How long until a signal from node `k` reaches **all** nodes? `-1` if some are unreachable.

**Strategy:** BFS finds shortest paths only when every edge costs the same — with weights, a longer-hop route can be cheaper. Dijkstra fixes that by always expanding the **closest unfinished node** next, using a min-heap keyed by distance. When a node is popped for the first time, its distance is final (no cheaper route can still be waiting, since all weights are non-negative). The answer is the maximum finalised distance.

```js
function networkDelayTime(times, n, k) {
  const adjacency = new Map();
  for (const [u, v, w] of times) {
    if (!adjacency.has(u)) adjacency.set(u, []);
    adjacency.get(u).push([v, w]);
  }

  const dist = new Array(n + 1).fill(Infinity);   // 1-indexed nodes
  const heap = new MinHeap((a, b) => a[0] - b[0]); // [distance, node]
  heap.push([0, k]);

  while (heap.size()) {
    const [d, node] = heap.pop();
    if (d >= dist[node]) continue;                 // already finalised, cheaper or equal
    dist[node] = d;                                // first pop = shortest distance

    for (const [next, weight] of adjacency.get(node) ?? []) {
      if (d + weight < dist[next]) heap.push([d + weight, next]);
    }
  }

  let slowest = 0;
  for (let i = 1; i <= n; i++) {
    if (dist[i] === Infinity) return -1;           // unreachable node
    slowest = Math.max(slowest, dist[i]);
  }
  return slowest;
}
```

**Complexity:** O(E log V) time, O(V + E) space.
**Pitfalls:** the `if (d >= dist[node]) continue` skip is what keeps stale heap entries harmless — without it you re-expand nodes and lose the complexity guarantee. Dijkstra is **invalid with negative weights** — that needs Bellman-Ford (O(V·E), and it also detects negative cycles). Mention this; it's a standard follow-up.

---

## P109: Word Ladder

`Hard` · BFS on an implicit graph — the graph is never built.

**Q:** Transform `beginWord` into `endWord` one letter at a time, where every intermediate word must be in `wordList`. Return the number of words in the shortest such sequence, or 0.

```
begin = "hit", end = "cog", list = ["hot","dot","dog","lot","log","cog"] → 5
("hit" → "hot" → "dot" → "dog" → "cog")
```

**Strategy:** Words are nodes; an edge exists between words differing by one letter. All edges cost the same → **BFS gives the shortest path**. The graph is never materialised: neighbours are *generated* by trying all 26 letters at each position and keeping the candidates present in the word set.

That's O(L · 26) neighbour generation per word, which beats comparing against every other word (O(N · L)) whenever the list is large.

```js
function ladderLength(beginWord, endWord, wordList) {
  const words = new Set(wordList);
  if (!words.has(endWord)) return 0;                // unreachable by definition

  let queue = [beginWord];
  const visited = new Set([beginWord]);
  let steps = 1;                                     // the begin word counts as 1

  while (queue.length) {
    const next = [];

    for (const word of queue) {
      if (word === endWord) return steps;

      for (let i = 0; i < word.length; i++) {
        for (let code = 97; code < 123; code++) {    // 'a'..'z'
          const candidate = word.slice(0, i) + String.fromCharCode(code) + word.slice(i + 1);

          if (words.has(candidate) && !visited.has(candidate)) {
            visited.add(candidate);                  // mark on ENQUEUE
            next.push(candidate);
          }
        }
      }
    }
    queue = next;
    steps++;
  }
  return 0;
}
```

**Complexity:** O(N · L² · 26) worst case (the `L` slicing cost inside the L positions), O(N · L) space.
**Optimisation to mention:** **bidirectional BFS** — search from both ends and stop when the frontiers meet. It roughly square-roots the explored space, which is a big deal here.

---
---

# Pattern 16 — Bit Manipulation, Math & Matrix

These are memorisation problems more than reasoning problems. Learn the tricks outright; they're short, they come up in MCQ rounds too, and JS has a specific gotcha: **all bitwise operators coerce to 32-bit signed integers**, so use `>>> 0` when you want an unsigned result.

### The bit tricks worth memorising
```js
n & 1                  // is n odd?
n >> 1                 // n / 2 (floor, for non-negatives)
n & (n - 1)            // clears the LOWEST set bit          ← counting bits
n & (-n)               // isolates the lowest set bit
(n & (n - 1)) === 0    // is n a power of two? (n > 0)
a ^ a === 0            // XOR: a number cancels itself       ← finding singles
a ^ 0 === a            // XOR with 0 is identity
1 << k                 // 2^k — a bitmask with only bit k set
n | (1 << k)           // set bit k
n & ~(1 << k)          // clear bit k
(n >> k) & 1           // read bit k
n >>> 1                // UNSIGNED right shift — use for bit-reversal loops
```

---

## P110: Single Number (I, II, III)

`Easy` / `Medium` · The XOR family.

**Q:** Every element appears twice except one. Find it, in O(n) time and O(1) space.

```
[4,1,2,1,2] → 4
```

**Strategy:** XOR has two properties that solve this outright: `a ^ a = 0` and `a ^ 0 = a`, and it's commutative/associative so order is irrelevant. XOR everything together and all the pairs annihilate, leaving the single value.

```js
function singleNumber(nums) {
  let result = 0;
  for (const n of nums) result ^= n;    // pairs cancel; the loner survives
  return result;
}

// Single Number III: exactly TWO singles, everything else in pairs
function singleNumberIII(nums) {
  let xorBoth = 0;
  for (const n of nums) xorBoth ^= n;   // = a ^ b (the two singles)

  // any set bit in a^b is a bit where a and b DIFFER — pick the lowest
  const differingBit = xorBoth & (-xorBoth);

  let a = 0, b = 0;
  for (const n of nums) {
    if (n & differingBit) a ^= n;       // partition by that bit: a and b separate,
    else b ^= n;                        // and each pair stays together
  }
  return [a, b];
}
```

**Complexity:** O(n) / O(1).
**Single Number II** (everything appears three times except one): XOR doesn't work — sum each bit position mod 3, or use the two-mask `ones`/`twos` trick. Say which approach you'd take; the bit-counting version is much easier to derive live.

---

## P111: Number of 1 Bits & Counting Bits

`Easy` · Two related classics.

**Q1:** Count the set bits in an unsigned 32-bit integer (Hamming weight).
**Q2:** For every `i` in `0..n`, return the number of set bits.

**Strategy (I):** `n & (n - 1)` clears the lowest set bit (subtracting 1 flips that bit to 0 and everything below it to 1; the AND wipes them). So loop until zero, counting iterations — that runs once per *set* bit, not 32 times.

**Strategy (II):** DP on bits. Every `i` is `(i >> 1)` with one extra bit appended, so `bits[i] = bits[i >> 1] + (i & 1)`. Since `i >> 1 < i`, it's already computed. O(n) total instead of O(n log n).

```js
function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= (n - 1);      // clear the lowest set bit
    count++;
  }
  return count;
}

function countBits(n) {
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    bits[i] = bits[i >> 1] + (i & 1);   // same as i/2's bits, plus i's last bit
  }
  return bits;
}
```

**Complexity:** `hammingWeight` O(set bits); `countBits` O(n) / O(n).
**JS pitfall:** for inputs with the top bit set, use `n >>>= 1` (unsigned) in any shifting loop — `>>` preserves the sign bit and loops forever on negatives.

---

## P112: Missing Number & Find All Numbers Disappeared

`Easy` · Two O(1)-space techniques worth having.

**Q1:** An array holds `n` distinct numbers from `0..n` — find the missing one.
**Q2:** An array of length `n` holds values in `1..n` with some duplicates — find all missing values, O(1) space.

**Strategy (I):** Two options. **Sum:** the expected total is `n(n+1)/2`; subtract the actual. **XOR:** XOR all indices `0..n` with all values — every present number cancels its index, leaving the missing one. XOR can't overflow, which is why it's the safer answer in other languages.

**Strategy (II):** Use the array itself as the hash table. Values are in `1..n`, so for each value `v`, negate the element at index `|v| - 1` as a "seen" mark. Afterwards, any index still holding a positive number was never marked → `index + 1` is missing. Sign as a marker bit is a reusable trick when the value range matches the index range.

```js
function missingNumber(nums) {
  let result = nums.length;                  // start with n (the index with no element)
  for (let i = 0; i < nums.length; i++) {
    result ^= i ^ nums[i];                   // each present value cancels its index
  }
  return result;
}

function findDisappearedNumbers(nums) {
  for (const n of nums) {
    const index = Math.abs(n) - 1;
    if (nums[index] > 0) nums[index] = -nums[index];   // mark "value index+1 is present"
  }

  const missing = [];
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] > 0) missing.push(i + 1);     // never marked → absent
  }
  return missing;
}
```

**Complexity:** O(n) / O(1) both.
**Pitfall:** `Math.abs` is required when reading values in the second pass — earlier marks may already have flipped them.

---

## P113: Reverse Bits

`Easy` · The JS unsigned-shift trap in one problem.

**Q:** Reverse the bits of a 32-bit unsigned integer.

**Strategy:** Pull bits off the input's low end and push them onto the output's low end, shifting the output left each round — 32 iterations. In JS you must use `>>>` on the input (sign-preserving `>>` would loop forever on a value with the top bit set) and `>>> 0` on the result to reinterpret it as unsigned.

```js
function reverseBits(n) {
  let result = 0;

  for (let i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1);   // shift output left, append input's lowest bit
    n >>>= 1;                            // UNSIGNED shift — mandatory in JS
  }
  return result >>> 0;                   // reinterpret as unsigned 32-bit
}
```

**Complexity:** O(32) = O(1).
**Pitfall:** omitting the final `>>> 0` returns a negative number whenever bit 31 ends up set.

---

## P114: Sum of Two Integers (no `+`)

`Medium` · Pure bit reasoning — reimplementing a full adder.

**Q:** Add two integers without using `+` or `-`.

**Strategy:** `a ^ b` gives the sum ignoring carries; `(a & b) << 1` gives the carries shifted into their next position. Add those two together — recursively, by the same method — until there's no carry left. That's exactly how hardware ripple-carry addition works.

JS bitwise ops are 32-bit signed, which is precisely the width this algorithm assumes, so negatives work automatically via two's complement.

```js
function getSum(a, b) {
  while (b !== 0) {
    const carry = (a & b) << 1;   // bits where BOTH are 1 carry to the next position
    a = a ^ b;                     // sum without carries
    b = carry;                     // now add the carries in
  }
  return a;
}
```

**Trace** (`a=3` `0011`, `b=5` `0101`): carry `(0001)<<1 = 0010`, a = `0110` (6), b = `0010`. → carry `(0010)<<1 = 0100`, a = `0100` (4), b = `0100`. → carry `(0100)<<1=1000`, a = `0000`, b = `1000`. → carry 0, a = `1000` = **8**. ✅

**Complexity:** O(32) = O(1).

---

## P115: Pow(x, n) — Fast Exponentiation

`Medium` · Divide and conquer on the exponent. Used everywhere in real crypto/modular-arithmetic code.

**Q:** Compute `x^n` (n may be negative) faster than n multiplications.

**Strategy:** `x^n = (x^(n/2))²` for even `n`, and `x · x^(n-1)` for odd `n`. Halving the exponent each step gives O(log n). Iteratively: walk the bits of `n`, squaring `x` each round and multiplying into the result whenever the current bit is 1 — because `n` is a sum of powers of two, and `x^(a+b) = x^a · x^b`.

Negative exponent: invert `x` and negate `n`.

```js
function myPow(x, n) {
  if (n < 0) { x = 1 / x; n = -n; }

  let result = 1;
  while (n > 0) {
    if (n % 2 === 1) result *= x;   // this bit of n is set → include this power
    x *= x;                          // x, x^2, x^4, x^8, …
    n = Math.floor(n / 2);
  }
  return result;
}
```

**Complexity:** O(log n) time, O(1) space.
**Pitfall:** use `Math.floor(n / 2)` rather than `n >> 1` — the exponent can exceed the 32-bit range that bitwise operators truncate to. For modular exponentiation, take the modulus after every multiplication.

---

## P116: Rotate Image

`Medium` · In-place matrix rotation via a two-step decomposition.

**Q:** Rotate an `n × n` matrix 90° clockwise, **in place**.

```
[[1,2,3],        [[7,4,1],
 [4,5,6],   →     [8,5,2],
 [7,8,9]]         [9,6,3]]
```

**Strategy:** Rotating directly requires 4-way cyclic swaps and painful index math. Decompose instead:

> **transpose** (reflect across the main diagonal) **then reverse each row** = 90° clockwise.

Both steps are trivially correct and easy to verify by hand. (Counter-clockwise = transpose, then reverse each *column* — or reverse the row order first, then transpose.)

```js
function rotate(matrix) {
  const n = matrix.length;

  // 1. transpose: swap across the main diagonal (j starts at i → each pair once)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    }
  }

  // 2. reverse each row
  for (const row of matrix) row.reverse();

  return matrix;
}
```

**Complexity:** O(n²) time, O(1) space.
**Pitfall:** `j = i + 1`. Starting at `j = 0` swaps every pair twice and leaves the matrix unchanged.

---

## P117: Spiral Matrix & Set Matrix Zeroes

`Medium` · Boundary discipline, and the "encode state in the input" trick.

**Q1:** Return all elements of an `m × n` matrix in spiral order.
**Q2:** If an element is 0, set its entire row and column to 0 — using O(1) extra space.

**Strategy (Spiral):** Keep four boundaries (`top`, `bottom`, `left`, `right`) and peel one edge at a time, shrinking the boundary you just consumed. The trap is non-square matrices: after the top row and right column, you must **re-check that the boundaries haven't crossed** before doing the bottom row and left column, or you'll re-emit a single remaining row or column.

**Strategy (Set Zeroes):** A `visited` matrix is O(mn); row/column flag arrays are O(m+n). For O(1), store the flags **inside the matrix itself** — use row 0 and column 0 as the marker arrays. Since cell `(0,0)` would serve both, track column 0 with a separate boolean. Then write the zeroes back **from the inside out**, so you don't clobber the markers before reading them.

```js
function spiralOrder(matrix) {
  const result = [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) result.push(matrix[top][c]);      // → top row
    top++;

    for (let r = top; r <= bottom; r++) result.push(matrix[r][right]);    // ↓ right col
    right--;

    if (top <= bottom) {                                                  // ← re-check!
      for (let c = right; c >= left; c--) result.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {                                                  // ↑ re-check!
      for (let r = bottom; r >= top; r--) result.push(matrix[r][left]);
      left++;
    }
  }
  return result;
}

function setZeroes(matrix) {
  const rows = matrix.length, cols = matrix[0].length;
  let firstColHasZero = false;

  // pass 1: record which rows/cols need zeroing, in row 0 and col 0
  for (let r = 0; r < rows; r++) {
    if (matrix[r][0] === 0) firstColHasZero = true;      // col 0 needs its own flag
    for (let c = 1; c < cols; c++) {
      if (matrix[r][c] === 0) { matrix[r][0] = 0; matrix[0][c] = 0; }
    }
  }

  // pass 2: apply, working inward-out so markers stay readable
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 1; c--) {
      if (matrix[r][0] === 0 || matrix[0][c] === 0) matrix[r][c] = 0;
    }
    if (firstColHasZero) matrix[r][0] = 0;
  }
  return matrix;
}
```

**Complexity:** both O(m·n) time, O(1) extra space.
**Pitfall (Spiral):** the two `if` re-checks. Test with a single row `[[1,2,3]]` and a single column — that's where it breaks.

---
---

# The 4-Week Practice Plan

Volume is not the goal — **pattern recall under time pressure** is. 100 problems solved with real understanding beats 400 skimmed.

### Week 1 — Foundations (aim: ~25 problems)
| Day | Focus | Problems |
|---|---|---|
| 1–2 | Hashing & frequency | P1–P9 |
| 3 | Prefix / running values | P10–P14 |
| 4–5 | Two pointers | P15–P21 |
| 6–7 | Sliding window | P22–P27 + re-solve P1, P12 from scratch |

### Week 2 — Structures (aim: ~25 problems)
| Day | Focus | Problems |
|---|---|---|
| 1–2 | Strings & ad-hoc | P28–P36 |
| 3 | Stack & monotonic stack | P37–P43 |
| 4–5 | Binary search (incl. on the answer) | P44–P50 |
| 6–7 | Linked lists | P51–P55 |

### Week 3 — Recursion & Trees (aim: ~25 problems)
| Day | Focus | Problems |
|---|---|---|
| 1–3 | Trees & recursion | P56–P68 |
| 4 | Heaps & top-K (**write `MinHeap` from memory**) | P69–P73 |
| 5 | Greedy | P74–P79 |
| 6 | Intervals | P80–P84 |
| 7 | Backtracking | P85–P91 |

### Week 4 — The Hard Half & Simulation (aim: ~20 problems + 4 mocks)
| Day | Focus | Problems |
|---|---|---|
| 1–2 | Dynamic programming | P92–P101 |
| 3–4 | Graphs | P102–P109 |
| 5 | Bit manipulation, math, matrix | P110–P117 |
| 6–7 | **Timed mocks:** 4 sessions of 2 problems in 45 minutes, no IDE hints, talking out loud |

### The daily loop (90 minutes)
1. **20 min** — attempt a *new* problem cold. Hard stop at 20 minutes; struggling past that stops teaching you anything.
2. **10 min** — read the solution, then close it and identify **which pattern** it was and **what signal** in the statement pointed there.
3. **15 min** — re-implement it from scratch with the solution closed. This is the step that actually builds recall, and it's the one everyone skips.
4. **10 min** — write the pattern + signal + a one-line insight into a personal notes file.
5. **35 min** — re-solve **two problems from previous days** from a blank file. Spaced repetition matters more than new volume.

### Rules that make the difference
- **Always dry-run before running.** Predict the output first, then check. If you're surprised, you didn't understand it.
- **Talk out loud, even alone.** In a real interview you must code and narrate simultaneously; that's a separate skill and it needs reps.
- **Keep a bug log.** Off-by-one? Uninitialised max? Forgot to un-choose? Two weeks of logging will show you your *three* recurring mistakes, and knowing them is worth more than 50 extra problems.
- **Re-solve, don't re-read.** Recognising a solution feels like knowing it. It isn't.

---

# Timed Assessment Triage

For a 70–90 minute automated screen with 3–4 problems (HackerRank, Codility, CodeSignal). See the [Platform Playbook](00-platform-playbook.md) for per-platform scoring specifics.

### Minute 0–5: read everything first
Read **all** problems before writing a line. Rank them easy → hard, then solve in that order. Marks are per test case, not per problem — an unstarted easy problem is the most expensive mistake available.

### Per-problem time boxes
| Problem count | Time each | Hard stop |
|---|---|---|
| 4 in 70 min | 15 min | 18 min, then move on |
| 3 in 90 min | 25 min | 30 min |

Leave **10 minutes** at the end for edge cases and re-submission.

### The 60% rule
A brute force that passes the small test cases scores far more than an elegant solution that doesn't compile. **Always submit the working brute force first**, then optimise. Most platforms keep your best submission.

### When stuck at the 10-minute mark
1. Re-read the constraints. `n ≤ 20` means backtracking is *expected*; `n ≤ 10^5` forbids O(n²). The constraint often *is* the hint.
2. Write out a 4-element example by hand. The pattern usually surfaces.
3. Scan the [pattern-recognition table](03-coding-challenges-dsa-javascript.md#pattern-recognition-table) for the problem's key phrase.
4. Still stuck → **write the brute force, submit it, move on.** Come back only if time remains.

### Before every submit
Test: `[]` · `[x]` · all-identical · already sorted · reverse sorted · negatives and zero · duplicates · the maximum-size input (does it time out?).

---

# The Top 40 Must-Do List

If you only have a week, do exactly these. They cover every pattern and roughly 80% of what gets asked.

| # | Problem | Pattern | Why it's essential |
|---|---|---|---|
| 1 | [Two Sum](03-coding-challenges-dsa-javascript.md#p1-two-sum) | Hash map | The universal warm-up |
| 2 | [Valid Anagram](03-coding-challenges-dsa-javascript.md#p3-valid-anagram) | Frequency count | The counting idiom |
| 3 | [Group Anagrams](03-coding-challenges-dsa-javascript.md#p4-group-anagrams) | Canonical key | Bucketing by signature |
| 4 | [Top K Frequent](03-coding-challenges-dsa-javascript.md#p5-top-k-frequent-elements) | Bucket sort / heap | Top-K without sorting |
| 5 | [Product Except Self](03-coding-challenges-dsa-javascript.md#p10-product-of-array-except-self) | Prefix/suffix | O(1) space trick |
| 6 | [Subarray Sum Equals K](03-coding-challenges-dsa-javascript.md#p12-subarray-sum-equals-k) | Prefix + map | The most reusable combo |
| 7 | [Maximum Subarray](03-coding-challenges-dsa-javascript.md#p13-maximum-subarray-kadane) | Kadane | Greedy = tiny DP |
| 8 | [Best Time to Buy/Sell](03-coding-challenges-dsa-javascript.md#p11-best-time-to-buy-and-sell-stock) | Running min | Everyone asks it |
| 9 | [Valid Palindrome](03-coding-challenges-dsa-javascript.md#p15-valid-palindrome) | Two pointers | The template |
| 10 | [3Sum](03-coding-challenges-dsa-javascript.md#p17-3sum) | Sort + two pointers | Dedup discipline |
| 11 | [Container With Most Water](03-coding-challenges-dsa-javascript.md#p18-container-with-most-water) | Two pointers | The discard argument |
| 12 | [Trapping Rain Water](03-coding-challenges-dsa-javascript.md#p19-trapping-rain-water) | Two pointers | Hard but standard |
| 13 | [Longest Substring w/o Repeats](03-coding-challenges-dsa-javascript.md#p22-longest-substring-without-repeating-characters) | Sliding window | The #1 medium |
| 14 | [Longest Repeating Char Replacement](03-coding-challenges-dsa-javascript.md#p23-longest-repeating-character-replacement) | Sliding window | Derived validity |
| 15 | [Minimum Window Substring](03-coding-challenges-dsa-javascript.md#p25-minimum-window-substring) | Sliding window | The hard-window boss |
| 16 | [Longest Palindromic Substring](03-coding-challenges-dsa-javascript.md#p28-longest-palindromic-substring) | Expand center | String classic |
| 17 | [Valid Parentheses](03-coding-challenges-dsa-javascript.md#p37-valid-parentheses) | Stack | Canonical stack |
| 18 | [Min Stack](03-coding-challenges-dsa-javascript.md#p38-min-stack) | Stack design | O(1) guarantees |
| 19 | [Daily Temperatures](03-coding-challenges-dsa-javascript.md#p40-daily-temperatures) | Monotonic stack | Next-greater template |
| 20 | [Binary Search](03-coding-challenges-dsa-javascript.md#p44-binary-search--the-only-template-you-need) | Binary search | Get the template exact |
| 21 | [Search in Rotated Array](03-coding-challenges-dsa-javascript.md#p46-search-in-rotated-sorted-array) | Binary search | Very common |
| 22 | [Koko Eating Bananas](03-coding-challenges-dsa-javascript.md#p48-koko-eating-bananas-binary-search-on-the-answer) | BS on the answer | Unlocks a family |
| 23 | [Reverse Linked List](03-coding-challenges-dsa-javascript.md#p51-reverse-a-linked-list) | Pointers | Must be automatic |
| 24 | [Merge Two Sorted Lists](03-coding-challenges-dsa-javascript.md#p52-merge-two-sorted-lists) | Dummy head | Building block |
| 25 | [Linked List Cycle](03-coding-challenges-dsa-javascript.md#p53-linked-list-cycle--find-where-it-starts) | Floyd | Know both phases |
| 26 | [LRU Cache](03-coding-challenges-dsa-javascript.md#p55-lru-cache) | Design | **The** backend design question |
| 27 | [Maximum Depth of Tree](#p56-maximum-depth-of-a-binary-tree) | Tree recursion | The template |
| 28 | [Validate BST](#p62-validate-binary-search-tree) | Bound passing | The #1 tree mistake |
| 29 | [Level Order Traversal](#p61-level-order-traversal--right-side-view) | BFS | Level boundaries |
| 30 | [Lowest Common Ancestor](#p64-lowest-common-ancestor) | Tree recursion | Both variants |
| 31 | [Serialize/Deserialize Tree](#p66-serialize-and-deserialize-a-binary-tree) | Design | Encoding the shape |
| 32 | [Implement Trie](#p68-implement-a-trie-prefix-tree) | Trie | Autocomplete, routing |
| 33 | [Kth Largest Element](#p69-kth-largest-element-in-an-array) | Heap / quickselect | Three-tier answer |
| 34 | [Merge Intervals](#p81-merge-intervals) | Sort + sweep | Real-world constantly |
| 35 | [Meeting Rooms II](#p83-meeting-rooms-i--ii) | Sweep line | Capacity planning |
| 36 | [Subsets](#p85-subsets--subsets-ii) | Backtracking | The template |
| 37 | [Combination Sum](#p86-combination-sum) | Backtracking | Reuse vs no reuse |
| 38 | [Coin Change](#p94-coin-change) | DP knapsack | Why greedy fails |
| 39 | [Number of Islands](#p102-number-of-islands) | Grid DFS | Grid template |
| 40 | [Course Schedule](#p106-course-schedule-i--ii) | Topological sort | Dependency resolution |

---

# When You Get Stuck — the recovery script

Silence is what actually fails interviews. Have these sentences ready.

**You don't know the pattern yet:**
> *"Let me work through a small example by hand first — I want to see the structure before I commit to an approach."*

Then narrate the hand-solve. The interviewer hears reasoning, and you will usually find the pattern in the middle of it.

**You know the brute force but not the optimisation:**
> *"The brute force is O(n²): check every pair. Let me code that first so we have something correct, then look for what it recomputes."*

This is almost always the right move. Working code plus a clear optimisation direction beats a broken clever attempt.

**You're stuck mid-code:**
> *"I think my window-shrink condition is wrong here. Let me trace `'abba'` through it."*

Debugging out loud is a *positive* signal — it's exactly what the job is.

**You genuinely have no idea:**
> *"I haven't seen this pattern before. Can I ask a clarifying question about the constraints? If `n` is small enough I'd start with exhaustive search and refine from there."*

Honesty plus a plan beats flailing. Interviewers hire people who make progress when they don't already know the answer.

**Never say:** "I've seen this one before but I forget it." It offers nothing and reads as fishing for the answer.

---

## Related Files

- [← Part 1: Meta layer, Hashing, Two Pointers, Sliding Window, Strings, Stack, Binary Search, Linked Lists](03-coding-challenges-dsa-javascript.md)
- [Online Assessment Platform Playbook](00-platform-playbook.md) — which platform asks what, and how it's scored
- [JavaScript / TypeScript Deep Dive](../phase-1-core-programming/01-javascript-typescript-deep-dive.md) — the language semantics behind the JS toolkit
- [Design Patterns in Practice](../phase-1-core-programming/05-design-patterns-in-practice.md) — for the design-flavoured questions (LRU, Trie, MedianFinder)
- [System Design Roadmap](../phase-5-system-design/00-roadmap.md) — where caching, sharding and consistency questions go next
