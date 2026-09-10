# The Master Resume

> This is your one source of truth. Every job application is a **selection** from this file —
> never an edit of it.
>
> Fill it once, properly. After that, tailoring takes ten minutes per application.
>
> The reasoning behind every rule here is in [00-resume-system.md](00-resume-system.md).

## How this file works

Think of it like a warehouse and a shop window.

```
   MASTER RESUME (this file)              APPLICATION #1
   ─────────────────────────              ──────────────
   • bullet about scale                   • bullet about scale
   • bullet about latency        ──┐      • bullet about latency
   • bullet about cost             │      • bullet about the decision
   • bullet about the decision   ──┘
   • bullet about mentoring               APPLICATION #2
   • bullet about the migration  ──┐      ──────────────
   • bullet about testing          │      • bullet about the migration
   • ...20 more                    └──▶   • bullet about mentoring
                                          • bullet about testing
   The warehouse. Never sent.
   Grows forever.                         The shop window. 3-4 bullets per role.
```

You keep everything. You *send* a small selection each time.

---

## Table of Contents

1. [Before you start](#1-before-you-start)
2. [The template](#2-the-template)
3. [A filled example](#3-a-filled-example)
4. [The bullet bank](#4-the-bullet-bank)
5. [Summary lines for different job postings](#5-summary-lines-for-different-job-postings)
6. [The Selected Work section](#6-the-selected-work-section)
7. [Skills](#7-skills)
8. [Fill it in: a 90-minute session](#8-fill-it-in-a-90-minute-session)

---

## 1. Before you start

**Placeholders look like `[THIS]`.** Every one is something only you can fill in.

**About the numbers in the example.** They come from this repo's own description of your
background — 41M subscribers at telecom scale, Kafka/RabbitMQ/Redis work, Agora real-time
streaming. They are there so you can see **the shape of a strong bullet**.

> ⚠️ **Check or replace every one of them before you send anything.**
>
> A number you cannot defend in a follow-up question is worse than having no number at all.
> See [§5 of the system doc](00-resume-system.md#5-finding-numbers-when-you-think-you-have-none).

**The bullet bank is meant to be too long for one page.** That is the point. It is the
warehouse.

---

## 2. The template

Copy this into Google Docs, Word, or whatever you lay out in.

```
─────────────────────────────────────────────────────────────────────────────
[FULL NAME]
Senior Backend Engineer · Node.js / NestJS / AWS · GMT+6
[email] · [phone] · github.com/[handle] · linkedin.com/in/[handle]
─────────────────────────────────────────────────────────────────────────────

SUMMARY
[One sentence: your level + years + stack + biggest scale number + domain.]
[You rewrite only this line per application. See §5.]

EXPERIENCE

[Most Recent Title]                                    [Mon YYYY] – Present
[Company], [City / Remote]
  • [Biggest result. verb + system + scale + outcome + trade-off.]
  • [Second biggest result.]
  • [Third — ideally a leadership one: a decision, a standard, or people.]
  • [Optional fourth, only if it adds something the others do not.]

[Previous Title]                                  [Mon YYYY] – [Mon YYYY]
[Company], [City]
  • [Best result from this role.]
  • [Second.]
  • [Third.]

[Earlier Title]                                   [Mon YYYY] – [Mon YYYY]
[Company], [City]
  • [One or two lines only. Older roles get compressed hard.]

SELECTED WORK
  [repo-name] — [one line: what it is, what it shows]    github.com/[...]
  [repo-name] — [one line]                               github.com/[...]

SKILLS
  Languages      [...]
  Backend        [...]
  Data           [...]
  Infrastructure [...]
  Practices      [...]

EDUCATION
  [Degree], [Institution], [Year]
─────────────────────────────────────────────────────────────────────────────
```

### Why the bullets are ordered this way

The reader gets tired going down the page. So:

- **Most recent role gets 4 bullets.** Older roles get fewer. Your oldest role may get one.
- **Within a role, biggest result first.** Do not save the best for last — there is no last.
- **Bullet 3 of your newest role should be a leadership bullet** if you have one. It is still
  high on the page but after you have proved you can build things.

---

## 3. A filled example

> ⚠️ **This is an illustration, not your resume.** The employers, dates and figures are
> reconstructed from this repo's description of your background and are **unverified**.
> Replace every one.

```
─────────────────────────────────────────────────────────────────────────────
[FULL NAME]
Senior Backend Engineer · Node.js / NestJS / AWS · GMT+6 · 4h CET overlap
[email] · github.com/[handle] · linkedin.com/in/[handle]
─────────────────────────────────────────────────────────────────────────────

SUMMARY
Backend engineer with [N] years building event-driven systems at telecom scale —
most recently the notification and subscriber-data platform serving 41M
subscribers at [Company]. Deep in Node.js/NestJS, Kafka and PostgreSQL;
comfortable owning a system from API contract to on-call rotation.

EXPERIENCE

Senior Backend Engineer                                [Mon YYYY] – Present
[Company], Dhaka
  • Designed a Kafka-backed notification platform delivering 4M+ messages/day
    to 41M subscribers, holding p99 under 2s through upstream provider outages
    via per-channel circuit breakers and a retry budget.
  • Cut subscriber-lookup p99 from 2.4s to 380ms by denormalising the read path,
    accepting eventual consistency on profile updates in exchange for removing
    a synchronous cross-service join.
  • Chose RabbitMQ over Kafka for the order pipeline — per-queue ordering
    mattered more than replay, and the team had no Kafka operational
    experience. Documented as an ADR; still the standard [N] years on.
  • Established the service template (health checks, structured logging,
    migration harness) now used by all [N] backend services, cutting
    new-service setup from ~3 days to under an hour.

Backend Engineer                                  [Mon YYYY] – [Mon YYYY]
[Company], Dhaka
  • Built the real-time layer for a live-streaming product on Agora and
    WebSockets, sustaining [N]k concurrent viewers with [N]% join success
    during peak events.
  • Migrated [N]M rows to a new schema with zero downtime using an
    expand/contract rollout and dual writes, with a tested rollback at
    every step.
  • Mentored 4 engineers through their first production incident ownership;
    two now run their own services.

Software Engineer                                 [Mon YYYY] – [Mon YYYY]
[Company], Dhaka
  • [The one thing worth remembering from this role, with a number.]

SELECTED WORK
  job-cracker — Self-hosted study platform: NestJS + Prisma API, React SPA,
                in-browser test harness for 101 coding problems.   github.com/[...]
  [repo]      — [one line]                                          github.com/[...]

SKILLS
  Languages      TypeScript, JavaScript (Node.js), SQL
  Backend        NestJS, Express, GraphQL (AppSync), gRPC, REST, WebSockets
  Data           PostgreSQL, Redis, Kafka, RabbitMQ, DynamoDB, MongoDB, Prisma
  Infrastructure AWS (Lambda, API Gateway, ECS, S3), Docker, Kubernetes, NGINX
  Practices      Event-driven architecture, DDD, observability & SLOs, CI/CD, ADRs

EDUCATION
  [Degree], [Institution], [Year]
─────────────────────────────────────────────────────────────────────────────
```

### Why this version works — bullet by bullet

| Bullet | What it is doing |
|---|---|
| 1 (`Designed…`) | Puts `41M` in the first line a hiring manager reads. Verb is ownership-level. Ends with a technique (`circuit breakers`) that invites a question |
| 2 (`Cut…`) | Before-and-after numbers, plus **the trade-off** — this is the most senior sentence on the page |
| 3 (`Chose…`) | A **decision with a rejected alternative**, and it mentions the *team's* experience, not just technology. This is the lead signal |
| 4 (`Established…`) | Your work multiplied across other people. Leverage |
| Streaming bullet | Your genuine differentiator. Nobody else in the pile has this |
| Migration bullet | Proves you handle risk carefully. `tested rollback` is the reassuring detail |
| Mentoring bullet | Names an outcome **for them** ("two now run their own services"), not an activity for you |

**Notice the verb progression:** `Designed` → `Cut` → `Chose` → `Established`. It climbs from
building to deciding. That is the shape of a Lead resume.

---

## 4. The bullet bank

Write **every** bullet you can defend here. Cut nothing — this file is never sent.

Aim for **at least two per category**. If a category is empty, that is a gap in your *history*,
and it tells you what to go and do at work this quarter.

### Scale & throughput

*How big was it?*

- [ ] `[verb] [system] serving [N] users / [N] req/s / [N] events per day, [outcome]`
- [ ] `[...]`

> **Example:** Designed a Kafka-backed notification platform delivering 4M+ messages/day to 41M
> subscribers.

### Latency & performance

*What got faster?*

- [ ] `Cut [metric] from [before] to [after] by [mechanism], accepting [trade-off]`
- [ ] `[...]`

> **Example:** Cut subscriber-lookup p99 from 2.4s to 380ms by denormalising the read path,
> accepting eventual consistency on profile updates.

### Reliability & incidents

*What stopped breaking?*

- [ ] `Reduced [failure] from [N] to [N] by [mechanism]`
- [ ] `Led the response to [incident]; [what changed structurally afterwards]`
- [ ] `[...]`

> **Example:** Eliminated silent SMS loss during operator outages by adding retry-with-backoff
> and a dead-letter queue, cutting failed-send spend ~15%.
>
> Note the second template: leading an *incident* is a strong bullet, and the important half is
> **what changed afterwards** — that is what separates firefighting from engineering.

### Cost

*What got cheaper?*

- [ ] `Cut [infra/vendor] spend by [N]% / $[N]/mo by [mechanism], with no change to [SLO]`
- [ ] `[...]`

> **Example:** Cut Lambda spend 38% by batching writes and right-sizing memory, with no change
> to the p99 SLO.
>
> The `with no change to [SLO]` clause matters. Anyone can make something cheaper by making it
> worse. Saying it stayed as fast proves you did it properly.

### Migration & risk removed

*What dangerous thing did you do safely?*

- [ ] `Migrated [N] rows / [N] services from [X] to [Y] with zero downtime using [approach]`
- [ ] `[...]`

> **Example:** Migrated 400M rows to a new schema with zero downtime using expand/contract and
> dual writes, with a tested rollback at every step.
>
> **In plain terms:** *expand/contract* means you add the new column first, write to both old
> and new for a while, move readers across, then finally delete the old one. Nothing breaks at
> any single step.

### Architecture decisions ← **the lead signal**

*What did you choose, and what did you say no to?*

- [ ] `Chose [X] over [Y] for [system] because [reason]; [what it enabled / how long it held]`
- [ ] `[...]`

> **Example:** Chose RabbitMQ over Kafka for the order pipeline — per-queue ordering mattered
> more than replay, and the team had no Kafka operational experience.
>
> The best versions of this bullet mention a **non-technical** reason too (team skills,
> deadline, cost). That is what real architecture decisions look like.

### Standards & platform ← **the lead signal**

*What did you build that other people now build on?*

- [ ] `Established [standard/template/process], adopted by [N] teams/services, [measured effect]`
- [ ] `[...]`

> **Example:** Established the service template now used by all 9 backend services, cutting
> new-service setup from ~3 days to under an hour.

### People ← **the lead signal**

*Who is better at their job because of you?*

- [ ] `Mentored [N] engineers [through what]; [what they can now do]`
- [ ] `Introduced [review/design practice]; [measured effect on quality or speed]`
- [ ] `[...]`

> **Weak:** Mentored junior developers.
> **Strong:** Mentored 4 engineers through their first production incident ownership; two now
> run their own services.
>
> The difference: the strong version says what changed **for them**.

### AI / LLM ← **the 2026 market signal**

*Have you shipped anything using a language model?*

- [ ] `[Built/integrated] [what] using [approach], handling [N] requests, [cost or quality outcome]`
- [ ] `[...]`

> **If this section is empty, it is the highest-return gap on your whole resume.**
>
> A large share of remote backend postings now mention it. Silence here means you are competing
> for a smaller pool than you need to be.
>
> The fix is small: one honest project. See
> [../phase-2-apis-realtime-systems/06-ai-llm-integrations.md](../phase-2-apis-realtime-systems/06-ai-llm-integrations.md)
> and the second-repo suggestion in
> [02-linkedin-and-profiles.md](02-linkedin-and-profiles.md#7-making-two-repos-count).
>
> **Example of what a first bullet here could look like:** Built a retrieval-backed Q&A service
> over 60 internal documents using pgvector and hybrid search, cutting support-team lookup time
> from ~4 minutes to under 30 seconds; per-query cost held under $0.01 through embedding cache.

---

## 5. Summary lines for different job postings

You rewrite **only this line** per application (plus the first bullet). Keep the variants here
so you are not composing at 11pm.

**Default / generic**

> Backend engineer with [N] years building event-driven systems at telecom scale — most
> recently a platform serving 41M subscribers. Deep in Node.js/NestJS, Kafka and PostgreSQL.

**Posting emphasises scale / distributed systems**

> Backend engineer who has run event-driven systems at 41M-subscriber scale: Kafka, RabbitMQ,
> Redis, and the failure modes that come with them. [N] years, Node.js/NestJS on AWS.

**Posting emphasises real-time / streaming**

> Backend engineer specialising in real-time systems — WebSocket and Agora-based live streaming
> at [N]k concurrent viewers, plus event-driven platforms at 41M-subscriber scale.

**Posting emphasises AI / LLM**

> Backend engineer building [LLM feature] on Node.js/NestJS, with [N] years of production
> event-driven and API work at telecom scale behind it.

**Posting is a Lead / Staff role**

> Backend engineer moving from owning systems to owning decisions: [N] years, telecom scale
> (41M subscribers), and the architecture standards [N] services are built on today.

**Posting is Bangladesh-local and brand-sensitive**

> Senior Backend Engineer at [recognisable company], [N] years across telecom-scale
> event-driven platforms, real-time streaming, and AWS infrastructure.

### How to pick

Read the job posting. Ask: **what is the first hard problem they mention?**

- "scaling our event pipeline" → the scale variant
- "our chat feature is slow" → the real-time variant
- "you'll lead the backend team" → the lead variant

Then make sure your first bullet matches the same theme. That is the whole tailoring job.

---

## 6. The Selected Work section

Two repositories. One line each.

This section is worth more than twenty skill keywords, because **it is the only claim on your
resume a stranger can verify in thirty seconds.**

### What makes a repo count

| Counts | Does not count |
|---|---|
| A README explaining the problem, the design, and the trade-offs | A README that only says `npm install && npm start` |
| Commits spread over time, with real messages | One commit called "initial commit" with 8,000 lines |
| Tests that actually run | A `tests/` folder with a placeholder file |
| A decision you can defend | A tutorial you followed step by step |

### You already have one

`job-cracker` in this repo is a real full-stack system — NestJS + Prisma API, React SPA, an
in-browser test harness, a Docker setup, and a content validator that proves 101 reference
solutions pass.

Its README explains *why* the document reader streams sections in, and includes a note about a
real bug (server-computed anchor ids silently disagreeing with the renderer). **That kind of
writing is exactly what this section exists to point at.**

**Why that matters specifically for you:** this repo's own market assessment lists *"written
English artifacts — an ADR, an RFC, a good PR description. Without those I am guessing"* as a
hesitation. A repo with a genuinely good README answers that objection directly. So this
section does two jobs at once.

### The second repo should fill your thinnest gap

Right now that is almost certainly **AI/LLM**.

Small and finished beats ambitious and half-done. A good candidate: a retrieval-backed Q&A
service over this repo's own guides, with a README that honestly discusses chunking choices,
embedding cost, latency, and how you tested output that is different every time.

**Two days of work**, and it turns the emptiest section of your bullet bank into a defensible
claim.

### What every repo README must contain

| Section | Why it is there |
|---|---|
| One-line description | The three-second test |
| Screenshot or diagram | The ten-second test |
| The problem it solves | Shows you build for reasons, not for practice |
| How to run it | Basic respect for the reader |
| Architecture, briefly | This is the part hiring managers actually read |
| One decision and its trade-off | **This is the part that gets you the interview** |

---

## 7. Skills

Grouped. Scannable. No ratings, no bars, no percentages.

```
Languages       TypeScript, JavaScript (Node.js), SQL, [Python?]
Backend         NestJS, Express, GraphQL (Apollo/AppSync), gRPC, REST, WebSockets
Data            PostgreSQL, Redis, Kafka, RabbitMQ, DynamoDB, MongoDB, Prisma/TypeORM
Infrastructure  AWS (Lambda, API Gateway, ECS, S3, CloudWatch), Docker, Kubernetes,
                NGINX, Terraform, GitHub Actions
Practices       Event-driven architecture, DDD, observability & SLOs, CI/CD, ADRs,
                zero-downtime migrations
```

### Two rules

**1. Order within each line by what the posting wants.**

If the posting is heavy on AWS, `Infrastructure` moves up and `AWS` goes first on its line.
This is one of the four steps in the
[10-minute tailor](00-resume-system.md#9-tailoring-quickly-when-you-apply-a-lot).

**2. The honesty test.**

For every single item, ask:

> *"If the interviewer spends fifteen minutes on this one, do I come out looking good?"*

If the answer is no, **delete it.**

A short list you own completely beats a long list with a landmine in it. Every item you list is
permission for them to ask.

---

## 8. Fill it in: a 90-minute session

Do this in **one sitting.** If you split it across days you get a document with three different
voices, and it reads that way.

| Time | Step | What you are doing |
|---|---|---|
| **0:00–0:20** | **Dump** | Every project you can remember. No formatting, no filtering, no judging. Just names and one line each |
| **0:20–0:50** | **Numbers** | Go through the [six angles](00-resume-system.md#5-finding-numbers-when-you-think-you-have-none) and attach a figure to as many as you can. Check old dashboards, Jira tickets, Slack messages, git history |
| **0:50–1:15** | **Bullets** | Turn the best ones into `verb + system + scale + outcome + trade-off`. Fill the [bullet bank](#4-the-bullet-bank). Write **more than you need** |
| **1:15–1:30** | **Select & lay out** | Pick 3–4 per role, newest role first. Fill the template. Write the default summary line |

**The 0:20–0:50 block is the one everyone skips, and it is the one that matters.** Without
numbers, the remaining forty minutes produce a job description.

Then **stop.** Run the
[checklist](00-resume-system.md#11-checklist-before-you-send) tomorrow with fresh eyes — not
tonight.

### Second pass, in week 3 of the plan

By then you will have had real interviews. **Every question that caught you off guard is a
signal.**

- Did they push hard on something you claimed? You may be over-claiming it.
- Did they seem surprised by something good? You are under-selling it — move it up.
- Did nobody ever ask about a bullet? It is probably not earning its space.

Fix those specific lines. Do not rewrite the whole document.

---

## Related

- [00-resume-system.md](00-resume-system.md) — why every rule here exists
- [02-linkedin-and-profiles.md](02-linkedin-and-profiles.md) — the same claims, for LinkedIn and GitHub
- [03-outreach-and-referrals.md](03-outreach-and-referrals.md) — the two-sentence version
- [../phase-0-online-assessments/07-video-interview-and-psychometric.md](../phase-0-online-assessments/07-video-interview-and-psychometric.md) — saying it out loud in 90 seconds
