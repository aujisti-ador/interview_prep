# Reading Unfamiliar Code

> Two things at once: a real senior interview format — *"here is our repo, find the bug / add
> this feature"* — and literally what you will spend your first month doing at whatever job you
> win.
>
> Most engineers have never been taught a method for this. They open `main.ts` and start
> scrolling, which does not scale past a few thousand lines.

## In 60 seconds

1. **Do not start at the top and read down.** A codebase is not a book. You will run out of
   attention long before you reach anything that matters.
2. **Start from a behaviour and trace it.** Pick one thing the system does — "a user places an
   order" — and follow it from entry point to database. One complete path teaches you more than
   ten files skimmed.
3. **Find the entry points first.** In a Node backend those are routes, queue consumers, cron
   jobs and CLI commands. Everything the system does starts at one of them.
4. **Read the tests before the implementation.** Tests state intended behaviour without the
   noise, and the test names alone are a specification.
5. **Follow the data, not the calls.** Where does this value come from, where is it written,
   who else reads it. Data flow survives refactors; call stacks do not.
6. **Write down what you learn as you go.** You will forget. A file of notes and a sketch is
   the deliverable of your first week, and it is the thing your manager actually wants.

**The interview trap to expect:** they hand you a repo and ask you to add a small feature. The
mistake is diving straight into writing. **Spend the first ten minutes orienting out loud** —
where does this start, where do things live, what conventions does it use — and say what you
are doing. That narration is most of the score.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Entry point** | Where execution starts — an HTTP route, a queue consumer, a cron job |
| **Call graph** | Which function calls which. Useful, but shallow |
| **Data flow** | Where a value comes from and goes to. Deeper and more durable |
| **Seam** | A place you can change behaviour without editing surrounding code |
| **Characterisation test** | A test written to capture what code *currently* does, before you change it |
| **Legacy code** | Code without tests. Not code that is old |
| **Chesterton's Fence** | Do not remove something until you know why it is there |
| **Bus factor** | How many people must vanish before nobody understands this |
| **Tracer bullet** | One complete path traced end to end, to establish the shape |
| **Code archaeology** | Using git history to find out *why* something is the way it is |
| **`git blame` / `git log -S`** | Who last changed this line · when a string first appeared |
| **Cargo culting** | Copying a pattern without understanding it |

---

## Table of Contents

1. [Why the obvious approach fails](#1-why-the-obvious-approach-fails)
2. [The method: orient, trace, map](#2-the-method-orient-trace-map)
3. [Step 1 — orient in ten minutes](#3-step-1--orient-in-ten-minutes)
4. [Step 2 — trace one behaviour end to end](#4-step-2--trace-one-behaviour-end-to-end)
5. [Step 3 — build the map](#5-step-3--build-the-map)
6. [Using git as a research tool](#6-using-git-as-a-research-tool)
7. [Making your first change safely](#7-making-your-first-change-safely)
8. [The interview version of this round](#8-the-interview-version-of-this-round)
9. [Working with genuinely bad code](#9-working-with-genuinely-bad-code)
10. [Interview questions](#10-interview-questions)

---

## 1. Why the obvious approach fails

Opening the repo and reading files in alphabetical order fails for a specific reason: **you have
no way to tell what is important.**

Every file looks equally significant when you have no model of the system. So you spend your
attention uniformly across code that is 5% essential and 95% plumbing, configuration, and things
nobody has touched in three years.

```
   ❌ Breadth-first reading            ✅ Trace-first reading

   src/                                POST /orders
   ├── config/     ← 20 min                 ↓
   ├── common/     ← 30 min            orders.controller.ts
   ├── entities/   ← 40 min                 ↓
   ├── modules/    ← attention gone    orders.service.ts
   └── ...                                  ↓
                                       inventory.service.ts ──▶ Kafka
   You now know the folder                  ↓
   names and nothing else.             orders.repository.ts ──▶ Postgres

                                       You now understand the actual system.
```

**The principle:** understanding is built along paths, not across surfaces.

---

## 2. The method: orient, trace, map

Three phases. Roughly 10 minutes, 60 minutes, ongoing.

| Phase | Time | Goal |
|---|---|---|
| **Orient** | 10 min | What is this, what stack, where does it start, is it healthy |
| **Trace** | 60 min | Follow one real behaviour from entry point to storage |
| **Map** | ongoing | Write down the model you are building, and its edges |

This works at any scale, from a take-home repo to a 500k-line monolith. Only the number of
traces changes.

---

## 3. Step 1 — orient in ten minutes

Before reading any application code, answer these. Most come from files, not from source.

**What is it and how do I run it?**
```bash
cat README.md
cat package.json          # scripts, dependencies — the fastest signal available
ls docker-compose.yml Makefile   # what infrastructure does it need?
```

`package.json` tells you an enormous amount in thirty seconds: NestJS or Express, Prisma or
TypeORM, is there a test runner, is there a linter, do the scripts suggest a sane workflow.

**What shape is it?**
```bash
# Where is the code, and how much of it is there?
find src -name "*.ts" | wc -l
find src -type d -maxdepth 2

# Grouped by feature, or by technical layer? This tells you a lot about the team.
```

**Where does it start?**
```bash
# HTTP entry points
grep -rn "@Controller\|@Get\|@Post\|app.use\|router\." src | head -40

# Async entry points — the ones people forget exist
grep -rn "@EventPattern\|@MessagePattern\|@Cron\|consumer.subscribe" src
```

**Those async entry points matter.** A system's behaviour is not only its HTTP routes. Queue
consumers and cron jobs are where surprising things happen, and they are invisible if you only
read controllers.

**What does the data look like?**
```bash
cat prisma/schema.prisma          # or the entities folder, or the migrations
```

**Read the schema early.** It is the most information-dense file in most backends — it tells you
the domain nouns, their relationships, and roughly what the system is for, in one screen.

**Is it healthy?**
```bash
git log --oneline -20                    # active or abandoned?
git log --format='%an' | sort | uniq -c | sort -rn | head   # bus factor
ls src/**/*.spec.ts | wc -l              # are there tests at all?
npm test                                 # do they pass?
```

A repo where the tests do not pass on a fresh clone tells you something important about how it
is maintained, before you read a single line.

---

## 4. Step 2 — trace one behaviour end to end

**Pick the most central thing the system does.** For an e-commerce backend: placing an order.
For your `job-cracker`: submitting a solution.

Then follow it, in order, writing down each hop.

```
1. Find the entry point
   grep -rn "orders" src --include="*.controller.ts"

2. Read the handler. Note: what does it validate? what does it call?

3. Follow the call into the service. Note: business rules, side effects.

4. Follow into the repository / ORM. Note: what tables, what transaction scope.

5. Note everything that fires sideways:
   events published, jobs queued, external APIs called, caches invalidated.

6. Find the test for this path. Read it. It states the intended behaviour.
```

**Write it down as you go.** Not prose — a sketch:

```
POST /orders  (orders.controller.ts:34)
  ├─ ValidationPipe → CreateOrderDto
  ├─ AuthGuard      → req.user
  └─ ordersService.create()            (orders.service.ts:58)
       ├─ inventory.reserve()          (inventory.service.ts:21)  ← throws if short
       ├─ prisma.$transaction:
       │    ├─ order.create()
       │    └─ outbox.create('order.created')                     ← outbox pattern!
       └─ returns OrderDto

  async side:
    outbox poller → Kafka 'order.created'
      └─ payments consumer (payments.consumer.ts:19)
      └─ notifications consumer
```

**Ten minutes of that sketch is worth two hours of scrolling**, and it is immediately shareable
with anyone else who joins.

**Tools that help:**

| Technique | Use |
|---|---|
| **"Go to definition"** repeatedly | The fastest way to follow a path |
| **"Find all references"** | Who calls this? Often the more useful direction |
| **A debugger with a breakpoint** at the entry point | Step through a real request. Unbeatable for understanding |
| **Structured logs with a trace id** | If the system has them, one request's logs *are* the trace |
| **`console.trace()`** temporarily | When you find yourself asking "who called this?" |

**The debugger is under-used.** Setting one breakpoint and stepping through a real request
teaches you more in five minutes than an hour of reading, because you see actual values rather
than imagining them.

---

## 5. Step 3 — build the map

After two or three traces you have a model. Write it down before it evaporates.

**Keep a `NOTES.md` while onboarding.** Nobody will mind, and it becomes the onboarding doc the
next person needed.

```markdown
# Notes — <system>

## What it does
One paragraph, in domain language.

## Entry points
- HTTP: orders, users, admin      (src/modules/*)
- Kafka consumers: payments, notifications
- Cron: nightly reconciliation (src/jobs/reconcile.ts)

## Data model
orders ──< order_items
   └──> users
Outbox table drives all async work.

## Conventions I've noticed
- Feature folders, not layer folders
- Services throw domain errors; a filter maps them to HTTP
- Every async handler is idempotent (checks an events table first)

## Things I don't understand yet
- Why does PricingService cache for exactly 37 seconds?      ← ask
- What is `legacy_sync.ts` for? Nothing seems to call it.    ← ask
- Two ways of doing validation. Which is current?            ← ask

## Landmines
- Do not change the `orders.status` enum — the mobile app
  parses it by string value.
```

**The "things I don't understand" section is the valuable one.** It converts confusion into
specific questions, and asking three sharp questions in week one is far better than asking
thirty vague ones in week four.

**On the 37-second cache:** that is Chesterton's Fence. There is a reason, it is probably
embarrassing, and it is probably load-bearing. Find out before you touch it.

---

## 6. Using git as a research tool

Git answers *why*, which no amount of reading the current code can.

```bash
# Who last touched this line, and in which commit?
git blame -L 40,60 src/pricing.service.ts

# The commit message and diff for that change — often explains the weirdness
git show <sha>

# When did this string first appear? Great for tracking down a magic value.
git log -S "37000" --oneline

# How has this one file evolved?
git log --follow --oneline -- src/pricing.service.ts

# What usually changes together with this file? Reveals hidden coupling.
git log --format=format: --name-only --since=6.months | sort | uniq -c | sort -rn | head -20
```

**That last one is quietly powerful.** If `orders.service.ts` and `inventory.service.ts` always
change in the same commits, they are coupled regardless of what the architecture diagram claims.

**Read the PR, not just the commit.** If the repo is on GitHub, `gh pr list --search <sha>` gets
you the discussion, which is where the reasoning actually lives.

---

## 7. Making your first change safely

You understand a slice. Now you have to change it without breaking things you have not read.

**The order that keeps you safe:**

**1. Reproduce the current behaviour.** Run it. See it work. You cannot tell if you broke
something without a baseline.

**2. Write a characterisation test** — a test that captures what the code does *now*, right or
wrong.

```ts
// Not "what it should do" — what it DOES. This is your safety net,
// and it will fail loudly if your change alters something you did not intend.
it('currently rounds the discount down to the nearest whole taka', () => {
  expect(price({ base: 1000, discountPct: 7.5 })).toBe(925);
});
```

If the codebase has no tests, **this is how you start adding them** — not by writing a test plan
for the whole system, but by pinning the behaviour of the thing you are about to touch.

**3. Make the smallest possible change.** Resist the urge to tidy while you are in there. A
diff that mixes a fix with a refactor is hard to review and hard to revert.

**4. Follow the local conventions**, even ones you dislike. Consistency is worth more than your
preference, and week one is not when you relitigate it.

**5. Check the blast radius.** Before you finish: `grep` for other callers, check whether the
value is serialised anywhere, and ask whether anything downstream parses it.

**6. Ask, at the point of doubt.** "I'm about to change X — is there anything about it I should
know?" costs one message and has prevented a great many incidents.

---

## 8. The interview version of this round

You are given a small repo, 30–60 minutes, and a task: find a bug, add a feature, or review it.

**What is actually being scored:**

| Signal | What good looks like |
|---|---|
| **Do you orient before typing?** | The first 5–10 minutes spent understanding, out loud |
| **Do you find the conventions?** | Your change looks like it belongs |
| **Do you read the tests?** | You mention them, and you add one |
| **Is your change minimal?** | You did not rewrite anything you were not asked to |
| **Do you check the blast radius?** | "Let me check who else calls this" |
| **Do you ask good questions?** | About intent, not syntax |

**Narrate the orientation** — it is invisible otherwise:

> "Let me get oriented first. `package.json` says NestJS and Prisma… feature folders, so I'd
> expect the order logic under `modules/orders`… let me check the tests for that module to see
> what's already covered… right, and the schema shows orders have a status enum. Now let me
> find the entry point for the thing you asked about."

That paragraph is 40 seconds and it demonstrates a method. Candidates who open a random file and
start editing demonstrate the opposite.

**If asked to review rather than change**, prioritise in this order and say so: **security →
correctness → performance → readability → style.** Opening with "the variable naming is
inconsistent" when there is an unparameterised SQL query reads as junior. More in
[../phase-0-online-assessments/05-rest-api-and-debugging-challenges.md](../phase-0-online-assessments/05-rest-api-and-debugging-challenges.md).

**Say what you would *not* change.** Restraint is a senior signal and costs one sentence.

---

## 9. Working with genuinely bad code

Sometimes it is a 4,000-line file with no tests and three abstractions fighting each other.

**Rules that hold up:**

**"Legacy code" means code without tests**, not code that is old. Michael Feathers' definition,
and it is the useful one — because it tells you the fix is tests, not a rewrite.

**Do not rewrite. Strangle.** Put a seam in front, move one behaviour at a time, delete the old
path when nothing calls it. The same
[strangler fig](../phase-5-system-design/02-architecture-patterns.md) pattern as service
migration, at file scale. Big-bang rewrites fail for the same reason at every scale: you have to
reproduce behaviour nobody has written down.

**Chesterton's Fence.** The weird 37-second cache, the retry that only fires on Tuesdays, the
`if (user.id === 4102)`. Every one has a reason, usually an incident. Find out before removing.
`git log -S` is how.

**Leave it better, marginally.** Add the test you needed. Rename the one variable that confused
you. Do not embark on a cleanup crusade in code you understood forty minutes ago.

**Your confusion is data.** If you find it hard, so will the next person. That is worth a note
in `NOTES.md` — and possibly worth a comment in the code explaining what you eventually worked
out.

---

## 10. Interview questions

**Q: You join a team with a 200k-line codebase. How do you get productive?**
> I'd trace one core behaviour end to end in the first day — entry point, service, database, and
> anything async that fires sideways — and sketch it. Then read the schema, because it is the
> most information-dense file in a backend. I'd keep a notes file of what I do not understand
> and turn it into three specific questions rather than thirty vague ones. And I'd take a small
> ticket in week one to exercise the whole change-and-deploy path.

**Q: You find code you think is wrong. What do you do?**
> `git blame` and read the commit, then the PR discussion. Usually there is a reason and it is
> an incident I did not know about. If there genuinely is no reason, I add a characterisation
> test first so I can prove my change does not alter behaviour I did not intend.

**Q: How do you approach a bug in code you have never seen?**
> Reproduce first, always. Then read the error properly rather than guessing, form one
> hypothesis, and test that one hypothesis before changing anything. After fixing it, I ask
> whether the same pattern exists elsewhere — that is usually the more valuable finding.

**Q: The codebase has no tests. Where do you start?**
> Not with a test plan for the whole system. I add characterisation tests around the specific
> thing I am about to change, so I have a safety net for that change. Coverage grows behind the
> work rather than as a separate project, which is the only way it actually happens.

**Q: How do you know when you understand a system well enough?**
> When I can predict where a change needs to go before I look. If someone describes a new
> requirement and I can name the files, I have a real model. If I still have to search, I do not.

---

## Related

- [07-ai-assisted-development.md](07-ai-assisted-development.md) — reading code is the skill that got *more* valuable, and this is why
- [04-testing-and-quality.md](04-testing-and-quality.md) — characterisation tests, and testing legacy code
- [05-design-patterns-in-practice.md](05-design-patterns-in-practice.md) — seams, and recognising patterns in others' code
- [../phase-0-online-assessments/05-rest-api-and-debugging-challenges.md](../phase-0-online-assessments/05-rest-api-and-debugging-challenges.md) — find-the-bug drills and the code-review round
- [../phase-0-online-assessments/11-live-coding-and-pairing.md](../phase-0-online-assessments/11-live-coding-and-pairing.md) — doing this with someone watching
- [../phase-5-system-design/02-architecture-patterns.md](../phase-5-system-design/02-architecture-patterns.md) — strangler fig, at system scale
- [../phase-0-online-assessments/09-take-home-assignments.md](../phase-0-online-assessments/09-take-home-assignments.md) — the "refactor this" archetype
