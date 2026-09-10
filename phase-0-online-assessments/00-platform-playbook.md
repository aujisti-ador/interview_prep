# Online Assessment Platform Playbook

> **The gate before the gate.** For senior/lead backend roles — especially international remote and agency-sourced (Turing, Toptal, Arc, Andela) — 60–80% of candidates are eliminated by an automated test they never speak to a human about. This file decodes *how each platform asks questions* so you can pattern-match instead of improvise.

## In 60 seconds

1. **This round is scored by a machine, and the machine does not care how good an engineer you
   are.** It measures problems solved, within a time limit. Optimise for that specific thing.
2. **Never leave a blank.** MCQs almost never carry negative marking, so a guess is strictly
   better than an empty answer. Free points.
3. **Brute force is a score. An elegant unfinished solution is zero.** Get something passing,
   then optimise if the clock allows.
4. **Read the constraint before choosing an algorithm.** `n ≤ 1000` allows O(n²).
   `n ≤ 10⁶` does not. The constraint tells you the intended complexity.
5. **"Run" is not "Submit".** Submit early, then keep improving. Candidates lose whole
   questions to running out of time with working code they never submitted.
6. **Assume proctoring is on.** Tab-switching, pasting and AI use are detected as standard now,
   and a flag ends the process regardless of your score.

**The single biggest mistake:** treating every question as equally worth solving. A mixed test
usually has one hard problem worth the same as three easy ones. Sweep for the cheap points
first, then spend what is left on the hard one.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **OA** | Online Assessment — the automated test before any human sees you |
| **ATS** | The system that received your application and scheduled this |
| **Proctoring** | Monitoring during the test — webcam, screen, tab focus |
| **Plagiarism detection** | Comparing your code against other submissions and public solutions |
| **Partial credit** | Scoring per passing test case, not all-or-nothing |
| **Test case** | One input/output pair your solution must satisfy |
| **Hidden test case** | Cases you cannot see, often the edge cases |
| **Time limit (TLE)** | Time Limit Exceeded — correct but too slow |
| **stdin/stdout harness** | Reading input from standard input and printing the answer. The Node setup matters |
| **Constraint** | The stated limits on input size. They tell you the required complexity |
| **Big-O** | How runtime grows as input grows |
| **Growing-spec task** | CodeSignal's format: four levels, each adding requirements to the last |
| **Skill test bundle** | TestGorilla-style: several short tests combined into one score |
| **SJT** | Situational Judgement Test — "what would you do if…" scenarios |
| **Psychometric test** | Personality or aptitude assessment, not technical |

---

## Table of Contents
1. [The Landscape — Who Uses What](#the-landscape--who-uses-what)
2. [HackerRank for Work](#1-hackerrank-for-work)
3. [Codility](#2-codility)
4. [CodeSignal](#3-codesignal)
5. [TestGorilla](#4-testgorilla)
6. [Talview](#5-talview)
7. [Mercer Mettl](#6-mercer-mettl)
8. [iMocha](#7-imocha)
9. [DevSkiller](#8-devskiller)
10. [Karat / CoderPad / HackerRank CodePair](#9-karat--coderpad--live-pair-platforms)
11. [Vetting Funnels — Turing, Toptal, Arc, Andela](#10-vetting-funnels--turing-toptal-arc-andela)
12. [Universal Question Taxonomy](#universal-question-taxonomy)
13. [Scoring Models — What Actually Gets You Through](#scoring-models--what-actually-gets-you-through)
14. [Proctoring, Plagiarism & AI Detection](#proctoring-plagiarism--ai-detection)
15. [Pre-Test Checklist](#pre-test-checklist)
16. [Time Allocation Strategy](#time-allocation-strategy)
17. [The Node.js Submission Harness](#the-nodejs-submission-harness)

---

## The Landscape — Who Uses What

| Platform | Primary format | Typical length | Who uses it | Your prep file |
|---|---|---|---|---|
| **HackerRank** | Coding + SQL + REST API + MCQ | 60–120 min | Enterprises, banks, big product cos, most BD MNC-backed firms | [03](03-coding-challenges-dsa-javascript.md), [04](04-sql-challenge-bank.md), [05](05-rest-api-and-debugging-challenges.md) |
| **Codility** | Algorithmic tasks scored correctness + performance | 60–120 min | European/UK companies, fintech, Toptal-style screens | [03](03-coding-challenges-dsa-javascript.md) |
| **CodeSignal** | GCA — 4 tasks, industry score 300–850 | 70 min | US remote-first, marketplaces (Turing partners) | [03](03-coding-challenges-dsa-javascript.md) |
| **TestGorilla** | Bundles of short skill + cognitive + personality tests | 10 min × 4–5 | SMEs, startups, agencies, remote job boards | [01](01-mcq-bank-javascript-typescript.md), [02](02-mcq-bank-nodejs-backend.md), [06](06-devops-cloud-mcq-bank.md), [07](07-video-interview-and-psychometric.md) |
| **Talview** | One-way video interview + proctored MCQ/coding | 20–45 min | South Asia enterprises, BPO/BD corporates, ITES | [07](07-video-interview-and-psychometric.md) |
| **Mercer Mettl** | Coding + MCQ + psychometric, heavy proctoring | 90–150 min | BD/India corporates, banks, telecom (Grameenphone/Banglalink-tier) | [01](01-mcq-bank-javascript-typescript.md), [02](02-mcq-bank-nodejs-backend.md), [08](08-timed-mock-assessments.md) |
| **iMocha** | Large MCQ skill libraries, some coding | 30–60 min | Staffing/outsourcing firms, service companies | [02](02-mcq-bank-nodejs-backend.md), [06](06-devops-cloud-mcq-bank.md) |
| **DevSkiller** | Real repo in browser IDE, make failing tests pass | 60–180 min | Senior Node/NestJS hires in EU | [05](05-rest-api-and-debugging-challenges.md) |
| **Karat** | Human structured interview, recorded | 60 min | US scale-ups outsourcing first round | [08](08-timed-mock-assessments.md) |

> **Naming note:** "Telvette" = **Talview**, "Exam Gorilla" = **TestGorilla**. Both are assessment-bundle vendors, not coding-first platforms — a big share of their questions are MCQ, situational, and video, which is exactly what most engineers under-prepare for.

---

## 1. HackerRank for Work

The most common enterprise screen. A company assembles a test from five question *types* — knowing which type you're looking at tells you how to spend time.

### Question types

**a) Coding — "Function signature" mode (most common)**
You're given a stub. Input parsing is already written for you.
```javascript
/*
 * Complete the 'processLogs' function below.
 * The function accepts STRING_ARRAY logs as parameter.
 */
function processLogs(logs) {
    // Write your code here
}
```
**b) Coding — "Full program" mode (stdin/stdout)**
You must read from stdin yourself. See [The Node.js Submission Harness](#the-nodejs-submission-harness).

**c) Database (SQL)**
Real MySQL/PostgreSQL/MS SQL engine. You submit a single query; output compared row-by-row. Ordering matters when the prompt says "order by".

**d) REST API**
A live mock API is available at a base URL. You call it with `fetch`/`https` and return a computed result. Tests are hidden. Network calls are allowed *only* to the provided host. This is HackerRank's signature senior-backend question and most candidates have never seen it — see [05](05-rest-api-and-debugging-challenges.md).

**e) Multiple Choice / Multiple Select / Fill-in-the-blank**
Language trivia, output prediction, complexity, security. Multiple-select requires *all* correct options for credit on most configurations.

**f) Subjective (free text)**
"How would you scale this?" Human-graded later. Write 4–8 lines with a trade-off, never one line.

**g) Diagnostic / Certification tests**
HackerRank's own certifications — *Node.js (Basic/Intermediate)*, *REST API (Intermediate)*, *SQL (Basic/Intermediate/Advanced)*, *Problem Solving (Basic/Intermediate)*, *JavaScript (Basic/Intermediate)*. Free, public, and **companies filter LinkedIn/HackerRank profiles by these badges**. Earning `Node.js (Intermediate)` + `SQL (Advanced)` + `Problem Solving (Intermediate)` is one of the highest-ROI weekends in this whole repo.

### Behaviour to know
- **Partial scoring**: each test case carries points. A brute force passing 7/12 cases scores more than an empty optimal attempt. **Always submit something.**
- Test cases are locked but you see *pass/fail per case* and the failing input for sample cases only.
- "Run Code" ≠ "Submit". Only Submit records the score.
- Custom input box exists — use it to debug parsing.
- Timer is per-test, not per-question; you can navigate freely between questions.

---

## 2. Codility

Different philosophy: **fewer tasks, brutal edge cases, separate performance score.**

- You get **Correctness %** and **Performance %** shown separately. A working O(n²) on an n ≤ 100,000 task scores ~50% total.
- Detected tests are named in the report: `empty`, `single`, `double`, `extreme_min_max`, `large_random`, `medium_range`. Write those cases yourself before submitting.
- Classic Codility patterns (they recur across companies): prefix sums, two pointers, counting/bucketing, stack matching, sorting + greedy, cyclic detection, sliding window.
- Codility shows a "task score" per task; most companies set the bar at **~70–80% total**.

**The Codility checklist before every submit:**
1. Empty array / empty string
2. Single element
3. All elements identical
4. Max constraint (n = 100,000) — is it O(n) or O(n log n)?
5. Values at ±2,147,483,647 (integer overflow doesn't exist in JS numbers, but **precision does above 2^53** — use `BigInt` when summing large arrays of large ints)
6. Negative numbers
7. Return type — number vs string vs array

---

## 3. CodeSignal

- **GCA (General Coding Assessment)**: 4 tasks / 70 minutes, difficulty ramps steeply. Task 1 is trivial string/array manipulation, Task 2 simulation, Task 3 hash-map heavy, Task 4 is a "system-ish" simulation with a growing spec (often 4 sub-parts, each unlocking after the previous — you implement `Level 1..4` of a mini key-value store, file system, or bank).
- Output is an **industry-standard score 300–850**. Many companies gate at **600+**; top-tier at 750+.
- The Level 1–4 "growing spec" task is the one to practice — it rewards clean, extensible design over cleverness. It maps directly to your LLD prep in [phase-5-system-design/07-lld-practice-problems.md](../phase-5-system-design/07-lld-practice-problems.md).

---

## 4. TestGorilla

Not one test — a **bundle**, usually 4–5 tests, each capped ~10 minutes, ~40 min total. Common bundle for a senior Node role:

| Test in bundle | What it actually contains |
|---|---|
| **Node.js** | 15–20 MCQs: event loop, modules, streams, `process`, npm, error handling |
| **JavaScript (coding: debugging)** | 3 short broken snippets, you fix them in-browser |
| **SQL** | MCQs + write-a-query on a small schema |
| **Problem Solving** | Non-technical logic: schedules, flowcharts, data interpretation, rule application |
| **Critical Thinking / Numerical Reasoning** | Cognitive aptitude, heavily time-boxed |
| **Attention to Detail** | Compare near-identical records/strings; pure speed + care |
| **Big 5 (OCEAN) / Culture Add / Motivation** | Personality inventory, no right answers but *consistency is measured* |

**Key mechanics:**
- Timer is often **per question**, not per test — you cannot bank time or go back.
- No negative marking → **never leave anything blank**.
- Personality tests contain repeated/reversed items to detect faking. Answer honestly and quickly; contradictions lower your "reliability" flag more than a "bad" trait score does.
- The cognitive tests (Problem Solving, Numerical Reasoning) are where strong engineers lose — practice the *format*, not the content. See [07](07-video-interview-and-psychometric.md).

---

## 5. Talview

A proctored **one-way (asynchronous) video interview** platform, often bundled with MCQ/coding modules. Widely used by BD/South-Asian corporates and ITES firms.

**Mechanics:**
- Question appears on screen (text and/or recorded video).
- **Prep time**: usually 30 seconds, sometimes 0.
- **Answer time**: 60–180 seconds, hard cut-off mid-sentence.
- **Retakes**: typically 0 or 1, and the retake is flagged to the recruiter.
- Webcam + mic + screen recorded; face-detection flags you leaving frame; some configs disable pause.
- AI "Behavioral Insights" scores speech rate, filler words, sentiment, and keyword coverage against the JD.

**What this means practically:** you must answer in a **compressed STAR** — 15s situation, 20s task, 60s action, 20s result — and you must front-load the answer because AI keyword matching weighs the whole transcript but humans skim the first 20 seconds. Scripts in [07](07-video-interview-and-psychometric.md).

---

## 6. Mercer Mettl

Dominant in Bangladesh/India corporate hiring (banks, telecom, large software houses).

- **Sections are time-locked**: you cannot return to Section 1 after moving to Section 2. Read the section map at the start.
- Typically: Aptitude (quant/logical/verbal) → Technical MCQ → Coding (1–2 problems) → sometimes Psychometric.
- **Aptitude is not optional filler** — many BD employers set a hard cut-off on it independent of your coding score. Percentages, ratios, time-and-work, series, syllogisms, data interpretation.
- Proctoring is aggressive: webcam snapshots at intervals, tab-switch counter, sometimes mandatory mobile second-camera. **A single tab switch can auto-terminate**.
- Coding IDE is slower than HackerRank's and offers fewer language niceties — test your `console.log` debugging habit works there.

---

## 7. iMocha

Large MCQ library used by staffing/outsourcing firms and body-shopping vendors.

- Question style: **version-specific and syntax-heavy** (e.g. "Which of the following is valid in Node 18 but not Node 14?", "What does this `package.json` field do?").
- Often includes "Which of these are true? (Select all that apply)" — partial credit is rare; be conservative.
- Time per question ~45–60s. Speed matters more than depth.
- Prep: [02](02-mcq-bank-nodejs-backend.md) and [06](06-devops-cloud-mcq-bank.md) are written in exactly this style.

---

## 8. DevSkiller

The most *realistic* format and the most senior-appropriate — "RealLifeTesting".

- You get a **real repository** (often a NestJS/Express app) in a browser IDE (or clone via Git).
- The task: make failing tests pass, implement a missing endpoint, fix a race condition, or refactor.
- You **can** read docs, and you're expected to run the test suite.
- Scoring: hidden tests + code-quality heuristics + a diff a human reviews.

**Strategy:** first 10 minutes = run the test suite, read the failing test names, map the repo. Do not start coding until you've read the tests — they *are* the spec. See [05](05-rest-api-and-debugging-challenges.md).

---

## 9. Karat / CoderPad / Live Pair Platforms

- **Karat**: an external, trained interviewer runs a scripted 60-min session — ~20 min "technical verification" rapid Q&A (short, factual, out-loud answers) + ~35 min coding in CoderPad. The rapid-fire section is *exactly* the MCQ banks in this folder but spoken. Practise saying answers aloud in 30 seconds.
- **CoderPad / HackerRank CodePair**: shared editor with a human. Run-button available; a database pad and a REPL are available for SQL. Talk continuously — silence is scored as being stuck.

---

## 10. Vetting Funnels — Turing, Toptal, Arc, Andela

| Marketplace | Stages | Killer stage |
|---|---|---|
| **Turing** | Profile → MCQ+coding (per-skill "Turing Tests") → 30–60 min recorded technical video interview → client interview | The recorded video interview: 5–8 deep questions on one stack, answered to camera |
| **Toptal** | English/personality screen (~15 min live) → timed algorithmic test (2 problems, ~90 min, Codility-style) → live technical screen (~90 min) → **test project** (1–3 weeks, unpaid) | The test project — production-grade code, tests, README, and a code review |
| **Arc.dev** | Profile → CodeSignal-style assessment → behavioural video → matching | Assessment score threshold |
| **Andela** | Application → skill assessment → live technical → soft-skills interview | Live technical + communication |

**All four weight English fluency and asynchronous-communication signal as heavily as code.** Your written answers in a form field are being read as a writing sample.

---

## Universal Question Taxonomy

Every platform draws from these nine buckets. Everything in this folder maps to one:

| # | Bucket | Frequency in senior backend screens | Where to prep |
|---|---|---|---|
| 1 | Output prediction (event loop, hoisting, coercion, `this`) | ★★★★★ | [01](01-mcq-bank-javascript-typescript.md) |
| 2 | Language/runtime trivia (Node APIs, modules, npm) | ★★★★☆ | [02](02-mcq-bank-nodejs-backend.md) |
| 3 | DSA coding (arrays, hash maps, strings, sliding window) | ★★★★★ | [03](03-coding-challenges-dsa-javascript.md) |
| 4 | SQL query writing | ★★★★★ | [04](04-sql-challenge-bank.md) |
| 5 | REST API consumption / integration coding | ★★★☆☆ | [05](05-rest-api-and-debugging-challenges.md) |
| 6 | Debugging / fix-the-bug / code review | ★★★★☆ | [05](05-rest-api-and-debugging-challenges.md) |
| 7 | DevOps/cloud/Linux/Git MCQ | ★★★☆☆ | [06](06-devops-cloud-mcq-bank.md) |
| 8 | Cognitive aptitude + situational judgement | ★★★☆☆ (★★★★★ at BD corporates) | [07](07-video-interview-and-psychometric.md) |
| 9 | One-way video behavioural | ★★★★☆ (remote/agency) | [07](07-video-interview-and-psychometric.md) |

---

## Scoring Models — What Actually Gets You Through

| Model | Platform | Implication |
|---|---|---|
| **Per-test-case points** | HackerRank, Mettl | Submit brute force early, optimise after. Never leave blank. |
| **Correctness + Performance split** | Codility | An O(n²) that works is worth ~half. Know the constraint before writing. |
| **Percentile / industry score** | CodeSignal | Finishing 3 clean tasks > 4 half-broken ones. |
| **Per-test pass thresholds** | TestGorilla | Weakest test in the bundle can sink you — the cognitive one is usually it. |
| **Rubric + AI transcript scoring** | Talview, HireVue | Cover the keywords of the role explicitly, out loud. |
| **Hidden tests + human diff review** | DevSkiller, Toptal project | Clean structure, naming, tests, and a README carry real weight. |

---

## Proctoring, Plagiarism & AI Detection

Know the rules so you don't fail on process:

- **Tab/window switching** is logged by HackerRank, Mettl, Talview, TestGorilla. Some auto-submit after N switches. Assume every switch is visible.
- **Copy-paste into the editor** is logged and flagged. Typing your own solution is safer than pasting even your own snippet from notes.
- **Plagiarism detection** compares your submission against other candidates *and* public solutions (a MOSS-style similarity engine). Verbatim LeetCode-editorial code is a common flag.
- **AI-assistance detection** is now standard (typing-cadence analysis, sudden large insertions, code-style fingerprinting). Several platforms now ship an explicit "AI-generated code" likelihood score. Do not paste from an LLM into a proctored test.
- **Webcam**: face out of frame, second face detected, phone in view, or reading off-screen (eye tracking) all raise flags.
- **Environment**: single monitor, closed apps, no notifications, well-lit face, quiet room. Do a 5-minute system check the day before.

*Ethics + pragmatics: these tests are your own signal. Cheating a screen you can't back up in a live interview wastes the one thing that's scarce — company goodwill in a small market like Dhaka.*

---

## Pre-Test Checklist

**24 hours before**
- [ ] Confirm platform, duration, allowed languages, and whether it's proctored
- [ ] Take the platform's own practice/sample test (HackerRank, Codility, and CodeSignal all have free ones)
- [ ] Confirm Node version available on the platform (usually Node 18/20; some are stuck on 12 — no `structuredClone`, no `Array.at`, no `??=`)
- [ ] Charge laptop, test webcam/mic, check upload speed (video platforms need ~2 Mbps up)

**60 minutes before**
- [ ] Close Slack/mail/notifications; quit anything with a popup
- [ ] Single monitor, browser only, one tab
- [ ] Water, paper + pen (allowed on most, banned on some proctored ones — check)
- [ ] Bathroom (many tests forbid leaving the frame)

**First 3 minutes of the test**
- [ ] Read the section map: how many questions, which are time-locked, is navigation allowed
- [ ] Skim **all** coding questions before writing a line; start with the one you recognise
- [ ] Note the constraint bounds (`n ≤ ?`) on every algorithmic task — it dictates the required complexity

---

## Time Allocation Strategy

For a typical 90-minute mixed HackerRank test (2 coding + 1 SQL + 10 MCQ):

| Minutes | Action |
|---|---|
| 0–3 | Skim everything. Rank questions by confidence. |
| 3–13 | MCQs — fast pass. Flag any that take >45s and move on. |
| 13–33 | Easiest coding question. Brute force first, submit, then optimise. |
| 33–48 | SQL question (usually the highest points-per-minute for a backend engineer). |
| 48–78 | Hard coding question. Get partial cases passing. |
| 78–85 | Return to flagged MCQs and guess the rest. |
| 85–90 | Re-submit everything. Verify each shows a score. |

**Rules that matter more than technique:**
1. **Never leave a blank.** Partial credit and no-negative-marking make guessing strictly positive EV.
2. **Brute force is a score.** Elegant-but-unfinished is zero.
3. **The clock beats the ego.** If you're 12 minutes into a problem with no traction, take the partial credit and move on.

---

## The Node.js Submission Harness

Memorise this. In "full program" mode you must read stdin yourself, and fumbling it costs 10 minutes.

**Universal reader (works on every platform, all Node versions):**
```javascript
let inputChunks = '';
process.stdin.on('data', (d) => { inputChunks += d; });
process.stdin.on('end', () => {
  const lines = inputChunks.split('\n').map((l) => l.trimEnd());
  main(lines);
});

function main(lines) {
  let p = 0;
  const n = parseInt(lines[p++], 10);              // first line: count
  const arr = lines[p++].split(' ').map(Number);   // second line: array
  console.log(solve(n, arr));
}

function solve(n, arr) {
  return arr.reduce((a, b) => a + b, 0);
}
```

**HackerRank's own template (they often pre-fill this — recognise it):**
```javascript
process.stdin.resume();
process.stdin.setEncoding('ascii');
let inputString = '', currentLine = 0;
process.stdin.on('data', (s) => { inputString += s; });
process.stdin.on('end', () => {
  inputString = inputString.split('\n').map((s) => s.trim());
  main();
});
function readLine() { return inputString[currentLine++]; }
```

**Writing output when they give you `OUTPUT_PATH` (HackerRank function mode):**
```javascript
const fs = require('fs');
const ws = fs.createWriteStream(process.env.OUTPUT_PATH);
ws.write(result + '\n');
ws.end();
```

**Gotchas that cost real points:**
- `console.log` of a large array prints commas — join explicitly: `console.log(arr.join(' '))`.
- Printing inside a loop is slow on big inputs. Build an array and `console.log(out.join('\n'))` once.
- `parseInt` without radix on `"08"` is fine in modern JS, but `Number('')` is `0` while `parseInt('')` is `NaN` — trailing blank lines bite here.
- Sorting numbers: `arr.sort()` is **lexicographic**. Always `arr.sort((a, b) => a - b)`.
- Sums beyond `2^53` lose precision — use `BigInt` when the constraint allows values up to 1e9 across 1e5 elements *and* the answer is compared exactly.
- Recursion depth: default stack handles ~10⁴ frames. n = 10⁵ recursion → `RangeError`. Convert to iterative.

---

## Where to Go Next

| If your next test is… | Study, in order |
|---|---|
| HackerRank enterprise screen | [03](03-coding-challenges-dsa-javascript.md) → [04](04-sql-challenge-bank.md) → [01](01-mcq-bank-javascript-typescript.md) → [05](05-rest-api-and-debugging-challenges.md) |
| TestGorilla bundle | [01](01-mcq-bank-javascript-typescript.md) → [02](02-mcq-bank-nodejs-backend.md) → [07](07-video-interview-and-psychometric.md) |
| Talview / one-way video | [07](07-video-interview-and-psychometric.md) → phase-6 behavioural stories |
| Mettl (BD corporate) | [07](07-video-interview-and-psychometric.md) (aptitude) → [02](02-mcq-bank-nodejs-backend.md) → [03](03-coding-challenges-dsa-javascript.md) |
| Codility / CodeSignal | [03](03-coding-challenges-dsa-javascript.md) → [phase-5 LLD](../phase-5-system-design/07-lld-practice-problems.md) |
| DevSkiller / take-home | [05](05-rest-api-and-debugging-challenges.md) → [phase-1 testing](../phase-1-core-programming/04-testing-and-quality.md) |
| Unknown / all of the above | [08](08-timed-mock-assessments.md) — take a full-length timed mock first to find your weak bucket |
