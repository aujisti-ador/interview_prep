# Take-Home Assignments — The Senior Filter

> For international remote roles — Proxify, Toptal, European product companies, most YC-backed
> startups — the take-home has largely replaced the timed algorithmic test as the main
> technical filter at senior level. It is also the round most candidates lose without ever
> knowing why.
>
> The failure is almost never "the code did not work". It is scope, structure, or silence.

## In 60 seconds

1. **They are not really testing whether you can build the feature.** They assume you can. They
   are testing what it is like to *receive your work* — can you scope, and can you explain?
2. **The most common failure is a technically excellent submission with a two-line README.**
   Communication is roughly a quarter of the score. That candidate is rejected and never
   understands why.
3. **The second most common failure is over-building.** Four hours of work presented as sixteen
   reads as poor judgement, not enthusiasm.
4. **Build a small thing completely, and document everything you deliberately left out.** A
   finished endpoint with validation, tests and a README beats four half-built ones.
5. **Write a `TRADEOFFS.md`.** Every omission you name turns a potential criticism into evidence
   of judgement. This is the cheapest score in the whole exercise.
6. **The follow-up call decides the outcome, not the code.** Rehearse a two-minute walkthrough,
   know the alternative you rejected for every decision, and have three self-criticisms ready.

**Before you write any code, spend thirty minutes:** extract the requirements into a literal
checklist, work out what the brief is *quietly* testing, and send two clarifying questions.
That half hour is worth three hours later.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Take-home** | An assignment you complete alone, usually 4–8 hours |
| **Scope** | Deciding what to build and what to leave out. The main thing being tested |
| **Gold-plating** | Adding polish nobody asked for, at the cost of finishing |
| **`TRADEOFFS.md`** | A file naming what you did not build, and why |
| **Clean clone test** | Cloning into a fresh folder and following your own README exactly |
| **`.env.example`** | Documenting every config variable so it runs first time |
| **Commit hygiene** | A readable history of small, working commits |
| **PR description** | What / Why / How / Testing / Not included |
| **Idempotency** | Handling a repeated request safely. A very common hidden requirement |
| **Behavioural test** | A test named for what it proves, not for the method it calls |
| **Archetype** | The recognisable shape of an assignment — CRUD-with-a-twist, flaky API, refactor |
| **Time-boxing** | Deciding the limit in advance and stopping there deliberately |

---

## Table of Contents

1. [Why companies use them, and what they actually score](#1-why-companies-use-them-and-what-they-actually-score)
2. [The scoring rubric you are not shown](#2-the-scoring-rubric-you-are-not-shown)
3. [Before you write any code](#3-before-you-write-any-code)
4. [Scoping: the discipline that decides the outcome](#4-scoping-the-discipline-that-decides-the-outcome)
5. [The time budget](#5-the-time-budget)
6. [Project structure that reads senior](#6-project-structure-that-reads-senior)
7. [Testing: how much, and which kind](#7-testing-how-much-and-which-kind)
8. [The README — the highest-value file in the repo](#8-the-readme--the-highest-value-file-in-the-repo)
9. [The TRADEOFFS document](#9-the-tradeoffs-document)
10. [Commit hygiene](#10-commit-hygiene)
11. [The follow-up call](#11-the-follow-up-call)
12. [Common assignment archetypes](#12-common-assignment-archetypes)
13. [When to decline](#13-when-to-decline)
14. [Checklist](#14-checklist)

---

## 1. Why companies use them, and what they actually score

A take-home exists because a whiteboard round cannot answer the question the hiring manager
actually has: *what is it like to receive this person's work?*

That reframes everything. They are not primarily testing whether you can implement the feature —
they assume you can. They are testing:

- Whether you make sensible decisions **without supervision**
- Whether you can **scope**, or whether you gold-plate and miss deadlines
- Whether your work is **legible** to someone who has to review it
- Whether you **communicate** what you did and why

The last two are where seniors separate from mid-levels, and they are almost entirely about
artifacts outside the source code.

---

## 2. The scoring rubric you are not shown

Reconstructed from what reviewers actually discuss. Weightings vary, but the shape is
consistent.

| Dimension | Weight | What "excellent" looks like |
|---|---|---|
| **Does it work** | ~20% | Runs from a clean clone with the documented command. Handles the stated cases |
| **Structure & readability** | ~25% | Clear boundaries, obvious where things live, no cleverness for its own sake |
| **Tests** | ~15% | Meaningful tests of behaviour, not coverage theatre. The reviewer can see what you thought was risky |
| **Communication** | ~25% | README and trade-offs doc. What you built, what you did not, why |
| **Scope judgement** | ~15% | Did the right amount. Did not build a Kubernetes operator for a CRUD API |

**The single most common failure** is a technically excellent submission with a two-line
README. It scores ~35/100 on a rubric like this and the candidate never understands why they
were rejected, because the code was genuinely good.

**The second most common** is over-building. Four hours of work presented as sixteen hours of
architecture reads as poor judgement, not enthusiasm — and it makes the reviewer wonder what
you would do to their codebase.

---

## 3. Before you write any code

Thirty minutes here is worth three hours later.

**1. Read the brief twice, and extract the explicit asks into a literal checklist.** Most
briefs contain 6–12 requirements scattered through prose. Half of all rejections are for
missing one of them. Write them down as a list; you will paste this list into the README later.

**2. Identify what the brief is *quietly* testing.** Almost every take-home has one hidden
dimension:

| Brief says | Probably testing |
|---|---|
| "handle a large file" | Streaming vs loading into memory |
| "the API should be reliable" | Idempotency, retries, timeouts |
| "multiple users" | Concurrency, race conditions, locking |
| "we may add more providers later" | Abstraction boundary, dependency inversion |
| "include some tests" | Whether you test behaviour or implementation |
| "production ready" | Config, logging, error handling, health check |

**3. Ask questions.** This is scored and most candidates skip it. One short email with two or
three sharp questions demonstrates exactly the trait they are hiring for:

> Thanks for the brief — two quick questions before I start:
>
> 1. For [ambiguity], should I assume [X] or [Y]? I am planning on [X] since [reason].
> 2. Is there a preference on [database / framework choice], or is that mine to make?
>
> Planning to spend around [N] hours on this and will note anything I deliberately left out.

Note the shape: you propose an answer rather than just asking. And the last line pre-frames the
scope conversation — it makes "I did not build auth" a stated decision rather than a gap.

**4. Confirm the time expectation in writing.** If the brief says "should take about four
hours", say what you will do in four hours. If it says nothing, ask.

---

## 4. Scoping: the discipline that decides the outcome

The brief is almost always larger than the stated time budget. **This is intentional.** They
want to see what you cut.

**The rule:** build the smallest thing that is genuinely complete along the main path, then
document everything else as a deliberate omission.

```
                    ┌─────────────────────────────────┐
  BUILD             │ core path, working, tested      │  ← 70% of your time
                    ├─────────────────────────────────┤
  BUILD IF TIME     │ one thing that shows depth      │  ← 20%
                    ├─────────────────────────────────┤
  DOCUMENT ONLY     │ everything else, in TRADEOFFS   │  ← 10%
                    └─────────────────────────────────┘
```

**A complete small thing beats an incomplete large thing, every time.** A working endpoint with
validation, error handling, tests and a README outscores four half-built endpoints with none of
those.

**Choose one place to show depth.** You cannot demonstrate everything in four hours, so pick
the dimension the brief hints at and go one level deeper than expected there. If the brief
mentions reliability, do the idempotency properly and write about it. If it mentions
extensibility, get the abstraction boundary genuinely right. One deep thing plus honest
documentation of the rest reads far more senior than uniform shallowness.

**Never leave something half-built and silent.** A commented-out block or a `TODO` with no
explanation is the worst possible signal. Either finish it, delete it, or write a sentence in
TRADEOFFS about why it is not there.

---

## 5. The time budget

For a stated four-hour assignment:

| Phase | Time | Notes |
|---|---|---|
| Read, clarify, plan | 30 min | Including the questions email |
| Skeleton + one working path end to end | 60 min | Get something running early |
| Fill out the core requirements | 90 min | The checklist from step 1 |
| Tests | 40 min | Written alongside, not bolted on |
| README + TRADEOFFS | 40 min | **Do not compress this** |
| Clean clone check, final read | 20 min | See [§14](#14-checklist) |

**On honesty about time.** If you spend eight hours on a four-hour assignment and say nothing,
you are being evaluated as though you did it in four — which is a bar you have quietly raised
for yourself. If you spend longer, say so plainly in the README: *"This took closer to six
hours; the extra went into the retry logic in §3."* Reviewers respect it and it costs nothing.

**Do not disappear for two weeks.** Turnaround time is noticed. If you need a week because of
your current job, say that when you accept the assignment.

---

## 6. Project structure that reads senior

The reviewer will spend their first ninety seconds on `ls` and the README. Make both obvious.

```
.
├── README.md              ← what it is, how to run, what you decided
├── TRADEOFFS.md           ← what you did not build, and why
├── .env.example           ← every config var, documented
├── docker-compose.yml     ← if it needs a database, make it one command
├── package.json
├── src/
│   ├── main.ts
│   ├── [feature]/         ← group by feature, not by technical layer
│   │   ├── [feature].controller.ts
│   │   ├── [feature].service.ts
│   │   ├── [feature].repository.ts
│   │   └── dto/
│   └── common/            ← genuinely shared only
└── test/
    ├── [feature].spec.ts
    └── [feature].e2e-spec.ts
```

**Principles worth following even at small scale:**

- **Group by feature, not by layer.** `src/orders/` beats `src/controllers/ + src/services/`.
  It scales, and it signals you have worked in codebases that grew.
- **One command to run it.** `docker compose up` or `npm start` after `npm install`. If a
  reviewer has to install PostgreSQL locally and guess at a schema, some fraction of reviewers
  simply will not.
- **`.env.example` with every variable.** Missing config is the most common "it does not run"
  cause, and "it does not run" is often an automatic no.
- **No dead code, no commented-out blocks, no `console.log`.** These are cheap to remove and
  expensive to leave.
- **Do not over-abstract.** Three interfaces and a factory for one implementation reads as
  someone who has read about patterns rather than needed them. See
  [../phase-1-core-programming/05-design-patterns-in-practice.md](../phase-1-core-programming/05-design-patterns-in-practice.md).

---

## 7. Testing: how much, and which kind

**Not coverage. Evidence of judgement.**

A reviewer reads your test names to learn what you thought could go wrong. That list is more
informative than the assertions.

| Write | Skip |
|---|---|
| The core business rule, including its edge cases | Getters, DTOs, framework wiring |
| One end-to-end test through the real HTTP path | 100% branch coverage |
| The error paths you deliberately handled | Tests that only restate the implementation |
| Anything concurrent or time-dependent | Mocked-everything tests that prove nothing |

**Aim for 8–15 meaningful tests** on a four-hour assignment. Name them as behaviours:

```ts
// good — tells the reviewer what you were worried about
it('rejects a duplicate order with the same idempotency key', ...)
it('retries a failed provider call three times, then dead-letters', ...)
it('does not double-charge when two requests arrive concurrently', ...)

// weak — tells the reviewer nothing
it('should work', ...)
it('tests the service', ...)
```

If you genuinely run out of time, **one good end-to-end test plus a line in the README saying
what else you would test** beats twelve shallow unit tests. Depth in the material:
[../phase-1-core-programming/04-testing-and-quality.md](../phase-1-core-programming/04-testing-and-quality.md).

---

## 8. The README — the highest-value file in the repo

Roughly a quarter of your score, and the cheapest points available. Budget 30 minutes.

```markdown
# [Project name]

[One sentence: what this does.]

## Running it

```bash
cp .env.example .env
docker compose up          # or: npm install && npm start
```

Runs on http://localhost:3000. `npm test` for the test suite.

## What I built

[The checklist from the brief, with what is done and what is not.]

- [x] [Requirement 1]
- [x] [Requirement 2]
- [ ] [Requirement 3] — deliberately out of scope, see TRADEOFFS.md

## How it is structured

[3–6 sentences. What the main pieces are and why the boundaries are where they are.
A small ASCII diagram if the flow is non-obvious.]

## The interesting decision

[The one thing worth talking about. What the problem was, what you considered,
what you chose, and what it costs. This is the paragraph that gets you the call.]

## What I would do next

[3–5 bullets. Shows you know the difference between an exercise and a system.]

## Time spent

Roughly [N] hours.
```

**The "interesting decision" section is the one that converts.** It is the written version of
the trade-off clause on your resume, and it is the thing the follow-up call will be built
around — which means you get to choose the ground the interview happens on.

---

## 9. The TRADEOFFS document

A separate file, because it does a different job from the README and because separating them
signals you have written docs for real teams.

```markdown
# Trade-offs and omissions

## Deliberately not built

**Authentication.** The brief did not mention it and adding it would have consumed
most of the budget. In production this would sit behind [approach].

**Rate limiting.** Same reasoning. The natural place is [where], using [what].

## Decisions

**In-memory store rather than PostgreSQL.** The brief emphasised [X] and the data
model is trivial; a real database would have added setup friction without
demonstrating anything the brief was asking about. The repository interface means
swapping it is a single file.

**No retry on [operation].** [Operation] is not idempotent as specified, so a naive
retry risks double-processing. I would add an idempotency key before adding retries;
doing them in the wrong order is a common way to make reliability worse.

## Known limitations

- [Thing] will not handle more than [N] concurrent [X] because [reason].
- [Thing] assumes [assumption], which the brief did not specify.
```

**Why this scores so well.** Every one of these entries converts a potential criticism into
evidence of judgement. A reviewer who notices you did not add rate limiting either thinks *"they
forgot"* or *"they decided"* — and this file is the difference.

The second decision above is worth studying: it demonstrates knowing that retries without
idempotency make things worse. That is a genuinely senior observation and it costs two
sentences.

---

## 10. Commit hygiene

Reviewers do check. A single `initial commit` containing 2,000 lines tells them nothing about
how you work; it also makes the work impossible to review incrementally, which is what they are
simulating.

| Do | Don't |
|---|---|
| 8–20 commits telling a story | One giant commit |
| `feat: add idempotency key to order creation` | `wip`, `fix`, `stuff`, `asdf` |
| Each commit leaving the repo working | Broken intermediate states |
| A branch and a PR if the brief mentions review | Force-pushing over your history |

If the brief asks you to open a pull request, **write the PR description properly**. It is a
direct test of the artifact the market read on your profile says you are missing:

> **What** — Adds order creation with idempotency handling.
> **Why** — The brief requires duplicate submissions to be safe; §3 of the spec.
> **How** — Idempotency key stored with the order, unique-constrained; a repeat request
> returns the original response rather than 409, since the client cannot distinguish its
> own retry from a genuine duplicate.
> **Testing** — Unit tests on the key collision path, one e2e test issuing the same
> request twice concurrently.
> **Not included** — Key expiry/GC. Noted in TRADEOFFS.md.

---

## 11. The follow-up call

Most take-homes are followed by a 30–60 minute discussion. **This is the round that decides the
outcome** — the code got you here, the conversation converts.

**Prepare four things:**

1. **A two-minute walkthrough.** Problem, structure, the interesting decision, what you cut.
   Rehearse it out loud. This is the same skill as the 90-second answer in
   [07-video-interview-and-psychometric.md](07-video-interview-and-psychometric.md).
2. **Defences for every decision.** For each choice, know the alternative and why you rejected
   it. "I did not think about it" is the only wrong answer.
3. **Your own critique.** They will ask what you would change. Have three specific answers
   ready — being harder on your own code than they are is a strong signal, and it closes off
   the criticism they were about to make.
4. **The scale question.** "What breaks if this gets 100× the traffic?" is near-universal.
   Know your bottleneck: usually the database, sometimes an unbatched external call. This is
   the same muscle as the HLD drills — [../phase-5-system-design/06-hld-practice-problems.md](../phase-5-system-design/06-hld-practice-problems.md).

**Expect a live extension.** "Add [small feature] now, together." They are testing whether you
actually wrote it. Know your own codebase well enough to navigate it without hesitating.

---

## 12. Common assignment archetypes

| Archetype | What they are really testing | Where to spend the depth |
|---|---|---|
| **CRUD API with a twist** | Layering, validation, error handling | The twist. It is the whole point |
| **Ingest a large file / feed** | Streaming, memory, batching, partial failure | Backpressure and what happens at row 500,000 |
| **Integrate a flaky third-party API** | Timeouts, retries, circuit breaking, idempotency | Failure handling; make it observable |
| **Rate limiter / scheduler** | Algorithm choice and concurrency correctness | The race condition, and a test that proves it |
| **Refactor this legacy code** | Judgement about what *not* to change | Small, safe steps with tests added first |
| **Bug hunt in a given repo** | Reading unfamiliar code, systematic debugging | The written diagnosis, not just the patch |
| **Design doc, no code** | Written communication, trade-off reasoning | Structure and explicit alternatives |

The middle three map directly onto material you already have:
[03c-nodejs-async-and-simulation-tasks.md](03c-nodejs-async-and-simulation-tasks.md) for retry,
pooling and idempotency, and
[../phase-2-apis-realtime-systems/04-event-driven-architecture.md](../phase-2-apis-realtime-systems/04-event-driven-architecture.md)
for the reliability patterns.

---

## 13. When to decline

Take-homes are unpaid labour and your time is the scarce resource in a 30-day sprint. Decline
when:

- **It exceeds ~8 hours** and there has been no human conversation yet. A company that asks
  for a day of unpaid work before speaking to you is telling you something.
- **It is obviously production work.** "Build the [feature] we are about to ship" is not an
  assessment.
- **It arrives before any screen.** Ask for a 20-minute call first. Most reasonable companies
  agree, and the ones that do not have saved you the time.

**How to push back without losing the role:**

> Happy to do this. Given it looks closer to [N] hours than the [M] stated, would it work if I
> time-boxed it to [M] hours and documented what I would have done with the rest? I would
> rather show you my judgement about scope than hand in something rushed.

This response has itself been the reason people got hired. It is precisely the negotiation a
lead does with a product manager.

---

## 14. Checklist

**Before starting**
- [ ] Brief read twice; explicit requirements extracted into a checklist
- [ ] Clarifying questions sent, with proposed answers
- [ ] Time budget agreed and written down
- [ ] Identified the one dimension to show depth on

**Before submitting**
- [ ] `git clone` into a fresh directory, follow your own README exactly — it runs
- [ ] `.env.example` covers every variable
- [ ] Tests pass from clean
- [ ] No dead code, no `console.log`, no commented-out blocks
- [ ] README has: run instructions, requirement checklist, structure, the interesting decision, what's next, time spent
- [ ] TRADEOFFS.md exists and names at least three deliberate omissions
- [ ] Commit history tells a story
- [ ] Every requirement from the brief is either done or explicitly documented as not done

**Before the follow-up call**
- [ ] Two-minute walkthrough rehearsed out loud
- [ ] An alternative and a reason for every significant decision
- [ ] Three self-criticisms ready
- [ ] Know your bottleneck at 100× traffic

---

## Related

- [00-platform-playbook.md](00-platform-playbook.md) — the automated assessments this round replaces
- [05-rest-api-and-debugging-challenges.md](05-rest-api-and-debugging-challenges.md) — the API and bug-hunt archetypes
- [03c-nodejs-async-and-simulation-tasks.md](03c-nodejs-async-and-simulation-tasks.md) — retry, pooling, idempotency
- [10-reverse-interview-bank.md](10-reverse-interview-bank.md) — what to ask on the follow-up call
- [../resume/02-linkedin-and-profiles.md](../resume/02-linkedin-and-profiles.md) — turning a good take-home into a portfolio repo
