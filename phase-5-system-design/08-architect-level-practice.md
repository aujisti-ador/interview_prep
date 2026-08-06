# Architect-Level Practice & Technical Leadership

> **Target Role:** Senior / Lead Backend Engineer → Architect
> **Format:** Governance practices, organisational design, and combined HLD+LLD+org problems
> **Last Updated:** 2026-08-06

At this level the questions stop being "can you design it?" and become "can you decide it, justify it to three audiences, and live with the consequences for four years?"

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
19. [Quick Reference](#quick-reference)

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
