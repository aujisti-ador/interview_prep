# Choosing the Right Database — Types, Trade-offs & Decision Guide

> The other guides in this phase go deep on one database each. This one is the map: what kinds
> of database exist, what each is genuinely good at, and how to pick — out loud, with reasons —
> in a system design interview.

## In 60 seconds

1. **The default answer is PostgreSQL, and it is a good answer.** It handles relational data,
   JSON documents, full-text search, geospatial queries, time-series (via TimescaleDB) and
   vectors (via pgvector). Most systems never need a second database.
2. **Every extra database costs you far more than the query it improves.** Backups, monitoring,
   failover, on-call knowledge, a new failure mode, and one more thing to keep consistent.
   **Adding a database is an operational decision, not a technical one.**
3. **The question that actually decides it: what is the access pattern?** Not "how much data" —
   *how do you read it*. One row by id, a range scan, a full-text search, an aggregation over a
   billion rows, or a traversal across relationships. Each of those has a shape of database
   built for it.
4. **The one-line rule for each type:**
   ```
   Relational  →  data with relationships, and you need transactions
   Key-value   →  you always know the exact key
   Document    →  self-contained records read whole
   Wide-column →  enormous write volume, queries known in advance
   Search      →  humans typing words, ranked by relevance
   Time-series →  measurements over time, mostly recent, mostly appends
   Graph       →  the relationships ARE the data ("friends of friends of friends")
   Columnar    →  aggregating a few columns across billions of rows
   Vector      →  "find me things similar in meaning to this"
   ```
5. **"NoSQL is faster" is not a reason and it is a red flag in interviews.** NoSQL is faster at
   *specific access patterns* because it gives something up — usually joins, transactions, or
   flexible querying. Name what you are giving up.
6. **Real systems use several, on purpose.** Postgres as the source of truth, Redis for hot
   reads, Elasticsearch for search, S3 for files, ClickHouse for analytics. That is called
   polyglot persistence, and the skill is justifying each addition.

**The interview trap to expect:** *"which database would you use for this?"* The wrong answer is
a product name. The right answer states the access pattern first, proposes the boring option,
and says what would make you change your mind: *"reads are by primary key with strict
consistency, so Postgres. If write volume passed ~50k/sec I would revisit Cassandra, accepting
the loss of joins."*

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Access pattern** | A specific question your app asks the database. Design starts here |
| **OLTP** | Online Transaction Processing — many small reads and writes. Your app's database |
| **OLAP** | Online Analytical Processing — few huge aggregations. Your analytics database |
| **Row-oriented** | Stores a whole row together. Fast to fetch one record |
| **Columnar** | Stores each column together. Fast to aggregate one column over billions of rows |
| **Primary key lookup** | Fetching one record when you know its exact id. The cheapest query there is |
| **Range scan** | Fetching records between two values, e.g. a date range |
| **Full-table scan** | Reading everything. Fine at 1,000 rows, fatal at 100 million |
| **Join** | Combining rows from two tables by a shared value |
| **Denormalisation** | Duplicating data so a read needs no join |
| **Transaction** | Several changes that all succeed or all fail together |
| **ACID** | Atomic, Consistent, Isolated, Durable — the guarantees a transaction gives |
| **Strong consistency** | Every read sees the latest write |
| **Eventual consistency** | Reads catch up shortly after |
| **Write amplification** | One logical write causing several physical writes |
| **LSM tree** | A write-optimised storage design. Fast writes, slower reads. Cassandra, RocksDB |
| **B-tree** | A read-optimised storage design. The classic relational index |
| **Inverted index** | Word → list of documents containing it. How search engines work |
| **Embedding** | A list of numbers representing meaning. Similar text → similar numbers |
| **Polyglot persistence** | Deliberately using several database types in one system |
| **Source of truth** | The one database that is authoritative. Everything else is derived |
| **CDC** | Change Data Capture — streaming changes out of a database to keep others in sync |

---

## Table of Contents

1. [How to actually choose](#1-how-to-actually-choose)
2. [Relational (OLTP) — PostgreSQL, MySQL](#2-relational-oltp--postgresql-mysql)
3. [Key-value — Redis, DynamoDB](#3-key-value--redis-dynamodb)
4. [Document — MongoDB](#4-document--mongodb)
5. [Wide-column — Cassandra, ScyllaDB](#5-wide-column--cassandra-scylladb)
6. [Search — Elasticsearch, OpenSearch](#6-search--elasticsearch-opensearch)
7. [Time-series — TimescaleDB, InfluxDB, Prometheus](#7-time-series--timescaledb-influxdb-prometheus)
8. [Graph — Neo4j](#8-graph--neo4j)
9. [Columnar / OLAP — ClickHouse, BigQuery, Redshift](#9-columnar--olap--clickhouse-bigquery-redshift)
10. [Vector — pgvector, Qdrant, Pinecone](#10-vector--pgvector-qdrant-pinecone)
11. [Object storage — S3](#11-object-storage--s3)
12. [Embedded — SQLite](#12-embedded--sqlite)
13. [Distributed SQL — CockroachDB, Spanner, YugabyteDB](#13-distributed-sql--cockroachdb-spanner-yugabytedb)
14. [The master comparison table](#14-the-master-comparison-table)
15. [Polyglot persistence — using several on purpose](#15-polyglot-persistence--using-several-on-purpose)
16. [Worked examples — five real systems](#16-worked-examples--five-real-systems)
17. [Interview questions](#17-interview-questions)
18. [The mistakes that get noticed](#18-the-mistakes-that-get-noticed)

---

## 1. How to actually choose

### Q1: An interviewer says "pick a database for this". What is your method?

**Answer:**

Do not start from products. Start from four questions, in this order.

**Step 1 — What are the access patterns?**

Write them down as sentences. This single step does most of the work.

```
"Get one order by its id"                        → any database. Key-value is enough
"Get all orders for a customer, newest first"    → needs an index on (customer_id, created_at)
"Find orders where the description mentions X"   → full-text search
"Total revenue per country per month, 3 years"   → analytical aggregation
"Which users are within 2 hops of this user"     → graph traversal
"Show CPU usage for this server over 24h"        → time-series
"Find products similar in meaning to this one"   → vector similarity
```

**Step 2 — What are the consistency requirements?**

Ask it per feature, not for the whole system:

| Data | Tolerates staleness? |
|---|---|
| Account balance, inventory count | **No.** Strong consistency. This is a relational transaction |
| Social feed, view counts, recommendations | **Yes.** Eventual consistency is fine and much cheaper |

**Step 3 — What is the read/write shape?**

- Write-heavy with simple reads → LSM-tree databases (Cassandra, ScyllaDB)
- Read-heavy with complex queries → relational + caching
- Append-only, mostly recent reads → time-series
- Written once, read for aggregation → columnar

**Step 4 — What is the actual scale, in numbers?**

Say them out loud. Most systems are far smaller than people design for:

```
1,000 writes/sec  ·  500 GB  →  one PostgreSQL instance, comfortably
10,000 writes/sec ·  5 TB    →  PostgreSQL with read replicas and partitioning
100,000 writes/sec·  50 TB   →  now the conversation about Cassandra is real
```

**Then, and only then, name a product** — with the trade-off attached.

### Q2: What is the default, and when should you leave it?

**Answer:**

> **Start with PostgreSQL. Leave it only when you can name the specific thing it cannot do.**

This is the correct senior answer and it is more impressive than naming something exotic,
because PostgreSQL genuinely covers an enormous range:

| You need | Postgres feature | Do you need another database? |
|---|---|---|
| Relational data, transactions | Core | No |
| JSON documents | `JSONB` + GIN index | Usually no |
| Full-text search | `tsvector` + GIN | Not until relevance ranking matters |
| Geospatial | PostGIS | No — PostGIS is best in class |
| Time-series | TimescaleDB extension | Not until very high ingest |
| Vector similarity | pgvector extension | Not until tens of millions of vectors |
| Queue | `SELECT ... FOR UPDATE SKIP LOCKED` | Not at low volume |

**Say this in an interview:** *"I would use PostgreSQL until a specific limit forces me off it,
because a second database costs backups, monitoring, failover and on-call knowledge — and that
cost is paid every day, not once."*

### Q3: What does adding a second database actually cost?

**Answer:**

This is the part candidates forget, and mentioning it unprompted marks you as someone who has
operated systems rather than only built them.

| Cost | What it means in practice |
|---|---|
| **Operational** | Backups, restore drills, upgrades, monitoring, alerting — for a second system |
| **Consistency** | Two stores now disagree at times. Something must reconcile them |
| **Failure modes** | "Search is down but the app is up" is now a state you must design for |
| **Knowledge** | Everyone on call must understand it at 3am |
| **Transactions** | You cannot wrap a Postgres write and an Elasticsearch write in one transaction |
| **Cost** | Another cluster to pay for and right-size |

**The rule of thumb:** a second database should buy you an order of magnitude, not 30%.

---

## 2. Relational (OLTP) — PostgreSQL, MySQL

### What it is

Data in tables of rows and columns, with a fixed schema and relationships between tables
enforced by the database itself.

```
users                          orders
┌────┬─────────┐               ┌────┬─────────┬────────┐
│ id │ name    │               │ id │ user_id │ total  │
├────┼─────────┤               ├────┼─────────┼────────┤
│  1 │ Rabbi   │◀──────────────│ 91 │    1    │  4200  │
│  2 │ Nadia   │   foreign key │ 92 │    1    │   850  │
└────┴─────────┘               │ 93 │    2    │  1600  │
                               └────┴─────────┴────────┘
        JOIN combines them at query time
```

### When to use it

- **You have relationships** and need to query across them
- **You need transactions** — money, inventory, bookings, anything where a partial write is
  unacceptable
- **Your query patterns will change** — SQL lets you ask questions you did not plan for
- **You need strong consistency** — the read after a write must see it

### When not to use it

- Ingest above roughly 50–100k writes/sec sustained on one node
- Data with no relationships at all and a single access pattern (key-value is simpler)
- Aggregating billions of rows for analytics (columnar wins by 10–100×)

### Example

```sql
-- The thing only a relational database does well: a transaction across tables
BEGIN;
  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
  INSERT INTO transfers (from_id, to_id, amount) VALUES (1, 2, 500);
COMMIT;
-- Either all three happen, or none do. No other database type gives you
-- this as simply.
```

### Real products

| Product | Notes |
|---|---|
| **PostgreSQL** | The default. Richest feature set, huge extension ecosystem |
| **MySQL** | Very common, slightly simpler, weaker on advanced SQL |
| **Amazon Aurora** | Managed Postgres/MySQL with storage separated from compute |

### The interview line

> "Relational, because inventory and payments need a real transaction. If reads outgrow one
> node I add read replicas before I consider anything else."

---

## 3. Key-value — Redis, DynamoDB

### What it is

A giant hash map. You store a value under a key, and you fetch it by that exact key. There is
no querying by anything else.

```
"session:abc123"      →  { userId: 42, expires: ... }
"cart:user:42"        →  [ {sku: "X1", qty: 2}, ... ]
"rate:ip:1.2.3.4"     →  17
```

### When to use it

- **You always know the key.** Sessions, caches, feature flags, shopping carts, rate-limit
  counters
- **You need extreme speed** — sub-millisecond
- **The value is opaque** — you never query inside it

### When not to use it

- You need to ask "find all X where Y" — a key-value store cannot answer that without scanning
- You need relationships or transactions across many keys

### Example

```ts
// Redis: the access pattern is always "I know the key"
await redis.setex(`session:${token}`, 3600, JSON.stringify(session));
const session = await redis.get(`session:${token}`);

// This is the query a key-value store CANNOT do:
//   "find all sessions belonging to user 42"
// You would have to maintain that index yourself:
await redis.sadd(`user:42:sessions`, token);
```

That last comment is the whole trade-off. **In a key-value store, you build every index by
hand.** That is fine for two access patterns and unbearable for twenty.

### Real products

| Product | Notes |
|---|---|
| **Redis** | In-memory, sub-millisecond, rich data structures. Usually a cache, not a source of truth |
| **DynamoDB** | Managed, durable, scales without effort. Charged per read/write unit |
| **Memcached** | Simpler and older than Redis. Rarely the right choice today |

### The interview line

> "Redis for sessions and rate limiting — the key is always known and I want sub-millisecond
> reads. It is a cache, so the system must still work when it is empty."

---

## 4. Document — MongoDB

### What it is

Stores JSON-like documents. Each document is self-contained and there is no enforced schema.

```json
{
  "_id": "order_91",
  "customer": { "id": 1, "name": "Rabbi", "city": "Dhaka" },
  "items": [
    { "sku": "X1", "name": "Cable", "qty": 2, "price": 300 },
    { "sku": "Y7", "name": "Adapter", "qty": 1, "price": 1200 }
  ],
  "total": 1800
}
```

Notice: the customer's name and the item names are **copied into** the order. One read returns
everything — no joins.

### When to use it

- **Records are read and written whole**, and vary in shape
- **The schema genuinely differs per record** — product catalogues where a laptop and a T-shirt
  have nothing in common
- You are prototyping and the shape is still moving

### When not to use it

- **You have relationships you will query across.** This is the mistake people regret. If you
  find yourself doing lookups to join documents, you wanted a relational database
- You need transactions across many documents (possible now, but it is not what Mongo is for)
- **"It scales better"** — Postgres with `JSONB` gives you documents *and* joins *and*
  transactions. Compare honestly

### Example

```js
// Good fit: the document is self-contained and read whole
db.orders.findOne({ _id: "order_91" })          // one read, everything you need

// The trap: this looks fine and does not scale
const order = await db.orders.findOne({ _id })
const customer = await db.customers.findOne({ _id: order.customerId })  // manual join
const shipping = await db.shipments.findOne({ orderId: _id })           // another
// Three round trips. In SQL this is one query. If your code looks like
// this, you chose the wrong database.
```

### The design rule

**Embed what is read together and bounded. Reference what grows without limit.**

```
Embed:     order items       (a few, always read with the order)
Reference: a user's orders   (grows forever — a user could have 10,000)
```

MongoDB documents cap at 16 MB, which is a real constraint: "embed the comments in the post"
works until a post gets 50,000 comments.

### The interview line

> "Document store if records are self-contained and read whole. But I would check Postgres
> `JSONB` first — it gives me documents *and* joins, and I lose nothing."

---

## 5. Wide-column — Cassandra, ScyllaDB

### What it is

Rows spread across many machines by a partition key, with columns clustered and sorted inside
each partition. Built to absorb enormous write volume with no single master.

```
partition key: sensor_id      clustering key: timestamp DESC
┌──────────────────────────────────────────────────────┐
│ sensor_42 │ 10:03 → 21.4 │ 10:02 → 21.5 │ 10:01 → ... │  ← one partition, sorted
├──────────────────────────────────────────────────────┤
│ sensor_43 │ 10:03 → 19.8 │ 10:02 → 19.9 │ ...         │  ← another machine
└──────────────────────────────────────────────────────┘
```

### When to use it

- **Write volume that a single relational node cannot take** — hundreds of thousands per second
- **You know every query in advance** and can design tables for each
- **You need multi-region writes** with no single point of failure
- Time-ordered data at very large scale: messages, events, sensor readings

### When not to use it

- **You do not know your queries yet.** Cassandra has essentially no ad-hoc querying — you
  cannot filter by a non-key column without a full scan
- You need joins, transactions, or aggregates
- **Your scale does not justify it.** This is the most over-chosen database in interviews.
  Below ~50k writes/sec you are adding enormous complexity for nothing

### Example

```sql
-- In Cassandra you create ONE TABLE PER QUERY. This is normal, not a smell.
CREATE TABLE messages_by_room (
  room_id    uuid,
  created_at timeuuid,
  sender_id  uuid,
  body       text,
  PRIMARY KEY ((room_id), created_at)      -- partition by room, sorted by time
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Need messages by sender too? A SECOND TABLE with the same data:
CREATE TABLE messages_by_sender (
  sender_id  uuid,
  created_at timeuuid,
  room_id    uuid,
  body       text,
  PRIMARY KEY ((sender_id), created_at)
);
-- You write to both. Duplication is the design, not an accident.
```

That duplication is the deal Cassandra offers: **you give up flexible querying and accept
writing the same data several times, in exchange for near-unlimited write throughput.**

### The interview line

> "Cassandra if writes exceed what a partitioned Postgres can take and every query is known
> ahead of time. At our stated 8,000 writes/sec it would be premature — Postgres handles that
> comfortably."

---

## 6. Search — Elasticsearch, OpenSearch

### What it is

An **inverted index**: instead of storing documents and scanning them, it stores each word and
the list of documents containing it.

```
Documents:
  1: "fast wireless charger"
  2: "wireless keyboard"
  3: "fast delivery"

Inverted index:
  "fast"      → [1, 3]
  "wireless"  → [1, 2]
  "charger"   → [1]
  "keyboard"  → [2]

Search "fast wireless" → doc 1 matches both → ranked highest
```

### When to use it

- **A human is typing words** and expects ranked, relevant results
- You need typo tolerance, stemming (`running` matching `run`), synonyms, autocomplete
- Faceted filtering — "show counts per brand, per price bracket"
- Log search across huge volumes

### When not to use it

- **As your source of truth.** It is a derived index. It can be rebuilt, and one day it will
  have to be
- Simple `LIKE '%word%'` needs — Postgres full-text search is enough for a long time
- When you need transactions or strong consistency (indexing is asynchronous)

### Example

```json
// The thing SQL cannot do: relevance ranking with typo tolerance
GET /products/_search
{
  "query": {
    "multi_match": {
      "query": "wireles charger",
      "fields": ["name^3", "description"],
      "fuzziness": "AUTO"
    }
  }
}
// Finds "wireless charger" despite the typo, and weights a name
// match 3x higher than a description match.
```

**In SQL this is not just harder — it is a different problem.** `WHERE name LIKE '%wireles%'`
returns nothing, and cannot rank what it does return.

### The consistency problem you must mention

Postgres is the source of truth; Elasticsearch is a copy. They will diverge.

```
write → Postgres  ──(outbox / CDC)──▶  queue  ──▶  indexer  ──▶  Elasticsearch
                                                                  (seconds behind)
```

Say this out loud: *"search results are eventually consistent — a product edited a second ago
may show its old name for a moment. For search that is acceptable; that is why the index is not
the source of truth."*

### The interview line

> "Elasticsearch once relevance ranking and typo tolerance matter. Before that, Postgres
> full-text search. And it is always a derived index kept in sync by CDC, never the source of
> truth."

---

## 7. Time-series — TimescaleDB, InfluxDB, Prometheus

### What it is

Optimised for data that arrives in time order, is almost never updated, and is queried mostly
by recent time ranges.

```
timestamp             metric        tags                  value
2026-08-11 10:00:00   cpu_usage     host=api-1,env=prod   0.62
2026-08-11 10:00:10   cpu_usage     host=api-1,env=prod   0.71
2026-08-11 10:00:20   cpu_usage     host=api-1,env=prod   0.68
```

Three things make these databases different:

1. **Automatic partitioning by time**, so a query for "last hour" touches one small chunk
2. **Heavy compression** — adjacent values are similar, so they compress 10–20×
3. **Retention and downsampling** — keep 10-second detail for a week, then hourly averages for
   a year, then drop it

### When to use it

- Metrics, IoT sensors, application monitoring, financial ticks
- **Appends dominate; updates are rare or absent**
- Queries are "over this time range, grouped by this interval"

### When not to use it

- General application data (there is nothing time-shaped about a user record)
- You need to update or delete individual rows frequently

### Example

```sql
-- TimescaleDB is a PostgreSQL extension, so it is still just SQL
SELECT time_bucket('5 minutes', ts) AS bucket,
       host,
       avg(value) AS avg_cpu,
       max(value) AS peak_cpu
FROM metrics
WHERE metric = 'cpu_usage'
  AND ts > now() - interval '24 hours'
GROUP BY bucket, host
ORDER BY bucket DESC;
```

**Why TimescaleDB is usually the right pick for you:** it is Postgres. Same SQL, same drivers,
same backups, same operational knowledge. You add an extension instead of a system.

### Real products

| Product | Use it when |
|---|---|
| **TimescaleDB** | You already run Postgres. Almost always the right first answer |
| **InfluxDB** | Purpose-built, very high ingest, its own query language |
| **Prometheus** | Infrastructure monitoring specifically. Pull-based, short retention |
| **ClickHouse** | When time-series volume becomes genuinely analytical scale |

### The interview line

> "TimescaleDB, because it is a Postgres extension — I get time partitioning and compression
> without adding a system to operate. If ingest passed a few hundred thousand points a second I
> would look at ClickHouse."

---

## 8. Graph — Neo4j

### What it is

Data stored as **nodes** and **relationships**, where relationships are first-class and
traversing them is cheap.

```
(Rabbi)──FOLLOWS──▶(Nadia)──FOLLOWS──▶(Karim)──FOLLOWS──▶(Sadia)
   │
   └───WORKS_AT──▶(Banglalink)◀──WORKS_AT───(Tanvir)
```

### When to use it

**Only when the relationships themselves are what you query**, and the depth is variable or
unknown:

- "People within 3 connections of me" (LinkedIn)
- "Recommend products bought by people who bought what I bought"
- Fraud rings — "does this account connect to a known fraudulent one through any path?"
- Permission hierarchies of arbitrary depth
- Supply-chain and dependency analysis

### When not to use it

**Almost everywhere else.** Having foreign keys is not a reason to use a graph database.
"Users have orders" is a relationship, but you query it one hop deep, and SQL does that
perfectly.

### Why depth is the deciding factor

This is the argument to make in an interview:

```sql
-- SQL, 1 hop: trivial
SELECT * FROM follows WHERE follower_id = 1;

-- SQL, 2 hops: fine
SELECT * FROM follows f1 JOIN follows f2 ON f1.followee_id = f2.follower_id
WHERE f1.follower_id = 1;

-- SQL, 4 hops: four self-joins, and the row count explodes at each level
-- SQL, "any depth until you find a path": recursive CTE, and it gets slow
```

```cypher
// Neo4j, any depth — the query barely changes
MATCH (me:User {id: 1})-[:FOLLOWS*1..4]->(person:User)
RETURN DISTINCT person.name
```

A graph database stores each node's relationships **with the node**, so following one is a
pointer hop rather than an index lookup. That is why depth stays cheap.

### The interview line

> "A graph database only if traversal depth is variable — friend-of-friend-of-friend, or fraud
> ring detection. For one- and two-hop relationships, Postgres joins are faster and simpler."

---

## 9. Columnar / OLAP — ClickHouse, BigQuery, Redshift

### What it is

Stores each **column** together rather than each row. That one change makes analytical queries
10–100× faster.

```
ROW storage (Postgres) — good for "give me order 91"
  [91│1│4200│Dhaka] [92│1│850│Dhaka] [93│2│1600│Sylhet]
   ↑ to sum totals, you must read every field of every row

COLUMN storage (ClickHouse) — good for "sum all totals"
  ids:    [91, 92, 93]
  users:  [1, 1, 2]
  totals: [4200, 850, 1600]   ← read ONLY this, and it compresses beautifully
  cities: [Dhaka, Dhaka, Sylhet]
```

Two effects, both large:
1. **You read only the columns you asked for.** A query touching 3 of 50 columns reads 6% of
   the data.
2. **Compression is dramatic**, because a column holds similar values. Cities repeat; timestamps
   are nearly sequential. 10× is normal.

### When to use it

- Dashboards and reporting over millions to billions of rows
- `GROUP BY`, `SUM`, `COUNT DISTINCT`, funnels, cohorts
- Data written once, read many times, never updated

### When not to use it

- As your application database. Updating a single row is expensive by design
- When you need one full record by id — that is the one thing row storage does better
- Transactions

### Example

```sql
-- On 2 billion rows: Postgres, several minutes. ClickHouse, under a second.
SELECT toStartOfMonth(created_at) AS month,
       country,
       count()          AS orders,
       sum(total)       AS revenue,
       uniq(customer_id) AS customers
FROM orders
WHERE created_at >= '2023-01-01'
GROUP BY month, country
ORDER BY month;
```

### The architecture that follows

Your app database and your analytics database are **different databases, synced one way**:

```
   app writes                     analytics reads
       │                                 ▲
       ▼                                 │
  PostgreSQL  ──── CDC / nightly ETL ───▶ ClickHouse
  (source of truth)                      (derived, rebuildable)
```

**Never run heavy analytics on your production database.** One analyst's unfiltered `GROUP BY`
can take down the database serving your customers. Saying this unprompted is a strong signal.

### The interview line

> "Columnar, because the queries are aggregations over a few columns across a lot of rows. It
> is a derived store fed by CDC — the OLTP database stays clean and analysts cannot take
> production down."

---

## 10. Vector — pgvector, Qdrant, Pinecone

### What it is

Stores **embeddings** — lists of numbers representing meaning — and finds the nearest ones.

```
"how do I reset my password"  →  [0.21, -0.44, 0.87, ... ]   (1536 numbers)
"password reset steps"        →  [0.19, -0.41, 0.88, ... ]   ← very close
"what is your refund policy"  →  [-0.62, 0.11, -0.30, ...]   ← far away
```

Similar *meaning* produces similar numbers, so "find me things like this" becomes a distance
calculation. Keyword search cannot do this: "reset password" and "password reset steps" share
no useful exact match ranking.

### When to use it

- Retrieval-Augmented Generation — finding the right documents to give an LLM
- Semantic search — matching meaning rather than words
- Recommendations by similarity
- Duplicate and near-duplicate detection

### When not to use it

- Exact matching — product codes, error strings, names. Vectors are *bad* at these, which is
  why hybrid search exists
- As a source of truth. Store the text; the vectors are derived

### Example

```sql
-- pgvector: your existing Postgres becomes a vector database
CREATE EXTENSION vector;

CREATE TABLE chunks (
  id        uuid PRIMARY KEY,
  content   text,
  embedding vector(1536)
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);

-- "find the 5 chunks most similar in meaning to this query"
SELECT content, 1 - (embedding <=> $1) AS similarity
FROM chunks
ORDER BY embedding <=> $1
LIMIT 5;
```

### Which product

| Product | When |
|---|---|
| **pgvector** | **Start here.** You already run Postgres, and you get transactional consistency between your rows and their vectors |
| **Qdrant / Weaviate** | Self-hosted, tens of millions of vectors, needs filtering features Postgres lacks |
| **Pinecone** | Managed, no operational work, you pay for that |

The argument for pgvector is the same as everywhere else in this guide: **you already back it
up, you already monitor it, and your team already knows it.**

### The interview line

> "pgvector, because the corpus is small enough that a dedicated vector database would add an
> operational burden for no gain. And I would combine it with keyword search — vectors are weak
> on exact terms like error codes."

Depth: [../phase-2-apis-realtime-systems/06-ai-llm-integrations.md](../phase-2-apis-realtime-systems/06-ai-llm-integrations.md).

---

## 11. Object storage — S3

### What it is

Not a database — but very often the right answer, and candidates forget it exists.

Store a file, get back a URL. Effectively unlimited, extremely cheap, extremely durable.

### When to use it

- **Any file: images, video, PDFs, backups, exports, logs**
- Anything large that you fetch whole and never query inside

### The rule that matters

> **Never store files in your database.** Store the file in S3 and the URL in the database.

A 5 MB image in a Postgres `bytea` column bloats your backups, your replication traffic, and
your memory cache — to store something S3 does better for a fraction of the cost.

```sql
-- ❌ Don't
CREATE TABLE products (id uuid, name text, image bytea);

-- ✅ Do
CREATE TABLE products (id uuid, name text, image_url text);
--                          s3://bucket/products/abc.jpg
```

### The interview line

> "Files go to S3, the URL goes in Postgres, and uploads use a pre-signed URL so the file never
> passes through my API servers at all."

---

## 12. Embedded — SQLite

### What it is

A complete SQL database inside a single file, running inside your process. No server.

### When to use it

- Mobile and desktop applications
- CLI tools, local caches, test suites
- Edge deployments
- **Prototyping** — a real relational database with no setup

### When not to use it

- Multiple servers writing concurrently. One writer at a time is a hard design property

### Why mention it in an interview

Knowing that SQLite is **the most widely deployed database in the world** — in every phone,
every browser, most applications — signals breadth. And "we used SQLite for the local cache
because it gave us real SQL with zero operational cost" is a good, unshowy answer.

---

## 13. Distributed SQL — CockroachDB, Spanner, YugabyteDB

### What it is

The newer category that tries to give you both halves: SQL, joins and ACID transactions, but
horizontally scalable and multi-region like a NoSQL store.

### When to use it

- You genuinely need relational guarantees **and** more than one machine can write
- Multi-region with strong consistency — a global product where a user in Dhaka and one in
  Berlin must see the same balance
- You want to avoid ever writing sharding logic yourself

### When not to use it

- **Almost certainly you do not need it yet.** A single Postgres with replicas handles more
  than most companies ever reach
- Cross-region transactions pay a latency cost that physics will not negotiate on

### The interview line

> "Distributed SQL if we truly need multi-region writes with strong consistency. Below that,
> partitioned Postgres is simpler and I would not pay the coordination latency."

---

## 14. The master comparison table

| Type | Use when | Avoid when | Products | Consistency |
|---|---|---|---|---|
| **Relational** | Relationships, transactions, changing queries | Extreme write volume; billion-row aggregations | PostgreSQL, MySQL | Strong |
| **Key-value** | You always know the key; need speed | You need to query by anything else | Redis, DynamoDB | Varies |
| **Document** | Self-contained records read whole | You will join across them | MongoDB | Tunable |
| **Wide-column** | Huge writes, queries known upfront | Ad-hoc queries; moderate scale | Cassandra, ScyllaDB | Tunable |
| **Search** | Humans typing words; relevance ranking | As source of truth | Elasticsearch, OpenSearch | Eventual |
| **Time-series** | Metrics over time, append-only | General app data | TimescaleDB, InfluxDB | Strong |
| **Graph** | Variable-depth traversal | One or two hops | Neo4j | Strong |
| **Columnar** | Aggregations over billions of rows | Single-record lookups; updates | ClickHouse, BigQuery | Eventual |
| **Vector** | "Similar in meaning to this" | Exact matching | pgvector, Qdrant | Eventual |
| **Object store** | Files of any size | Anything you query inside | S3, R2 | Strong |
| **Embedded** | Single process, local data | Multiple concurrent writers | SQLite | Strong |
| **Distributed SQL** | Multi-region writes + ACID | Single-region; cost-sensitive | CockroachDB, Spanner | Strong |

### The 30-second decision path

```
Is it a file?                              → S3
Do you always know the exact key?          → Key-value (Redis / DynamoDB)
Is a human typing words to find it?        → Search (Elasticsearch)
Is it measurements over time?              → Time-series (TimescaleDB)
Is it "find things similar in meaning"?    → Vector (pgvector)
Is it aggregating billions of rows?        → Columnar (ClickHouse)
Is variable-depth traversal the query?     → Graph (Neo4j)
Are writes > ~100k/sec, queries fixed?     → Wide-column (Cassandra)
                                    else   → PostgreSQL
```

**That last line is the destination most of the time, and saying so confidently is a strength,
not a lack of imagination.**

---

## 15. Polyglot persistence — using several on purpose

### Q: How do you keep several databases consistent?

**Answer:**

You do not, in the strict sense. **You pick one source of truth and derive the rest.**

```
                    ┌─────────────────┐
   writes ─────────▶│   PostgreSQL    │  ← SOURCE OF TRUTH
                    │ (orders, users) │     everything else is rebuildable
                    └────────┬────────┘
                             │ outbox table → CDC → Kafka
              ┌──────────────┼──────────────┬──────────────┐
              ▼              ▼              ▼              ▼
        Elasticsearch     Redis        ClickHouse         S3
        (search index)   (hot cache)   (analytics)      (files)
         eventual         eventual      eventual        strong
```

**Three rules that make this work:**

1. **One source of truth.** If two systems both accept writes for the same data, you have
   created a problem no amount of engineering removes.
2. **Everything else must be rebuildable.** If Elasticsearch is lost, you should be able to
   reindex from Postgres. If you cannot, it was secretly a source of truth.
3. **Use the outbox pattern, not dual writes.** Writing to Postgres and Elasticsearch in the
   same function *will* leave them inconsistent when the second call fails.

```ts
// ❌ Dual write — inconsistent the first time this throws
await db.orders.create(order);
await elastic.index(order);        // fails → Postgres has it, search does not

// ✅ Outbox — one transaction, published separately
await db.$transaction([
  db.orders.create(order),
  db.outbox.create({ topic: 'order.created', payload: order }),
]);
// a separate worker reads the outbox and publishes. At-least-once, so the
// consumer must be idempotent.
```

Depth: [../phase-2-apis-realtime-systems/04-event-driven-architecture.md](../phase-2-apis-realtime-systems/04-event-driven-architecture.md).

---

## 16. Worked examples — five real systems

The most useful practice in this guide. For each, the reasoning matters more than the answer.

### 16a. E-commerce platform

| Data | Choice | Why |
|---|---|---|
| Orders, payments, inventory | **PostgreSQL** | Transactions are non-negotiable. Overselling stock is a real cost |
| Product catalogue | **PostgreSQL** (`JSONB` for varying attributes) | Still relational. `JSONB` handles laptop-vs-T-shirt differences |
| Product search | **Elasticsearch** | Typo tolerance, relevance ranking, faceted filters |
| Sessions, carts | **Redis** | Known key, sub-millisecond, expiry built in |
| Product images | **S3** | Files never belong in a database |
| Sales dashboards | **ClickHouse** | Aggregations over years of orders, off the production database |

**The thing to say:** *"Postgres is the source of truth; search and analytics are derived
indexes fed by CDC. If Elasticsearch is lost I reindex, and nothing is unrecoverable."*

### 16b. Chat application

| Data | Choice | Why |
|---|---|---|
| Users, rooms, membership | **PostgreSQL** | Relational, modest volume |
| Messages | **Cassandra** *if* volume justifies it, else **PostgreSQL partitioned by month** | Access pattern is "last N in this room" — a partition key + clustering key fit exactly |
| Presence (who is online) | **Redis** | Ephemeral, expiring, high churn. Losing it is harmless |
| Message search | **Elasticsearch** | Word search across history |
| Attachments | **S3** | Files |

**The nuance worth voicing:** *"I'd start messages in Postgres partitioned by month. The
Cassandra shape is right, but at 5,000 messages/sec Postgres is fine and one database is worth
a lot."*

### 16c. IoT / metrics platform

| Data | Choice | Why |
|---|---|---|
| Sensor readings | **TimescaleDB** | Append-only, time-range queries, compression, retention |
| Device registry | **PostgreSQL** | Relational, small, needs transactions |
| Latest reading per device | **Redis** | "Current value" is a key lookup hit constantly |
| Long-term analytics | **ClickHouse** | Once history reaches billions of rows |
| Alert rules and history | **PostgreSQL** | Relational |

**The nuance:** downsampling. *"10-second resolution for 7 days, 1-minute for 90 days, hourly
for 2 years. Retention policy is a design decision, not an afterthought — it is the difference
between a $200 and a $20,000 monthly bill."*

### 16d. Social network feed

| Data | Choice | Why |
|---|---|---|
| Users, posts | **PostgreSQL** | Source of truth |
| The social graph | **PostgreSQL** for 1–2 hops; **Neo4j** only if you need "people you may know" at depth | Most feed queries are one hop |
| Precomputed feeds | **Redis** (list per user) | Fan-out on write, read is one key lookup |
| Post search | **Elasticsearch** | Words |
| Media | **S3 + CDN** | Files, served near the user |
| Engagement analytics | **ClickHouse** | Aggregations |

**The nuance interviewers wait for:** the celebrity problem. *"Fan-out on write breaks for an
account with 10 million followers — one post becomes 10 million Redis writes. Hybrid: push for
normal accounts, pull for celebrities at read time."*

### 16e. RAG-backed support assistant

| Data | Choice | Why |
|---|---|---|
| Documents, chunks, vectors | **PostgreSQL + pgvector** | Transactional consistency between a chunk and its embedding, in one system |
| Keyword half of hybrid search | **PostgreSQL** `tsvector` | Same database, so results fuse cheaply |
| Conversation history | **PostgreSQL** | Relational, modest volume |
| Response cache | **Redis** | Exact-match and semantic caching |
| Uploaded files | **S3** | Files |

**The nuance:** *"One database until scale forces otherwise. At 800k vectors this is roughly 5 GB
— comfortably inside Postgres. A dedicated vector database earns its place in the tens of
millions, not here."*

---

## 17. Interview questions

**Q: When would you choose NoSQL over SQL?**

Do not answer with "when you need scale". Answer with an access pattern:

> "When the access pattern is a single known key and the volume exceeds what one relational node
> can serve — sessions, or a very high-write event log. What I give up is joins and ad-hoc
> querying, so I need to be confident the query patterns are stable. If they are still moving, I
> stay relational."

**Q: You have 500 GB of data. Is Postgres enough?**

> "Almost certainly yes. 500 GB is comfortable for a single well-indexed Postgres instance —
> the question is not size but access pattern and write rate. I'd want to know reads/sec,
> writes/sec, and whether queries are point lookups or large aggregations before considering
> anything else."

**Q: Your search feature is slow. What do you do?**

> "First, is it actually search, or a `LIKE '%x%'` query? If it's the latter, Postgres full-text
> with a GIN index likely fixes it. If we need relevance ranking, typo tolerance and facets,
> that's Elasticsearch as a derived index fed by CDC — and I'd note it becomes eventually
> consistent."

**Q: How do you decide between MongoDB and PostgreSQL?**

> "Whether I will query across records. If documents are self-contained and read whole, either
> works — and Postgres `JSONB` gives me documents plus joins plus transactions, so it's usually
> the safer default. I'd pick MongoDB when the schema genuinely varies per record and there's a
> strong operational reason."

**Q: A stakeholder wants real-time dashboards on the production database. What do you say?**

> "No — and here's the alternative. One unfiltered aggregation can take down the database
> serving customers. I'd replicate to a columnar store via CDC. They get faster dashboards, and
> production is protected."

**Q: What happens if your cache and your database disagree?**

> "The database wins — it's the source of truth. The cache should have a TTL so divergence is
> bounded, and I invalidate on write rather than trying to update the cached value, because the
> update path is where subtle bugs live."

---

## 18. The mistakes that get noticed

| Mistake | Why it costs you |
|---|---|
| **Naming a product before stating the access pattern** | The clearest junior tell in this whole topic |
| **"MongoDB because it scales"** | Postgres scales further than most people ever need, *and* keeps joins |
| **Choosing Cassandra at 5,000 writes/sec** | Enormous complexity for a load Postgres handles casually |
| **A graph database for one-hop relationships** | Foreign keys are not a reason. Depth is |
| **Making a search index the source of truth** | It will be lost or rebuilt one day, and then so is your data |
| **Storing files in the database** | Bloats backups, replication and memory, for worse results than S3 |
| **Analytics on the production database** | One bad query takes down your customers |
| **Adding a database without naming its operational cost** | Suggests you have built systems but not run them |
| **Saying "it depends" and stopping** | Correct, but you must then say *what* it depends on |

### The single sentence to take away

> **Start with PostgreSQL. Add a second database only when you can name the specific access
> pattern it cannot serve, and the operational cost you are accepting in exchange.**

---

## Related

- [01-postgresql-deep-dive.md](01-postgresql-deep-dive.md) — the default, in depth
- [02-redis-deep-dive.md](02-redis-deep-dive.md) — key-value and caching
- [05-nosql-mongodb-dynamodb.md](05-nosql-mongodb-dynamodb.md) — document and key-value at depth
- [08-database-architecture-fundamentals.md](08-database-architecture-fundamentals.md) — CAP, sharding, replication
- [../phase-2-apis-realtime-systems/04-event-driven-architecture.md](../phase-2-apis-realtime-systems/04-event-driven-architecture.md) — outbox and CDC, for keeping derived stores in sync
- [../phase-2-apis-realtime-systems/06-ai-llm-integrations.md](../phase-2-apis-realtime-systems/06-ai-llm-integrations.md) — vector search and RAG
- [../phase-5-system-design/06-hld-practice-problems.md](../phase-5-system-design/06-hld-practice-problems.md) — where these choices get tested
