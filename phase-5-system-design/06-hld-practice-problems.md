# High-Level Design — Practice Problems

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Full worked designs using the 7-step framework
> **Last Updated:** 2026-08-06

Each problem follows the same structure: **Requirements → Estimation → API → Data model → Architecture → Deep dive → Trade-offs & scale**. Practise saying these out loud with a timer; 45 minutes is the target.

---

## In 60 seconds — how to use this guide

1. **Do not read these as answers. Attempt them first, on a timer, out loud.** Reading a worked
   solution feels like learning and is not. The value is entirely in the attempt.
2. **45 minutes, a blank Excalidraw canvas, and your voice.** Record yourself. Then compare
   against the write-up and score honestly against the rubric.
3. **Follow the same seven steps every single time**, from
   [01-system-design-fundamentals](01-system-design-fundamentals.md):
   requirements → estimates → API → data model → high-level design → bottleneck → trade-offs.
   The consistency is the skill.
4. **Most of these problems reduce to a small set of recurring ideas.** Once you see them, new
   problems stop being new:
   - **Fan-out** — one write, many readers (feeds, notifications, chat)
   - **Idempotency** — safe retries (payments, webhooks, job runners)
   - **Sharding by a key** — spreading load without losing ordering where it matters
   - **Read vs write optimisation** — precompute at write time, or compute at read time
   - **Hot spots** — one celebrity, one popular key, breaking your even distribution
5. **The bottleneck question is where the interview really happens.** Get to "what breaks
   first?" quickly — that is the conversation they want.
6. **Say the trade-off out loud, every time.** "I'm choosing X over Y, which costs us Z." That
   sentence is what is actually being scored.

**The most common failure in this round is not a wrong design — it is never finishing.**
Candidates spend 30 minutes on the data model and never reach scaling. Watch the clock and move
on deliberately.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Fan-out on write** | Do the work when data is created — push to every follower's feed. Fast reads, expensive writes |
| **Fan-out on read** | Do the work when data is requested — assemble the feed on demand. Cheap writes, slow reads |
| **Hybrid fan-out** | Push for normal users, pull for celebrities. What real systems do |
| **Celebrity problem** | One account with millions of followers breaking fan-out-on-write |
| **Precomputation** | Calculating results ahead of time so reads are cheap |
| **Write amplification** | One user action causing many writes |
| **Hot partition** | One shard receiving far more traffic than the others |
| **Consistent hashing** | Distributing keys so adding a node moves few of them |
| **Geohash / quadtree** | Ways of indexing locations for "what is near me" queries |
| **Bloom filter** | A tiny structure answering "definitely not present" — avoids pointless lookups |
| **Rate limiter** | Capping request volume per client |
| **Token bucket** | The usual rate-limiting algorithm; permits short bursts |
| **CDN** | Caching servers close to users |
| **Object storage** | S3-style storage for files. Cheap, not a database |
| **Push vs pull** | Server sends when there is news · client asks repeatedly |
| **Dead letter queue** | Where permanently failing messages go |
| **Back-of-envelope** | Rough capacity maths done out loud |

---

## Table of Contents

| # | Problem | Core lesson |
|---|---|---|
| 1 | [URL Shortener](#1-url-shortener) | ID generation, read-heavy caching, the warm-up problem |
| 2 | [Distributed Rate Limiter](#2-distributed-rate-limiter) | Coordination vs latency, fail-open |
| 3 | [Notification System](#3-notification-system-41m-users--bd-context) | Fan-out, multi-channel, deduplication, idempotency |
| 4 | [Chat System](#4-chat-system-whatsappmessenger) | Stateful connections, delivery guarantees, ordering |
| 5 | [News Feed](#5-news-feed-twitterfacebook) | Fan-out on write vs read, the celebrity problem |
| 6 | [Payment System](#6-payment-system-stripe-like) | Idempotency, ledgers, exactly-once money |
| 7 | [Mobile Financial Service](#7-mobile-financial-service-bkashnagad-like) | Double-entry ledger, regulatory, USSD, BD context |
| 8 | [Video Streaming](#8-video-streaming-netflixyoutube) | Transcoding pipeline, ABR, CDN economics |
| 9 | [File Storage](#9-file-storage-dropboxgoogle-drive) | Chunking, dedup, sync conflict resolution |
| 10 | [Search Autocomplete](#10-search-autocomplete) | Tries, precomputation, sub-10ms budgets |
| 11 | [Web Crawler](#11-web-crawler) | Politeness, frontier, dedup at scale |
| 12 | [Ride-Hailing](#12-ride-hailing-uberpathao) | Geospatial indexing, matching, real-time location |
| 13 | [Ticket Booking](#13-ticket-booking-bookmyshow) | Inventory locking, no-oversell, flash traffic |
| 14 | [Live Streaming](#14-live-streaming-agora--rtmp) | Latency tiers, RTMP/HLS/WebRTC trade-offs |
| 15 | [Voucher / Coupon System](#15-voucher--coupon-system-daraz-context) | Atomic redemption, abuse prevention, rule engines |

---

## 1. URL Shortener

**The warm-up.** They're testing structure, not difficulty.

### Requirements

**Functional:** shorten a long URL → short code; redirect a short code → long URL; optional custom alias; optional expiry; basic click analytics.
**Out of scope:** user accounts beyond an API key, link preview, editing.
**Non-functional:** redirect p99 < 50 ms (it's on the critical path of someone's page load); 99.99% availability for redirects (a dead shortener breaks every link ever shared); read:write ≈ 100:1; links are effectively permanent.

### Estimation

```
Writes:  100M new URLs/day  → 100M / 10^5 ≈ 1,200 writes/sec  (peak ~3,500)
Reads:   100 × writes       → 120,000 reads/sec               (peak ~350,000)
Storage: 100M/day × 365 × 5yr = 182B records
         per record ≈ 500 B (long URL ~400 B + code + metadata)
         → 182B × 500 B ≈ 91 TB over 5 years
Cache:   20% of links get 80% of traffic; hot set of ~1 day ≈ 100M × 500 B = 50 GB
```
**Conclusion:** trivial write volume, enormous read volume → this is a caching and key-design problem.

### API

```http
POST /v1/urls            { "longUrl": "...", "customAlias": null, "expiresAt": null }
  → 201 { "shortUrl": "https://sho.rt/a3Xk9p", "code": "a3Xk9p" }

GET  /{code}             → 301/302 Location: <longUrl>
GET  /v1/urls/{code}/stats → { clicks, uniqueVisitors, byCountry, byDay }
```

### Data model

```sql
CREATE TABLE urls (
  code        VARCHAR(11) PRIMARY KEY,   -- base62, shard key
  long_url    TEXT        NOT NULL,
  creator_id  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);
CREATE INDEX ON urls (creator_id, created_at DESC);
```
Sharded by `hash(code)` — every read is a single-partition point lookup. Analytics go to a separate append-only store (Kafka → ClickHouse), never as a counter update on the hot row.

### Key decision: generating the code

| Approach | Verdict |
|---|---|
| **Hash the URL (MD5/SHA), take 7 chars, base62** | Deterministic (same URL → same code, which is nice), but **collisions** need a check-and-retry loop, and that's a read before every write |
| **Random 7-char base62** | Simple; needs a uniqueness check; collision probability rises as the space fills |
| **Auto-increment counter → base62** | No collisions, shortest codes, but **sequential codes are enumerable** (anyone can crawl every link) and a single counter is a bottleneck |
| **Distributed counter with pre-allocated ranges** ✅ | Each app node claims a block of 10,000 IDs from ZooKeeper/a counter table, hands them out locally, claims the next block when low |

**Choose the range-allocated counter, then scramble.** Base62 with 7 characters gives 62⁷ ≈ 3.5 trillion codes — plenty. To defeat enumeration, apply a reversible bijection to the counter before encoding (e.g. multiply by a large odd number modulo 62⁷, or a Feistel network) so codes look random but are still collision-free and require no lookup.

### Architecture

```
                       ┌── CDN / edge (cache 301s for popular codes) ──┐
   Client ─────────────┤                                               │
                       └── ALB ── Redirect Service (stateless, many) ──┤
                                        │                              │
                                   Redis cluster (code → longUrl)      │
                                        │ miss                         │
                                   Sharded Postgres / DynamoDB ────────┘
                                        │
   Write path:  Create Service → ID range allocator → DB → warm cache
   Analytics:   Redirect Service → Kafka → ClickHouse (async, never blocking)
```

### Deep dives

**Why 302 and not 301.** A 301 is cached permanently by browsers, which means you never see the second click — you lose all analytics and you can never change the destination. Use **302** (or 307) when analytics matter, and 301 only if you're optimising purely for redirect latency and accept the loss. Say this trade-off explicitly; it's the detail interviewers look for.

**Cache design.** Cache-aside with a long TTL; hot keys will hold themselves in memory under LRU. On a miss, take a per-key lock so 10,000 simultaneous requests for a newly-viral link don't all hit the database (**stampede**). Consider `stale-while-revalidate` since a URL mapping never changes — staleness is essentially free here.

**Custom aliases.** Enforce uniqueness with a database unique constraint, not a check-then-insert (which races). Keep them in a separate keyspace or reserve a prefix so they can't collide with generated codes. Maintain a blocklist for offensive and impersonating aliases.

**Abuse.** Shorteners get used for phishing. Scan submitted URLs against Google Safe Browsing, rate limit by API key and IP, and support takedown by code. Serve an interstitial warning page for flagged links rather than a redirect.

### Trade-offs & 10×

Storage grows forever, so add a TTL tier: links unvisited for 2 years move to cold storage and return a 410 with a "this link expired" page. At 10× reads, the redirect path is already stateless and cache-served — scale horizontally and push the hottest codes into the CDN itself, where a redirect never reaches your infrastructure at all.

---

## 2. Distributed Rate Limiter

### Requirements

**Functional:** limit requests per API key / user / IP; multiple rules (per-second burst, per-minute, per-day quota); return `429` with `Retry-After` and remaining-quota headers; per-endpoint costs.
**Non-functional:** adds < 5 ms to p99; correct within ~1%; **must fail open** — a rate limiter that takes down the API is worse than the abuse it prevents; 1M rules, 100K checks/sec.

### The core decision

| Approach | Accuracy | Latency | Verdict |
|---|---|---|---|
| Local in-memory per instance | Poor (limit × N instances) | ~0 | Only if instance count is stable and accuracy is soft |
| Centralised Redis | Excellent | +1–2 ms | **Default** |
| Local + async sync to Redis | Good | ~0 | Best at very high scale |

### Algorithm: token bucket

Chosen because bursts are usually legitimate (a page load fires 8 parallel calls) while the sustained rate must be bounded. The full Redis Lua implementation is in the [distributed systems guide](03-distributed-systems.md#q13-rate-limiting-algorithms) — the key property is that read-modify-write happens atomically inside Redis, so two concurrent requests can't both see the same token count.

### Architecture

```
Client → API Gateway ──▶ [rate limit check] ──▶ Service
                              │
                         Redis Cluster (sharded by limit key)
                              │
                         local LRU cache of rule definitions (refreshed every 30s)

Fail-open: Redis timeout (5 ms) or circuit open → allow the request, emit a metric,
           fall back to a coarse local limit.
```

### Deep dives

**Where to enforce.** At the gateway/edge for coarse limits (cheapest — rejects before consuming any backend resource) and inside services for expensive-operation limits the gateway can't see. Both, not either.

**Sharding.** Shard Redis by the limit key so all checks for one API key land on one node — this keeps the operation a single atomic Lua call. A hot key (one enormous customer) gets its own node or a local-first hybrid.

**Rule hierarchy.** Evaluate several limits and let the strictest win: global → per-IP → per-user → per-endpoint. Weight expensive endpoints (a search costs 10 tokens, a health check costs 0).

**Client experience.** Always return `429` with `Retry-After`, plus `X-RateLimit-Limit/-Remaining/-Reset`. Publish the limits in your docs. A well-behaved client that can self-regulate reduces your load more than any enforcement mechanism.

**Rate limiting by IP is weak in Bangladesh specifically** — carrier-grade NAT puts thousands of mobile users behind one address, so an IP limit either blocks legitimate users or is set so high it's useless. Prefer authenticated identity as the key, and use IP only as a pre-auth defence with generous limits.

### Trade-offs

Accuracy vs latency is the whole design. Centralised is accurate and costs a round trip; local is free and drifts. At 100K checks/sec, the hybrid — enforce locally against a locally-held allowance, reconcile with Redis every N requests — gives ~99% accuracy at ~10% of the round trips.

---

## 3. Notification System (41M users — BD context)

Directly relevant to Banglalink BL-Power scale. See also the [full project walkthrough](../hands-on-projects/01-realtime-notification-system.md).

### Requirements

**Functional:** send push (FCM/APNs), SMS, email and in-app notifications; templates with localisation (Bangla + English); user preferences and quiet hours; scheduled and campaign sends; delivery tracking; deduplication.
**Non-functional:** 41M users; a campaign must reach 10M devices within 15 minutes; transactional notifications (OTP) p99 < 3 s end to end; at-least-once delivery with **exactly-once user-visible effect**; never send the same notification twice.

### Estimation

```
Transactional:  5M/day → 60/sec average, 500/sec peak
Campaign:       10M in 15 min → 10M / 900s ≈ 11,000 sends/sec sustained
                → the campaign path, not the transactional path, sizes the system
SMS cost:       10M × ৳0.30 ≈ ৳3,000,000 per campaign  ← cost is a design constraint
Storage:        50M notifications/day × 500 B ≈ 25 GB/day, 90-day retention ≈ 2.2 TB
```
The SMS cost number is worth stating: it justifies channel fallback logic (try push first, SMS only if push fails or the user has no app) and makes the deduplication requirement a financial one, not just a UX one.

### API

```http
POST /v1/notifications           # transactional, single recipient
{ "userId":"u_1", "templateId":"otp_login", "channel":"auto",
  "data":{"code":"482913"}, "idempotencyKey":"otp:u_1:2026-08-06T10:00" }

POST /v1/campaigns               # bulk
{ "segmentId":"seg_inactive_30d", "templateId":"winback_bn",
  "channels":["push","sms"], "scheduleAt":"2026-08-07T10:00:00+06:00" }

GET  /v1/notifications/{id}      → { status, attempts, deliveredAt, failureReason }
```

### Architecture

```
   Producers (apps, campaign scheduler, other services)
        │
   Notification API ──▶ Kafka: notifications.requested  (partitioned by userId)
        │                        │
        │              ┌─────────▼──────────┐
        │              │  Orchestrator      │ preference check, quiet hours,
        │              │  (consumer group)  │ dedup, template render, channel select
        │              └─────────┬──────────┘
        │                        │ fan out per channel
        │        ┌───────────────┼──────────────┬───────────────┐
        │   push.send        sms.send       email.send     inapp.send   (Kafka topics)
        │        │               │               │               │
        │   Push Worker     SMS Worker     Email Worker    WS Gateway
        │    (FCM/APNs)   (Infobip/BulkSMS)   (SES)      (Socket.IO+Redis)
        │        │               │               │               │
        │        └───────────────┴───────────────┴───────────────┘
        │                        │ delivery receipts / webhooks
        │              Kafka: notifications.status ──▶ Postgres + ClickHouse
        │
   Redis: dedup keys, preference cache, rate limits, user→socket registry
```

### Deep dives

**Deduplication / idempotency.** The requirement "never send twice" against an at-least-once broker is the crux of this problem. Two layers:
1. **Producer-supplied idempotency key** → `SET dedup:{key} 1 NX EX 86400`. If the key exists, drop.
2. **Per-channel send-record check** inside the same transaction as marking the send — an inbox table keyed by `(notification_id, channel)` with a unique constraint. Redelivery hits the constraint and is skipped.

Combined with partitioning by `userId` (so all of one user's notifications are processed in order by one consumer), this is robust.

**Campaign fan-out.** Do not materialise 10M rows in the API request. The scheduler resolves the segment to a **stream** of user IDs (a paginated query or a precomputed segment file in S3), and a fan-out worker publishes to Kafka in batches of ~1,000 with checkpointing, so a crash resumes rather than restarts. Rate-shape the publish to match downstream provider throughput — blasting 10M messages into a provider that accepts 5,000/sec just fills your own retry queues.

**Per-channel rate limits and provider quotas.** FCM, APNs and every SMS gateway have their own limits. Each worker enforces a token bucket against the provider quota and respects `Retry-After`. Consumer lag is the autoscaling signal (KEDA on Kafka lag).

**Retries and DLQ.** Classify failures: *permanent* (invalid token, unsubscribed number, hard bounce) → don't retry, mark the token invalid, remove it; *transient* (5xx, timeout, throttle) → exponential backoff with jitter, up to 5 attempts, then DLQ with an alert on DLQ depth.

**Quiet hours and preferences** are evaluated in the orchestrator against a Redis-cached preference record. Notifications generated during quiet hours are either queued to the window's end (marketing) or sent anyway (OTP, security) based on a per-template `bypassQuietHours` flag. Time zone matters: Bangladesh is UTC+6 and campaign scheduling must be in local time.

**Channel fallback with cost awareness.** Try push (free) → if no device token or the push isn't acknowledged within N minutes → SMS (expensive). This single rule can cut SMS spend by 80%, which is a business-level answer to a technical question.

### Trade-offs & scale

Kafka over RabbitMQ here because campaigns need replay (a bad template render should be fixable by replaying with a fixed template), multiple independent consumer groups (delivery, analytics, audit) read the same stream, and partition-level ordering per user is exactly the guarantee needed. At 10× campaign size, the bottleneck becomes the SMS provider, not your system — which means the architectural answer is multi-provider routing with per-provider health and cost-based selection.

---

## 4. Chat System (WhatsApp/Messenger)

### Requirements

**Functional:** 1:1 and group messaging (up to 500 members); online/offline presence; delivery receipts (sent/delivered/read); message history with pagination; media attachments; push notification when offline.
**Non-functional:** 50M DAU, 10M concurrent connections; message delivery p99 < 500 ms; **strict per-conversation ordering**; no message loss; history retained indefinitely.

### Estimation

```
Messages:     50M DAU × 40 msgs/day = 2B/day → 23,000 msgs/sec (peak ~70,000)
Connections:  10M concurrent × ~20 KB/conn ≈ 200 GB RAM across the gateway fleet
              at 100K connections/node → 100 gateway nodes
Storage:      2B/day × 300 B ≈ 600 GB/day ≈ 220 TB/year (text only)
Fan-out:      group of 500 → one send becomes 500 deliveries
```

### Architecture

```
   Mobile/Web ──WebSocket──▶ ┌──────────────────┐
                             │ Connection       │  stateful; holds the socket
                             │ Gateway (×100)   │  registers userId → gatewayId in Redis
                             └────────┬─────────┘
                                      │ gRPC
                             ┌────────▼─────────┐
                             │  Chat Service    │  persist → then deliver
                             └────────┬─────────┘
                       ┌──────────────┼──────────────┐
                  Cassandra       Redis pub/sub    Kafka
                (message store)  (routing between  (async: push notifications,
                 by conv_id      gateway nodes)     search index, analytics)
```

### Data model

```
-- Cassandra: partition per conversation, clustered by time-descending message id
CREATE TABLE messages (
  conversation_id  uuid,
  message_id       timeuuid,      -- Snowflake/timeuuid: sortable + unique
  sender_id        uuid,
  body             text,
  media_url        text,
  PRIMARY KEY ((conversation_id), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- Per-user inbox pointer for unread counts and sync
CREATE TABLE conversation_state (
  user_id uuid, conversation_id uuid,
  last_read_message_id timeuuid, unread_count counter,
  PRIMARY KEY ((user_id), conversation_id)
);
```
Cassandra because: writes vastly outnumber reads on the message store, the access pattern is always "latest N in one conversation" (a single-partition clustered scan), and it scales linearly with no resharding pain. The trade-off — no ad-hoc queries — is fine, because there are no ad-hoc queries in a chat product.

### Deep dives

**Message routing between gateways.** User A's socket is on gateway 7; user B's is on gateway 42. On send, the Chat Service looks up `user:{B}:gateway` in Redis and publishes to that gateway's channel; the gateway pushes down the socket. If B has no entry, B is offline → enqueue a push notification and store for later sync.

**Ordering.** Per-conversation ordering, not global. Generate message IDs server-side with a Snowflake ID (time-sortable) rather than trusting client clocks — clients are wrong, sometimes deliberately. Clients sort by `message_id`, so out-of-order arrival still renders correctly. For strict causality within a conversation, all messages for a conversation route through one partition.

**Delivery guarantees.** Three-stage acknowledgement: *sent* (server persisted it — return this to the sender only after the write is durable, not on receipt), *delivered* (recipient's device acked), *read* (recipient opened it). Each is a separate small event, and read receipts are batched to avoid a receipt storm in busy groups.

**Offline sync.** The client stores its highest-seen `message_id` per conversation and on reconnect requests everything after it. This makes reconnection idempotent and cheap, and is far more robust than server-side "pending message" queues.

**Group fan-out.** For small groups (< 500), fan out to each member on write — 500 writes to `conversation_state` plus 500 routing lookups is fine. Above that, the design changes to a shared conversation stream that clients pull from (which is how large broadcast channels work).

**Presence** is expensive and low-value if done naively — 10M users × subscribing to their contacts' status is a fan-out disaster. Practical answer: store `user:{id}:last_seen` in Redis with a 30-second TTL refreshed by heartbeat, and let clients *pull* presence for the conversations currently on screen rather than pushing every change to every contact.

**End-to-end encryption**, if asked: the server stores ciphertext and routes it; key exchange uses the Signal protocol (X3DH + Double Ratchet); the server can never read messages, which means **server-side search, and server-side spam detection, become impossible** — a genuine product trade-off worth naming.

### Trade-offs

WebSocket over SSE because chat is genuinely bidirectional and needs low per-message overhead. Cassandra over Postgres because of write volume and the clean partition key. The main cost is that the gateway tier is stateful — deploys must drain connections gracefully, and clients need reconnect-with-backoff-and-jitter or every deploy causes a 10M-client thundering herd.

---

## 5. News Feed (Twitter/Facebook)

The estimation for this problem is worked in full in the [fundamentals guide](01-system-design-fundamentals.md#q-worked-example--estimate-a-twitter-scale-news-feed): ~9K writes/sec, ~45K feed reads/sec, read-heavy by 5:1.

### The central decision: fan-out on write vs read

| | **Fan-out on write (push)** | **Fan-out on read (pull)** |
|---|---|---|
| On post | Write the post ID into every follower's feed list | Just store the post |
| On read | Read one precomputed list — **fast** | Query all followees, merge, sort — **slow** |
| Cost concentrated in | Writes (a 10M-follower account = 10M writes) | Reads (every read is a fan-in merge) |
| Latency | Read: ~5 ms | Read: ~200 ms+ |
| Wasted work | Feeds computed for users who never log in | None |

**The answer is hybrid**, and articulating the split is the point of the question:
- **Regular users (< ~10K followers): fan-out on write.** Push the post ID into each follower's Redis list on publish. Reads are a single `LRANGE`.
- **Celebrities (> ~10K followers): fan-out on read.** Don't push. At read time, merge the user's precomputed feed with a small query for the handful of celebrities they follow. Cache celebrity timelines aggressively — one cached list serves millions of readers.
- **Inactive users:** skip the fan-out entirely (or write to a much shorter list); rebuild on login. Most of the write amplification is for feeds nobody reads.

```
Publish path:
  POST /tweets → Post Service → Postgres/Cassandra (source of truth)
                              → Kafka: tweets.published
                                    │
                          ┌─────────▼──────────┐
                          │ Fan-out workers    │ follower count < 10K?
                          └─────────┬──────────┘   yes → LPUSH to each follower's
                                    │                    Redis feed (capped at 800)
                                    │              no  → skip (pull at read time)
Read path:
  GET /feed → Feed Service → Redis LRANGE (precomputed) ─┐
                           → celebrity timelines (cache) ─┼─▶ merge, rank, hydrate
                           → hydrate post bodies (cache) ─┘
```

### Deep dives

**Feed storage.** Store only **IDs** in the feed list (a capped Redis list of ~800 post IDs, ~8 KB per user), never the post bodies. Hydrate bodies from a separate cache on read. This keeps 150M feeds in a manageable amount of memory and means editing a post doesn't require rewriting millions of feed entries.

**Ranking.** Chronological is the simple answer. Ranked feeds add a scoring service (engagement prediction, recency decay, affinity) that scores a candidate set of a few hundred at read time. Say that the candidate generation (fan-out) and ranking (ML scoring) are separate stages — conflating them is the common mistake.

**Pagination** must be cursor-based on `(timestamp, post_id)`. Offset pagination on a feed that's constantly prepended to shows duplicates and skips items.

**The write amplification number** is worth computing out loud: a user with 10M followers posting once creates 10M writes. At 100 such posts a day that's 1B writes — which is why the celebrity exception exists, and it's the whole reason this problem is interesting.

---

## 6. Payment System (Stripe-like)

### Requirements

**Functional:** authorise, capture, refund and void card payments; idempotent API; webhooks to merchants; payouts; dispute handling.
**Non-functional:** **correctness absolutely dominates** — never double-charge, never lose a payment record; strong consistency on the ledger; full audit trail; PCI-DSS scope minimised; 99.99% availability.

### The three non-negotiables

**1. Idempotency on every mutating endpoint.**
```
POST /v1/payment_intents
Idempotency-Key: pi_req_9f3a...

Server: SELECT ... FROM idempotency_keys WHERE key = ? FOR UPDATE
  - not found  → insert (key, status=in_progress), execute, store response, return
  - in_progress → 409 Conflict (a retry arrived while the first is running)
  - completed  → replay the STORED response byte-for-byte (do NOT re-execute)
```
The stored response must be the exact original, including the original status code. Key TTL of 24 hours. This single mechanism is what makes network retries safe, and it is the first thing a payments interviewer looks for.

**2. Double-entry ledger.** Never store a mutable `balance` column. Store immutable, balanced entries; balance is a derived sum.
```sql
CREATE TABLE ledger_entries (
  id             BIGSERIAL PRIMARY KEY,
  transaction_id UUID        NOT NULL,        -- groups the entries of one event
  account_id     BIGINT      NOT NULL,
  direction      CHAR(1)     NOT NULL CHECK (direction IN ('D','C')),
  amount_minor   BIGINT      NOT NULL CHECK (amount_minor > 0),
  currency       CHAR(3)     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Invariant, enforced by a constraint trigger or verified continuously:
--   for every transaction_id, SUM(debits) = SUM(credits)
```
Every movement of money touches at least two accounts. A ৳1,000 payment: debit the customer's funding account ৳1,000; credit the merchant's payable account ৳980; credit the platform's fee revenue ৳20. It balances. This makes reconciliation possible, makes bugs detectable (a continuous job asserts global debits = credits), and gives auditors what they need. **Refusing to keep a mutable balance is the single most important design opinion in this problem.**

**3. State machine with explicit transitions.**
```
requires_payment_method → requires_confirmation → processing
      → succeeded → (refunded | partially_refunded)
      → requires_action (3DS) → processing
      → canceled / failed
```
Persist the state, allow only defined transitions, and record every transition with its cause. No ad-hoc status updates.

### Architecture

```
Merchant → API (idempotency layer) → Payment Orchestrator (saga)
                                          │
              ┌───────────────────────────┼──────────────────────┐
        Ledger Service              PSP Adapter(s)         Risk/Fraud
        (Postgres, ACID)            (card networks,        (sync scoring
              │                      bKash, SSLCommerz)     < 100 ms)
              │                            │
              └──── outbox → Kafka ────────┘
                             │
                  ┌──────────┴──────────┐
             Webhook Dispatcher     Reconciliation
             (retry w/ backoff,     (daily: compare our ledger
              HMAC-signed)           vs PSP settlement file)
```

### Deep dives

**Handling PSP uncertainty.** The hardest real problem: you send a charge request and the connection times out. Did it succeed? You cannot know. The answer is (a) always send your own idempotency key to the PSP so a retry is safe, and (b) run a **reconciliation** process that fetches the PSP's view and repairs discrepancies. Design for the assumption that your record and the PSP's record will diverge, and build the tooling to detect and fix it — daily reconciliation against the settlement file is not optional.

**Webhooks to merchants.** At-least-once with exponential backoff over hours, HMAC-SHA256 signature over the raw body with a timestamp to prevent replay, a stable `event_id` so merchants can dedupe, and a manual replay endpoint. Merchants' endpoints will be down; that's normal and the retry schedule should assume it.

**PCI scope.** Never let raw card numbers touch your servers. The card data goes from the browser directly to the PSP (or a tokenisation vault) via a hosted field/iframe, and you store only a token. This reduces your PCI scope from the full SAQ-D to SAQ-A and is worth stating as an architectural decision, not a compliance footnote.

**Consistency choice.** This is the clearest case in all of system design for choosing **CP over AP**. During a partition, refuse to process rather than risk double-spending. Money problems are where you say "I'll take unavailability over inconsistency" without hedging.

---

## 7. Mobile Financial Service (bKash/Nagad-like)

Highly relevant for BD fintech interviews. Everything from the payment system applies, plus:

### Additional requirements

**Functional:** cash-in and cash-out via an agent network; P2P send money; merchant payment; mobile top-up; bill payment; balance enquiry — over **app, USSD (`*247#`) and agent POS**.
**Non-functional:** works on feature phones over USSD (no smartphone assumed); works on 2G with high packet loss; Bangladesh Bank regulatory reporting; KYC/AML; transaction limits per tier; 24×7 with no maintenance window (people send money at 3 a.m.).

### What changes

**USSD as a first-class channel.** USSD sessions are short-lived (typically 90–180 s), stateful, and menu-driven. Architecturally: a USSD gateway maps operator sessions to your session store (Redis, keyed by MSISDN + session ID), each menu step is a request/response round trip, and **the session must be resumable if the network drops mid-flow**. Critically, the transaction is only committed at the final PIN confirmation — never at an intermediate step — because dropped sessions are routine, not exceptional.

**Agent network.** Agents have their own float balance (an account in the same ledger). Cash-in is a transfer from the agent's e-money account to the customer's; cash-out is the reverse plus physical cash. The ledger already handles this correctly if you modelled it as double-entry — agents are just accounts. Agent commission is a third leg of the same transaction. Agent float management (alerting when an agent is running low) is a real operational feature.

**Regulatory constraints (Bangladesh Bank):**
- Per-transaction, daily and monthly limits by KYC tier — enforced atomically as part of the transaction, not as a pre-check (a pre-check races).
- Full audit trail, immutable, retained for the mandated period.
- AML monitoring: structuring detection (many transactions just under a threshold), velocity rules, watchlist screening.
- Data residency requirements for financial data — which pushes toward in-country hosting or a specific cloud region, and is a legitimate constraint to raise.

**Idempotency over an unreliable network.** On 2G with 30% packet loss, users will tap "send" repeatedly. The client generates a request ID per user intent (not per HTTP attempt) and reuses it across retries. Server-side, the same idempotency machinery as the payment system. Then the UX layer: show a definitive terminal state, and provide a transaction-status lookup by reference number — because the user's next action after an ambiguous timeout is to call the agent or the helpline.

**PIN security.** PIN verified server-side, hashed with Argon2id, with a lockout after N failures and a rate limit per MSISDN. Never validate a PIN client-side, and never send it over USSD in a way that could be logged — USSD strings can appear in operator logs, which is why the final PIN entry is masked and short-lived.

**Offline agent scenarios.** When connectivity fails at the agent, the transaction must fail closed (no cash handed over) rather than optimistically succeed. Any "store and forward" design here is a fraud vector.

### Architecture note

```
 App / USSD Gateway / Agent POS / Merchant API
                  │
          API Gateway (channel-aware, per-channel rate limits)
                  │
      ┌───────────┼────────────┬──────────────┬──────────────┐
  Session Svc  Txn Orchestr.  Ledger Svc   Limits/KYC     Fraud/AML
  (USSD state)   (saga)       (Postgres,   (atomic         (real-time rules
                              double-entry) counters)       + batch)
                  │
        outbox → Kafka → notifications (SMS confirmation — mandatory, not optional)
                       → regulatory reporting → data warehouse
```
The SMS confirmation is worth calling out: for a feature-phone user, the SMS *is* the receipt, and its delivery is part of the transaction's user-visible completion.

---

## 8. Video Streaming (Netflix/YouTube)

### Requirements

**Functional:** upload, transcode, stream with adaptive quality, resume playback, subtitles, thumbnails.
**Non-functional:** 100M DAU; start playback in < 2 s; minimal rebuffering; support 240p (a real requirement on Bangladeshi mobile networks) through 4K; storage and egress cost dominate everything.

### Estimation

```
Uploads:  500 hours/min → 720K hours/day
          transcoded to 6 renditions ≈ 5× source size
Watch:    100M DAU × 1 hr/day = 100M hours/day
Bandwidth at peak: 10M concurrent × 3 Mbps average = 30 Tbps
          ← this number is why the answer is "CDN", and why CDN economics are the design
Storage:  1 hr of 1080p ≈ 3 GB; ×6 renditions ≈ 18 GB per source hour
          720K hr/day × 18 GB ≈ 13 PB/day
```
State the 30 Tbps figure early — it immediately establishes that origin serving is impossible and the design is fundamentally about the CDN and the encoding ladder.

### Pipeline

```
Upload (presigned S3 multipart, resumable)
   │ S3 event
   ▼
Ingest → validate, extract metadata (ffprobe), generate thumbnails
   │
   ▼ split into 5–10 s GOP-aligned segments
Transcode fleet (spot instances / MediaConvert, one job per segment — parallel)
   │  ladder: 240p 400k · 360p 800k · 480p 1.4M · 720p 2.8M · 1080p 5M · 4K 15M
   │  codecs: H.264 (universal) + AV1/HEVC (30–50% smaller, newer devices only)
   ▼
Package: HLS (.m3u8) + DASH (.mpd) manifests, per-segment files
   │
   ▼
S3 (origin) ──▶ CDN (multi-tier: edge PoP → regional shield → origin)
   │
   ▼
Player: fetches manifest → picks a rendition from measured bandwidth + buffer level
        → switches renditions mid-stream at segment boundaries (ABR)
```

### Deep dives

**Why segment-level parallel transcoding.** A 2-hour film transcoded serially takes hours; split into 5-second GOP-aligned segments, thousands of workers finish it in minutes. GOP alignment (every segment starts with a keyframe) is what makes both the parallel split and mid-stream quality switching possible.

**Adaptive bitrate is client-driven.** The server just publishes a manifest listing available renditions and segment URLs. The player measures throughput and buffer occupancy and picks. This means the *server* has almost no per-viewer logic — which is exactly why it can be served entirely from a CDN as static files. Say this: the elegance of HLS/DASH is that streaming video becomes a static file problem.

**CDN economics.** At 30 Tbps, egress is the dominant cost. Levers: better codecs (AV1 saves 30–50% of bytes — a direct multi-million-dollar saving at scale), per-title encoding (a cartoon needs far fewer bits than an action film at the same quality — encode adaptively rather than with a fixed ladder), and **ISP-embedded caching appliances** (Netflix Open Connect), which put the content inside the ISP's network so the bytes never cross a transit link. In a Bangladesh context, peering with local ISPs / placing a cache in a local IX is the equivalent move and dramatically improves both cost and startup latency.

**Startup latency** (< 2 s) comes from: a small first segment at a low bitrate (start at 480p, ramp up), preloading the manifest, CDN proximity, and a player that doesn't wait for a full buffer before playing.

**Live streaming** differs — see problem 14.

---

## 9. File Storage (Dropbox/Google Drive)

### Requirements

**Functional:** upload/download; sync across devices; share with permissions; version history; offline edits that sync later.
**Non-functional:** 500M users, 50M DAU; sync latency < 10 s; never lose or corrupt a file; storage-efficient.

### The two ideas that make this problem

**1. Chunking with content-addressed storage.** Split files into ~4 MB chunks; the chunk's ID is the hash of its content (SHA-256).

This gives you three things at once:
- **Delta sync** — editing one page of a 100 MB document changes one chunk; you upload 4 MB, not 100 MB. On a slow connection this is the difference between usable and not.
- **Deduplication** — identical chunks stored once, globally. The same PDF shared across 10,000 users occupies one copy. Typical savings are large.
- **Resumability** — a failed upload resumes at the chunk boundary.

```
File "report.pdf" (100 MB)
  → chunks: [sha256:a1f3…, sha256:9b2c…, …] (25 chunks)
  → client asks: "which of these do you already have?"  → server returns the missing set
  → client uploads only the missing chunks to S3, then commits the manifest
```

**2. Metadata vs block storage split.** Two very different systems:
- **Metadata service** (Postgres, sharded by user/workspace): file tree, names, permissions, version history, chunk manifests. Small records, transactional, queried constantly.
- **Block store** (S3): the chunks themselves. Immutable, content-addressed, huge, never queried by anything but hash.

Keeping these separate is what makes the design work — the metadata is small enough to be strongly consistent and the blocks are large enough to live in cheap object storage.

### Sync protocol

```
Client                                    Server
  │── long-poll /changes?cursor=X ──────▶ │  (or WebSocket)
  │◀─ { changes: [...], cursor: Y } ───── │
  │
  │  local change detected
  │── POST /commit { path, chunkHashes, parentVersion } ─▶
  │◀─ 200 { version }   or   409 CONFLICT { serverVersion }
```
The cursor makes sync resumable and idempotent. Conflicts are detected by comparing the parent version, exactly like optimistic locking.

### Deep dive: conflict resolution

Two devices edit the same file offline. Options:
- **Last-writer-wins** — silently destroys work. Unacceptable for user documents.
- **Conflicted copy** ✅ — keep both, rename one `report (conflicted copy — Ador's laptop).pdf`. Dropbox's choice. It never loses data and it's comprehensible to non-technical users, which matters more than elegance.
- **Operational transform / CRDT** — real merging, but only possible for structured document types you control (Google Docs). Not possible for arbitrary binaries.

Say why: for opaque files you cannot merge, so the only honest options are "lose one" or "keep both." Keeping both is right.

**Encryption:** encrypt chunks client-side for zero-knowledge storage — but note that client-side encryption defeats cross-user deduplication (identical plaintext produces different ciphertext with different keys). Convergent encryption (key derived from the content hash) restores dedup but leaks the fact that two users hold the same file. A real trade-off worth naming.

---

## 10. Search Autocomplete

### Requirements

Suggest the top 5 completions as the user types; **p99 < 10 ms** (it must feel instant, and it fires on every keystroke); personalised and trending-aware; typo tolerance; 10B queries/day.

### Estimation

```
10B queries/day, ~4 keystrokes each that trigger a request (debounced)
  → 10B / 10^5 ≈ 116,000 rps average → ~350,000 rps peak
Corpus: 100M distinct query prefixes
```
At 350K rps with a 10 ms budget, **every request must be served from memory with no database access.** That constraint dictates the entire design.

### Design

**Trie with precomputed top-K at each node.**
```
        (root)
          │
          d
          │
          h ── "dhaka"        top5: [dhaka weather, dhaka traffic, dhaka to ctg, …]
          │
          a ── "dha"          top5: [dhaka, dhaka weather, dhamrai, …]
```
Storing the top-K completions *at each node* turns the query from "traverse the subtree and rank" (expensive) into "walk to the node, return the stored list" (O(prefix length), microseconds).

**Build offline, serve online.** This is the key architectural split:
```
Query logs → Kafka → aggregation (Flink/Spark, hourly)
   → count frequencies over a sliding window (last 7 days, time-decayed)
   → filter (min frequency, blocklist, PII, adult terms)
   → build the trie with top-K per node
   → serialise, ship to serving nodes, atomic swap
```
The serving tier is stateless and read-only, holding the whole trie in memory (~1–2 GB compressed). Updates are hourly, which is fine — autocomplete doesn't need to be real-time, except for trending terms which can be injected via a small separate hot list.

**Sharding** by the first 1–2 characters across nodes, with replication for the hot prefixes.

### Deep dives

**Typo tolerance.** Full edit-distance search is too slow at 10 ms. Practical approaches: a precomputed correction map for common misspellings (built from query logs where users typed X then immediately typed Y and clicked), phonetic keys (Soundex/Metaphone) as a fallback, or fuzzy matching only on the *final* token. In a Bangla context, transliteration matters — users type "dhaka" and "ঢাকা" and expect both to work, so the trie holds both forms mapped to the same results.

**Personalisation** without blowing the latency budget: merge the global top-K with a small per-user recent-query list held in Redis (or in the client), client-side if possible. Don't attempt a per-user trie.

**Why not Elasticsearch?** You can (edge n-gram analyzer, completion suggester), and it's the right answer if you need it integrated with full search relevance and you can accept ~20–50 ms. A dedicated in-memory trie wins on latency and cost at extreme scale. Name both and pick based on the stated latency requirement — that's the interview signal.

---

## 11. Web Crawler

### Requirements

Crawl 1B pages/month; respect `robots.txt` and politeness; avoid duplicates; prioritise important and frequently-changing pages; extensible (later: extract structured data).

### Architecture

```
  Seed URLs
      │
      ▼
 ┌─────────────────── URL Frontier ──────────────────┐
 │  Priority queues (by importance/PageRank-ish)     │
 │  Back queues (one per host → politeness)          │
 │  Host→next-fetch-time heap (crawl delay)          │
 └───────────────────────┬───────────────────────────┘
                         ▼
              Fetcher pool (async, thousands of connections)
                         │
     robots.txt cache ───┤
     DNS cache ──────────┤
                         ▼
              Content Store (S3, raw HTML) + Kafka: pages.fetched
                         │
     ┌───────────────────┼────────────────────┐
 Dedup (SimHash)   Link extractor        Parsers/indexers
     │                   │
     └── seen? ──────────┴──▶ new URLs back into the Frontier
```

### Deep dives

**Politeness is the core constraint.** Never hammer one host. The frontier's structure exists for this: a **back queue per host** guarantees only one connection per host at a time, and a **priority heap keyed by "next allowed fetch time"** enforces the crawl delay (from `robots.txt` or a default of ~1 request/second). Distribute by hashing the *hostname* to a crawler node so all URLs for a host are handled by one node and politeness needs no coordination.

**Two levels of duplicate detection:**
- **URL dedup** — canonicalise (lowercase host, strip fragments, sort query params, remove tracking params), then check membership. At 100B URLs, a hash set doesn't fit — use a **Bloom filter** (≈1.2 GB for 1B URLs at 1% false positive) as a fast pre-filter, backed by a sharded key-value store for confirmation. Note the failure mode: a Bloom filter false positive means you *skip* a page you've never seen. That's acceptable here; the reverse would not be.
- **Content dedup** — many URLs serve identical or near-identical content. **SimHash** produces a fingerprint where similar documents have small Hamming distance, so near-duplicates (the same article on 50 mirror sites) are detected, not just exact ones.

**Traps.** Infinite calendars (`/calendar?date=…` forever), session IDs in URLs generating infinite variants, and deliberately adversarial link farms. Defences: max depth per host, max URLs per host, URL length limits, detecting repeating path patterns, and a crawl budget per domain proportional to its importance.

**Freshness.** Recrawl frequency should be adaptive — estimate each page's change rate from history and recrawl accordingly. A news homepage every 10 minutes; a static PDF every 6 months. Uniform recrawling wastes almost all of your budget.

---

## 12. Ride-Hailing (Uber/Pathao)

### Requirements

**Functional:** rider requests a ride; find nearby available drivers; match; track the trip live; fare calculation; payment.
**Non-functional:** 1M active drivers sending location every 4 s; match within 5 s; location updates must not overwhelm storage; works on unreliable mobile networks.

### Estimation

```
Driver location updates: 1M drivers / 4 s = 250,000 writes/sec
   ← this is the dominant number and the reason a normal database won't work
Ride requests: 10M/day → 116/sec average, ~500/sec at peak hours
```

### The core problem: geospatial indexing

You need "find all drivers within 3 km of this point" at 250K location writes/sec.

| Approach | Verdict |
|---|---|
| `WHERE lat BETWEEN … AND lng BETWEEN …` | A full scan; no usable index on two independent dimensions |
| Quadtree | Good; recursive subdivision adapts to density; harder to distribute |
| **Geohash** | Encode lat/lng into a string where a shared prefix = spatial proximity. Simple, indexable, shardable ✅ |
| **S2 / H3** | Google's S2 (spherical cells) and Uber's H3 (hexagons) — better geometry, no geohash edge artefacts |

**Geohash in practice:** `wh0r2` ≈ a ~5 km cell; a longer prefix is a smaller cell. Store drivers in Redis under their geohash cell key. A proximity query reads the driver's cell plus its 8 neighbours (necessary because the target might be just across a cell boundary — the classic geohash edge case) and filters by true distance.

Redis has this natively:
```
GEOADD drivers:available <lng> <lat> driver_123
GEOSEARCH drivers:available FROMLONLAT <lng> <lat> BYRADIUS 3 km ASC COUNT 20
```
H3 is the more sophisticated answer: hexagons have uniform neighbour distance (unlike squares, where diagonal neighbours are 1.41× further), which makes "expanding ring" searches clean. Uber built it for exactly this problem.

### Architecture

```
Driver app ──(location every 4s, batched)──▶ Location Ingest (stateless)
                                                  │
                                    Redis GEO (current position, TTL 30s)
                                                  │
                                    Kafka: locations (→ history, analytics, ETA models)

Rider app ──▶ Matching Service ──▶ Redis GEOSEARCH (candidate drivers)
                    │              → rank by ETA (not straight-line distance),
                    │                driver rating, acceptance rate
                    │              → offer to driver #1, 15 s to accept
                    │              → declined/timeout → offer to #2
                    ▼
              Trip Service (state machine) ──▶ Postgres
                    │
              WebSocket gateway → live location to the rider
```

### Deep dives

**Don't persist every location update.** 250K writes/sec into Postgres is absurd. Current position lives in Redis with a TTL (an expired key means the driver went offline — free failure detection). The raw stream goes to Kafka for the analytics/ML path and is compacted into trip polylines afterwards. Only the trip's route is durably stored.

**Rank by ETA, not distance.** The nearest driver by straight line may be across a river with a 20-minute detour — a very concrete Dhaka problem. Use a routing engine (OSRM, or a road-network graph with live traffic) to compute real ETAs for the ~20 candidates.

**Matching strategy.** Sequential offers (best driver first, 15 s to accept) is simple and gives drivers agency. Batched matching (collect requests over a few seconds and solve a global assignment problem) yields better system-wide efficiency but adds latency. Mention both; the batching approach is what mature systems converge on.

**Surge pricing** as a supply/demand signal computed per geohash cell over a short window — it's a rate, not a lookup, and it needs to be smoothed to avoid oscillation.

**Unreliable networks** (very relevant locally): the driver app batches and buffers location updates when offline and sends them with timestamps on reconnection; the server must accept out-of-order, late updates and ignore stale ones. The trip state machine must tolerate a driver being unreachable for minutes without cancelling the trip.

---

## 13. Ticket Booking (BookMyShow)

### Requirements

Browse events and seat maps; **hold a specific seat while the user pays**; never double-book; handle a flash sale where 500K users hit at once for 10K seats.

### The core problem: no overselling under extreme contention

Everything else in this design is easy; this is the whole question.

**The seat lifecycle:**
```
AVAILABLE ──hold(10 min)──▶ HELD ──payment success──▶ BOOKED
     ▲                        │
     └──── hold expires ──────┘
```

**Implementation — atomic conditional update, not a lock:**
```sql
-- Either this affects 1 row, or the seat was already taken. No race.
UPDATE seats
   SET status = 'HELD', held_by = $1, held_until = now() + interval '10 minutes'
 WHERE seat_id = $2
   AND (status = 'AVAILABLE'
        OR (status = 'HELD' AND held_until < now()));   -- reclaim expired holds
-- 0 rows affected → 409, seat already taken
```
The critical property: the check and the write are one statement, so two concurrent requests cannot both succeed. A `SELECT` then `UPDATE` would race. **Expiry is evaluated at read time** (`held_until < now()`) rather than depending on a cleanup job — the job is a nice-to-have for tidiness, but correctness must not depend on it running.

**For a flash sale**, the database becomes the bottleneck. Add a Redis pre-gate:
```lua
-- Atomically pop a seat from an available set; only the winner proceeds to Postgres
local seat = redis.call('SPOP', KEYS[1])
if not seat then return nil end
redis.call('SETEX', 'hold:'..seat, 600, ARGV[1])
return seat
```
Redis absorbs the contention at ~100K ops/sec; only successful claims reach Postgres. Redis is an optimisation, Postgres remains the source of truth, and a reconciliation job repairs any divergence.

### Flash-sale architecture

```
500K users ──▶ CDN (static seat map, event info — most traffic never reaches you)
                  │
             Waiting room / virtual queue  ← admit N users per second
                  │                          (this is the real answer to 500K users)
             API (rate limited per user)
                  │
             Redis (seat inventory, atomic SPOP)
                  │
             Postgres (source of truth, holds & bookings)
                  │
             Payment (10-min window) → confirm or release
```

**The virtual queue is the most important piece** and the one candidates miss. You cannot serve 500K simultaneous booking attempts for 10K seats — 98% of them must fail anyway. Issue queue tokens, show a position and estimated wait, and admit users at a rate your backend can actually serve. This turns a stampede into a manageable flow and produces a far better user experience than 500K people getting timeouts.

**Other details:** hold duration is a trade-off (too short frustrates users on slow connections; too long blocks inventory — 10 minutes with a visible countdown is the norm); best-available-seat selection should assign server-side to avoid everyone fighting over the same "good" seat; and adjacent-seat requirements ("4 seats together") need the allocation to be atomic across all 4, which means one transaction covering the set.

---

## 14. Live Streaming (Agora + RTMP)

Directly relevant if you have live-streaming experience. See also the [real-time systems guide](../phase-2-apis-realtime-systems/03-realtime-systems-agora.md).

### The central trade-off: latency vs scale vs cost

| Protocol | Latency | Scale | Cost | Use |
|---|---|---|---|---|
| **WebRTC** | **< 500 ms** | Hundreds without an SFU; thousands with | High | Interactive: video calls, co-hosting, auctions |
| **LL-HLS / LL-DASH** | 2–5 s | Millions (CDN) | Low | Near-live broadcast where slight delay is fine |
| **HLS / DASH** | 10–30 s | Millions (CDN) | Lowest | One-to-many broadcast, sports, concerts |
| **RTMP** | 2–5 s | Ingest only (deprecated for playback) | — | Publisher → server ingest |

**The rule:** interactivity requires WebRTC; scale requires HLS over a CDN; and you often need both in one product.

### Architecture — a hybrid live commerce / interactive stream

```
Host (broadcaster)
   │ WebRTC (low latency, interactive)
   ▼
 SFU (Selective Forwarding Unit — Agora / mediasoup / Janus)
   │                                   │
   │ forwards to co-hosts (< 500 ms)   │ also transcodes + packages
   │                                   ▼
Co-hosts / guests               RTMP/SRT → Transcoder → HLS packager → S3 → CDN
                                                                          │
                                                        Viewers (millions, 5–20 s delay)
Chat / reactions / gifts: separate WebSocket path (Socket.IO + Redis adapter),
   deliberately NOT in the media path — so chat stays sub-second even when video lags
```

**Why an SFU and not an MCU or a mesh:** a mesh (everyone connects to everyone) is O(n²) and dies past ~4 participants. An MCU composites all streams server-side into one — low client bandwidth but very high server CPU and added latency. An **SFU** just forwards streams selectively — modest server cost, scales to dozens of participants, and lets each client choose which quality of which stream it wants (simulcast). SFU is the standard answer.

### Deep dives

**Simulcast:** the publisher sends 2–3 quality layers; the SFU forwards the appropriate layer to each subscriber based on their measured bandwidth. This is how one broadcaster serves a viewer on fibre and a viewer on 3G simultaneously without transcoding — essential in a market with wide network variance.

**Why UDP.** WebRTC media runs over UDP because retransmitting a 300 ms-old audio frame is worthless — you want the next frame. Loss is concealed (packet loss concealment, forward error correction) rather than corrected. This is the concrete answer to "when would you use UDP over TCP".

**Recording and VOD:** the transcoder writes segments to S3 as it goes, so the VOD asset exists moments after the stream ends rather than requiring a separate post-processing pass.

**Scaling the chat path** for a stream with 1M viewers: you cannot deliver every message to every viewer. Sample and aggregate — show a subset of messages, aggregate reactions into counts ("2.3K ❤️"), and rate limit per user. The chat fan-out is a bigger engineering problem than the video at that scale.

**BD-specific concerns:** network variance is extreme, so the ABR ladder must include very low bitrates (240p at 400 kbps) and the player must fall back gracefully rather than buffering forever; and a local CDN PoP or IX peering makes a dramatic difference to both startup time and cost.

---

## 15. Voucher / Coupon System (Daraz context)

An underrated problem — it looks like CRUD and is actually a concurrency and abuse problem.

### Requirements

**Functional:** create campaigns with rules (percentage/fixed discount, min spend, category restriction, first-order-only, per-user limit, total redemption cap); validate at checkout; apply and record redemption; support stacking rules.
**Non-functional:** **never exceed the redemption cap** (each excess redemption is direct money lost); validation adds < 50 ms to checkout; survives a flash campaign with 100K concurrent attempts; auditable.

### The two hard parts

**1. Atomic redemption against a global cap.**

```lua
-- Redis: check cap, per-user limit, and reserve — atomically
-- KEYS[1]=voucher:{code}:used  KEYS[2]=voucher:{code}:users  ARGV[1]=cap
-- ARGV[2]=userId  ARGV[3]=perUserLimit
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if used >= tonumber(ARGV[1]) then return {0, 'CAP_REACHED'} end

local userUsed = tonumber(redis.call('HGET', KEYS[2], ARGV[2]) or '0')
if userUsed >= tonumber(ARGV[3]) then return {0, 'USER_LIMIT'} end

redis.call('INCR', KEYS[1])
redis.call('HINCRBY', KEYS[2], ARGV[2], 1)
return {1, 'OK'}
```
A read-then-write in application code races and *will* oversell under a flash campaign. It must be one atomic operation. Then a **two-phase flow**: reserve at checkout start, confirm on payment success, release on failure or timeout — otherwise abandoned carts consume the cap permanently.

The durable record still goes to Postgres with a unique constraint as the final backstop:
```sql
CREATE TABLE voucher_redemptions (
  voucher_id BIGINT NOT NULL,
  user_id    BIGINT NOT NULL,
  order_id   BIGINT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, order_id)                     -- idempotency backstop
);
CREATE UNIQUE INDEX ON voucher_redemptions (voucher_id, user_id)
  WHERE /* per-user-limit = 1 campaigns */ true;    -- DB enforces what Redis optimises
```
State the layering explicitly: **Redis for speed, Postgres constraints for correctness.** If Redis is wrong (restart, failover, split brain), the database still refuses to oversell — it just does so more slowly.

**2. The rule engine.** Vouchers accumulate rules endlessly, so hard-coding conditions becomes unmaintainable within two quarters. Model rules as data:

```ts
type Rule =
  | { type: 'min_order_value'; amountMinor: number }
  | { type: 'category_in';      categoryIds: string[] }
  | { type: 'first_order_only' }
  | { type: 'user_segment_in';  segmentIds: string[] }
  | { type: 'payment_method_in'; methods: string[] }   // e.g. bKash-only promos
  | { type: 'valid_between';    from: string; to: string };

// Each rule is a small pure predicate; a voucher is a list of them.
const evaluators: Record<Rule['type'], (r: any, ctx: CartContext) => boolean> = { … };
const applies = voucher.rules.every(r => evaluators[r.type](r, ctx));
```
This is the Strategy pattern, and it means a new rule type is a new evaluator plus a config change — not a redeploy of checkout logic for every marketing campaign.

**Stacking** needs an explicit policy: exclusive (one voucher only), additive (sum the discounts), or priority-ordered (apply the best single one). Decide it, encode it, and cap the total discount so a stacking bug can't produce a negative order total — a real failure mode with real money attached.

### Abuse prevention

The part that separates a working system from a profitable one:
- **Per-user limits keyed on something hard to rotate** — a phone number or payment instrument, not an email address (infinite `+alias` addresses) or a device ID (resettable).
- **Velocity rules** — N redemptions per device/IP/payment-card per hour, regardless of account.
- **First-order-only verification** against actual order history, not account age.
- **Referral-loop detection** — clusters of accounts referring each other, detectable as a graph problem.
- **Post-hoc analysis** — a batch job flagging suspicious redemption patterns for clawback, because real-time rules can't catch everything and you need the ability to reverse.

### Architecture

```
Checkout ──▶ Voucher Service
                │  1. load voucher + rules (Redis cache, DB fallback)
                │  2. evaluate rules against cart context
                │  3. atomic reserve (Redis Lua)
                │  4. return discount + reservation token
                ▼
           Order Service ── payment success ──▶ confirm redemption
                                              (Postgres insert, unique constraint)
                        ── failure/timeout ──▶ release reservation
                │
           outbox → Kafka → analytics (campaign performance, fraud signals)
```

---

## How to Practise

1. **Set a 45-minute timer.** Talk out loud, draw on paper or Excalidraw.
2. **Always do the estimation**, even when it feels like a detour — it's what justifies every later decision.
3. **After each attempt**, check yourself against three questions: did I state the read:write ratio? did I name a bottleneck specifically? did I say what I'd change at 10×?
4. **Rotate the deep dive.** Do the same problem twice, going deep on a different component each time — that's the real skill being tested.
5. **Have your own systems ready.** For any problem here, connect it to something you built: notification fan-out at Banglalink scale, live-streaming architecture, the voucher revamp. A concrete "we did this and hit this problem" is worth more than a textbook answer.
