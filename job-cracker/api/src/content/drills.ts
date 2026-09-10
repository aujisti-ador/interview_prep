import { DrillSeed, RubricItem } from './types';

/**
 * Design drills with the rubric I would actually score against.
 *
 * The rubric is the point. Most people practise system design by reading
 * solutions, which trains recognition, not performance. Scoring yourself
 * against explicit weighted criteria after a timed attempt is what moves the
 * needle — and it makes your weak dimension visible across attempts.
 */

const hldBase = (specific: RubricItem[]): RubricItem[] => [
  {
    id: 'requirements',
    label: 'Clarified functional + non-functional requirements before designing',
    weight: 3,
    hint: 'Named the core use cases, what is explicitly out of scope, and the availability/consistency/latency targets. Asked, did not assume.',
  },
  {
    id: 'estimation',
    label: 'Did capacity estimation with real numbers',
    weight: 3,
    hint: 'DAU, QPS average and peak, read:write ratio, storage per year, bandwidth. Arithmetic done out loud without stalling.',
  },
  {
    id: 'api-data',
    label: 'Defined the API surface and the data model',
    weight: 2,
    hint: 'Concrete endpoints or events with their key parameters, and the tables/collections with their access patterns and keys.',
  },
  {
    id: 'highlevel',
    label: 'Coherent high-level architecture',
    weight: 3,
    hint: 'Components, data flow for the primary path, and where each piece of state lives. No orphaned boxes.',
  },
  ...specific,
  {
    id: 'bottlenecks',
    label: 'Identified the bottleneck and scaled it deliberately',
    weight: 3,
    hint: 'Named the component that breaks first at 10x, and the specific mitigation — not "add a cache" but which cache, keyed how, invalidated when.',
  },
  {
    id: 'failure',
    label: 'Handled failure modes',
    weight: 2,
    hint: 'What happens when each dependency is down or slow? Retries, timeouts, idempotency, degradation, DLQs.',
  },
  {
    id: 'tradeoffs',
    label: 'Named trade-offs and the rejected alternative',
    weight: 3,
    hint: 'For every significant choice: what did you not choose, and what would make you change your mind? This is the single highest-weighted senior signal.',
  },
  {
    id: 'communication',
    label: 'Pacing and communication',
    weight: 2,
    hint: 'Finished inside the timebox, signposted where you were going, checked in with the interviewer, drew something legible.',
  },
];

const lldBase = (specific: RubricItem[]): RubricItem[] => [
  {
    id: 'requirements',
    label: 'Clarified behaviour and edge cases up front',
    weight: 3,
    hint: 'What exactly should happen at the boundaries? Capacity zero, empty input, duplicate keys, concurrent callers.',
  },
  {
    id: 'interface',
    label: 'Designed the public interface before the internals',
    weight: 3,
    hint: 'Method signatures, return types, error semantics. A caller should be able to use it from the signature alone.',
  },
  ...specific,
  {
    id: 'complexity',
    label: 'Stated and achieved the target complexity',
    weight: 2,
    hint: 'Said the time and space complexity of each operation, and the data structures that deliver it.',
  },
  {
    id: 'concurrency',
    label: 'Reasoned about concurrency',
    weight: 2,
    hint: 'In Node: what can interleave across an await? Is there a check-then-act race? Does it need per-key serialisation?',
  },
  {
    id: 'extensibility',
    label: 'Named one clean extension point',
    weight: 2,
    hint: 'Where would the next requirement plug in without a rewrite? Also: what did you deliberately NOT abstract, and why.',
  },
  {
    id: 'testing',
    label: 'Described how you would test it',
    weight: 2,
    hint: 'The three cases you would write first, and how you would make time-dependent behaviour deterministic.',
  },
];

export const drills: DrillSeed[] = [
  // ---------------------------------------------------------------- HLD
  {
    id: 'hld-url-shortener',
    title: 'URL Shortener (TinyURL)',
    kind: 'hld',
    difficulty: 'easy',
    timeboxMin: 45,
    prompt:
      'Design a URL shortening service. Users submit a long URL and get a short code; visiting the short code redirects them.\n\nThis is the standard warm-up. Interviewers use it to calibrate whether you follow a process — do the process properly and you buy goodwill for the harder question that follows.',
    constraints:
      '100M new URLs/month · 10:1 read:write · redirect p99 under 100ms globally · links live 5+ years · custom aliases supported',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'keygen',
        label: 'Key generation strategy defended against collisions',
        weight: 3,
        hint: 'Counter + base62, hash + collision check, or a pre-generated key pool. Say the collision probability and what happens on collision.',
      },
      {
        id: 'redirect-path',
        label: 'Redirect path optimised (301 vs 302, cache, CDN)',
        weight: 2,
        hint: '301 is cached by browsers forever, which kills your analytics. 302 keeps control. That trade-off is the whole point of this question.',
      },
    ]),
  },
  {
    id: 'hld-rate-limiter',
    title: 'Distributed Rate Limiter',
    kind: 'hld',
    difficulty: 'medium',
    timeboxMin: 45,
    prompt:
      'Design a rate limiter for a public API used by thousands of clients across many application instances. Limits are per API key, with different tiers.',
    constraints:
      '50k RPS aggregate · limits per key per minute and per day · limiter must add under 5ms · must not become a single point of failure',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'algorithm',
        label: 'Chose an algorithm and justified it',
        weight: 3,
        hint: 'Fixed window (boundary burst problem), sliding log (memory), sliding window counter (the usual compromise), token bucket (burst-friendly). Pick and defend.',
      },
      {
        id: 'atomicity',
        label: 'Made the counter update atomic across instances',
        weight: 3,
        hint: 'Redis Lua script or INCR with a set-if-not-exists TTL. Explain why a naive GET/SET pair is a race.',
      },
      {
        id: 'degradation',
        label: 'Decided fail-open vs fail-closed when Redis is down',
        weight: 2,
        hint: 'There is no universal right answer — a billing API fails closed, a content API fails open. What matters is that you made it a conscious decision.',
      },
    ]),
  },
  {
    id: 'hld-news-feed',
    title: 'News Feed / Timeline',
    kind: 'hld',
    difficulty: 'medium',
    timeboxMin: 45,
    prompt:
      'Design the news feed for a social app: users follow others, post content, and see a ranked feed of posts from the people they follow.',
    constraints:
      '50M DAU · average 200 follows · celebrity accounts with 10M+ followers · feed load p99 under 300ms · ranked, not purely chronological',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'fanout',
        label: 'Fan-out on write vs on read, with the hybrid for celebrities',
        weight: 3,
        hint: 'Fan-out on write is fast to read but a 10M-follower post is 10M writes. The hybrid — push for normal accounts, pull for celebrities — is the expected answer.',
      },
      {
        id: 'ranking',
        label: 'Separated feed generation from ranking',
        weight: 2,
        hint: 'Candidate generation, then scoring. Keeping them separate is what lets you change ranking without re-architecting.',
      },
    ]),
  },
  {
    id: 'hld-notification-system',
    title: 'Notification System at 41M Users',
    kind: 'hld',
    difficulty: 'medium',
    timeboxMin: 45,
    prompt:
      'Design a multi-channel notification system (push, SMS, email, in-app) for a telecom-scale subscriber base. Support transactional notifications and scheduled campaigns.\n\nThis is your home turf — which is exactly why you should do it timed and cold. Familiar ground is where candidates ramble and lose the plot.',
    constraints:
      '41M subscribers · campaign bursts of 10M+ in one hour · third-party SMS/push gateways with their own rate limits and outages · per-user quiet hours and opt-outs · delivery receipts required',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'queueing',
        label: 'Queue topology and per-channel isolation',
        weight: 3,
        hint: 'One slow SMS provider must not stall push. Separate queues per channel, with priority lanes for transactional over campaign traffic.',
      },
      {
        id: 'thirdparty',
        label: 'Handled third-party gateway limits and outages',
        weight: 3,
        hint: 'Per-provider rate limiting, circuit breakers, provider failover, and a DLQ with replay. This is where your real experience should show.',
      },
      {
        id: 'dedupe',
        label: 'Idempotency and de-duplication',
        weight: 2,
        hint: 'At-least-once delivery from the broker means the user gets two SMS unless you dedupe on a notification id.',
      },
    ]),
  },
  {
    id: 'hld-chat-system',
    title: 'Chat System (WhatsApp-like)',
    kind: 'hld',
    difficulty: 'medium',
    timeboxMin: 45,
    prompt:
      'Design a 1:1 and group messaging system with delivery receipts, presence, and offline message delivery.',
    constraints:
      '20M DAU · groups up to 500 members · messages delivered in under 1s when both parties are online · offline messages retained 30 days · read receipts',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'connection',
        label: 'Connection layer and routing to the right gateway',
        weight: 3,
        hint: 'Persistent WebSocket per client, a session registry mapping user to gateway instance, and a pub/sub backbone between gateways.',
      },
      {
        id: 'ordering',
        label: 'Message ordering and offline delivery',
        weight: 3,
        hint: 'Per-conversation sequence numbers, a durable message store, and a client cursor so reconnects replay only the gap.',
      },
    ]),
  },
  {
    id: 'hld-file-storage',
    title: 'File Storage & Sync (Dropbox-like)',
    kind: 'hld',
    difficulty: 'medium',
    timeboxMin: 45,
    prompt: 'Design a file storage and synchronisation service with multi-device sync, sharing and version history.',
    constraints:
      '10M users · files up to 5GB · sync latency under 10s · deduplication required to control storage cost · resumable uploads over unreliable networks',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'chunking',
        label: 'Chunking, deduplication and delta sync',
        weight: 3,
        hint: 'Content-addressed chunks let you dedupe globally and sync only changed chunks. This is the core insight of the question.',
      },
      {
        id: 'metadata',
        label: 'Separated the metadata service from blob storage',
        weight: 2,
        hint: 'Metadata is small, transactional and queried constantly; blobs are large and immutable. Different stores, different scaling.',
      },
      {
        id: 'conflicts',
        label: 'Conflict resolution for concurrent edits',
        weight: 2,
        hint: 'Version vectors, last-writer-wins with a conflicted copy, or true merge. State the user-visible behaviour.',
      },
    ]),
  },
  {
    id: 'hld-payment-system',
    title: 'Payment Processing (Stripe-like)',
    kind: 'hld',
    difficulty: 'hard',
    timeboxMin: 50,
    prompt:
      'Design a payment processing service: accept a charge request, talk to acquiring banks or gateways, handle asynchronous settlement, and expose webhooks to merchants.',
    constraints:
      '5k TPS peak · money must never be double-charged or lost · external gateways time out and lie · PCI-DSS scope must be minimised · merchants need reliable webhooks',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'idempotency',
        label: 'Idempotency end to end',
        weight: 3,
        hint: 'Client idempotency key, stored request fingerprint and result, and a plan for the "gateway timed out — did it charge?" case (reconciliation, not a retry).',
      },
      {
        id: 'ledger',
        label: 'Double-entry ledger as the source of truth',
        weight: 3,
        hint: 'Append-only, balanced entries, no UPDATE on money rows. Balances are derived. Saying this unprompted marks you as someone who has built payments.',
      },
      {
        id: 'statemachine',
        label: 'Explicit payment state machine',
        weight: 2,
        hint: 'created → authorised → captured → settled, plus failed/refunded/disputed, with legal transitions enumerated.',
      },
    ]),
  },
  {
    id: 'hld-mfs',
    title: 'Mobile Financial Service (bKash / Nagad-like)',
    kind: 'hld',
    difficulty: 'hard',
    timeboxMin: 50,
    prompt:
      'Design a mobile financial service for Bangladesh: cash-in via agents, P2P send money, merchant payment, bill pay, and cash-out. Feature phones (USSD) must work alongside smartphones.',
    constraints:
      '60M+ registered users · agent network of 300k+ · must reconcile with partner banks daily · Bangladesh Bank regulatory reporting · unreliable network conditions · USSD sessions are short and stateful',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'ledger',
        label: 'Ledger correctness and reconciliation',
        weight: 3,
        hint: 'Double-entry, idempotent transaction ids, and an end-of-day reconciliation process against bank statements with a break-investigation path.',
      },
      {
        id: 'offline',
        label: 'Designed for unreliable networks and USSD',
        weight: 3,
        hint: 'Short session state, retry-safe operations, and clear behaviour when the client never sees the response. This is the BD-context question — lean into it.',
      },
      {
        id: 'compliance',
        label: 'Regulatory and fraud controls',
        weight: 2,
        hint: 'KYC tiers with transaction limits, audit trail immutability, velocity checks, and reporting extracts.',
      },
    ]),
  },
  {
    id: 'hld-job-scheduler',
    title: 'Distributed Job Scheduler',
    kind: 'hld',
    difficulty: 'medium',
    timeboxMin: 45,
    prompt:
      'Design a distributed job scheduler: users register one-off and recurring jobs, workers execute them, and the system reports outcomes.',
    constraints:
      '1M scheduled jobs · second-level scheduling precision · jobs must not run twice · long-running jobs up to 1 hour · workers crash regularly',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'exactlyonce',
        label: 'Prevented duplicate execution across workers',
        weight: 3,
        hint: 'Leases with fencing tokens, or an atomic claim (SELECT ... FOR UPDATE SKIP LOCKED). Explain what happens when a worker pauses past its lease.',
      },
      {
        id: 'timewheel',
        label: 'Efficient time-indexed storage of due jobs',
        weight: 2,
        hint: 'Polling the whole table every second does not scale. Bucketed by due-minute, a sorted set, or a hierarchical timing wheel.',
      },
    ]),
  },
  {
    id: 'hld-video-streaming',
    title: 'Video Streaming Platform (Netflix-like)',
    kind: 'hld',
    difficulty: 'hard',
    timeboxMin: 50,
    prompt: 'Design a video-on-demand platform: upload, transcode, store, and stream adaptively to millions of viewers.',
    constraints:
      '10M concurrent viewers at peak · adaptive bitrate · global audience with poor last-mile in some markets · storage cost matters · new uploads playable within 30 minutes',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'pipeline',
        label: 'Transcoding pipeline design',
        weight: 3,
        hint: 'Segment the source, transcode segments in parallel across a worker fleet, produce an HLS/DASH ladder, then publish the manifest.',
      },
      {
        id: 'delivery',
        label: 'CDN strategy and cost',
        weight: 3,
        hint: 'Origin shielding, cache hierarchy, popular-title pre-warming. Egress is the dominant cost line — say so.',
      },
    ]),
  },
  {
    id: 'hld-ride-hailing',
    title: 'Ride Hailing / Dispatch (Pathao-like)',
    kind: 'hld',
    difficulty: 'hard',
    timeboxMin: 50,
    prompt:
      'Design the dispatch system for a ride-hailing service: riders request, nearby drivers are found and offered the trip, and the trip is tracked to completion.',
    constraints:
      '500k active drivers · location updates every 4s · match within 5s · dense urban areas (Dhaka traffic) · drivers go offline abruptly · surge pricing',
    ref: 'phase-5-system-design/06-hld-practice-problems.md',
    rubric: hldBase([
      {
        id: 'geospatial',
        label: 'Geospatial indexing choice',
        weight: 3,
        hint: 'Geohash, S2 cells or H3, held in Redis. Explain the cell-size trade-off and how you query neighbouring cells at boundaries.',
      },
      {
        id: 'matching',
        label: 'Matching algorithm and race prevention',
        weight: 3,
        hint: 'Two riders must not be assigned the same driver. Atomic claim on the driver, with an offer timeout and requeue.',
      },
      {
        id: 'writeload',
        label: 'Handled the location-update write load',
        weight: 2,
        hint: '500k drivers every 4s is 125k writes/s. That does not go into Postgres — say where it goes and what is durable versus ephemeral.',
      },
    ]),
  },
  {
    id: 'hld-rag-assistant',
    title: 'RAG-Backed Support Assistant',
    kind: 'hld',
    difficulty: 'medium',
    timeboxMin: 50,
    prompt:
      'Design a retrieval-augmented support assistant over a company\'s documentation and ticket history. It answers customer questions in a chat widget with streamed responses and cites its sources.\n\nThis is the 2026 differentiator question. A backend engineer who can design this with real cost and evaluation controls is scarce.',
    constraints:
      '500k documents, updated continuously · answer must cite sources · first token under 1s · cost per conversation must be bounded and reportable · must refuse rather than hallucinate when retrieval is weak',
    ref: 'phase-2-apis-realtime-systems/06-ai-llm-integrations.md',
    rubric: hldBase([
      {
        id: 'retrieval',
        label: 'Ingestion, chunking and retrieval quality',
        weight: 3,
        hint: 'Chunk strategy and why, embedding model choice, hybrid keyword + vector search, and a reranking stage. Retrieval quality bounds everything downstream.',
      },
      {
        id: 'freshness',
        label: 'Keeping the index fresh',
        weight: 2,
        hint: 'Incremental re-embedding on document change, versioned index, and how you avoid a full re-index every time.',
      },
      {
        id: 'evalcost',
        label: 'Evaluation harness and cost controls',
        weight: 3,
        hint: 'A golden question set with regression scoring, plus token budgeting, prompt caching, and a per-conversation cost metric. Most teams skip this and regret it.',
      },
      {
        id: 'safety',
        label: 'Grounding, refusal and prompt-injection handling',
        weight: 2,
        hint: 'Treat retrieved content as untrusted. Cite sources, refuse below a retrieval confidence threshold, and scope any tool access tightly.',
      },
    ]),
  },

  // ---------------------------------------------------------------- LLD
  {
    id: 'lld-lru-cache',
    title: 'LLD — LRU Cache',
    kind: 'lld',
    difficulty: 'easy',
    timeboxMin: 30,
    prompt:
      'Design and implement an LRU cache with O(1) get and put. Then extend it: add per-entry TTL, and describe how you would make it thread-safe in a language with real threads.',
    ref: 'phase-5-system-design/07-lld-practice-problems.md',
    rubric: lldBase([
      {
        id: 'datastructure',
        label: 'Chose a structure that actually delivers O(1)',
        weight: 3,
        hint: 'Hash map + doubly linked list, or JS Map insertion order. Explain why a plain array is O(n).',
      },
      {
        id: 'ttl',
        label: 'Handled the TTL extension cleanly',
        weight: 2,
        hint: 'Lazy expiry on read plus optional background sweeping. Say why an eager timer per key does not scale.',
      },
    ]),
  },
  {
    id: 'lld-rate-limiter',
    title: 'LLD — Rate Limiter Class',
    kind: 'lld',
    difficulty: 'medium',
    timeboxMin: 35,
    prompt:
      'Design a rate limiter class supporting multiple algorithms (token bucket and sliding window) behind one interface, with pluggable storage so it can run in-memory or on Redis.',
    ref: 'phase-5-system-design/07-lld-practice-problems.md',
    rubric: lldBase([
      {
        id: 'strategy',
        label: 'Used a strategy interface without over-abstracting',
        weight: 3,
        hint: 'One `RateLimitStrategy` interface with `tryConsume(key, now)`. Resist inventing five layers — say what you deliberately left concrete.',
      },
      {
        id: 'clock',
        label: 'Injected the clock',
        weight: 2,
        hint: 'Passing `now` in makes the whole thing testable without sleeping. Interviewers notice this immediately.',
      },
    ]),
  },
  {
    id: 'lld-task-scheduler',
    title: 'LLD — Task Scheduler with Retries',
    kind: 'lld',
    difficulty: 'medium',
    timeboxMin: 35,
    prompt:
      'Design an in-process task scheduler: schedule a task to run after a delay or on a recurring interval, with retry-on-failure using exponential backoff, bounded concurrency, and cancellation.',
    ref: 'phase-5-system-design/07-lld-practice-problems.md',
    rubric: lldBase([
      {
        id: 'queue',
        label: 'Efficient due-task selection',
        weight: 2,
        hint: 'A min-heap keyed by next-run time, with one timer for the earliest task, rather than a timer per task.',
      },
      {
        id: 'retry',
        label: 'Retry policy is a first-class, configurable object',
        weight: 2,
        hint: 'Backoff base, factor, max attempts, jitter, and what happens after the final failure.',
      },
      {
        id: 'cancel',
        label: 'Cancellation semantics defined',
        weight: 2,
        hint: 'Can you cancel a task that is already running? What does the caller observe? AbortSignal is the idiomatic answer.',
      },
    ]),
  },
  {
    id: 'lld-pubsub',
    title: 'LLD — In-Process Pub/Sub with At-Least-Once Delivery',
    kind: 'lld',
    difficulty: 'medium',
    timeboxMin: 35,
    prompt:
      'Design a pub/sub component: topics, multiple subscribers per topic, acknowledgement, redelivery of unacknowledged messages, and a dead letter queue after N failures.',
    ref: 'phase-5-system-design/07-lld-practice-problems.md',
    rubric: lldBase([
      {
        id: 'delivery',
        label: 'Delivery guarantee stated and implemented',
        weight: 3,
        hint: 'At-least-once means tracking in-flight messages with a visibility timeout, and requiring subscribers to be idempotent. Say the guarantee out loud.',
      },
      {
        id: 'dlq',
        label: 'Dead-letter path with attempt counting',
        weight: 2,
        hint: 'Per-message attempt counter, a max, and a DLQ that someone can actually inspect and replay.',
      },
    ]),
  },

  // ---------------------------------------------------------------- Architecture
  {
    id: 'arch-monolith-migration',
    title: 'Architecture — Monolith to Services Migration Plan',
    kind: 'architecture',
    difficulty: 'hard',
    timeboxMin: 45,
    prompt:
      'You have inherited a 6-year-old Node monolith serving a profitable product. 25 engineers, deploys twice a week, a 40-minute test suite, and one team is permanently blocked by another. Leadership wants "microservices". Write the plan you would actually present.\n\nThis is a lead-level question. The strongest answers frequently do not end in microservices.',
    ref: 'phase-5-system-design/02-architecture-patterns.md',
    rubric: [
      {
        id: 'problem',
        label: 'Diagnosed the actual problem before proposing architecture',
        weight: 3,
        hint: 'Is the pain deploy coupling, team coupling, scaling, or reliability? Each has a different cheapest fix. "Microservices" is a solution looking for its problem.',
      },
      {
        id: 'alternatives',
        label: 'Considered the cheaper alternatives seriously',
        weight: 3,
        hint: 'Modular monolith with enforced boundaries, test suite parallelisation, trunk-based development, feature flags. Extracting one service is not always cheaper than fixing the pipeline.',
      },
      {
        id: 'sequencing',
        label: 'Incremental, reversible sequencing',
        weight: 3,
        hint: 'Strangler fig behind a facade, first extraction chosen for low coupling and high pain, with a defined rollback at each step.',
      },
      {
        id: 'data',
        label: 'Had a real answer for the data',
        weight: 3,
        hint: 'The shared database is where these migrations die. Ownership boundaries, dual-write or CDC transition, and how you break foreign keys across the seam.',
      },
      {
        id: 'org',
        label: 'Addressed team topology and ownership',
        weight: 2,
        hint: 'Conway\'s Law. Who owns and on-calls each service after the split? A service without an owner becomes everyone\'s problem.',
      },
      {
        id: 'metrics',
        label: 'Defined success metrics and a stop condition',
        weight: 3,
        hint: 'DORA metrics, or "team X can deploy without coordinating with team Y". And explicitly: at what point do we stop extracting?',
      },
      {
        id: 'communication',
        label: 'Framed for a non-engineering audience',
        weight: 2,
        hint: 'Cost, risk, and delivery impact in business terms. A lead who can only argue this technically will lose the argument.',
      },
    ],
  },
  {
    id: 'arch-multi-tenant-saas',
    title: 'Architecture — Multi-Tenant SaaS Platform',
    kind: 'architecture',
    difficulty: 'hard',
    timeboxMin: 45,
    prompt:
      'Design the tenancy architecture for a B2B SaaS product serving both 5-person startups and enterprises that demand data isolation, custom domains and regional data residency.',
    ref: 'phase-5-system-design/08-architect-level-practice.md',
    rubric: hldBase([
      {
        id: 'isolation',
        label: 'Chose an isolation model per tier and justified it',
        weight: 3,
        hint: 'Shared schema with a tenant column, schema-per-tenant, or database-per-tenant. Most real products run a hybrid: pooled for small tenants, siloed for enterprise. Say the operational cost of each.',
      },
      {
        id: 'noisyneighbour',
        label: 'Handled the noisy-neighbour problem',
        weight: 2,
        hint: 'Per-tenant rate limits and quotas, work isolation for expensive operations, and per-tenant observability so you can see which tenant is hurting the others.',
      },
      {
        id: 'residency',
        label: 'Data residency and per-region deployment',
        weight: 2,
        hint: 'Regional cells with a global routing/identity layer. Explain what stays global and why that is defensible under GDPR.',
      },
    ]),
  },
];
