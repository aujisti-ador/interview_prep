--
-- PostgreSQL database dump
--

\restrict AfHhN0Zpwh31wvS5TpdtodbkgT0jM0WvSmpnMVPKPK8C0cINL4IRRJgrbXszMPk

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Application; Type: TABLE DATA; Schema: public; Owner: jobcracker
--



--
-- Data for Name: DrillAttempt; Type: TABLE DATA; Schema: public; Owner: jobcracker
--



--
-- Data for Name: ProblemAttempt; Type: TABLE DATA; Schema: public; Owner: jobcracker
--



--
-- Data for Name: ProblemStatus; Type: TABLE DATA; Schema: public; Owner: jobcracker
--



--
-- Data for Name: Profile; Type: TABLE DATA; Schema: public; Owner: jobcracker
--

INSERT INTO public."Profile" (id, name, headline, "yearsExperience", "targetRoles", "targetMarkets", "primaryStack", "startDate", "dailyMinutesTarget", notes, "updatedAt") VALUES (1, 'Fazle Rabbi Ador', 'Senior / Lead Backend Engineer — Node.js · NestJS · TypeScript · AWS · Kafka', 6, '{"Senior Backend Engineer","Lead Backend Engineer","Backend Architect"}', '{Bangladesh,"International remote (EU/US)"}', '{Node.js,NestJS,TypeScript,PostgreSQL,Redis,Kafka,RabbitMQ,"AWS Serverless",Docker,Kubernetes,GraphQL}', '2026-08-10 23:11:10.624', 210, 'Seeded from the interview_prep repo (Banglalink BL-Power notifications at 41M subscribers, Right Tracks live streaming with Agora, Daraz voucher system). Edit anything here that is out of date — nothing else in the app depends on it being exactly right.', '2026-08-10 23:11:10.624') ON CONFLICT DO NOTHING;


--
-- Data for Name: QuizSession; Type: TABLE DATA; Schema: public; Owner: jobcracker
--

INSERT INTO public."QuizSession" (id, mode, topics, total, score, "durationSec", detail, "createdAt") VALUES ('f2d51dd8-1107-49a0-8a43-9ed106799308', 'topic', '{"System Design"}', 8, 7, 173, '[{"id": "sd-1", "ref": "phase-5-system-design/01-system-design-fundamentals.md", "given": 1, "right": true, "topic": "System Design", "correct": 1, "options": ["~120/s", "~1,200/s", "~12,000/s", "~120,000/s"], "question": "Roughly how many requests per second is 100 million requests per day?", "explanation": "100M / 86,400 ≈ 1,157/s average. Peak is usually 2-3x that. Being fast and confident with this arithmetic buys you enormous credibility."}, {"id": "sd-2", "ref": "", "given": 1, "right": true, "topic": "System Design", "correct": 1, "options": ["Draw the architecture", "Clarify functional and non-functional requirements and agree on scale numbers", "Choose a database", "Discuss sharding"], "question": "What should you do in the first five minutes of a design round?", "explanation": "Candidates who draw boxes in minute two nearly always design the wrong system. Requirements first, always."}, {"id": "sd-3", "ref": "phase-4-cloud-infrastructure/07-performance-engineering.md", "given": 1, "right": true, "topic": "System Design", "correct": 1, "options": ["5% more database load", "Roughly 20x database load — usually an outage", "Nothing, the CDN absorbs it", "Latency improves"], "question": "A read-heavy service with a 95% cache hit rate loses its cache. What happens?", "explanation": "Going from 5% to 100% of reads hitting the database is a 20x multiplier. This is why cache warming and request coalescing matter."}, {"id": "sd-4", "ref": "", "given": 3, "right": false, "topic": "System Design", "correct": 1, "options": ["Make hashing faster", "Minimise how many keys move when a node is added or removed", "Guarantee uniqueness", "Encrypt keys"], "question": "Consistent hashing exists primarily to:", "explanation": "With modulo hashing, adding one node remaps almost every key. Consistent hashing moves roughly 1/N. Virtual nodes then even out the distribution."}, {"id": "sd-5", "ref": "", "given": 1, "right": true, "topic": "System Design", "correct": 1, "options": ["Static assets", "Highly personalised, per-user dynamic responses", "Video segments", "Public API responses with long TTLs"], "question": "When is a CDN NOT the right answer?", "explanation": "Per-user content has a cache hit rate near zero at the edge. Edge compute or regional caching is the alternative."}, {"id": "sd-6", "ref": "", "given": 1, "right": true, "topic": "System Design", "correct": 1, "options": ["Write-behind (async flush)", "Write-through — write cache and store synchronously before acknowledging", "Fire and forget", "Cache-aside with TTL"], "question": "Which write pattern gives the strongest durability guarantee to the client?", "explanation": "Write-behind is faster but loses data on a crash between acknowledge and flush. State the trade-off explicitly."}, {"id": "sd-7", "ref": "", "given": 1, "right": true, "topic": "System Design", "correct": 1, "options": ["\"I would use microservices.\"", "\"Here is the trade-off, and here is why I chose this side of it.\"", "\"That depends.\"", "\"We would need more data.\""], "question": "The single most useful sentence in a design round is:", "explanation": "Senior interviews grade reasoning, not recall. Name the alternative you rejected and why."}, {"id": "sd-8", "ref": "", "given": 1, "right": true, "topic": "System Design", "correct": 1, "options": ["~0.5 µs", "~0.5 ms", "~5 ms", "~50 ms"], "question": "Approximate latency of a round trip within the same datacentre?", "explanation": "Same-DC RTT is roughly half a millisecond; cross-continent is 100-150ms. These numbers anchor every capacity argument you make."}]', '2026-08-11 04:34:16.568') ON CONFLICT DO NOTHING;


--
-- Data for Name: Skill; Type: TABLE DATA; Schema: public; Owner: jobcracker
--

INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('node-internals', 'Node.js internals (event loop, streams, workers)', 'Language & Runtime', 5, 5, 4, 'The single most reliable filter question for a Node senior. Phase order, microtask draining, and when to reach for worker threads.', 'Explain what happens to 10k open sockets when one handler does a 200ms CPU-bound loop, and how you would fix it.', 'phase-1-core-programming/02-nodejs-fundamentals.md', -1, '', '2026-08-11 21:10:41.353') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('typescript-depth', 'TypeScript (advanced types)', 'Language & Runtime', 4, 5, 4, 'Every serious Node job posting in 2026 says TypeScript. Generics, conditional types and discriminated unions are what separate "writes TS" from "designs TS APIs".', 'Be able to write a generic repository type and explain why a discriminated union beats optional fields for a result type.', 'phase-1-core-programming/01-javascript-typescript-deep-dive.md', -1, '', '2026-08-11 21:10:41.349') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('nestjs', 'NestJS (DI, pipeline, microservices)', 'Language & Runtime', 4, 3, 5, 'Strong in the BD market and in EU agencies. Lower demand in US startups, which skew to Express/Fastify — do not lead with the framework there, lead with the architecture.', 'Guard vs interceptor vs pipe, and the cost of request-scoped providers.', 'phase-1-core-programming/03-nestjs-mastery.md', -1, '', '2026-08-11 21:10:41.355') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('testing', 'Testing strategy (unit, integration, contract)', 'Language & Runtime', 3, 5, 3, 'Take-home assignments are graded on tests more than on features. This is where BD candidates most often lose remote offers.', 'A take-home repo with meaningful integration tests using testcontainers, plus a README explaining what you chose not to test.', 'phase-1-core-programming/04-testing-and-quality.md', -1, '', '2026-08-11 21:10:41.357') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('dsa-patterns', 'DSA pattern recognition under time', 'Problem Solving', 3, 5, 2, 'The online assessment is the gate you cannot talk your way through. This is the highest-leverage gap for an experienced architect.', 'Two mediums solved in under 45 minutes total, cold, with clean code and stated complexity.', 'practice', -1, '', '2026-08-11 21:10:41.358') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('sql-assessment', 'SQL under assessment conditions', 'Problem Solving', 4, 4, 3, 'The highest points-per-minute section on any mixed screening test, and the one backend engineers most often skip because they "use an ORM". Window functions and cohort queries are where candidates separate.', 'Write a second-highest-per-group query with DENSE_RANK and a 30-day retention cohort query, cold, without looking anything up.', 'phase-0-online-assessments/04-sql-challenge-bank.md', -1, '', '2026-08-11 21:10:41.361') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('aws', 'AWS (Lambda, API Gateway, AppSync, cost)', 'Platform', 4, 5, 4, 'Cloud is assumed. Cost fluency is the differentiator, especially for bootstrapped startups.', 'Estimate the monthly bill for a design and offer a cheaper shape.', 'phase-4-cloud-infrastructure/02-aws-serverless-deep-dive.md', -1, '', '2026-08-11 21:10:41.387') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('docker-k8s', 'Docker & Kubernetes', 'Platform', 4, 4, 3, 'Not expected at SRE depth, but probes vs OOMKills vs rolling-update request loss are fair game for a lead.', 'Explain why a rolling update can still drop requests, and the three fixes.', 'phase-4-cloud-infrastructure/04-kubernetes-basics.md', -1, '', '2026-08-11 21:10:41.389') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('observability', 'Observability & SLOs', 'Platform', 3, 5, 3, 'The fastest way to prove you have RUN a system rather than only built one.', 'State one SLI, its SLO, and what you actually did when the error budget burned.', 'phase-4-cloud-infrastructure/05-observability-reliability.md', -1, '', '2026-08-11 21:10:41.39') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('video-screen', 'One-way video screens (Talview / HireVue)', 'Leadership', 2, 4, 1, 'Arrives early in the remote funnel, gets no second take, and is scored partly on delivery rather than content. A bad setup loses the round before anyone hears your answer.', 'A recorded 90-second answer with good lighting, clean audio, and a structured response you would be happy for a stranger to watch.', 'phase-0-online-assessments/07-video-interview-and-psychometric.md', -1, '', '2026-08-11 21:10:41.366') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('js-practicals', 'JS/Node practical implementations', 'Problem Solving', 4, 5, 3, 'Implement an async pool, an idempotency store, a batcher. Far more predictive of the job than DP, and almost nobody drills it.', 'Write asyncPool with correct ordering and no batch-stalling, first try, in 15 minutes.', 'practice?pattern=Node%20Practical', -1, '', '2026-08-11 21:10:41.369') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('eda', 'Event-driven architecture (outbox, saga, idempotency)', 'Architecture', 4, 5, 4, 'Your strongest differentiator. Concrete production stories here outrank any textbook answer.', 'Tell the story of a duplicate you actually had to handle, and the fix you shipped.', 'phase-2-apis-realtime-systems/04-event-driven-architecture.md', -1, '', '2026-08-11 21:10:41.381') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('distributed-systems', 'Distributed systems theory', 'Architecture', 2, 4, 3, 'Rarely asked directly in BD, frequently probed in remote senior loops via consistency and partition scenarios.', 'Answer "your leader is partitioned but still thinks it leads — what breaks and how do you prevent it?" (fencing tokens).', 'phase-5-system-design/03-distributed-systems.md', -1, '', '2026-08-11 21:10:41.382') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('api-design', 'API design (REST, GraphQL, gRPC)', 'Architecture', 4, 5, 4, 'Versioning, pagination and idempotency come up in nearly every backend loop.', 'Design a payment endpoint and bring up idempotency keys before being asked.', 'phase-2-apis-realtime-systems/02-rest-api-best-practices.md', -1, '', '2026-08-11 21:10:41.384') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('realtime', 'Real-time systems (WebSockets, streaming)', 'Architecture', 3, 3, 5, 'Niche but memorable. When it matches the role it is a near-instant shortlist.', 'Explain scaling Socket.io past one instance, and what still breaks after the Redis adapter.', 'phase-2-apis-realtime-systems/03-realtime-systems-agora.md', -1, '', '2026-08-11 21:10:41.386') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('cicd', 'CI/CD & IaC', 'Platform', 4, 4, 3, 'Leads own the pipeline. Expect questions on deployment safety and rollback.', 'Describe your rollback story and how long it takes end to end.', 'phase-4-cloud-infrastructure/08-cicd-devops.md', -1, '', '2026-08-11 21:10:41.395') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('security', 'Security & compliance (OAuth2, GDPR, SOC 2)', 'Platform', 3, 5, 3, 'For EU/US clients a single wrong answer on data residency or token handling can end a loop.', 'Explain PKCE and why PII never goes in a JWT.', 'phase-4-cloud-infrastructure/06-security-compliance.md', -1, '', '2026-08-11 21:10:41.397') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('cost-engineering', 'Cost engineering / FinOps', '2026 Edge', 4, 4, 3, 'Underrated everywhere, decisive in the BD market and in bootstrapped remote startups.', 'One story where you cut spend by a stated percentage without hurting reliability.', 'phase-5-system-design/05-reliability-security-cost.md', -1, '', '2026-08-11 21:10:41.401') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('technical-writing', 'ADRs, RFCs & technical writing', 'Leadership', 2, 5, 3, 'In async remote teams, writing IS the job. It is also the cheapest proof of lead-level judgment you can hand an interviewer.', 'One real ADR from your own history, one page, ready to share.', 'phase-5-system-design/08-architect-level-practice.md', -1, '', '2026-08-11 21:10:41.403') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('english-communication', 'Spoken English under technical pressure', 'Leadership', 2, 5, 3, 'The number one gatekeeper for international remote roles, ahead of any technical dimension. Fluency matters less than structure: signposting, pausing, and checking in.', 'A recorded 5-minute architecture walkthrough you would be happy for a stranger to hear.', 'behavioral', -1, '', '2026-08-11 21:10:41.405') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('mentoring', 'Mentoring & code review leadership', 'Leadership', 4, 4, 4, 'The lead title is largely bought with evidence of raising other people''s output.', 'A story with a measurable team outcome, not just "I mentored juniors".', 'behavioral', -1, '', '2026-08-11 21:10:41.406') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('incident-command', 'Incident response & postmortems', 'Leadership', 3, 5, 4, 'Detection, mitigation, root cause, systemic fix. Naming your own mistake reads as senior, not weak.', 'One incident story with timestamps and a systemic (not heroic) fix.', 'phase-4-cloud-infrastructure/05-observability-reliability.md', -1, '', '2026-08-11 21:10:41.409') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('postgres', 'PostgreSQL (indexing, MVCC, query plans)', 'Data', 5, 5, 4, 'Universal. Expect a real slow query on screen and "what would you do".', 'Read an EXPLAIN ANALYZE out loud and name the fix plus its write-side cost.', 'phase-3-databases-data/01-postgresql-deep-dive.md', -1, '', '2026-08-11 21:10:41.372') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('redis', 'Redis & caching failure modes', 'Data', 5, 4, 4, 'Cache-aside is table stakes; stampede, penetration and avalanche handling is the senior signal.', 'Describe what happens to your database the moment Redis fails over, and the three mitigations.', 'phase-3-databases-data/02-redis-deep-dive.md', -1, '', '2026-08-11 21:10:41.373') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('kafka', 'Kafka / event streaming', 'Data', 3, 4, 4, 'Your telecom-scale experience here is a genuine differentiator — most BD candidates have only used it as a queue.', 'Explain exactly what "exactly-once" requires on both producer and consumer side, and when you would not use Kafka.', 'phase-3-databases-data/03-kafka-deep-dive.md', -1, '', '2026-08-11 21:10:41.375') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('nosql', 'DynamoDB / MongoDB modelling', 'Data', 3, 4, 3, 'AWS-heavy remote roles will test access-pattern-first single-table design. Modelling Dynamo relationally is an instant no.', 'Design a single-table schema for a given set of access patterns, with GSI choices justified.', 'phase-3-databases-data/05-nosql-mongodb-dynamodb.md', -1, '', '2026-08-11 21:10:41.376') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('migrations', 'Zero-downtime schema evolution', 'Data', 3, 4, 3, 'A lead is expected to know expand-contract cold. It comes up as "how do you rename a column on a live 200GB table".', 'Walk the six steps of expand-contract without notes.', 'phase-3-databases-data/06-database-migrations-schema-evolution.md', -1, '', '2026-08-11 21:10:41.378') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('system-design-hld', 'System design (HLD) under a 45-min clock', 'Architecture', 4, 5, 3, 'The round that decides senior vs lead, and the one most affected by pacing rather than knowledge.', 'Requirements + capacity math inside the first 8 minutes, every time.', 'phase-5-system-design/06-hld-practice-problems.md', -1, '', '2026-08-11 21:10:41.379') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('lld', 'Low-level design / OOD', 'Architecture', 3, 4, 3, 'Common in EU and product companies as a 60-minute "design and code this class hierarchy" round.', 'Design a rate limiter or parking lot with clean interfaces and a stated extension point.', 'phase-5-system-design/07-lld-practice-problems.md', -1, '', '2026-08-11 21:10:41.38') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('assessment-platforms', 'Assessment platform fluency', 'Problem Solving', 3, 5, 1, 'Knowing how HackerRank scores partial output, how the Node stdin harness works, and how CodeSignal grows a spec across four levels is worth more marks than one extra algorithm pattern. Pure format knowledge, entirely learnable in an afternoon.', 'Complete one full-length timed mock on each of the two platforms your target companies actually use.', 'phase-0-online-assessments/00-platform-playbook.md', -1, '', '2026-08-11 21:10:41.363') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('llm-integration', 'LLM integration & RAG backends', '2026 Edge', 3, 5, 2, 'A large and growing share of remote backend postings mention it. Backend engineers who have shipped RAG with real cost and eval controls are scarce and priced accordingly. Biggest single upside item on this list.', 'Ship one small RAG service: ingestion, chunking, pgvector, streaming responses, an eval harness, and a cost-per-conversation number.', 'phase-2-apis-realtime-systems/06-ai-llm-integrations.md', -1, '', '2026-08-11 21:10:41.399') ON CONFLICT DO NOTHING;
INSERT INTO public."Skill" (id, name, category, "demandBD", "demandRemote", assumed, why, "proveIt", ref, level, note, "updatedAt") VALUES ('negotiation', 'Compensation negotiation', 'Leadership', 3, 5, 2, 'Not a hiring criterion — a personal-outcome skill. The most common BD mistake in remote loops is naming a number first, anchored to local salary.', 'Three scripted responses ready: they ask first, they lowball on geography, they ask your current salary.', 'playbook#negotiation', -1, '', '2026-08-11 21:10:41.413') ON CONFLICT DO NOTHING;


--
-- Data for Name: StarStory; Type: TABLE DATA; Schema: public; Owner: jobcracker
--



--
-- Data for Name: StudyLog; Type: TABLE DATA; Schema: public; Owner: jobcracker
--



--
-- Data for Name: TaskProgress; Type: TABLE DATA; Schema: public; Owner: jobcracker
--



--
-- PostgreSQL database dump complete
--

\unrestrict AfHhN0Zpwh31wvS5TpdtodbkgT0jM0WvSmpnMVPKPK8C0cINL4IRRJgrbXszMPk

