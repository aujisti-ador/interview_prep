# LinkedIn, GitHub & Your Public Profile

> Your resume is **pull** — it only arrives somewhere because you sent it.
> These profiles are **push** — they work while you sleep.
>
> For international remote roles, this is often how you get found in the first place.
>
> Everything here comes from your master resume. If you have not written that yet, go back to
> [01-master-resume.md](01-master-resume.md).

## The whole document in 60 seconds

1. **Your LinkedIn headline is the most important field on the platform.** It decides whether
   recruiters find you at all.
2. **Write your About section in first person, like a human.** Not "Fazle is a passionate
   developer."
3. **Recruiters search using literal words.** If `NestJS` is not written on your profile, you
   do not exist for that search.
4. **Two GitHub repos with good READMEs** beat twenty half-finished ones.
5. **Your writing here is your English test.** Nobody says so, but it is being judged.

---

## Table of Contents

1. [Why this matters more for remote work](#1-why-this-matters-more-for-remote-work)
2. [LinkedIn: the headline](#2-linkedin-the-headline)
3. [LinkedIn: the About section](#3-linkedin-the-about-section)
4. [LinkedIn: everything else](#4-linkedin-everything-else)
5. [How recruiters actually find people](#5-how-recruiters-actually-find-people)
6. [The GitHub profile README](#6-the-github-profile-readme)
7. [Making two repos count](#7-making-two-repos-count)
8. [The English problem, and four cheap fixes](#8-the-english-problem-and-four-cheap-fixes)
9. [Checklist](#9-checklist)

---

## 1. Why this matters more for remote work

For a Bangladesh-based engineer applying to companies abroad, your public profile does three
jobs your resume cannot.

### Job 1: Inbound

A large share of remote roles are filled from **recruiter search**, not from the pile of
applications.

```
   The normal path (competitive)          The quiet path (much less competitive)
   ─────────────────────────────          ──────────────────────────────────────
   You see a job posting                  A recruiter searches their database
        ↓                                        ↓
   400 other people also see it           Finds ~30 matching profiles
        ↓                                        ↓
   You apply                              Messages 10 of them
        ↓                                        ↓
   You are #217 in the pile               You are 1 of 10, and they contacted you
```

If your profile does not contain the words a recruiter searches for, **the second path never
happens to you.**

### Job 2: Verification

A hiring manager who likes your resume will look you up. Guaranteed.

What they find either **confirms** your resume or **quietly undercuts it.** If your resume says
"Senior Backend Engineer, event-driven systems" and your LinkedIn says "Software Developer |
Passionate about coding 🚀", you have a problem you will never be told about.

### Job 3: Proof that you write English well

This is the one that matters most for your situation, and the one nobody tells you.

This repo's own market assessment lists it directly:

> *"For remote roles I want to see how you write — an ADR, an RFC, a good PR description.
> Without those I am guessing."*

**Think about that.** Spoken English gets practised in mock interviews. Written English gets
judged **silently, before anyone talks to you**, from things you probably wrote in five minutes.

Your LinkedIn About section and your repo READMEs *are* the writing sample — whether you meant
them to be or not.

---

## 2. LinkedIn: the headline

**220 characters.** It appears everywhere your name appears, and it is **weighted most heavily
in recruiter search.**

This is the single highest-value field on LinkedIn.

### Do not use the default

When you fill in your job, LinkedIn auto-generates:

```
❌ Senior Backend Engineer at Banglalink
```

This wastes your 220 characters on your employer's name. Your employer is already listed
elsewhere on the profile.

### The formula

```
[Level] [Role] · [main technologies] · [what makes you different] · [availability]
```

### Three examples you can adapt

```
✅ Senior Backend Engineer · Node.js, NestJS, TypeScript, AWS ·
   Event-driven systems at 41M-user scale · Open to remote (GMT+6)
```

```
✅ Senior Backend Engineer | Node.js · Kafka · PostgreSQL · AWS |
   Real-time & event-driven platforms | Remote-ready, 4h CET overlap
```

```
✅ Backend Engineer (Node.js/NestJS) · Distributed systems, Kafka, WebSockets ·
   41M-subscriber scale · Available for remote roles
```

### Why each part is there

| Part | Reason |
|---|---|
| Level word (`Senior`) | Recruiters filter by seniority. Without it you are filtered out |
| Technology names, early | Search matches on these. If the headline gets cut short, you want them saved |
| One number (`41M`) | This is what stops someone scrolling past |
| `Open to remote (GMT+6)` | Answers "would this person even work for us?" before they wonder |

### What to avoid

```
❌ Full Stack Developer 🚀 | Passionate about clean code | Lifelong learner
```

- No level word
- No specific technologies to search on
- Emoji and "passionate" read junior in every market you are targeting
- "Lifelong learner" is true of everyone and therefore means nothing

---

## 3. LinkedIn: the About section

**2,600 characters allowed.** But only the first **~300** are visible before the "…see more"
button.

So treat the opening as a second headline.

### The structure

```
[Hook — one sentence. Your strongest claim, with the number.]

[Paragraph 1 — what you do, at what scale. Name real systems.]

[Paragraph 2 — your second dimension: real-time, or leadership, or infrastructure.]

[Paragraph 3 — what you want next. State it as a criterion, not a request.]

[Stack, as one scannable line.]

[How to contact you.]
```

### A full example

> ⚠️ Check every figure against your real history before publishing this.

> I build backend systems that carry telecom-scale load. Most recently, the notification
> platform serving 41M subscribers at [Company] — 4M+ messages a day, p99 under two seconds
> through upstream provider outages.
>
> My work sits mostly in event-driven architecture: Kafka and RabbitMQ pipelines, Redis caching,
> PostgreSQL under real query pressure, and the failure modes that only appear once a system is
> genuinely large — partial outages, replay storms, cache stampedes, and the consistency
> trade-offs you make deliberately rather than discover at 3am.
>
> Before that I built the real-time layer for a live-streaming product on Agora and WebSockets,
> which is where I learned how differently latency behaves when a human is watching. More
> recently I have been the person who sets the service template and reviews architecture
> decisions — the shift from owning systems to owning the standards other people build on.
>
> I am looking for a senior or lead backend role, remote, where the hard part is the system
> rather than the ticket queue. I work GMT+6 with a comfortable four-hour overlap with European
> hours.
>
> **Stack:** TypeScript · Node.js · NestJS · Kafka · RabbitMQ · PostgreSQL · Redis · AWS ·
> Docker · Kubernetes
>
> Reach me at [email].

### Why this works — line by line

| What it does | Where |
|---|---|
| **The number is in sentence two**, inside the visible ~300 characters | "41M subscribers" |
| **Names specific failure modes** | "replay storms, cache stampedes" — you only know these words if you have operated a system, not read about one |
| **Admits when things go wrong** | "rather than discover at 3am" — honest, human, and instantly credible |
| **Explains why the streaming work taught you something** | "how differently latency behaves when a human is watching" — this is a *thought*, not a fact |
| **States direction as a criterion, not a plea** | "where the hard part is the system rather than the ticket queue" |

### What to avoid

```
❌ Fazle is a passionate and dedicated software engineer with strong
   experience in various technologies including but not limited to
   Node.js, React, MongoDB, and more. He is a quick learner and a
   great team player looking for challenging opportunities.
```

Three problems:
1. **Third person.** You are writing about yourself. Use "I".
2. **No specifics.** "various technologies", "challenging opportunities" — this is filler.
3. **Every sentence is true of ten thousand other people.** Nothing here is *you*.

> **A useful test:** cover your name and read it. Could this be about someone else? If yes,
> rewrite it.

---

## 4. LinkedIn: everything else

| Section | What to do |
|---|---|
| **Experience** | Two or three bullets per role, **copied exactly from your master resume**. Do not write new ones — if your resume and profile disagree, that is a real red flag |
| **Skills** | You can add up to 50, but the **top 3 are pinned and weighted in search**. Make them your three strongest: e.g. `Node.js`, `Kafka`, `AWS` |
| **Endorsements** | Low value overall, but your top 3 skills should have some. Ask two colleagues once. Do not campaign |
| **Recommendations** | High value, low volume. **Two good ones beat ten generic ones.** Ask the two people who watched you do the hardest thing you have done — and tell them *which project* to write about |
| **Open to work** | Turn it on, but set it to **recruiters only**. The public green banner is fine, but it slightly weakens your negotiating position |
| **Featured** | Pin your two GitHub repos, and anything you have published |
| **Custom URL** | Set it to `linkedin.com/in/firstname-lastname`. The default one with random digits looks unfinished on a resume |

### How to ask for a recommendation

Most requests fail because the person does not know what to write.

```
Hi [Name] — I'm applying for senior backend roles at the moment and would
really value a LinkedIn recommendation from you.

If it helps, the thing I'd most want highlighted is the notification
platform migration — you saw how that went, including the parts that were
hard. Anything about how I handled the rollout would be perfect.

Totally fine if you'd rather not. Happy to write one for you either way.
```

You made it easy: you named the project, you named the angle, and you gave them an exit.

---

## 5. How recruiters actually find people

Recruiters use **LinkedIn Recruiter** — a paid tool that does boolean search across profiles.

A real search looks like this:

```
("Node.js" OR "NodeJS") AND ("Kafka" OR "RabbitMQ") AND senior
NOT (recruiter OR "looking for")
Location: Anywhere
```

Three practical consequences:

### 1. Exact words win

The recruiter types `NestJS`. They do not type "modern Node frameworks".

**Rule:** every technology you would accept a job in must appear **literally** somewhere on your
profile — in the headline, in the About stack line, or inside an experience bullet.

```
❌ "Experienced with modern backend frameworks and message queues."
✅ "Built on NestJS with Kafka and RabbitMQ."
```

Same meaning. Only the second one is findable.

### 2. Your current title is weighted heavily

If your official title is unusual, your **headline** carries the market-standard version. Use
it. (Same reasoning as in
[the resume system](00-resume-system.md#3-the-6-second-scan).)

### 3. Location filters are blunt, so pre-answer them

Many searches filter by country, and you cannot change where you are.

What you *can* do is make `Open to remote` and your overlap hours impossible to miss — so a
recruiter who does find you does not discard you on a guess about timezones.

### A cheap habit with real returns

**Post occasionally.** Not "thought leadership" — just a short, concrete note about something
you debugged or decided.

Three or four a month does two things:
1. Keeps you visible in your network's feed.
2. **Builds the written-English evidence you currently do not have.**

Two paragraphs is plenty.

```
Spent yesterday chasing a p99 spike that only appeared at 9pm.

Turned out our cache TTL was set to a round 3600s, so every key written
during the evening traffic ramp expired at the same moment the next
evening. Classic stampede — we just built it ourselves, slowly, over
a week.

Fix was two lines: TTL + random jitter. The interesting part is that
the graph looked like a database problem for three days.
```

Concrete. Short. No moral at the end. Shows how you think.

---

## 6. The GitHub profile README

If you create a repository named **exactly the same as your GitHub username**, its README shows
on your profile page.

Most engineers either skip this or fill it with badge walls and animated graphics. **A plain,
well-written one stands out precisely because the bar is so low.**

Keep it short. This is a signpost, not a biography.

```markdown
# [Full Name]

Senior backend engineer, Dhaka (GMT+6). Node.js / NestJS / AWS.
I work on event-driven systems — most recently a notification platform
serving 41M subscribers.

### What I am usually doing
- Designing services that have to stay up while something upstream does not
- Kafka, RabbitMQ, PostgreSQL, Redis, and the failure modes that come with them
- Writing the ADR before the code, most of the time

### Selected work
- **[job-cracker](link)** — Self-hosted study platform. NestJS + Prisma API,
  React SPA, in-browser test harness running 101 problems against real cases.
- **[repo two](link)** — [one line]

### Elsewhere
[LinkedIn](link) · [email]
```

### What not to include

| Avoid | Why |
|---|---|
| Badge walls (rows of colourful shields) | Decoration, not information |
| The snake eating your contribution graph | Reads junior |
| Visitor counters | Same |
| Technology icon grids | Same information as a text list, but harder to read and unsearchable |
| "Fun fact: I love coffee ☕" | Costs you nothing but gains you nothing |

**The voice should match your LinkedIn About:** calm, concrete, first person. Note the small
honest touch in the example — *"most of the time"*. It reads as a real person, not a brochure.

---

## 7. Making two repos count

You need **exactly two.** Not ten.

A long list of half-finished repos actively hurts you, because a hiring manager will click the
worst one.

### Repo one: `job-cracker`

This is already real. To make it interview-grade:

- [ ] **The README should lead with the problem it solves**, then how it is built, then the
      interesting decision. It largely does already — the section on streaming long documents,
      and the note about anchor ids disagreeing with the renderer, are exactly the right kind of
      writing.
- [ ] **Add a screenshot near the top.** A stranger should understand what it is in three
      seconds.
- [ ] **Mention `npm run validate` prominently.** A project that proves its own 101 reference
      solutions pass is an unusual and credible signal.
- [ ] **Check the commit history reads like real work** — not one giant commit.

### Repo two: fill your gap

Your thinnest dimension is **AI/LLM**.

**Small and finished beats ambitious and abandoned.**

A good candidate project: a retrieval-backed Q&A service over this repo's own guides. Your
README then honestly discusses:

- How you chose chunk sizes, and what went wrong with your first attempt
- What embeddings cost you
- Latency, and what you cached
- **How you tested something whose output is different every time** ← this is the part that
  impresses

Two days of work, and it converts the emptiest section of your bullet bank into something you
can defend.

### What every README must contain

| Section | Why |
|---|---|
| One-line description | The three-second test |
| Screenshot or diagram | The ten-second test |
| The problem it solves | Shows you build for reasons |
| How to run it | Basic respect for the reader |
| Architecture, briefly | This is what hiring managers read |
| **One decision and its trade-off** | **This is what gets you the interview** |

---

## 8. The English problem, and four cheap fixes

The market read on your profile names this as a hesitation. So attack it directly rather than
hoping nobody notices.

**You do not need a blog. You do not need an audience.** You need three or four artifacts that
exist and are well written.

Ranked by value per hour spent:

### 1. One good repo README — 2 hours

You already have most of one. This is the highest return available.

### 2. One public ADR — 1 hour

**ADR = Architecture Decision Record.** A short document recording a decision.

Write up a real one you made — the RabbitMQ vs Kafka call, or the denormalisation trade-off.
Put it at `docs/adr/0001-message-broker-choice.md` in a public repo.

**The standard format is four headings:**

```markdown
# ADR 0001: Use RabbitMQ for the order pipeline

## Status
Accepted — March 2022

## Context
The order pipeline needs guaranteed per-order message ordering. We expected
~50k orders/day, growing. The team had no prior operational experience with
Kafka. We had two weeks before the launch deadline.

## Decision
Use RabbitMQ with one queue per order type.

We considered Kafka. It is the stronger choice for replay and for very high
throughput, and it would handle 10x our volume comfortably. We rejected it
because per-queue ordering was the requirement we actually had, and because
adopting an unfamiliar broker two weeks before launch is a risk we were not
being paid to take.

## Consequences
- We get ordering guarantees simply, with a broker the team can operate.
- We give up cheap message replay. If we need audit replay later, we will
  add an event store rather than migrate the broker.
- If daily volume passes ~2M messages, revisit this.
```

**This is the single most senior-looking artifact you can produce in one hour.** It shows you
weigh options, consider your team, write clearly, and know when to revisit a decision.

### 3. A LinkedIn post about a debugging session — 30 minutes

See the example in [§5](#5-how-recruiters-actually-find-people). Concrete, short, no moral.

### 4. A written design doc for one of your practice HLD drills — 2 hours

You are doing the design drills anyway. Writing one up properly turns **practice into
evidence.**

---

## 9. Checklist

**LinkedIn**
- [ ] Custom URL set (`linkedin.com/in/firstname-lastname`)
- [ ] Headline rewritten — level, stack, differentiator, remote availability
- [ ] About section in first person, hook inside the first 300 characters
- [ ] Experience bullets copied exactly from the master resume
- [ ] Top 3 skills are the three you most want to be searched for
- [ ] Two recommendations requested, each naming a specific project
- [ ] Featured section pins both repos
- [ ] Open-to-work set to **recruiters only**

**GitHub**
- [ ] Profile README exists, no badge wall
- [ ] Exactly two pinned repos
- [ ] `job-cracker` README has a screenshot and leads with the problem
- [ ] Second repo exists and fills the LLM gap
- [ ] At least one ADR published publicly
- [ ] Commit history does not contradict your claims

**Consistency across all three**
- [ ] Same job title on resume, LinkedIn and GitHub
- [ ] Same three claims everywhere
- [ ] Same numbers everywhere — and every one defensible

---

## Related

- [00-resume-system.md](00-resume-system.md) — the rules these profiles inherit
- [01-master-resume.md](01-master-resume.md) — the source of every claim here
- [03-outreach-and-referrals.md](03-outreach-and-referrals.md) — what to send once your profile is ready
- [../phase-2-apis-realtime-systems/06-ai-llm-integrations.md](../phase-2-apis-realtime-systems/06-ai-llm-integrations.md) — the material behind repo two
