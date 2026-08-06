# System Design Fundamentals — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with frameworks, estimation math, and decision tables
> **Last Updated:** 2026-08-06

---

## Table of Contents

1. [The Interview Framework](#q1-the-interview-framework)
2. [Clarifying Requirements](#q2-clarifying-requirements)
3. [Back-of-the-Envelope Estimation](#q3-back-of-the-envelope-estimation)
4. [API Design in the Interview](#q4-api-design-in-the-interview)
5. [Data Modelling & Access Patterns](#q5-data-modelling--access-patterns)
6. [Networking Fundamentals](#q6-networking-fundamentals)
7. [Choosing a Communication Style](#q7-choosing-a-communication-style)
8. [DNS, CDN & the Edge](#q8-dns-cdn--the-edge)
9. [Load Balancing](#q9-load-balancing)
10. [Caching Strategy](#q10-caching-strategy)
11. [Choosing a Datastore](#q11-choosing-a-datastore)
12. [Blob Storage](#q12-blob-storage)
13. [Search & Inverted Indexes](#q13-search--inverted-indexes)
14. [Message Queues as a Building Block](#q14-message-queues-as-a-building-block)
15. [Driving the Deep Dive & Trade-offs](#q15-driving-the-deep-dive--trade-offs)
16. [Quick Reference](#quick-reference)

---

## Q1: The Interview Framework

### Q: You get "Design X" on a whiteboard with 45 minutes. What is your process?

**A:** The single biggest differentiator between a mid-level and a senior candidate is not knowledge — it is **process**. Mid-level candidates start drawing boxes in minute two. Senior candidates spend the first eight minutes making sure they are solving the right problem.

Use a fixed seven-step structure and announce it up front: *"Let me spend ~5 minutes on requirements and scale, then sketch the high-level design, then go deep on the two or three components you care most about."* This tells the interviewer you have done this before and it lets them redirect you early.

| Step | Time (45 min) | Output | Failure mode if skipped |
|---|---|---|---|
| 1. Clarify functional requirements | 3–5 min | Bulleted list of 3–5 in-scope features | You design a system nobody asked for |
| 2. Clarify non-functional requirements | 2–3 min | Latency, availability, consistency, scale targets | You can't justify any trade-off later |
| 3. Back-of-envelope estimation | 3–5 min | QPS, storage/year, bandwidth | You can't tell if one DB is enough or 200 |
| 4. API design | 3–5 min | 4–6 endpoints with request/response shape | Component boundaries stay vague |
| 5. Data model | 3–5 min | Tables/collections + access patterns + keys | You pick the wrong database |
| 6. High-level architecture | 8–10 min | The boxes-and-arrows diagram | — |
| 7. Deep dive + trade-offs | 12–15 min | 1–2 components in detail, bottlenecks, 10× plan | You look shallow |

**Rules that make this work in practice:**

- **Write the requirements on the board and leave them there.** Every design decision you make later should point back at one of those lines. "I'm choosing Cassandra here because of the 99.99% availability requirement and the write-heavy access pattern" is a senior answer. "I'm choosing Cassandra because it scales" is not.
- **Time-box yourself out loud.** "I've got about 10 minutes left, so I'll go deep on the fan-out service unless you'd prefer the storage layer." Interviewers score you on collaboration.
- **Never design in silence.** Narrate the decision *and the alternative you rejected*. The rejected alternative is where the signal is.
- **Ask before you assume, then assume out loud.** "Do we need to support editing a message after it's sent? I'll assume no for now and revisit if there's time."

### Q: What do interviewers actually score you on?

**A:** Most companies use a rubric close to this. Knowing it tells you where to spend your minutes.

| Dimension | What "strong" looks like |
|---|---|
| **Requirements & scoping** | Narrows an open problem to a tractable one; states assumptions explicitly |
| **Estimation** | Produces numbers, and uses them to make decisions (not just to show off) |
| **High-level design** | Correct, complete data flow; no magic boxes; handles the write path *and* the read path |
| **Depth** | Can go two levels below any box they drew |
| **Trade-offs** | Names the alternative, the criterion, and the reason for the choice |
| **Failure thinking** | Unprompted discussion of what breaks and what happens when it does |
| **Communication** | Structured, checks in, responds to hints instead of steamrolling |

The two that most candidates lose points on are **failure thinking** (they design the happy path only) and **trade-offs** (they present a design as if it were the only option). Budget explicitly for both.

---

## Q2: Clarifying Requirements

### Q: What questions do you ask before designing anything?

**A:** Split them into functional (what it does) and non-functional (how well it does it). Non-functional requirements are where architecture actually comes from.

**Functional — scope the feature set down:**

- Who are the actors? (end user, admin, another service, a batch job)
- What are the top 3 use cases? Explicitly declare the rest out of scope.
- Read-heavy or write-heavy? What's the read:write ratio?
- Does the user need the result immediately, or can it be asynchronous?
- Is there a mobile client? (Affects payload size, offline, push.)

**Non-functional — the six that drive architecture:**

| Dimension | Question to ask | What the answer changes |
|---|---|---|
| **Scale** | DAU? Peak QPS? Data volume in 3 years? | Sharding, caching, whether one box works |
| **Latency** | p99 target for the critical path? | Sync vs async, cache placement, geo-distribution |
| **Availability** | 99.9% or 99.99%? Is downtime revenue-affecting? | Multi-AZ vs multi-region, failover strategy |
| **Consistency** | Can a user tolerate seeing stale data for 1s? 10s? | SQL vs NoSQL, replication mode, read-your-writes |
| **Durability** | Is losing one message acceptable? | Ack modes, replication factor, WAL settings |
| **Security/compliance** | PII? Payments? Data residency? | Encryption, audit logs, region pinning |

**The availability numbers you must know cold:**

| SLA | Downtime/year | Downtime/month | Practical meaning |
|---|---|---|---|
| 99% ("two nines") | 3.65 days | 7.2 hours | Internal tools |
| 99.9% ("three nines") | 8.77 hours | 43.8 min | Typical SaaS default |
| 99.95% | 4.38 hours | 21.9 min | Paid tier SaaS |
| 99.99% ("four nines") | 52.6 min | 4.4 min | Needs multi-AZ + automated failover |
| 99.999% ("five nines") | 5.26 min | 26 sec | Needs multi-region active-active; very expensive |

**Key senior insight:** each additional nine roughly multiplies cost by 3–10× and removes the possibility of manual intervention (a human cannot detect, diagnose and fix inside a 4-minute monthly budget). If someone asks for five nines on a CRUD app, push back — that is the correct senior response.

Also know that **availability composes multiplicatively** for a serial call chain: a request that touches five services each at 99.9% has a ceiling of `0.999^5 ≈ 99.5%`. This is the single strongest technical argument against gratuitous microservice decomposition, and a great line to have ready.

---

## Q3: Back-of-the-Envelope Estimation

### Q: Walk me through capacity estimation.

**A:** The purpose is not precision — it is to decide *order of magnitude*: does this fit on one machine, ten, or ten thousand? Round aggressively and say so.

**Numbers to memorise:**

| Quantity | Value |
|---|---|
| Seconds in a day | 86,400 ≈ **10⁵** |
| Seconds in a month | ~2.6M |
| Seconds in a year | ~31.5M ≈ **3 × 10⁷** |
| 1 million writes/day | ≈ 12 writes/sec |
| 1 billion writes/day | ≈ 12,000 writes/sec |
| Peak-to-average ratio | Assume **2–3×** (spiky consumer apps: 5–10×) |

**Latency numbers every engineer should know (Jeff Dean's table, modernised):**

| Operation | Latency | Mental model |
|---|---|---|
| L1 cache reference | 1 ns | — |
| Branch mispredict | 3 ns | — |
| L2 cache reference | 4 ns | — |
| Mutex lock/unlock | 17 ns | — |
| Main memory reference | 100 ns | **RAM is ~100× slower than L1** |
| Compress 1 KB with Snappy | 2 µs | — |
| Send 1 KB over 1 Gbps network | 10 µs | — |
| Read 4 KB randomly from NVMe SSD | 20–150 µs | **SSD is ~1000× slower than RAM** |
| Read 1 MB sequentially from memory | 3 µs | — |
| Read 1 MB sequentially from SSD | 50–200 µs | — |
| Round trip within same datacenter | 500 µs | **Cross-service call ≈ 0.5 ms floor** |
| Read 1 MB sequentially from HDD | 5 ms | — |
| Disk seek (HDD) | 10 ms | — |
| Round trip Dhaka → Singapore | ~40–60 ms | — |
| Round trip Dhaka → US East | ~230–280 ms | **Geography is the latency budget** |

Two consequences worth stating in an interview: (1) if your p99 target is 100 ms and your users are in Bangladesh while your data is in `us-east-1`, you have already blown the budget on physics alone — you need edge/CDN or a regional deployment; (2) a chain of 10 sequential intra-DC RPCs costs ~5 ms of pure network before any work happens, which is why fan-out should be parallel, not serial.

**Storage size cheat sheet:**

| Type | Size |
|---|---|
| `bigint` / timestamp / double | 8 bytes |
| UUID (binary / as text) | 16 B / 36 B |
| A short text field | ~50–100 B |
| A typical JSON API row | 0.5–2 KB |
| A tweet-sized message row | ~300 B |
| A thumbnail | ~10 KB |
| A photo | ~1–3 MB |
| 1 minute of 1080p video | ~50 MB |

### Q: Worked example — estimate a Twitter-scale news feed.

**A:** Say it out loud like this:

**Given/assumed:**
- 300M MAU, 50% DAU → **150M DAU**
- Each user posts 2 tweets/day → 300M tweets/day
- Each user reads their feed 10×/day → 1.5B feed reads/day
- Average tweet: 300 bytes of text + metadata; 10% have media at ~1 MB

**Write path:**
```
Tweets/day        = 150M × 2          = 300M/day
Average write QPS = 300M / 10^5       = 3,000 writes/sec
Peak write QPS    = 3,000 × 3         = ~9,000 writes/sec
```
9K writes/sec of 300-byte rows is well within a sharded relational cluster or a single Cassandra ring. **Conclusion: the write path is not the hard part.**

**Read path:**
```
Feed reads/day    = 150M × 10         = 1.5B/day
Average read QPS  = 1.5B / 10^5       = 15,000 reads/sec
Peak read QPS     = 15,000 × 3        = ~45,000 reads/sec
Read:write ratio  = 15,000 : 3,000    = 5:1
```
45K reads/sec, each of which must merge posts from hundreds of followees. **Conclusion: the read path is the hard part → this is a fan-out / precomputation problem, and caching is mandatory.** That single sentence is the payoff of the whole estimation exercise.

**Storage:**
```
Text/day    = 300M × 300 B            = 90 GB/day
Media/day   = 30M × 1 MB              = 30 TB/day
Text/year   = 90 GB × 365             = ~33 TB/year
Media/year  = 30 TB × 365             = ~11 PB/year
```
**Conclusion:** text fits comfortably in a sharded database; media must go to object storage (S3) behind a CDN, never in the database. With 3× replication the media bill is ~33 PB/year — which immediately raises tiering (hot/warm/cold) as a cost lever.

**Bandwidth:**
```
Egress ≈ 45,000 reads/sec × 20 tweets × 300 B ≈ 270 MB/s ≈ 2.2 Gbps (text only)
```
Media egress dwarfs this and is exactly why a CDN exists — offloading 90%+ of bytes from origin.

**Cache sizing (the 80/20 rule):**
```
Assume 20% of tweets generate 80% of reads.
Hot set = 20% × 300M tweets/day × 300 B ≈ 18 GB/day of hot text.
Cache the last 24h of hot content → ~20 GB → trivially fits in a small Redis cluster.
```

**Machine count sanity check:** a well-tuned Node.js service handles ~1–5K rps of light JSON work per core-bound instance. 45K rps peak ÷ 3K rps/instance ≈ 15 instances, ×2 for headroom and AZ redundancy ≈ **30 instances**. Now you can talk about autoscaling policy concretely instead of hand-waving.

---

## Q4: API Design in the Interview

### Q: Why design APIs before drawing the architecture?

**A:** Because the API contract *is* the component boundary. Once you have written `POST /v1/tweets` and `GET /v1/feed?cursor=`, the services fall out of it naturally, and the interviewer can see you think in contracts rather than in boxes.

Keep it to 4–6 endpoints covering the core use cases. Show the shape, not full OpenAPI.

```http
POST /v1/tweets
Authorization: Bearer <jwt>
Idempotency-Key: 6f1c...        # dedupes client retries
Content-Type: application/json

{ "text": "hello", "mediaIds": ["m_123"], "replyToId": null }

201 Created
{ "id": "t_88f3", "authorId": "u_42", "createdAt": "2026-08-06T10:00:00Z" }
```

```http
GET /v1/feed?limit=20&cursor=eyJ0cyI6MTcyMjk0...
200 OK
{
  "items": [ { "id": "t_88f3", "author": {...}, "text": "...", "stats": {...} } ],
  "nextCursor": "eyJ0cyI6MTcyMjk0..."   # null when exhausted
}
```

**The five API decisions that earn senior points:**

1. **Cursor pagination, not offset.** `OFFSET 100000` forces the database to scan and discard 100k rows, and rows shift under the user as new items arrive (duplicates and skips). A cursor is an opaque base64 of the sort key — `{"ts": 1722940000, "id": "t_88f3"}` — turning the query into `WHERE (ts, id) < (?, ?) ORDER BY ts DESC, id DESC LIMIT 20`, which is an index range scan at constant cost regardless of depth.
2. **Idempotency keys on every unsafe, non-idempotent operation.** Client retries are guaranteed (mobile networks, load balancer timeouts). Store `idempotency_key → (status, response_body)` with a 24h TTL; on a repeat key, replay the stored response instead of re-executing.
3. **Versioning strategy stated once.** URI versioning (`/v1/`) is the pragmatic default — visible in logs, trivially routable at the gateway. Header versioning is purer but harder to debug and cache.
4. **Explicit auth model.** Say who issues the token, what's in it (`sub`, `scope`, `exp`), how it's validated (JWKS public key at the gateway, not a DB lookup per request), and how revocation works (short TTL + refresh, or a denylist in Redis).
5. **Async where the user doesn't need the answer.** `202 Accepted` + a `Location` pointing at a status resource is the right answer for video transcoding, report generation, or bulk import — and it's the natural entry point to talk about queues.

---

## Q5: Data Modelling & Access Patterns

### Q: How do you approach the data model?

**A:** Backwards, from access patterns. In a relational model you can afford to model entities first and query later because the query planner will find a way. In a distributed/NoSQL model you cannot — the partition key decides everything, and getting it wrong is a rewrite.

**The process:**

1. **List the queries first**, verbatim, in priority order. "Get the 20 most recent posts by the people user X follows." "Get all messages in conversation C after timestamp T."
2. **For each query, identify the access key** — what you have in hand at query time.
3. **Design the primary key so the hot queries are a single-partition lookup.** Cross-partition scatter-gather is what kills you at scale.
4. **Denormalise deliberately**, and say why: reads outnumber writes 5:1, so paying extra write cost to make reads a single lookup is correct. Then name the cost you accepted — you now own consistency between copies.
5. **State the sharding key explicitly** and what queries it makes expensive.

**Choosing a shard key — the checklist:**

| Criterion | Why it matters | Bad example |
|---|---|---|
| High cardinality | Enough distinct values to spread across shards | `country` for a BD-only app → one hot shard |
| Even distribution | No single value dominates | `user_id` when one celebrity has 40M followers |
| Present in most queries | Otherwise every read is a scatter-gather | Sharding messages by `message_id`, but always querying by `conversation_id` |
| Monotonic keys avoided | Sequential keys hotspot the newest shard | `created_at` or auto-increment ID as shard key |

**Worked example — chat messages.**

Access pattern: "fetch the last N messages of conversation C, paginated backwards."

```sql
-- Relational, partitioned + sharded by conversation_id
CREATE TABLE messages (
  conversation_id  BIGINT      NOT NULL,   -- shard key
  message_id       BIGINT      NOT NULL,   -- Snowflake: time-sortable, globally unique
  sender_id        BIGINT      NOT NULL,
  body             TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (conversation_id, message_id DESC)
) PARTITION BY RANGE (created_at);
```
Every read for a conversation is one index range scan on one shard. Range partitioning by time means dropping messages older than the retention window is an instant `DROP PARTITION` instead of a multi-hour `DELETE`.

The same model in DynamoDB single-table form:

```
PK = "CONV#<conversation_id>"      (partition key)
SK = "MSG#<snowflake_id>"          (sort key, descending scan = newest first)
GSI1PK = "USER#<sender_id>"        (for "all messages I sent")
GSI1SK = "MSG#<snowflake_id>"
```

**On ID generation** — worth 30 seconds in any design. Auto-increment doesn't work across shards; UUIDv4 is random, so it destroys B-tree insert locality and index cache hit rates. The standard answer is a **Snowflake ID**: a 64-bit integer of `[41 bits ms timestamp | 10 bits machine id | 12 bits sequence]`, which is globally unique, roughly time-sortable (so inserts stay at the right edge of the index), and generated locally with no coordination — 4096 IDs per machine per millisecond. UUIDv7 achieves the same time-ordering property if you prefer a standard.

---

## Q6: Networking Fundamentals

### Q: TCP vs UDP, and where does each show up in system design?

**A:**

| | TCP | UDP |
|---|---|---|
| Connection | Handshake (SYN/SYN-ACK/ACK) — 1 RTT before data | Connectionless — 0 RTT |
| Delivery | Guaranteed, ordered, retransmitted | Best effort, unordered, may be lost |
| Congestion control | Yes (slow start, AIMD) | No (application's problem) |
| Head-of-line blocking | Yes — one lost segment stalls the stream | No |
| Overhead | 20-byte header + ack traffic | 8-byte header |
| Used by | HTTP/1.1, HTTP/2, gRPC, SQL, Kafka, WebSocket | DNS, QUIC/HTTP/3, WebRTC media, video/voice, metrics (StatsD), gaming |

The rule: **use UDP when a late packet is worse than a lost packet.** In a live voice call, retransmitting a 200 ms-old audio frame is useless — you want the next frame. This is exactly why Agora, WebRTC and every real-time media stack sit on UDP, and it's a strong link to make if you have live-streaming experience.

### Q: HTTP/1.1 vs HTTP/2 vs HTTP/3 — what actually changed?

**A:**

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP | **QUIC over UDP** |
| Concurrency | One request per connection; browsers open ~6 | Multiplexed streams over one connection | Multiplexed streams, independent |
| Head-of-line blocking | At the application layer | Fixed at app layer, **remains at TCP layer** | Eliminated — a lost packet stalls only its stream |
| Headers | Plain text, repeated every request | Binary + HPACK compression | Binary + QPACK |
| Server push | No | Yes (deprecated in practice) | No |
| Handshake | TCP (1 RTT) + TLS (1–2 RTT) | Same | **0–1 RTT**, connection migration across IP changes |

**Why this matters for a backend engineer:** HTTP/2 multiplexing is what makes gRPC efficient for chatty internal service-to-service traffic — one long-lived connection carrying thousands of concurrent streams instead of a connection pool. HTTP/3's connection migration is why mobile clients on flaky networks (switching Wi-Fi → mobile data, a very real Bangladesh scenario) keep their session instead of re-handshaking.

**Gotcha to mention:** an L7 load balancer that terminates HTTP/2 and re-opens HTTP/1.1 to the backend erases the multiplexing benefit. And gRPC load balancing is broken by default with L4 balancers — because one long-lived TCP connection pins all streams to one backend pod, you get connection-level balancing, not request-level. The fixes are an L7-aware proxy (Envoy), a service mesh, or client-side load balancing.

### Q: What happens in a TLS handshake, and what's the cost?

**A:** TLS 1.3 handshake: ClientHello (with key share) → ServerHello + certificate + Finished → client Finished. That's **1 RTT** (down from 2 in TLS 1.2), with **0-RTT session resumption** for repeat connections at the cost of replay vulnerability for non-idempotent requests.

The practical design consequences:
- **Terminate TLS at the edge** (CDN/ALB/NGINX) so the expensive handshake happens close to the user, over a short RTT, and the origin connection is reused.
- **Keep-alive matters enormously.** On a 250 ms Dhaka→US RTT, a fresh HTTPS connection costs ~1 RTT TCP + 1 RTT TLS = ~500 ms before a single byte of your response. Connection reuse removes that entirely.
- **mTLS** adds client certificate verification in the same handshake — the standard for service-to-service identity inside a mesh.

---

## Q7: Choosing a Communication Style

### Q: REST vs GraphQL vs gRPC vs WebSocket vs SSE vs long polling — how do you choose?

**A:** Two separate axes: **request/response shape** and **who initiates**.

**Request/response protocols:**

| | REST | GraphQL | gRPC |
|---|---|---|---|
| Payload | JSON | JSON | Protobuf (binary, 3–10× smaller) |
| Schema/contract | OpenAPI (optional) | Schema (mandatory, typed) | `.proto` (mandatory, typed, codegen) |
| Over-/under-fetching | Common | Solved by design | Solved by explicit messages |
| Browser support | Native | Native | Needs gRPC-Web + proxy |
| Caching | HTTP caching works out of the box | Hard (POST, single endpoint) | Not HTTP-cacheable |
| Streaming | No (SSE bolt-on) | Subscriptions | First class, bidirectional |
| Best for | Public APIs, CRUD, third parties | Aggregating for varied clients (mobile+web), BFF | Internal service-to-service, low latency, high volume |

**Decision rule:** public/partner API → REST. Mobile app with a chatty screen that needs 6 resources in one round trip → GraphQL (or a BFF). Internal microservice hop where you control both ends and care about p99 → gRPC.

**Server-push protocols:**

| | Long polling | SSE | WebSocket |
|---|---|---|---|
| Direction | Server → client (simulated) | Server → client only | Full duplex |
| Protocol | HTTP | HTTP (`text/event-stream`) | Upgraded TCP (`ws://`/`wss://`) |
| Reconnect | Manual | **Automatic, with `Last-Event-ID` replay** | Manual (implement backoff yourself) |
| Proxy/firewall friendliness | Excellent | Excellent | Sometimes blocked by corporate proxies |
| Overhead per message | Full HTTP request each time | Low | Lowest (2–14 byte frames) |
| Scaling cost | High (connection churn) | One held connection per client | One held connection per client |
| Best for | Legacy fallback | Notifications, live feeds, **LLM token streaming**, dashboards | Chat, collaborative editing, gaming, trading |

**The senior take:** most teams reach for WebSockets when SSE would do. If the traffic is one-directional (notifications, price ticks, streaming an LLM response), SSE is strictly simpler — it's plain HTTP, so it works through every proxy, gets automatic browser reconnection with event replay, and needs no separate upgrade path at the load balancer. Choose WebSocket only when the client genuinely needs to push at high frequency.

**Scaling either one:** the hard part isn't the connection, it's that connections are stateful. User A's socket lives on pod 3; the event for user A is produced on pod 7. You need a **shared pub/sub backplane** (Redis pub/sub, the Socket.IO Redis adapter, or a dedicated gateway tier) so any pod can deliver to any user, plus sticky routing or a connection registry (`user_id → pod_id` in Redis) for targeted delivery. Also budget memory: ~10–40 KB per idle connection means 100K connections ≈ 1–4 GB per node before any application state, and you must raise `ulimit -n` and tune ephemeral port ranges.

---

## Q8: DNS, CDN & the Edge

### Q: Walk through what happens between typing a URL and the request reaching your server.

**A:**

```
Browser cache → OS cache → Router cache → ISP resolver
   → Root NS (.)  → TLD NS (.com) → Authoritative NS (yourapp.com)
   → returns A/AAAA record (or CNAME to CDN)
   → TCP handshake → TLS handshake → HTTP request
   → CDN edge PoP: cache HIT → served locally (~10–30 ms)
                   cache MISS → origin fetch (regional shield → origin)
   → Load balancer → application server
```

**DNS levers you should know:**
- **TTL** is the trade-off between failover speed and query volume. 300s is a common production compromise; drop it to 60s *before* a planned migration, because the old TTL governs how long stale answers persist.
- **Routing policies** (Route 53 terminology): weighted (canary / blue-green traffic shifting), latency-based (send users to the nearest healthy region), geolocation (data residency and compliance), failover (health-check driven active-passive).
- **Anycast** — the same IP announced from many locations; BGP routes the user to the topologically nearest PoP. This is how CDNs and public DNS resolvers work, and how DDoS traffic gets absorbed and dispersed.

### Q: CDN — push vs pull, and how do you invalidate?

**A:**

| | Pull CDN | Push CDN |
|---|---|---|
| How | First request misses, edge fetches from origin, caches it | You upload content to the CDN ahead of time |
| Best for | Large catalogues, unpredictable popularity | Small set of very hot files, big video launches |
| First-request latency | Slow (cold miss) | Fast |
| Origin load | Low after warm-up; a **thundering herd** on cold start | Zero |
| Operational cost | Low — it self-manages | You own the sync pipeline |

Pull is the default. Mitigate the cold-start herd with **request collapsing** (the edge coalesces concurrent misses for the same key into one origin fetch) and a **regional shield/mid-tier cache** so hundreds of edge PoPs don't all hit origin independently.

**Invalidation — in preference order:**
1. **Content-hashed URLs** (`app.4f9a2c.js`, `avatar_v7.jpg`) with `Cache-Control: public, max-age=31536000, immutable`. The best invalidation is never needing to invalidate: change the content, change the URL.
2. **Short TTL + revalidation** — `max-age=60, stale-while-revalidate=600` serves stale instantly while refreshing in the background. Excellent for feeds and listings.
3. **Explicit purge** by path or by surrogate tag. Propagation takes seconds to minutes; never make correctness depend on it.

**What to put on a CDN beyond static assets:** TLS termination, HTTP/3, Brotli compression, WAF and bot rules, rate limiting, geo-blocking, image resizing at the edge, and increasingly the edge functions themselves (auth checks, A/B assignment, personalisation headers).

---

## Q9: Load Balancing

### Q: L4 vs L7 load balancing?

**A:**

| | L4 (transport) | L7 (application) |
|---|---|---|
| Sees | IP + port; forwards packets/connections | Full HTTP: path, headers, cookies, method |
| Can do | Fast connection distribution, TCP/UDP | Path routing, header routing, retries, rewrites, TLS termination, canary by header |
| TLS | Passes through (or terminates in TLS-passthrough mode) | Terminates and can re-encrypt |
| Throughput | Very high, minimal CPU | Lower — must parse every request |
| AWS | Network Load Balancer (NLB) | Application Load Balancer (ALB) |
| Examples | LVS, NLB, HAProxy TCP mode | NGINX, Envoy, ALB, Traefik |

Use L4 when you need raw throughput, non-HTTP protocols, or static IPs. Use L7 for anything where routing decisions depend on request content — which is most web traffic. **Common production shape:** NLB (static IP, absorbs the connection flood) → Envoy/NGINX (L7 routing, retries, observability) → services.

### Q: Algorithms, and when does consistent hashing matter?

**A:**

| Algorithm | Behaviour | Use when |
|---|---|---|
| Round robin | Even rotation | Homogeneous, stateless, uniform request cost |
| Weighted round robin | Proportional to capacity | Mixed instance sizes; gradual canary shifting |
| **Least connections** | Send to the fewest in-flight | **Variable request duration — the best general default** |
| Least response time | Fewest connections × lowest latency | Latency-sensitive, heterogeneous backends |
| IP hash | Same client → same backend | Poor man's stickiness (breaks behind NAT/mobile) |
| **Consistent hashing** | Same *key* → same backend, minimal reshuffle on membership change | **Caches, sharded stateful services** |

**Consistent hashing, explained the way you should say it:** with `hash(key) % N`, changing N from 100 to 101 remaps ~99% of keys — every cache node cold-starts at once and the database is hit by the full miss traffic (a self-inflicted DDoS). Consistent hashing places nodes and keys on a hash ring; a key belongs to the first node clockwise. Adding or removing a node only remaps the keys in that node's arc — roughly `1/N` of keys, not all of them.

Uneven arc sizes are fixed with **virtual nodes**: each physical node is placed at 100–200 points on the ring, which smooths the distribution and makes removal spread the load across many remaining nodes rather than dumping it all on one neighbour. This is the mechanism behind Cassandra/DynamoDB partitioning, Memcached client sharding, Envoy's ring hash, and consistent-hash sharding of WebSocket gateways.

### Q: How does the load balancer know a backend is healthy?

**A:** Two distinct checks, and conflating them is a classic outage:
- **Liveness** — "is the process wedged?" If it fails, restart. Must not depend on downstream services.
- **Readiness** — "can it serve traffic right now?" If it fails, pull from rotation but don't kill. May check dependencies.

**The failure mode to name:** if readiness returns unhealthy whenever the database is slow, then a brief database blip marks *every* instance unready simultaneously, the load balancer has no targets, and a degradation becomes a total outage. Keep dependency checks in a separate `/health/deep` endpoint used for alerting, not for routing.

Also mention **connection draining** (deregistration delay): on deploy or scale-in, stop sending new requests, let in-flight requests finish (typically 30s), *then* terminate — otherwise every deploy returns 5xx to users mid-request.

---

## Q10: Caching Strategy

### Q: What are the caching patterns and when do you use each?

**A:**

| Pattern | Write path | Read path | Trade-off |
|---|---|---|---|
| **Cache-aside (lazy loading)** | App writes DB, invalidates cache | Miss → read DB → populate cache | Simplest, most common. First read is slow; risk of stale on concurrent write |
| **Read-through** | Same as cache-aside | Cache library fetches from DB on miss | Cleaner app code; needs cache provider support |
| **Write-through** | Write cache **and** DB synchronously | Always a hit | Cache never stale; every write pays both latencies |
| **Write-behind (write-back)** | Write cache, flush to DB asynchronously | Always a hit | Fastest writes; **data loss if cache dies before flush** |
| **Refresh-ahead** | — | Proactively refresh hot keys before TTL expiry | Avoids miss latency on hot keys; wasted work on cold ones |

Default to **cache-aside**. Reach for write-behind only for high-volume, loss-tolerant data (view counters, analytics events), and say the durability risk out loud when you do.

**Where caches live (all of these, layered):**

```
Browser cache → CDN edge → API gateway cache → application in-process (LRU)
   → distributed cache (Redis/Memcached) → database buffer pool → disk
```
Each layer catches what the one before it missed. An in-process LRU in front of Redis eliminates a network hop for the very hottest keys — worth it for config and feature flags, dangerous for anything needing prompt invalidation (each pod has its own copy; you need a pub/sub invalidation channel).

### Q: The three cache failure modes.

**A:** These come up constantly and knowing the names is a strong signal.

**1. Cache penetration** — requests for keys that *don't exist anywhere*, so the cache never populates and every request hits the database. Often malicious (`GET /user/-1` in a loop).
- Fix A: **cache the negative result** with a short TTL (30–60s).
- Fix B: **Bloom filter** in front of the cache — a probabilistic set that answers "definitely not present" or "maybe present" in O(1) with a few bits per key. Reject the definite-nots before touching any datastore.

**2. Cache avalanche** — a large number of keys expire at the same instant (or the cache cluster restarts), and the full read load lands on the database at once.
- Fix A: **TTL jitter** — `ttl = base + random(0, base × 0.1)` so expiries spread out.
- Fix B: **multi-level cache** so a local L1 absorbs the gap.
- Fix C: **circuit breaker + graceful degradation** — serve stale or a degraded response rather than melting the database.
- Fix D: warm the cache before taking traffic after a restart.

**3. Cache stampede / thundering herd (hot key)** — one *very* popular key expires and 10,000 concurrent requests all miss and all recompute the same value.
- Fix A: **mutex / single-flight** — the first miss takes a short-lived distributed lock (`SET key:lock nx ex 10`) and recomputes; others wait briefly and re-read.
- Fix B: **probabilistic early expiry** — each read recomputes with probability rising as TTL approaches, so one lucky request refreshes before expiry with no lock.
- Fix C: **serve stale while revalidating** — return the expired value immediately and refresh in the background. Usually the best UX.

```ts
// Single-flight cache-aside with jittered TTL and stale-while-revalidate
async function getWithCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSec = 300,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    const { value, expiresAt } = JSON.parse(cached);
    if (Date.now() < expiresAt) return value;            // fresh
    // stale: return it now, refresh in background if we win the lock
    void refreshIfLockAcquired(key, loader, ttlSec);
    return value;
  }
  return refreshIfLockAcquired(key, loader, ttlSec, /* wait */ true);
}

async function refreshIfLockAcquired<T>(
  key: string, loader: () => Promise<T>, ttlSec: number, wait = false,
): Promise<T | undefined> {
  const gotLock = await redis.set(`${key}:lock`, '1', 'NX', 'EX', 10);
  if (!gotLock) {
    if (!wait) return;
    await sleep(50);                                      // let the winner populate
    const retry = await redis.get(key);
    if (retry) return JSON.parse(retry).value;
  }
  try {
    const value = await loader();
    const jitter = Math.floor(Math.random() * ttlSec * 0.1);
    const logicalTtl = (ttlSec + jitter) * 1000;
    // physical TTL is longer than logical so we can serve stale
    await redis.set(
      key,
      JSON.stringify({ value, expiresAt: Date.now() + logicalTtl }),
      'EX', ttlSec * 3,
    );
    return value;
  } finally {
    await redis.del(`${key}:lock`);
  }
}
```

### Q: Eviction policies?

**A:** **LRU** (evict least recently used) is the sane default and what Redis's `allkeys-lru` does. **LFU** (least frequently used) is better when a stable hot set is occasionally disturbed by a scan — LRU would let a one-time bulk read flush the whole working set, LFU wouldn't. **TTL-only** (`volatile-ttl`) suits session stores. **FIFO** is rarely right.

Redis specifically approximates LRU by sampling (default 5 keys) rather than maintaining a true LRU list, because exact LRU costs memory per key — a good detail to know. And `maxmemory-policy noeviction` on a cache is a footgun: writes start failing instead of evicting.

---

## Q11: Choosing a Datastore

### Q: How do you pick a database in a design interview?

**A:** Match the access pattern, not the brand. State the criterion, then the pick.

| Type | Model | Strengths | Weak at | Reach for it when |
|---|---|---|---|---|
| **Relational** (PostgreSQL, MySQL) | Tables, rows, joins | ACID, joins, ad-hoc queries, constraints, mature ops | Horizontal write scaling | **Default.** Transactions, relationships, anything financial |
| **Document** (MongoDB, DocumentDB) | JSON documents | Flexible schema, document-shaped reads, easy sharding | Multi-document transactions, joins | Catalogues, CMS, per-tenant variable schema |
| **Wide-column** (Cassandra, ScyllaDB, HBase) | Partition key + clustering columns | Massive write throughput, linear scale, multi-DC, AP | Ad-hoc queries, joins, anything not on the partition key | Time series, event logs, message history, feeds |
| **Key-value** (Redis, DynamoDB, Memcached) | Key → value | Single-digit ms, huge throughput, simple | Any query not by key | Caching, sessions, counters, rate limiting, leaderboards |
| **Search** (Elasticsearch, OpenSearch) | Inverted index | Full-text, relevance, faceting, aggregations | Not a system of record — no ACID | Search boxes, log analytics |
| **Time-series** (TimescaleDB, InfluxDB, Prometheus) | Timestamped metrics | Compression, downsampling, retention, time-window queries | General-purpose workloads | Metrics, IoT telemetry, monitoring |
| **Graph** (Neo4j, Neptune) | Nodes + edges | Multi-hop traversal, shortest path | Bulk analytics, high write volume | Social graph, fraud rings, recommendations, permissions |
| **Object store** (S3, GCS) | Blobs | Effectively infinite, cheap, 11 nines durability | Latency, querying | Media, backups, data lake, static assets |
| **Columnar/OLAP** (Redshift, ClickHouse, BigQuery, Snowflake) | Column-oriented | Scans and aggregates over billions of rows | Point lookups, updates | Analytics, dashboards, reporting |

**The two sentences that carry the most weight:**

> "I'll start with PostgreSQL because it gives me transactions, joins, JSONB for the flexible parts, and it will comfortably handle 10K writes/sec on a single primary with read replicas — which is above our estimated peak. If we outgrow it on writes, the migration path is to shard by tenant_id or to move the highest-volume table to Cassandra."

> "This is polyglot persistence: Postgres as the system of record, Redis for the hot read path, S3 for media, and Elasticsearch for search — populated from Postgres via CDC so Postgres stays the single source of truth."

Interviewers reward "boring default with a stated escape hatch" far more than an exotic pick with no justification.

---

## Q12: Blob Storage

### Q: How do you handle file uploads at scale?

**A:** Never proxy bytes through your application servers. The pattern is **presigned URLs**:

```
1. Client → API:  POST /v1/uploads  { filename, contentType, sizeBytes }
2. API validates auth, quota, MIME type, size limit
3. API → S3:      generate presigned PUT URL, TTL 15 min, with content-length
                  and content-type conditions baked into the signature
4. API → Client:  { uploadUrl, objectKey, uploadId }
5. Client → S3:   PUT bytes directly (never touches your servers)
6. S3 → EventBridge/SNS → your worker: ObjectCreated event
7. Worker: virus scan, transcode, thumbnail, then mark the record "ready"
```

Why this matters: your API stays stateless and small (no 5 GB request bodies, no memory spikes, no long-lived connections holding a Node.js event loop), the upload gets S3's global edge acceleration, and you pay nothing for the transfer through compute.

**Details that show experience:**
- **Multipart upload** for files over ~100 MB — parallel parts, resumable, and each part independently retried. Essential on unreliable connections.
- **Sign narrowly**: bake content-length range and content-type into the signature conditions, otherwise a presigned URL is an open write to your bucket.
- **Never trust the client's "upload done" call** — drive state from the S3 event, not the client, or you'll have orphaned records when the client crashes mid-upload.
- **Lifecycle policies** for cost: Standard → Infrequent Access at 30 days → Glacier at 90 → expire at 365. On a petabyte-scale media store this is the single biggest cost lever.
- **Serve reads through the CDN**, with either a presigned GET (short TTL) or signed cookies for a whole media path.
- **Orphan reaper**: a scheduled job deleting objects with no corresponding "ready" DB row after 24h.

---

## Q13: Search & Inverted Indexes

### Q: How does full-text search work, and when do you add Elasticsearch?

**A:** An **inverted index** maps term → list of documents containing it (a postings list), which is the transpose of the normal document → terms layout. Building it:

```
Text:  "The quick brown foxes jumped"
  → tokenize:  [the, quick, brown, foxes, jumped]
  → lowercase / strip punctuation
  → remove stop words:  [quick, brown, foxes, jumped]
  → stem / lemmatize:   [quick, brown, fox, jump]

Inverted index:
  fox    → [doc1:pos3, doc7:pos1, doc12:pos9]
  jump   → [doc1:pos4, doc3:pos2]
```
A query for "fox jump" intersects the two postings lists, then ranks results by relevance (**BM25** — term frequency, inverse document frequency, and document-length normalisation). Positions in the postings list are what make phrase queries possible.

**When Postgres full-text search is enough:** under a few million documents, English-only or single-language, no complex faceting, and you value having one datastore. `tsvector` + a GIN index handles this well and keeps search transactional with your data.

**When you need Elasticsearch:** relevance tuning, multi-language analyzers, faceted navigation, typo tolerance (fuzzy/edit distance), autocomplete with edge n-grams, aggregations over hundreds of millions of docs, or log analytics.

**The critical architectural rule:** Elasticsearch is **not a system of record**. It has no ACID transactions and a documented history of data loss under partition. Keep Postgres as the source of truth and populate the index asynchronously via **CDC / the outbox pattern**, accepting sub-second eventual consistency. Be explicit that you can rebuild the entire index from the source of truth — that's the property that makes the whole arrangement safe.

**Autocomplete specifically** is usually not Elasticsearch: a **trie** (prefix tree) with the top-K completions precomputed and cached at each node, served from memory, gets you sub-10 ms typeahead. Rebuild it offline from query logs.

---

## Q14: Message Queues as a Building Block

### Q: When does a queue belong in the design?

**A:** Four distinct jobs, and naming which one you mean is the senior move:

1. **Decoupling** — the producer doesn't know or care who consumes. Add a new consumer without touching the producer.
2. **Load levelling** — absorb a traffic spike and let consumers drain at their own rate. Your database sees a flat line instead of a spike.
3. **Async work** — get the user a `202` in 50 ms and do the 30-second job (transcode, email, report) in the background.
4. **Reliability** — the message survives a consumer crash and gets redelivered.

**Queue vs log — the distinction interviewers probe:**

| | Message queue (RabbitMQ, SQS) | Log (Kafka, Kinesis) |
|---|---|---|
| After consumption | Message is deleted | Record stays for the retention period |
| Ordering | Per queue, lost with concurrent consumers | Strict **per partition** |
| Replay | No | **Yes — reset the offset** |
| Consumer model | Competing consumers, broker pushes | Consumer groups pull, own their offset |
| Routing | Rich (exchanges, bindings, headers) | Just topic + partition |
| Fan-out to N teams | Requires N queues bound to an exchange | Native — N consumer groups on one topic |
| Per-message operations | Ack/nack individually, delay, priority, TTL | No per-message ack; offsets only |
| Best for | Task queues, RPC-ish work, complex routing | Event streaming, event sourcing, analytics, audit |

**Rule of thumb:** "do this job" → queue. "this happened" → log. If you might want to replay history, add a consumer later, or feed analytics from the same stream, you want Kafka.

**Things to mention unprompted:**
- **Dead-letter queue** after N failed attempts, with an alert on DLQ depth and a documented replay path. A DLQ nobody watches is a silent data-loss channel.
- **Idempotent consumers** — every broker is at-least-once in practice. Dedupe on a business key or an event ID in Redis/a `processed_events` table; make the handler naturally idempotent (`UPSERT`, not `INSERT`).
- **Backpressure** — what happens when consumers can't keep up? Monitor consumer lag; autoscale consumers on lag, not CPU (KEDA does exactly this).
- **Poison messages** — one un-parseable message must not block a partition forever. Cap retries, then DLQ.
- **Ordering** — if you need per-entity ordering, partition by entity ID (`user_id`, `order_id`), which gives ordering where it matters while still allowing parallelism across entities.

---

## Q15: Driving the Deep Dive & Trade-offs

### Q: The interviewer says "go deeper on X." How do you structure that?

**A:** Use the same four beats every time:

1. **Data flow** — trace one request end to end through the component, naming every hop.
2. **Data structures / storage** — what's stored, keyed how, on which node.
3. **Failure modes** — what happens when each dependency is slow, down, or lying.
4. **Scale limits** — what breaks first at 10×, and what you'd change.

### Q: How do you talk about trade-offs so it lands as senior?

**A:** Use the pattern **"I chose A over B because of C, and I accept D."** Every choice has a price; naming the price is the whole game.

- "I chose eventual consistency for the follower counter over a synchronous update **because** the write volume is 50K/s and a transactional counter would serialise on a single row, **and I accept** that the count can be a few seconds stale — which is invisible to users."
- "I chose to fan out on write for regular users **because** reads outnumber writes 5:1 and precomputing makes the feed a single cache read, **and I accept** the write amplification — which is why celebrities with >10K followers fall back to fan-out on read, merged at query time."

**Universal trade-off axes to pull from:**

| Axis | One side | Other side |
|---|---|---|
| Consistency ↔ availability | Reject writes during a partition | Accept and reconcile |
| Latency ↔ consistency | Read the leader | Read a nearby replica |
| Read cost ↔ write cost | Precompute (fan-out on write) | Compute on read |
| Storage ↔ compute | Denormalise/materialise | Join at query time |
| Simplicity ↔ scalability | One Postgres | Sharded polyglot fleet |
| Cost ↔ performance | Spot + smaller instances | Reserved + overprovisioned |
| Freshness ↔ load | Short TTL | Long TTL + explicit purge |

### Q: The interviewer asks "what if traffic goes 100×?"

**A:** Answer in tiers, because the honest answer is that different things break at different multiples:

- **10×** — mostly config: scale out stateless tiers, add read replicas, raise cache memory, tune connection pools. Usually the connection pool or a single unindexed query is the first thing to break, not the architecture.
- **100×** — architectural: shard the write path, move the hottest table to a purpose-built store, introduce async processing where you had sync, add regional deployments, consider CQRS to split read and write models.
- **1000×** — organisational as much as technical: cell-based architecture to bound blast radius, dedicated teams per domain, custom infrastructure, cost engineering as a first-class workstream.

Then name the **first bottleneck** specifically. "At 10× the first thing to fall over is the single Postgres primary at ~15K writes/sec, so the first move is to shard by tenant." A specific bottleneck beats a generic "we'd scale horizontally" every time.

---

## Quick Reference

**The seven steps:** Requirements → Non-functional → Estimation → API → Data model → High-level design → Deep dive & trade-offs.

**Estimation shortcuts:**
```
1M/day ≈ 12/sec        1B/day ≈ 12K/sec        Peak = 2–3× average
1 day  ≈ 10^5 sec      1 year ≈ 3 × 10^7 sec
Intra-DC RTT 0.5 ms | SSD read 100 µs | RAM read 100 ns | Dhaka↔US-East ~250 ms
```

**Default building blocks and why:**

| Need | Default choice | Because |
|---|---|---|
| Source of truth | PostgreSQL | ACID, joins, JSONB, boring and proven |
| Hot reads | Redis, cache-aside, jittered TTL | Sub-ms, simple, well understood |
| Media | S3 + CloudFront + presigned URLs | Cheap, durable, keeps bytes off your servers |
| Async work | SQS/RabbitMQ (tasks), Kafka (events) | Match the semantics to the job |
| Search | Postgres FTS → Elasticsearch via CDC | Don't add a datastore before you must |
| Real-time push | SSE unless bidirectional, then WebSocket | Simpler, proxy-friendly, auto-reconnect |
| Internal RPC | gRPC | Typed contract, binary, HTTP/2 multiplexing |
| Edge | CDN with hashed URLs + `stale-while-revalidate` | Offloads most bytes and most latency |

**Failure vocabulary to deploy unprompted:** cache stampede, cache penetration, cache avalanche, thundering herd, hot partition, head-of-line blocking, split brain, retry storm, cascading failure, poison message, consumer lag, blast radius, back-pressure.

**Things that lose points:** designing only the happy path; drawing a box you can't explain one level deeper; picking a technology without naming the alternative; ignoring the interviewer's hints; running out of time because you spent 20 minutes on requirements; quoting numbers you never use.
