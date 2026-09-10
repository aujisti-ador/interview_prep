import { ProblemSeed } from './types';

/**
 * Linked lists, trees, heaps, tries and bit manipulation.
 *
 * Linked-list and tree problems use the standard `ListNode` / `TreeNode` shapes.
 * The runner builds real node structures from the array form before calling you,
 * and serialises your return value back, so you write exactly the code you would
 * write in a real assessment.
 */
export const structureProblems: ProblemSeed[] = [
  // ------------------------------------------------- Linked List
  {
    id: 'reverse-linked-list',
    title: 'Reverse Linked List',
    pattern: 'Linked List',
    difficulty: 'easy',
    week: 2,
    frequency: 5,
    prompt:
      'Given the `head` of a singly linked list, reverse the list and return the new head.\n\n`ListNode` is available: `{ val, next }`.',
    functionName: 'reverseList',
    starterCode: 'function reverseList(head) {\n  // your code here\n}',
    hints: [
      'Three pointers: prev, curr, and a saved next.',
      'Save `curr.next` BEFORE you overwrite it, or you lose the rest of the list.',
    ],
    solution:
      'function reverseList(head) {\n  let prev = null;\n  let curr = head;\n  while (curr) {\n    const next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'reverse-linked-list',
    tests: {
      argTypes: ['list'],
      returnType: 'list',
      cases: [
        { args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
        { args: [[1, 2]], expected: [2, 1] },
        { args: [[]], expected: [] },
      ],
    },
  },
  {
    id: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    pattern: 'Linked List',
    difficulty: 'easy',
    week: 2,
    frequency: 4,
    prompt: 'Merge two sorted linked lists `list1` and `list2` into one sorted list and return its head.',
    functionName: 'mergeTwoLists',
    starterCode: 'function mergeTwoLists(list1, list2) {\n  // your code here\n}',
    hints: ['A dummy head node removes every special case around the first element.', 'After the loop, splice on whichever list still has nodes.'],
    solution:
      'function mergeTwoLists(list1, list2) {\n  const dummy = { val: 0, next: null };\n  let tail = dummy;\n  while (list1 && list2) {\n    if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; }\n    else { tail.next = list2; list2 = list2.next; }\n    tail = tail.next;\n  }\n  tail.next = list1 || list2;\n  return dummy.next;\n}',
    complexity: 'O(n + m) time, O(1) space.',
    leetcode: 'merge-two-sorted-lists',
    tests: {
      argTypes: ['list', 'list'],
      returnType: 'list',
      cases: [
        { args: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
        { args: [[], []], expected: [] },
        { args: [[], [0]], expected: [0] },
        { args: [[5], [1, 2, 3]], expected: [1, 2, 3, 5] },
      ],
    },
  },
  {
    id: 'linked-list-cycle',
    title: 'Linked List Cycle',
    pattern: 'Linked List',
    difficulty: 'easy',
    week: 2,
    frequency: 4,
    prompt:
      'Given `head` of a linked list, return `true` if the list has a cycle.\n\nTest inputs give `{ values, pos }` where `pos` is the index the tail connects to (-1 for no cycle) — the runner builds the real cyclic list for you.',
    functionName: 'hasCycle',
    starterCode: 'function hasCycle(head) {\n  // your code here\n}',
    hints: [
      'A Set of visited nodes works but costs O(n) memory.',
      'Floyd\'s tortoise and hare: slow moves 1, fast moves 2. If they ever meet, there is a cycle.',
    ],
    solution:
      'function hasCycle(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n    if (slow === fast) return true;\n  }\n  return false;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'linked-list-cycle',
    tests: {
      argTypes: ['listCycle'],
      cases: [
        { args: [{ values: [3, 2, 0, -4], pos: 1 }], expected: true },
        { args: [{ values: [1, 2], pos: 0 }], expected: true },
        { args: [{ values: [1], pos: -1 }], expected: false },
        { args: [{ values: [1, 2, 3], pos: -1 }], expected: false },
      ],
    },
  },
  {
    id: 'remove-nth-from-end',
    title: 'Remove Nth Node From End of List',
    pattern: 'Linked List',
    difficulty: 'medium',
    week: 2,
    frequency: 4,
    prompt: 'Given the `head` of a linked list, remove the `n`-th node from the end and return the head.',
    functionName: 'removeNthFromEnd',
    starterCode: 'function removeNthFromEnd(head, n) {\n  // your code here\n}',
    hints: [
      'Two passes (count, then walk) is fine. One pass is nicer.',
      'Advance a fast pointer n steps first, then move both until fast hits the end — slow lands just before the target. Use a dummy head so removing the first node is not special.',
    ],
    solution:
      'function removeNthFromEnd(head, n) {\n  const dummy = { val: 0, next: head };\n  let fast = dummy, slow = dummy;\n  for (let i = 0; i < n; i++) fast = fast.next;\n  while (fast.next) { fast = fast.next; slow = slow.next; }\n  slow.next = slow.next.next;\n  return dummy.next;\n}',
    complexity: 'O(n) time, O(1) space, single pass.',
    leetcode: 'remove-nth-node-from-end-of-list',
    tests: {
      argTypes: ['list', 'raw'],
      returnType: 'list',
      cases: [
        { args: [[1, 2, 3, 4, 5], 2], expected: [1, 2, 3, 5] },
        { args: [[1], 1], expected: [] },
        { args: [[1, 2], 1], expected: [1] },
        { args: [[1, 2], 2], expected: [2] },
      ],
    },
  },
  {
    id: 'reorder-list',
    title: 'Reorder List',
    pattern: 'Linked List',
    difficulty: 'medium',
    week: 2,
    frequency: 3,
    prompt:
      'Given a list `L0 -> L1 -> ... -> Ln-1 -> Ln`, reorder it to `L0 -> Ln -> L1 -> Ln-1 -> ...`. Reorder the nodes themselves (do not just swap values) and return the head.',
    functionName: 'reorderList',
    starterCode: 'function reorderList(head) {\n  // your code here\n  return head;\n}',
    hints: [
      'Three sub-problems you already know: find the middle, reverse the second half, merge alternately.',
      'Cut the list at the middle (`slow.next = null`) before reversing, or you build a cycle.',
    ],
    solution:
      'function reorderList(head) {\n  if (!head || !head.next) return head;\n  let slow = head, fast = head.next;\n  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }\n  let second = slow.next;\n  slow.next = null;\n  let prev = null;\n  while (second) { const nx = second.next; second.next = prev; prev = second; second = nx; }\n  let first = head, back = prev;\n  while (back) {\n    const f = first.next, b = back.next;\n    first.next = back;\n    back.next = f;\n    first = f; back = b;\n  }\n  return head;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'reorder-list',
    tests: {
      argTypes: ['list'],
      returnType: 'list',
      cases: [
        { args: [[1, 2, 3, 4]], expected: [1, 4, 2, 3] },
        { args: [[1, 2, 3, 4, 5]], expected: [1, 5, 2, 4, 3] },
        { args: [[1]], expected: [1] },
        { args: [[1, 2]], expected: [1, 2] },
      ],
    },
  },
  {
    id: 'merge-k-sorted-lists',
    title: 'Merge k Sorted Lists',
    pattern: 'Linked List',
    difficulty: 'hard',
    week: 2,
    frequency: 3,
    prompt: 'You are given an array of `k` sorted linked lists. Merge them into one sorted list and return its head.',
    functionName: 'mergeKLists',
    starterCode: 'function mergeKLists(lists) {\n  // your code here\n}',
    hints: [
      'Merging one at a time is O(kN) — correct but slow, and interviewers will push back.',
      'Pairwise merge (divide and conquer) gives O(N log k) with the two-list merge you already wrote.',
    ],
    solution:
      'function mergeKLists(lists) {\n  const mergeTwo = (a, b) => {\n    const dummy = { val: 0, next: null };\n    let t = dummy;\n    while (a && b) {\n      if (a.val <= b.val) { t.next = a; a = a.next; } else { t.next = b; b = b.next; }\n      t = t.next;\n    }\n    t.next = a || b;\n    return dummy.next;\n  };\n  let queue = lists.filter(Boolean);\n  if (queue.length === 0) return null;\n  while (queue.length > 1) {\n    const next = [];\n    for (let i = 0; i < queue.length; i += 2) {\n      next.push(i + 1 < queue.length ? mergeTwo(queue[i], queue[i + 1]) : queue[i]);\n    }\n    queue = next;\n  }\n  return queue[0];\n}',
    complexity: 'O(N log k) time where N is total nodes, O(1) extra space beyond recursion/queue.',
    leetcode: 'merge-k-sorted-lists',
    tests: {
      argTypes: ['listArray'],
      returnType: 'list',
      cases: [
        { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
        { args: [[]], expected: [] },
        { args: [[[]]], expected: [] },
        { args: [[[2], [1]]], expected: [1, 2] },
      ],
    },
  },

  // ------------------------------------------------- Trees
  {
    id: 'invert-binary-tree',
    title: 'Invert Binary Tree',
    pattern: 'Trees',
    difficulty: 'easy',
    week: 2,
    frequency: 4,
    prompt:
      'Given the `root` of a binary tree, invert it (mirror left and right everywhere) and return the root.\n\nTrees are given in level-order array form with `null` for missing children.',
    functionName: 'invertTree',
    starterCode: 'function invertTree(root) {\n  // your code here\n}',
    hints: ['Swap the children, then recurse into both.', 'An iterative BFS with a queue does the same thing if you want to avoid recursion.'],
    solution:
      'function invertTree(root) {\n  if (!root) return null;\n  const tmp = root.left;\n  root.left = root.right;\n  root.right = tmp;\n  invertTree(root.left);\n  invertTree(root.right);\n  return root;\n}',
    complexity: 'O(n) time, O(h) space for the recursion stack.',
    leetcode: 'invert-binary-tree',
    tests: {
      argTypes: ['tree'],
      returnType: 'tree',
      cases: [
        { args: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] },
        { args: [[2, 1, 3]], expected: [2, 3, 1] },
        { args: [[]], expected: [] },
      ],
    },
  },
  {
    id: 'max-depth-binary-tree',
    title: 'Maximum Depth of Binary Tree',
    pattern: 'Trees',
    difficulty: 'easy',
    week: 2,
    frequency: 4,
    prompt: 'Return the maximum depth (number of nodes on the longest root-to-leaf path) of a binary tree.',
    functionName: 'maxDepth',
    starterCode: 'function maxDepth(root) {\n  // your code here\n}',
    hints: ['depth(node) = 1 + max(depth(left), depth(right)).', 'Base case: null has depth 0.'],
    solution:
      'function maxDepth(root) {\n  if (!root) return 0;\n  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}',
    complexity: 'O(n) time, O(h) space.',
    leetcode: 'maximum-depth-of-binary-tree',
    tests: {
      argTypes: ['tree'],
      cases: [
        { args: [[3, 9, 20, null, null, 15, 7]], expected: 3 },
        { args: [[1, null, 2]], expected: 2 },
        { args: [[]], expected: 0 },
      ],
    },
  },
  {
    id: 'same-tree',
    title: 'Same Tree',
    pattern: 'Trees',
    difficulty: 'easy',
    week: 2,
    frequency: 3,
    prompt: 'Given the roots of two binary trees, return `true` if they are structurally identical and have the same values.',
    functionName: 'isSameTree',
    starterCode: 'function isSameTree(p, q) {\n  // your code here\n}',
    hints: ['Both null -> true. One null -> false. Values differ -> false.', 'Otherwise recurse on both pairs of children.'],
    solution:
      'function isSameTree(p, q) {\n  if (!p && !q) return true;\n  if (!p || !q || p.val !== q.val) return false;\n  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);\n}',
    complexity: 'O(n) time, O(h) space.',
    leetcode: 'same-tree',
    tests: {
      argTypes: ['tree', 'tree'],
      cases: [
        { args: [[1, 2, 3], [1, 2, 3]], expected: true },
        { args: [[1, 2], [1, null, 2]], expected: false },
        { args: [[1, 2, 1], [1, 1, 2]], expected: false },
        { args: [[], []], expected: true },
      ],
    },
  },
  {
    id: 'subtree-of-another-tree',
    title: 'Subtree of Another Tree',
    pattern: 'Trees',
    difficulty: 'easy',
    week: 2,
    frequency: 3,
    prompt: 'Given the roots `root` and `subRoot`, return `true` if `subRoot` appears as a subtree of `root` (matching structure and values).',
    functionName: 'isSubtree',
    starterCode: 'function isSubtree(root, subRoot) {\n  // your code here\n}',
    hints: ['Reuse `isSameTree` as a helper.', 'At every node of root, either it matches subRoot exactly, or one of its children contains it.'],
    solution:
      'function isSubtree(root, subRoot) {\n  const same = (a, b) => {\n    if (!a && !b) return true;\n    if (!a || !b || a.val !== b.val) return false;\n    return same(a.left, b.left) && same(a.right, b.right);\n  };\n  if (!subRoot) return true;\n  if (!root) return false;\n  if (same(root, subRoot)) return true;\n  return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);\n}',
    complexity: 'O(n * m) worst case time, O(h) space.',
    leetcode: 'subtree-of-another-tree',
    tests: {
      argTypes: ['tree', 'tree'],
      cases: [
        { args: [[3, 4, 5, 1, 2], [4, 1, 2]], expected: true },
        { args: [[3, 4, 5, 1, 2, null, null, null, null, 0], [4, 1, 2]], expected: false },
        { args: [[1, 1], [1]], expected: true },
      ],
    },
  },
  {
    id: 'balanced-binary-tree',
    title: 'Balanced Binary Tree',
    pattern: 'Trees',
    difficulty: 'easy',
    week: 2,
    frequency: 3,
    prompt: 'Return `true` if a binary tree is height-balanced — every node\'s two subtrees differ in height by at most one.',
    functionName: 'isBalanced',
    starterCode: 'function isBalanced(root) {\n  // your code here\n}',
    hints: [
      'Computing height separately at every node gives O(n^2).',
      'Do one post-order pass returning height, and propagate -1 as a "already unbalanced" sentinel.',
    ],
    solution:
      'function isBalanced(root) {\n  const height = (n) => {\n    if (!n) return 0;\n    const l = height(n.left);\n    if (l === -1) return -1;\n    const r = height(n.right);\n    if (r === -1) return -1;\n    if (Math.abs(l - r) > 1) return -1;\n    return 1 + Math.max(l, r);\n  };\n  return height(root) !== -1;\n}',
    complexity: 'O(n) time, O(h) space.',
    leetcode: 'balanced-binary-tree',
    tests: {
      argTypes: ['tree'],
      cases: [
        { args: [[3, 9, 20, null, null, 15, 7]], expected: true },
        { args: [[1, 2, 2, 3, 3, null, null, 4, 4]], expected: false },
        { args: [[]], expected: true },
      ],
    },
  },
  {
    id: 'diameter-of-binary-tree',
    title: 'Diameter of Binary Tree',
    pattern: 'Trees',
    difficulty: 'easy',
    week: 2,
    frequency: 3,
    prompt: 'Return the length of the longest path between any two nodes in a binary tree, measured in edges. The path need not pass through the root.',
    functionName: 'diameterOfBinaryTree',
    starterCode: 'function diameterOfBinaryTree(root) {\n  // your code here\n}',
    hints: [
      'For each node, the best path THROUGH it is leftHeight + rightHeight.',
      'Return height upward, record the diameter in a closure variable. One pass.',
    ],
    solution:
      'function diameterOfBinaryTree(root) {\n  let best = 0;\n  const height = (n) => {\n    if (!n) return 0;\n    const l = height(n.left);\n    const r = height(n.right);\n    best = Math.max(best, l + r);\n    return 1 + Math.max(l, r);\n  };\n  height(root);\n  return best;\n}',
    complexity: 'O(n) time, O(h) space.',
    leetcode: 'diameter-of-binary-tree',
    tests: {
      argTypes: ['tree'],
      cases: [
        { args: [[1, 2, 3, 4, 5]], expected: 3 },
        { args: [[1, 2]], expected: 1 },
        { args: [[]], expected: 0 },
      ],
    },
  },
  {
    id: 'binary-tree-level-order',
    title: 'Binary Tree Level Order Traversal',
    pattern: 'Trees',
    difficulty: 'medium',
    week: 2,
    frequency: 4,
    prompt: 'Return the level-order traversal of a binary tree as an array of arrays, one per level, left to right.',
    functionName: 'levelOrder',
    starterCode: 'function levelOrder(root) {\n  // your code here\n}',
    hints: ['BFS with a queue.', 'Snapshot `queue.length` at the top of each iteration — that count is exactly one level.'],
    solution:
      'function levelOrder(root) {\n  if (!root) return [];\n  const out = [];\n  let queue = [root];\n  while (queue.length) {\n    const level = [];\n    const next = [];\n    for (const node of queue) {\n      level.push(node.val);\n      if (node.left) next.push(node.left);\n      if (node.right) next.push(node.right);\n    }\n    out.push(level);\n    queue = next;\n  }\n  return out;\n}',
    complexity: 'O(n) time, O(n) space.',
    leetcode: 'binary-tree-level-order-traversal',
    tests: {
      argTypes: ['tree'],
      cases: [
        { args: [[3, 9, 20, null, null, 15, 7]], expected: [[3], [9, 20], [15, 7]] },
        { args: [[1]], expected: [[1]] },
        { args: [[]], expected: [] },
      ],
    },
  },
  {
    id: 'right-side-view',
    title: 'Binary Tree Right Side View',
    pattern: 'Trees',
    difficulty: 'medium',
    week: 2,
    frequency: 3,
    prompt: 'Imagine standing to the right of a binary tree. Return the values of the nodes you can see, ordered top to bottom.',
    functionName: 'rightSideView',
    starterCode: 'function rightSideView(root) {\n  // your code here\n}',
    hints: ['It is level-order traversal where you keep only the last node of each level.', 'Careful: the rightmost visible node may come from a left subtree.'],
    solution:
      'function rightSideView(root) {\n  if (!root) return [];\n  const out = [];\n  let queue = [root];\n  while (queue.length) {\n    out.push(queue[queue.length - 1].val);\n    const next = [];\n    for (const n of queue) {\n      if (n.left) next.push(n.left);\n      if (n.right) next.push(n.right);\n    }\n    queue = next;\n  }\n  return out;\n}',
    complexity: 'O(n) time, O(n) space.',
    leetcode: 'binary-tree-right-side-view',
    tests: {
      argTypes: ['tree'],
      cases: [
        { args: [[1, 2, 3, null, 5, null, 4]], expected: [1, 3, 4] },
        { args: [[1, null, 3]], expected: [1, 3] },
        { args: [[1, 2, 3, 4]], expected: [1, 3, 4] },
        { args: [[]], expected: [] },
      ],
    },
  },
  {
    id: 'validate-bst',
    title: 'Validate Binary Search Tree',
    pattern: 'Trees',
    difficulty: 'medium',
    week: 2,
    frequency: 5,
    prompt: 'Determine whether a binary tree is a valid binary search tree: every node in the left subtree is strictly less, every node in the right subtree strictly greater.',
    functionName: 'isValidBST',
    starterCode: 'function isValidBST(root) {\n  // your code here\n}',
    hints: [
      'The classic wrong answer only compares a node to its direct children — that passes trees that are not BSTs.',
      'Carry a (min, max) bound down the recursion and tighten it at each step.',
    ],
    solution:
      'function isValidBST(root) {\n  const check = (n, lo, hi) => {\n    if (!n) return true;\n    if ((lo !== null && n.val <= lo) || (hi !== null && n.val >= hi)) return false;\n    return check(n.left, lo, n.val) && check(n.right, n.val, hi);\n  };\n  return check(root, null, null);\n}',
    complexity: 'O(n) time, O(h) space.',
    leetcode: 'validate-binary-search-tree',
    tests: {
      argTypes: ['tree'],
      cases: [
        { args: [[2, 1, 3]], expected: true },
        { args: [[5, 1, 4, null, null, 3, 6]], expected: false },
        { args: [[5, 4, 6, null, null, 3, 7]], expected: false },
        { args: [[]], expected: true },
      ],
    },
  },
  {
    id: 'kth-smallest-bst',
    title: 'Kth Smallest Element in a BST',
    pattern: 'Trees',
    difficulty: 'medium',
    week: 2,
    frequency: 3,
    prompt: 'Given the root of a BST and an integer `k`, return the k-th smallest value (1-indexed).',
    functionName: 'kthSmallest',
    starterCode: 'function kthSmallest(root, k) {\n  // your code here\n}',
    hints: ['In-order traversal of a BST yields sorted values.', 'Stop as soon as you have taken k of them — do not traverse the whole tree.'],
    solution:
      'function kthSmallest(root, k) {\n  const stack = [];\n  let curr = root;\n  while (curr || stack.length) {\n    while (curr) { stack.push(curr); curr = curr.left; }\n    curr = stack.pop();\n    if (--k === 0) return curr.val;\n    curr = curr.right;\n  }\n  return -1;\n}',
    complexity: 'O(h + k) time, O(h) space.',
    leetcode: 'kth-smallest-element-in-a-bst',
    tests: {
      argTypes: ['tree', 'raw'],
      cases: [
        { args: [[3, 1, 4, null, 2], 1], expected: 1 },
        { args: [[5, 3, 6, 2, 4, null, null, 1], 3], expected: 3 },
        { args: [[3, 1, 4, null, 2], 4], expected: 4 },
      ],
    },
  },
  {
    id: 'lowest-common-ancestor-bst',
    title: 'Lowest Common Ancestor of a BST',
    pattern: 'Trees',
    difficulty: 'medium',
    week: 2,
    frequency: 3,
    prompt:
      'Given a BST root and two values `p` and `q` that exist in the tree, return the value of their lowest common ancestor.\n\n(Adapted signature: takes and returns values rather than node references.)',
    functionName: 'lowestCommonAncestor',
    starterCode: 'function lowestCommonAncestor(root, p, q) {\n  // your code here\n}',
    hints: [
      'Use the BST ordering — you never need to search both subtrees.',
      'If both p and q are smaller than the node, go left. Both larger, go right. Otherwise you are standing on the split point, which is the LCA.',
    ],
    solution:
      'function lowestCommonAncestor(root, p, q) {\n  let node = root;\n  while (node) {\n    if (p < node.val && q < node.val) node = node.left;\n    else if (p > node.val && q > node.val) node = node.right;\n    else return node.val;\n  }\n  return null;\n}',
    complexity: 'O(h) time, O(1) space.',
    leetcode: 'lowest-common-ancestor-of-a-binary-search-tree',
    tests: {
      argTypes: ['tree', 'raw', 'raw'],
      cases: [
        { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8], expected: 6 },
        { args: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4], expected: 2 },
        { args: [[2, 1], 2, 1], expected: 2 },
      ],
    },
  },

  // ------------------------------------------------- Heap / Priority Queue
  {
    id: 'kth-largest-element',
    title: 'Kth Largest Element in an Array',
    pattern: 'Heap',
    difficulty: 'medium',
    week: 3,
    frequency: 4,
    prompt: 'Return the k-th largest element in an unsorted array `nums`. This is the k-th largest by sorted order, not the k-th distinct value.',
    functionName: 'findKthLargest',
    starterCode: 'function findKthLargest(nums, k) {\n  // your code here\n}',
    hints: [
      'Sorting is O(n log n) and will be accepted, but say out loud that you know the better options.',
      'A min-heap of size k gives O(n log k). Quickselect gives O(n) average — mention it even if you code the heap.',
    ],
    solution:
      'function findKthLargest(nums, k) {\n  // Min-heap of size k, implemented as a binary heap on an array.\n  const heap = [];\n  const up = (i) => {\n    while (i > 0) {\n      const p = (i - 1) >> 1;\n      if (heap[p] <= heap[i]) break;\n      [heap[p], heap[i]] = [heap[i], heap[p]];\n      i = p;\n    }\n  };\n  const down = (i) => {\n    for (;;) {\n      const l = 2 * i + 1, r = l + 1;\n      let s = i;\n      if (l < heap.length && heap[l] < heap[s]) s = l;\n      if (r < heap.length && heap[r] < heap[s]) s = r;\n      if (s === i) break;\n      [heap[s], heap[i]] = [heap[i], heap[s]];\n      i = s;\n    }\n  };\n  for (const n of nums) {\n    heap.push(n);\n    up(heap.length - 1);\n    if (heap.length > k) {\n      heap[0] = heap[heap.length - 1];\n      heap.pop();\n      down(0);\n    }\n  }\n  return heap[0];\n}',
    complexity: 'O(n log k) time, O(k) space.',
    leetcode: 'kth-largest-element-in-an-array',
    tests: {
      cases: [
        { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
        { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
        { args: [[1], 1], expected: 1 },
        { args: [[7, 6, 5, 4, 3, 2, 1], 7], expected: 1 },
      ],
    },
  },
  {
    id: 'k-closest-points',
    title: 'K Closest Points to Origin',
    pattern: 'Heap',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt: 'Given an array of `points` on a plane and an integer `k`, return the `k` points closest to the origin. Order does not matter.',
    functionName: 'kClosest',
    starterCode: 'function kClosest(points, k) {\n  // your code here\n}',
    hints: ['You never need the actual distance — squared distance preserves ordering and avoids the sqrt.', 'Max-heap of size k, or partial sort.'],
    solution:
      'function kClosest(points, k) {\n  return [...points]\n    .sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]))\n    .slice(0, k);\n}',
    complexity: 'O(n log n) as written; O(n log k) with a size-k max-heap, O(n) average with quickselect.',
    leetcode: 'k-closest-points-to-origin',
    tests: {
      compare: 'unorderedOuter',
      cases: [
        { args: [[[1, 3], [-2, 2]], 1], expected: [[-2, 2]] },
        { args: [[[3, 3], [5, -1], [-2, 4]], 2], expected: [[3, 3], [-2, 4]] },
        { args: [[[0, 1], [1, 0]], 2], expected: [[0, 1], [1, 0]] },
      ],
    },
  },
  {
    id: 'task-scheduler',
    title: 'Task Scheduler',
    pattern: 'Heap',
    difficulty: 'medium',
    week: 3,
    frequency: 3,
    prompt:
      'Given a list of CPU `tasks` (letters) and a cooldown `n`, identical tasks must be separated by at least `n` intervals. Return the minimum number of intervals needed to finish all tasks.',
    functionName: 'leastInterval',
    starterCode: 'function leastInterval(tasks, n) {\n  // your code here\n}',
    hints: [
      'A greedy simulation with a max-heap works, but there is a closed form.',
      'The most frequent task defines the skeleton: (maxCount - 1) * (n + 1) + (how many tasks tie for maxCount). Answer is the max of that and tasks.length.',
    ],
    solution:
      'function leastInterval(tasks, n) {\n  const counts = new Map();\n  for (const t of tasks) counts.set(t, (counts.get(t) || 0) + 1);\n  const values = [...counts.values()];\n  const maxCount = Math.max(...values);\n  const ties = values.filter((v) => v === maxCount).length;\n  return Math.max(tasks.length, (maxCount - 1) * (n + 1) + ties);\n}',
    complexity: 'O(n) time, O(26) space.',
    leetcode: 'task-scheduler',
    tests: {
      cases: [
        { args: [['A', 'A', 'A', 'B', 'B', 'B'], 2], expected: 8 },
        { args: [['A', 'A', 'A', 'B', 'B', 'B'], 0], expected: 6 },
        { args: [['A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], 2], expected: 16 },
      ],
    },
  },
  {
    id: 'find-median-from-stream',
    title: 'Find Median from Data Stream',
    pattern: 'Heap',
    difficulty: 'hard',
    week: 3,
    frequency: 3,
    prompt:
      'Design a class `MedianFinder` with `addNum(num)` and `findMedian()`. `findMedian` returns the median of all numbers added so far.',
    functionName: 'MedianFinder',
    starterCode:
      'class MedianFinder {\n  constructor() {\n    // your code here\n  }\n  addNum(num) {}\n  findMedian() {}\n}',
    hints: [
      'Keep the lower half in a max-heap and the upper half in a min-heap.',
      'Balance so the heaps differ in size by at most one; the median is then a peek (or the mean of two peeks).',
      'A sorted-insert array is O(n) per add — acceptable to state, but say the two-heap answer.',
    ],
    solution:
      'class MedianFinder {\n  constructor() {\n    this.lo = []; // max-heap (negated)\n    this.hi = []; // min-heap\n  }\n  _push(heap, val) {\n    heap.push(val);\n    let i = heap.length - 1;\n    while (i > 0) {\n      const p = (i - 1) >> 1;\n      if (heap[p] <= heap[i]) break;\n      [heap[p], heap[i]] = [heap[i], heap[p]];\n      i = p;\n    }\n  }\n  _pop(heap) {\n    const top = heap[0];\n    const last = heap.pop();\n    if (heap.length) {\n      heap[0] = last;\n      let i = 0;\n      for (;;) {\n        const l = 2 * i + 1, r = l + 1;\n        let s = i;\n        if (l < heap.length && heap[l] < heap[s]) s = l;\n        if (r < heap.length && heap[r] < heap[s]) s = r;\n        if (s === i) break;\n        [heap[s], heap[i]] = [heap[i], heap[s]];\n        i = s;\n      }\n    }\n    return top;\n  }\n  addNum(num) {\n    this._push(this.lo, -num);\n    this._push(this.hi, -this._pop(this.lo));\n    if (this.hi.length > this.lo.length) this._push(this.lo, -this._pop(this.hi));\n  }\n  findMedian() {\n    if (this.lo.length > this.hi.length) return -this.lo[0];\n    return (-this.lo[0] + this.hi[0]) / 2;\n  }\n}',
    complexity: 'O(log n) per add, O(1) per median query.',
    leetcode: 'find-median-from-data-stream',
    tests: {
      mode: 'ops',
      cases: [
        {
          ops: ['MedianFinder', 'addNum', 'addNum', 'findMedian', 'addNum', 'findMedian'],
          args: [[], [1], [2], [], [3], []],
          expected: [null, null, null, 1.5, null, 2],
        },
        {
          ops: ['MedianFinder', 'addNum', 'findMedian', 'addNum', 'findMedian', 'addNum', 'findMedian'],
          args: [[], [-1], [], [-2], [], [-3], []],
          expected: [null, null, -1, null, -1.5, null, -2],
        },
      ],
    },
  },

  // ------------------------------------------------- Tries
  {
    id: 'implement-trie',
    title: 'Implement Trie (Prefix Tree)',
    pattern: 'Tries',
    difficulty: 'medium',
    week: 4,
    frequency: 3,
    prompt:
      'Implement a class `Trie` with `insert(word)`, `search(word)` and `startsWith(prefix)`.\n\nThis is the data structure behind autocomplete — expect it as a warm-up before a typeahead system design question.',
    functionName: 'Trie',
    starterCode:
      'class Trie {\n  constructor() {\n    // your code here\n  }\n  insert(word) {}\n  search(word) {}\n  startsWith(prefix) {}\n}',
    hints: [
      'Each node is a map from character to child node, plus an end-of-word flag.',
      'search and startsWith share a walk helper; only the final check differs.',
    ],
    solution:
      'class Trie {\n  constructor() {\n    this.root = { children: new Map(), end: false };\n  }\n  insert(word) {\n    let node = this.root;\n    for (const ch of word) {\n      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), end: false });\n      node = node.children.get(ch);\n    }\n    node.end = true;\n  }\n  _walk(s) {\n    let node = this.root;\n    for (const ch of s) {\n      if (!node.children.has(ch)) return null;\n      node = node.children.get(ch);\n    }\n    return node;\n  }\n  search(word) {\n    const n = this._walk(word);\n    return !!n && n.end;\n  }\n  startsWith(prefix) {\n    return this._walk(prefix) !== null;\n  }\n}',
    complexity: 'O(L) per operation where L is word length, O(total characters) space.',
    leetcode: 'implement-trie-prefix-tree',
    tests: {
      mode: 'ops',
      cases: [
        {
          ops: ['Trie', 'insert', 'search', 'search', 'startsWith', 'insert', 'search'],
          args: [[], ['apple'], ['apple'], ['app'], ['app'], ['app'], ['app']],
          expected: [null, null, true, false, true, null, true],
        },
        {
          ops: ['Trie', 'insert', 'startsWith', 'search'],
          args: [[], ['dhaka'], ['dha'], ['dhak']],
          expected: [null, null, true, false],
        },
      ],
    },
  },
  {
    id: 'design-add-search-words',
    title: 'Design Add and Search Words',
    pattern: 'Tries',
    difficulty: 'medium',
    week: 4,
    frequency: 3,
    prompt:
      'Implement a class `WordDictionary` with `addWord(word)` and `search(word)`, where `search` may contain `.` as a wildcard matching any single letter.',
    functionName: 'WordDictionary',
    starterCode:
      'class WordDictionary {\n  constructor() {\n    // your code here\n  }\n  addWord(word) {}\n  search(word) {}\n}',
    hints: ['Same trie as before — the difference is entirely in search.', 'On a `.`, recurse into every child.'],
    solution:
      'class WordDictionary {\n  constructor() {\n    this.root = { children: new Map(), end: false };\n  }\n  addWord(word) {\n    let node = this.root;\n    for (const ch of word) {\n      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), end: false });\n      node = node.children.get(ch);\n    }\n    node.end = true;\n  }\n  search(word) {\n    const dfs = (node, i) => {\n      if (i === word.length) return node.end;\n      const ch = word[i];\n      if (ch === ".") {\n        for (const child of node.children.values()) {\n          if (dfs(child, i + 1)) return true;\n        }\n        return false;\n      }\n      const next = node.children.get(ch);\n      return next ? dfs(next, i + 1) : false;\n    };\n    return dfs(this.root, 0);\n  }\n}',
    complexity: 'O(L) for add; O(26^d * L) worst case for search with d wildcards.',
    leetcode: 'design-add-and-search-words-data-structure',
    tests: {
      mode: 'ops',
      cases: [
        {
          ops: ['WordDictionary', 'addWord', 'addWord', 'addWord', 'search', 'search', 'search', 'search'],
          args: [[], ['bad'], ['dad'], ['mad'], ['pad'], ['bad'], ['.ad'], ['b..']],
          expected: [null, null, null, null, false, true, true, true],
        },
      ],
    },
  },

  // ------------------------------------------------- Bit Manipulation
  {
    id: 'number-of-1-bits',
    title: 'Number of 1 Bits',
    pattern: 'Bit Manipulation',
    difficulty: 'easy',
    week: 4,
    frequency: 2,
    prompt: 'Given an unsigned 32-bit integer `n`, return the number of set bits (its Hamming weight).',
    functionName: 'hammingWeight',
    starterCode: 'function hammingWeight(n) {\n  // your code here\n}',
    hints: ['Shift and mask is the obvious loop.', '`n & (n - 1)` clears the lowest set bit — that loop runs once per set bit instead of 32 times.'],
    solution:
      'function hammingWeight(n) {\n  let count = 0;\n  while (n !== 0) {\n    n &= n - 1;\n    count++;\n  }\n  return count;\n}',
    complexity: 'O(number of set bits) time, O(1) space.',
    leetcode: 'number-of-1-bits',
    tests: {
      cases: [
        { args: [11], expected: 3 },
        { args: [128], expected: 1 },
        { args: [0], expected: 0 },
        { args: [2147483647], expected: 31 },
      ],
    },
  },
  {
    id: 'counting-bits',
    title: 'Counting Bits',
    pattern: 'Bit Manipulation',
    difficulty: 'easy',
    week: 4,
    frequency: 2,
    prompt: 'Given an integer `n`, return an array `ans` of length `n + 1` where `ans[i]` is the number of 1 bits in `i`.',
    functionName: 'countBits',
    starterCode: 'function countBits(n) {\n  // your code here\n}',
    hints: ['Calling a popcount per number is O(n log n) — fine, but there is a DP.', 'ans[i] = ans[i >> 1] + (i & 1).'],
    solution:
      'function countBits(n) {\n  const ans = new Array(n + 1).fill(0);\n  for (let i = 1; i <= n; i++) ans[i] = ans[i >> 1] + (i & 1);\n  return ans;\n}',
    complexity: 'O(n) time, O(n) space.',
    leetcode: 'counting-bits',
    tests: {
      cases: [
        { args: [2], expected: [0, 1, 1] },
        { args: [5], expected: [0, 1, 1, 2, 1, 2] },
        { args: [0], expected: [0] },
      ],
    },
  },
  {
    id: 'missing-number',
    title: 'Missing Number',
    pattern: 'Bit Manipulation',
    difficulty: 'easy',
    week: 4,
    frequency: 3,
    prompt: 'Given an array `nums` containing `n` distinct numbers from the range `[0, n]`, return the one number that is missing.',
    functionName: 'missingNumber',
    starterCode: 'function missingNumber(nums) {\n  // your code here\n}',
    hints: [
      'Gauss sum: n(n+1)/2 minus the actual sum. Watch for overflow in other languages.',
      'XOR of all indices and all values also works and never overflows.',
    ],
    solution:
      'function missingNumber(nums) {\n  let x = nums.length;\n  for (let i = 0; i < nums.length; i++) x ^= i ^ nums[i];\n  return x;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'missing-number',
    tests: {
      cases: [
        { args: [[3, 0, 1]], expected: 2 },
        { args: [[0, 1]], expected: 2 },
        { args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], expected: 8 },
        { args: [[0]], expected: 1 },
      ],
    },
  },
  {
    id: 'single-number',
    title: 'Single Number',
    pattern: 'Bit Manipulation',
    difficulty: 'easy',
    week: 4,
    frequency: 3,
    prompt: 'Every element in `nums` appears twice except for one. Find it in linear time and constant space.',
    functionName: 'singleNumber',
    starterCode: 'function singleNumber(nums) {\n  // your code here\n}',
    hints: ['The constant-space requirement rules out a hash set.', 'x ^ x === 0 and x ^ 0 === x, so XOR everything together.'],
    solution: 'function singleNumber(nums) {\n  let x = 0;\n  for (const n of nums) x ^= n;\n  return x;\n}',
    complexity: 'O(n) time, O(1) space.',
    leetcode: 'single-number',
    tests: {
      cases: [
        { args: [[2, 2, 1]], expected: 1 },
        { args: [[4, 1, 2, 1, 2]], expected: 4 },
        { args: [[1]], expected: 1 },
      ],
    },
  },
];
