# The Resume System

> How a resume is actually read — by a machine first, then by a busy human.
> Read this once before you write anything.

## The whole document in 60 seconds

1. **Three people read your resume.** A computer, a recruiter, and a hiring manager. Each one
   spends a different amount of time. You must satisfy all three.
2. **The recruiter gives you 6 seconds.** So your best number must be in the top third of
   page one.
3. **Every bullet needs a number.** No number = it sounds like a job description, not an
   achievement.
4. **The formula is:** `verb + system + scale + outcome`.
5. **Adding "what I gave up to get this" makes you sound senior.** That one extra clause is the
   biggest difference between a Senior resume and a Mid-level one.

Everything below explains *why* each of those is true, with examples.

---

## Table of Contents

1. [Who reads it, in what order](#1-who-reads-it-in-what-order)
2. [The ATS — what it is and what breaks it](#2-the-ats--what-it-is-and-what-breaks-it)
3. [The 6-second scan](#3-the-6-second-scan)
4. [The bullet formula](#4-the-bullet-formula)
5. [Finding numbers when you think you have none](#5-finding-numbers-when-you-think-you-have-none)
6. [Senior vs Lead — what the words must prove](#6-senior-vs-lead--what-the-words-must-prove)
7. [Layout rules](#7-layout-rules)
8. [The seven ways good candidates fail](#8-the-seven-ways-good-candidates-fail)
9. [Tailoring quickly when you apply a lot](#9-tailoring-quickly-when-you-apply-a-lot)
10. [Bangladesh vs international remote](#10-bangladesh-vs-international-remote)
11. [Checklist before you send](#11-checklist-before-you-send)
12. [Glossary](#12-glossary)

---

## 1. Who reads it, in what order

Your resume passes through three readers. They read it very differently.

| Reader | Time they spend | What they are doing | What makes them reject you |
|---|---|---|---|
| **The computer (ATS)** | 0 seconds | Reading your file and turning it into database fields | Your file is laid out in a way it cannot read |
| **The recruiter** | 6–20 seconds | Checking if you "look like" a senior backend engineer | No numbers, no familiar technology names, unclear level |
| **The hiring manager** | 1–3 minutes | Looking for a reason to say no, then a reason to talk to you | Vague ownership, no trade-offs, unexplained gaps |

### Why this matters

Most resume advice contradicts itself because it is written for only one of these readers.

**Example of the conflict:**

- Advice for the computer says *"put in lots of keywords."*
- Advice for the hiring manager says *"be concise and specific."*

Both are right, for different readers. The way to satisfy both: write specific, concrete
bullets (hiring manager), and make sure the exact technology words appear inside those bullets
naturally (computer).

```
❌ Trying to please only the computer:
   Skills: Node.js, NestJS, Express, Fastify, Koa, Hapi, Kafka, RabbitMQ, Redis,
   PostgreSQL, MySQL, MongoDB, DynamoDB, Docker, Kubernetes, AWS, GCP, Azure...

✅ Same keywords, but as evidence:
   • Designed a Kafka-backed notification service on NestJS, delivering 4M+ messages/day
     to 41M subscribers, with Redis used for deduplication and PostgreSQL for the outbox.
```

The second version contains `Kafka`, `NestJS`, `Redis`, `PostgreSQL` — and a human wants to
read it.

**Write for the recruiter first.** They have the least time, so they are the hardest to please.
If you pass the 6-second test, you usually pass the other two.

---

## 2. The ATS — what it is and what breaks it

### What an ATS actually is

**ATS = Applicant Tracking System.** It is the software a company uses to collect job
applications. Think of it as a database with an upload form.

People imagine it as a robot that scores you out of 100 and throws you away. **That is mostly a
myth.** What it really does is far more boring:

1. It reads your PDF and tries to extract text from it.
2. It guesses which text is your name, your email, your job titles, your dates.
3. It saves those into database fields.
4. Later, a human recruiter searches that database, e.g. `"Node.js" AND "Kafka" AND senior`.

### So where does the damage happen?

**Not from clever filtering. From failed reading.**

If your PDF is laid out badly, step 1 produces garbage. Then your job titles end up mixed with
your skills, or your phone number disappears entirely.

**Concrete example of a two-column resume being read by a machine:**

```
What you see:                          What the computer extracts:

┌──────────────┬─────────────┐         Fazle Rabbi Senior Backend
│ Fazle Rabbi  │ SKILLS      │         Engineer SKILLS Banglalink
│ Senior       │ Node.js     │         Node.js 2021-Present Kafka
│ Backend Eng  │ Kafka       │         Designed a notification
│              │ Redis       │         Redis service delivering...
│ EXPERIENCE   │ AWS         │         AWS
│ Banglalink   │             │
│ 2021-Present │             │         ← Job title, employer and skills
│ • Designed a │             │           are now scrambled together.
│   notif...   │             │           A recruiter searching for
└──────────────┴─────────────┘           "Senior Backend Engineer at
                                          Banglalink" may not find you.
```

### The rules

| Do not do this | What goes wrong |
|---|---|
| Two or more columns | Text gets read across the columns and scrambled, as shown above |
| Put your email/phone in an image or icon | Images contain no text. Your contact details simply vanish |
| Put contact details in the page header/footer | Many extractors skip headers and footers completely |
| Use a table for your Experience section | The table borders disappear, and your dates detach from your employers |
| Invent section names like "My Journey" | The computer looks for the word `Experience`. It does not know what a journey is |
| Write dates as `'21-'24` | Tenure calculation breaks. Use `Jan 2021 – Present` |

### The test that settles all arguments

Do this. It takes thirty seconds and it is the only reliable check:

1. Open your resume PDF.
2. Select all the text (`Ctrl+A` / `Cmd+A`), copy it.
3. Paste it into Notepad, TextEdit, or any plain text editor.

**What you see there is roughly what the computer sees.**

If it is scrambled, out of order, or missing your phone number — the problem is your *layout*,
not your wording. Fix the layout.

### About keywords

Use the **exact same words the job posting uses.**

**Example:**

| Job posting says | You should write | Not |
|---|---|---|
| "event-driven architecture" | event-driven architecture | message-based systems |
| "PostgreSQL" | PostgreSQL | Postgres (only) |
| "CI/CD pipelines" | CI/CD pipelines | build automation |

This is not cheating. A human recruiter searching the applicant database also types literal
words. If they search `PostgreSQL` and you only ever wrote `Postgres`, you do not appear in
their results.

> ⚠️ **What *is* cheating:** hiding keywords in white text or 1px font. Every serious company
> detects this, treats it as fraud, and blacklists you. Do not do it.

---

## 3. The 6-second scan

A recruiter's eyes move in a predictable path. Design the top of page one for that path.

```
┌──────────────────────────────────────────────────────┐
│  FAZLE RABBI                        ① who are you    │
│  Senior Backend Engineer · Node.js/AWS · GMT+6       │
│  email · phone · github · linkedin  ② can I reach you│
├──────────────────────────────────────────────────────┤
│  SUMMARY                            ③ what's the     │
│  One sentence: level, stack, scale.    claim         │
├──────────────────────────────────────────────────────┤
│  EXPERIENCE                                          │
│  Senior Backend Engineer — Banglalink  2021–Present  │
│    • biggest result, with a number  ④ prove it       │
│    • second biggest result                           │
│    • third                                           │
└──────────────────────────────────────────────────────┘
      ↑ Everything above this line is the whole game.
```

### What happens if the number is not there

The recruiter does not reject you. They do something worse: they put you in the **"maybe"**
pile.

Nobody ever comes back to the maybe pile. The role gets filled from the "yes" pile.

**Example — the same person, two versions of the top of page one:**

```
❌ Version A — lands in "maybe"

   Fazle Rabbi
   Software Developer
   fazle@email.com

   SUMMARY
   Experienced developer passionate about building scalable applications
   with modern technologies.

   EXPERIENCE
   Software Developer — Banglalink              2021–Present
     • Worked on backend services for the notification platform
```

```
✅ Version B — lands in "yes"

   Fazle Rabbi
   Senior Backend Engineer · Node.js / NestJS / AWS · GMT+6
   fazle@email.com · github.com/... · linkedin.com/in/...

   SUMMARY
   Backend engineer with 6 years on event-driven systems at telecom scale —
   most recently the notification platform serving 41M subscribers.

   EXPERIENCE
   Senior Backend Engineer — Banglalink              2021–Present
     • Designed a Kafka-backed notification platform delivering 4M+ messages/day
       to 41M subscribers, holding p99 under 2s during provider outages.
```

Same person. Same job. The difference is entirely in what is visible in six seconds.

### About your job title

The recruiter needs to place you in a level *immediately*.

- `Senior Backend Engineer` → they know your level. Good.
- `Full Stack Developer` → no level information. At 6 years of experience, this reads *junior*.

**What if your official title was something local and unusual?** For example
`Software Engineer III` or just `Programmer`.

Use the market-standard equivalent in your headline, and keep the official title inside the
role entry:

```
Fazle Rabbi
Senior Backend Engineer · Node.js / AWS        ← headline: market-legible

EXPERIENCE
Software Engineer III — Banglalink             ← role entry: your real title
2021–Present
```

This is accurate, not inflated. You are translating, not lying.

---

## 4. The bullet formula

```
verb  +  system  +  scale  +  outcome
```

**Rule: every bullet contains a number, or a named trade-off. No exceptions.**

A bullet with no number describes your *job*. A bullet with a number describes *you*.

### Building one up, step by step

Start with what most people write, then improve it one piece at a time.

**Step 0 — what you probably have now**

> Worked on the notification service.

*Problem:* This tells me your team had a notification service. It tells me nothing about you.
Any of your ten teammates could write this same line.

**Step 1 — add a real verb and the system**

> Built a notification service using Kafka and Redis.

*Better.* Now I know what technology you touched. But I still don't know if this served 100
users or 100 million. A tutorial project could also be described this way.

**Step 2 — add the scale**

> Built a Kafka-backed notification service delivering 4M+ messages/day to 41M subscribers.

*Good.* Now it is clearly real production work. Most resumes never get here.

**Step 3 — add the outcome and the trade-off**

> **Designed** a Kafka-backed notification service delivering **4M+ messages/day to 41M
> subscribers**, holding **p99 under 2s** through provider outages via **per-channel circuit
> breakers**.

*Strong.* Notice what changed:
- `Built` → `Designed` (ownership, not just implementation)
- Added the outcome (`p99 under 2s`)
- Added the *how* (`circuit breakers`) — which is bait for a conversation

### Verb choice tells the reader your level

These are not synonyms. Pick deliberately.

| If you write... | You sound like... |
|---|---|
| built, implemented, developed, wrote, integrated | **Someone who does tasks** (mid-level) |
| designed, architected, owned, led, drove, migrated | **Someone who owns systems** (senior) |
| defined, established, mentored, standardised, decided | **Someone who shapes teams** (lead) |

**You need all three types on the page.**

- All implementation verbs → you read as mid-level, even after 6 years.
- All leadership verbs → the reader wonders *"but have you actually built anything?"*

**A good mix for a 4-bullet role:**

```
• Designed  ...   ← senior
• Cut       ...   ← senior (result-focused)
• Chose     ...   ← lead (a decision)
• Mentored  ...   ← lead (people)
```

### The trade-off clause — the single most senior thing you can write

Anyone can claim a good result. Saying **what it cost you** is what proves you were really
there.

**Compare:**

```
❌ Cut p99 latency from 2.4s to 380ms.

   → Nice. But how? And what did it break? I have to ask.
```

```
✅ Cut p99 from 2.4s to 380ms by denormalising the subscriber read path,
   accepting eventual consistency on profile updates in exchange for
   removing a synchronous cross-service join.

   → Now I know: you understood the cost, you decided anyway, and you can
     defend it. This is a real engineer.
```

**Why this works so well:** the clause is an *invitation*. It says "ask me about this."
And when they do, the interview starts on ground **you** chose, on a topic **you** know
completely.

> **In plain terms:** "eventual consistency on profile updates" means — if a user changes their
> name, the notification system might use the old name for a few seconds. You decided that was
> acceptable because the speed gain was worth it. Say that out loud in the interview and you
> sound exactly like someone who has run a real system.

---

## 5. Finding numbers when you think you have none

The most common objection to everything above is: *"my work didn't have metrics."*

It almost always did. Nobody wrote them down at the time. Here is how to reconstruct them.

### The six angles

Go through each one and ask the question. Write down whatever comes.

| # | Angle | Ask yourself | Example answers |
|---|---|---|---|
| 1 | **Scale** | How many users, requests, records or events touched this? | 41M subscribers · 4M messages/day · 12k requests/sec at peak |
| 2 | **Time** | What got faster — for a machine, or for a person? | p99 2.4s → 380ms · deploys 40min → 6min · onboarding 2 weeks → 3 days |
| 3 | **Money** | What got cheaper? What money did it protect? | infra cost down 38% · avoided a $2k/month vendor · prevented N hours of downtime |
| 4 | **Reliability** | What stopped breaking? | error rate 2.1% → 0.05% · removed a weekly on-call page · 99.9% → 99.95% uptime |
| 5 | **Breadth** | How many teams, services or people depended on it? | used by 6 teams · 14 services migrated · 4 engineers mentored |
| 6 | **Risk removed** | What disaster did you prevent? | zero-downtime migration of 400M rows · removed a single point of failure |

### A worked example

Suppose your honest starting memory is:

> *"I built the retry logic for the SMS sending service."*

Walk it through the six angles:

| Angle | Question | What you remember |
|---|---|---|
| Scale | How many SMS? | "About 500k a day I think" |
| Time | Anything faster? | "Not really" |
| Money | Cheaper? | "Oh — we stopped paying for failed sends that we used to retry blindly. Maybe 15%?" |
| Reliability | What stopped breaking? | "Delivery failures during operator outages. We used to lose those messages entirely" |
| Breadth | Who else uses it? | "The OTP service adopted it later" |
| Risk | Disaster prevented? | "We stopped losing OTPs during outages — that was blocking logins" |

Now write the bullet:

> Added retry-with-backoff and a dead-letter queue to the SMS pipeline handling **500k+
> messages/day**, eliminating **message loss during operator outages** (previously silent) and
> cutting wasted send spend by **~15%**; later adopted by the OTP service.

That went from one forgettable sentence to a strong bullet. **The work did not change. Only the
recall did.**

### If you truly cannot find a number

Use a **bounded** description instead of a vague one.

```
❌ Significantly improved system reliability.
   → Meaningless. Every candidate writes this.

✅ Reduced on-call pages for this service to roughly one a quarter,
   from several a week.
   → No exact metric, but specific and defensible.
```

### The one hard rule

> **Never invent a number.**

Every number on your page is a question you have *volunteered* to answer in detail.

**What happens if you invent one:**

> **Interviewer:** "You said 4M messages a day. What was the peak-to-average ratio?"
> **You:** "…um, I'm not sure."
> **Interviewer:** *(silently discounts every other number on the page)*

One unbackable number damages your whole resume, not just that line.

---

## 6. Senior vs Lead — what the words must prove

This repo's own assessment of your background says it is **strong on systems, light on
decisions that shaped a team.** That is exactly the Senior→Lead gap.

The good news: it is a *resume* problem before it is an *experience* problem. You have probably
done lead-shaped things and never written them down.

### The difference, plainly

| | **Senior** is proven by | **Lead** is proven by |
|---|---|---|
| What you point at | A system that carried real load | A decision that outlived you |
| Your evidence | Scale, latency, reliability numbers | Standards adopted, people improved, alternatives rejected |
| Shape of the bullet | "Designed X handling Y, achieving Z" | "Chose X over Y because Z; N teams build on it now" |
| How it fails | You read as a good implementer | You read as a manager who cannot code |

### The three bullets that upgrade a Senior resume to a Lead resume

Write one of each — **if your history honestly supports it.**

**1. A decision, with the option you rejected**

> Chose RabbitMQ over Kafka for the order pipeline — per-queue ordering guarantees mattered
> more than message replay, and the team had no Kafka operational experience. Documented as an
> ADR; still the standard three years on.

*Why it works:* it shows you weighed alternatives, considered the *team* and not just the
technology, wrote it down, and it survived. That is a lead.

**2. A standard you set**

> Established the service template (health checks, structured logging, migration harness) now
> used by all 9 backend services; cut new-service setup from ~3 days to under an hour.

*Why it works:* your work multiplied across other people's work. That is leverage.

**3. People you improved**

> Mentored 4 engineers through their first production incident ownership; two now run their own
> services.

*Why it works:* it names an outcome for *them*, not just an activity for you.
Compare: *"Mentored junior developers"* — which tells the reader nothing.

### What if you genuinely have none of these?

That is useful information, not a failure.

- It tells you **what to do at your current job this quarter** — write one ADR, set one
  standard, mentor one person deliberately.
- It tells you to **apply to Senior roles honestly** rather than claiming Lead and being found
  out in a later round, which is a much more expensive way to discover the same thing.

---

## 7. Layout rules

| Rule | Detail |
|---|---|
| **Length** | One page if you have under 8 years. Two pages absolute maximum, ever |
| **Columns** | One. Always. (See [§2](#2-the-ats--what-it-is-and-what-breaks-it)) |
| **Photo** | None for international applications. Normal in Bangladesh, but a legal risk for US/EU companies — they may discard your CV to avoid discrimination claims |
| **Skill bars** | Never. `React ▓▓▓▓░ 80%` means nothing — 80% of what? It reads junior |
| **Fonts** | One font family. Two sizes. Bold for emphasis. Nothing decorative |
| **Dates** | `Jan 2021 – Present`, right-aligned, same format everywhere |
| **File name** | `Fazle-Rabbi-Senior-Backend-Engineer.pdf` — not `resume_final_v3.pdf` |
| **Format** | PDF, unless the application form specifically asks for `.docx` |
| **Selected work** | Two GitHub repos with real READMEs beats a long skills list |
| **Timezone** | For remote roles, put `GMT+6` near your name. It answers an objection before it forms |

### Section order

```
Name / headline / contact
Summary          ← 1 sentence. Rewrite this per application
Experience       ← the bulk. Most recent first
Selected work    ← 2 repos, one line each
Skills           ← grouped, no ratings
Education        ← one line, at the bottom
```

**Why Skills goes near the bottom:** it is the section a recruiter trusts *least*, because
anyone can type a word. Your Experience section is where those same words become believable.

Only put Education at the top if you graduated within the last year.

---

## 8. The seven ways good candidates fail

Ranked by how often they sink someone who would have been good at the job.

### 1. The "responsibilities" resume

Every bullet describes the role, not the person.

**How to detect it:** hand your resume to a colleague in the same job. If every line is still
true for them, you have written a job description.

**Fix:** force a number into every line ([§5](#5-finding-numbers-when-you-think-you-have-none)).

### 2. Your best number is invisible

`41M` exists — on page two, in the middle of a paragraph.

If the recruiter has to *hunt* for your strongest asset, you have already lost the fast lane.
It belongs in the summary **and** in the first bullet of your most recent role.

### 3. The kitchen-sink skills list

Forty technologies, unranked, including one you touched once in 2019.

**Two problems:** it dilutes the eight that actually matter, and it invites a question about the
one you are weakest at.

**Fix — the honesty test:** for each item ask *"if they spend fifteen minutes on this, do I come
out looking good?"* If no, delete it.

### 4. Seniority is ambiguous

No level word in the headline, only implementation verbs, and a title that does not map to the
market. The recruiter cannot place you — so they don't.

### 5. Silent on what the market wants

For remote backend roles in 2026, that is **AI/LLM integration**. If your CV says nothing about
it, you are competing for a smaller pool than you need to be.

One honest bullet about a real integration beats a `Skills: OpenAI` line.
Material: [../phase-2-apis-realtime-systems/06-ai-llm-integrations.md](../phase-2-apis-realtime-systems/06-ai-llm-integrations.md).

### 6. Unexplained gaps or job-hopping

Not fatal. But if you leave it unexplained, the reader fills the gap with the worst plausible
story.

One neutral clause is enough:

```
Backend Engineer — SomeCompany (contract)          Mar 2020 – Nov 2020
Backend Engineer — SomeCompany (company closed)    Mar 2020 – Nov 2020
```

### 7. English that is correct but slightly off

For remote roles, your resume is also an English writing sample.

**Two cheap fixes:**
1. **Read it aloud, start to finish.** Almost every error that survives spellcheck is audible.
2. Have it read by someone who writes English professionally.

**Typical examples:**

```
❌ "Responsible for developing of the payment module."      → extra "of"
✅ "Owned the payment module."

❌ "I have 6 years experiences in backend."                 → "experience", singular
✅ "6 years of backend experience."

❌ "Worked in Kafka, Redis and etc."                        → "and etc." is wrong
✅ "Worked with Kafka and Redis."
```

---

## 9. Tailoring quickly when you apply a lot

You are applying to ~30 companies in 30 days. Rewriting your resume each time is not possible
and not necessary.

### The 10-minute tailor

| Time | Step |
|---|---|
| 2 min | Rewrite **the summary line** using the posting's own words |
| 5 min | Rewrite **the first bullet of your most recent role** to lead with whatever the posting emphasises most |
| 1 min | Reorder your **Skills** lines so their stack appears first |
| 30 sec | Rename the file |

**Nothing else changes.** Bullets 2–4 of each role, Selected Work, and Education stay identical
forever.

### A worked tailor

**Your default summary:**

> Backend engineer with 6 years building event-driven systems at telecom scale — most recently
> a platform serving 41M subscribers. Deep in Node.js/NestJS, Kafka and PostgreSQL.

**Posting A says:** *"You will scale our real-time messaging infrastructure. WebSockets,
high concurrency."*

> Backend engineer specialising in **real-time infrastructure** — WebSocket and Agora-based live
> streaming, plus event-driven platforms at 41M-subscriber scale. 6 years, Node.js/NestJS.

**Posting B says:** *"Looking for someone to own our AWS cost and reliability story."*

> Backend engineer with 6 years on **AWS-hosted** event-driven systems at 41M-subscriber scale,
> including **infrastructure cost reduction** and SLO ownership.

Same person, same truth, different emphasis. Ten minutes each.

### Keep one master file

**Never edit your only copy.** Keep a master file containing *every* bullet you have ever
written — including the ones currently cut.

Each application is a **selection** from the master, not a **change** to it. That master is
[01-master-resume.md](01-master-resume.md).

**Track which version went where** in the app's Pipeline tab. When a company replies six weeks
later, you need to know what you claimed.

---

## 10. Bangladesh vs international remote

The two markets read the same document differently. Keep two versions of the *top third* — the
Experience section stays identical.

| | Bangladesh | International remote |
|---|---|---|
| Photo | Common, harmless | Leave it out |
| Length | Two pages accepted | One page strongly preferred |
| Timezone line | Not needed | Essential |
| English level | Assumed | The resume's own writing is the evidence |
| Salary expectation | Sometimes asked upfront | Never volunteer it |
| Title inflation | Common — calibrate against it | Measured against a global ladder; over-claiming is caught in round two |
| What impresses | Recognisable company names, long tenure | Scale numbers, ownership, clear writing |
| Notice period | Expected on the CV | Leave off; discuss at offer stage |

### The overlap-hours line

This is worth more than it looks.

Many remote job postings quietly reject GMT+6 candidates based on a *guess* about availability
— not a real requirement.

```
Fazle Rabbi
Senior Backend Engineer · Node.js / NestJS / AWS
GMT+6 · 4h daily overlap with CET
```

That third line answers the objection before anyone raises it, and costs you one line.

> **What "4h overlap with CET" means:** Central European Time is 4–5 hours behind Bangladesh. If
> you work until 8pm your time, that is 3–4pm in Berlin — a full afternoon of shared working
> hours. Say the actual hours if you are willing to commit to them.

---

## 11. Checklist before you send

Two minutes. Run it every time.

**Can the machine read it?**
- [ ] Copy-pasted into a plain text editor — readable, in order, contact details present
- [ ] Single column, no tables in Experience, no text inside images
- [ ] Section headings are the standard words: `Experience`, `Skills`, `Education`

**Does it survive 6 seconds?**
- [ ] Level word in the headline (`Senior` / `Lead`)
- [ ] Main stack in the headline
- [ ] Your biggest number visible in the top third
- [ ] Timezone present (remote applications)

**Every single bullet**
- [ ] Starts with a verb, and the verb matches the level you are claiming
- [ ] Contains a number **or** a named trade-off
- [ ] Describes something *you* did, not something the team had
- [ ] Uses the posting's vocabulary where that is honest

**The whole document**
- [ ] At least one bullet naming a rejected alternative (the lead signal)
- [ ] At least one bullet about people or standards
- [ ] Nothing you could not discuss for five minutes under questioning
- [ ] Every number is one you can defend
- [ ] Read aloud once, start to finish

---

## 12. Glossary

Terms used above, in case any are unfamiliar.

| Term | Plain meaning |
|---|---|
| **ATS** | Applicant Tracking System — the software that receives and stores job applications |
| **p99** | "99th percentile." If p99 latency is 2s, then 99 out of 100 requests finish faster than 2 seconds. It describes your *slow* requests, which is what users complain about |
| **ADR** | Architecture Decision Record — a short document recording a technical decision, the options considered, and why you chose one |
| **Circuit breaker** | A pattern that stops calling a failing service for a while, instead of retrying endlessly and making things worse |
| **Eventual consistency** | Data that is correct *soon*, not *instantly*. A change may take a moment to appear everywhere |
| **Denormalising** | Deliberately duplicating data so a read is fast, accepting that updates become more work |
| **Dead-letter queue** | A holding place for messages that failed repeatedly, so they are stored for inspection instead of lost |
| **SLO** | Service Level Objective — the reliability target you promise, e.g. "99.9% of requests succeed" |
| **CET** | Central European Time — the timezone of Berlin, Paris, Amsterdam |

---

## Related

- [01-master-resume.md](01-master-resume.md) — the template these rules apply to
- [02-linkedin-and-profiles.md](02-linkedin-and-profiles.md) — the same claims, for LinkedIn and GitHub
- [03-outreach-and-referrals.md](03-outreach-and-referrals.md) — the two-sentence version
- [../phase-0-online-assessments/07-video-interview-and-psychometric.md](../phase-0-online-assessments/07-video-interview-and-psychometric.md) — saying your summary out loud
