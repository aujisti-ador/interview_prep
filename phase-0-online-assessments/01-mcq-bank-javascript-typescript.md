# MCQ Bank — JavaScript & TypeScript

> **Format:** HackerRank MCQ, TestGorilla "JavaScript", iMocha, Mettl technical section, Karat rapid-fire verification.
> **How to use:** cover the answer, give yourself **45 seconds max** per question — that's the real per-question budget. Anything you can't answer in 45s goes on a flashcard.
> **Deep-dive companion:** [phase-1-core-programming/01-javascript-typescript-deep-dive.md](../phase-1-core-programming/01-javascript-typescript-deep-dive.md)

## Sections
1. [Output Prediction — Event Loop & Async](#1-output-prediction--event-loop--async) (Q1–Q12)
2. [Coercion, Equality & Types](#2-coercion-equality--types) (Q13–Q22)
3. [Scope, Hoisting, Closures & `this`](#3-scope-hoisting-closures--this) (Q23–Q32)
4. [Objects, Arrays & Built-ins](#4-objects-arrays--built-ins) (Q33–Q44)
5. [Prototypes, Classes & Functions](#5-prototypes-classes--functions) (Q45–Q52)
6. [TypeScript](#6-typescript) (Q53–Q70)
7. [Modules — ESM vs CommonJS](#7-modules--esm-vs-commonjs) (Q71–Q75)
8. [Answer-Speed Drill](#answer-speed-drill)

---

## In 60 seconds — how to use this bank

1. **These are 45-second questions, not 5-minute ones.** If you are reasoning carefully, you are
   already too slow. The goal is recognition, not derivation.
2. **The largest category is "what does this print?"** and almost all of those come down to one
   rule: **microtasks (promises) run before macrotasks (timers)**, and synchronous code runs
   before both.
3. **The second largest is coercion.** `==` converts types before comparing, `===` does not.
   Most trick questions live in that gap.
4. **`var` vs `let` in a loop** is close to guaranteed to appear. `var` has one shared binding;
   `let` creates a new one each iteration.
5. **For TypeScript, the recurring themes are:** `any` vs `unknown`, what `never` means, the
   utility types (`Partial`, `Pick`, `Omit`, `Record`), and `satisfies`.
6. **Answer every question.** No negative marking means a guess has positive expected value.

**How to drill this properly:** cover the answer, commit to one out loud, *then* read. Passively
reading questions and agreeing with the explanations feels productive and teaches you almost
nothing.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Microtask** | Promise callbacks. Run before any timer, after the current code finishes |
| **Macrotask** | `setTimeout`, `setInterval`, I/O callbacks |
| **Coercion** | Automatic type conversion, e.g. `"5" == 5` being true |
| **Hoisting** | Declarations moved to the top of scope before execution |
| **TDZ** | Temporal Dead Zone — a `let`/`const` exists but cannot be accessed yet |
| **Closure** | A function keeping access to the variables it was created beside |
| **Prototype chain** | Where JS looks when a property is missing on an object |
| **`this` binding** | Decided by how a function is *called*, except in arrow functions |
| **Pure function** | Same input → same output, no side effects |
| **Shallow vs deep copy** | Copies the top level only · copies everything nested |
| **`any` vs `unknown`** | Disables checking · requires you to narrow before use. Prefer `unknown` |
| **`never`** | A value that cannot exist — the return type of a function that always throws |
| **Utility types** | Built-in type transformers: `Partial`, `Pick`, `Omit`, `Record` |
| **Generic** | A type with a placeholder, filled in at use — `Array<T>` |
| **Type narrowing** | Convincing the compiler a value is a more specific type |
| **`satisfies`** | Check a value matches a type without widening its inferred type |
| **Structural typing** | TypeScript compares shapes, not names |

---

## 1. Output Prediction — Event Loop & Async

**Q1.** What is printed?
```javascript
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
process.nextTick(() => console.log('D'));
console.log('E');
```
A) A E D C B  B) A E C D B  C) A E B C D  D) A B C D E

<details><summary>Answer</summary>

**A) A E D C B**

Synchronous first (`A`, `E`). Then Node drains the **nextTick queue** (`D`) — it has higher priority than the microtask/promise queue. Then microtasks (`C`). Then the timer phase (`B`).

Priority in Node: **sync → `process.nextTick` → promise microtasks → timers/IO/check phases**.
</details>

---

**Q2.** In Node.js, at the top level of a module, what does this print?
```javascript
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
```
A) Always `timeout` then `immediate`
B) Always `immediate` then `timeout`
C) Non-deterministic — order varies between runs
D) Throws

<details><summary>Answer</summary>

**C) Non-deterministic.** At the top level the order depends on how long the process took to bootstrap relative to the timer threshold.

**But inside an I/O callback it is deterministic — `setImmediate` always fires first**, because the check phase comes right after the poll phase:
```javascript
require('fs').readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate')); // always first
});
```
This exact pair is one of the most-asked Node MCQs anywhere.
</details>

---

**Q3.** What is printed?
```javascript
async function f() {
  console.log(1);
  await null;
  console.log(2);
}
f();
console.log(3);
```
A) 1 2 3  B) 1 3 2  C) 3 1 2  D) 1 2 then 3 asynchronously

<details><summary>Answer</summary>

**B) 1 3 2.** The body runs synchronously **up to the first `await`**. `await null` still yields to the microtask queue even though the value isn't a promise. So `3` prints before `2`.
</details>

---

**Q4.** What is printed?
```javascript
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j), 0);
```
A) 0 1 2 0 1 2  B) 3 3 3 0 1 2  C) 3 3 3 3 3 3  D) 0 1 2 3 3 3

<details><summary>Answer</summary>

**B) 3 3 3 0 1 2.** `var` is function-scoped — one binding shared by all three callbacks, value `3` by the time they run. `let` creates a **fresh binding per iteration**.
</details>

---

**Q5.** What does `Promise.all` do when one promise rejects?
A) Waits for all, returns array with an error entry
B) Rejects immediately with the first rejection reason; other promises keep running but their results are discarded
C) Rejects only after all settle
D) Resolves with the successful ones

<details><summary>Answer</summary>

**B.** Fail-fast. The other promises are **not cancelled** (JS promises aren't cancellable) — they continue and their results are ignored. Use `Promise.allSettled` when you need every outcome.
</details>

---

**Q6.** Match each combinator to its behaviour. *(Select the correct mapping.)*

| | Combinator | Behaviour |
|---|---|---|
| 1 | `Promise.all` | a) First **settled** (fulfilled *or* rejected) wins |
| 2 | `Promise.allSettled` | b) All fulfilled, or first rejection |
| 3 | `Promise.race` | c) First **fulfilled** wins; rejects with `AggregateError` only if all reject |
| 4 | `Promise.any` | d) Never rejects; array of `{status, value/reason}` |

<details><summary>Answer</summary>

**1→b, 2→d, 3→a, 4→c.**

Trap: `race` settles on the first *settled* promise — a fast rejection beats a slow success. `any` ignores rejections until they're all in.
</details>

---

**Q7.** What is printed?
```javascript
console.log('start');
setTimeout(() => {
  console.log('t1');
  Promise.resolve().then(() => console.log('p-in-t1'));
}, 0);
setTimeout(() => console.log('t2'), 0);
console.log('end');
```
A) start end t1 t2 p-in-t1  B) start end t1 p-in-t1 t2  C) start end t1 t2 p-in-t1 (Node only)  D) start t1 p-in-t1 t2 end

<details><summary>Answer</summary>

**B) start end t1 p-in-t1 t2.** The microtask queue is drained **between each macrotask callback**, not just at the end of the phase. So the promise queued inside `t1` runs before `t2`.
</details>

---

**Q8.** How long does this take to complete?
```javascript
async function run() {
  const a = await slow(1000);
  const b = await slow(1000);
  return [a, b];
}
```
A) ~1000ms  B) ~2000ms  C) ~0ms  D) Depends on the event loop

<details><summary>Answer</summary>

**B) ~2000ms** — sequential. The parallel version:
```javascript
const [a, b] = await Promise.all([slow(1000), slow(1000)]); // ~1000ms
```
Classic screening question; also a very common "fix this code" task on DevSkiller/TestGorilla debugging tests.
</details>

---

**Q9.** What is the value of `result`?
```javascript
const result = [1, 2, 3].forEach(n => n * 2);
```
A) `[2,4,6]`  B) `6`  C) `undefined`  D) `[1,2,3]`

<details><summary>Answer</summary>

**C) `undefined`.** `forEach` always returns `undefined`. Use `map` to transform.
</details>

---

**Q10.** What happens?
```javascript
[1, 2, 3].forEach(async (n) => { await save(n); });
console.log('done');
```
A) `done` prints after all saves finish
B) `done` prints immediately; the saves run concurrently and errors are unhandled rejections
C) Saves run sequentially
D) TypeError

<details><summary>Answer</summary>

**B.** `forEach` ignores the returned promises. `done` prints immediately, the three `save` calls run concurrently, and any rejection becomes an **unhandled rejection** (which crashes Node ≥15 by default).

Fixes: `await Promise.all(arr.map(async n => save(n)))` for concurrency, or `for (const n of arr) await save(n)` for sequence.
</details>

---

**Q11.** What is printed?
```javascript
function f() {
  try { return 'try'; }
  finally { console.log('finally'); }
}
console.log(f());
```
A) try finally  B) finally try  C) finally only  D) try only

<details><summary>Answer</summary>

**B) `finally` then `try`.** The `finally` block runs before the function actually returns, but the return value was already computed. (If `finally` itself had a `return`, it would **override** the try's return — a favourite trick question.)
</details>

---

**Q12.** Which of these correctly retries an async call 3 times with backoff? *(Select all that apply.)*
```javascript
// A
async function retry(fn, n = 3) {
  for (let i = 0; i < n; i++) {
    try { return await fn(); }
    catch (e) { if (i === n - 1) throw e; await sleep(2 ** i * 100); }
  }
}
// B
async function retry(fn, n = 3) {
  for (let i = 0; i < n; i++) {
    try { return fn(); }
    catch (e) { await sleep(100); }
  }
}
```
<details><summary>Answer</summary>

**Only A.** In B, `return fn()` without `await` means a rejected promise escapes the `try` block entirely — the `catch` never fires, and the retry loop is dead code. `return await fn()` inside a `try` is the one place where the "redundant await" lint rule is wrong.
</details>

---

## 2. Coercion, Equality & Types

**Q13.** `typeof null` returns:
A) `"null"`  B) `"object"`  C) `"undefined"`  D) `"boolean"`

<details><summary>Answer</summary>**B) `"object"`** — a bug preserved since 1995 for backwards compatibility. Use `value === null` to test for null.</details>

---

**Q14.** Which are `true`? *(Select all.)*
```
1) null == undefined
2) null === undefined
3) null >= 0
4) null > 0
5) NaN === NaN
6) Object.is(NaN, NaN)
```
<details><summary>Answer</summary>

**1, 3, 6 are true.**
- `null == undefined` → `true` (special case in the spec).
- `null >= 0` → `true` because **relational** operators convert `null` to `0`; but `null > 0` is `false` and `null == 0` is `false` because **equality** does *not* convert null. This inconsistency is the whole point of the question.
- `NaN === NaN` is `false`; `Object.is(NaN, NaN)` is `true`.
</details>

---

**Q15.** What is `[] + {}`?
A) `"[object Object]"`  B) `0`  C) `"{}"`  D) `NaN`

<details><summary>Answer</summary>**A) `"[object Object]"`.** `[].toString()` is `""`, `{}.toString()` is `"[object Object]"`, and `+` on two non-numbers concatenates strings.</details>

---

**Q16.** What is `typeof NaN`?
A) `"NaN"`  B) `"number"`  C) `"undefined"`  D) `"object"`

<details><summary>Answer</summary>**B) `"number"`.** Detect with `Number.isNaN(x)` (not the global `isNaN`, which coerces: `isNaN('abc')` is `true`).</details>

---

**Q17.** `0.1 + 0.2 === 0.3` evaluates to:
A) `true`  B) `false`  C) Throws  D) Depends on runtime

<details><summary>Answer</summary>**B) `false`** — IEEE-754 binary floating point; the sum is `0.30000000000000004`. Compare with an epsilon, or store money as integer minor units (paisa/cents) or `NUMERIC` in Postgres.</details>

---

**Q18.** Which values are falsy? *(Select all.)*
`0`, `"0"`, `""`, `[]`, `{}`, `null`, `undefined`, `NaN`, `-0`, `0n`, `"false"`

<details><summary>Answer</summary>

**Falsy: `0`, `""`, `null`, `undefined`, `NaN`, `-0`, `0n`.** There are exactly **eight** falsy values (plus `document.all` in browsers).

`"0"`, `[]`, `{}`, and `"false"` are all **truthy** — `[]` being truthy while `[] == false` is `true` is a favourite follow-up.
</details>

---

**Q19.** `'5' - 3` and `'5' + 3` produce:
A) `2` and `8`  B) `2` and `"53"`  C) `"53"` and `"53"`  D) `NaN` and `"53"`

<details><summary>Answer</summary>**B) `2` and `"53"`.** `-` only has a numeric meaning so it coerces; `+` is overloaded and string-concatenates if either operand is a string.</details>

---

**Q20.** What does `a ?? b` do that `a || b` does not?
A) Nothing, they're aliases
B) `??` only falls back on `null`/`undefined`; `||` falls back on any falsy value
C) `??` is lazy, `||` is eager
D) `??` works on objects only

<details><summary>Answer</summary>

**B.** `const port = process.env.PORT || 3000` silently ignores `PORT=0`; `?? ` doesn't. Both short-circuit.

Bonus trap: mixing `??` with `||` or `&&` without parentheses is a **SyntaxError**: `a ?? b || c` ✗, `(a ?? b) || c` ✓.
</details>

---

**Q21.** What is printed?
```javascript
const obj = { a: undefined, b: () => 1, c: NaN, d: Infinity, e: [1, undefined] };
console.log(JSON.stringify(obj));
```
<details><summary>Answer</summary>

**`{"c":null,"d":null,"e":[1,null]}`**

- `undefined` and function-valued **properties are dropped**
- `NaN` and `Infinity` become `null`
- `undefined` **inside an array** becomes `null` (can't drop an index)
- Also worth knowing: `Date` → ISO string, `Map`/`Set` → `{}`, `BigInt` → **throws** `TypeError`.
</details>

---

**Q22.** `typeof` returns which of these strings?
A) `"array"`  B) `"null"`  C) `"function"`  D) `"date"`

<details><summary>Answer</summary>**C) `"function"`.** The complete set: `undefined, boolean, number, bigint, string, symbol, object, function`. Arrays, dates, and null all report `"object"` — use `Array.isArray()` and `instanceof Date`.</details>

---

## 3. Scope, Hoisting, Closures & `this`

**Q23.** What is printed?
```javascript
console.log(a);
console.log(b);
var a = 1;
let b = 2;
```
A) `undefined`, `undefined`  B) `undefined`, then ReferenceError  C) ReferenceError immediately  D) `1`, `2`

<details><summary>Answer</summary>

**B.** `var` is hoisted and initialised to `undefined`. `let`/`const` are hoisted but sit in the **Temporal Dead Zone** until the declaration executes — accessing them throws `ReferenceError: Cannot access 'b' before initialization`.
</details>

---

**Q24.** What is printed?
```javascript
const obj = {
  name: 'A',
  regular() { return this.name; },
  arrow: () => this?.name,
};
console.log(obj.regular(), obj.arrow());
```
<details><summary>Answer</summary>

**`A undefined`.** Arrow functions have **no own `this`** — they close over the enclosing lexical scope, which at module top level is `module.exports` (`{}` in CJS) or `undefined` (ESM/strict). Never use an arrow for an object method that needs `this`, or for a Mongoose/class prototype method.
</details>

---

**Q25.** What is printed?
```javascript
class Timer {
  constructor() { this.n = 0; }
  startBad() { setInterval(function () { this.n++; }, 100); }
  startGood() { setInterval(() => { this.n++; }, 100); }
}
```
Which method increments correctly, and why?

<details><summary>Answer</summary>

**`startGood`.** In `startBad`, the plain `function` gets its own `this` (in strict/class-body context: `undefined`), so `this.n++` throws. The arrow in `startGood` closes over the instance. Alternatives: `.bind(this)` or `const self = this`.
</details>

---

**Q26.** What does this log?
```javascript
function counter() {
  let c = 0;
  return { inc: () => ++c, get: () => c };
}
const a = counter(), b = counter();
a.inc(); a.inc(); b.inc();
console.log(a.get(), b.get());
```
<details><summary>Answer</summary>**`2 1`.** Each `counter()` call creates a **separate closure** over its own `c`. This is the standard "explain closures" MCQ.</details>

---

**Q27.** `f.bind(objA).bind(objB)()` — what is `this`?
A) `objA`  B) `objB`  C) `undefined`  D) global

<details><summary>Answer</summary>**A) `objA`.** A bound function's `this` is fixed permanently; re-binding has no effect. Same reason `new`-ing a bound function ignores the bound `this` (but `new` *does* win over `bind`).</details>

---

**Q28.** Difference between `call`, `apply`, `bind`?
<details><summary>Answer</summary>

- `fn.call(thisArg, a, b)` — invokes now, args listed
- `fn.apply(thisArg, [a, b])` — invokes now, args as array
- `fn.bind(thisArg, a)` — returns a **new function**, doesn't invoke; supports partial application

Mnemonic: **C**all = **C**ommas, **A**pply = **A**rray, **B**ind = **B**ind later.
</details>

---

**Q29.** What is printed?
```javascript
var x = 10;
function outer() {
  console.log(x);
  var x = 20;
}
outer();
```
A) `10`  B) `20`  C) `undefined`  D) ReferenceError

<details><summary>Answer</summary>**C) `undefined`.** The inner `var x` is hoisted to the top of `outer`, **shadowing** the global before the assignment runs.</details>

---

**Q30.** Which creates a genuine private field?
A) `this._secret = 1`  B) `#secret = 1`  C) `Object.freeze(this)`  D) `const secret` in the class body

<details><summary>Answer</summary>**B) `#secret`** — ES2022 private class fields, enforced by the engine (accessing from outside is a **SyntaxError**, and they don't appear in `Object.keys` or `JSON.stringify`). `_secret` is convention only.</details>

---

**Q31.** What is the output?
```javascript
const fns = [];
for (var i = 0; i < 3; i++) {
  (function (j) { fns.push(() => j); })(i);
}
console.log(fns.map(f => f()));
```
<details><summary>Answer</summary>**`[0, 1, 2]`.** The IIFE captures `i` by value into parameter `j` on each iteration — the pre-ES6 workaround for the `var`-in-loop problem.</details>

---

**Q32.** In strict mode, what is `this` inside a plain function called as `f()`?
A) `globalThis`  B) `undefined`  C) The function itself  D) `module.exports`

<details><summary>Answer</summary>**B) `undefined`.** Non-strict it's `globalThis`. ES modules and class bodies are always strict — a common source of "cannot read property of undefined" when refactoring CJS to ESM.</details>

---

## 4. Objects, Arrays & Built-ins

**Q33.** `[1, 2, 3].map(parseInt)` returns:
A) `[1, 2, 3]`  B) `[1, NaN, NaN]`  C) `[NaN, NaN, NaN]`  D) `[1, 2, NaN]`

<details><summary>Answer</summary>

**B) `[1, NaN, NaN]`.** `map` passes `(value, index, array)`, so it calls `parseInt('1', 0)` → 1 (radix 0 = auto), `parseInt('2', 1)` → NaN (radix 1 invalid), `parseInt('3', 2)` → NaN ('3' isn't a binary digit).

Fix: `.map(Number)` or `.map(s => parseInt(s, 10))`. This is one of the top-3 most-asked JS MCQs in existence.
</details>

---

**Q34.** `[10, 9, 1, 100].sort()` returns:
A) `[1, 9, 10, 100]`  B) `[1, 10, 100, 9]`  C) `[100, 10, 9, 1]`  D) `[10, 9, 1, 100]`

<details><summary>Answer</summary>**B) `[1, 10, 100, 9]`.** Default sort converts to strings and compares UTF-16 code units. Always pass a comparator: `.sort((a, b) => a - b)`. Also note `sort` mutates in place and returns the same array (`toSorted()` is the non-mutating ES2023 version).</details>

---

**Q35.** What does `Array(3).map(() => 0)` return?
A) `[0, 0, 0]`  B) `[undefined × 3]`  C) `[empty × 3]` (unchanged)  D) `[]`

<details><summary>Answer</summary>

**C) `[empty × 3]`.** `Array(3)` creates **holes**, and `map`/`forEach`/`filter` skip holes.

Correct ways to build a filled array: `Array.from({ length: 3 }, () => 0)` or `Array(3).fill(0)`.
</details>

---

**Q36.** After `const arr = [1,2,3]; delete arr[1];`, what are `arr.length` and `arr`?
<details><summary>Answer</summary>**`3`, and `[1, empty, 3]`.** `delete` removes the property but doesn't reindex. Use `splice(1, 1)` to actually remove an element.</details>

---

**Q37.** What is `Object.keys({ b: 1, 2: 2, a: 3, 1: 4 })`?
A) `['b','2','a','1']`  B) `['1','2','b','a']`  C) `['a','b','1','2']`  D) Non-deterministic

<details><summary>Answer</summary>**B) `['1','2','b','a']`.** Integer-like keys come first in ascending numeric order, then string keys in insertion order, then symbols. Use a `Map` when insertion order must be preserved for numeric-looking keys.</details>

---

**Q38.** Which of these is a **deep** copy? *(Select all.)*
A) `{ ...obj }`  B) `Object.assign({}, obj)`  C) `JSON.parse(JSON.stringify(obj))`  D) `structuredClone(obj)`

<details><summary>Answer</summary>

**C and D.** A and B are **shallow** — nested objects are shared references.

`JSON` round-trip loses `undefined`, functions, `Date` (becomes string), `Map`/`Set`, and throws on cycles. `structuredClone` (Node 17+) handles `Date`, `Map`, `Set`, `ArrayBuffer`, and cycles, but throws on functions.
</details>

---

**Q39.** `Object.freeze` — which statements are true? *(Select all.)*
1. Prevents adding new properties
2. Prevents modifying existing properties
3. Freezes nested objects
4. Silently fails in non-strict mode, throws in strict mode

<details><summary>Answer</summary>**1, 2, and 4.** It's **shallow** — `frozen.nested.x = 5` still works. Deep freeze requires recursion.</details>

---

**Q40.** `new Set([1, 1, NaN, NaN, 0, -0]).size` is:
A) `6`  B) `4`  C) `3`  D) `2`

<details><summary>Answer</summary>**C) `3`** → `{1, NaN, 0}`. `Set` uses **SameValueZero**: `NaN` equals `NaN`, and `0` equals `-0`. (Contrast with `===`, where `NaN !== NaN`.)</details>

---

**Q41.** Difference between `Map` and a plain object? *(Select all true.)*
1. `Map` keys can be any type; object keys are strings/symbols
2. `Map` preserves insertion order for all key types
3. `Map` has a `.size`; object requires `Object.keys().length`
4. `Map` is always faster

<details><summary>Answer</summary>**1, 2, 3.** Not 4 — plain objects are faster for small, fixed, string-keyed "record" shapes. `Map` wins for frequent add/delete and non-string keys, and avoids prototype-pollution keys like `__proto__`.</details>

---

**Q42.** `for...in` vs `for...of`?
<details><summary>Answer</summary>

- `for...in` iterates **enumerable string keys, including inherited ones** — on arrays it gives indices as *strings* and picks up anything added to `Array.prototype`.
- `for...of` iterates **values** of any iterable (Array, Map, Set, string, generator) and respects holes as `undefined`.

Rule: `for...of` for arrays, `Object.entries()` for objects. `for...in` on an array is an interview red flag.
</details>

---

**Q43.** What does this print?
```javascript
const { a = 5, b = 5 } = { a: null, b: undefined };
console.log(a, b);
```
<details><summary>Answer</summary>**`null 5`.** Destructuring defaults apply **only for `undefined`**, not `null`. Same rule for function parameter defaults — a very common source of production bugs when a DB returns `null`.</details>

---

**Q44.** Which array method **mutates** the original? *(Select all.)*
`map`, `filter`, `sort`, `reverse`, `slice`, `splice`, `concat`, `push`, `flat`, `fill`

<details><summary>Answer</summary>

**Mutating: `sort`, `reverse`, `splice`, `push`, `fill`.**
Non-mutating: `map`, `filter`, `slice`, `concat`, `flat`.

ES2023 added non-mutating twins: `toSorted`, `toReversed`, `toSpliced`, `with`.
</details>

---

## 5. Prototypes, Classes & Functions

**Q45.** What is printed?
```javascript
function A() {}
A.prototype.hi = () => 'hi';
const a = new A();
console.log(a.hasOwnProperty('hi'), 'hi' in a);
```
<details><summary>Answer</summary>**`false true`.** `hasOwnProperty` checks only own properties; `in` walks the prototype chain.</details>

---

**Q46.** `Object.create(null)` vs `{}`?
<details><summary>Answer</summary>

`Object.create(null)` has **no prototype** — no `toString`, no `hasOwnProperty`, no `__proto__` setter. It's the safe choice for a dictionary built from user input (immune to prototype pollution). `{}` inherits from `Object.prototype`.
</details>

---

**Q47.** What is printed?
```javascript
class A { greet() { return 'A'; } }
class B extends A { greet() { return super.greet() + 'B'; } }
console.log(new B().greet());
```
<details><summary>Answer</summary>**`AB`.** `super.greet()` calls the parent prototype method with `this` bound to the instance.</details>

---

**Q48.** In a derived class constructor, what happens if you use `this` before `super()`?
A) `this` is `undefined`  B) ReferenceError  C) Works fine  D) Silently ignored

<details><summary>Answer</summary>**B) ReferenceError.** `this` is uninitialised until `super()` runs. If a derived class has *no* constructor, an implicit `constructor(...args) { super(...args); }` is generated.</details>

---

**Q49.** Difference between a class field and a prototype method?
```javascript
class A {
  m1() {}            // prototype method
  m2 = () => {};     // class field
}
```
<details><summary>Answer</summary>

`m1` lives once on `A.prototype` — shared, memory-efficient, and `this` depends on the call site.
`m2` is created **per instance** and captures `this` lexically — safe to pass as a callback (`onClick={this.m2}`) but costs memory per object and can't be overridden via the prototype chain.

For NestJS services (singletons), prefer prototype methods.
</details>

---

**Q50.** What is a closure, in one sentence, and name two production uses?
<details><summary>Answer</summary>

A function that retains access to its lexical scope after that scope has returned.

Uses: module-private state (rate-limiter counters, memoisation caches), function factories/currying, `debounce`/`throttle`, and per-request context in middleware. Memory caution: a closure keeps its entire scope alive — a common Node memory-leak source.
</details>

---

**Q51.** `debounce` vs `throttle`?
<details><summary>Answer</summary>

- **Debounce**: run once, *T* ms after activity **stops** (search-as-you-type, autosave).
- **Throttle**: run at most once per *T* ms **during** activity (scroll handlers, metrics flush, API rate limits).
</details>

---

**Q52.** What does this generator print?
```javascript
function* g() { const x = yield 1; console.log(x); yield x * 2; }
const it = g();
console.log(it.next().value);
console.log(it.next(10).value);
```
<details><summary>Answer</summary>**`1`, then `10`, then `20`.** The value passed to `next()` becomes the result of the *paused* `yield` expression. Generators underpin async iteration and libraries like Redux-Saga.</details>

---

## 6. TypeScript

**Q53.** `unknown` vs `any`?
<details><summary>Answer</summary>

Both accept any value, but `unknown` is **not assignable to anything else and cannot be used** without narrowing (typeof check, type guard, or assertion). `any` disables checking entirely and silently spreads.

Rule: use `unknown` for external input (`JSON.parse`, `catch (e: unknown)`, request bodies); reserve `any` for genuine escape hatches with a comment.
</details>

---

**Q54.** `interface` vs `type`? *(Select all true.)*
1. Only `interface` supports declaration merging
2. Only `type` can express unions and tuples
3. Both support extends/intersection
4. `interface` can only describe objects

<details><summary>Answer</summary>**All four are true.** Practical rule: `interface` for public object contracts you may want to augment (and for library types), `type` for unions, tuples, mapped types, and conditional types.</details>

---

**Q55.** What is `never` and when does it appear?
<details><summary>Answer</summary>

The type with **no values** — the bottom type. It appears as the return type of functions that never return (throw or infinite loop), on impossible narrowings, and on empty union branches. Its killer use is **exhaustiveness checking**:
```typescript
function assertNever(x: never): never { throw new Error('Unhandled: ' + x); }
switch (shape.kind) {
  case 'circle': return ...;
  case 'square': return ...;
  default: return assertNever(shape); // compile error if you add a new kind
}
```
</details>

---

**Q56.** Which utility type does what? Match:
`Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T,K>`, `Omit<T,K>`, `Record<K,V>`, `Exclude<U,X>`, `Extract<U,X>`, `ReturnType<F>`, `Awaited<T>`, `NonNullable<T>`

<details><summary>Answer</summary>

| Type | Effect |
|---|---|
| `Partial<T>` | all props optional (PATCH DTOs) |
| `Required<T>` | all props required |
| `Readonly<T>` | all props readonly (shallow) |
| `Pick<T, 'a'\|'b'>` | keep listed keys |
| `Omit<T, 'password'>` | drop listed keys (response DTOs) |
| `Record<string, User>` | build a dictionary type |
| `Exclude<'a'\|'b', 'a'>` → `'b'` | remove from a union |
| `Extract<'a'\|'b', 'a'>` → `'a'` | keep from a union |
| `ReturnType<typeof fn>` | function's return type |
| `Awaited<Promise<T>>` → `T` | unwrap promises recursively |
| `NonNullable<T>` | strip `null \| undefined` |
</details>

---

**Q57.** Does this compile?
```typescript
interface P { name: string }
const p: P = { name: 'a', age: 5 };
```
<details><summary>Answer</summary>

**No** — "Object literal may only specify known properties". TypeScript applies **excess property checking** to fresh object literals assigned directly to a typed target.

But this *does* compile, because the check only applies to literals:
```typescript
const tmp = { name: 'a', age: 5 };
const p: P = tmp; // OK — structural typing, tmp has at least what P needs
```
</details>

---

**Q58.** What is the type of `x`?
```typescript
const x = { kind: 'circle', r: 1 };
```
A) `{ kind: 'circle'; r: number }`  B) `{ kind: string; r: number }`  C) `object`  D) `any`

<details><summary>Answer</summary>

**B.** Object literal properties are **widened** to `string`/`number` unless the object is `const`-asserted. This is why passing `x` to a function expecting a discriminated union fails.

Fixes: `as const`, or `satisfies Shape`:
```typescript
const x = { kind: 'circle', r: 1 } as const;              // kind: 'circle'
const y = { kind: 'circle', r: 1 } satisfies Shape;       // checked, but stays specific
```
</details>

---

**Q59.** What does `satisfies` do that a type annotation doesn't?
<details><summary>Answer</summary>

`const c: Config = {...}` **widens** the value to `Config`, losing literal detail.
`const c = {...} satisfies Config` **validates** against `Config` but keeps the narrow inferred type, so `c.env` can stay `'prod'` instead of `string` and key autocompletion still works.
</details>

---

**Q60.** Which are true about `enum` vs `const enum` vs union of literals? *(Select all.)*
1. `enum` emits a runtime object
2. `const enum` is inlined and emits nothing (and is disallowed under `isolatedModules`)
3. Numeric enums are bidirectionally mapped (`E[0] === 'A'`)
4. A union of string literals has zero runtime cost and is generally preferred

<details><summary>Answer</summary>**All four.** For DTOs and API contracts prefer `type Status = 'active' | 'suspended'` — zero runtime cost, easy JSON serialisation, exhaustiveness checking. Numeric enums also accept any number in older TS versions, which silently breaks validation.</details>

---

**Q61.** What is wrong here?
```typescript
function isUser(x: unknown): x is User {
  return typeof x === 'object';
}
```
<details><summary>Answer</summary>

Type predicates are **unchecked assertions** — TypeScript trusts your `boolean` return. This one returns `true` for `null` (`typeof null === 'object'`) and for `{}`, so the compiler will happily let you read `user.email` on garbage.

Correct guards check the actual shape, or better, use a runtime validator (zod, class-validator) at every trust boundary. This exact snippet is a common "what's the bug" question.
</details>

---

**Q62.** What happens at runtime?
```typescript
interface Animal { name: string }
if (x instanceof Animal) {}
```
<details><summary>Answer</summary>**Compile error** — interfaces are **erased**; they don't exist at runtime. `instanceof` only works on classes/constructor functions. This is the core insight behind "TypeScript gives you no runtime safety at API boundaries — validate incoming data."</details>

---

**Q63.** With `strictNullChecks: true`, what is the error?
```typescript
function f(s?: string) { return s.length; }
```
<details><summary>Answer</summary>**`'s' is possibly 'undefined'`.** Fix with a guard (`if (!s) return 0`), a default (`s = ''`), or optional chaining (`s?.length`). The non-null assertion `s!.length` compiles but is a lie the compiler can't check.</details>

---

**Q64.** What does this generic constraint mean?
```typescript
function pluck<T, K extends keyof T>(obj: T, keys: K[]): T[K][] {
  return keys.map(k => obj[k]);
}
```
<details><summary>Answer</summary>

`K` is restricted to the literal key names of `T`, so `pluck(user, ['naem'])` is a compile error and the return type is precisely the union of the picked value types. `keyof`, `extends`, and indexed access `T[K]` are the three building blocks of most TS generic questions.
</details>

---

**Q65.** What is the resulting type?
```typescript
type A = { a: string } & { a: number };
```
A) `{ a: string | number }`  B) `{ a: never }`  C) Compile error  D) `{ a: string }`

<details><summary>Answer</summary>**B) `{ a: never }`** — an intersection of incompatible primitives produces `never` for that property, so the type is uninhabitable. You'll only find out when you try to assign to it.</details>

---

**Q66.** What does `readonly` guarantee?
<details><summary>Answer</summary>

**Compile-time only, and shallowly.** `readonly x: string` blocks reassignment of `x`, not mutation of `x`'s contents. `ReadonlyArray<T>` / `readonly T[]` removes mutating methods from the type but the array is still mutable at runtime (and castable away). For real immutability use `Object.freeze` or an immutable library.
</details>

---

**Q67.** What are `strict` mode's most important sub-flags?
<details><summary>Answer</summary>

`strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `useUnknownInCatchVariables`, `alwaysStrict`.

Senior follow-up: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` (makes `arr[i]` return `T | undefined` — the single highest-value non-default flag), and `noImplicitOverride`.
</details>

---

**Q68.** Why does NestJS need `emitDecoratorMetadata` and `reflect-metadata`?
<details><summary>Answer</summary>

Constructor parameter **types are erased** at compile time. With `emitDecoratorMetadata: true`, TypeScript emits a `design:paramtypes` metadata entry alongside decorated classes, which `reflect-metadata` exposes at runtime — that's how Nest's DI container knows which provider to inject. Without both flags, DI resolution fails with "cannot resolve dependency at index 0".

Consequence: interfaces can't be injection tokens (they're erased) — you need `@Inject('TOKEN')` or an abstract class.
</details>

---

**Q69.** What does this do?
```typescript
type Result<T> = T extends Promise<infer U> ? U : T;
```
<details><summary>Answer</summary>**A conditional type with `infer`** — extracts the resolved type out of a promise, otherwise passes the type through. It's a hand-rolled `Awaited`. Conditional + `infer` questions appear on "TypeScript Advanced" tests at iMocha/TestGorilla.</details>

---

**Q70.** Which is correct for typing an Express/Nest error handler catch block in modern TS?
A) `catch (e: any)`  B) `catch (e: Error)`  C) `catch (e: unknown)` then narrow  D) `catch (e)` with no annotation

<details><summary>Answer</summary>

**C.** With `useUnknownInCatchVariables` (part of `strict` since TS 4.4), `e` is `unknown` — because JS lets you `throw` anything. Option B is **not even legal** (catch clause types must be `any` or `unknown`). Narrow with `e instanceof Error ? e.message : String(e)`.
</details>

---

## 7. Modules — ESM vs CommonJS

**Q71.** Which are available in CommonJS but **not** in ESM? *(Select all.)*
`__dirname`, `__filename`, `require`, `module.exports`, top-level `await`, `import.meta.url`

<details><summary>Answer</summary>

**CJS-only:** `__dirname`, `__filename`, `require`, `module.exports`.
**ESM-only:** top-level `await`, `import.meta.url`.

ESM equivalent of `__dirname`:
```javascript
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
```
</details>

---

**Q72.** Can you `require()` an ES module?
A) Yes, always  B) No — throws `ERR_REQUIRE_ESM` (except for synchronous-graph ESM on Node 22+)  C) Only with a flag  D) Only in TypeScript

<details><summary>Answer</summary>**B.** Historically `require()` of ESM throws `ERR_REQUIRE_ESM`; use dynamic `await import()`. Node 22+ added `require(esm)` for modules without top-level await, but assume the classic behaviour in tests. The reverse — `import` of CJS — has always worked, with the whole module arriving as the default export.</details>

---

**Q73.** How does Node decide whether a `.js` file is CJS or ESM?
<details><summary>Answer</summary>

By the nearest parent `package.json`'s `"type"` field: `"commonjs"` (default) or `"module"`. Extensions override it: `.cjs` is always CommonJS, `.mjs` is always ESM.
</details>

---

**Q74.** Are ESM imports hoisted?
<details><summary>Answer</summary>

**Yes** — `import` declarations are hoisted and resolved statically before any module code runs, which is what enables tree-shaking and cyclic-dependency handling via live bindings. `require()` is a runtime function call executed in place, so it can be conditional. That difference is why `jest.mock` needs hoisting tricks under ESM.
</details>

---

**Q75.** What does this print, and why is it a real Node gotcha?
```javascript
// a.js
const b = require('./b'); console.log('a sees', b.value);
module.exports.value = 'A';
// b.js
const a = require('./a'); console.log('b sees', a.value);
module.exports.value = 'B';
```
<details><summary>Answer</summary>

Running `node a.js`: `b sees undefined`, then `a sees B`.

**Circular dependency**: when `b` requires `a`, `a`'s module object exists but is only *partially populated* — `value` hasn't been assigned yet. CJS returns the partial exports rather than deadlocking. This is the root cause of most "undefined is not a function" errors in large NestJS codebases, and why Nest offers `forwardRef()`.
</details>

---

## Answer-Speed Drill

Set a 10-minute timer and answer these out loud, one sentence each. This is the **Karat technical-verification** format.

1. Event loop phase order in Node?
2. `setTimeout(fn, 0)` vs `setImmediate(fn)` inside an I/O callback?
3. `==` vs `===` — one rule you'd give a junior?
4. Why is `0.1 + 0.2 !== 0.3` and how do you store money?
5. Three ways to copy an object and which are deep?
6. Arrow function vs regular function — three differences?
7. `Promise.all` vs `allSettled` vs `race` vs `any`?
8. What is the TDZ?
9. `unknown` vs `any` — when do you use each?
10. Why do interfaces disappear at runtime and what does that mean for API validation?
11. What is a closure and how does it leak memory?
12. `Map` vs object — pick one and defend it?
13. What does `satisfies` solve?
14. How do you make `for...of` over async work? (`for await (const x of stream)`)
15. Why does NestJS need `reflect-metadata`?

**Target: 15/15 in under 10 minutes.** Below 12 → re-read [phase-1-core-programming/01-javascript-typescript-deep-dive.md](../phase-1-core-programming/01-javascript-typescript-deep-dive.md).
