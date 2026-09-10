# Non-Functional Architecture: Reliability, Security & Cost — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A on the cross-cutting concerns that separate senior from architect
> **Last Updated:** 2026-08-06

---

## In 60 seconds

1. **100% reliability is the wrong target.** It costs infinitely more than 99.9% and buys
   nothing users notice. Pick a number, justify it, and spend the difference elsewhere. Saying
   this out loud is a lead-level signal.
2. **Each extra nine costs roughly ten times more.** 99% = 7.2 hours down per month. 99.9% = 43
   minutes. 99.99% = 4.3 minutes. Know these numbers.
3. **Availability multiplies across dependencies.** Five services at 99.9% each, all required,
   gives you 99.5% — worse than any individual part. Reducing hard dependencies improves
   reliability more than making each one better.
4. **Design for graceful degradation, not perfection.** When recommendations are down, show
   popular items. A partly working product beats an error page, and proposing this unprompted
   marks you out.
5. **Security is layered, not a wall.** Assume any single control fails. Least privilege, defence
   in depth, and blast-radius thinking apply to every design you present.
6. **Cost is a design constraint, especially in your market.** Being able to say *"this shape
   costs roughly $X a month, and here is the cheaper one"* is a genuine differentiator in BD
   rounds where budgets are tight.

**The interview trap to expect:** "how would you make this highly available?" A weak answer
lists redundancy. A strong one asks what the availability *target* is and what the business
cost of downtime is, then designs to that — because "highly available" is not a specification.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Availability** | The share of time the system works. Expressed in nines |
| **The nines** | 99% ≈ 7.2h/month down · 99.9% ≈ 43min · 99.99% ≈ 4.3min |
| **SLI / SLO / SLA** | The measurement · your target · the contract |
| **Error budget** | The failure your SLO allows, spent deliberately on risk |
| **Redundancy** | Spare capacity so one failure is survivable |
| **Failover** | Switching to the standby |
| **Active-active / active-passive** | Both serving · one waiting |
| **Multi-region** | Copies in different geographies. Expensive; usually for latency or law |
| **Graceful degradation** | Losing a feature instead of the whole product |
| **Blast radius** | How much breaks when this one thing fails |
| **Bulkhead** | Isolating resources so one failure cannot exhaust everything |
| **Chaos engineering** | Deliberately breaking things in production to find weaknesses first |
| **Defence in depth** | Layered controls, assuming each may fail |
| **Least privilege** | The minimum access needed, nothing more |
| **Zero trust** | Verify every request, even inside your own network |
| **Threat model** | Systematically asking who would attack this, and how |
| **TCO** | Total Cost of Ownership — including the engineers who operate it |
| **Reserved / spot instances** | Cheaper capacity, in exchange for commitment · for interruptibility |
| **Egress cost** | Data leaving the cloud. Frequently the surprise on the bill |
| **FinOps** | Treating cost as an engineering metric with an owner |

---

## Table of Contents

### Part A — Reliability Engineering
1. [SLIs, SLOs, SLAs & Error Budgets](#q1-slis-slos-slas--error-budgets)
2. [Burn Rate Alerting](#q2-burn-rate-alerting)
3. [Disaster Recovery: RPO & RTO](#q3-disaster-recovery-rpo--rto)
4. [Multi-Region Architecture](#q4-multi-region-architecture)
5. [Graceful Degradation](#q5-graceful-degradation)
6. [Chaos Engineering](#q6-chaos-engineering)
7. [Capacity Planning](#q7-capacity-planning)
8. [Deployment Safety](#q8-deployment-safety)
9. [Incident Management & Postmortems](#q9-incident-management--postmortems)

### Part B — Security Architecture
10. [Zero-Trust Architecture](#q10-zero-trust-architecture)
11. [OAuth2 & OIDC Flows](#q11-oauth2--oidc-flows)
12. [Service Identity & mTLS](#q12-service-identity--mtls)
13. [Secret Management](#q13-secret-management)
14. [Threat Modelling with STRIDE](#q14-threat-modelling-with-stride)
15. [Encryption & Key Management](#q15-encryption--key-management)
16. [Multi-Tenancy Isolation](#q16-multi-tenancy-isolation)

### Part C — Cost & Performance Architecture
17. [Cost Modelling & FinOps](#q17-cost-modelling--finops)
18. [Latency Budgets](#q18-latency-budgets)
19. [Build vs Buy](#q19-build-vs-buy)
20. [Quick Reference](#quick-reference)

---

# Part A — Reliability Engineering

## Q1: SLIs, SLOs, SLAs & Error Budgets

### Q: Define them and explain how they relate.

**A:**

| Term | Definition | Example |
|---|---|---|
| **SLI** — indicator | A *measured* number describing service quality | "Proportion of HTTP requests completing < 300 ms with a non-5xx status" |
| **SLO** — objective | Your internal target for that SLI | "99.5% of requests over a rolling 28 days" |
| **SLA** — agreement | A contractual promise with financial consequences | "99.0% monthly, or 10% credit" |
| **Error budget** | `100% − SLO` — the failure you're *allowed* | 0.5% of 28 days ≈ 3.4 hours |

**The relationships that matter:**
- **SLA < SLO, always.** Your internal target is stricter than your promise, so you have room to react before you owe money. If they're equal, every SLO breach is a contractual breach.
- **The error budget is a currency.** It converts an argument ("ship faster" vs "be more stable") into arithmetic. Budget remaining → ship features, take risks, deploy on Friday. Budget exhausted → the team freezes feature work and spends the sprint on reliability. This depersonalises the eternal product-vs-SRE conflict, which is the real reason the practice exists.
- **100% is the wrong target.** It's unachievable (your dependencies aren't 100%), it removes all room to ship, and users can't tell the difference between 99.99% and 100% because their own network is less reliable than that.

### Q: How do you choose good SLIs?

**A:** Measure what the **user experiences**, not what's easy to instrument. CPU utilisation is not an SLI — nobody's experience is degraded by 80% CPU.

The standard categories:

| Type | SLI | Typical SLO |
|---|---|---|
| **Availability** | successful requests / total valid requests | 99.9% |
| **Latency** | requests faster than a threshold / total | 99% < 300 ms |
| **Quality** | requests served with full (non-degraded) functionality | 99% full fidelity |
| **Freshness** | data younger than N seconds / total reads | 99% < 60 s stale |
| **Correctness** | records processed without error | 99.99% |
| **Coverage** | records successfully processed / records submitted | 99.9% |

**Details that show experience:**
- **Measure as close to the user as possible.** Server-side latency omits DNS, TLS, network and client render time. Real-user monitoring tells a different — and truer — story than your load balancer metrics.
- **Use a threshold, not an average.** "Average latency 200 ms" hides that 5% of users wait 4 seconds. `< 300 ms` as a *ratio* is a proper SLI; a mean is not.
- **Exclude invalid traffic** from the denominator (malformed requests, requests from a client you've deprecated), or bots will burn your budget.
- **Set the SLO from what users need**, then check you can meet it — not from what you currently achieve, which just enshrines the status quo.
- **Percentiles compose badly.** A p99 of 100 ms per service does *not* give a p99 of 100 ms for a five-service chain; the chance of hitting at least one slow hop rises with each hop. Measure end to end.

---

## Q2: Burn Rate Alerting

### Q: Why alert on burn rate instead of on individual failures?

**A:** Because alerting on "any 5xx" produces noise that trains people to ignore pages, while alerting only on "SLO breached" tells you after it's too late. **Burn rate** is the rate at which you're consuming the error budget, normalised so that `1.0` means you'd exhaust exactly the budget over the full window.

```
burn rate = (observed error ratio) / (1 − SLO)

SLO 99.9% → budget = 0.1% errors
observed 1% errors → burn rate = 10  → you'll exhaust a 30-day budget in 3 days
```

**Multi-window, multi-burn-rate alerting** (the Google SRE recommendation) uses fast and slow windows in combination so you catch both severe short outages and slow leaks, without paging on brief blips:

| Severity | Burn rate | Long window | Short window (to confirm) | Budget consumed | Action |
|---|---|---|---|---|---|
| **Page** | 14.4× | 1 hour | 5 min | 2% in 1h | Wake someone up |
| **Page** | 6× | 6 hours | 30 min | 5% in 6h | Wake someone up |
| **Ticket** | 3× | 1 day | 2 hours | 10% in 1d | Handle in business hours |
| **Ticket** | 1× | 3 days | 6 hours | 10% in 3d | Handle in business hours |

The short window is a confirmation gate: it requires the problem to still be happening *now*, so an alert that has already resolved doesn't page anyone.

```promql
# Fast-burn page: 14.4x over 1h AND still burning over 5m
(
  sum(rate(http_requests_total{status=~"5.."}[1h]))
  / sum(rate(http_requests_total[1h]))       > (14.4 * 0.001)
)
and
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))       > (14.4 * 0.001)
)
```

**Alerting philosophy to state:** every page must be **actionable, urgent and novel**. If the responder's action is "acknowledge and go back to sleep", delete the alert. Track your **alert-to-incident ratio** — if most pages aren't incidents, you have an alerting problem that will eventually cause a missed real incident.

---

## Q3: Disaster Recovery: RPO & RTO

### Q: Define RPO and RTO, and map them to strategies.

**A:**
- **RPO (Recovery Point Objective)** — how much *data* you can afford to lose, measured in time. RPO of 5 minutes means the last 5 minutes of writes may be gone.
- **RTO (Recovery Time Objective)** — how long you can afford to be *down* before service is restored.

| Strategy | RPO | RTO | Cost | How it works |
|---|---|---|---|---|
| **Backup & restore** | Hours | Hours–days | $ | Periodic snapshots to another region; rebuild on demand |
| **Pilot light** | Minutes | 10s of minutes | $$ | Data replicated continuously; minimal compute idle, scaled up on failover |
| **Warm standby** | Seconds | Minutes | $$$ | A scaled-down but running copy; scale up and shift traffic |
| **Active-active (hot)** | ~Zero | Seconds | $$$$ | Both regions serve live traffic; failover is a routing change |

**The framing that lands:** RPO and RTO are **business decisions, not engineering decisions.** Ask "what does an hour of downtime cost, and what does losing an hour of transactions cost?" then buy the cheapest architecture that meets it. Engineers often over-engineer DR because nobody asked the business the question. For a BD e-commerce platform, four hours of downtime overnight is survivable; for a payment switch, four minutes isn't.

**Things that make DR real rather than theoretical:**
- **Test the restore, on a schedule.** A backup that has never been restored is a hypothesis. Time the restore — teams routinely discover their 1-hour RTO is actually 9 hours because the restore of a 2 TB database takes that long.
- **Back up the ability to deploy**, not just the data: infrastructure-as-code, container images in a second region's registry, secrets replicated, DNS access. A common failure is having the data and being unable to stand up anything to serve it.
- **Protect against logical corruption, not just infrastructure loss.** Replication faithfully replicates a `DELETE FROM users`. You need point-in-time recovery, and immutable/object-locked backups that ransomware or a compromised admin credential cannot delete.
- **The 3-2-1 rule** — 3 copies, 2 media types, 1 offsite (and increasingly 1 immutable).
- **Document and rehearse the runbook.** A DR plan nobody has executed under time pressure will not work at 3 a.m.

---

## Q4: Multi-Region Architecture

### Q: What are the multi-region patterns and where does each break?

**A:**

| Pattern | Writes | Reads | Complexity | Real issue |
|---|---|---|---|---|
| **Single region + backups** | One region | One region | Low | Regional outage = full outage |
| **Active-passive** | Primary only | Primary (or stale replicas) | Medium | Failover is a rare, risky, untested path |
| **Read-local, write-global** | One region | Local replicas everywhere | Medium | Replica lag visible to users; cross-region write latency |
| **Active-active, partitioned** | Each region owns a partition of users | Local | High | Cross-partition operations; user relocation |
| **Active-active, full replication** | Any region | Any region | **Very high** | **Write conflicts** — needs CRDTs or a consensus store |

**The physics you can't escape:** a synchronous cross-region write costs the RTT. Dhaka↔Singapore is ~50 ms, Singapore↔us-east-1 is ~200 ms. Any design requiring synchronous global consensus on the write path adds that to every write, permanently. This is why Spanner's global transactions are impressive and expensive, and why most systems partition by user home region instead.

**The pattern that usually wins: partitioned active-active.** Each user has a home region; their writes go there and stay there; other regions hold read-only replicas. There's no conflict to resolve because there's only one writer per record. Cross-region interactions (a user in one region messaging a user in another) go through async replication. Add data residency and this is also the compliance answer.

**The details people forget:**
- **Failover must be tested regularly** — ideally by making it routine (regularly shifting traffic between regions as an exercise), because a path exercised once a year in an emergency will fail.
- **DNS TTL bounds your RTO.** A 300 s TTL means up to 5 minutes of clients hitting the dead region even after you flip the record. Use health-check-driven routing and short TTLs on the failover record specifically.
- **Failing back is harder than failing over** — the passive region has now accumulated writes the primary doesn't have.
- **Split brain across regions** during a partition — both regions think the other is dead. Needs a tiebreaker in a third location, or an explicit human-in-the-loop decision for the rare case.
- **Cost:** double the infrastructure plus cross-region data transfer, which is one of the most expensive line items in cloud billing.

---

## Q5: Graceful Degradation

### Q: How do you design a system that degrades instead of failing?

**A:** Decide, in advance and per feature, what "degraded" means — then make the degraded path a first-class code path that's actually tested, not an exception handler nobody has run.

**A worked example for an e-commerce product page:**

| Dependency | Fails | Degraded behaviour | Acceptable? |
|---|---|---|---|
| Product DB | Down | Serve from cache, even stale | Yes — critical path preserved |
| Recommendations | Down | Hide the section entirely | Yes — nobody notices |
| Reviews | Down | Show "reviews unavailable" | Yes |
| Inventory | Down | Show the product, confirm stock at checkout | Yes |
| Pricing | Down | **Fail the request** — never guess a price | No degradation possible |
| Payments | Down | Block checkout with a clear message + retry | No — but fail honestly |

The pricing row is the important one: **not everything can degrade.** Serving a stale price is worse than an error. Knowing which dependencies are load-bearing is the substance of this question.

**The mechanisms:**
- **Feature flags with a kill switch** — turn off the expensive feature under load, in seconds, without a deploy. Fetch flags with a local cache and a safe default so the flag service itself isn't a new dependency that can take you down.
- **Tiered functionality** — full → reduced (no personalisation) → read-only → static maintenance page. Know how to get to each level.
- **Load shedding with priority** — under overload, drop batch and anonymous traffic first, keep authenticated checkout traffic. Implement as an admission controller at the gateway that sheds by request class when a queue-depth or latency threshold is crossed.
- **Timeouts + fallback values** — every non-critical dependency call has a short timeout and a defined fallback.
- **Static fallback** — serve a cached/static version from the CDN when origin is entirely unavailable. `stale-if-error` in `Cache-Control` does this automatically.

**The senior insight to state:** availability isn't binary. A checkout that works while recommendations are down is a 99.9% *checkout* SLO even if the recommendations service was down for six hours. Define SLOs per user journey, not per service, and design the dependency graph so the critical journeys have the fewest hard dependencies.

---

## Q6: Chaos Engineering

### Q: What is chaos engineering and how do you introduce it responsibly?

**A:** The discipline of running controlled experiments that inject failure into a system to build confidence in its resilience — verifying that the fallbacks, timeouts and alerts you *believe* exist actually work.

**The method is an experiment, not vandalism:**
1. **Define steady state** with a business metric (orders/minute, successful logins/sec) — not CPU.
2. **Hypothesise:** "If the recommendation service returns 500s, checkout throughput stays within 2% of steady state and no alert fires."
3. **Inject the smallest realistic failure**, in production if you can, on the smallest blast radius (one instance, 1% of traffic, one AZ).
4. **Measure.** Did the hypothesis hold? Did the *right* alert fire, at the right time?
5. **Fix what you found**, then increase scope.

**Failures worth injecting**, roughly in order of what they catch:

| Injection | What it usually finds |
|---|---|
| **Added latency** (not errors) on a dependency | Missing timeouts — the highest-yield experiment by far |
| Dependency returns errors | Missing fallbacks; cascading failure |
| Kill an instance | Broken graceful shutdown; in-flight request loss |
| Kill an AZ | Hidden single-AZ resources; capacity that can't absorb the shift |
| DNS failure | Hardcoded IPs; no cached resolution |
| Clock skew | Token validation failures; ordering bugs |
| Cache flush | Whether the DB survives a cold cache — the metastable failure test |
| Disk full / CPU throttle | Resource limits and eviction behaviour |

**Latency injection deserves the emphasis:** most systems handle a dependency returning an error (someone wrote a try/catch); very few handle a dependency taking 30 seconds to return an error, because that requires a timeout that someone had to configure deliberately. Slow is worse than down, and injecting slowness is how you find out.

**Prerequisites before you start** — say these, because "we ran chaos experiments before we had observability" is how you cause an incident rather than prevent one: solid monitoring (you must be able to *see* the impact), a tested rollback/abort switch, business-hours scheduling with the team watching, stakeholder awareness, and starting in staging to build the muscle.

**Game days** — scheduled, human-in-the-loop exercises where you simulate a major incident end to end. These test the *organisational* response: does the on-call know the runbook, can they find the dashboard, does the escalation path work, is the status page updated? Usually more valuable than the technical findings.

---

## Q7: Capacity Planning

### Q: How do you plan capacity?

**A:** Four inputs, then arithmetic:

1. **Current usage** — actual peak QPS, p99 latency, resource utilisation per instance.
2. **Growth forecast** — from the business, not extrapolated from a chart. Include known events: a marketing campaign, Eid shopping season, a new market launch.
3. **Per-unit capacity** — determined by load testing, not by guessing. "One instance handles 800 rps at 70% CPU with p99 under 200 ms."
4. **Headroom** — target 50–70% utilisation at peak. The gap absorbs traffic spikes, instance failures, and the extra load during a deploy.

```
Required instances = (peak QPS × growth factor) / (per-instance capacity × target utilisation)
                   = (12,000 × 1.5) / (800 × 0.6)
                   = 18,000 / 480 ≈ 38 instances
Plus N+1 per AZ for failure tolerance → round to 42 across 3 AZs
```

**Load testing done properly:**
- **Test types:** load (expected peak), stress (find the breaking point — you need to know where it is), soak (hours, to find memory leaks and connection leaks), spike (instantaneous 10×, to test autoscaling reaction time).
- **Use an open-model generator** (k6, wrk2, Gatling) that sends at a fixed *arrival rate* regardless of responses. Closed-model tools that wait for a response before sending the next request suffer **coordinated omission** — when the system stalls they stop sending, so the reported latency is wildly optimistic.
- **Test with realistic data volumes.** A query that's fast on 10K rows is not fast on 100M.
- **Test the whole path** including cache-cold behaviour, since that's the state you'll be in after an incident.

**Autoscaling — the details that matter:**
- **Scale on the right signal.** CPU is a poor proxy for an I/O-bound Node.js service. Prefer requests-per-instance, queue depth, or consumer lag. KEDA scales Kubernetes workloads directly on Kafka lag or SQS depth, which is exactly right for consumers.
- **Scale-up fast, scale-down slow.** Aggressive scale-down causes flapping and cold starts.
- **Mind the warm-up time.** If an instance takes 3 minutes to become useful (image pull, JIT warm-up, connection pool, cache fill) and your spike arrives in 30 seconds, autoscaling will not save you — you need pre-provisioned headroom or predictive scaling for known events.
- **Set a maximum.** An autoscaling group with no ceiling and a runaway retry loop is an unbounded bill.
- **The database usually can't autoscale with you.** 200 new app instances each opening 20 connections will exhaust Postgres' connection limit. Use a connection pooler (PgBouncer, RDS Proxy) and cap per-instance pool size — this is one of the most common real-world scaling failures.

---

## Q8: Deployment Safety

### Q: Compare deployment strategies.

**A:** Since most incidents are caused by changes, deployment strategy *is* reliability strategy.

| Strategy | Mechanism | Rollback | Cost | Risk |
|---|---|---|---|---|
| **Recreate** | Stop old, start new | Redeploy old | Low | Downtime |
| **Rolling** | Replace instances in batches | Roll forward/back gradually | Low | Both versions live simultaneously |
| **Blue-green** | Full parallel environment, switch traffic at once | **Instant — flip back** | 2× infra during deploy | All users hit the new version at once |
| **Canary** | 1% → 10% → 50% → 100%, watching metrics | Stop and revert the small % | Low | Needs good metrics and automation |
| **Shadow / dark launch** | Mirror real traffic to the new version, discard responses | N/A — no user impact | Extra compute | Doesn't test writes safely |
| **Feature flags** | Deploy dormant code, enable per cohort | Toggle off, no deploy | Flag debt | Untested flag combinations |

**Canary + feature flags is the modern default**, because it separates two things that shouldn't be coupled: **deployment** (getting code onto servers — should be frequent, boring, automated) and **release** (exposing behaviour to users — should be gradual, measurable, instantly reversible).

**Automated canary analysis** is what makes canary safe at scale: compare the canary's error rate, latency percentiles and key business metrics against the baseline, and auto-rollback on a statistically significant regression. Without automation, a canary is just a slower way to break production while everyone is in a meeting.

**Requirements for any of this to work:**
- **Backward-compatible database migrations** — the expand/contract pattern. Add a nullable column, deploy code that writes both old and new, backfill, deploy code that reads new, then drop the old column in a *later* release. Never a destructive migration in the same deploy as the code that depends on it, because rollback becomes impossible.
- **Backward-compatible APIs and event schemas** — during a rolling deploy, v1 and v2 run simultaneously and must interoperate.
- **Graceful shutdown** — on SIGTERM: stop accepting new work, fail readiness so the load balancer deregisters you, finish in-flight requests, close connections, exit. Missing this means every deploy returns 5xx to some users.

---

## Q9: Incident Management & Postmortems

### Q: How do you run an incident?

**A:** With defined roles, so that nobody is simultaneously debugging and writing status updates:

- **Incident Commander** — owns coordination and decisions. Does *not* debug. This is the role people skip and it's the one that matters most.
- **Operations/Tech Lead** — the person actually investigating and making changes.
- **Communications Lead** — status page, stakeholders, support team.
- **Scribe** — timestamped log of what was observed and what was done, which becomes the postmortem timeline.

**Severity levels** must be defined in advance with expected response times, so nobody argues about severity during an incident.

**The priority order during an incident: mitigate first, diagnose later.** Roll back, fail over, shed load, flip the flag — restore service, *then* find the root cause. Engineers instinctively want to understand before acting; the discipline is to reverse that. The most common mitigation is "roll back the most recent change", and it should be the first thing tried.

### Q: What makes a postmortem useful?

**A:** **Blamelessness is not politeness — it's an information-gathering strategy.** In a blaming culture people hide details, and you lose the information you need to actually fix the system. If an engineer could run a command that took production down, the finding is "that command had no guardrail", not "that engineer was careless."

**Structure:**
1. **Summary** — what happened, impact in user terms (not "the service was degraded" but "12% of checkouts failed for 43 minutes"), duration.
2. **Timeline** — detection, escalation, mitigation, resolution, with timestamps.
3. **Impact** — users affected, revenue, SLO budget consumed.
4. **Root cause** — usually multiple contributing factors, not one. Use **5 Whys**, but resist stopping at "human error", which is never a root cause. Consider a causal-tree approach for complex incidents.
5. **What went well** — genuinely useful; it identifies which safeguards worked and should be extended.
6. **Action items** — each with an **owner and a due date**, tracked in the normal backlog. A postmortem with no owned action items is a diary entry.

**The metrics to track over time:** MTTD (detect), MTTA (acknowledge), MTTR (resolve), and change failure rate. Most improvement usually comes from reducing MTTD — teams are typically fast at fixing and slow at noticing.

**Three questions worth asking in every postmortem:**
- Could we have detected this faster? (→ an SLI or alert gap)
- Could we have mitigated it faster? (→ a runbook, a flag, or a rollback gap)
- What else in the system has this same weakness? (→ the highest-value question, because it turns one incident into N prevented incidents)

---

# Part B — Security Architecture

## Q10: Zero-Trust Architecture

### Q: What is zero trust and what does it change architecturally?

**A:** Abandon the perimeter model ("inside the network is trusted"). Instead: **never trust, always verify** — every request is authenticated and authorised regardless of origin, and network location grants no privilege.

The perimeter model fails because once an attacker is inside — via a phished credential, a compromised dependency, or an SSRF — they move laterally without further checks. Most large breaches are lateral movement stories.

**What it means concretely:**

| Principle | Implementation |
|---|---|
| Verify explicitly | Authenticate every request: user identity (OIDC) **and** workload identity (mTLS) |
| Least privilege | Scoped, short-lived credentials; just-in-time elevation; no standing admin |
| Assume breach | Micro-segmentation, blast radius limits, encrypt everything in transit |
| Continuous verification | Re-evaluate on each request, not once at login; device posture and risk signals |
| Explicit authorisation | A policy engine (OPA, Cedar) decides; services don't hardcode rules |

**For a backend architecture this means:** service-to-service calls carry a verifiable workload identity (SPIFFE ID via mTLS) *and* propagate the end-user identity separately; network policies default-deny and are opened per service pair; there's no "internal API with no auth"; and access to production data is brokered, time-bound and audited rather than granted by VPN membership.

---

## Q11: OAuth2 & OIDC Flows

### Q: Explain the OAuth2 flows and when each is correct.

**A:** First, the distinction people get wrong: **OAuth2 is authorisation** (granting an app limited access to a resource on your behalf); **OIDC is authentication** (proving who you are), layered on top of OAuth2 via the `id_token`. Using a plain OAuth2 access token as proof of identity is a known anti-pattern — the token was issued to an app, not as an identity assertion, and it may have been obtained for a different audience.

| Flow | Use case | Status |
|---|---|---|
| **Authorization Code + PKCE** | Web apps, SPAs, mobile — everything with a user | **The correct default for all client types** |
| **Client Credentials** | Machine-to-machine, no user | Correct for service-to-service |
| **Device Authorization** | TVs, CLIs, input-constrained devices | Correct for its niche |
| **Refresh Token** | Obtaining new access tokens | Correct, with rotation |
| ~~Implicit~~ | SPAs, historically | **Deprecated** — token in the URL fragment, leaks via history/referrer |
| ~~Resource Owner Password~~ | First-party apps | **Deprecated** — the app handles the password; blocks MFA and federation |

**Authorization Code + PKCE, step by step:**

```
1. Client generates:  code_verifier = random(64 bytes)
                      code_challenge = BASE64URL(SHA256(code_verifier))

2. Browser → Auth Server:
   GET /authorize?response_type=code&client_id=…&redirect_uri=…
       &scope=openid profile orders:read&state=<csrf>
       &code_challenge=<challenge>&code_challenge_method=S256

3. User authenticates + consents

4. Auth Server → Browser redirect:  <redirect_uri>?code=<auth_code>&state=<csrf>
   Client MUST verify `state` matches → CSRF protection

5. Client → Auth Server (back channel, POST):
   grant_type=authorization_code&code=<auth_code>&code_verifier=<verifier>
   Auth server checks SHA256(verifier) == stored challenge

6. Auth Server → Client:  { access_token, id_token, refresh_token, expires_in }
```

**What PKCE actually prevents:** an authorization-code interception attack. On mobile, a malicious app can register the same custom URL scheme and steal the code from the redirect. Without PKCE it could exchange that code for tokens. With PKCE it can't, because it doesn't have the `code_verifier` — only the app that started the flow does. PKCE is now recommended for *all* clients including confidential ones.

**Token handling in practice:**
- **Access tokens short-lived** (5–15 min), because JWTs can't be revoked mid-flight. The short TTL *is* the revocation mechanism.
- **Refresh tokens rotated** on each use, with **reuse detection** — if an old refresh token is presented again, assume theft and revoke the entire token family.
- **Storage:** never `localStorage` for tokens in a browser (XSS reads it trivially). Use an httpOnly, Secure, SameSite cookie, ideally with the BFF pattern holding tokens server-side and issuing the browser only a session cookie.
- **Validate properly** at the resource server: signature against the JWKS endpoint (cached, with rotation support), `iss`, `aud`, `exp`, `nbf`, and the required `scope`. **Never accept `alg: none`,** and pin the expected algorithm — the classic JWT vulnerability is a library that trusts the header's `alg` field.
- **JWT vs opaque tokens:** JWTs are stateless and fast to validate (no network call) but can't be revoked before expiry. Opaque tokens require introspection (a network call per request, cacheable) but are revocable instantly. A common answer: JWTs for access with a short TTL, opaque refresh tokens stored server-side.

---

## Q12: Service Identity & mTLS

### Q: How do services authenticate each other?

**A:** **Mutual TLS** — both sides present certificates during the handshake, so each cryptographically proves its identity. This replaces "it came from inside the VPC so it must be fine", which is not an authentication mechanism.

**SPIFFE/SPIRE** standardises workload identity. Each workload gets a **SPIFFE ID** — `spiffe://prod.example.com/ns/payments/sa/payment-processor` — delivered as a short-lived X.509 certificate (an SVID), automatically issued and rotated (often hourly) based on attestation of what the workload actually is (its Kubernetes service account, its node, its process attributes). No long-lived secrets to leak, and identity is bound to workload properties rather than to a file someone copied.

A service mesh gives you mTLS transparently — the sidecars handle the handshake and rotation, and the application code makes plain HTTP calls. That's the single strongest argument for adopting a mesh.

**Two identities, both needed:** the *workload* identity (which service is calling) and the *user* identity (on whose behalf). Propagate the end-user context in a signed token, not just a header — otherwise a compromised service can impersonate any user by setting `X-User-Id`. **Token exchange** (RFC 8693) lets a service swap the incoming user token for a downstream-scoped one, so the payments service receives a token scoped to payments rather than the user's full-access token.

---

## Q13: Secret Management

### Q: How do you manage secrets properly?

**A:** The hierarchy, worst to best:

| Approach | Verdict |
|---|---|
| Hardcoded in source | Never. Assume any secret ever committed is compromised, even after a force-push |
| `.env` file in the image | Bad — it's in every layer of the image and every registry copy |
| Environment variables from a platform secret store | Acceptable baseline — but visible in `/proc`, crash dumps and process listings |
| Mounted files from a secret store (tmpfs) | Better — not in the environment, revocable, rotatable |
| **Fetched at runtime from a broker with a short-lived token** | Best — Vault/Secrets Manager with dynamic, expiring credentials |

**Dynamic secrets are the meaningful upgrade:** rather than one long-lived database password shared by every instance forever, the service authenticates to Vault with its workload identity and receives a **database credential generated on the spot with a 1-hour lease**. If it leaks it expires; rotation is automatic; and every credential is attributable to a specific workload and time, which makes the audit log actually useful.

**Kubernetes specifics worth knowing:** a plain `Secret` is only base64-encoded, not encrypted, and is readable by anyone with `get secrets` in the namespace. Enable **encryption at rest** for etcd, use RBAC to restrict secret access, and prefer the **External Secrets Operator** or **Secrets Store CSI Driver** to sync from a real secret manager rather than storing secrets in Git. For GitOps, **Sealed Secrets** or **SOPS** lets you commit encrypted secrets safely.

**Also:** scan for committed secrets in CI (gitleaks, trufflehog) *and* as a pre-commit hook; rotate on a schedule and on every person's departure; and never log secrets — redact by allowlist in your logger, because a denylist will miss the new field someone added last week.

---

## Q14: Threat Modelling with STRIDE

### Q: How do you threat model a system?

**A:** Four questions (Shostack's framework): *What are we building? What can go wrong? What are we going to do about it? Did we do a good job?*

Draw a data flow diagram with **trust boundaries** (internet↔DMZ, DMZ↔internal, app↔database, your code↔third party), then walk each element with **STRIDE**:

| Threat | Violates | Example | Mitigation |
|---|---|---|---|
| **S**poofing | Authentication | Forged JWT; impersonating a service | Strong auth, mTLS, signature verification |
| **T**ampering | Integrity | Modifying a price in a client request; MITM | TLS, signed payloads, server-side validation, integrity checks |
| **R**epudiation | Non-repudiation | "I never authorised that transfer" | Immutable audit logs, signed receipts |
| **I**nformation disclosure | Confidentiality | IDOR exposing another user's order; verbose errors | Authorisation checks, encryption, generic error messages |
| **D**enial of service | Availability | Expensive query; unbounded upload; ReDoS | Rate limiting, quotas, timeouts, input size caps |
| **E**levation of privilege | Authorisation | Path to admin via a missing role check | Least privilege, deny-by-default, centralised authz |

**The highest-yield finding in almost every real API is under I and E:** **broken object-level authorisation** (IDOR) — the endpoint checks that you're logged in but not that the resource belongs to you. `GET /api/orders/12345` returning someone else's order is #1 on the OWASP API Security Top 10 and it's a one-line omission. The structural fix is to make authorisation impossible to forget: scope every query by the caller's tenant/user at the repository layer, so `findOrder(id)` becomes `findOrder(id, ctx.userId)` and there is no unscoped variant to accidentally call.

**When to threat model:** at design time for anything new touching money, PII or authentication; when adding a trust boundary; and after any incident. Keep it to a 90-minute session with a diagram and a prioritised list — a threat model that takes three weeks won't be repeated.

---

## Q15: Encryption & Key Management

### Q: Cover encryption at rest, in transit, and in use.

**A:**

**In transit** — TLS 1.2 minimum, prefer 1.3; HSTS with preload; internal traffic encrypted too (zero trust); certificate automation (ACME/cert-manager) because expired certificates are a top-five cause of self-inflicted outages.

**At rest** — full-disk/volume encryption is table stakes and protects against physical media theft only. It does *not* protect against an attacker with database access — a SQL injection reads plaintext through the database engine. For sensitive fields you need **application-level (field) encryption**, where the data is encrypted before it reaches the database.

**Envelope encryption** is the standard pattern and worth being able to explain:
```
KMS holds the Customer Master Key (CMK) — never leaves the HSM
  ↓ generateDataKey
Data Encryption Key (DEK): returned as { plaintext, encrypted-under-CMK }
  ↓
Encrypt the field with the plaintext DEK (fast, local, AES-GCM)
Store: { ciphertext, encrypted_DEK, key_id, iv, auth_tag }
Discard the plaintext DEK from memory
  ↓ on read
Send encrypted_DEK to KMS → get plaintext DEK → decrypt (cache the DEK briefly)
```
Why this shape: you never send the data to KMS (fast, no size limit, no per-byte cost), rotating the CMK only requires re-encrypting the small DEKs, and every decryption is auditable through KMS logs. It also enables **crypto-shredding** — destroy a per-tenant or per-user DEK and their data is permanently unrecoverable everywhere it was copied, including immutable backups and event logs. That's the practical answer to GDPR erasure in an append-only architecture.

**In use** — confidential computing (SGX, AMD SEV, Nitro Enclaves) keeps data encrypted in memory; homomorphic encryption allows computation on ciphertext. Both are niche and slow; know they exist, and know that "encryption in use" usually means "we minimise the window where plaintext exists in memory."

**Key management rules:** separate the key store from the data store (a single compromise shouldn't yield both), rotate on a schedule and after any suspected exposure, keep old key versions to decrypt old data, and enforce least-privilege on key usage with separate permissions for encrypt vs decrypt — the encrypt-only permission is a genuinely useful primitive for write-heavy services.

**Hashing ≠ encryption:** passwords are hashed with **Argon2id** (or bcrypt/scrypt), never encrypted, never a bare SHA-256. Tune the work factor to ~100–250 ms on your hardware and re-tune periodically.

---

## Q16: Multi-Tenancy Isolation

### Q: Compare multi-tenancy isolation models.

**A:**

| Model | Isolation | Cost/tenant | Noisy neighbour | Ops |
|---|---|---|---|---|
| **Shared everything** (tenant_id column) | Logical only | Lowest | High | Easiest — one schema to migrate |
| **Schema per tenant** | Medium | Low | Medium | Migrations × N schemas |
| **Database per tenant** | Strong | Medium | Low | Migrations × N databases; connection sprawl |
| **Full stack per tenant (silo)** | Complete | Highest | None | N deployments |

**The pragmatic answer for most SaaS:** shared everything with **row-level security enforced at the database**, not just in application code.

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- set per request/transaction, from the validated token — never from a header
SET LOCAL app.tenant_id = '…';
```
The reason to push it into the database: one forgotten `WHERE tenant_id = ?` in one query is a cross-tenant data breach, and code review will eventually miss one. RLS makes the safe path the default and the unsafe path impossible. Pair it with a **pooled connection caveat** — with PgBouncer in transaction mode you must use `SET LOCAL` inside the transaction, or settings leak between tenants, which is precisely the bug you were trying to prevent.

**A tiered model is common and worth proposing:** pooled/shared for the free and standard tiers, dedicated database or full silo for enterprise customers who pay for it and demand it for compliance. This is a business decision that shows up directly in architecture — and it's a good example of the architect-level habit of tying technical structure to commercial structure.

**Noisy neighbour mitigation in a pooled model:** per-tenant rate limits and quotas, per-tenant query timeouts, resource caps on background jobs, monitoring per tenant so you can see who's causing the problem, and the ability to move a heavy tenant to dedicated infrastructure without a code change — which means the sharding/routing layer needs to exist from day one even if every tenant starts in the same place.

---

# Part C — Cost & Performance Architecture

## Q17: Cost Modelling & FinOps

### Q: How do you think about cloud cost as an architect?

**A:** Cost is a non-functional requirement with the same standing as latency. The architect's job is to know the *unit economics*: **cost per user, per request, per tenant, per GB stored**. Without that, you can't tell whether the bill growing is healthy (more customers) or a problem (an efficiency regression), and you can't price the product.

**The four cost drivers:**

| Driver | Where it hides |
|---|---|
| **Compute** | Overprovisioned instances; idle non-production environments; per-invocation serverless at high volume |
| **Storage** | Old data never tiered; snapshots nobody deletes; log retention set to "forever"; 3× replication of cold data |
| **Network** | **Egress to the internet; cross-AZ traffic; NAT gateway data processing** |
| **Managed services** | Per-request pricing at scale; provisioned capacity you don't use |

**Cross-AZ and egress deserve emphasis** because they're the ones that surprise teams. Cross-AZ traffic is billed in both directions and a chatty microservice mesh spread across three AZs can generate a five-figure monthly line item from traffic that looks free. NAT gateway processing charges catch teams whose private-subnet services pull large container images or call S3 without a VPC endpoint. Both are architectural, not operational: AZ-aware routing (prefer a same-AZ endpoint when healthy) and a gateway VPC endpoint for S3 fix them.

**The purchasing levers:**

| Option | Discount | Trade-off |
|---|---|---|
| On-demand | 0% | Full flexibility |
| Savings Plans / Reserved | 30–70% | 1–3 year commitment |
| **Spot** | **70–90%** | Can be reclaimed with ~2 min notice |
| Graviton/ARM | 20–40% better price-performance | Must support the architecture (Node.js does) |

**Spot is the biggest single lever** for anything fault-tolerant: batch jobs, CI runners, stateless workers, Kafka consumers, transcoding fleets. Run them on spot with on-demand as a fallback capacity provider, handle the termination notice by draining gracefully, and diversify across instance types so a single-type shortage doesn't reclaim your whole fleet.

**FinOps as a practice:** allocate costs by tag to a team/product (untagged resources are unowned resources), make the cost visible to engineers in the tools they already use, set anomaly alerts, and review the top-10 line items monthly. The cultural point is that engineers optimise what they can see; a bill that only Finance looks at will never improve.

**In a Bangladesh cost context** — a genuinely differentiating answer: right-size aggressively rather than defaulting to large instances; use spot for everything batch; keep non-production environments on a schedule (off nights and weekends is a ~65% saving on those environments alone); prefer managed services that scale to zero for low-traffic internal tools; consider a regional CDN so repeat egress is cheap; and honestly evaluate a VPS provider (DigitalOcean, Hetzner, Linode) for predictable workloads where the AWS premium buys nothing you're using. The architect skill is knowing when the managed-service premium is worth it (you're buying back engineer time you don't have) and when it isn't (a stable workload where you're paying 4× for elasticity you never use).

---

## Q18: Latency Budgets

### Q: What is a latency budget and how do you allocate one?

**A:** Start from the user-facing target and divide it across the call chain, so every component has a number it must meet and you can see immediately where you have no room.

```
Target: p99 < 300 ms for the product page API

  CDN / edge                      10 ms
  TLS + LB                        10 ms
  API gateway (authn/authz)       15 ms
  BFF orchestration overhead      10 ms
  ├─ product service              40 ms   ┐
  ├─ pricing service              30 ms   │ PARALLEL — budget = max(40, 30, 25) = 40 ms
  └─ inventory service            25 ms   ┘
  serialization + response        15 ms
  ─────────────────────────────────────
  total                          100 ms   → 200 ms of headroom for variance & retries
```

**The rules that make budgets useful:**
- **Fan out in parallel, not serially.** Three serial 40 ms calls cost 120 ms; in parallel they cost 40 ms. This is usually the single largest available win and it's often free (`Promise.all`).
- **Percentiles don't add — they compound.** If each of five services has a p99 of 40 ms, the chain's p99 is much worse than 200 ms, because the probability of hitting *at least one* slow call rises with each hop. The practical implication: reduce the *number* of hops, not just each hop's latency. This is a strong argument against deep service chains.
- **Set timeouts from the budget**, decreasing down the chain, so no inner call can outlive the outer request.
- **Measure at the client**, since the user's experience includes DNS, TLS, network and rendering — often more than your entire server-side budget.
- **Geography first.** If the user is 250 ms away, no amount of backend optimisation matters; you need edge caching or a regional presence. Establish this before optimising code.

---

## Q19: Build vs Buy

### Q: How do you make a build-vs-buy decision?

**A:** Start with the DDD subdomain classification: **core → build; supporting → build simply or buy; generic → buy.** Then do a TCO analysis over 3 years, because the naive comparison (license cost vs zero) is always wrong.

**The true cost of "build":**

| Cost | Often forgotten? |
|---|---|
| Initial engineering (person-months × loaded cost) | No |
| Ongoing maintenance (~20–30%/yr of build cost) | **Yes** |
| On-call burden and incident load | **Yes** |
| Security patching and compliance | **Yes** |
| Documentation and onboarding | **Yes** |
| Opportunity cost of not building the core product | **Yes — usually the largest term** |

**The true cost of "buy":** license/usage fees at *projected* scale (check the pricing curve — many tools are cheap at pilot volume and brutal at production volume), integration effort, vendor lock-in and exit cost, data residency and compliance fit, vendor viability, and the operational risk of a dependency whose incidents you cannot fix.

**The heuristics that produce the right answer most of the time:**
- **Never build authentication, payments, or email delivery.** These are generic subdomains with mature vendors, hostile security surfaces, and enormous compliance burdens. Building your own OAuth server or PCI-scoped card storage is a classic career-defining mistake.
- **Never buy your core differentiator.** If the thing customers pay you for is your matching algorithm, you cannot outsource the matching algorithm.
- **Buy first, build later if the economics invert.** Many teams have moved off a vendor once usage made in-house cheaper — that's a *good* outcome, because you validated the need before investing.
- **Weigh time-to-market heavily early.** A startup that spends four months building what it could have bought in a week has spent its runway on a non-differentiator.
- **Have an exit story.** Wrap the vendor behind your own interface (an ACL/adapter) so switching is a new adapter, not a rewrite. This is hexagonal architecture paying rent.

**Present the decision as an ADR**, with the options considered, the criteria, the decision, and the consequences you're accepting — that framing is exactly what an architect interview is looking for.

---

## Quick Reference

**Reliability:**
```
SLI = measured ratio · SLO = target · SLA = contract (always looser than SLO)
Error budget = 100% − SLO. Spend it on shipping; exhausted → freeze and fix.
Burn rate = observed error ratio / (1 − SLO). Page at 14.4× (1h) and 6× (6h).
DR: backup&restore → pilot light → warm standby → active-active  (RPO/RTO ↓, cost ↑)
Untested backup = no backup. Untested failover = no failover.
```

**Security defaults:**

| Concern | Default |
|---|---|
| User auth | OIDC, Authorization Code + PKCE, short-lived access token, rotating refresh with reuse detection |
| Service auth | mTLS with SPIFFE identity, issued and rotated by the platform |
| Authorisation | Deny by default; scope every query by tenant at the data layer; RLS in Postgres |
| Secrets | Dynamic, short-lived, from a broker; never in Git; scanned in CI |
| Sensitive fields | Envelope encryption with per-subject DEKs (enables crypto-shredding) |
| Passwords | Argon2id, tuned to ~100–250 ms |
| Threat modelling | STRIDE per trust boundary, at design time, 90 minutes |

**Cost levers, biggest first:** right-size and set autoscaling floors → spot for anything fault-tolerant → storage tiering and retention policies → kill idle non-production → eliminate cross-AZ chatter and NAT/egress → commit (Savings Plans) once the baseline is stable → Graviton/ARM.

**Lines that signal architect-level thinking:** "RPO and RTO are business decisions — what does an hour of downtime cost?"; "not everything can degrade, and pricing is one of them"; "the error budget converts the reliability argument into arithmetic"; "network location isn't an authentication mechanism"; "we should know our cost per tenant"; "wrap the vendor behind our own interface so switching is an adapter, not a rewrite."
