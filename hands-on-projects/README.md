# Hands-On Projects — Which One to Build

> The plan schedules **one** build, across four sessions (days 11, 18, 21 and 25). This page
> helps you pick which one, and explains why building beats reading at this point in the sprint.

## In 60 seconds

1. **You are building one project, not seven.** One finished repo with a real README beats
   four half-built ones — a hiring manager will click the worst one you have.
2. **The project is not practice. It is evidence.** It becomes a Selected Work line on your
   resume, a pinned repo on GitHub, and the thing you walk someone through in a follow-up call.
3. **Pick by what your resume is thinnest on**, not by what interests you most. Interest is
   cheap; a closed gap is not.
4. **Ship thin on day 11.** One endpoint, one real test, CI green, a README that states the
   problem. The link is CV-usable that same day, and the next three sessions deepen it.
5. **The README is scored more than the code.** State the problem, the architecture in five
   sentences, and one decision with its trade-off. That last paragraph is what gets you the
   call.
6. **These walkthroughs are references, not tutorials to copy.** Read the architecture section,
   then build it your own way. Copying produces a repo you cannot defend.

---

## Choose by the gap you are closing

| If your weakest evidence is… | Build | Why |
|---|---|---|
| **AI / LLM — nothing on your CV** | *A small RAG service* (not listed below — see the note) | The biggest gap in your profile for the 2026 remote market. Two days of work closes it |
| **Event-driven at scale** | [02 — Event-Driven Order Processing](02-event-driven-order-processing.md) | Saga, outbox, idempotency. The patterns most asked about in senior backend rounds |
| **Real-time / your differentiator** | [01 — Realtime Notification System](01-realtime-notification-system.md) or [03 — GraphQL Subscription Chat](03-graphql-subscription-chat.md) | Closest to your telecom-scale experience — every part becomes a defensible resume bullet |
| **AWS / serverless / cost** | [04 — Serverless GraphQL API on AWS](04-serverless-graphql-api-aws.md) | AppSync and Lambda are on your CV. This makes that claim checkable |
| **Deployment / "can you ship it?"** | [05 — Dockerise NestJS, deploy to ECS](05-dockerize-nestjs-deploy-ecs.md) | The most immediately useful. Multi-stage builds, zero-downtime deploys |
| **Kubernetes — theory only** | [06 — Kubernetes on Minikube with NGINX Ingress](06-kubernetes-minikube-nginx-ingress.md) | Six hours of `kubectl` beats any amount of reading. Break it deliberately |
| **Observability / SRE language** | [07 — Monitoring & Alerting Setup](07-monitoring-alerting-setup.md) | The cheapest project here and it buys the most credibility. Lets you talk about SLOs from experience |

> **On the RAG service:** the plan's day-11 task suggests it as the default, and it is a good
> default *because* the AI/LLM section of your bullet bank is empty. The material is in
> [../phase-2-apis-realtime-systems/06-ai-llm-integrations.md](../phase-2-apis-realtime-systems/06-ai-llm-integrations.md).
> Build it over this repo's own guides and the README can honestly discuss chunking, cost,
> latency and how you tested non-deterministic output.

---

## All seven, at a glance

| # | Project | Stack | Build time | Core lesson |
|---|---|---|---|---|
| 1 | [Realtime Notification System](01-realtime-notification-system.md) | NestJS · Kafka · Redis · WebSocket · Postgres | 10–12h | Fan-out, idempotency, per-channel circuit breakers |
| 2 | [Event-Driven Order Processing](02-event-driven-order-processing.md) | NestJS · Kafka · Postgres · Redis | 8–10h | Saga and compensating transactions |
| 3 | [GraphQL Subscription Chat](03-graphql-subscription-chat.md) | NestJS · Apollo · Redis Pub/Sub · Postgres | 6–8h | Why subscriptions break on a second server |
| 4 | [Serverless GraphQL API on AWS](04-serverless-graphql-api-aws.md) | AppSync · Lambda · DynamoDB · Cognito · CDK | 8–10h | Single-table design and what it actually costs |
| 5 | [Dockerise NestJS → ECS](05-dockerize-nestjs-deploy-ecs.md) | Docker · ECR · ECS Fargate · ALB · RDS | 6–8h | Multi-stage builds, zero-downtime deploys |
| 6 | [Kubernetes on Minikube](06-kubernetes-minikube-nginx-ingress.md) | Minikube · Helm · NGINX Ingress | 6–8h | Probes, requests vs limits, reading failures |
| 7 | [Monitoring & Alerting](07-monitoring-alerting-setup.md) | Prometheus · Grafana · Loki · AlertManager | 5–6h | Golden signals, SLOs, error budgets |

---

## The four build sessions

The plan spreads one project across four days. Each has a different job.

| Session | Day | Goal |
|---|---|---|
| **Build 1/4** | 11 | Walking skeleton. Repo public, one endpoint, one real test, CI green, README stating the problem. **Ship it thin — the link is usable today** |
| **Build 2/4** | 18 | The core feature, with tests that mean something. Integration tests against a real dependency, not mocks of your own code |
| **Build 3/4** | 21 | Observability and a cost number. What does this cost to run at 10× traffic? |
| **Build 4/4** | 25 | Publish it and put it to work. Screenshot in the README, pin it on GitHub, add the resume bullet |

**The discipline that matters:** finish thin before going deep. A repo that does one thing
completely, with tests and a real README, outscores an ambitious half-built system every time —
and it is the same judgement a take-home is testing. See
[../phase-0-online-assessments/09-take-home-assignments.md](../phase-0-online-assessments/09-take-home-assignments.md).

---

## What makes the repo count

From [../resume/02-linkedin-and-profiles.md](../resume/02-linkedin-and-profiles.md#7-making-two-repos-count):

| Counts | Does not count |
|---|---|
| A README explaining the problem, design, and trade-offs | `npm install && npm start` |
| Commits spread over time with real messages | One "initial commit" of 8,000 lines |
| Tests that actually run | A `tests/` folder with a placeholder |
| A decision you can defend | A tutorial you followed |

Every README must contain: a one-line description, a screenshot or diagram, the problem it
solves, how to run it, the architecture in brief, and **one decision with its trade-off.**

That last item is the one that converts. It is also the written-English evidence the market
analysis says you are missing.

---

## Related

- [../phase-0-online-assessments/09-take-home-assignments.md](../phase-0-online-assessments/09-take-home-assignments.md) — the same skills, under someone else's clock
- [../resume/02-linkedin-and-profiles.md](../resume/02-linkedin-and-profiles.md) — turning the repo into Selected Work
- [../phase-1-core-programming/04-testing-and-quality.md](../phase-1-core-programming/04-testing-and-quality.md) — what "tests that mean something" means
- [../phase-2-apis-realtime-systems/06-ai-llm-integrations.md](../phase-2-apis-realtime-systems/06-ai-llm-integrations.md) — material for the RAG default
