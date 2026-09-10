# Architect-Level Practice & Technical Leadership

> **Target Role:** Senior / Lead Backend Engineer → Architect
> **Format:** Governance practices, organisational design, combined HLD+LLD+org problems, and the recurring architecture blueprints
> **Last Updated:** 2026-08-11

At this level the questions stop being "can you design it?" and become "can you decide it, justify it to three audiences, and live with the consequences for four years?"

---

## In 60 seconds

> **This is the guide that addresses your specific gap.** This repo's own market read says your
> material is *"heavy on systems and light on decisions that shaped a team."* That is exactly
> what architect-level rounds probe.

1. **The altitude changes at this level.** Senior rounds ask "can you design this?" Architect
   rounds ask "how do you get twelve engineers across three teams to build it, and what happens
   when two of them disagree?"
2. **Writing is the job.** ADRs, RFCs, migration plans. At this level your influence travels
   through documents you are not in the room for. This is also the artifact this repo says you
   are missing — see
   [../resume/02-linkedin-and-profiles.md](../resume/02-linkedin-and-profiles.md#8-the-english-problem-and-four-cheap-fixes).
3. **An ADR is four headings:** Context, Decision, Alternatives considered, Consequences. The
   *alternatives* section is what makes it senior — it proves you chose rather than defaulted.
4. **You are expected to talk about cost, risk and timeline**, not only elegance. "This design
   is better but takes an extra quarter, so I would ship the simpler one and revisit at 2M
   users" is an architect answer.
5. **Migration is the most realistic architect question**, because it is most of the real job.
   Strangler fig, expand/contract, dual writes, and always a rollback at every step.
6. **Blueprints beat improvisation.** Most systems are a variation on a handful of known shapes.
   Recognising "this is a layered business service with an async worker" lets you spend your
   time on what is genuinely unusual.

**The interview trap to expect:** "two senior engineers on your team disagree about whether to
adopt Kafka. What do you do?" They are testing whether you make it a technical decision with
explicit criteria and a written record — or whether you pick a side, or avoid it.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **ADR** | Architecture Decision Record — a short doc: context, decision, alternatives, consequences |
| **RFC** | Request For Comments — a proposal circulated for feedback before committing |
| **Design doc** | A longer document describing a system before it is built |
| **Tech radar** | A team's shared view of what to adopt, trial, or avoid |
| **Blueprint** | A reusable architecture shape for a recurring class of problem |
| **Reference architecture** | The standard approved shape for a type of system in your org |
| **Migration plan** | The ordered, reversible steps from current state to target state |
| **Strangler fig** | Migrate gradually by routing traffic away from the old system piece by piece |
| **Expand/contract** | Add the new, move over, remove the old — the safe change pattern |
| **Technical debt** | Deliberate or accidental shortcuts that slow future work |
| **Conway's Law** | Your architecture will mirror your org chart, whether you intend it or not |
| **Inverse Conway manoeuvre** | Reshaping teams deliberately to get the architecture you want |
| **Platform team** | A team whose customers are other engineers |
| **Multi-tenancy** | One system serving several customers with isolation between them |
| **Tenant isolation** | Shared database with a tenant id · separate schemas · separate databases |
| **Build vs buy** | Whether to write it or pay for it. Usually a cost-and-focus decision |
| **Blast radius** | How much breaks when this fails |
| **Reversible vs irreversible decision** | Cheap to undo → decide fast. Expensive → slow down |
| **Staff/Principal ladder** | The individual-contributor track above Senior |

---

## Table of Contents

### Part A — Leadership Practices
1. [The Architect's Mindset Shift](#1-the-architects-mindset-shift)
2. [Architecture Decision Records](#2-architecture-decision-records)
3. [Writing an RFC](#3-writing-an-rfc)
4. [Conway's Law & Team Topologies](#4-conways-law--team-topologies)
5. [Technology Radar & Standards](#5-technology-radar--standards)
6. [Managing Technical Debt](#6-managing-technical-debt)
7. [Reference Architectures & Golden Paths](#7-reference-architectures--golden-paths)
8. [Code Review & Engineering Standards](#8-code-review--engineering-standards)
9. [Root Cause Analysis & Blameless Postmortems](#9-root-cause-analysis--blameless-postmortems)
10. [Compliance & Regulatory Architecture](#10-compliance--regulatory-architecture)

### Part B — Architect-Level Problems
11. [Multi-Tenant SaaS Platform](#11-multi-tenant-saas-platform)
12. [Global E-Commerce at Amazon Scale](#12-global-e-commerce-at-amazon-scale)
13. [Real-Time Bidding (Ad-Tech)](#13-real-time-bidding-ad-tech)
14. [Monolith → Microservices Migration](#14-monolith--microservices-migration)
15. [IoT Platform (Millions of Devices)](#15-iot-platform-millions-of-devices)
16. [Healthcare Data Platform](#16-healthcare-data-platform)
17. [Internal Developer Platform](#17-internal-developer-platform)
18. [Multi-Cloud Strategy](#18-multi-cloud-strategy)

### Part C — Common Architecture Blueprints
19. [The Blueprint Method](#19-the-blueprint-method)
20. [Layered / Hexagonal Business Service](#20-layered--hexagonal-business-service)
21. [Microservices + API Gateway + BFF](#21-microservices--api-gateway--bff)
22. [Event-Driven Order Processing](#22-event-driven-order-processing)
23. [Saga-Orchestrated Distributed Transaction](#23-saga-orchestrated-distributed-transaction)
24. [CQRS + Event Sourcing Ledger](#24-cqrs--event-sourcing-ledger)
25. [Real-Time Streaming Analytics](#25-real-time-streaming-analytics)
26. [Serverless Event Pipeline](#26-serverless-event-pipeline)
27. [Read-Heavy Content Delivery](#27-read-heavy-content-delivery)
28. [Write-Heavy Time-Series Ingestion](#28-write-heavy-time-series-ingestion)
29. [Long-Running Workflow Orchestration](#29-long-running-workflow-orchestration)
30. [Multi-Region Active-Active](#30-multi-region-active-active)
31. [Authentication & Authorisation Platform](#31-authentication--authorisation-platform)
32. [Analytics Data Platform (CDC → Lakehouse)](#32-analytics-data-platform-cdc--lakehouse)
33. [Choosing the Right Blueprint](#33-choosing-the-right-blueprint)

### Part D — Real Systems & Scaling Stories
34. [URL Shortener — Full Worked Example](#34-url-shortener--full-worked-example)
35. [Uber — Real-Time Matching at City Scale](#35-uber--real-time-matching-at-city-scale)
36. [Netflix — Global Streaming & the Availability Obsession](#36-netflix--global-streaming--the-availability-obsession)
37. [Twitter/X — The Fanout Problem](#37-twitterx--the-fanout-problem)
38. [Instagram — Simplicity as a Scaling Strategy](#38-instagram--simplicity-as-a-scaling-strategy)
39. [WhatsApp — Enormous Scale, Tiny Team](#39-whatsapp--enormous-scale-tiny-team)
40. [Discord — Trillions of Messages](#40-discord--trillions-of-messages)
41. [Amazon — The API Mandate & Blast Radius](#41-amazon--the-api-mandate--blast-radius)
42. [Stripe — API Design as Architecture](#42-stripe--api-design-as-architecture)
43. [Shopify — Pods, Cells & Black Friday](#43-shopify--pods-cells--black-friday)
44. [Dropbox — Magic Pocket & Leaving the Cloud](#44-dropbox--magic-pocket--leaving-the-cloud)
45. [What Breaks at Each Order of Magnitude](#45-what-breaks-at-each-order-of-magnitude)
46. [Bangladesh Context — Local Scaling Constraints](#46-bangladesh-context--local-scaling-constraints)
47. [Quick Reference](#quick-reference)

---

# Part A — Leadership Practices

## 1. The Architect's Mindset Shift

### Q: What changes between senior, staff and architect?

**A:**

| Level | Central question | Scope of consequence |
|---|---|---|
| **Senior** | "How do I build this correctly?" | One service, one quarter |
| **Staff** | "What are the trade-offs between these approaches?" | Several teams, one year |
| **Architect** | "What are the trade-offs, constraints, team impacts and long-term consequences?" | The organisation, several years |

Every architect-level decision is evaluated on three axes simultaneously:

- **Technical** — does it work, scale, and stay operable?
- **Organisational** — can our teams build and run it? Does it match how we're structured, or does it require a reorg?
- **Business** — what does it cost, what does it unlock, when does it pay back, what risk does it carry?

A design that is technically ideal and organisationally impossible is a bad design. Saying that out loud is one of the fastest ways to signal architect-level thinking.

**The behaviours interviewers are probing for:**
- You ask about constraints before proposing solutions — team size, existing skills, budget, timeline, regulatory environment.
- You present **options with trade-offs**, not a single answer, and then you *recommend one* rather than leaving the decision hanging. Presenting three options with no recommendation is abdication, not neutrality.
- You talk about migration paths and reversibility, not just target states. Every proposal answers "how do we get there from here, incrementally, while shipping?"
- You name what you'd measure to know if the decision was right, and what would make you reverse it.
- You're comfortable saying "the boring option is correct here" and defending it.

**The most valuable architect skill is knowing which decisions are hard to reverse.** Amazon's framing of **one-way doors vs two-way doors** is worth using explicitly: choosing a cloud provider, a data model for your core entity, or a service boundary is close to one-way — invest heavily in getting these right. Choosing a logging library, a CI tool, or an internal API's pagination style is two-way — decide fast, move on, change it later if wrong. Teams routinely over-deliberate two-way doors and under-deliberate one-way doors.

---

## 2. Architecture Decision Records

### Q: What is an ADR and when do you write one?

**A:** A short document capturing **one architecturally significant decision**: the context, the options, the choice, and the consequences. Stored in the repo alongside the code (`docs/adr/0012-use-kafka-for-order-events.md`), immutable once accepted, superseded rather than edited.

**Write one when the decision** is expensive to reverse, affects multiple teams, sets a precedent, or when you know someone will ask "why on earth did they do it this way?" in two years. Don't write one for routine choices.

**The template — short is the point. One page.**

```markdown
# ADR-0012: Use Kafka as the event backbone for order processing

**Status:** Accepted            <!-- Proposed | Accepted | Deprecated | Superseded by ADR-0031 -->
**Date:** 2026-08-06
**Deciders:** Platform team, Orders team
**Consulted:** SRE, Data Engineering

## Context
Orders currently notify downstream systems (inventory, notifications, analytics)
via synchronous HTTP. Three consequences are hurting us:
 - Order placement fails when any downstream is down (availability multiplies:
   0.999^4 ≈ 99.6%, below our 99.9% SLO).
 - Adding a consumer requires a change to the orders service (3 in the last quarter).
 - Analytics cannot replay history after a bug; we lost 2 days of data in June.

Expected volume: 3K events/sec peak, growing to ~10K within 18 months.

## Options considered
1. **Keep synchronous HTTP + retries** — no new infrastructure; doesn't solve
   coupling or replay; availability problem persists.
2. **RabbitMQ** — team has experience; simpler to operate; no replay, and
   fan-out to N independent consumers needs N queues to manage.
3. **Kafka (MSK)** — replay via retained log; N consumer groups on one topic;
   partition-level ordering per order_id. New operational surface; managed
   service reduces but does not remove that.
4. **AWS EventBridge** — fully managed, cheapest to start; 24h replay only,
   no ordering guarantee, per-event pricing becomes expensive at 10K/sec.

## Decision
Adopt **Kafka via Amazon MSK**, with topics keyed by `order_id` for
per-order ordering. Producers write through the transactional outbox pattern.

## Consequences
**Positive**
 - Order placement no longer depends on downstream availability.
 - New consumers are added without touching the orders service.
 - 7-day retention gives us replay for recovery and backfill.

**Negative / accepted costs**
 - New operational surface: consumer lag monitoring, partition rebalancing,
   schema registry. ~$800/month for MSK at current volume.
 - Downstream consistency becomes eventual; the UI must handle "order placed,
   inventory not yet reflected" (see ADR-0013).
 - Team needs Kafka training; 2 engineers to complete it before go-live.

**Follow-ups**
 - ADR-0013: eventual consistency in the order confirmation UX
 - Runbook: consumer lag alerting thresholds
```

**Why the "options considered" section matters most:** it captures the alternatives that were *rejected and why*, which is the information that decays fastest and is most valuable later. Six months on, someone will propose EventBridge again; the ADR answers them in thirty seconds. Without it, the team relitigates the same decision annually.

**Governance:** review ADRs in a lightweight architecture forum, keep the status current, and supersede rather than delete — the history of how the architecture evolved *is* the documentation. An ADR that gets edited after acceptance has lost its value as a record.

---

## 3. Writing an RFC

### Q: How does an RFC differ from an ADR, and how do you run the process?

**A:** An **ADR records a decision that's been made**; an **RFC proposes a change and solicits input before the decision**. RFCs are longer, they're written before consensus, and their purpose is to surface disagreement early — when it's cheap — rather than in code review, when it's expensive.

**Structure:**

1. **Summary** — three sentences a busy person can read.
2. **Motivation** — the problem, with evidence. Numbers, incident references, customer quotes. Not "our architecture is messy."
3. **Proposal** — the design, in enough detail to be criticised. Diagrams, API sketches, data model changes.
4. **Alternatives considered** — including "do nothing", which is always a real option and often the right one.
5. **Migration plan** — how we get from here to there incrementally, and what's reversible at each step.
6. **Risks and open questions** — the honest list. An RFC with no risks section reads as naive and gets less useful feedback.
7. **Rollout, success metrics and rollback** — how we'll know it worked, and how we back out.

**Running the process well:**
- **Time-box the comment period** (a week is typical) and state the deadline up front, or RFCs die of neglect.
- **Nominate a decider.** Consensus-seeking without a named decider produces documents that stay in "draft" for six months. The decider's job is to make the call after hearing the input, not to be right in advance.
- **Resolve every comment visibly** — accepted, rejected with a reason, or deferred to a follow-up. Silent dismissal is how you lose people's willingness to review the next one.
- **Close the loop with an ADR** recording what was decided.

**As a leadership signal:** the point of an RFC culture isn't the documents, it's that it makes technical decision-making legible, distributes context, and lets a junior engineer disagree with a principal engineer in writing. That's a culture outcome achieved with a process tool, and describing it that way in an interview lands well.

---

## 4. Conway's Law & Team Topologies

### Q: Explain Conway's Law and its practical consequences.

**A:**

> "Organisations design systems that mirror their own communication structure." — Melvin Conway, 1967

This is an observation, not advice — it happens whether you plan for it or not. Three teams building a compiler produce a three-pass compiler. A backend team and a frontend team separated organisationally produce an API boundary exactly where the org chart splits, regardless of whether that's the right seam.

**The Inverse Conway Manoeuvre** is the deliberate application: **design the team structure you want the architecture to have.** If you want three independently deployable services, create three teams that own them end to end. If you keep one team owning everything, you will get a monolith no matter what the architecture diagram says — because coordination is free within a team and expensive across teams, and code follows the path of least coordination.

**Team Topologies (Skelton & Pais)** gives four team types and three interaction modes:

| Team type | Purpose | Example |
|---|---|---|
| **Stream-aligned** | Owns a flow of business value end to end. **Most teams should be this.** | The Payments team: API, workers, data, on-call |
| **Platform** | Provides internal services that reduce cognitive load for stream-aligned teams | Developer platform, CI/CD, observability stack |
| **Enabling** | Temporarily helps other teams build a capability, then leaves | A team that helps three squads adopt Kafka, then dissolves |
| **Complicated-subsystem** | Owns something requiring deep specialist knowledge | Video transcoding pipeline, ML ranking model, payments crypto |

| Interaction mode | When |
|---|---|
| **Collaboration** | Two teams working closely to discover something new. High bandwidth, high cost — should be temporary |
| **X-as-a-Service** | One team consumes another's product with minimal interaction. The steady state you want |
| **Facilitating** | An enabling team coaches another. Explicitly time-bound |

**The concept that ties it together is cognitive load.** A team can only hold so much in its head. If a stream-aligned team must also operate Kubernetes, manage a Kafka cluster, run their own observability stack and handle their own compliance, they have no capacity left for the business problem. That's what a platform team is *for* — not to be a gatekeeper, but to absorb cognitive load so product teams can move.

**Applying this in an interview answer:** when asked to design a microservices migration, address the team structure explicitly. "Splitting into eight services with the same four teams gives us eight deployment pipelines and the same coordination bottleneck. I'd propose four services aligned to the four teams, and revisit when we hire." That answer distinguishes an architect from a senior engineer more reliably than any technical detail.

---

## 5. Technology Radar & Standards

### Q: How do you evaluate and govern technology choices across an organisation?

**A:** A **technology radar** (the ThoughtWorks format) places technologies into four rings, reviewed quarterly:

| Ring | Meaning |
|---|---|
| **Adopt** | Proven here. Default choice. Use it without asking |
| **Trial** | Worth pursuing on a real project with a defined owner and exit criteria |
| **Assess** | Worth understanding; build a spike, don't put it in production |
| **Hold** | Don't start anything new with this. (Not necessarily "rip it out") |

**Why it works:** it makes the default path explicit, so an engineer choosing a queue doesn't need a meeting — Adopt says RabbitMQ, and deviating requires a justification rather than approval-by-default. It also gives a graceful way to say "no, not yet" (Assess) instead of a flat refusal, which keeps innovation flowing without every team adopting a different database.

**An evaluation framework for a new technology** — apply it consistently and the conversation stops being about taste:

| Criterion | Question |
|---|---|
| **Problem fit** | What specific problem does this solve that our current stack cannot? |
| **Maturity** | Production users at our scale? Release cadence? Breaking-change history? |
| **Operability** | Who runs it at 3 a.m.? What's the failure mode? Is there a managed option? |
| **Hiring & knowledge** | Can we hire for it here? How long to onboard an engineer? |
| **Exit cost** | If this is wrong in two years, what does it cost to leave? |
| **Total cost** | Licence + infrastructure + the engineering time to operate it |
| **Ecosystem** | Client libraries for our languages, monitoring integration, community |

**The strongest architect answer on technology choice is usually conservative:** "the boring stack, chosen deliberately, with one or two places where we spend our innovation budget on genuine differentiators." An organisation has a limited capacity to absorb novelty; spend it where it wins you something, and take the well-worn path everywhere else. Dan McKinley's "Choose Boring Technology" and its "innovation tokens" framing is the canonical reference and worth citing by name.

---

## 6. Managing Technical Debt

### Q: How do you quantify, prioritise and communicate technical debt?

**A:** The first move is to stop calling everything "tech debt." Distinguish:

| Type | Description | Response |
|---|---|---|
| **Deliberate & prudent** | "We shipped the simple version to hit the launch; we'll revisit." | Track it, schedule it. This is healthy |
| **Deliberate & reckless** | "No time for design." | Cultural problem, not a backlog item |
| **Inadvertent & prudent** | "Now we know how we should have built it." | Normal learning. Refactor when you're next in there |
| **Inadvertent & reckless** | The team didn't know better | Training and review, not just refactoring |

**Quantify it in business terms**, because "the code is ugly" is not a fundable proposal:
- **Time cost:** "Every change to the billing module takes 3 days instead of half a day because of the duplicated tax logic — that's ~30 engineer-days per quarter."
- **Incident cost:** "Four of our last ten Sev-2 incidents traced to the shared session store. Each cost ~6 engineer-hours plus customer impact."
- **Opportunity cost:** "We can't offer per-seat pricing because the schema assumes one plan per account. That's the top request from three enterprise prospects."
- **Risk:** "This library has no maintainer and a known CVE; it's in the auth path."

**Prioritise with a simple 2×2** — pain (how often it hurts × how much) against effort. Fix high-pain/low-effort immediately; schedule high-pain/high-effort as real projects with real plans; ignore low-pain items regardless of how offensive the code is. Beautifying code nobody touches is not engineering, it's decorating.

**Communicating it upward** — the framing that actually gets funded:

> "Our lead time for billing changes has gone from 2 days to 9 over the last year. The cause is that tax calculation is duplicated in four places, so every change requires touching and testing all four. Consolidating it is about 3 weeks of work and would bring lead time back under 3 days. At our current rate of ~8 billing changes per quarter, it pays back in roughly two quarters, and it removes the class of bug that caused the June incident."

Notice what that does: a metric, a cause, a cost, a payback period, and a risk retired. No moral language, no "the code is bad."

**Making it sustainable:** allocate a standing percentage of capacity (10–20%) rather than fighting for it each quarter; attach refactoring to feature work in the same area ("we're in there anyway"); track lead time and change failure rate so the trend is visible; and write the ADR when you deliberately take debt on, so the decision is recorded rather than discovered years later.

---

## 7. Reference Architectures & Golden Paths

### Q: What is a golden path and why does it matter?

**A:** A **golden path** is the supported, opinionated, well-lit way to build and run a service at your company: a template repository with the framework configured, CI/CD wired up, observability instrumented, secrets management connected, a Dockerfile and Helm chart that meet your standards, and a deployment pipeline that works on day one.

**The value is time and consistency.** A new service on the golden path goes from `git init` to production in a day, with logging, metrics, tracing, health checks, graceful shutdown, security scanning and alerting already correct. Off the path, that's two weeks of plumbing, done slightly differently each time, and the observability gaps show up during your first incident.

**Golden paths are paved, not enforced.** Teams may leave the path when they have a real reason — but they then own what the platform would have given them. Making the supported path genuinely the easiest path achieves 90% adoption without a mandate, and mandates without a good path just produce resentment and shadow infrastructure.

**A reference architecture** is the same idea at the system level: a documented, blessed pattern for a class of problem ("this is how we build an event-consuming service", "this is how we do multi-tenant data isolation") with the rationale and the trade-offs. It prevents every team from rediscovering the same decisions and diverging.

**Platform engineering, framed correctly:** the platform team's product is developer experience, and its customers are internal engineers. That means it needs a roadmap, user research (talk to the teams), documentation, support, and adoption metrics — not just Terraform. Platform teams that behave as gatekeepers rather than product teams reliably fail, and saying that in an interview shows you've seen it happen.

---

## 8. Code Review & Engineering Standards

### Q: What do you look for in a code review, and how do you give feedback?

**A:** In priority order — and the order matters, because reviewers who start at style never get to correctness:

1. **Correctness** — does it do what it claims? Edge cases, error paths, concurrency, off-by-one.
2. **Security** — authorisation checks, injection, secrets, unbounded input, data exposure.
3. **Design** — is this the right place for this logic? Does it fit the existing abstractions or fight them?
4. **Operability** — can we debug this at 3 a.m.? Logging, metrics, error messages that name the thing that failed.
5. **Tests** — do they test behaviour rather than implementation? Would they catch a regression?
6. **Readability** — will someone understand this in a year?
7. **Style** — should be **automated** and never discussed by humans. Prettier, ESLint, a formatter in CI.

**Giving feedback well:**
- **Distinguish blocking from non-blocking.** Prefix conventions help: `blocking:`, `suggestion:`, `nit:`, `question:`, `praise:`. Ambiguity about whether a comment must be addressed is the main source of review friction.
- **Ask rather than assert** when you might be missing context: "What happens if `items` is empty here?" beats "This crashes on empty input" — and it's occasionally *you* who's wrong.
- **Explain the why**, with a link if there's a standard. Reviews are the highest-bandwidth teaching moment in most engineering orgs; a comment that only says what to change teaches nothing.
- **Approve with minor comments** rather than blocking on nits. Round-tripping a PR three times over naming is a velocity tax with no quality return.
- **Review promptly.** A PR sitting for two days costs more in context-switching and merge conflicts than most of the issues a review catches.

**As a lead, watch the systemic signals rather than individual PRs:** review latency, PR size (large PRs get rubber-stamped — a PR over ~400 lines gets meaningfully worse review), whether one person is a bottleneck on all reviews, and whether reviews are catching things or merely delaying merges. If defects consistently escape review, the answer is usually better tests or better types, not stricter reviews.

**Git workflow, briefly, since it pairs with this:** trunk-based development with short-lived branches and feature flags is the standard for teams deploying frequently — it minimises merge pain and matches continuous delivery. GitFlow suits versioned software with supported releases (a mobile SDK, an on-prem product). Choose based on release model, not preference, and say so.

---

## 9. Root Cause Analysis & Blameless Postmortems

The incident *process* is covered in [the reliability guide](05-reliability-security-cost.md#q9-incident-management--postmortems). This section is about the analysis technique.

### Q: How do you run a root cause analysis?

**A:** **5 Whys**, applied with discipline — and the discipline is refusing to stop at a human:

```
Incident: Checkout failed for 12% of users for 43 minutes.

Why? The payments service returned 500s.
Why? Its database connection pool was exhausted.
Why? A deploy increased per-request queries from 2 to 9 (an N+1 in a new feature).
Why? The N+1 wasn't caught before production.
Why? We have no query-count assertion in integration tests, and no alert on
     queries-per-request; load testing runs against a 1,000-row dataset where
     the N+1 is invisible.
```

**Stop at "human error" and you've learned nothing.** "The engineer wrote an N+1" is true and useless. The actionable findings are in the last two whys: add a query-count regression test, alert on queries-per-request, and load test with production-scale data. Those prevent the *class* of incident, not the instance.

**Where 5 Whys falls short:** it produces a single linear chain, and real incidents have multiple contributing factors. For complex incidents use a **causal tree** (branch at each level: what else contributed?) or a **contributing factors list** grouped into technical, process and organisational. Most serious incidents have all three.

**The three questions to close every postmortem with:**
1. Could we have **detected** this faster? → an SLI or alert gap
2. Could we have **mitigated** it faster? → a runbook, feature flag, or rollback gap
3. **What else has this same weakness?** → the highest-leverage question, because it converts one incident into N prevented incidents

**On blamelessness:** it is an information-gathering strategy, not politeness. In a blaming culture people omit the detail that makes them look bad — and that detail is usually the one you needed. If an engineer could run a command that took production down, the finding is "that command had no guardrail." The system permitted the error; fix the system.

**Track over time:** MTTD, MTTA, MTTR, change failure rate, and the completion rate of postmortem action items. That last one is the honest measure of whether your postmortem process is real or theatre — a healthy org closes most action items within a quarter.

---

## 10. Compliance & Regulatory Architecture

### Q: How do compliance requirements shape architecture?

**A:** They become non-functional requirements with legal force, and the architect's job is to satisfy them structurally rather than by policy documents that engineers ignore.

| Regime | Applies to | Key architectural requirements |
|---|---|---|
| **GDPR** | EU personal data | Right to erasure, data portability, consent records, breach notification within 72h, data residency, privacy by design |
| **PCI-DSS** | Card data | Network segmentation, minimise scope (tokenise — never store PANs), encryption, quarterly scans, access logging |
| **SOC 2** | US B2B SaaS trust | Access controls, change management, monitoring, vendor management, evidence collection — mostly *process* evidence |
| **HIPAA** | US health data | PHI encryption, access audit trail, BAAs with vendors, minimum-necessary access |
| **Bangladesh Bank / BFIU** | BD financial services | Transaction limits by KYC tier, AML monitoring and reporting, audit retention, data localisation |
| **BTRC** | BD telecom | Subscriber data handling, lawful intercept obligations, service reporting |
| **BD Digital Security Act / Data Protection rules** | BD generally | Data handling and retention obligations; consult counsel for current specifics |

**The architectural moves that satisfy most of them at once:**

- **Scope minimisation.** The cheapest way to comply is to not hold the data. Tokenise cards so PANs never touch your systems (PCI SAQ-A instead of SAQ-D). Keep PII in one small, well-guarded service rather than scattered across twelve.
- **Immutable audit logging.** Append-only, tamper-evident (hash-chained), separately stored, with a defined retention. Nearly every regime requires it, and building it once serves all of them.
- **Crypto-shredding for erasure.** Per-subject encryption keys mean "delete this person" is "destroy this key", which works even in immutable event logs and WORM backups. This is the only practical answer to GDPR erasure in an event-sourced or data-lake architecture.
- **Data classification as a schema-level attribute**, with masking and access control enforced by the platform, not by each service remembering to do it.
- **Region pinning** for residency, decided at the routing layer by the user's home region and enforced so data cannot be written outside it.
- **Evidence automation.** SOC 2 is largely about proving your controls operate. Generating the evidence automatically (access reviews, change logs, scan results) turns an annual fire drill into a background process.

**The framing to use in an interview:** treat compliance as an architectural constraint discovered at design time, not a checklist applied before an audit. Retrofitting data residency, audit trails or erasure into a system that wasn't designed for them is one of the most expensive things an engineering organisation can be asked to do — and it's an entirely avoidable expense.

---

# Part B — Architect-Level Problems

These combine technical design with organisational and business reasoning. For each, the *technical* answer is only half the response.

## 11. Multi-Tenant SaaS Platform

**The question:** design a B2B SaaS platform serving 10,000 tenants ranging from 5-person startups to 50,000-employee enterprises.

**The central decision — isolation model.** Covered in detail in [the security guide](05-reliability-security-cost.md#q16-multi-tenancy-isolation). The architect answer is **tiered**, because it maps directly to pricing:

| Tier | Isolation | Why |
|---|---|---|
| Free / Starter | Shared everything + RLS | Cost per tenant must approach zero |
| Professional | Shared, with per-tenant resource quotas | Noisy neighbour protection they're paying for |
| Enterprise | Dedicated database (or full silo) | They demand it for compliance and will pay for it |

**Say this explicitly:** the isolation model is a pricing decision expressed as architecture. Enterprises pay for isolation, so give them isolation; free users pay nothing, so they get pooled. Designing one model for everyone either bankrupts you on the free tier or loses you enterprise deals.

**The architecture must support tier migration without a code change.** That means a routing layer that maps `tenant_id → connection target` from day one, even when every tenant is in the same database. Retrofitting that later means touching every query.

**Noisy neighbour** — per-tenant rate limits, query timeouts, background job quotas, and per-tenant metrics so you can identify the offender. Without per-tenant observability, "the platform is slow" is undiagnosable.

**Per-tenant customisation** is where SaaS platforms go to die. The disciplined answer: configuration and feature flags, yes; custom code per tenant, never. Once you have a `if (tenantId === 'acme')` branch you have N products, and your release cadence collapses to the slowest tenant's willingness to accept change. Offer extensibility through webhooks and a plugin API instead — a supported extension surface rather than a fork.

**Also cover:** per-tenant metering and billing (usage events → aggregation → invoice, and it must reconcile), tenant provisioning and deprovisioning as an automated workflow, tenant data export (both a GDPR requirement and a sales objection-handler), and schema migrations across 10,000 databases if you went the isolated route — which is the hidden cost of database-per-tenant and worth naming as the reason to keep the pooled tier pooled.

---

## 12. Global E-Commerce at Amazon Scale

**The question:** design a global e-commerce platform: multi-region, hundreds of millions of products, millions of orders/day.

**Where the interest is: inventory consistency across regions.** Selling the last unit twice is a real cost (cancellation, refund, customer trust); refusing to sell available stock is also a real cost (lost revenue). You cannot have strong global consistency on inventory without paying cross-region latency on every add-to-cart.

The practical answer: **partition inventory by fulfilment centre, not globally.** Each warehouse's stock is owned by one region and strongly consistent locally. The customer-facing "in stock" indicator is eventually consistent and deliberately conservative (show "low stock" rather than an exact count), and the *authoritative* check happens at checkout against the specific fulfilment centre. Oversell is then rare and handled by a compensating flow (backorder or cancel with credit) rather than prevented at enormous cost. Say the quiet part: at scale, you *manage* oversell economically instead of eliminating it technically.

**Multi-region shape:** users routed to their nearest region; the catalogue read path fully replicated and CDN-cached (it's read-mostly, so this is cheap); orders written to the user's home region; the ledger and payments strongly consistent within a region; cross-region replication async for analytics and continuity.

**Other things to cover:** catalogue search as a separate concern (Elasticsearch fed by CDC, with per-region relevance and language handling); the checkout saga (reserve inventory → authorise payment → confirm order → schedule fulfilment, with compensations at each step); pricing and promotions as a rules engine (see the [voucher problem](06-hld-practice-problems.md#15-voucher--coupon-system-daraz-context)); and the recommendation system as an offline-trained, online-served component that must degrade to a static bestseller list when it fails.

**The organisational half:** a platform of this size is dozens of stream-aligned teams. Draw the service boundaries along bounded contexts (catalogue, cart, checkout, payments, fulfilment, returns, search, recommendations) and note that each needs an owning team with on-call. Then mention the coordination mechanism — API contracts with compatibility guarantees and an event schema registry — because with dozens of teams, contract governance is what prevents the whole thing seizing up.

---

## 13. Real-Time Bidding (Ad-Tech)

**The question:** design a real-time bidding system. **The constraint that defines everything: p99 < 100 ms end to end, and typically < 50 ms for your bidder's response**, at 1M+ queries per second.

That budget makes most normal architecture illegal:
- **No database calls on the request path.** All the data you need — user segments, campaign budgets, targeting rules — must be in local memory on the bidder, refreshed asynchronously.
- **No cross-region calls.** Bidders must be co-located with the exchange, in every region it operates.
- **No garbage-collection pauses that exceed the budget.** This is where language choice becomes architectural: a 200 ms GC pause is an automatic timeout. Tuned JVM, Go, Rust, or C++ — and this is one of the few honest cases for saying "Node.js is not the right tool for this component."
- **Timeouts are absolute.** If you don't respond in time you simply lose the auction; there's no retry. That means **shedding load is better than queuing** — a slow response is worth exactly zero, so under overload you should return "no bid" instantly rather than compute a good bid too late.

**Architecture:**
```
Exchange ──bid request──▶ Bidder fleet (stateless, all data in local RAM)
                              │  in-memory: user segments, campaign rules,
                              │             budget allowances, model weights
                              ▼
                          bid response (< 50 ms, or nothing)

Async paths (never on the request path):
  User profile store → periodic segment snapshot → pushed to bidders
  Budget service → allowance leases pushed to bidders (each bidder holds a slice)
  Win notifications → Kafka → spend accounting, model retraining, reporting
```

**Budget pacing is the interesting distributed problem.** A campaign has a $10,000 daily budget across 500 bidder instances. Checking a central counter per bid is impossible at 1M QPS. The answer is **lease-based allocation**: each bidder is granted a slice of the budget to spend locally, reports consumption periodically, and requests more. Overspend is bounded by the lease size, and you accept a small overspend as the cost of the latency budget — then reconcile and compensate afterwards. This is the same pattern as distributed rate limiting, and pointing out that it's the same pattern is a good signal.

**Also mention:** fraud detection must be mostly offline (real-time can only afford cheap heuristics — known-bad IP lists in a Bloom filter); the data pipeline behind this is enormous (billions of events/day into a columnar store); and reporting is a separate OLAP system, never queried from the serving path.

---

## 14. Monolith → Microservices Migration

The strangler fig mechanics are in [the patterns guide](02-architecture-patterns.md#q14-strangler-fig--migrating-a-monolith). The **architect-level answer adds the parts that determine whether the migration actually finishes.**

**Start by challenging the premise.** "What problem is the migration solving?" If the answer is "microservices are best practice", the correct architect response is to push back. If it's "four teams can't ship independently and our release train is a 3-week cycle", now you have a measurable goal and you can propose the minimum change that achieves it — which might be a modular monolith with independent deployment of two extracted services, not a twelve-service estate.

**Define success in metrics before starting:** lead time for change, deployment frequency, change failure rate, and the specific coordination cost you're removing. Without these, the migration has no completion criterion and will run forever.

**The sequencing that works:**
1. Put the routing seam in front of the monolith (low risk, immediately useful).
2. Improve the monolith's internal modularity *first* — you cannot cleanly extract from a big ball of mud, and this work is valuable even if the migration is cancelled. This is the step teams skip and later regret.
3. Extract capabilities in order of (business value × boundary clarity) ÷ coupling. Start with something peripheral and valuable: notifications, search, reporting, file processing.
4. Behaviour first, then data. Shadow traffic before switching.
5. Delete the old path on a committed date.

**The organisational plan, which is half the answer:**
- **Team structure moves with the architecture** (Inverse Conway). Extracting a service without giving it an owning team produces a service nobody maintains.
- **Ship business value continuously.** A migration with no user-visible output for six months will be cancelled when priorities shift — and it will be cancelled *halfway*, leaving you with the complexity of both architectures and the benefits of neither. That half-migrated state is the single worst outcome, and naming it as the risk you're managing is a strong answer.
- **Platform prerequisites** must land before the second service, not after the eighth: CI/CD, centralised logging, distributed tracing, service discovery, on-call rotation and runbooks. Otherwise every new service degrades operability.
- **Budget for the plateau.** Productivity dips during migration; say so up front so it isn't read as failure when it happens.

**Data decomposition** is the genuinely hard part and deserves its own paragraph: foreign keys across the new boundary become application-level joins or denormalised copies maintained by events; shared reference tables need an owner; and reporting queries that joined across the whole schema need a new home (a warehouse fed by CDC). Teams consistently underestimate this by a factor of three.

---

## 15. IoT Platform (Millions of Devices)

**The question:** design a platform ingesting telemetry from 10M devices — smart meters, vehicle trackers, sensors.

**Protocol choice is the first architectural decision**, and it's driven by the constrained device, not by your preferences:

| Protocol | Fit |
|---|---|
| **MQTT** | The default. Tiny header, pub/sub, QoS levels, last-will-and-testament for disconnect detection, works over unreliable links |
| CoAP | UDP-based, for extremely constrained devices and lossy networks |
| HTTP | Simple, but heavy — a TLS handshake per reading destroys battery life on a cellular device |
| AMQP | Rich, but too heavy for constrained hardware |

**MQTT** is the answer, with a broker fleet (EMQX, HiveMQ, or AWS IoT Core) handling millions of persistent connections. The **last-will-and-testament** feature is worth calling out — the broker publishes a configured message when a device disconnects uncleanly, which gives you free failure detection for millions of devices without polling.

**The ingestion shape:**
```
Devices ──MQTT/TLS──▶ Broker fleet ──▶ Kafka ──┬─▶ Stream processing (alerts, rules)
  (mTLS device certs)                          ├─▶ Time-series store (hot, 30 days)
                                               └─▶ Object storage (Parquet, cold, years)
```

**Device identity and provisioning at scale** is the security problem: 10M devices each need a unique credential. Shared secrets are unacceptable (one extracted key compromises the fleet). Use per-device X.509 certificates provisioned at manufacture, with a revocation path, and support **rotation** — devices deployed for 10 years will outlive any certificate. Also plan for **secure OTA firmware updates** with signed images and staged rollout, because an un-updatable fleet of 10M devices is a permanent liability.

**Data volume and tiering:** 10M devices × 1 reading/minute = 167K writes/sec, ~14B readings/day. At ~50 bytes each that's ~700 GB/day raw. The economics demand tiering: hot (last 30 days, queryable at full resolution), warm (downsampled to 5-minute aggregates), cold (raw in Parquet on object storage). Downsampling is not optional at this volume — and most queries only ever need the aggregates.

**Edge computing** is the cost lever: filter and aggregate on the device or a local gateway so you transmit 1/100th of the data. For a device on a metered cellular connection this is also the difference between a viable and unviable product. State it as a business constraint, not just an optimisation.

**Also:** out-of-order and late data is the norm (a device buffers while offline for days, then dumps) — so ingestion must be event-time based with generous lateness; command-and-control (cloud → device) needs a durable per-device queue since the device may be asleep; and a digital-twin/shadow state so the application can read a device's last-known state without waiting for it to wake up.

---

## 16. Healthcare Data Platform

**The question:** design a platform handling patient health records across multiple hospitals.

**What makes this different from any other data platform:**

- **HIPAA / local equivalents govern everything.** Encryption at rest and in transit, an access audit trail for every read (not just writes — *who looked at this record* is the regulated question), minimum-necessary access, and Business Associate Agreements with every vendor that touches PHI. That last one constrains your cloud and SaaS choices before you draw a single box.
- **Interoperability is a standard, not a choice.** HL7 v2 (legacy, ubiquitous, painful) and **FHIR** (modern, REST + JSON, resource-oriented) are the languages of the domain. You don't design your own patient schema — you conform to FHIR resources (`Patient`, `Observation`, `Encounter`, `Medication`) and translate legacy HL7 at the boundary with an anti-corruption layer. Naming FHIR shows you know the domain has settled standards.
- **Consent management is a first-class subsystem**, not a flag. Patients consent to specific data being shared with specific parties for specific purposes, and consent is revocable. Every data access must be evaluated against current consent, and the evaluation must be logged. This is a policy-engine problem (OPA/Cedar-style) sitting in front of every read.
- **Patient identity resolution** — the same person appears in three hospitals' systems with different IDs, slightly different names, and a transposed date of birth. A master patient index with probabilistic matching, plus a human review queue for ambiguous matches, because a false merge (two people's records combined) is a patient-safety incident, not a data-quality issue.
- **Availability is a safety property.** An emergency department cannot wait for your system to recover. This drives "break-glass" emergency access (elevated access with mandatory justification and heightened audit), local caching at the hospital so a network outage doesn't block care, and read availability prioritised over write consistency for clinical data.

**Architecture note:** separate the **clinical data store** (FHIR-shaped, strongly audited, strict access control) from the **analytics/research store** (de-identified, aggregated, separate access regime). De-identification is its own discipline — removing names is insufficient, since re-identification from combinations of quasi-identifiers (postcode + birthdate + gender) is well documented. Use recognised standards (HIPAA Safe Harbor or expert determination) and mention k-anonymity or differential privacy for research datasets.

---

## 17. Internal Developer Platform

**The question:** design an internal platform for 200 engineers across 25 teams.

**Start with the problem, not the tooling.** The symptoms that justify a platform: every team builds its own CI pipeline slightly differently; a new service takes two weeks to get to production; there's no consistent observability so incidents are slow to diagnose; security requirements are re-implemented per team and inconsistently; and senior engineers spend their time on infrastructure rather than product.

**What the platform provides:**

| Capability | What "good" looks like |
|---|---|
| **Service scaffolding** | `create-service` produces a repo with framework, CI, Dockerfile, Helm chart, observability, and a working deploy — in minutes |
| **CI/CD** | A standard pipeline with build, test, scan, deploy, and progressive rollout; teams configure, don't build |
| **Environments** | Self-service ephemeral environments per PR, torn down automatically |
| **Observability** | Logs, metrics, traces wired up by default; a standard dashboard per service |
| **Secrets & config** | Integrated secret management with no secrets in Git |
| **Infrastructure** | Databases, queues, caches provisioned declaratively with sane defaults and guardrails |
| **Service catalogue** | Who owns what, dependencies, SLOs, runbooks, on-call (Backstage or equivalent) |

**The principles that determine whether it succeeds:**

- **Golden paths, not gates.** The supported path is the easiest path; leaving it is allowed but you own what you gave up. Enforcement produces shadow infrastructure.
- **Self-service, not tickets.** If a team must file a request and wait, you've built a bottleneck with a nicer UI. The measure is: can a team ship a new service to production without talking to the platform team?
- **The platform is a product.** It needs a roadmap, user research, docs, support, and adoption metrics. Treat internal engineers as customers who could choose not to use it — because they can.
- **Reduce cognitive load** (Team Topologies) — the explicit purpose is that stream-aligned teams don't have to know Kubernetes.

**Measure it:** time from repo creation to production, deployment frequency, lead time for change, change failure rate, and platform adoption percentage. And a satisfaction survey, because a platform everyone resents will be routed around.

**The trap to name:** building the platform for the platform team's idea of correctness rather than for the teams' actual workflows produces something technically impressive and unused. Start by embedding with two teams and solving their real problems, then generalise. A platform built from first principles without users is a research project.

---

## 18. Multi-Cloud Strategy

**The question:** should we go multi-cloud, and how?

**The architect answer usually starts with "probably not, and here's why."** That contrarian-but-justified position is exactly what the question is testing.

**The reasons people give, and the honest assessment:**

| Stated reason | Reality |
|---|---|
| "Avoid vendor lock-in" | You end up locked into the lowest common denominator of both, which is a worse platform. The abstraction layer *is* the lock-in |
| "Better availability" | A full cloud-region failure is rarer than the outages your own multi-cloud complexity will cause. Multi-*region* on one cloud gets you most of the benefit at a fraction of the cost |
| "Negotiating leverage" | Real, but usually achievable by being *credibly able* to move one workload, not by actually running everything twice |
| "Regulatory / customer requirement" | **Legitimate.** Some governments and enterprises mandate it. This is the strongest reason |
| "Acquisition brought another cloud" | **Legitimate and involuntary.** Now it's a migration or a coexistence problem |

**If the answer is genuinely yes, the patterns:**

1. **Multi-cloud by workload** (best) — run each system entirely on one cloud, chosen for fit. Analytics on GCP for BigQuery, the main platform on AWS. No abstraction layer, no lowest common denominator, and you keep real leverage because you demonstrably operate on both.
2. **Portable core, cloud-native edges** — containerise on Kubernetes and use open standards (Postgres, Kafka, S3-compatible storage) for the core, while allowing cloud-specific managed services where the value is high and the exit is cheap. A pragmatic middle.
3. **Full abstraction** (avoid) — an internal API over both clouds' primitives. You've built and now maintain a cloud provider with a team of five, and you get none of either cloud's differentiated services.
4. **Active-active across clouds** (rare, extremely expensive) — the data layer is the killer: cross-cloud replication is slow, expensive in egress, and consistency is genuinely hard.

**The costs to quantify** — this is where the architect answer gets concrete: two sets of expertise to hire and retain, two security models and two IAM systems to reason about, cross-cloud egress charges (the largest hidden cost), no volume discounts on either provider, doubled tooling and monitoring integration, and roughly doubled incident surface. Then state what you'd do instead: multi-region on one cloud, with a documented and *tested* exit plan (infrastructure as code, portable data formats, no proprietary data stores in the critical path) that gives you the leverage without the ongoing tax.

**The one-line summary to have ready:** *"Multi-cloud is usually a solution looking for a problem. Multi-region is what people actually need. I'd only go multi-cloud when a customer or regulator requires it, or when a specific workload is dramatically better served elsewhere — and even then, per-workload, not with an abstraction layer."*

---

# Part C — Common Architecture Blueprints

Part B asks open-ended questions. Part C is the other half of the interview reality: **most "design X" prompts resolve to one of a dozen recurring architectural shapes**, or to a composition of two of them. An interviewer asking you to design a food-delivery backend, a loan origination system and a warehouse management system is asking you to produce the same three blueprints in different costumes.

Knowing the blueprints does two things. It gets you to a credible skeleton in five minutes so you can spend the remaining forty on the interesting parts, and it lets you *name* what you're doing — "this is event-driven order processing with an outbox and idempotent consumers" — which is how an architect talks.

The *theory* of each pattern lives in [the patterns guide](02-architecture-patterns.md); this part is the applied walkthrough: the use cases that call for it, the design produced step by step, the mechanics that are easy to get wrong, and the point at which the blueprint stops being the right answer.

---

## 19. The Blueprint Method

Every walkthrough below follows the same seven steps. Use them in this order, out loud, and time-box them — the single most common failure in a design interview is spending twenty-five minutes on requirements and drawing boxes at minute forty.

| # | Step | Output | 45-min budget |
|---|---|---|---|
| 1 | **Scope & clarify** | Functional list, top 3 non-functionals, explicit out-of-scope | 5 min |
| 2 | **Estimate** | QPS, storage/day, bandwidth, read:write ratio | 3 min |
| 3 | **API contract** | The 4–6 calls that matter, with idempotency semantics | 4 min |
| 4 | **Data model & store choice** | Entities, access patterns, partition key, justified store | 6 min |
| 5 | **High-level architecture** | The box diagram + request flow for the critical path | 7 min |
| 6 | **Deep dive** | The 2–3 genuinely hard parts, in depth | 15 min |
| 7 | **Failure, scale & evolution** | What breaks first, what you'd measure, what changes at 10× | 5 min |

**The three questions that shape every blueprint** — ask them at step 1 and the architecture largely falls out:

1. **What is the read:write ratio?** 1000:1 pushes you to [Blueprint 27](#27-read-heavy-content-delivery) (caching layers, replicas, denormalised read models). 1:1 with high absolute volume pushes you to [Blueprint 28](#28-write-heavy-time-series-ingestion) (partitioning, LSM stores, batching).
2. **Does the write need an immediate, authoritative answer?** Yes → synchronous request/response with a transaction. No → [Blueprint 22](#22-event-driven-order-processing), and you've just bought yourself availability and decoupling at the price of eventual consistency.
3. **Does one business operation span multiple owners of data?** Yes → [Blueprint 23](#23-saga-orchestrated-distributed-transaction). There is no distributed ACID transaction waiting to save you.

**Two habits that carry through all of them.** State your consistency requirement per operation, not per system — "inventory decrement is strongly consistent, the product page's stock badge is eventually consistent with a 30-second lag" is an architect sentence, "the system is eventually consistent" is not. And name what you are deliberately *not* building: no blueprint below needs to be implemented in full on day one, and saying "phase one is the modular monolith with the outbox already in place; we split when the second team arrives" is almost always the correct architectural answer.

---

## 20. Layered / Hexagonal Business Service

**Asked as:** "Design the order service." · "How would you structure this codebase?" · "Where does business logic live?" · Any LLD-flavoured question wearing HLD clothes.

**This is the default shape of a single service, and roughly 80% of the services you will ever build are this.** The other blueprints in Part C are usually *compositions of several of these* plus infrastructure between them. Get it right and everything else becomes cheaper; get it wrong and no amount of Kafka rescues you.

**Real use cases:** an order service, a billing service, a KYC service, a catalogue service — anything where the value is business rules over persisted state rather than raw throughput.

### Requirements that drive the shape

- Business rules must be testable without a database, a broker or a network.
- The persistence choice, the transport (REST today, gRPC or a queue consumer tomorrow) and the third-party vendor must all be replaceable without touching the rules.
- One business operation = one transaction boundary, and that boundary must be obvious in the code.

### The design

The pattern theory is in [the patterns guide](02-architecture-patterns.md#q4-layered-hexagonal--clean-architecture). Applied, it produces four rings with **dependencies pointing strictly inward**:

```
        ┌──────────────── Adapters (driving) ────────────────┐
        │  HTTP controller · gRPC handler · Kafka consumer   │
        │  CLI command · scheduled job                       │
        └───────────────────────┬────────────────────────────┘
                                ▼  calls use cases
        ┌──────────── Application (use cases) ───────────────┐
        │  PlaceOrder · CancelOrder · ApplyVoucher           │
        │  orchestration, transaction boundary, authorisation│
        └───────────────────────┬────────────────────────────┘
                                ▼  uses domain + ports
        ┌──────────────────── Domain ────────────────────────┐
        │  Order (aggregate) · Money (value object)          │
        │  PricingPolicy (domain service) · OrderPlaced      │
        │  ZERO framework/IO imports                         │
        └───────────────────────┬────────────────────────────┘
                                ▼  interfaces only (ports)
        ┌──────────────── Adapters (driven) ─────────────────┐
        │  PostgresOrderRepo · KafkaEventPublisher           │
        │  StripePaymentGateway · S3InvoiceStore             │
        └────────────────────────────────────────────────────┘
```

**Step 1 — model the domain first, storage last.** The aggregate ([DDD guide](04-ddd-and-data-architecture.md#q6-designing-aggregate-boundaries)) is the consistency boundary: everything inside it is updated in one transaction, everything outside is reached by ID and updated by an event. `Order` contains `OrderLine`s because a line has no life without its order; it references `customerId` rather than containing `Customer`.

**Step 2 — define ports as the domain's needs, not the vendor's API.** The port is `PaymentGateway.authorise(orderId, Money): AuthorisationResult` — not `StripeClient.createPaymentIntent(...)`. A port shaped like the vendor is not a port, it's a leak, and it guarantees the second vendor integration is a rewrite.

**Step 3 — one use case, one transaction, one aggregate.**

```ts
class PlaceOrder {
  constructor(
    private orders: OrderRepository,      // port
    private pricing: PricingPolicy,       // domain service
    private outbox: OutboxWriter,         // port
    private tx: TransactionManager,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<OrderId> {
    return this.tx.run(async () => {                    // ← the only transaction boundary
      const order = Order.place(cmd.customerId, cmd.lines, this.pricing);
      await this.orders.save(order);
      await this.outbox.append(order.pullDomainEvents()); // same tx — see Blueprint 22
      return order.id;
    });
  }
}
```

Three things are deliberate here. The transaction is opened by the *application* layer, not by a repository and not by a decorator on the controller — so a reader can see where atomicity begins and ends. The domain produced events but did not publish them. And there is no `if (process.env...)`, no HTTP status code, and no SQL anywhere in sight.

**Step 4 — keep the model rich.** If `Order` is a bag of public setters and all the rules live in `OrderService`, you have an *anaemic domain model*: the layering is cosmetic and the rules will duplicate across use cases. `order.cancel()` should itself refuse to cancel a shipped order.

**Step 5 — test at the right rings.** Domain and use cases: pure unit tests with in-memory port fakes, milliseconds, no Docker. Adapters: integration tests against a real Postgres/broker in a container. One or two end-to-end tests for the critical path. The ratio falls out of the architecture rather than being imposed on it.

### Trade-offs and when *not* to use it

| Situation | Verdict |
|---|---|
| Rich business rules, long-lived service, more than one adapter | Full hexagonal. The indirection pays back within months |
| CRUD with validation and no real invariants | **Skip it.** Controller → repository is honest; wrapping four layers around `UPDATE users SET name=$1` is ceremony |
| Prototype whose lifetime is a demo | Skip it, and write the ADR saying you did so deliberately |

**What the interviewer is probing:** where validation lives (syntactic at the edge, invariants in the domain), where the transaction starts, how you'd swap Postgres for DynamoDB (only the driven adapter changes — and if that's untrue, your repository port is leaking query semantics), and whether you can name the anaemic-domain-model smell before they do.

---

## 21. Microservices + API Gateway + BFF

**Asked as:** "Design the API layer for a web + mobile + partner-facing product." · "We have one monolith and four teams — what now?" · "Where do you put authentication?"

**Real use cases:** any consumer product with more than one client type (Daraz web + Android + iOS + seller portal), any platform exposing partner APIs, any company past ~30 engineers where the release train has become the bottleneck.

### Start by refusing to over-split

The first answer is a boundary count, and it should be small: **one service per team that actually exists**, aligned to a bounded context, each owning its own data. Eight services and four teams gives you eight pipelines, four teams' worth of coordination, and a [distributed monolith](02-architecture-patterns.md#q1-monolith-vs-microservices-vs-soa). Say this before drawing anything.

### The design

```
   Web SPA        iOS/Android        Partner systems
      │                │                    │
      ▼                ▼                    ▼
 ┌─────────┐     ┌─────────┐        ┌──────────────┐
 │ Web BFF │     │Mobile BFF│       │ Public API   │   ← client-specific aggregation
 └────┬────┘     └────┬────┘        └──────┬───────┘
      └───────────────┼────────────────────┘
                      ▼
         ┌────────────────────────────┐
         │        API Gateway         │  TLS termination · authN (token → identity)
         │                            │  rate limiting · routing · request IDs
         └─────────────┬──────────────┘  WAF · payload limits
                       ▼  mTLS + propagated identity
   ┌──────────┬──────────────┬──────────────┬──────────────┐
   │ Catalogue│    Orders    │   Payments   │ Notifications│
   │  + own DB│   + own DB   │   + own DB   │   + own DB   │
   └──────────┴──────┬───────┴──────┬───────┴──────────────┘
                     └──── events ──┴──▶ Kafka ──▶ (async consumers)
```

**Step 1 — split gateway from BFF, and keep the split honest.** The gateway is *shared cross-cutting infrastructure* and must stay generic: TLS, authentication, rate limiting, routing, request IDs, WAF, payload size limits. The BFF is *client-specific product code*, owned by the team that owns that client, and it is where aggregation lives — the mobile home screen needs one call returning a trimmed composite; the web dashboard needs a different shape. Putting client-specific aggregation in the gateway turns it into a god-object owned by nobody and touched by everybody, which is the classic ESB failure repeated.

**Step 2 — authenticate once, authorise everywhere.** The gateway validates the token and converts it into an internal identity (a signed internal JWT or headers over mTLS). Downstream services still authorise — the gateway proves *who*, the service decides *may they*. A service that trusts an unauthenticated header because "only the gateway can reach us" is one network misconfiguration from total compromise ([zero-trust](05-reliability-security-cost.md#q10-zero-trust-architecture)).

**Step 3 — data ownership is absolute.** One service writes a table; everyone else reads through its API or from its events. The moment two services share a database, you have coupled their deploys and their schema migrations, and you have a monolith with network latency added for flavour.

**Step 4 — make synchronous calls the exception.** Every synchronous hop multiplies availability (four 99.9% dependencies in series ≈ 99.6%) and adds its latency to your p99. Reserve them for reads that need to be current; do writes and notifications through events.

**Step 5 — govern the contracts.** Versioned, backward-compatible APIs, consumer-driven contract tests in CI, a schema registry for events, and a deprecation policy with a real sunset date. With more than five services this is the difference between an architecture and a deadlock.

### Failure modes

| Failure mode | Symptom | Fix |
|---|---|---|
| Gateway becomes a god-object | Every feature needs a gateway change; a gateway team gates all releases | Push client logic to BFFs; keep the gateway config-driven |
| Chatty BFF | One screen fans out to 14 services; p99 is the slowest of 14 | Aggregate, parallelise, cache, or add a read model built from events |
| Distributed monolith | Services must deploy together; a change touches three repos | Boundaries are wrong — re-cut along bounded contexts, or merge them back |
| Gateway is a SPOF | Total outage on gateway failure | Multiple stateless instances, multi-AZ, health checks; it must hold no session state |
| Cascading failure | One slow service drags down everything | Timeouts, [circuit breakers, bulkheads](02-architecture-patterns.md#q13-resilience-patterns), and a degraded response instead of a 500 |

**What the interviewer is probing:** whether you distinguish gateway from BFF and can say *why*; whether authorisation survives a bypassed gateway; how you avoid the distributed monolith; and whether you connected the service count to the team count without being prompted.

---

## 22. Event-Driven Order Processing

**Asked as:** "Design order processing for an e-commerce platform." · "How do you notify five systems when something happens?" · "How do you avoid losing an event when the database commits but the broker call fails?"

**This is the single most frequently asked architecture in backend interviews**, because it is the shape of nearly every real business workflow: something happens, several independent systems must react, and none of them should be able to fail the original action.

**Real use cases:** order placed → inventory, notification, analytics, fraud, loyalty. Payment settled → ledger, receipt, accounting. User signed up → welcome email, CRM sync, provisioning. Ride completed → fare, driver payout, rating prompt.

### Requirements that drive it

- Placing the order must succeed even if notifications, analytics or loyalty are down. Availability must not be the product of five services' availabilities.
- Adding a sixth consumer must not require a change to the orders service.
- No event may be lost; duplicates are acceptable **if consumers are idempotent**.
- Events for one order must be processed in order relative to each other.

### The design

```
 Client ──▶ Orders service ─┬─▶ orders table      ┐
   (sync, authoritative)    └─▶ outbox table      ┘ ONE transaction
                                    │
                       CDC (Debezium) or polling relay
                                    ▼
                    ┌────────────  Kafka  ────────────┐
                    │ topic: orders.v1 (key=order_id) │
                    └──┬────────┬─────────┬───────────┘
                       │        │         │  independent consumer groups
                       ▼        ▼         ▼
                  Inventory  Notify   Analytics ──▶ warehouse
                       │
                  retry topic ──▶ DLQ ──▶ alert + replay tool
```

**Step 1 — solve the dual-write problem with the outbox.** Writing to the database and then publishing to Kafka is two writes with no shared transaction: a crash between them either loses the event or (if you publish first) announces something that never happened. Instead, write the event into an `outbox` table **in the same transaction as the state change**, and let a separate relay publish it. Theory in [the patterns guide](02-architecture-patterns.md#q10-outbox-pattern--dual-write); the applied schema:

```sql
CREATE TABLE outbox (
  id             BIGSERIAL PRIMARY KEY,
  aggregate_type TEXT        NOT NULL,          -- 'order'
  aggregate_id   TEXT        NOT NULL,          -- partition key downstream
  event_type     TEXT        NOT NULL,          -- 'OrderPlaced'
  schema_version INT         NOT NULL DEFAULT 1,
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at   TIMESTAMPTZ                    -- NULL = pending (polling relay only)
);
CREATE INDEX ON outbox (id) WHERE published_at IS NULL;   -- partial index stays tiny
```

CDC (Debezium tailing the WAL) is the better relay — no polling load, ordered by commit, low latency. A polling relay (`SELECT ... WHERE published_at IS NULL ORDER BY id LIMIT 500 FOR UPDATE SKIP LOCKED`) is the pragmatic version when you can't run Debezium, and `SKIP LOCKED` is what makes it safe to run several relay instances.

**Step 2 — design the topic and the key deliberately.** Key by `order_id`: Kafka guarantees ordering within a partition, so all events for one order are ordered relative to each other, while different orders process in parallel. Partition count sets your maximum consumer parallelism and is painful to change later (it rehashes keys) — size it for 2–3× today's peak. One topic per aggregate type, not one per consumer; consumers subscribe with their own consumer group and can be added freely.

**Step 3 — make every consumer idempotent, because delivery is at-least-once.** Rebalances, retries and relay restarts all produce duplicates. Two mechanisms, and you should name which you're using:

```ts
// (a) Dedupe table — general purpose, works for any side effect
async function handle(event: OrderPlaced) {
  await tx.run(async () => {
    const fresh = await db.query(
      `INSERT INTO processed_events (consumer, event_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING 1`, ['inventory', event.id]);
    if (fresh.rowCount === 0) return;            // already processed — drop
    await reserveStock(event.orderId, event.lines);
  });
}
// (b) Natural idempotency — preferred where possible
//     "set status = SHIPPED" is idempotent; "increment shipped_count" is not.
```

The dedupe table needs a retention job (keep 7–30 days, matched to your maximum replay window) or it becomes your largest table.

**Step 4 — handle poison messages explicitly.** In-process retry with exponential backoff for transient failures, then a **retry topic** with a delay, then a **dead-letter queue** after N attempts. Blocking the partition forever on one bad message stalls every other order behind it. The DLQ needs three things people forget: an alert on depth, enough context to diagnose (original topic, offset, error, stack), and a *tested* replay tool.

**Step 5 — version events for independent deployment.** Additive-only changes (new optional fields) within a major version; a new topic (`orders.v2`) for breaking changes, dual-published until consumers migrate. Register schemas (Avro/Protobuf/JSON Schema) and enforce compatibility in CI, or a producer will break three consumers on a Friday.

**Step 6 — decide event fatness.** Thin events (`{orderId, status}`) keep coupling low but force consumers to call back, re-coupling them synchronously and hammering the producer. Fat events carry the data consumers need but leak your model and grow stale. The usual answer: **carry the fields consumers demonstrably need, plus an ID for the rest**, and treat the event payload as a published contract designed for consumers rather than a dump of your internal entity.

### Failure modes

| Failure mode | Consequence | Mitigation |
|---|---|---|
| Dual write without outbox | Silent, unrecoverable event loss | The outbox. This is the point of the blueprint |
| Non-idempotent consumer | Double charge, double stock decrement | Dedupe table or naturally idempotent operations |
| Consumer lag grows unbounded | Downstream data hours stale, disk fills | Alert on lag; scale consumers up to partition count; then add partitions |
| Poison message | Partition stalls | Retry topic + DLQ + replay tool |
| Consumers assume global ordering | Subtle wrong state | Ordering is per key only. Design consumers to tolerate any order across keys |
| Retention expires before recovery | Cannot replay after a bad deploy | Set retention ≥ your realistic recovery window (7 days is a common floor) |

**When *not* to use it:** when the caller needs an authoritative answer now (an authorisation decision, a balance check), when the workload is a simple request/response, and when the team has no operational capacity for a broker — a `SELECT ... FOR UPDATE SKIP LOCKED` job table in Postgres serves surprisingly large systems and is a perfectly respectable answer at moderate scale. Saying that out loud reads as experience, not as lack of ambition.

**What the interviewer is probing:** do you reach for the outbox unprompted; can you explain at-least-once and its consequences; what's your DLQ story; and do you know that Kafka's ordering guarantee is per-partition rather than per-topic.

---

## 23. Saga-Orchestrated Distributed Transaction

**Asked as:** "Design a travel booking system (flight + hotel + car)." · "How do you keep data consistent across services without 2PC?" · "What happens if the payment succeeds but the inventory reservation fails?"

**Real use cases:** travel booking, order fulfilment (reserve stock → charge → ship), loan disbursement (approve → sign → disburse → schedule repayments), account opening, subscription upgrade with proration, food delivery (accept → assign rider → charge → deliver).

### The premise you must state first

There is no distributed ACID transaction available to you. Two-phase commit exists, but it holds locks across services for the duration of the slowest participant, blocks indefinitely if the coordinator dies, and is unavailable across HTTP APIs and most cloud managed services ([distributed transactions](03-distributed-systems.md#q14-distributed-transactions)). So: **the business transaction becomes a sequence of local transactions, each with a compensating action that semantically undoes it.** Compensation is not rollback — you cannot un-send an email or un-charge a card without leaving a trace; you send an apology and issue a refund.

### Choreography vs orchestration

| | Choreography | Orchestration |
|---|---|---|
| How | Each service reacts to events and emits its own | A coordinator tells each service what to do next |
| Coupling | Low pairwise, but the *flow* exists nowhere | Coordinator knows all participants |
| Visibility | "Where is booking 42?" requires log archaeology | One row shows the exact state |
| Testing | Hard — the flow is emergent | The coordinator is a testable state machine |
| Best for | 2–3 steps, simple, no compensation | 4+ steps, real compensation, timeouts, human steps |

**For anything with real money or four or more steps, orchestrate.** The decisive argument is operability: when a booking is stuck at 3 a.m., orchestration answers "which step, how long, what error, retry or compensate?" from one table. Choreography answers it with a distributed-trace expedition. Choreography's low coupling is real but is usually the wrong thing to optimise for here.

### The design — travel booking

```
                    ┌─────────────────────────────┐
   POST /bookings ─▶│   Booking Orchestrator      │  saga_instance + saga_step tables
                    │   (durable state machine)   │  every transition committed
                    └──┬──────┬──────┬──────┬─────┘
        reserve flight │      │      │      │ confirm all
                       ▼      ▼      ▼      ▼
                   Flight  Hotel   Car   Payment
                       ▲      ▲      ▲      ▲
        compensate:  cancel  cancel cancel refund
```

**Step 1 — order the steps by reversibility.** Put the cheap, easily compensated, most-likely-to-fail steps first, and the **irreversible steps last**. Reserve inventory (a cancellable hold) before charging the card; send the confirmation email *after* everything has committed. Sequencing this way means most failures compensate cleanly and the ugly cases become rare.

**Step 2 — persist the saga state before each call and after each reply.**

```sql
CREATE TABLE saga_instance (
  saga_id      UUID PRIMARY KEY,
  saga_type    TEXT NOT NULL,                    -- 'travel_booking'
  state        TEXT NOT NULL,                    -- see state machine below
  payload      JSONB NOT NULL,                   -- booking request + accumulated IDs
  attempt      INT  NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE saga_step (
  saga_id UUID, step TEXT, status TEXT,          -- PENDING|DONE|FAILED|COMPENSATED
  request_id UUID,                               -- idempotency key sent to participant
  response JSONB, error TEXT,
  PRIMARY KEY (saga_id, step)
);
```

A saga that lives only in memory is not a saga — it's a function call that loses your customer's money when the pod restarts. Durability of the *state machine* is the whole point.

**Step 3 — define the state machine explicitly.**

| State | On success → | On failure → |
|---|---|---|
| `FLIGHT_PENDING` | `HOTEL_PENDING` | `FAILED` (nothing to undo) |
| `HOTEL_PENDING` | `CAR_PENDING` | `COMPENSATING_FLIGHT` |
| `CAR_PENDING` | `PAYMENT_PENDING` | `COMPENSATING_HOTEL` |
| `PAYMENT_PENDING` | `CONFIRMED` | `COMPENSATING_CAR` |
| `COMPENSATING_*` | previous compensation | `COMPENSATION_FAILED` → **human queue** |

**Step 4 — make every participant call idempotent, in both directions.** Send a `request_id` (the saga step's ID) with every command; the participant stores it and returns the original result on a repeat. Compensations need this even more than forward actions: a retried refund without idempotency refunds twice. And compensation must be **retried forever with backoff**, because "we took the money and failed to give it back" is not an acceptable terminal state — after N attempts it goes to a human queue with an alert, never silently to `FAILED`.

**Step 5 — handle timeouts as first-class outcomes.** A participant that doesn't reply is neither success nor failure. Give each step a deadline; on expiry, *query* the participant for the status of that `request_id` before deciding — compensating a step that actually succeeded creates the orphaned-reservation problem in reverse.

**Step 6 — accept and manage the isolation anomaly.** Sagas have no isolation: between step 2 and step 4 the system is in a state no ACID transaction would ever expose (flight held, hotel held, unpaid). The standard countermeasures:

| Countermeasure | How |
|---|---|
| **Semantic lock** | Mark the record `PENDING`; other operations refuse to touch a pending record |
| **Commutative updates** | Design updates so order doesn't matter (`credit`/`debit` rather than `set balance`) |
| **Pessimistic view** | Reorder steps so the risky state is never externally visible |
| **Re-read value** | Re-check the value before overwriting; abort if it changed (optimistic concurrency) |
| **By-value strategy** | Route low-value transactions through the saga, high-value ones through a stricter path |

**Step 7 — expose the operator surface.** A list of in-flight sagas by state and age, an alert on `COMPENSATION_FAILED` and on any saga older than N minutes, and a manual retry/force-compensate action. Most saga incidents are resolved by an operator, not by code.

**Implementation choice:** hand-rolled (tables + a poller, as above) is fine and teaches you the mechanics; **Temporal / AWS Step Functions / Camunda** give you durable execution, retries, timers and versioning for free and are the right call once you have more than two or three sagas — see [Blueprint 29](#29-long-running-workflow-orchestration).

**What the interviewer is probing:** do you say "no 2PC" and mean it; is your saga state durable; are compensations idempotent and retried; what happens when compensation itself fails; and do you know that sagas trade isolation away, not just atomicity.

---

## 24. CQRS + Event Sourcing Ledger

**Asked as:** "Design a banking ledger / wallet." · "We need to know the exact state of an account at any past moment." · "Design a system where the audit trail is a legal requirement."

**Real use cases:** double-entry ledgers (bKash/Nagad wallets, banking cores), trading and order books, insurance policy lifecycle, inventory movements in a warehouse, anything a regulator audits. Also collaborative editing and version-controlled documents, where the history *is* the product.

### Be honest about when this is wrong

**Event sourcing is a specialist tool and the most over-applied pattern in this list.** Its costs are real: eventual consistency in the read path, event schema evolution forever, "delete" becomes cryptographically awkward, and every developer needs to learn a new mental model. Apply it where the **history is the business asset** — a ledger, a regulated audit trail, a domain where "why is the balance this?" is a question someone will actually ask. For a normal CRUD service it is a self-inflicted wound, and saying so before designing it is the strongest possible opening. Note also that **CQRS without event sourcing is common and cheap** (separate read models fed by CDC); the reverse is rare.

### The design

```
Command ──▶ Command handler ──▶ load aggregate by replaying events (+ snapshot)
                                     │  decide → new events
                                     ▼
                            ┌──────────────────┐
                            │   EVENT STORE    │  append-only, the source of truth
                            │  (stream, ver)   │  optimistic concurrency on version
                            └────────┬─────────┘
                                     │ catch-up subscription / CDC
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
      balances (Postgres)    statement view (ES)     analytics (columnar)
        read model               read model             read model
              ▲                      ▲                      ▲
              └──────────── Queries (eventually consistent) ─┘
```

**Step 1 — the event store schema, with the concurrency check that makes it correct.**

```sql
CREATE TABLE events (
  stream_id   TEXT   NOT NULL,          -- 'account-9931'
  version     BIGINT NOT NULL,          -- 1,2,3... per stream, no gaps
  event_type  TEXT   NOT NULL,          -- 'MoneyDeposited'
  payload     JSONB  NOT NULL,
  metadata    JSONB  NOT NULL,          -- causation_id, correlation_id, actor, ip
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  global_seq  BIGSERIAL,                -- total order for projections
  PRIMARY KEY (stream_id, version)      -- ← this IS the optimistic lock
);
```

Appending with `version = expectedVersion + 1` makes a concurrent write fail on the primary key: reload, re-decide, retry. That single constraint is what gives you correctness without locks.

**Step 2 — the aggregate decides, it does not mutate storage.**

```ts
class Account {
  private balance = Money.zero(); private version = 0;

  static rehydrate(events: DomainEvent[]): Account {
    const a = new Account();
    for (const e of events) a.apply(e);            // apply = state transition only
    return a;
  }
  withdraw(amount: Money): DomainEvent[] {          // decide = validate + emit
    if (this.balance.lessThan(amount)) throw new InsufficientFunds();
    return [new MoneyWithdrawn(this.id, amount, this.version + 1)];
  }
  private apply(e: DomainEvent) { /* balance = ...; version = e.version */ }
}
```

Keeping `decide` (may throw, returns events) separate from `apply` (never throws, pure state transition) is what makes replay safe: replaying history must never re-run validation, because the rules may have changed since.

**Step 3 — snapshot so replay stays bounded.** Every N events (500–1000 is typical), persist the aggregate state with its version; load = latest snapshot + events after it. Without snapshots, a hot account with 2M events takes minutes to load. Snapshots are a **cache, never a source of truth** — you must be able to delete them all and rebuild.

**Step 4 — build read models as projections, one per query shape.** A `balances` table for the app, a denormalised statement view for the UI, a columnar copy for analytics. Each projection tracks its position in `global_seq` so it can resume, and each must be **idempotent** so a replay from position zero produces the same result. Being able to *rebuild a projection from scratch* is the operational superpower this architecture buys you: a projection bug is fixed by deploying the fix and replaying, not by a data-repair script.

**Step 5 — make eventual consistency a product decision.** After `POST /withdraw` returns, the balance projection may lag by tens of milliseconds. Choose per screen: return the new state from the command handler for the acting user; use read-your-writes routing; or show a pending indicator. **Never** silently show a stale balance to the person who just moved money — that's a support ticket every time.

**Step 6 — plan event versioning on day one.** Events are immutable and permanent, so v1 events will still be replayed in five years. Techniques, in order of preference: additive optional fields; an **upcaster** that transforms old event shapes to new on read; and, last resort, a stream rewrite (copy to a new stream with transformed events, keep the old one). Weak schemas plus upcasters is the pragmatic combination.

**Step 7 — solve GDPR erasure with crypto-shredding.** You cannot delete from an append-only log, and "we'll rewrite history" defeats the audit trail. Encrypt personal fields with a **per-subject key**; erasure = destroy the key. Events remain, ciphertext becomes unreadable, and the ledger's integrity is preserved. This is the answer regulators accept and the one interviewers are listening for.

### Failure modes

| Failure mode | Mitigation |
|---|---|
| Projection lag under load | Monitor lag per projection; parallelise by partitioning on stream_id; alert before users notice |
| Projection bug produces wrong reads | Rebuild from events — the reason you keep replay working and tested |
| Unbounded stream (a stream that never ends) | Close and roll streams periodically (e.g. per month) or use snapshots aggressively |
| Event store becomes a coupling point | Only the owning context reads raw events; publish *integration* events outward ([DDD guide](04-ddd-and-data-architecture.md#q7-domain-events-vs-integration-events)) |
| Team unfamiliarity | The most common real cause of failure. Budget training, or don't do it |

**What the interviewer is probing:** whether you distinguish CQRS from event sourcing (they are separable); how you handle concurrent writes (version check, not a lock); snapshots; projection rebuild; event versioning; and GDPR. Getting to crypto-shredding unprompted is a strong signal.

---

## 25. Real-Time Streaming Analytics

**Asked as:** "Design real-time fraud detection." · "Build a live dashboard of orders per minute." · "Compute trending topics in the last 5 minutes." · "Design the analytics behind a ride-hailing surge-pricing engine."

**Real use cases:** fraud and risk scoring, live operational dashboards, surge/dynamic pricing, trending and leaderboards, IoT threshold alerting, real-time personalisation, abuse and rate-anomaly detection.

### Requirements that drive it

- Latency from event to visible result: seconds, not hours.
- Events arrive **out of order and late** — mobile clients buffer offline, a device reconnects after two days.
- The computation must be correct after reprocessing: a bug fix must be able to recompute history.
- Volume is high enough that per-event database round-trips are impossible.

### The design

```
Producers ──▶ Kafka ──▶ Flink / Kafka Streams ──┬──▶ Redis (hot aggregates, ms reads)
 (apps,        (raw,      · event-time windows  ├──▶ ClickHouse / Druid (interactive OLAP)
  devices)     replayable) · watermarks         └──▶ Alert topic ──▶ notification service
                          · keyed state + RocksDB
                          · checkpoints to S3
                 │
                 └──▶ Object storage (raw events, Parquet) ──▶ batch reprocessing / ML training
```

**Step 1 — keep the raw log, always.** Every design decision downstream becomes reversible if the raw events are retained in Kafka (days) and object storage (years). This is what makes "we computed it wrong for three weeks" a recoverable event rather than permanent data loss.

**Step 2 — use event time, not processing time.** Windowing on arrival time produces results that change depending on how fast your consumers happened to be running, which makes them unreproducible. Window on the timestamp in the event, and use **watermarks** to decide when a window is complete: a watermark of `max_event_time − 30s` says "I believe I have seen everything up to this point." Then set **allowed lateness** for stragglers (which triggers a window update) and route anything later than that to a **side output** rather than dropping it silently. Details in [the data architecture guide](04-ddd-and-data-architecture.md#q13-stream-processing--windowing).

**Step 3 — pick the window type from the question.**

| Window | Shape | Use for |
|---|---|---|
| **Tumbling** | Fixed, non-overlapping (every 1 min) | "Orders per minute" |
| **Sliding** | Fixed size, overlapping (5 min every 30 s) | "Trending in the last 5 minutes", smooth dashboards |
| **Session** | Gap-based (close after 30 min idle) | User sessions, trip segmentation |
| **Global + trigger** | Unbounded with custom firing | Running totals, budget pacing |

**Step 4 — Lambda or Kappa, and say why.**

| | Lambda | Kappa |
|---|---|---|
| Shape | Batch layer + speed layer + serving merge | One stream engine; reprocess by replaying the log |
| Cost | **Two implementations of the same logic** — the killer flaw | One codebase |
| When | Legacy batch estate you can't remove; heavy ML training paths that are genuinely batch | The modern default when your engine supports replay and exactly-once |

Say **Kappa by default**, with the honest caveat: reprocessing years of history through a stream engine can be slower and costlier than a batch job, so many real platforms run Kappa for serving and keep a batch path for backfills and model training — which is Lambda wearing a better hat. Naming that nuance beats reciting either definition.

**Step 5 — get the delivery semantics right.** Exactly-once *processing* is achievable within the engine via checkpointed state plus transactional sinks (Kafka transactions, or a sink that dedupes on a key). Exactly-once *end-to-end* through arbitrary external systems is not — so make sinks idempotent (upsert by `(window, key)`) and stop promising more than the architecture delivers.

**Step 6 — plan for state.** Keyed state (per-user counters, session windows) is the operator's real memory footprint. At 10M active keys with 1 KB each that's 10 GB per operator instance — hence RocksDB-backed state with incremental checkpoints to object storage. Bound it: TTL on state, and cap cardinality (a runaway key space is the most common way these jobs die).

**Step 7 — serve the results from a store built for the query.** Redis for single-key hot lookups at sub-millisecond latency (a fraud scorer reading a user's rolling counters); ClickHouse or Druid for interactive slice-and-dice over billions of rows. Never let a dashboard query the stream processor.

### Failure modes

| Failure mode | Mitigation |
|---|---|
| Skewed key (one merchant = 40% of traffic) | Two-stage aggregation: salt the key, pre-aggregate, then combine |
| Late data silently dropped | Allowed lateness + side output + a metric on late-event count |
| Checkpoint duration grows | Incremental checkpoints, smaller state, tune interval; alert on checkpoint failures |
| Backpressure from a slow sink | Monitor it — backpressure is the earliest, most reliable signal of a sick job |
| Job restart loses hours | Checkpoints/savepoints; always take a savepoint before deploying a new version |

**What the interviewer is probing:** event time vs processing time (the most reliable discriminator on this topic), watermarks and lateness, how you'd reprocess after a bug, and whether you know where the state lives.

---

## 26. Serverless Event Pipeline

**Asked as:** "Design an image/video upload and processing pipeline." · "Process incoming webhooks from a payment provider." · "Build a document ingestion pipeline." · "Design this without managing servers."

**Real use cases:** user-uploaded media (thumbnails, transcodes, virus scan, EXIF strip), OCR/document extraction, webhook receivers, scheduled ETL, chat-bot and notification fan-out, glue between SaaS systems.

### Why this shape wins here

The workload is **spiky, embarrassingly parallel, and stateless per item**. That is precisely the profile where per-invocation billing and automatic scaling beat a provisioned fleet — you pay nothing between uploads and absorb a 100× spike without a capacity plan.

### The design

```
 Client ──presigned PUT──▶  S3 (uploads/)          ← never proxy the bytes through your API
                              │ ObjectCreated event
                              ▼
                            SQS  ← the buffer that makes this production-grade
                              │
                 ┌────────────┴─────────────┐
                 ▼                          ▼
        Lambda: validate + scan     Lambda: transcode (or Fargate/Batch if > 15 min)
                 │                          │
                 └────────► S3 (derived/) ──┘
                              │
                            Lambda: write metadata (DynamoDB) → publish "MediaReady"
                              │
                            SNS/EventBridge ──▶ notify · index · CDN warm
                              │
                     failures ──▶ DLQ (redrive + alert)
```

**Step 1 — never proxy uploads through your compute.** Issue a **presigned URL** and let the client PUT directly to object storage. This removes bandwidth, memory and timeout limits from your problem entirely, and it's the detail that separates people who have built this from people who have read about it.

**Step 2 — put a queue between the event source and the workers.** Direct S3→Lambda works in a demo and hurts in production: a burst of 50,000 uploads hits your account concurrency limit, throttles, and the retry behaviour is opaque. SQS gives you buffering, controllable batch size, visibility timeout, a redrive policy and a DLQ, and it decouples the arrival rate from the processing rate.

**Step 3 — size the work to the runtime, and know the escape hatch.** Lambda's hard limits (15-minute timeout, 10 GB memory, ~10 GB ephemeral disk) are architectural constraints, not configuration. Thumbnailing fits comfortably. A 90-minute 4K transcode does not — that goes to Fargate, AWS Batch, or MediaConvert, orchestrated by Step Functions. Say where the boundary is and cross it deliberately.

**Step 4 — assume at-least-once and make handlers idempotent.** S3 event notifications and SQS are both at-least-once; the same object *will* occasionally be processed twice. Derive the output key deterministically (`derived/{sha256}/{width}.webp`) so a reprocess overwrites rather than duplicates, and make the metadata write an upsert. Deterministic output keys are the cheapest idempotency mechanism available and should be the default.

**Step 5 — orchestrate multi-step work with a state machine, not by chaining Lambdas.** Lambda-calls-Lambda pipelines have no visibility, no shared retry policy and no way to answer "where did item 4471 stop?" Step Functions (or Temporal) gives you a visual execution history, per-step retries, parallel branches and compensation — for a modest per-transition cost.

**Step 6 — control cost and concurrency deliberately.** Set **reserved concurrency** per function so one runaway pipeline cannot starve the rest of the account, and set a **maximum concurrency** on the SQS trigger to protect a downstream database that cannot take 1,000 simultaneous connections. Uncontrolled Lambda concurrency exhausting a Postgres connection pool is one of the most common serverless incidents; RDS Proxy or a connection-pooling layer is the standard fix.

### The economics, stated plainly

| Profile | Verdict |
|---|---|
| Spiky, low average utilisation, < ~1M invocations/day | Serverless wins clearly — often by an order of magnitude |
| Steady high throughput, > ~30–40% sustained utilisation | Containers become cheaper; the crossover is real and worth computing |
| Latency-critical (p99 < 50 ms, cold starts unacceptable) | Provisioned concurrency, or don't use Lambda ([Blueprint 13's constraints](#13-real-time-bidding-ad-tech) are the extreme case) |
| Long-running or GPU work | Not Lambda. Fargate/Batch/EC2 |

**Other trade-offs to name:** cold starts (mitigated by provisioned concurrency, smaller bundles, and avoiding VPC-attached functions where possible), vendor lock-in (the event wiring is the sticky part — the handler code is portable if you keep the framework at the edge, which is [Blueprint 20](#20-layered--hexagonal-business-service) again), and local testing/debugging being genuinely worse than for a container.

**What the interviewer is probing:** presigned uploads, the queue between source and compute, idempotency, the 15-minute wall and what you do when you hit it, and whether you know serverless stops being cheap at sustained load.

---

## 27. Read-Heavy Content Delivery

**Asked as:** "Design a news site / product catalogue serving 50M reads a day." · "The product page is slow under load — fix it." · "Design the read path for a social feed."

**Real use cases:** e-commerce catalogue and product pages, news and media sites, documentation portals, public profiles, pricing and configuration lookups, feed rendering. The defining ratio is roughly **1000 reads : 1 write**.

### The design — a cache hierarchy, deliberately layered

Each layer exists to absorb a different share of traffic, and each has a different invalidation story. Design them together or you get stale content in one layer and a stampede in another.

```
Browser cache (Cache-Control, ETag)          ~20% of requests never leave the device
        │
CDN / edge (stale-while-revalidate)          ~70–90% of the remainder — the big win
        │
API-level cache (Redis, full response)       absorbs the repeated composite reads
        │
Application cache (Redis, per-entity)        absorbs the hot rows
        │
DB read replicas                             absorbs the analytical and long-tail reads
        │
Primary DB                                   writes only, plus the true cache misses
```

**Step 1 — do the arithmetic out loud, because it justifies everything else.** 50M reads/day ≈ 580 RPS average, ~2,000 RPS peak. At a 95% CDN hit ratio the origin sees ~100 RPS; at 99% it sees ~20. **Improving the hit ratio from 95% to 99% is a 5× reduction in origin load** — which is why cache-key design deserves more attention than the choice of application framework.

**Step 2 — design the cache key as carefully as a database index.** Include everything that changes the response (locale, currency, tenant, device class, A/B variant) and *nothing else* — a session ID or a tracking query parameter in the key drops your hit ratio to near zero. Strip marketing parameters at the edge, normalise the query string, and vary on a small enumerated set rather than raw `User-Agent`.

**Step 3 — pick the write/invalidate strategy per data type.**

| Strategy | Behaviour | Use for |
|---|---|---|
| **Cache-aside (lazy)** | Read miss → load → populate | The default. Most entity reads |
| **Write-through** | Write updates cache and DB together | Data that must never be stale after a write |
| **Write-behind** | Write to cache, flush to DB async | High write throughput, tolerable loss risk. Rare |
| **TTL only** | Expire and reload | Content where a few minutes of staleness is fine — most content |
| **Explicit invalidation** | Publish an invalidation event on write | Price and stock changes, published/unpublished states |
| **Versioned keys** | `product:42:v7` — bump the version on write | Avoids the "invalidate everything derived from X" problem entirely |

Versioned keys deserve emphasis: instead of hunting down every derived cache entry, you change the key prefix and old entries age out on their own. It converts a correctness problem into a memory problem, which is the better problem to have.

**Step 4 — defend against the three classic cache failures** (fuller treatment in [the fundamentals guide](01-system-design-fundamentals.md#q10-caching-strategy)):

| Failure | Mechanism | Defence |
|---|---|---|
| **Stampede / dog-pile** | A hot key expires; 5,000 concurrent requests all miss and hit the DB | **Singleflight** — one request recomputes while the others wait; or serve stale while revalidating in the background |
| **Avalanche** | A large set of keys expires at the same instant (they were all populated by the same warm-up) | **TTL jitter** — `ttl = base ± rand(10%)` |
| **Penetration** | Requests for keys that don't exist bypass the cache and hammer the DB (often malicious) | **Negative caching** (cache the miss with a short TTL) + a Bloom filter for existence checks |
| **Hot key** | One key (a viral product) exceeds a single Redis node's capacity | Replicate the key across nodes with a suffix, or add a small in-process LRU in front |

**Step 5 — use `stale-while-revalidate` as the default posture at the edge.** `Cache-Control: max-age=60, stale-while-revalidate=600` means users get an instant response from the edge for up to eleven minutes while the CDN refreshes in the background. It converts the origin from a latency-critical dependency into a background one, and it means an origin outage degrades to *slightly stale content* rather than an error page. This single header is often the highest-leverage change in a read-heavy system.

**Step 6 — precompute the expensive composites.** If the product page needs data from six services, don't assemble it per request. Build a **read model** — a denormalised document per product, updated by consuming events from those six services ([Blueprint 22](#22-event-driven-order-processing)) — and serve one key lookup. This is CQRS applied to the read path, and it's how the page stays fast when the catalogue service is having a bad day.

**Step 7 — decide what's cacheable per surface, not globally.** Anonymous product page: fully cacheable at the edge. Logged-in page with a personalised header: cache the shell at the edge and fetch the personalised fragment client-side, or use edge-side includes. "It's personalised so we can't cache" is almost always false — it's *partly* personalised, and separating the two is the design work.

**Consistency you're signing up for:** a price change takes up to `edge TTL + app TTL` to appear everywhere. Decide the acceptable window per field and enforce it — prices and stock get explicit invalidation and short TTLs, descriptions and images get long ones. Say the number out loud.

**What the interviewer is probing:** cache-key design, hit-ratio arithmetic, stampede protection, invalidation strategy, and whether you reach for `stale-while-revalidate` and read models rather than only "add Redis".

---

## 28. Write-Heavy Time-Series Ingestion

**Asked as:** "Design a metrics/monitoring platform." · "Ingest telemetry from 10M IoT devices." · "Store clickstream events." · "Design a system taking 500K writes per second."

**Real use cases:** observability platforms (Prometheus/Datadog-class), IoT telemetry, clickstream and product analytics, financial tick data, vehicle tracking, application audit logs.

### What makes this different from every other blueprint

The workload inverts the usual assumptions: **writes vastly outnumber reads, data is append-only and never updated, recent data is queried constantly and old data almost never, and value per record is low while volume is enormous.** Every design decision follows from those four facts — and the fourth one means cost control is a functional requirement, not an optimisation.

### The design

```
Agents/devices ──batched, compressed──▶ Ingest gateway (stateless, auth, validate)
                                              │  no per-record DB writes ever
                                              ▼
                                    Kafka (partitioned by series key)
                                              │
              ┌───────────────────────────────┼──────────────────────────┐
              ▼                               ▼                          ▼
   Writer → TSDB hot tier          Stream processor → alerts    Raw → object storage
   (7–30 d, full resolution)       (threshold rules)            (Parquet, years, cold)
              │
   Downsampler → warm tier (1m/5m/1h rollups, 13 months)
              │
        Query layer (routes by time range to the right tier)
```

**Step 1 — do the capacity maths first; it dictates the entire architecture.** 10M devices × 1 reading/minute = **167K writes/sec**, ~14.4B points/day. At ~50 bytes raw that's ~720 GB/day, ~260 TB/year. No amount of cleverness makes storing that in Postgres at full resolution affordable — so tiering and downsampling are structural, not optional. Do this calculation on the whiteboard; it makes every subsequent decision self-evidently correct.

**Step 2 — batch at every level.** Agents buffer for 10 s or 1,000 points and send one compressed request. The gateway writes to Kafka in batches. The writer flushes to storage in batches. **Per-record round trips are what kill write-heavy systems**, and batching typically improves throughput by 10–100×. The cost is bounded data loss on an agent crash, which for telemetry is an acceptable trade you should name explicitly.

**Step 3 — choose the storage engine for the write pattern.** You want an **LSM-tree** store (Cassandra, ScyllaDB, RocksDB-backed) or a purpose-built TSDB (InfluxDB, TimescaleDB, VictoriaMetrics, ClickHouse). B-trees do random writes and fragment; LSM turns writes into sequential appends and compacts in the background. Purpose-built TSDBs add delta-of-delta timestamp encoding and XOR float compression (the Gorilla paper's techniques), which routinely give **10–15× compression** on real telemetry — the difference between 260 TB and 20 TB per year.

**Step 4 — partition by (series, time), and be explicit about both halves.** The partition key is the series identity (`device_id` or `metric+labels`) so one series' points are co-located and range scans are sequential; the clustering key is time. Then **partition by time window** as well (a partition per day or per hour) so retention is `DROP PARTITION` — an instant metadata operation — instead of a `DELETE` that generates tombstones and compaction load. Deleting old data with `DELETE` is the classic mistake here and it degrades the cluster for days.

**Step 5 — control cardinality, because it is the actual failure mode.** A time series is identified by its label set; adding a `user_id` or a `request_id` label to a metric creates millions of series and the index — not the data — is what falls over. Enforce hard limits: an allow-list of label names, a cap on series per tenant, rejection with a clear error, and a dashboard of top cardinality contributors. **Say "cardinality explosion" by name** — it's the thing operators of these systems fear most, and knowing it marks you as someone who has run one.

**Step 6 — tier by age with a query router.**

| Tier | Age | Resolution | Store | Cost |
|---|---|---|---|---|
| Hot | 0–7 d | Full (raw) | SSD-backed TSDB | High |
| Warm | 7 d–13 mo | 1m/5m rollups | Cheaper disk, compressed | Medium |
| Cold | 13 mo+ | 1h rollups + raw archive | Parquet on object storage | ~1/20th |

The query layer picks the tier from the requested range and resolution: nobody plotting a year of data needs per-second points, and a chart is 1,000 pixels wide regardless. Downsampling is both a cost control and a *performance* feature.

**Step 7 — handle out-of-order and late data as normal, not exceptional.** A device offline for two days reconnects and dumps its buffer. The ingest path must accept event-time timestamps well behind the wall clock, which means either an engine that supports out-of-order writes into closed partitions or a bounded lateness window plus a repair path for anything beyond it. Also drop far-future timestamps — a device with a broken clock reporting the year 2073 will create a partition you keep forever.

### Failure modes

| Failure mode | Mitigation |
|---|---|
| Cardinality explosion | Label allow-lists, per-tenant series caps, cardinality dashboard, reject-with-reason |
| Hot partition (one noisy tenant/device) | Add a shard suffix to the key; per-tenant rate limits at the gateway |
| Ingest backpressure | Kafka absorbs the spike; gateway sheds load with 429 rather than queueing unboundedly |
| Compaction storm | Tune compaction; provision headroom; monitor pending compactions as a first-class SLI |
| Retention by DELETE | Partition by time and drop partitions instead |
| Unbounded cost growth | Downsampling and tiering with retention enforced by policy, plus per-tenant cost attribution |

**What the interviewer is probing:** the capacity calculation, batching, LSM vs B-tree, partitioning that makes retention cheap, cardinality control, and downsampling as an explicit strategy rather than an afterthought.

---

## 29. Long-Running Workflow Orchestration

**Asked as:** "Design customer onboarding / KYC." · "Design a loan origination system." · "Model a subscription lifecycle with trials, dunning and cancellation." · "This process takes three days and involves two human approvals — how do you build it?"

**Real use cases:** KYC and onboarding, loan origination and disbursement, insurance claims, employee onboarding/offboarding, subscription and dunning lifecycles, order fulfilment with warehouse and courier steps, content moderation with human review.

### What makes this its own blueprint

A saga ([Blueprint 23](#23-saga-orchestrated-distributed-transaction)) runs for seconds and compensates on failure. These workflows run for **days or weeks**, involve **humans**, wait on **external systems with their own SLAs**, need **timers and escalations**, and must survive deploys — including deploys that change the workflow definition while thousands of instances are mid-flight. That last requirement is the one that catches people out.

### Requirements that drive it

- Durable state that survives process restarts, deploys and datacentre failures.
- Timers: "if the customer hasn't uploaded their NID in 48 hours, send a reminder; at 7 days, expire the application."
- Human tasks: a work queue, assignment, SLA tracking, escalation.
- Full audit: who did what, when, and why — usually a regulatory requirement in exactly these domains.
- Versioning: v2 of the process must not corrupt instances started under v1.

### The design — two viable implementations

**Option A: a durable execution engine (Temporal, AWS Step Functions, Camunda).** You write the workflow as ordinary code; the engine persists every step's result and replays the function to reconstruct state after a crash.

```ts
// Temporal-style: this function may "sleep" for days and survive any restart
async function kycWorkflow(applicationId: string) {
  await activities.requestDocuments(applicationId);

  const docs = await Promise.race([
    waitForSignal('documentsUploaded'),
    sleep('7 days').then(() => null),           // durable timer, not setTimeout
  ]);
  if (!docs) return activities.expireApplication(applicationId);

  const auto = await activities.runAutomatedChecks(docs);   // retried by the engine
  if (auto.score < THRESHOLD) {
    const decision = await activities.createHumanReviewTask(applicationId); // waits days
    if (decision === 'reject') return activities.reject(applicationId, decision);
  }
  await activities.provisionAccount(applicationId);
  await activities.notifyCustomer(applicationId);
}
```

The rule that makes this work: **the workflow function must be deterministic** (it is replayed), so all I/O, randomness and clock access live in *activities*, never in the workflow body. Getting that constraint right in an interview is the tell that you understand what durable execution actually is.

**Option B: hand-rolled state machine + poller.** Entirely respectable, and the right call when adding a new operational component isn't justified.

```sql
CREATE TABLE workflow_instance (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL, definition_version INT NOT NULL,   -- ← pin the version
  state TEXT NOT NULL, context JSONB NOT NULL,
  wake_at TIMESTAMPTZ,                                   -- durable timer
  attempts INT DEFAULT 0, locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON workflow_instance (wake_at) WHERE state NOT IN ('DONE','FAILED');
-- Workers claim due instances safely:
--   SELECT ... WHERE wake_at <= now() AND state NOT IN ('DONE','FAILED')
--   ORDER BY wake_at FOR UPDATE SKIP LOCKED LIMIT 50;
```

Every transition is a transaction that writes the new state, the next `wake_at`, and any outbound command to the outbox. Transitions must be idempotent, since a worker can die after acting but before committing.

**Step 1 — model the process as an explicit state machine and get it agreed with the business.** States, transitions, guards, timeouts, terminal states. This artefact is worth more than the code: it is the thing product, compliance and engineering can all read, and it makes the missing cases visible (what happens if documents arrive *after* expiry?).

**Step 2 — make every activity idempotent and retryable.** The engine will retry; the network will duplicate. Pass an idempotency key derived from `(workflow_id, step, attempt-invariant seed)` to every external call.

**Step 3 — treat human tasks as first-class.** A task table with assignee, due date, priority and escalation policy; a queue UI; SLA metrics per queue. The workflow blocks on a signal; the task system is what unblocks it. Most real-world workflow pain is queue management, not orchestration.

**Step 4 — solve versioning before you ship v1.** Three strategies, and you should be able to name the trade-offs: **pin** each instance to its definition version and keep old definitions deployed (simplest, unbounded accumulation of versions); **branch inside the workflow** on the version (`if (version >= 2)` — Temporal's `patched` API, keeps one codebase, grows conditionals); or **drain** — stop starting v1 instances and wait for them to complete (clean, but a 90-day workflow means a 90-day wait). Pinning plus a drain policy is the usual pragmatic combination.

**Step 5 — build the operator surface.** Instances by state and age, stuck-instance alerts (in one state longer than expected), the ability to retry, skip, or force-transition a step, and a full audit log of every transition and manual intervention. In these domains an auditor will eventually ask to see it.

### Failure modes

| Failure mode | Mitigation |
|---|---|
| Non-deterministic workflow code | Keep all I/O in activities; treat determinism as a lint-enforced rule |
| Deploy breaks in-flight instances | Version pinning; never remove a step an in-flight instance may still need |
| Stuck instances nobody notices | Age-per-state alerting; a "stuck" dashboard reviewed daily |
| Timer storm (100K instances wake simultaneously) | Jitter `wake_at`; rate-limit the claim query |
| Duplicate side effects on retry | Idempotency keys on every activity |

**What the interviewer is probing:** durable state (not in-memory timers), the determinism constraint, how humans fit in, and — the question that separates seniors from architects — *how you deploy a change to a process that has 40,000 instances currently running*.

---

## 30. Multi-Region Active-Active

**Asked as:** "Our users in Europe complain about latency — design multi-region." · "We need to survive a region failure with an RTO of 5 minutes." · "Design a globally distributed SaaS."

**Real use cases:** global SaaS platforms, social and messaging products, payment networks, anything with a regulatory data-residency requirement or a latency SLO for geographically distant users.

### Start by choosing the weakest posture that meets the requirement

Multi-region is expensive in money, complexity and incident surface. Match the posture to the actual RPO/RTO and latency requirement rather than to ambition ([DR fundamentals](05-reliability-security-cost.md#q3-disaster-recovery-rpo--rto)):

| Posture | RPO / RTO | Cost | When |
|---|---|---|---|
| **Backup & restore** | Hours / hours | ~1.05× | Internal tools, non-critical |
| **Pilot light** | Minutes / ~1 h | ~1.2× | Cost-sensitive, tolerant of a slow failover |
| **Warm standby** | Seconds / minutes | ~1.5× | The common, sensible choice for serious products |
| **Active-active** | ~0 / seconds | ~2.2×+ | Global latency requirements, or an RTO measured in seconds |
| **Cell-based** | Blast radius per cell | Varies | Very large multi-tenant platforms ([patterns guide](02-architecture-patterns.md#q16-cell-based-architecture)) |

**The honest architect line:** most teams asking for active-active need warm standby plus a CDN. Say that, then design active-active properly if the requirement survives the challenge.

### The design

```
                        GeoDNS / Anycast (health-checked)
                      ┌──────────────┴──────────────┐
                      ▼                             ▼
             ┌─────── REGION: eu-west ───────┐  ┌── REGION: ap-south ──┐
             │ Edge → Gateway → Services     │  │  (mirror)            │
             │ Postgres primary (EU users)   │  │  Postgres primary    │
             │ Redis (regional)              │  │  (APAC users)        │
             └───────────┬───────────────────┘  └──────────┬──────────┘
                         │        async replication        │
                         └───────────◀───────▶─────────────┘
                                     │
                       Globally replicated: identity, config,
                       feature flags, tenant→region routing map
```

**Step 1 — partition writes by home region; this is the decision that makes everything else tractable.** Each user or tenant has a **home region** that owns their writes. Requests arriving elsewhere are routed (or proxied) to the home region for writes, while reads can be served locally from a replica. Conflicts are then *structurally* rare instead of being something you must resolve. Almost every successful active-active system is really "many single-region systems plus a routing layer", and describing it that way is the sophisticated answer.

**Step 2 — classify each dataset and pick a replication strategy per class.**

| Data class | Example | Strategy |
|---|---|---|
| Region-owned | Orders, messages, user content | Async replication to other regions, read-only there |
| Globally consistent, low write rate | Identity, tenant→region map, feature flags | Replicate everywhere; accept slow writes (or a single global writer) |
| Append-only / commutative | Counters, view counts, likes | CRDTs or per-region counters summed on read ([CRDTs](03-distributed-systems.md#q10-conflict-resolution--crdts)) |
| Derived / cacheable | Search indexes, read models | Build independently per region from the event stream |
| Genuinely global & strongly consistent | A shared inventory pool, a global unique constraint | **Challenge the requirement.** If it survives, one region owns it and everyone pays the latency |

**Step 3 — deal with the physics.** Round-trip Dhaka↔Frankfurt is ~130–160 ms; Virginia↔Singapore ~230 ms. Synchronous cross-region writes are therefore off the table for any interactive path. This is a constraint of the speed of light, not of your database, and stating it in milliseconds is more persuasive than any argument about consistency models.

**Step 4 — pick a conflict policy and name its data loss.** Last-writer-wins is simple and silently discards a write — acceptable for a user's display name, unacceptable for a shopping cart or a balance. Alternatives: CRDTs (merge without loss, for the data types they support), application-level merge (keep both, let the user resolve), or avoid conflicts entirely via home-region ownership (the preferred answer). Never say "last-writer-wins" without saying what gets lost.

**Step 5 — plan failover as a rehearsed procedure, not an aspiration.** Health checks with a deliberate threshold (too sensitive → flapping), a **documented and automated** promotion of a replica, fencing to prevent split-brain (the old primary must be unable to accept writes — a fencing token or an explicit STONITH step), DNS TTLs low enough to matter (60 s), and connection draining. Then: **test it on a schedule.** An untested failover is a hypothesis, and [chaos/game-day exercises](05-reliability-security-cost.md#q6-chaos-engineering) are what turn it into a capability.

**Step 6 — budget the costs people forget.** Cross-region data transfer (usually the single biggest surprise on the bill), duplicated infrastructure, doubled deployment and monitoring surface, doubled incident surface, and the engineering time to keep two regions actually identical. Configuration drift between regions is the most common cause of a failover that fails.

**Step 7 — handle residency as routing, not policy.** If EU data must stay in the EU, the routing layer must make it structurally impossible to write it elsewhere — enforced in code and verified by tests, not documented in a wiki that an on-call engineer will not read at 3 a.m.

### Failure modes

| Failure mode | Mitigation |
|---|---|
| Split brain (both regions accept writes for the same key) | Fencing tokens; home-region ownership; consensus for leadership |
| Read-your-writes broken after failover | Sticky routing to the home region for a short window after a write |
| Replication lag surfaces stale data | Monitor lag as a first-class SLI; block or warn above a threshold |
| Configuration drift | One IaC codebase, region as a parameter; drift detection in CI |
| Failover never tested | Scheduled game days; a region evacuation exercise per quarter |

**What the interviewer is probing:** whether you challenge the requirement first; whether you partition writes rather than trying to make everything globally consistent; whether you know the latency numbers; your conflict-resolution honesty; and whether failover is tested.

---

## 31. Authentication & Authorisation Platform

**Asked as:** "Design authentication for a multi-tenant SaaS." · "How do you do SSO?" · "Design permissions for a system where users share documents with teams." · "Where do you check authorisation in a microservices architecture?"

**Real use cases:** every product, which is why it's asked constantly — B2B SaaS with enterprise SSO, consumer apps with social login, internal platforms with RBAC, marketplaces with per-resource sharing, and any API platform serving partners.

### Separate the four problems before designing

Candidates lose this question by conflating them. Say them apart:

| Problem | Question | Typical answer |
|---|---|---|
| **Authentication** | Who is this? | OIDC against an identity provider |
| **Session/token** | How is that identity carried on subsequent requests? | Short-lived access token + rotating refresh token |
| **Authorisation** | May they do this to this resource? | RBAC → ABAC → ReBAC, evaluated by a policy engine |
| **Service identity** | Is this call really from the orders service? | mTLS / SPIFFE, not a shared secret |

### The design

```
 User ──▶ App ──OIDC Authorization Code + PKCE──▶ Identity Provider
                                                   (own IdP, or Auth0/Cognito/Keycloak;
                                                    per-tenant federation to Okta/Entra)
        ◀── id_token + access_token + refresh_token ──
 App ──Bearer access_token──▶ API Gateway
                                 │ validate signature via cached JWKS, check exp/aud/iss
                                 │ → internal identity (sub, tenant, roles, scopes)
                                 ▼
                            Service ──▶ PDP (OPA/Cedar sidecar, policies pushed)
                                        "may user U do action A on resource R?"
                                 └────▶ decision logged for audit
```

**Step 1 — pick the OAuth2/OIDC flow from the client type** ([full flow detail](05-reliability-security-cost.md#q11-oauth2--oidc-flows)): **authorisation code + PKCE** for SPAs and mobile (never the implicit flow — it's deprecated), **client credentials** for machine-to-machine, **device code** for TVs and CLIs. And be clear that **OAuth2 is authorisation-delegation, OIDC is the authentication layer on top** — conflating them is a common and visible mistake.

**Step 2 — choose the token strategy and defend it.** Short-lived access JWT (5–15 min) plus a long-lived, **rotating**, single-use refresh token. The JWT lets services authenticate locally with no round trip, which is the whole point; the short TTL is what bounds the damage when you can't revoke it.

The revocation problem is the real interview question here: **you cannot un-issue a JWT.** Your options are a short TTL (accept a window of up to 15 minutes), a denylist of revoked `jti`s checked at the gateway (reintroduces shared state, but only at one hop), or opaque tokens with introspection (fully revocable, but a network call per request). State the trade and pick: short TTL plus a gateway denylist for the high-impact cases (logout-everywhere, compromised account) is the usual, defensible answer.

For browser clients, prefer the token in an `HttpOnly`, `Secure`, `SameSite` cookie over `localStorage` — the latter is readable by any XSS payload on the page.

**Step 3 — put keys and their rotation in the design.** Sign with asymmetric keys (RS256/ES256) so services verify with a public key and only the IdP can mint tokens. Publish **JWKS** with a `kid`, cache it in services with a TTL, and support overlapping keys so rotation doesn't cause an outage. Never use HS256 with a secret shared across ten services — that's ten places a token forger can start.

**Step 4 — choose the authorisation model by the questions the product asks.**

| Model | Shape | Fits |
|---|---|---|
| **RBAC** | user → role → permissions | Internal tools, most B2B admin surfaces. Start here |
| **ABAC** | policy over attributes (`user.dept == doc.dept && time < 18:00`) | Contextual rules, compliance constraints |
| **ReBAC** (Zanzibar-style) | relationship tuples: `doc:42#viewer@team:eng#member` | **Sharing and hierarchies** — Drive/GitHub-like products |
| **Scopes** | Coarse API-level grants (`orders:read`) | Third-party/partner API access, layered *on top* of the above |

The discriminator to listen for in the prompt: if it involves *sharing resources with users, teams and nested groups*, the answer is ReBAC, and naming Google Zanzibar (and implementations like SpiceDB/OpenFGA) is the strong signal. RBAC bolted onto a sharing product produces a permissions table that grows without bound and a `can_view` query nobody can make fast.

**Step 5 — decide where the decision is made.** A central authorisation service is one more network hop and a hard dependency on every request. The standard resolution is a **local PDP** — OPA or Cedar running as a sidecar or library, with policies and relevant data *pushed* to it — so evaluation is sub-millisecond and in-process while policy authorship stays central. Accept bounded staleness on policy propagation (seconds) and make revocation of *high-impact* grants explicitly faster.

**Step 6 — enforce tenant scoping structurally.** In multi-tenant systems the catastrophic bug is cross-tenant data access. Do not rely on every query remembering `WHERE tenant_id = ?`: enforce it in the repository layer or with Postgres row-level security tied to a session variable set from the token, and add a test that a token from tenant A cannot read tenant B's row for every resource type. Tenant isolation is covered further in [Blueprint 11](#11-multi-tenant-saas-platform) and [the security guide](05-reliability-security-cost.md#q16-multi-tenancy-isolation).

**Step 7 — authorise at the resource, not only at the route.** `GET /orders/:id` passing a role check but not an ownership check is the single most common real-world authorisation vulnerability (IDOR). The route check answers "may this role read orders"; the resource check answers "may *this* user read *this* order". Both are required.

**Step 8 — service-to-service identity is not an API key.** Use mTLS with short-lived, automatically rotated certificates (SPIFFE/SPIRE, or a service mesh) so identity is cryptographic rather than a string in an environment variable, and propagate the *end-user* identity separately so a downstream service can still make user-level decisions ([service identity](05-reliability-security-cost.md#q12-service-identity--mtls)).

**Step 9 — log every decision.** Who, what, on which resource, allowed or denied, which policy decided, and the correlation ID. Denials matter as much as approvals: a spike in denials is either an attack or a broken deploy, and you want to know which within minutes.

### Failure modes

| Failure mode | Mitigation |
|---|---|
| Cannot revoke a compromised token | Short TTL + gateway denylist; refresh-token rotation with reuse detection |
| Permission cache serves stale grants after a revoke | Short cache TTL for denials; explicit invalidation on high-impact changes |
| Confused deputy (service acts with its own rights on a user's behalf) | Propagate user identity; authorise against the *user*, not the service |
| IdP outage takes down all logins | Cache JWKS; keep existing sessions valid; degrade to read-only rather than a hard failure |
| Cross-tenant leak | RLS or repository-level scoping + per-resource isolation tests in CI |

**What the interviewer is probing:** OAuth2 vs OIDC, why PKCE, the JWT revocation trade-off, RBAC vs ReBAC and when the switch happens, where the policy decision point lives, and whether you check ownership as well as role.

---

## 32. Analytics Data Platform (CDC → Lakehouse)

**Asked as:** "Analysts need data from twelve microservices — design it." · "Our reporting queries are killing the production database." · "Design the data platform for a company with 200 engineers." · "How do you build features for an ML model?"

**Real use cases:** company-wide BI and reporting, executive dashboards, ML feature engineering, regulatory reporting, customer-facing analytics, data science exploration.

### Start with the rule that motivates everything

**Analytical queries must never run against the operational database.** OLTP stores are optimised for small, indexed, row-oriented transactions; analytics wants full scans over a few columns across billions of rows ([OLTP vs OLAP](04-ddd-and-data-architecture.md#q10-oltp-vs-olap)). Running both on one Postgres means either the report is slow or checkout is — and eventually both. The platform exists to give analysts a copy shaped for their questions.

### The design — CDC plus the medallion architecture

```
 Service DBs ──Debezium CDC──▶ Kafka ──┐
 Event streams ────────────────────────┤
 SaaS APIs (Stripe, Salesforce) ───────┤   (Fivetran/Airbyte for the long tail)
                                       ▼
        ┌─────────────── Object storage (S3/GCS) — Iceberg / Delta tables ──────────────┐
        │  BRONZE: raw, append-only, source-shaped, immutable, full history             │
        │      ▼  (clean, dedupe, type, conform, apply GDPR masking)                    │
        │  SILVER: validated, deduplicated, conformed entities — the reusable layer     │
        │      ▼  (aggregate, join, model into business concepts)                       │
        │  GOLD: star schemas / metrics / feature tables, owned by a business domain    │
        └───────────────────────────────┬──────────────────────────────────────────────┘
                                        ▼
            Query engine (Trino / Snowflake / BigQuery / Databricks)
                    ├──▶ BI (Looker/Metabase)   ├──▶ Feature store ──▶ ML
                    └──▶ Reverse ETL back into operational tools
```

**Step 1 — extract with CDC, not with `SELECT * WHERE updated_at > ?`.** Query-based extraction misses hard deletes, misses rows updated within the same second as the watermark, requires an `updated_at` column that is reliably maintained, and puts scan load on the production database. **Log-based CDC** (Debezium reading the WAL/binlog) captures every insert, update and delete in commit order with near-zero load on the source ([CDC](04-ddd-and-data-architecture.md#q12-change-data-capture)). Prefer *domain events* where they exist — they carry business meaning and are a real contract — and use CDC for the systems that don't publish any.

**Step 2 — land raw and immutable in bronze.** Never transform on ingest. Bronze is the replayable source of truth for the platform: when a transformation turns out to be wrong (it will), you fix the code and rebuild silver and gold. Ingesting pre-transformed data throws away that recovery path permanently.

**Step 3 — use an open table format.** Iceberg or Delta Lake give you ACID commits on object storage, schema evolution, time travel, and partition evolution — the properties that separate a lakehouse from "a folder full of Parquet files that everyone is afraid to touch" ([lakehouse](04-ddd-and-data-architecture.md#q11-data-lake-warehouse--lakehouse)). Also handles the small-file problem via compaction, which is the practical failure mode of naive streaming ingestion.

**Step 4 — make schema changes a contract, not a surprise.** A backend engineer renaming a column breaks eleven dashboards on Monday, and they had no way to know. Fix it structurally: register schemas, run compatibility checks in the producing service's CI, and treat the emitted event/CDC schema as a published API with a deprecation policy. **Data contracts are an organisational answer to a technical symptom**, and framing it that way is the architect-level move.

**Step 5 — gate on data quality, and alert on freshness.** Tests at each layer (row counts within expected bounds, uniqueness of keys, referential integrity, null rates, distribution drift), executed as part of the pipeline, with failures blocking promotion to gold rather than quietly publishing wrong numbers. Freshness SLOs per table ("orders_daily is complete by 06:00") with alerting, because the worst failure mode of a data platform is not an outage — it's confidently serving stale or wrong numbers that someone makes a decision on.

**Step 6 — handle PII at the boundary.** Classify columns at ingest, mask or tokenise in silver, keep a separate restricted zone for anything that must remain identifiable, and implement erasure by **crypto-shredding** (per-subject keys) since rewriting immutable Parquet history is impractical. Column- and row-level access control in the query engine, plus lineage so you can answer "where did this person's data end up?" — which is a question you will be asked, by a regulator or by a customer.

**Step 7 — decide batch vs streaming per table, on evidence.** Streaming everything multiplies cost and operational burden for tables nobody looks at before 9 a.m. Stream what genuinely needs seconds (fraud signals, live ops dashboards); batch the rest hourly or daily. "What decision does this latency enable?" is the question that settles it, and the honest answer is usually "none".

**Step 8 — address ownership, because the technical design isn't the failure mode.** Central data teams become a bottleneck: they own hundreds of pipelines for domains they don't understand, and every schema change is a ticket. The **data mesh** answer is that domain teams own their data products (the gold tables for their domain) with the platform team providing the self-serve infrastructure, standards and catalogue ([data mesh](04-ddd-and-data-architecture.md#q15-data-mesh)). Be balanced: data mesh needs organisational maturity and fails when imposed on teams with no data capability — a hub-and-spoke model (central platform, embedded analytics engineers) is often the realistic intermediate step.

### Failure modes

| Failure mode | Mitigation |
|---|---|
| Upstream schema change breaks pipelines | Schema registry + compatibility checks in the producer's CI; data contracts |
| Silent data quality regression | Tests at each layer blocking promotion; freshness and volume alerting |
| Small-file explosion from streaming ingest | Table-format compaction jobs; batch micro-commits |
| Late-arriving data corrupts closed periods | Partition by event date; support reprocessing windows; use table-format upserts |
| Cost spiral | Partition pruning, columnar formats, result caching, per-team cost attribution, retention policies |
| Nobody trusts the numbers | A single certified gold layer, documented lineage, one definition per metric |

**What the interviewer is probing:** why CDC beats query-based extraction, the bronze/silver/gold separation and *why* raw is preserved, schema-change handling, PII and erasure, and whether you can talk about ownership rather than only tooling.

---

## 33. Choosing the Right Blueprint

Most interview prompts map onto one blueprint plus one or two supporting ones. Read the *dominant constraint* in the question and start there.

| The prompt says… | Dominant constraint | Start with | Usually plus |
|---|---|---|---|
| "Design service X for domain Y" | Business rules | [20 — Hexagonal](#20-layered--hexagonal-business-service) | 22 for its outbox |
| "Web, mobile and partners need this" | Client diversity | [21 — Gateway + BFF](#21-microservices--api-gateway--bff) | 31 for auth |
| "Five systems must react when X happens" | Fan-out, decoupling | [22 — Event-driven](#22-event-driven-order-processing) | 20 inside each service |
| "This spans three services and money is involved" | Cross-service consistency | [23 — Saga](#23-saga-orchestrated-distributed-transaction) | 22 for transport |
| "Audit trail / balance / regulator" | History is the asset | [24 — CQRS + ES](#24-cqrs--event-sourcing-ledger) | 32 for reporting |
| "Real-time dashboard / fraud / trending" | Seconds-fresh aggregates | [25 — Streaming](#25-real-time-streaming-analytics) | 28 for the store |
| "Process uploaded files / webhooks" | Spiky, parallel, stateless | [26 — Serverless](#26-serverless-event-pipeline) | 29 if multi-step |
| "Millions of reads, few writes" | Read amplification | [27 — Read-heavy](#27-read-heavy-content-delivery) | 22 to build read models |
| "500K writes/sec, telemetry, metrics" | Write throughput + cost | [28 — Time-series](#28-write-heavy-time-series-ingestion) | 25 for alerting |
| "Takes days, humans approve steps" | Durable long-lived state | [29 — Workflow](#29-long-running-workflow-orchestration) | 23 for compensation |
| "Global users / survive a region loss" | Latency + availability | [30 — Multi-region](#30-multi-region-active-active) | 27 for the edge |
| "SSO / permissions / sharing" | Identity & policy | [31 — AuthN/AuthZ](#31-authentication--authorisation-platform) | 21 for enforcement |
| "Analysts need data from everywhere" | OLTP/OLAP separation | [32 — Data platform](#32-analytics-data-platform-cdc--lakehouse) | 22 as a source |

**The compositions that show up most often in real interviews:**

- **E-commerce checkout** = 21 (gateway/BFF) + 22 (events) + 23 (saga) + 27 (catalogue reads) + 32 (reporting).
- **Fintech wallet** = 24 (ledger) + 23 (transfers) + 22 (notifications) + 31 (auth) + 32 (regulatory reporting).
- **IoT platform** = 28 (ingestion) + 25 (alerting) + 29 (device provisioning workflows) + 32 (analytics).
- **B2B SaaS** = 20 + 21 + 31 (ReBAC + tenant isolation) + 27 + 30 (residency) + 32.

**Three sentences worth having ready for any of them:**

1. *"Before I pick a shape — what's the read:write ratio, does the write need an authoritative answer immediately, and does one operation span more than one owner of data?"*
2. *"Phase one is a modular monolith with the outbox and the boundaries already in place; we split it when the second team arrives, not before."*
3. *"Here's the consistency guarantee per operation, and here's what a user actually sees when it's violated."*

---

# Part D — Real Systems & Scaling Stories

Blueprints tell you the shape. Case studies tell you **what actually broke and what it cost to fix** — and that's the material that makes an answer sound like experience rather than revision.

**How to use these in an interview.** Cite them as *evidence for a trade-off*, never as name-dropping. "Twitter fans out on write for normal users and on read for celebrities, because 100M list writes for one tweet isn't viable — I'd do the same hybrid here" is an excellent sentence. "Twitter uses Redis" is not. Two rules: reference the *decision and its reason*, and be honest about which numbers you're sure of ("publicly reported around…" is a perfectly professional hedge, and far better than inventing precision).

**A caution on scale.** Every system below is at a scale you will probably never operate. Their solutions are correct *for their constraints* and are usually wrong for a startup — Instagram's real lesson isn't sharding, it's that thirteen people ran 30M users on Django and Postgres. Copying the endpoint of someone's ten-year evolution as your starting point is the most expensive mistake in this document.

The engineering-blog details below are as publicly described by the companies themselves; the transferable lesson is what matters, not the version numbers.

---

## 34. URL Shortener — Full Worked Example

This is the most-asked design question in existence, and it's the right place to see [the Blueprint Method](#19-the-blueprint-method) executed end to end. It looks trivial and isn't: the interesting parts are key generation, the read:write asymmetry, and what you *don't* do on the redirect path.

### Step 1 — Scope & clarify (5 min)

| | |
|---|---|
| **In scope** | Create a short link; redirect; custom aliases; expiry; click analytics |
| **Out of scope** | Accounts UI, billing, link previews, QR generation (say them, don't design them) |
| **Non-functional** | Redirect p99 < 50 ms (it's on the user's critical path); redirects are far more available than creation; links are permanent unless expired |
| **The key question to ask** | "Are short codes guessable-safe?" — if links are private, random codes are mandatory and it changes the design |

### Step 2 — Estimate (3 min)

```
Writes: 10M new links/day    → ~115/s avg, ~350/s peak
Reads:  1B redirects/day     → ~11.6K/s avg, ~35K/s peak     (read:write ≈ 100:1)
Storage: 10M/day × ~500 B    → ~5 GB/day → ~1.8 TB/yr → ~9 TB at 5 years
Key space: base62, 7 chars   → 62^7 ≈ 3.5 × 10^12  (3,500 years at this write rate)
```

The 100:1 ratio is the single most important output of this step — it says **this is [Blueprint 27](#27-read-heavy-content-delivery)**, and the read path deserves nearly all of the design effort.

### Step 3 — API contract (4 min)

```
POST /v1/links            {url, customAlias?, expiresAt?}   → 201 {code, shortUrl}
     Idempotency-Key: <uuid>        ← a retried create must not mint a second code
GET  /{code}                                                 → 302 + Location
GET  /v1/links/{code}/stats?from&to                          → aggregated counts
DELETE /v1/links/{code}                                      → 204
```

### Step 4 — Data model & store (6 min)

The only access pattern that matters is **exact-match lookup by primary key**. There are no joins, no range scans, no transactions across rows. That rules *in* a key-value store (DynamoDB, Cassandra) and rules *out* the assumption that you need a relational database.

```
links:  code (PK) → { long_url, owner_id, created_at, expires_at, disabled }
```

Partition by hash of `code`, which is naturally uniform. Clicks are a separate, append-only store — never a counter column on this row, because a hot link would serialise every redirect behind one row lock.

### Step 5 — Architecture (7 min)

```
                     ┌──── redirect path (35K/s) ────────────────────────┐
 GET /{code} ──▶ CDN/edge ──▶ LB ──▶ Redirect svc ──▶ Redis ──▶ KV store │
                                          │  (cache-aside, ~95% hit)     │
                                          └──async──▶ Kafka ──▶ Flink ──▶ ClickHouse
                     └────────────────────────────────────────────────────┘
                     ┌──── create path (350/s) ──────────────────────────┐
 POST /v1/links ──▶ LB ──▶ Link svc ──▶ ID block allocator (leased ranges)
                                    └──▶ KV store (conditional put)       │
                     └────────────────────────────────────────────────────┘
```

Note that the read and write paths are **separate services**: they have a 100:1 traffic ratio, entirely different failure tolerances, and different deployment risk. Scaling and deploying them independently is free once you split them and painful once you haven't.

### Step 6 — Deep dives (15 min)

**(a) Key generation — the actual interview question.**

| Approach | How | Verdict |
|---|---|---|
| **Hash the URL** | `base62(md5(url))[0:7]` | Collisions require read-before-write and a retry loop; same URL → same code, which is sometimes a feature and sometimes a privacy leak |
| **Random** | 7 random base62 chars, conditional insert | Unguessable (good for private links), but needs a uniqueness check; collision probability rises as the space fills |
| **Counter + encode** | Global counter → base62 | **No collisions, no read before write.** But codes are sequential and enumerable |

The production answer is the third with two fixes: allocate the counter in **leased blocks** (each service instance takes 10,000 IDs at a time from Redis/ZooKeeper, so there is no per-request coordination and a crash only wastes a block), and **obfuscate** the ID before encoding — a Feistel network or multiplication by a large odd constant modulo 2⁴², both of which are reversible bijections — so codes are non-sequential without giving up uniqueness. If links must be genuinely unguessable, use random codes and accept the existence check.

**(b) 301 vs 302 — a real trade-off, not trivia.** A `301` is cached by browsers indefinitely: subsequent clicks never reach you, so you lose analytics *and* the ability to ever change or disable the link. A `302`/`307` costs you the traffic but keeps control. Default to `302`; offer `301` only for links you've committed never to change.

**(c) Never write synchronously on redirect.** The redirect handler emits a click event fire-and-forget to Kafka and returns. Aggregation happens in a stream job ([Blueprint 25](#25-real-time-streaming-analytics)). Putting a database increment on the redirect path is the classic failure: it converts a 5 ms cached lookup into a write-contended 50 ms one, and it means your analytics pipeline can take down your redirects.

**(d) Cache strategy.** Cache-aside in Redis with a long TTL; hit rates above 95% are normal because link popularity is heavily Zipfian. Add an in-process LRU for the top few thousand codes to survive a Redis blip, use **singleflight** so a miss on a viral link doesn't send 5,000 concurrent reads to the KV store, and **negative-cache unknown codes** with a short TTL — scanners probing random codes are a permanent background load and would otherwise hit the database every time.

**(e) Custom aliases and abuse.** Uniqueness via a conditional write (`attribute_not_exists(code)`), plus a reserved-word blocklist (`admin`, `api`, `login`). Abuse controls: per-account and per-IP rate limits on creation, asynchronous reputation scanning of the target URL, and a Bloom filter of blocked domains consulted at redirect time so takedowns are immediate.

### Step 7 — Failure & scale (5 min)

| At 10× | What breaks | Response |
|---|---|---|
| Redirects | Nothing structural — single-key lookups scale horizontally | Add cache and KV nodes |
| Analytics | **This breaks first** — the click firehose outgrows naive aggregation | Pre-aggregate in the stream layer; sample if necessary |
| Global users | Cross-region redirect latency | Replicate the KV store read-only to every region; keep writes in a home region; **pre-partition ID blocks per region** so creation needs no cross-region coordination |
| Redis outage | Full traffic hits the KV store | Provision the KV store for the un-cached rate, or accept degraded latency — decide and document which |

**Blueprints in play:** [27](#27-read-heavy-content-delivery) (dominant) + [22](#22-event-driven-order-processing) (analytics) + [30](#30-multi-region-active-active) (global reads).

---

## 35. Uber — Real-Time Matching at City Scale

**The scale.** Publicly, on the order of tens of millions of trips per day across thousands of cities, with driver location updates arriving every few seconds from millions of concurrently active devices — which makes the *location write* rate, not the trip rate, the dominant load.

**The hard problems:** find nearby available drivers in milliseconds; assign riders to drivers well rather than merely quickly; price dynamically per neighbourhood in real time; and run a money-bearing, multi-party state machine that must never lose a trip.

### How they solved it

**Geospatial indexing with H3.** Uber built and open-sourced **H3**, a hierarchical *hexagonal* grid covering the globe at 16 resolutions. Hexagons matter for a specific reason worth being able to state: with squares, the eight neighbours are at two different distances (edge vs diagonal), so "nearby" is distorted; with hexagons, all six neighbours are equidistant, which makes the aggregation of supply and demand over an area behave sensibly. A location becomes a cell ID, "nearby" becomes "this cell plus its rings", and both are cheap integer operations.

**Location data never touches a transactional database.** Driver positions live in memory in services sharded geographically, with a consistent-hash + gossip membership ring (Uber's **Ringpop**, built on the SWIM protocol) routing a request for a location to the node that owns that region. This is the same reasoning as [Blueprint 13](#13-real-time-bidding-ad-tech): when the latency budget is tens of milliseconds and the write rate is enormous, the data must already be in RAM on the node handling the request.

**Batched matching beats greedy matching.** The naive dispatcher assigns each request to its nearest available driver immediately. Uber accumulates requests over a short window and then solves an *assignment problem* across the whole batch. The counter-intuitive result — worth saying out loud in an interview — is that **making individual riders wait a few seconds lowers average wait time overall**, because a globally optimal assignment avoids sending a driver across a river while a closer one is claimed by someone else. Local greed produces global waste.

**Trip lifecycle as a durable workflow.** A trip spans request → match → pickup → in-progress → completion → fare → payment → driver payout, across many services and often many minutes, with money at the end. Uber built **Cadence** (the engine Temporal descends from) for exactly this: [Blueprint 29](#29-long-running-workflow-orchestration) in production, at a company that needed it badly enough to build the category.

**Storage evolution.** Uber wrote a widely-read post on migrating from Postgres to MySQL, driven by write amplification and how each replicates (physical WAL vs logical binlog) at their update rate — a useful reminder that "which database" can be an operational question about *replication and update patterns* rather than a feature comparison. Above MySQL they built **Schemaless**, an append-only sharded key-value layer.

**The organisational half — and the most valuable lesson here.** Uber's microservice count reached roughly 2,200, at which point discovering ownership, tracing a request and making a cross-cutting change became the bottleneck. Their answer was **DOMA** (Domain-Oriented Microservice Architecture): group services into *domains*, front each domain with a gateway so consumers depend on the domain rather than its internals, and impose layering rules so dependencies can't form cycles. Cite this as the cautionary tale it is — 2,200 services is not an achievement, it's the symptom that produced DOMA.

**What generalises:** pick a spatial index deliberately and know why; keep hot-path state in memory and shard it by the natural partition (geography); batch-and-optimise beats greedy when a few seconds of latency is acceptable; use a workflow engine for long, money-bearing flows; and service count is a cost, not a score.

---

## 36. Netflix — Global Streaming & the Availability Obsession

**The scale.** Hundreds of millions of subscribers worldwide, and at peak hours a substantial share of downstream internet traffic in many countries. Two workloads that could not be more different share the brand: the **control plane** (browse, search, recommend, play button) and the **data plane** (the video bytes themselves).

**The origin story that explains the culture.** A 2008 database corruption halted DVD shipping for days. The conclusion drawn was not "buy better hardware" but "stop having single points of failure" — which produced the cloud migration (completed 2016), the microservice architecture, and chaos engineering. Worth citing because it's a rare case of a company naming the incident that set its architecture.

### How they solved it

**Separate the two planes completely.** The control plane runs as microservices on AWS across multiple regions. The video plane runs on **Open Connect** — Netflix's own CDN appliances, given to ISPs and installed inside their networks, filled with content during off-peak hours. The economics are the whole point: the most-watched titles are pre-positioned metres from the subscriber, so the bytes never cross paid transit at all. **Content delivery is a cost architecture, not just a latency one**, and at this volume it's the single largest infrastructure decision they make.

**Every service defines its degraded behaviour.** Netflix's circuit-breaker work (Hystrix, and its successors) is famous, but the transferable part is the discipline behind it: for every dependency, someone decided in advance what the user sees when it fails. Personalisation down → show a generic popular-titles row. Artwork service down → default artwork. Nothing renders an error page. This is [graceful degradation](05-reliability-security-cost.md#q5-graceful-degradation) as a design requirement per call site rather than a nice-to-have.

**Prove the failover works by doing it constantly.** Chaos Monkey kills instances in production during business hours; Chaos Kong simulates the loss of an entire AWS region. The purpose isn't the tooling — it's that **regional evacuation is a routine, rehearsed procedure instead of a document nobody has executed.** Contrast with [Blueprint 30](#30-multi-region-active-active): an untested failover is a hypothesis.

**Precompute offline, serve online.** Recommendations are computed in large offline batch/ML pipelines and materialised into caches (EVCache, a multi-AZ replicated memcached layer); the online path is a lookup, not a model evaluation. Encoding likewise happens offline and elaborately — per-title and per-shot encoding ladders mean each title gets a bitrate ladder tuned to its own visual complexity, which cuts bandwidth for the same perceived quality.

**What generalises:** split workloads with different physics into different architectures; define the degraded response for every dependency; rehearse failure continuously rather than documenting it; and push heavy computation offline so the request path is a lookup.

---

## 37. Twitter/X — The Fanout Problem

**The scale.** Historically reported around 500M tweets/day (≈5.7K/s average, with a documented peak above 140K/s during a mass-participation TV moment), against timeline reads roughly two orders of magnitude higher. **The read:write ratio and the follower-graph skew are the entire problem.**

**The question this system is famous for:** when you post, how does it reach your followers' home timelines?

### The two options, and why the answer is both

| | **Fanout-on-write (push)** | **Fanout-on-read (pull)** |
|---|---|---|
| On post | Insert the tweet ID into every follower's timeline list | Do nothing |
| On read | One list read — fast | Query all followees, merge, sort — slow |
| Cost | O(followers) writes per post | O(followees) reads per timeline view |
| Breaks when | Someone has 100M followers | Everyone reads constantly (they do) |

Twitter's answer is the **hybrid**, and this is the single most transferable idea in the whole of Part D. Home timelines are precomputed by fanout-on-write into Redis lists holding roughly the last several hundred tweet IDs — so the common case is one memory read. Accounts above a follower threshold are **excluded from fanout**; at read time, the user's precomputed timeline is merged with the recent tweets of the celebrities they follow. A tweet from an account with 100M followers therefore costs zero fanout writes, and the merge cost is paid only by the relatively few timelines that need it.

**Snowflake IDs.** Twitter needed IDs that were unique across many machines with no coordination, roughly time-ordered (so a timeline sorts by ID and range queries work), and compact. Snowflake's 64-bit layout — timestamp | machine ID | per-machine sequence — delivers all three, and the pattern has been copied everywhere since. Reach for it whenever someone proposes a central auto-increment as a distributed system's ID source.

**The migration story.** The "fail whale" era ran on a Ruby on Rails monolith; the fix was decomposition onto the JVM with an in-house RPC stack, plus purpose-built storage. The lesson isn't "Rails doesn't scale" — it's that a monolith's *runtime* is rarely the binding constraint until a specific hot path (here, timeline fanout) needs a fundamentally different architecture. They rewrote the hot path, not the company.

**What generalises:** precompute for the common case and compute-on-read for the pathological tail — and expect the tail to exist, because every social graph is power-law distributed. The "celebrity problem" recurs in notifications, feeds, group chat, and any multi-tenant system with one giant tenant.

---

## 38. Instagram — Simplicity as a Scaling Strategy

**The scale.** Roughly 30M users at acquisition in 2012, run by **13 employees**. The engineering interest here is entirely in what they *didn't* build.

**The stack:** Django, PostgreSQL, Redis, Memcached, on EC2. No custom datastore, no service mesh, no microservices. Their publicly stated principle — do the simplest thing that works, and only replace it when measurements force you to — is the correct default and the hardest one to hold to.

### The two ideas worth stealing

**(a) Many logical shards, few physical machines.** Rather than sharding across the number of database servers they had, they created **several thousand logical shards** (as Postgres schemas) and mapped many of them onto each physical instance. Scaling then means *moving logical shards to new hosts* — a data movement with no application change and no re-hashing of user IDs. Contrast with sharding by `user_id % 8`: growing to 16 shards rehashes every row and requires downtime or an elaborate dual-write migration.

**This is the single most practical sharding lesson available.** Over-provision logical shards from day one (they cost nothing), and resharding becomes an ops task instead of a project.

**(b) Put routing information inside the ID.** Their ID generation ran inside Postgres and packed a 64-bit ID as roughly *41 bits of millisecond timestamp (custom epoch) | 13 bits of logical shard ID | 10 bits of per-shard sequence*. That gives IDs that are time-sortable, generated without a central coordinator, and **self-routing** — given only a photo ID you know which shard holds it, with no lookup table to keep consistent. Any system that shards should consider embedding the shard in the key.

**What generalises:** boring, well-understood technology plus two or three sharp ideas outperforms an ambitious platform; over-shard logically before you need to; make IDs carry their own routing; and headcount is a design constraint you can actively manage by refusing scope.

---

## 39. WhatsApp — Enormous Scale, Tiny Team

**The scale.** Publicly reported at roughly 450M users with about 32 engineers at acquisition (2014), and around 900M users with a team still in the low dozens a year later. That ratio — users per engineer — is the most extreme in the industry and it was achieved deliberately.

### How

**A runtime chosen to match the workload.** WhatsApp ran on **Erlang/OTP** (on FreeBSD, heavily tuned), and the fit is exact: the workload is millions of *mostly idle* persistent connections, each needing isolated, cheap, independently-failing state. Erlang's lightweight processes, per-process heaps (so no global GC pause), supervision trees and built-in distribution are precisely that shape. Their published milestone of over two million concurrent connections on a single server is a consequence of that fit, not of heroics.

The transferable point isn't "use Erlang" — it's that **the concurrency model is an architectural decision**. A million idle connections in a thread-per-connection runtime is a non-starter; the same workload on an event-loop or green-thread runtime is routine. This is the same class of decision as rejecting a garbage-collected runtime for a sub-50 ms bidder in [Blueprint 13](#13-real-time-bidding-ad-tech).

**Ruthless scope restraint.** No ads, no games, no platform, no feed. Every feature not built is code not written, servers not provisioned, incidents not had, and engineers not hired. **Feature restraint is an architectural strategy**, and it is the actual explanation for the headcount number that everyone quotes.

**Operational minimalism.** Few services, few moving parts, deep expertise in each. A small team can operate a simple system at enormous scale; no team can operate a complex one at that ratio.

**What generalises:** match the runtime's concurrency model to the connection model; count operational surface as a cost you pay forever; and remember that "how many engineers does this need to run?" is a legitimate architectural evaluation criterion — the one most designs never state.

---

## 40. Discord — Trillions of Messages

**The scale.** Publicly, trillions of stored messages, with individual channels in very large communities receiving extremely high message rates and being read by enormous numbers of users simultaneously.

**The evolution — a rare, well-documented three-step migration:** MongoDB → Cassandra (2017) → ScyllaDB (2022). Each move was forced by a specific, nameable failure, which is what makes it such good interview material.

### The design decision that matters most: the partition key

Messages are stored partitioned by **`(channel_id, time_bucket)`** — the channel plus a coarse time window — clustered by message ID. Two consequences:

- "Give me the recent messages in this channel" is a **single-partition range scan**, the cheapest possible query in a wide-column store.
- Partitions are **bounded in size**, because a busy channel rolls into a new bucket rather than growing without limit. An unbounded partition is the classic Cassandra-killer, and time-bucketing is the standard cure. Same technique as [Blueprint 28](#28-write-heavy-time-series-ingestion).

### Why Cassandra stopped working, and what replaced it

| Problem | Cause | Resolution |
|---|---|---|
| Latency spikes at the tail | JVM garbage collection pauses | ScyllaDB — C++, shard-per-core, no GC of this kind |
| Read performance degradation | **Tombstones** from deleted/edited messages accumulating and being scanned | Fewer nodes, different engine, compaction tuning |
| Hot partitions | A single very active channel concentrating load on one replica set | Time-bucketing + request coalescing in front |
| Operational cost | A large cluster demanding constant attention | Far fewer, larger, better-utilised nodes |

**Request coalescing is the transferable trick.** Discord placed data services (written in Rust) between the API and the database: when thousands of clients simultaneously request the same hot channel's messages, the service issues **one** database query and fans the single result out to all waiting callers. This is [singleflight](#27-read-heavy-content-delivery) applied at the service tier, and it converts a thundering herd on a viral channel into a single read.

**What generalises:** in a wide-column store the partition key *is* the design — get it wrong and no tuning saves you; bound partitions with time buckets; deletes are expensive in LSM stores and tombstones are a real capacity problem; garbage collection is a tail-latency property you must design around; and coalescing identical concurrent reads is one of the highest-leverage protections available for hot keys.

---

## 41. Amazon — The API Mandate & Blast Radius

**Two contributions here, one organisational and one technical, and both are architect-level material.**

### The API mandate (~2002)

Every team must expose its data and functionality **only** through service interfaces; no direct database access across teams; every interface must be designed as though it will be externalised. Combined with **two-pizza teams** and **"you build it, you run it"**, this is the [Inverse Conway Manoeuvre](#4-conways-law--team-topologies) executed at company scale — and it is what made AWS possible, since services already built to be externalisable turned out to be products.

**Why it's worth citing:** it's the clearest example of an *organisational* rule producing an architecture. Nobody drew a microservices diagram; they made cross-team database access impossible and the architecture followed. When an interviewer asks how you'd get teams to stop coupling, "change what's possible, not what's encouraged" is the answer this story supports.

### Dynamo, and availability as a business decision

The 2007 Dynamo paper (the ancestor of DynamoDB, Cassandra and Riak) introduced to mainstream practice: consistent hashing for partitioning, tunable quorums (N, R, W), vector clocks for conflict detection, hinted handoff and read repair for recovery. The framing that matters is the *why*: for a shopping cart, **rejecting a write is worse than accepting a conflicting one** — a customer who can't add to their cart is lost revenue, whereas a merge conflict can be resolved by keeping both items. AP over CP, chosen because of what the business loses in each failure mode, not because of a preference about consistency models.

### Cell-based architecture and shuffle sharding

Amazon's operational answer to blast radius: partition the *whole stack* into independent **cells**, each serving a subset of customers with its own capacity, and route customers to a cell. A bad deploy, a poison request or a hot tenant damages one cell, not the fleet. **Shuffle sharding** refines it — assign each customer a random *combination* of nodes so that any two customers rarely share their full set, meaning one abusive customer can degrade only the small overlap. See [the patterns guide](02-architecture-patterns.md#q16-cell-based-architecture).

**What generalises:** make the wrong thing impossible rather than discouraged; choose your CAP position from the cost of each failure to the business; and treat blast radius as a first-class design objective with cells as the mechanism.

---

## 42. Stripe — API Design as Architecture

**Why a payments API belongs in a scaling chapter:** Stripe's hardest constraints aren't throughput — they're **correctness under retry** and **never breaking a customer's integration**, across many years and many API changes. Both are solved architecturally, and both are directly reusable in almost any system you'll design.

### Idempotency keys

A client sends `Idempotency-Key: <uuid>` with a POST. The server records the key, the request fingerprint and the eventual response; a repeat of the same key returns the stored response instead of performing the action again. This is what makes a network timeout on a charge *safe* — the client retries, and either it reaches a server that has never seen the key (so the charge happens once) or one that has (so the original result is returned).

Three details that separate a correct implementation from a naive one, and that interviewers probe for:

- **Store the key inside the same transaction as the effect**, or a crash between them recreates the double-charge you were preventing.
- **Fingerprint the request body.** The same key with different parameters is a client bug and should be a hard error, not a silently-returned wrong response.
- **Handle concurrent duplicates**, not just sequential ones: two simultaneous requests with one key need a lock or a unique constraint so exactly one proceeds while the other waits or is rejected.

This is the same machinery as the consumer dedupe table in [Blueprint 22](#22-event-driven-order-processing), promoted to a public API contract.

### Version pinning with a transformation layer

Every account is **pinned to the API version it first used**; upgrading is an explicit, opt-in action. Internally, the core code works in one current shape, and requests and responses pass through a chain of **version transformations** — so a customer who integrated years ago still receives the shape they wrote against, without the core carrying years of conditionals.

The architectural insight: **compatibility is implemented as a layer at the edge, not as branching throughout the codebase.** That's the only version of "we never break customers" that stays maintainable, and it's the answer to "how do you evolve a public API?" — pin, transform, and deprecate on a published schedule.

**What generalises:** idempotency is an API design decision made before the first line of code; unsafe retries are the default state of every distributed system until you fix them; and edge-layer version transformation is how a public contract survives a decade of change.

---

## 43. Shopify — Pods, Cells & Black Friday

**The scale.** A very large multi-tenant commerce platform whose traffic is dominated by an extreme annual event: Black Friday/Cyber Monday concentrates a year's worth of peak into a weekend, with flash sales producing enormous, narrow spikes on individual shops.

### Two decisions worth citing

**(a) Pods — cell-based architecture in a multi-tenant product.** Shops are assigned to **pods**: isolated units each with their own database, cache and workers. A pod failure affects only the shops in it; capacity is added by adding pods; and a single shop's flash sale is contained. Compared with one enormous shared database, this converts a global availability problem into a bounded one, and it gives a natural unit for capacity planning, migration and regional placement.

Notice this is [Blueprint 11](#11-multi-tenant-saas-platform)'s tiering plus [Amazon's cells](#41-amazon--the-api-mandate--blast-radius): **tenant → cell routing decided at the edge**, with the routing map as globally replicated data. Getting that routing layer in on day one — even when there's only one pod — is what makes the model available later without rewriting every query.

**(b) The modular monolith, at very large scale.** Shopify is well known for keeping a large Rails monolith and investing heavily in *componentisation* — enforced internal boundaries, explicit interfaces between components, and tooling that fails the build on illegal cross-component dependencies — rather than splitting into microservices. It is the highest-profile counterexample to "scale requires microservices", and the correct citation when an interviewer assumes decomposition is inevitable. The relevant guide section is [the modular monolith](02-architecture-patterns.md#q2-the-modular-monolith); the transferable claim is that **the boundaries deliver most of the benefit, and the network calls deliver most of the cost.**

**Preparing for a known spike** is also instructive as a general practice: load test at multiples of expected peak against production-like data, pre-scale rather than trusting autoscaling to react to a step function, exercise queueing and shedding paths deliberately, and freeze changes around the event. Autoscaling handles gradual growth; **a step change needs pre-provisioning**, and knowing the difference is a practical operations answer.

**What generalises:** cells bound blast radius and give you a scaling unit; a well-enforced modular monolith is a legitimate large-scale architecture; and predictable peaks are a capacity-planning problem, not an autoscaling one.

---

## 44. Dropbox — Magic Pocket & Leaving the Cloud

**The story.** Dropbox originally stored file blocks on Amazon S3. Over roughly two and a half years they built **Magic Pocket**, their own multi-region exabyte-class storage system, and migrated the overwhelming majority of their data — publicly discussed as around 500 PB — onto their own hardware, using custom erasure coding and high-density (including SMR) drives.

**Why this is worth knowing:** it is the best-documented case of **build-vs-buy flipping at extreme scale**, and it's a counterweight to the reflex that owning infrastructure is always a mistake.

### What made it the right call for them — and the conditions you must check

| Condition | Dropbox | Most companies |
|---|---|---|
| Volume large enough to amortise a dedicated team | Hundreds of petabytes | No |
| Access pattern stable and well understood | Yes — block storage, known read/write mix | Often still changing |
| Storage is the dominant line item | Yes — it was *the* cost | Rarely |
| Able to fund years of engineering before payback | Yes | Rarely |
| Metadata already separated from blocks | Yes — only the block layer moved | Varies |

That last row is the underrated design lesson: because the **metadata layer and the block layer were already separate**, they could replace one without touching the other. An architecture with clean seams is what makes a change of this size possible at all — the same property that makes [hexagonal boundaries](#20-layered--hexagonal-business-service) worth having.

They also kept S3 in the picture for some regions and workloads rather than treating the migration as absolute, and the rollout was incremental with verification against the old system — the [strangler fig](02-architecture-patterns.md#q14-strangler-fig--migrating-a-monolith) applied to storage.

**What generalises:** managed services are the right default and stay right for a long time; the crossover is real but requires unusual volume, a stable access pattern, and patience; and the ability to make the move at all is bought years earlier by keeping a clean seam at the layer you might one day replace.

---

## 45. What Breaks at Each Order of Magnitude

The most useful thing to carry out of Part D is a sense of *sequence* — what actually fails next, so you neither over-build nor get surprised. Scale here is loose (users and RPS vary by workload); the ordering is what's reliable.

| Scale | Architecture that's correct | What breaks next | What you add |
|---|---|---|---|
| **~1K users, ~10 RPS** | One app server, one database, one machine | Nothing. Genuinely nothing | Backups you have actually restored from |
| **~10K–100K, ~100 RPS** | App servers behind a load balancer, managed DB, CDN for static assets | Database CPU from N+1 queries; a slow endpoint blocking the pool | Query profiling, indexes, a cache, a background job queue |
| **~1M, ~1K RPS** | Read replicas, Redis, async workers, modular monolith | **Single-primary write throughput**; deploys becoming risky; jobs starving the web tier | Split read/write paths, separate worker fleet, feature flags, real observability |
| **~10M, ~10K RPS** | Extracted services for the hot paths, event backbone, purpose-built stores | **Schema migrations on huge tables**; cache stampedes; hot partitions; one team as a bottleneck | Sharding (logical shards!), the outbox, online migration tooling, team-aligned service boundaries |
| **~100M, ~100K RPS** | Multi-region or cells, per-domain teams, custom infrastructure where justified | **Organisational coordination**; cost; tail latency; blast radius | Cells, platform team, contract governance, FinOps, chaos testing |

**The three sentences this table earns you:**

1. *"At your current scale the correct architecture is X; the thing that will break next is Y; so the one investment I'd make now is Z."* — the most valuable sentence in a system design interview.
2. *"Most of these problems are solved by a bigger machine until roughly the 1M mark, and vertical scaling is the cheapest engineering you will ever do."*
3. *"Notice that above 10M the failures stop being technical and start being organisational."*

**The cross-cutting pattern:** every jump is survived by *separating things that were previously fused* — reads from writes, background from foreground, hot paths from cold, one team's data from another's. Scaling is mostly the disciplined application of separation, applied one order of magnitude at a time.

---

## 46. Bangladesh Context — Local Scaling Constraints

Local interviews frequently ask for a global design and then apply local constraints, or ask directly about bKash/Nagad, Pathao, Daraz, Shohoz, Chaldal, Toffee or bdjobs-class systems. The constraints below are *design considerations for building here*, not claims about any company's internals.

**Network reality drives the client contract more than the server design.** A large share of traffic is mobile on 3G/4G with high latency, packet loss, and metered, expensive data. The consequences are concrete: minimise payload size (this matters more than server CPU), design for **offline-first** with local queueing and later sync, make **every write idempotent** because connections drop mid-request and clients will retry, use aggressive compression and image transcoding, and prefer a single composite endpoint over a chatty sequence of calls — which is exactly the argument for a mobile [BFF](#21-microservices--api-gateway--bff).

**Payments are an integration architecture problem.** MFS rails (bKash, Nagad, Rocket), cards, and cash-on-delivery all coexist, each with its own latency, failure modes and reconciliation model. The architectural requirements that follow: an anti-corruption layer per provider so their quirks don't leak into your domain; a **saga** for anything spanning payment and fulfilment ([Blueprint 23](#23-saga-orchestrated-distributed-transaction)); idempotency keys on every provider call; a durable ledger ([Blueprint 24](#24-cqrs--event-sourcing-ledger)); and — the part teams underestimate — a **daily reconciliation job against provider settlement files**, with a break-investigation queue. COD adds a physical-world settlement flow with its own lifecycle and its own losses.

**Regulation is architectural.** Bangladesh Bank / BFIU expectations around KYC tiers and transaction limits, AML monitoring and reporting, audit retention, and data localisation are design-time constraints, not a pre-audit checklist — see [§10](#10-compliance--regulatory-architecture). Tiered limits in particular belong in the domain model (a `KycTier` value object gating transaction commands), not in scattered `if` statements.

**Traffic shape is spiky and predictable.** Eid and Pohela Boishakh commerce peaks, salary-day MFS spikes, iftar-time food-delivery surges in Ramadan, and cricket-driven streaming peaks are *known* events. That makes them a pre-provisioning problem, as in [Shopify's](#43-shopify--pods-cells--black-friday) case: load test against production-like data, pre-scale rather than trusting reactive autoscaling, rehearse the shedding path, and freeze changes during the window.

**Infrastructure and delivery.** Weigh in-country hosting or local POPs against regional cloud (Singapore/Mumbai are the usual latency anchors) — and if data localisation applies, that decision is made for you and must be enforced at the routing layer. CDN presence and peering quality with local ISPs affects perceived performance more than most backend optimisations you could make.

**Two dependencies worth designing around explicitly:** SMS/OTP delivery (variable latency and delivery rates across operators — support multiple providers with failover, and offer an alternative verification path), and third-party logistics APIs (frequently the least reliable dependency in the system — circuit-break them, queue the work, and never let a courier API outage block order placement).

**The framing that lands:** *"the architecture is the same as anywhere; what changes is where I spend the budget — payload size and retry-safety over server CPU, integration resilience and reconciliation over raw throughput, and pre-provisioning for known cultural peaks over reactive autoscaling."*

---

## Quick Reference

**The architect's three axes — apply to every decision:** technical (does it work?), organisational (can our teams build and run it?), business (what does it cost and unlock?).

**Documents and when:**
```
RFC  → before a decision, to gather input and surface disagreement early
ADR  → records the decision, its rejected alternatives, and its consequences
Postmortem → after an incident: timeline, contributing factors, owned actions
Reference architecture → the blessed pattern for a class of problem
Runbook → what to do at 3 a.m., written before 3 a.m.
```

**The thirteen blueprints, one line each** ([chooser table](#33-choosing-the-right-blueprint)):
```
20 Hexagonal service   domain core + ports + adapters; one use case = one transaction
21 Gateway + BFF       gateway = generic cross-cutting; BFF = client-specific aggregation
22 Event-driven        outbox → Kafka (keyed) → idempotent consumers → retry topic → DLQ
23 Saga                orchestrated state machine, durable, idempotent compensations
24 CQRS + ES           append-only event store, version check, snapshots, rebuildable projections
25 Streaming           event time + watermarks + allowed lateness; Kappa by default
26 Serverless          presigned upload → queue → function; deterministic output keys
27 Read-heavy          layered caches, key design, singleflight, TTL jitter, stale-while-revalidate
28 Time-series         batch everything, LSM store, partition by (series, time), cap cardinality
29 Workflow            durable execution, deterministic body, human tasks, version pinning
30 Multi-region        home-region write ownership; replicate per data class; rehearse failover
31 AuthN/AuthZ         OIDC + PKCE, short JWT + rotating refresh, local PDP, RBAC→ReBAC
32 Data platform       CDC → bronze/silver/gold on Iceberg; contracts, quality gates, lineage
```

**The three questions that select a blueprint:** what's the read:write ratio? does the write need an authoritative answer now? does one operation span more than one owner of data?

**Case studies — the one transferable idea from each** ([Part D](#part-d--real-systems--scaling-stories)):
```
URL shortener  leased ID blocks + obfuscation; never write on the redirect path
Uber           H3 hexagons; hot state in RAM; batched matching beats greedy; 2,200 services → DOMA
Netflix        define the degraded response per dependency; rehearse region evacuation
Twitter/X      fanout-on-write for most, fanout-on-read for celebrities — always the hybrid
Instagram      thousands of logical shards on few machines; put the shard ID inside the ID
WhatsApp       match the runtime's concurrency model to the connection model; restraint scales
Discord        the partition key is the design; time-bucket to bound it; coalesce hot reads
Amazon         make coupling impossible, not discouraged; cells and shuffle sharding for blast radius
Stripe         idempotency keys stored in the same transaction; version pinning + edge transformation
Shopify        pods = cells for tenants; a modular monolith is a legitimate large-scale architecture
Dropbox        build-vs-buy flips only at extreme volume — and only if you kept a clean seam
```

**What breaks next, by scale:** ~100K → DB CPU and N+1s · ~1M → single-primary writes and deploy risk · ~10M → migrations, stampedes, hot partitions · ~100M → organisational coordination and cost. Every jump is survived by **separating things that were fused**.

**Organisational frames worth naming by name:** Conway's Law and the Inverse Conway Manoeuvre; Team Topologies (stream-aligned / platform / enabling / complicated-subsystem) and cognitive load; one-way vs two-way doors; Choose Boring Technology and innovation tokens; golden paths, paved not enforced.

**Answers that mark you as an architect:**
- "What problem is this solving?" — before proposing anything.
- "That's technically right but organisationally impossible with four teams."
- "This is a two-way door — let's decide it in ten minutes and move on."
- "The half-migrated state is the real risk; here's how we avoid stalling there."
- "The isolation model is a pricing decision expressed as architecture."
- "I'd rather be multi-region on one cloud than multi-cloud, unless a regulator requires it."
- "Let's spend our innovation budget on the recommendation engine and take the boring path everywhere else."
- "Here's what would make me reverse this decision."

**Answers that mark you as not:** proposing microservices without asking about team structure; presenting one option as the only option; describing a target architecture with no migration path; treating compliance as a checklist for later; and saying "best practice" without saying whose practice, at what scale, solving what problem.
