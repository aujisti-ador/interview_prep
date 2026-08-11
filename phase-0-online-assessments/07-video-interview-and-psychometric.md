# Video Interviews, Aptitude & Psychometric Tests

> **Format:** Talview and HireVue one-way video interviews, TestGorilla cognitive + personality bundles, Mercer Mettl aptitude sections, Turing's recorded technical video, Toptal's English/personality screen.
> **Why engineers fail here:** this is the only part of the funnel that isn't about code, so almost nobody practises it — and at BD corporates the aptitude section often carries an **independent cut-off** that a perfect coding score cannot rescue.

## Sections
1. [One-Way Video Interviews — Mechanics](#one-way-video-interviews--mechanics)
2. [The 90-Second Answer Formula](#the-90-second-answer-formula)
3. [The 24 Questions You Will Actually Be Asked](#the-24-questions-you-will-actually-be-asked)
4. [Turing-Style Recorded Technical Video](#turing-style-recorded-technical-video)
5. [Situational Judgement Tests](#situational-judgement-tests)
6. [Personality & Culture-Fit Inventories](#personality--culture-fit-inventories)
7. [Cognitive Aptitude — Numerical Reasoning](#cognitive-aptitude--numerical-reasoning)
8. [Cognitive Aptitude — Logical & Abstract Reasoning](#cognitive-aptitude--logical--abstract-reasoning)
9. [Cognitive Aptitude — Verbal & Attention to Detail](#cognitive-aptitude--verbal--attention-to-detail)
10. [Data Interpretation](#data-interpretation)
11. [English Fluency for Remote Roles](#english-fluency-for-remote-roles)
12. [Recording Setup Checklist](#recording-setup-checklist)

---

## One-Way Video Interviews — Mechanics

| Setting | Typical value | What it means for you |
|---|---|---|
| Prep time per question | 30 s (sometimes 0) | You will not have time to compose. You need pre-built *structures*, not scripts. |
| Answer time | 60–180 s | It **cuts you off mid-word**. Land the point in the first 60 s. |
| Retakes | 0 or 1 | Assume zero. A used retake is visible to the recruiter. |
| Questions | 4–8 | Usually 1 intro, 2–3 behavioural, 1–2 technical, 1 motivation. |
| Proctoring | Webcam + screen + face detection | Don't look away for long, don't read a script off-screen, don't leave frame. |
| AI scoring | Speech rate, filler words, sentiment, keyword coverage | Speak at a measured pace, use the role's own vocabulary, finish sentences. |

**The three failure modes, in order of frequency:**
1. **Rambling** — no structure, runs out of time before the result.
2. **Reading** — eyes tracking a script; obvious on camera and often flagged.
3. **Under-answering** — a 20-second answer to a 120-second question reads as thin.

---

## The 90-Second Answer Formula

Compressed STAR, with a fixed time budget you can feel:

| Segment | Time | Content |
|---|---|---|
| **Headline** | 10 s | One sentence naming the outcome. *"I cut our notification pipeline's p99 from 8 seconds to under 400 milliseconds during a campaign spike."* |
| **Situation + Task** | 20 s | Scale, constraint, your role. Numbers make it credible. |
| **Action** | 40 s | What **you** decided and why — including the option you rejected. |
| **Result** | 15 s | Quantified, plus what you'd do differently. |

**Front-load the headline.** Humans skim the first 20 seconds; AI transcript scoring reads all of it. The headline satisfies both.

**Say "I", not "we".** "We" is the single most common reason a strong senior story scores as junior — the grader cannot tell what you did.

**Have five stories, not twenty.** Each should be reusable for several questions:

| Story slot | Draw from |
|---|---|
| **Scale/performance win** | Notification system at Banglalink-scale traffic, Redis/Kafka tuning, query optimisation |
| **Production incident** | An outage you diagnosed and fixed, with the postmortem action items |
| **Technical disagreement** | An architecture call where you were overruled, or where you changed your mind |
| **Leadership/mentoring** | Raising a junior's level, code-review culture, onboarding |
| **Trade-off under constraint** | Shipping with limited budget/time — cost optimisation, build-vs-buy, deliberate tech debt |

Write these five out once, in full, in your own words. Then practise the 90-second version of each until the structure survives without the script.

---

## The 24 Questions You Will Actually Be Asked

### Introduction & motivation
1. **Tell me about yourself.** *(Present role + scale → one signature achievement → why this role. 60 s, never a CV recital.)*
2. **Why are you looking to leave your current role?** *(Forward-looking; never criticise the employer. "I've taken our platform as far as X; I want to work on Y at greater scale.")*
3. **Why this company?** *(One specific thing about their product/stack/scale. Generic answers are scored down hardest here.)*
4. **Where do you see yourself in three years?** *(Staff/lead track, or domain depth. Show direction without sounding like you'll leave in six months.)*
5. **What are your salary expectations?** *(Give a researched range with a reason. For remote roles, anchor on the role's market, not your local cost of living.)*

### Behavioural
6. **Describe the most technically challenging project you've delivered.**
7. **Tell me about a production incident you handled.** *(Detection → mitigation → root cause → prevention. The prevention step is where seniority shows.)*
8. **Tell me about a time you disagreed with a technical decision.** *(Data, a written trade-off, disagree-and-commit, and what actually happened.)*
9. **Tell me about a time you made a mistake that cost the team.** *(Real mistake, owned, systemic fix. "I work too hard" fails the question.)*
10. **How have you mentored or grown other engineers?**
11. **Describe a time you had to deliver under an impossible deadline.** *(What you cut, and how you made the cut explicit rather than silent.)*
12. **Tell me about a time you had to influence without authority.**
13. **How do you handle a teammate who consistently ships low-quality code?**
14. **Describe a time you had to say no to a stakeholder.**
15. **Tell me about the largest system you've owned end to end.**

### Technical-behavioural (asked to camera, not in an IDE)
16. **How do you decide between a monolith and microservices?**
17. **Walk me through how you'd debug a production API that's suddenly slow.** *(Golden signals → is it us or a dependency → recent deploys → DB/pool → traces. Narrate the *method*, not a guess.)*
18. **How do you ensure code quality on a team?**
19. **How would you design a notification system for millions of users?** *(90-second version: requirements → queue + workers → fan-out strategy → dedup/idempotency → per-channel retry & DLQ → rate limits. Full version in [phase-5 HLD](../phase-5-system-design/06-hld-practice-problems.md).)*
20. **What's your approach to testing?** *(Pyramid, integration tests with real dependencies, failure-path tests, why 100% coverage is a bad target.)*
21. **How do you keep up with technology?** *(Name specific sources and one thing you evaluated and *rejected* — that's the senior signal.)*

### Remote-role specific
22. **How do you work with a team across time zones?** *(Async-first written updates, overlap window, decision records, no blocking hand-offs.)*
23. **How do you stay accountable without supervision?** *(Visible artefacts: tickets, daily written status, demoable increments.)*
24. **Describe your home working setup and internet reliability.** *(BD candidates: address power and connectivity **proactively** — UPS/IPS, a broadband + mobile-data fallback. Interviewers won't ask, but it's a silent objection worth pre-empting.)*

---

## Turing-Style Recorded Technical Video

Turing (and similar marketplaces) record a 30–60 minute technical interview once and replay it to many clients. The format is deep, single-stack, and rapid:

- 5–8 questions on **one** technology (Node.js, or NestJS, or PostgreSQL)
- Follow-ups drill until you hit the edge of your knowledge — **that's the design**, not a failure
- You're scored on depth, correctness, and clarity of explanation

**The two rules:**
1. **Never bluff.** "I haven't used that in production, but my understanding is X — here's how I'd verify it" scores better than a confident wrong answer, because they will drill further.
2. **Answer in layers.** One-sentence definition → how it works → when you'd use it → the trade-off. That structure lets the interviewer stop you at the right depth.

**Example — "Explain the Node.js event loop":**
> *(Layer 1)* It's the mechanism that lets a single-threaded runtime handle concurrent I/O by processing callbacks in phases.
> *(Layer 2)* Six phases — timers, pending callbacks, idle/prepare, poll, check, close — and `process.nextTick` plus promise microtasks drain between every phase transition.
> *(Layer 3)* It matters because any synchronous CPU work blocks all of it — so I move hashing or report generation to worker threads or a queue.
> *(Layer 4)* The trade-off is that worker threads add memory and serialisation cost, so below a few hundred milliseconds of CPU I'd keep it inline.

That's 35 seconds and it demonstrates four levels of understanding.

---

## Situational Judgement Tests

TestGorilla, Mettl, and most graduate-style batteries include SJTs: a workplace scenario with 4–5 responses, and you rank them or pick most/least effective. They're scored against a competency model, so there **are** right answers.

**The scoring logic, in three rules:**
1. **Take ownership without going around people.** Escalating immediately scores low; escalating *after* trying and with a proposal scores high.
2. **Gather information before acting** — but don't gather forever when there's an active impact.
3. **Communicate proactively to whoever is affected.** Silence is always the worst option.

---

**SJT1.** You discover, two days before launch, that a feature you built has a security flaw that could expose customer emails. Fixing it properly needs a week. What do you do?

A) Launch on time and fix it in the next sprint — the exposure is unlikely.
B) Immediately tell your lead and product owner, explain the specific risk and the options (delay, launch with the feature disabled, or a partial mitigation), and recommend one.
C) Quietly apply a partial patch and say nothing so the launch isn't jeopardised.
D) Escalate directly to the CTO, bypassing your lead.

<details><summary>Best / worst</summary>

**Best: B.** Immediate disclosure + framed options + a recommendation. That's exactly the "own it and escalate with a proposal" pattern.
**Worst: C.** Concealing a known security flaw is the single most disqualifying behaviour in these instruments — worse than A, because A at least is a visible decision someone can overrule.
D is well-intentioned but skips the chain; only correct if your lead is unavailable or implicated.
</details>

---

**SJT2.** A senior colleague's PR contains a design you believe will cause a production incident under load. They're respected and pushed back on your first comment. What do you do?

A) Approve it — they have more context than you.
B) Block the PR and state that you're right.
C) Bring evidence: a load test, a back-of-envelope estimate, or a link to a prior incident, and propose a specific alternative or a safeguard (feature flag, canary).
D) Raise it in the team channel so others weigh in.

<details><summary>Best / worst</summary>

**Best: C.** Escalate to *data*, not to authority or volume. Offering a safeguard rather than only an objection is what makes it land.
**Worst: A.** Deferring on a risk you've identified is a failure of the responsibility being assessed. B is nearly as bad — assertion without evidence.
D is reasonable *after* C, and phrased as a request for input rather than an appeal to the crowd.
</details>

---

**SJT3.** You're leading a team. A junior consistently misses estimates by 2–3×. What's your first move?

A) Reassign their work to faster engineers.
B) Have a one-to-one to understand where the time is actually going — blockers, unclear requirements, or estimation skill — and pair on breaking down the next task.
C) Raise it in the retro so the team can discuss it.
D) Add a buffer to their estimates and say nothing.

<details><summary>Best / worst</summary>

**Best: B.** Diagnose privately before intervening; estimation misses are usually a symptom (unclear scope, hidden blockers, missing context), not a capability verdict.
**Worst: C.** Naming an individual's performance problem in a group forum is the classic wrong answer in every leadership SJT.
D is avoidance; A is a short-term fix that guarantees the junior never improves.
</details>

---

**SJT4.** Production is down. You have a hypothesis but aren't certain. Your manager is asking for an ETA every five minutes.

A) Give an optimistic ETA to stop the interruptions.
B) Ignore the messages until it's fixed.
C) Post a short status now — impact, what you've ruled out, current hypothesis, next update in 15 minutes — and designate someone else to handle comms.
D) Ask your manager to stop messaging you.

<details><summary>Best / worst</summary>

**Best: C.** Structured, time-boxed updates plus separating the **incident commander / comms** role from the **investigator** role — that's the textbook incident-management answer and it maps to [phase-4 observability](../phase-4-cloud-infrastructure/05-observability-reliability.md).
**Worst: A.** A fabricated ETA destroys trust and cascades into wrong decisions downstream.
</details>

---

**SJT5.** A client asks you directly to add "one small feature" mid-sprint, outside the agreed scope.

A) Just build it — it's small and keeps the client happy.
B) Refuse and tell them to talk to the product owner.
C) Acknowledge it, size it honestly, explain what it would displace, and route it through the agreed prioritisation with your PO — offering the fastest legitimate path if it's genuinely urgent.
D) Add it silently and absorb the overtime.

<details><summary>Best / worst</summary>

**Best: C** — respect the process without making the client feel blocked; make the **trade-off visible** rather than the answer being "no".
**Worst: D.** Invisible scope creep plus unsustainable work; it also corrupts the team's velocity data.
</details>

---

## Personality & Culture-Fit Inventories

TestGorilla's Big 5 (OCEAN), Culture Add, and Motivation tests, plus Mettl's psychometrics.

**How they actually work:**
- There are **no wrong traits** — but there *is* a consistency score. The same construct is probed 4–8 times with reworded and **reverse-scored** items ("I enjoy detailed planning" / "I prefer to improvise").
- Contradicting yourself flags the profile as unreliable, which recruiters treat far more negatively than any trait score.
- "Faking good" (max agreeableness + max conscientiousness + zero neuroticism on every item) is detectable as an implausible profile.

**How to take them:**
1. **Answer fast and honestly.** First instinct is usually the consistent one; over-thinking is what creates contradictions.
2. **Don't sit on the midpoint.** All-neutral answers produce an uninformative profile that some employers auto-reject.
3. **Answer as your professional self**, not your weekend self — the frame is workplace behaviour.
4. Motivation/culture tests often ask you to **rank** what matters (autonomy, stability, recognition, learning, impact). Rank truthfully; a mismatch found later costs you more than the offer was worth.

**The one legitimate adjustment:** on Likert scales, use the full range. If you genuinely agree, pick "strongly agree" rather than hedging — hedged profiles read as low-confidence.

---

## Cognitive Aptitude — Numerical Reasoning

Timed, usually 45–75 seconds each, calculator sometimes allowed. Practise the *format*: the maths is easy, the clock isn't.

**N1.** A server costs BDT 12,000/month. Prices rise 15%. New monthly cost?
<details><summary>Answer</summary>**13,800.** 12,000 × 1.15. (Do it as 12,000 + 1,800 — percentage-of-a-round-number beats reaching for a calculator.)</details>

**N2.** Revenue grew from BDT 4.2M to BDT 5.46M. Percentage growth?
<details><summary>Answer</summary>**30%.** (5.46 − 4.2)/4.2 = 1.26/4.2 = 0.30.</details>

**N3.** 5 developers finish a module in 12 days. How long for 3 developers, same rate?
<details><summary>Answer</summary>**20 days.** 5 × 12 = 60 developer-days; 60/3 = 20. (Work problems are always "convert to unit-days first".)</details>

**N4.** 24,000 visitors, 1.5% convert, average order BDT 2,400. Revenue?
<details><summary>Answer</summary>**BDT 864,000.** 24,000 × 0.015 = 360 orders; 360 × 2,400 = 864,000.</details>

**N5.** Cache hit ratio is 92% on 5,000,000 requests/day. How many requests reach the database?
<details><summary>Answer</summary>**400,000.** 8% of 5M.</details>

**N6.** A service handles 1,200 requests/second at peak. Peak is 3× average. Daily request volume?
<details><summary>Answer</summary>**~34.56 million.** Average = 400 rps; 400 × 86,400 = 34,560,000. (86,400 seconds/day is worth memorising — it appears in both aptitude tests and system-design estimation.)</details>

**N7.** Data transfer of 2.4 TB at $0.09 per GB. Cost?
<details><summary>Answer</summary>**$216.** 2,400 GB × 0.09. (Cloud billing uses 1 TB = 1,000 GB.)</details>

**N8.** A team splits dev : QA : ops in the ratio 6 : 2 : 1. The team has 45 people. How many in QA?
<details><summary>Answer</summary>**10.** 45/9 = 5 per part; QA = 2 × 5.</details>

**N9.** 1,000,000 users growing 8% per month. Users after 3 months (nearest thousand)?
<details><summary>Answer</summary>**~1,260,000.** 1.08³ = 1.2597. Compound, not 24% simple — that's the trap.</details>

**N10.** Six servers at $340/month each, with a 10% discount for annual prepayment. Annual cost?
<details><summary>Answer</summary>**$22,032.** 340 × 6 × 12 = 24,480; less 10% = 22,032.</details>

**N11.** p50 latency is 120 ms and p99 is 900 ms. The p99 is how many times the p50?
<details><summary>Answer</summary>**7.5×.**</details>

**N12.** An engineer earns BDT 150,000/month gross. Deductions are 12%. Annual net?
<details><summary>Answer</summary>**BDT 1,584,000.** 150,000 × 0.88 = 132,000/month × 12.</details>

**The five techniques that carry this whole section:**
1. **Percentage change** = (new − old)/old. Always divide by the **old** value.
2. **Reverse percentage:** if a price *after* a 20% rise is 120, the original is 120/1.2 = 100 — not 120 − 20%.
3. **Work rate:** convert to unit-days/unit-hours, then redistribute.
4. **Ratios:** sum the parts, divide the total, multiply back.
5. **Estimate before computing.** Most options are far apart; a 5-second estimate eliminates two of four.

---

## Cognitive Aptitude — Logical & Abstract Reasoning

### Number series
**L1.** 2, 6, 12, 20, 30, ? <details><summary>Answer</summary>**42.** Differences 4, 6, 8, 10, **12**. (Also n(n+1): 1·2, 2·3, 3·4, …, 6·7.)</details>

**L2.** 3, 6, 11, 18, 27, ? <details><summary>Answer</summary>**38.** Differences 3, 5, 7, 9, **11** (consecutive odds).</details>

**L3.** 1, 1, 2, 3, 5, 8, ? <details><summary>Answer</summary>**13.** Fibonacci.</details>

**L4.** 64, 32, 16, 8, ? <details><summary>Answer</summary>**4.** Halving.</details>

**L5.** 2, 3, 5, 7, 11, ? <details><summary>Answer</summary>**13.** Primes.</details>

**L6.** 1, 8, 27, 64, ? <details><summary>Answer</summary>**125.** Cubes.</details>

**L7.** A, C, F, J, O, ? <details><summary>Answer</summary>**U.** Letter gaps +2, +3, +4, +5, **+6** (A→C is 2, C→F is 3, …, O→U is 6).</details>

> **Method:** check, in order — (1) constant difference, (2) difference of differences, (3) constant ratio, (4) squares/cubes/primes, (5) alternating two interleaved series, (6) sum of the previous two.

### Syllogisms
**L8.** *All servers are machines. Some machines are fast.* Can you conclude "some servers are fast"?
<details><summary>Answer</summary>**No.** The "fast machines" may all be non-servers. A **particular** premise ("some") cannot license a conclusion about a different subset. Draw the Venn diagram; if a single arrangement makes the conclusion false, it doesn't follow.</details>

**L9.** *No developer is a manager. All architects are developers.* Conclusion?
<details><summary>Answer</summary>**No architect is a manager.** Valid — universal negative propagates through a universal affirmative.</details>

**L10.** *All deployments require approval. Some approvals are automated.* Conclusion about deployments?
<details><summary>Answer</summary>**None follows.** The automated approvals need not be the deployment-related ones. "Some deployments are automatically approved" is the tempting wrong answer.</details>

### Conditional logic
**L11.** *If the build fails, the deploy is blocked. The deploy was not blocked.* What follows?
<details><summary>Answer</summary>**The build did not fail** (modus tollens: `P→Q`, `¬Q` ⊢ `¬P`). Note that "the deploy was blocked" would tell you **nothing** about the build — that's affirming the consequent, the most common wrong answer.</details>

**L12.** Four services deploy in order. A is not first. B deploys immediately after A. C is last. Where is D?
<details><summary>Answer</summary>**First.** C is 4th. A can't be 1st, and B must immediately follow A, so A–B occupies positions 2–3. That leaves position 1 for D. Order: **D, A, B, C.**</details>

> **Method for seating/ordering puzzles:** draw the slots, place the absolute constraints (C is last) first, then the block constraints (A–B adjacent), then eliminate.

---

## Cognitive Aptitude — Verbal & Attention to Detail

**Attention-to-detail tests are pure speed under care.** You compare near-identical records and mark matches/mismatches. They correlate with production carefulness, which is why employers use them for engineers.

**V1.** Which pair is identical?
```
A) txn_9f3a71b2-4c8d-11ee-be56-0242ac120002  |  txn_9f3a71b2-4c8d-11ee-be56-0242ac120002
B) txn_9f3a71b2-4c8d-11ee-be56-0242ac120002  |  txn_9f3a71b2-4c8d-11ee-be65-0242ac120002
```
<details><summary>Answer</summary>**A.** In B, `be56` became `be65`. **Technique:** compare in fixed-size chunks (4 characters), left to right, rather than reading the whole string — chunking roughly halves the error rate under time pressure.</details>

**V2.** Which email is correctly formatted for the domain `doodlei.net`?
```
A) fazle.rabbi@doodlei.net    B) fazle.rabbi@doodlei.net.   C) fazle.rabbi@doodlie.net   D) fazle rabbi@doodlei.net
```
<details><summary>Answer</summary>**A.** B has a trailing dot, C transposes `ei`→`ie`, D has a space.</details>

**V3.** *Reading comprehension format:* you get a 150-word passage and must judge statements as **True / False / Cannot Say**.
<details><summary>The one rule that gets you most of the marks</summary>

**"Cannot Say" means the passage doesn't contain the information — not that the statement seems unlikely.** Judge *only* against the text, never against what you know to be true in the real world. Most people's errors are marking "False" for things the passage simply doesn't address.
</details>

---

## Data Interpretation

Given a table, answer 3–4 questions. Mettl and TestGorilla both use this format.

| Month | Requests (M) | Errors (K) | p99 (ms) | Cost (USD) |
|---|---|---|---|---|
| Jan | 120 | 240 | 810 | 4,200 |
| Feb | 150 | 225 | 760 | 4,800 |
| Mar | 180 | 360 | 940 | 6,000 |
| Apr | 210 | 252 | 700 | 6,300 |

**DI1.** Which month had the **lowest error rate**?
<details><summary>Answer</summary>**April.** Error rates: Jan 240K/120M = 0.20%; Feb 225K/150M = 0.15%; Mar 360K/180M = 0.20%; Apr 252K/210M = **0.12%**.

The trap is answering "February" because it has the fewest errors in absolute terms. **DI questions almost always test rates, not absolutes** — and March had both the most errors *and* the worst rate, which is the distractor pairing.</details>

**DI2.** Cost per million requests in March vs April?
<details><summary>Answer</summary>Mar: 6,000/180 = **$33.33**; Apr: 6,300/210 = **$30.00**. Costs rose in absolute terms but **unit economics improved by 10%** — that framing is what the question is testing.</details>

**DI3.** Percentage change in p99 from March to April?
<details><summary>Answer</summary>**−25.5%.** (700 − 940)/940 = −0.2553.</details>

**DI4.** If May's traffic grows 20% over April at April's unit cost, what's May's cost?
<details><summary>Answer</summary>**$7,560.** April traffic 210M × 1.2 = 252M; 252 × $30 = $7,560. (Equivalently, 6,300 × 1.2 — unit cost held constant means cost scales linearly.)</details>

**DI5.** Over the four months, what is the average monthly request volume, and is the trend linear?
<details><summary>Answer</summary>**165M average** ((120+150+180+210)/4 = 660/4). The trend **is** linear — a constant +30M per month, which is *decelerating* in percentage terms (25%, 20%, 16.7%). Being able to say "linear in absolute terms, decelerating in relative terms" is what separates a full-mark answer here.</details>

> **DI method under time pressure:** read the **question** before the table, identify whether it asks for an absolute, a rate, or a change, and only then extract the two or three numbers you need. Reading the whole table first is the most common way people run out of time.

---

## English Fluency for Remote Roles

For international remote roles, communication is scored as heavily as code — Toptal and Turing both gate on it explicitly, and AI transcript scoring on Talview/HireVue measures pace and filler density.

**What's actually being assessed:** clarity of structure, precision of technical vocabulary, and whether a listener can follow your reasoning. **Not** accent.

**Five drills, 15 minutes a day:**
1. **Record yourself** answering one question from [the 24](#the-24-questions-you-will-actually-be-asked) and play it back. Painful, and by far the fastest improvement available.
2. **Count your fillers.** "Um", "like", "basically", "actually", "you know". Replace them with a **silent pause** — a pause reads as thoughtful; a filler reads as unprepared, and AI scoring penalises filler density directly.
3. **Signpost out loud.** "There are three reasons. First… Second… Third…" Structure makes you sound fluent even when your vocabulary is stretched.
4. **Slow down 20%.** Non-native speakers under pressure speed up, which is what actually causes listeners to miss the content.
5. **Rehearse the numbers.** Say "forty-one million users", "p ninety-nine", "four hundred milliseconds" out loud until they're automatic. Fumbling your own metrics undermines the story.

**Phrases that buy you thinking time without a filler:**
- "That's a good question — let me structure it around three points."
- "Let me make sure I understand: you're asking about X, or Y?" *(also a correctness signal)*
- "I want to give you a concrete example rather than a general answer."
- "I haven't hit that exact case in production. Here's how I'd reason about it…"

---

## Recording Setup Checklist

The bar is "competent professional", not "studio". Failing it is entirely avoidable.

**Video**
- [ ] Camera at **eye level** (stack books under the laptop) — looking down at a webcam is the single most common problem
- [ ] Light source **in front of** you, never behind; a window facing you beats any lamp
- [ ] Plain, uncluttered background; avoid distracting virtual backgrounds
- [ ] Frame: head and shoulders, small gap above the head
- [ ] **Look at the camera lens**, not your own image on screen — move the preview window to sit just under the lens

**Audio**
- [ ] Wired earphones with a mic beat laptop speakers and beat most Bluetooth (which compresses to a low-bitrate profile when the mic is active)
- [ ] Quiet room; close windows; warn the household; silence the phone
- [ ] Test-record 30 seconds and **listen back** before starting

**Environment & connectivity (BD-specific)**
- [ ] Laptop fully charged + UPS/IPS, in case of a load-shed during the session
- [ ] Mobile data hotspot ready as a fallback; test the switchover once
- [ ] Run a speed test — you want ≥ 2 Mbps upload sustained
- [ ] Do the platform's own system check the **day before**, not five minutes before

**Session hygiene**
- [ ] Close every app that can raise a notification; enable Do Not Disturb
- [ ] One monitor, browser only, single tab (proctoring flags tab switches)
- [ ] Water within reach; bathroom beforehand — many platforms forbid leaving frame
- [ ] Have your five STAR stories on **one printed page** you glance at *between* questions, never while recording

---

## Where to Go Next

- Build the five STAR stories → they feed both this file and the Phase 6 behavioural round in [prep.md](../prep.md)
- Weakest on aptitude? Do 20 numerical + 20 logical items daily for a week; the format, not the maths, is the bottleneck
- Ready for a full simulation → [08-timed-mock-assessments.md](08-timed-mock-assessments.md)