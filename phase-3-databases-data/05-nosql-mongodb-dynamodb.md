# NoSQL -- MongoDB & DynamoDB -- Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical TypeScript, Node.js, and NestJS code examples
> **Goal:** Confidently answer any NoSQL, MongoDB, or DynamoDB question in a senior backend interview

## Table of Contents
1. [NoSQL Fundamentals & When to Use](#q1-nosql-fundamentals--when-to-use)
2. [MongoDB Architecture & Internals](#q2-mongodb-architecture--internals)
3. [MongoDB Schema Design Patterns](#q3-mongodb-schema-design-patterns)
4. [MongoDB Indexing](#q4-mongodb-indexing)
5. [MongoDB Aggregation Pipeline](#q5-mongodb-aggregation-pipeline)
6. [MongoDB with Node.js & NestJS](#q6-mongodb-with-nodejs--nestjs)
7. [MongoDB Sharding & Scaling](#q7-mongodb-sharding--scaling)
8. [DynamoDB Fundamentals](#q8-dynamodb-fundamentals)
9. [DynamoDB Single-Table Design](#q9-dynamodb-single-table-design)
10. [DynamoDB Indexes & Query Patterns](#q10-dynamodb-indexes--query-patterns)
11. [DynamoDB Advanced Features](#q11-dynamodb-advanced-features)
12. [DynamoDB with Node.js & NestJS](#q12-dynamodb-with-nodejs--nestjs)
13. [MongoDB vs DynamoDB -- When to Use Which](#q13-mongodb-vs-dynamodb--when-to-use-which)
14. [NoSQL Data Modeling Best Practices](#q14-nosql-data-modeling-best-practices)
15. [Quick Reference](#quick-reference)

---

## Q1: NoSQL Fundamentals & When to Use

### Q: What is NoSQL and how does it differ from relational databases?

**Answer:**

NoSQL ("Not Only SQL") is a category of databases that store data in formats other than traditional relational tables. Unlike RDBMS which enforce a fixed schema, normalize data, and use SQL for queries, NoSQL databases trade some of those guarantees for flexibility, horizontal scalability, and performance at scale.

**Key differences:**

| Aspect | Relational (SQL) | NoSQL |
|--------|-------------------|-------|
| Schema | Fixed (schema-on-write) | Flexible (schema-on-read) |
| Scaling | Vertical (bigger server) | Horizontal (add more servers) |
| Relationships | Joins are first-class | Denormalization / embedding preferred |
| ACID | Full transactions | Varies (eventual consistency common) |
| Query language | SQL (standardized) | Database-specific APIs |
| Data model | Tables, rows, columns | Documents, key-value, wide-column, graph |
| Best for | Complex queries, strong consistency | High throughput, flexible schema, massive scale |

**Important clarification:** NoSQL does NOT mean "no schema." It means the schema is enforced at the application layer (schema-on-read) rather than the database layer (schema-on-write). You still need to think carefully about your data model.

---

### Q: Explain the CAP theorem. Why is it important for NoSQL databases?

**Answer:**

The CAP theorem states that a distributed system can provide at most **two** of these three guarantees simultaneously:

- **Consistency (C):** Every read receives the most recent write or an error. All nodes see the same data at the same time.
- **Availability (A):** Every request receives a non-error response, though it may not contain the most recent write.
- **Partition Tolerance (P):** The system continues to operate despite network partitions between nodes.

```
         C (Consistency)
        / \
       /   \
      /     \
     /  CA   \
    /  (Not   \
   / possible  \
  /  in dist.) \
 CP ─────────── AP
MongoDB       DynamoDB
(default)    Cassandra
PostgreSQL    CouchDB
```

**In practice, P is non-negotiable** in distributed systems (networks always can partition), so the real choice is between **CP** and **AP**:

| Type | Example | Behavior During Partition |
|------|---------|--------------------------|
| **CP** | MongoDB (default), Redis Cluster, HBase | Sacrifices availability -- rejects writes until partition heals |
| **AP** | DynamoDB, Cassandra, CouchDB | Sacrifices consistency -- serves stale data, resolves conflicts later |

**MongoDB:** CP by default (writes go to primary; if primary is unreachable, writes fail until election completes). Can be configured toward AP by using `readPreference: secondary` and `writeConcern: { w: 0 }`.

**DynamoDB:** AP by default (eventually consistent reads). Can be made more consistent with `ConsistentRead: true` (strongly consistent reads from the leader).

**Interview tip:** "The CAP theorem is a simplification. In reality, you tune consistency on a per-operation basis. MongoDB lets me choose write concern and read concern per query. DynamoDB lets me choose between eventual and strong consistency per read."

---

### Q: What are the types of NoSQL databases? When would you use each?

**Answer:**

| Type | How Data is Stored | Examples | Best For |
|------|--------------------|----------|----------|
| **Document** | JSON/BSON documents in collections | MongoDB, CouchDB, Firestore | Content management, e-commerce catalogs, user profiles -- flexible, nested data |
| **Key-Value** | Simple key-value pairs | Redis, DynamoDB*, Memcached | Caching, session stores, shopping carts -- fast lookups by key |
| **Wide-Column** | Rows with dynamic columns, grouped by column families | Cassandra, HBase, ScyllaDB | Time-series, IoT, write-heavy workloads at massive scale |
| **Graph** | Nodes and edges (vertices and relationships) | Neo4j, Amazon Neptune, ArangoDB | Social networks, recommendation engines, fraud detection -- relationship-heavy data |

*DynamoDB is technically a key-value + document hybrid.

**Decision flow:**

```
Do you need to traverse relationships?
  YES → Graph DB (Neo4j, Neptune)
  NO  → Is your access pattern simple key-based lookups?
          YES → Key-Value (Redis, DynamoDB)
          NO  → Do you have wide, sparse, time-series data?
                  YES → Wide-Column (Cassandra)
                  NO  → Document DB (MongoDB)
```

---

### Q: When should you use NoSQL vs SQL? Give a decision framework.

**Answer:**

| Factor | Choose SQL | Choose NoSQL |
|--------|-----------|--------------|
| Schema stability | Schema is well-defined, rarely changes | Schema evolves frequently |
| Query patterns | Ad-hoc queries, complex joins, aggregations | Known access patterns, simple lookups |
| Consistency | Need strict ACID transactions | Eventual consistency is acceptable |
| Scale | Vertical scaling is sufficient (<1TB) | Need horizontal scaling (TB+) |
| Relationships | Heavily relational data | Self-contained documents |
| Development speed | Well-understood domain model | Rapid prototyping, MVP |
| Team expertise | Strong SQL background | JavaScript/JSON-native team |

**Real-world example:**

- **E-commerce order management** (Daraz-like): Use PostgreSQL for orders, payments, inventory (ACID is critical for money and stock counts). Use MongoDB for product catalog (flexible attributes per category). Use Redis for caching and sessions. Use DynamoDB for activity logs and event streams.

**Interview tip:** "I never say 'NoSQL is better' or 'SQL is better.' I discuss the specific requirements -- access patterns, consistency needs, scale expectations, and team expertise -- then pick the right tool. In most real systems, I use a polyglot persistence approach with different databases for different concerns."

---

## Q2: MongoDB Architecture & Internals

### Q: Explain the MongoDB document model. What is BSON?

**Answer:**

MongoDB stores data as **documents** -- JSON-like structures grouped into **collections** (analogous to tables in SQL). Unlike rows in an RDBMS, documents in the same collection can have different fields.

**BSON (Binary JSON):**

MongoDB uses BSON internally, not plain JSON:

| Feature | JSON | BSON |
|---------|------|------|
| Format | Text | Binary |
| Types | 6 types (string, number, object, array, boolean, null) | 18+ types (adds Date, ObjectId, Int32, Int64, Decimal128, Binary, etc.) |
| Traversal | Must parse from start | Supports direct field access via length prefixes |
| Size | Compact for small docs | Slightly larger (stores field lengths) but faster to parse |

```javascript
// This JSON document:
{
  "_id": ObjectId("64a1b2c3d4e5f6a7b8c9d0e1"),
  "name": "Fazle Rabbi",
  "email": "fazle@example.com",
  "orders": [
    { "orderId": "ORD001", "total": 2500, "date": ISODate("2025-01-15") }
  ],
  "address": {
    "city": "Dhaka",
    "area": "Gulshan"
  }
}
// Is stored as BSON with typed fields, length prefixes, and binary encoding
```

**Key limits:**
- Max document size: **16MB**
- Max nesting depth: **100 levels**
- Namespace (db.collection) max: **120 bytes**

---

### Q: Describe MongoDB's storage engine and how it manages data on disk.

**Answer:**

MongoDB uses **WiredTiger** as its default storage engine (since MongoDB 3.2).

**WiredTiger internals:**

| Component | Details |
|-----------|---------|
| **Data format** | B-tree for indexes, row-store for documents |
| **Compression** | Snappy (default for data), zlib, zstd (best compression ratio for production) |
| **Caching** | Internal cache uses ~50% of (RAM - 1GB) by default |
| **Concurrency** | Document-level locking (much better than old MMAPv1 collection-level) |
| **Checkpointing** | Writes snapshot to disk every 60 seconds |
| **Journaling** | WAL (Write-Ahead Log) for crash recovery, journal synced every 50ms |

**Write path:**

```
Client Write
    │
    ▼
WiredTiger Cache (in-memory)
    │
    ├──► Journal (WAL) ──► Disk (every 50ms or on commit with j:true)
    │
    └──► Checkpoint ──► Data Files on Disk (every 60 seconds)
```

**Crash recovery:** If MongoDB crashes between checkpoints, it replays the journal (WAL) from the last checkpoint to recover uncommitted writes. This is identical in concept to PostgreSQL's WAL.

---

### Q: Explain MongoDB Replica Sets. How does failover work?

**Answer:**

A **replica set** is a group of MongoDB instances that maintain the same data, providing **high availability** and **data redundancy**.

```
                    ┌──────────────┐
         Writes ──► │   PRIMARY    │
                    │  (read/write)│
                    └──────┬───────┘
                           │ Oplog replication
                    ┌──────┴───────┐
              ┌─────┤              ├─────┐
              ▼     ▼              ▼     ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │SECONDARY │  │SECONDARY │  │ ARBITER  │
     │ (read)   │  │ (read)   │  │(vote only)│
     └──────────┘  └──────────┘  └──────────┘
```

**Components:**

| Member | Role |
|--------|------|
| **Primary** | Receives all writes. Only one primary at a time. |
| **Secondary** | Replicates from primary's oplog (operations log). Can serve reads. |
| **Arbiter** | Participates in elections but holds no data. Used to break ties in voting. |

**Automatic failover process:**

1. Secondaries send heartbeats to the primary every 2 seconds
2. If no heartbeat response for 10 seconds (electionTimeoutMillis), the primary is considered down
3. Eligible secondaries call an **election** (Raft-based consensus)
4. The secondary with the most recent oplog entry and highest priority wins
5. New primary is elected in ~12 seconds (typical)
6. MongoDB drivers automatically discover the new primary

**Read Preferences:**

| Preference | Behavior | Use Case |
|------------|----------|----------|
| `primary` | All reads from primary (default) | Strong consistency |
| `primaryPreferred` | Primary, fallback to secondary | Consistency with HA |
| `secondary` | All reads from secondaries | Offload read traffic |
| `secondaryPreferred` | Secondary, fallback to primary | Read scaling |
| `nearest` | Lowest network latency member | Geo-distributed reads |

---

### Q: Explain Write Concern and Read Concern in MongoDB.

**Answer:**

**Write Concern** controls how many replica members must acknowledge a write before the driver considers it successful:

| Write Concern | Behavior | Durability | Latency |
|---------------|----------|------------|---------|
| `w: 0` | Fire-and-forget, no acknowledgment | Lowest (data may be lost) | Fastest |
| `w: 1` | Primary acknowledges (default) | Medium (lost if primary crashes before replication) | Fast |
| `w: "majority"` | Majority of replicas acknowledge | High (survives primary failure) | Slower |
| `w: 1, j: true` | Primary acknowledges after journal write | High (survives primary crash) | Slower |

**Read Concern** controls the consistency and isolation of data returned by read operations:

| Read Concern | Behavior | Use Case |
|--------------|----------|----------|
| `local` | Returns the most recent data on this node (default) | General reads |
| `majority` | Returns data that has been acknowledged by majority | Avoid reading data that may be rolled back |
| `linearizable` | Reflects all writes that completed before the read began | Strongest consistency (single-document reads only) |
| `snapshot` | Used in multi-document transactions | Transaction isolation |

**Production recommendation:** Use `w: "majority"` with `readConcern: "majority"` for critical data. This ensures you never write data that gets rolled back, and you never read data that might be rolled back.

```typescript
// NestJS MongoDB connection with write/read concern
MongooseModule.forRoot('mongodb://rs1:27017,rs2:27017,rs3:27017/mydb', {
  replicaSet: 'rs0',
  writeConcern: { w: 'majority', j: true, wtimeout: 5000 },
  readConcern: { level: 'majority' },
  readPreference: 'secondaryPreferred',
});
```

---

## Q3: MongoDB Schema Design Patterns

### Q: Embedding vs Referencing -- how do you decide?

**Answer:**

This is the **most fundamental** decision in MongoDB schema design. There is no universal answer -- it depends on your access patterns.

**Embed when:**
- One-to-one or one-to-few relationship
- Data is always accessed together
- Child data does not grow unbounded
- Atomicity is needed (single document writes are atomic)
- Data is "owned" by the parent

**Reference when:**
- One-to-many or many-to-many relationship
- Data is accessed independently
- Child data grows unbounded (e.g., comments on a viral post)
- Documents would exceed 16MB limit
- Data is shared across multiple parents

```typescript
// EMBEDDED: Order with items (1:few, always accessed together, items don't grow)
{
  _id: ObjectId("..."),
  userId: "user123",
  status: "shipped",
  items: [
    { productId: "prod1", name: "Keyboard", qty: 1, price: 2500 },
    { productId: "prod2", name: "Mouse", qty: 2, price: 800 }
  ],
  total: 4100,
  shippingAddress: { city: "Dhaka", area: "Banani", street: "Road 11" }
}

// REFERENCED: User with orders (1:many, orders grow over time)
// users collection
{
  _id: ObjectId("user123"),
  name: "Fazle Rabbi",
  email: "fazle@example.com"
}
// orders collection
{
  _id: ObjectId("order456"),
  userId: ObjectId("user123"),  // reference
  status: "shipped",
  total: 4100
}
```

**Decision matrix:**

| Factor | Embed | Reference |
|--------|-------|-----------|
| Read together? | Yes | No |
| Cardinality | 1:1, 1:few | 1:many, many:many |
| Update frequency | Rarely | Frequently |
| Data size growth | Bounded | Unbounded |
| Atomicity needed? | Yes (free with embed) | Use transactions |

---

### Q: Explain common MongoDB schema design patterns with examples.

**Answer:**

#### 1. Attribute Pattern

**Problem:** Documents have varying attributes that you want to index (e.g., products with different specs per category).

```typescript
// WITHOUT pattern: hard to index all possible spec fields
{
  name: "MacBook Pro",
  screenSize: "16 inch",
  cpu: "M3 Pro",
  ram: "36GB"
}
{
  name: "Nike Air Max",
  size: "42",
  color: "Black",
  material: "Mesh"
}

// WITH Attribute Pattern: uniform structure, single index covers all
{
  name: "MacBook Pro",
  attributes: [
    { key: "screenSize", value: "16 inch" },
    { key: "cpu", value: "M3 Pro" },
    { key: "ram", value: "36GB" }
  ]
}
// One multikey index: db.products.createIndex({ "attributes.key": 1, "attributes.value": 1 })
```

#### 2. Bucket Pattern

**Problem:** High-volume time-series data creates too many documents.

```typescript
// WITHOUT pattern: one document per reading (millions of docs)
{ sensorId: "s1", temp: 22.5, timestamp: ISODate("2025-01-15T10:00:00Z") }
{ sensorId: "s1", temp: 22.7, timestamp: ISODate("2025-01-15T10:01:00Z") }

// WITH Bucket Pattern: group readings into hourly buckets
{
  sensorId: "s1",
  bucket: ISODate("2025-01-15T10:00:00Z"), // hour boundary
  count: 60,
  measurements: [
    { temp: 22.5, timestamp: ISODate("2025-01-15T10:00:00Z") },
    { temp: 22.7, timestamp: ISODate("2025-01-15T10:01:00Z") },
    // ... up to 60 entries per hour
  ],
  summary: { min: 22.1, max: 23.4, avg: 22.6 } // pre-computed
}
```

**Benefits:** 60x fewer documents, pre-computed summaries avoid aggregation, bounded array size.

#### 3. Computed Pattern

**Problem:** Expensive aggregations computed repeatedly.

```typescript
// Store pre-computed values alongside the data
{
  _id: "product123",
  name: "Wireless Keyboard",
  reviews: [
    { userId: "u1", rating: 5, text: "Great!" },
    { userId: "u2", rating: 4, text: "Good" }
  ],
  // Pre-computed (updated on each review insert/update)
  reviewCount: 2,
  averageRating: 4.5,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 }
}
```

Update atomically when a new review is added:

```typescript
await db.collection('products').updateOne(
  { _id: 'product123' },
  {
    $push: { reviews: newReview },
    $inc: {
      reviewCount: 1,
      [`ratingDistribution.${newReview.rating}`]: 1,
    },
    $set: {
      averageRating: newAvg, // calculated in application
    },
  },
);
```

#### 4. Extended Reference Pattern

**Problem:** Need to display data from a referenced document without a join.

```typescript
// Order stores a partial copy of user data (denormalization)
{
  _id: "order456",
  // Extended reference: copy frequently-read fields
  customer: {
    _id: "user123",
    name: "Fazle Rabbi",
    phone: "+880171XXXXXXX"
  },
  items: [...],
  total: 4100
}
// Full user document still in users collection
// Trade-off: stale data if user updates name, but orders rarely need latest name
```

#### 5. Outlier Pattern

**Problem:** Some documents have disproportionately large arrays (e.g., a viral post with millions of likes).

```typescript
// Normal post: likes embedded
{
  _id: "post123",
  text: "Hello world",
  likes: ["user1", "user2", "user3"],
  likeCount: 3,
  hasOverflow: false
}

// Viral post: overflow to separate collection
{
  _id: "post456",
  text: "Viral content",
  likes: ["user1", "user2", ... ], // first 1000
  likeCount: 1500000,
  hasOverflow: true
}
// Overflow collection:
{ postId: "post456", likes: ["user1001", "user1002", ...] }
```

#### 6. Polymorphic Pattern

**Problem:** Different entity types in the same collection.

```typescript
// Notifications collection: different types, same collection
{ type: "order_update", userId: "u1", orderId: "o1", status: "shipped", createdAt: ... }
{ type: "promotion", userId: "u1", title: "50% off!", imageUrl: "...", createdAt: ... }
{ type: "friend_request", userId: "u1", fromUserId: "u2", fromName: "Ali", createdAt: ... }

// Single index on userId + createdAt serves all types
// Application code handles rendering based on 'type' field
```

#### 7. Subset Pattern

**Problem:** Documents are large, but most reads only need a portion.

```typescript
// Product collection (frequently accessed, kept small)
{
  _id: "prod1",
  name: "Wireless Mouse",
  price: 800,
  thumbnail: "thumb.jpg",
  averageRating: 4.5,
  inStock: true
}

// Product details collection (rarely accessed, full data)
{
  productId: "prod1",
  description: "Full description...",
  specifications: { ... },
  images: ["img1.jpg", "img2.jpg", ...],
  allReviews: [...]
}
```

---

### Q: What are the anti-patterns to avoid in MongoDB schema design?

**Answer:**

1. **Unbounded arrays** -- arrays that grow without limit (e.g., all comments on a post embedded forever). Eventually hits 16MB doc limit or degrades performance.
2. **Massive documents** -- storing everything in one document. Every update rewrites the entire document.
3. **Over-normalization** -- treating MongoDB like SQL with lots of references and `$lookup` joins. MongoDB is not optimized for this.
4. **Using ObjectId as a meaningful key** -- when you need a natural key for queries, don't force everything through ObjectId.
5. **No schema validation** -- just because MongoDB allows any shape doesn't mean you should skip validation. Use Mongoose schemas or MongoDB JSON Schema validation.
6. **Indexing everything** -- each index costs write performance and RAM. Only index fields you query by.

---

### Q: Design an e-commerce order schema (Daraz/Shopify-like) in MongoDB.

**Answer:**

```typescript
// ---- products collection ----
{
  _id: ObjectId("..."),
  sku: "KB-MECH-001",
  name: "Mechanical Keyboard",
  slug: "mechanical-keyboard",
  category: { _id: ObjectId("..."), name: "Electronics", path: "Electronics/Peripherals/Keyboards" },
  brand: "Keychron",
  price: { amount: 8500, currency: "BDT", discount: 10 },
  attributes: [
    { key: "switch_type", value: "Brown" },
    { key: "connectivity", value: "Bluetooth + USB-C" }
  ],
  inventory: { available: 150, reserved: 12, warehouse: "DHK-01" },
  images: [{ url: "...", isPrimary: true }],
  averageRating: 4.6,
  reviewCount: 234,
  status: "active",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// ---- orders collection ----
{
  _id: ObjectId("..."),
  orderNumber: "ORD-2025-001234",
  customer: {                           // Extended Reference Pattern
    _id: ObjectId("..."),
    name: "Fazle Rabbi",
    phone: "+880171XXXXXXX",
    email: "fazle@example.com"
  },
  items: [                              // Embedded (bounded, immutable once placed)
    {
      productId: ObjectId("..."),
      sku: "KB-MECH-001",
      name: "Mechanical Keyboard",      // Snapshot at order time
      price: 8500,
      discount: 10,
      qty: 1,
      subtotal: 7650
    }
  ],
  shippingAddress: {
    city: "Dhaka",
    area: "Gulshan-2",
    street: "Road 45, House 12",
    postalCode: "1212"
  },
  payment: {
    method: "bKash",
    transactionId: "TXN123456",
    status: "completed",
    paidAt: ISODate("...")
  },
  timeline: [                           // Bucket-like status history
    { status: "placed", timestamp: ISODate("...") },
    { status: "confirmed", timestamp: ISODate("...") },
    { status: "shipped", timestamp: ISODate("..."), trackingId: "TRACK001" }
  ],
  status: "shipped",
  total: 7650,
  schemaVersion: 2,                     // Version your schema
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// Indexes for orders:
// db.orders.createIndex({ "customer._id": 1, createdAt: -1 })
// db.orders.createIndex({ orderNumber: 1 }, { unique: true })
// db.orders.createIndex({ status: 1, createdAt: -1 })
// db.orders.createIndex({ createdAt: 1 }, { expireAfterSeconds: 94608000 }) // TTL: 3 years
```

---

## Q4: MongoDB Indexing

### Q: How do indexes work in MongoDB? Explain the types.

**Answer:**

MongoDB indexes use **B-tree** data structures (WiredTiger uses B+ trees internally). Without indexes, MongoDB performs a **collection scan** -- reading every document. With an index, MongoDB can locate documents in O(log n) time.

**Index types:**

| Index Type | Syntax | Use Case |
|------------|--------|----------|
| **Single Field** | `{ field: 1 }` | Query/sort on one field |
| **Compound** | `{ field1: 1, field2: -1 }` | Queries on multiple fields (order matters!) |
| **Multikey** | `{ arrayField: 1 }` | Indexing array elements (auto-detected) |
| **Text** | `{ field: "text" }` | Full-text search |
| **Geospatial** | `{ location: "2dsphere" }` | Location-based queries |
| **Hashed** | `{ field: "hashed" }` | Hash-based sharding |
| **TTL** | `{ createdAt: 1 }, { expireAfterSeconds: 3600 }` | Auto-expire documents |
| **Partial** | `{ field: 1 }, { partialFilterExpression: { status: "active" } }` | Index only matching documents (smaller index) |
| **Wildcard** | `{ "$**": 1 }` or `{ "attributes.$**": 1 }` | Dynamic/unknown field paths |

**Code examples:**

```typescript
// Single field index
await db.collection('users').createIndex({ email: 1 }, { unique: true });

// Compound index (ESR rule: Equality, Sort, Range)
await db.collection('orders').createIndex({ status: 1, createdAt: -1, total: 1 });

// Multikey index (automatically created on array fields)
await db.collection('products').createIndex({ tags: 1 });
// Matches: db.products.find({ tags: "electronics" })

// Text index for search
await db.collection('products').createIndex(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 5 } }
);
// Usage: db.products.find({ $text: { $search: "wireless keyboard" } })

// Partial index (only index active products -- saves space)
await db.collection('products').createIndex(
  { category: 1, price: 1 },
  { partialFilterExpression: { status: 'active' } }
);

// TTL index (auto-delete sessions after 24 hours)
await db.collection('sessions').createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
);

// Wildcard index (for dynamic attributes)
await db.collection('products').createIndex({ 'attributes.$**': 1 });
```

---

### Q: Explain the ESR rule for compound indexes.

**Answer:**

The **ESR rule** (Equality, Sort, Range) defines the optimal field order in compound indexes:

1. **Equality** fields first -- fields tested with `=` or `$eq`
2. **Sort** fields next -- fields used in `.sort()`
3. **Range** fields last -- fields tested with `$gt`, `$lt`, `$gte`, `$lte`, `$in`

```typescript
// Query: Find active orders for a user, sorted by date, with total > 1000
db.orders.find({
  userId: "user123",     // Equality
  status: "active",      // Equality
  total: { $gt: 1000 }   // Range
}).sort({ createdAt: -1 }) // Sort

// OPTIMAL compound index (following ESR):
db.orders.createIndex({
  userId: 1,       // E: Equality
  status: 1,       // E: Equality
  createdAt: -1,   // S: Sort
  total: 1         // R: Range
});

// WHY this order matters:
// - Equality fields narrow down to a small set of documents in the B-tree
// - Sort field allows MongoDB to return results in order WITHOUT an in-memory sort
// - Range field is last because it creates a "spread" in the index -- anything after
//   a range field cannot be used efficiently
```

**Common mistake:** Putting range fields before sort fields forces MongoDB to do an in-memory sort (SORT stage in explain), which is slow and limited to 100MB of memory.

---

### Q: How do you analyze query performance with explain()?

**Answer:**

```typescript
// Run explain on a query
const explanation = await db.collection('orders')
  .find({ userId: 'user123', status: 'active' })
  .sort({ createdAt: -1 })
  .explain('executionStats');
```

**Key fields to examine:**

| Field | What to Look For |
|-------|-----------------|
| `winningPlan.stage` | `IXSCAN` (good), `COLLSCAN` (bad -- no index used) |
| `executionStats.totalDocsExamined` | Should be close to `nReturned` |
| `executionStats.totalKeysExamined` | Should be close to `nReturned` |
| `executionStats.executionTimeMillis` | Lower is better |
| `winningPlan.inputStage` | `SORT` stage means in-memory sort (consider index for sort) |

**Good vs bad explain output:**

```
GOOD: { nReturned: 20, totalDocsExamined: 20, totalKeysExamined: 20 }
 → Ratio ~1:1 -- index is efficient

BAD:  { nReturned: 20, totalDocsExamined: 100000, totalKeysExamined: 100000 }
 → Scanning 100K docs to return 20 -- wrong or missing index
```

**Covered query** -- the best-case scenario where MongoDB answers the query entirely from the index without reading any documents:

```typescript
// Create an index that covers all needed fields
db.orders.createIndex({ userId: 1, status: 1, total: 1 });

// This query is "covered" -- only needs the index
db.orders.find(
  { userId: 'user123', status: 'active' },
  { _id: 0, userId: 1, status: 1, total: 1 } // Project only indexed fields
);
// explain will show: totalDocsExamined: 0 (no documents read!)
```

---

## Q5: MongoDB Aggregation Pipeline

### Q: Explain the MongoDB aggregation pipeline. What are the key stages?

**Answer:**

The aggregation pipeline processes documents through a sequence of stages, where each stage transforms the data flowing through it. Think of it as Unix pipes for MongoDB.

```
documents → $match → $group → $sort → $project → results
```

**Key stages:**

| Stage | Purpose | SQL Equivalent |
|-------|---------|----------------|
| `$match` | Filter documents | `WHERE` |
| `$group` | Group and aggregate | `GROUP BY` |
| `$project` | Reshape documents (include/exclude/compute fields) | `SELECT` |
| `$sort` | Sort results | `ORDER BY` |
| `$limit` / `$skip` | Pagination | `LIMIT` / `OFFSET` |
| `$unwind` | Deconstruct array into separate documents | `LATERAL JOIN UNNEST` |
| `$lookup` | Join with another collection | `LEFT OUTER JOIN` |
| `$addFields` | Add computed fields without removing existing ones | `SELECT *, computed_col` |
| `$facet` | Run multiple pipelines in parallel | Multiple queries in one |
| `$graphLookup` | Recursive/hierarchical lookup | Recursive CTE |
| `$merge` / `$out` | Write results to a collection | `INSERT INTO ... SELECT` |
| `$bucket` | Group into ranges | `CASE WHEN` + `GROUP BY` |
| `$replaceRoot` | Replace document with a sub-document | -- |

---

### Q: Show practical aggregation examples with code.

**Answer:**

#### Example 1: Sales report by category with totals

```typescript
async getSalesReport(startDate: Date, endDate: Date) {
  return this.orderModel.aggregate([
    // 1. Filter by date range and completed orders (uses index!)
    {
      $match: {
        status: 'delivered',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },

    // 2. Unwind items array (each item becomes its own document)
    { $unwind: '$items' },

    // 3. Group by category, calculate totals
    {
      $group: {
        _id: '$items.category',
        totalRevenue: { $sum: '$items.subtotal' },
        totalQuantity: { $sum: '$items.qty' },
        orderCount: { $sum: 1 },
        avgOrderValue: { $avg: '$items.subtotal' },
      },
    },

    // 4. Sort by revenue descending
    { $sort: { totalRevenue: -1 } },

    // 5. Reshape the output
    {
      $project: {
        category: '$_id',
        totalRevenue: 1,
        totalQuantity: 1,
        orderCount: 1,
        avgOrderValue: { $round: ['$avgOrderValue', 2] },
        _id: 0,
      },
    },
  ]);
}
// Output:
// [
//   { category: "Electronics", totalRevenue: 2500000, totalQuantity: 340, orderCount: 280, avgOrderValue: 8928.57 },
//   { category: "Clothing", totalRevenue: 1800000, totalQuantity: 1200, orderCount: 950, avgOrderValue: 1894.74 },
// ]
```

#### Example 2: $lookup for joining orders with user data

```typescript
async getOrdersWithUserDetails(status: string) {
  return this.orderModel.aggregate([
    { $match: { status } },

    // LEFT OUTER JOIN with users collection
    {
      $lookup: {
        from: 'users',           // Collection to join
        localField: 'userId',    // Field in orders
        foreignField: '_id',     // Field in users
        as: 'user',             // Output array field
        pipeline: [              // Sub-pipeline (filter/project joined docs)
          { $project: { name: 1, email: 1, phone: 1 } },
        ],
      },
    },

    // $lookup returns an array; $unwind to get single object
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

    { $project: { orderNumber: 1, total: 1, status: 1, user: 1, createdAt: 1 } },
    { $sort: { createdAt: -1 } },
    { $limit: 50 },
  ]);
}
```

#### Example 3: $facet for multiple aggregations in one query

```typescript
async getDashboardStats(userId: string) {
  return this.orderModel.aggregate([
    { $match: { 'customer._id': new Types.ObjectId(userId) } },
    {
      $facet: {
        // Pipeline 1: Order count by status
        statusBreakdown: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],

        // Pipeline 2: Monthly spending trend
        monthlySpending: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              totalSpent: { $sum: '$total' },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 12 },
        ],

        // Pipeline 3: Top categories
        topCategories: [
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.category',
              totalSpent: { $sum: '$items.subtotal' },
            },
          },
          { $sort: { totalSpent: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ]);
}
```

#### Example 4: $graphLookup for hierarchical data (category tree)

```typescript
// Categories collection:
// { _id: "Electronics", parent: null }
// { _id: "Computers", parent: "Electronics" }
// { _id: "Laptops", parent: "Computers" }
// { _id: "Gaming Laptops", parent: "Laptops" }

async getCategoryTree(startCategory: string) {
  return this.categoryModel.aggregate([
    { $match: { _id: startCategory } },
    {
      $graphLookup: {
        from: 'categories',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parent',
        as: 'descendants',
        maxDepth: 10,
        depthField: 'level',
      },
    },
  ]);
}
```

**Performance tips:**

1. **Put `$match` as early as possible** -- it can use indexes and reduces documents for subsequent stages
2. **Use `$project` early** to reduce document size flowing through the pipeline
3. **Memory limit:** Each pipeline stage is limited to 100MB of RAM. Use `{ allowDiskUse: true }` for large datasets
4. `$lookup` with a sub-pipeline is more efficient than `$lookup` + `$unwind` + `$match` because it filters during the join
5. **Aggregation is preferred over MapReduce** (MapReduce is deprecated since MongoDB 5.0)

---

## Q6: MongoDB with Node.js & NestJS

### Q: How do you integrate MongoDB with NestJS using Mongoose?

**Answer:**

#### Schema definition with decorators

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Sub-document schema
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 1 })
  qty: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;
}
const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Main document schema
@Schema({
  timestamps: true,
  collection: 'orders',
  toJSON: { virtuals: true },
})
export class Order extends Document {
  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true, validate: [(v: any[]) => v.length > 0, 'Order must have at least one item'] })
  items: OrderItem[];

  @Prop({ required: true, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] })
  status: string;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ default: 1 })
  schemaVersion: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Add indexes after schema creation
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });

// Virtual field (not stored in DB, computed on read)
OrderSchema.virtual('itemCount').get(function () {
  return this.items.length;
});

// Pre-save middleware (hook)
OrderSchema.pre('save', function (next) {
  this.total = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  next();
});

// Static method (called on Model)
OrderSchema.statics.findByStatus = function (status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Instance method (called on Document)
OrderSchema.methods.cancel = function () {
  if (['shipped', 'delivered'].includes(this.status)) {
    throw new Error('Cannot cancel shipped/delivered order');
  }
  this.status = 'cancelled';
  return this.save();
};
```

#### Module registration

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    // Root connection
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI'),
        retryWrites: true,
        w: 'majority',
        maxPoolSize: 50,         // Connection pool size
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        readPreference: 'secondaryPreferred',
      }),
      inject: [ConfigService],
    }),

    // Register schemas for this module
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
```

#### Service with common operations

```typescript
@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectConnection() private connection: Connection,
  ) {}

  // CREATE
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = new this.orderModel({
      ...dto,
      orderNumber: `ORD-${Date.now()}`,
      status: 'pending',
    });
    return order.save();
  }

  // READ with pagination (cursor-based for performance)
  async findByUser(
    userId: string,
    lastId?: string,
    limit = 20,
  ): Promise<Order[]> {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (lastId) {
      query._id = { $lt: new Types.ObjectId(lastId) };
    }
    return this.orderModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .lean()        // Returns plain JS objects (50% faster, less memory)
      .exec();
  }

  // UPDATE with optimistic concurrency
  async updateStatus(orderId: string, newStatus: string, expectedVersion: number): Promise<Order> {
    const result = await this.orderModel.findOneAndUpdate(
      { _id: orderId, __v: expectedVersion },
      { $set: { status: newStatus }, $inc: { __v: 1 } },
      { new: true }, // Return updated document
    );
    if (!result) {
      throw new ConflictException('Order was modified by another request');
    }
    return result;
  }

  // AGGREGATION: order statistics
  async getOrderStats(userId: string) {
    return this.orderModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
    ]);
  }

  // POPULATION (join-like behavior)
  async getOrderWithProduct(orderId: string): Promise<Order> {
    return this.orderModel
      .findById(orderId)
      .populate({
        path: 'items.productId',
        select: 'name price images',
        model: 'Product',
      })
      .lean()
      .exec();
  }

  // BULK OPERATIONS
  async bulkUpdateStatus(orderIds: string[], status: string): Promise<void> {
    await this.orderModel.updateMany(
      { _id: { $in: orderIds.map((id) => new Types.ObjectId(id)) } },
      { $set: { status } },
    );
  }
}
```

---

### Q: How do MongoDB transactions work in NestJS?

**Answer:**

MongoDB supports multi-document ACID transactions (requires a replica set, or a single-node replica set for development).

```typescript
@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectConnection() private connection: Connection,
  ) {}

  async placeOrder(userId: string, items: OrderItemDto[]): Promise<Order> {
    // Start a session for the transaction
    const session = await this.connection.startSession();

    try {
      // Use withTransaction for automatic retry on transient errors
      const order = await session.withTransaction(async () => {
        // 1. Check and reserve inventory for each item
        for (const item of items) {
          const result = await this.productModel.updateOne(
            {
              _id: item.productId,
              'inventory.available': { $gte: item.qty },  // Ensure stock available
            },
            {
              $inc: {
                'inventory.available': -item.qty,
                'inventory.reserved': item.qty,
              },
            },
            { session },
          );

          if (result.modifiedCount === 0) {
            throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
          }
        }

        // 2. Create the order
        const [newOrder] = await this.orderModel.create(
          [{
            userId,
            items,
            status: 'confirmed',
            total: items.reduce((sum, i) => sum + i.subtotal, 0),
          }],
          { session },
        );

        // 3. Update user's order count
        await this.userModel.updateOne(
          { _id: userId },
          { $inc: { orderCount: 1 }, $set: { lastOrderAt: new Date() } },
          { session },
        );

        return newOrder;
      });

      return order;
    } finally {
      session.endSession();
    }
  }
}
```

**Key points about MongoDB transactions:**

| Aspect | Detail |
|--------|--------|
| Requirement | Replica set (even single-node for dev) |
| Max duration | 60 seconds default (adjustable) |
| Lock granularity | Document-level |
| Performance | ~10% overhead for transactional writes |
| `withTransaction()` | Automatically retries on TransientTransactionError |
| Use sparingly | Denormalization is preferred in MongoDB; use transactions only when atomicity across collections is truly required |

---

### Q: When should you use the native MongoDB driver instead of Mongoose?

**Answer:**

Use the native driver when:

1. **Performance-critical paths** -- Mongoose adds ~5-15% overhead due to schema validation, casting, middleware, and document hydration
2. **Bulk operations** -- The native driver's `bulkWrite` is more flexible
3. **Complex aggregations** -- Mongoose's aggregate passes through to the native driver anyway
4. **Custom write concerns per operation** -- Easier with native driver

```typescript
import { MongoClient } from 'mongodb';

@Injectable()
export class NativeMongoService {
  private db: Db;

  constructor() {
    const client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      retryWrites: true,
      w: 'majority',
    });
    this.db = client.db('myapp');
  }

  // Lean, fast, no Mongoose overhead
  async getRecentOrders(userId: string, limit = 20) {
    return this.db
      .collection('orders')
      .find({ userId }, { projection: { items: 1, total: 1, status: 1 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Bulk write (mixed operations in one round-trip)
  async processBatch(operations: any[]) {
    return this.db.collection('orders').bulkWrite(
      operations.map((op) => ({
        updateOne: {
          filter: { _id: op.orderId },
          update: { $set: { status: op.status, updatedAt: new Date() } },
        },
      })),
      { ordered: false }, // Continue on error
    );
  }
}
```

**Interview tip:** "I use Mongoose for most CRUD operations because the schema validation, middleware, and TypeScript integration improve developer productivity. For hot paths, aggregation pipelines, or bulk operations, I drop down to the native driver."

---

## Q7: MongoDB Sharding & Scaling

### Q: Explain MongoDB sharding architecture. When and how do you shard?

**Answer:**

Sharding distributes data across multiple machines to handle datasets larger than a single server's capacity.

```
                        ┌──────────────┐
            App ──────► │   mongos     │  (Router)
                        │  (stateless) │
                        └──────┬───────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │   Shard 1    │   │   Shard 2    │   │   Shard 3    │
    │ (replica set)│   │ (replica set)│   │ (replica set)│
    │  PK: A-F     │   │  PK: G-N     │   │  PK: O-Z     │
    └──────────────┘   └──────────────┘   └──────────────┘

    ┌────────────────────────────────────────────────────┐
    │            Config Servers (replica set)              │
    │   Stores: shard key ranges, chunk locations,         │
    │           cluster metadata                           │
    └────────────────────────────────────────────────────┘
```

**Components:**

| Component | Role |
|-----------|------|
| **mongos** | Query router. Directs queries to correct shard(s). Stateless -- run many. |
| **Shard** | Stores a subset of data. Each shard is a replica set. |
| **Config servers** | Store metadata about which data is on which shard. Replica set of 3. |
| **Balancer** | Background process that migrates chunks to keep data evenly distributed. |
| **Chunk** | Contiguous range of shard key values. Default 128MB. |

---

### Q: How do you choose a shard key? This is the most critical sharding decision.

**Answer:**

A good shard key must have:

1. **High cardinality** -- many distinct values (avoids jumbo chunks)
2. **Even distribution** -- values spread writes across all shards
3. **Query isolation** -- queries include the shard key, so mongos routes to one shard (targeted query) instead of all (scatter-gather)

**Shard key comparison:**

| Shard Key | Cardinality | Distribution | Query Isolation | Verdict |
|-----------|-------------|--------------|-----------------|---------|
| `{ _id: 1 }` (ObjectId) | High | BAD -- monotonically increasing, all inserts hit last shard | Good | Avoid |
| `{ _id: "hashed" }` | High | Good (even distribution) | None (scatter-gather for range queries) | OK for write-heavy |
| `{ userId: 1 }` | High | Depends on user activity | Great for user-scoped queries | Good if users are active evenly |
| `{ userId: 1, createdAt: 1 }` | Very high | Good -- compound key prevents hot spots | Great for user + time queries | Best for most apps |
| `{ country: 1 }` | Low (limited countries) | BAD -- "BD" shard gets 80% of data | Good for country-scoped queries | Avoid |
| `{ timestamp: 1 }` | High | BAD -- monotonically increasing | Good for time-range queries | Avoid (hot shard on latest time) |

**Best practice for an e-commerce system:**

```javascript
// Shard key: compound key for orders
sh.shardCollection("mydb.orders", { userId: 1, createdAt: 1 });

// Why:
// - userId provides cardinality and distributes across shards
// - createdAt provides sort order within a user's data
// - Queries like "get user X's orders" are targeted (hit one shard)
// - No single "hot" shard since users are distributed
```

---

### Q: What is the difference between targeted and scatter-gather queries?

**Answer:**

```
TARGETED QUERY (includes shard key):

App → mongos → Shard 2 → Result
                 (only the shard that has the data)

SCATTER-GATHER QUERY (no shard key):

App → mongos ─┬→ Shard 1 ─┐
              ├→ Shard 2 ─┼→ Merge results
              └→ Shard 3 ─┘
                (ALL shards must respond)
```

| Type | Performance | When |
|------|-------------|------|
| **Targeted** | Fast -- O(1) shards | Query includes shard key |
| **Scatter-gather** | Slow -- O(N) shards | Query does NOT include shard key |
| **Broadcast** | Slowest -- all shards, merge + sort | Sort/aggregation without shard key |

**Always design queries to include the shard key.** If you need to query by a field that is not the shard key, create a secondary collection sharded by that field, or use a zone shard.

---

### Q: Explain zone sharding (geo-based sharding).

**Answer:**

Zone sharding lets you control which data lives on which shards, often used for data sovereignty (GDPR) or latency optimization.

```javascript
// Scenario: BD users' data stays on BD servers, EU users' data on EU servers

// 1. Tag shards with zones
sh.addShardTag("shard-bd-1", "BD");
sh.addShardTag("shard-bd-2", "BD");
sh.addShardTag("shard-eu-1", "EU");
sh.addShardTag("shard-eu-2", "EU");

// 2. Define zone ranges
sh.addTagRange("mydb.users", { region: "BD" }, { region: "BD~" }, "BD");
sh.addTagRange("mydb.users", { region: "EU" }, { region: "EU~" }, "EU");

// Now:
// - Documents with region: "BD" → BD shards (physically in Bangladesh/Singapore)
// - Documents with region: "EU" → EU shards (physically in Frankfurt)
// - GDPR compliance: EU data never leaves EU servers
```

---

### Q: When should you shard?

**Answer:**

Do NOT shard prematurely. Shard when:

| Indicator | Threshold |
|-----------|-----------|
| Data size | > 1TB and growing |
| Operations/sec | > 3000 ops/sec on a single replica set |
| Working set | Exceeds available RAM (cache evictions) |
| Storage I/O | Disk throughput maxed out |
| Write scaling | Cannot add more secondaries (reads scale, writes don't) |

**Before sharding, try:**
1. Vertical scaling (bigger server, more RAM, faster SSD)
2. Better indexes
3. Read scaling with secondaries
4. Archiving old data
5. Schema optimization (smaller documents)

---

## Q8: DynamoDB Fundamentals

### Q: What is DynamoDB? Explain its core concepts.

**Answer:**

DynamoDB is a **fully managed, serverless, key-value and document database** by AWS. It provides single-digit millisecond latency at any scale with automatic scaling, built-in security, and zero server management.

**Core concepts:**

```
Table: Users
┌────────────────────────────────────────────────────────┐
│  Partition Key (PK)  │  Sort Key (SK)  │  Attributes   │
├──────────────────────┼─────────────────┼───────────────┤
│  USER#123           │  PROFILE        │  name, email   │
│  USER#123           │  ORDER#001      │  total, status │
│  USER#123           │  ORDER#002      │  total, status │
│  USER#456           │  PROFILE        │  name, email   │
│  USER#456           │  ORDER#003      │  total, status │
└────────────────────────────────────────────────────────┘
     ▲                      ▲                  ▲
     │                      │                  │
  Hash function         Sorted within      Schema-less
  distributes to       the partition        per item
  partitions
```

**Key terminology:**

| Concept | Description |
|---------|-------------|
| **Table** | Top-level container (like a collection in MongoDB) |
| **Item** | A single record (like a document/row). Max 400KB. |
| **Attribute** | A field within an item (like a column). No fixed schema. |
| **Partition Key (PK)** | The primary hash key. Determines which partition stores the item. |
| **Sort Key (SK)** | Optional. Combined with PK, enables range queries within a partition. |
| **Primary Key** | PK alone (simple) or PK + SK (composite). Must be unique per item. |

**Primary key types:**

```
Simple Primary Key:      PK only
                         userId = "123" → unique

Composite Primary Key:   PK + SK
                         PK = "USER#123", SK = "ORDER#001" → unique combination
                         PK = "USER#123", SK = "ORDER#002" → same PK, different SK (allowed)
```

---

### Q: Explain DynamoDB capacity modes and how to calculate RCU/WCU.

**Answer:**

**Capacity modes:**

| Mode | Description | Best For | Pricing |
|------|-------------|----------|---------|
| **On-Demand** | Auto-scales, no capacity planning needed | Unpredictable traffic, new apps, spiky workloads | Pay per request ($1.25/million writes, $0.25/million reads) |
| **Provisioned** | You specify RCU/WCU, optional auto-scaling | Predictable traffic, cost optimization | Pay for provisioned capacity (cheaper at scale) |

**RCU (Read Capacity Unit) calculation:**

```
1 RCU = 1 strongly consistent read/sec for item up to 4KB
      = 2 eventually consistent reads/sec for item up to 4KB

Formula:
  Item size (rounded UP to next 4KB) / 4KB × reads per second

Example: Read 8KB items at 100 reads/sec (strongly consistent)
  = (8KB / 4KB) × 100 = 200 RCU

Example: Same but eventually consistent:
  = 200 / 2 = 100 RCU
```

**WCU (Write Capacity Unit) calculation:**

```
1 WCU = 1 write/sec for item up to 1KB

Formula:
  Item size (rounded UP to next 1KB) / 1KB × writes per second

Example: Write 3KB items at 50 writes/sec
  = (3KB / 1KB) × 50 = 150 WCU

Transactional writes cost 2x:
  = 150 × 2 = 300 WCU
```

**Cost comparison for a medium app (1000 reads/sec, 200 writes/sec, 2KB items):**

| Mode | Monthly Cost (approx) |
|------|----------------------|
| On-Demand | ~$250 |
| Provisioned | ~$130 |
| Provisioned + Reserved | ~$80 |

**Interview tip:** "I start with on-demand for new services and switch to provisioned once traffic patterns stabilize, usually after 2-4 weeks of monitoring."

---

### Q: Explain consistency models in DynamoDB.

**Answer:**

| Consistency | Behavior | Cost | Use Case |
|-------------|----------|------|----------|
| **Eventually Consistent** (default) | May return stale data (typically consistent within 1 second) | 0.5 RCU per 4KB | Most reads (user profiles, product listings) |
| **Strongly Consistent** | Always returns the most recent write | 1 RCU per 4KB | Critical reads (account balance, inventory count) |

```typescript
// Eventually consistent (default)
const result = await docClient.send(new GetCommand({
  TableName: 'Users',
  Key: { PK: 'USER#123', SK: 'PROFILE' },
}));

// Strongly consistent
const result = await docClient.send(new GetCommand({
  TableName: 'Users',
  Key: { PK: 'USER#123', SK: 'PROFILE' },
  ConsistentRead: true,  // 2x RCU cost
}));
```

**How it works internally:**

DynamoDB replicates each item to 3 Availability Zones. Writes go to the leader node and replicate to 2 followers:

```
Write → Leader (AZ-1) ──► Follower (AZ-2)
                      └──► Follower (AZ-3)

Eventually consistent read: may hit any node (including stale follower)
Strongly consistent read: always hits the leader (guaranteed latest)
```

---

## Q9: DynamoDB Single-Table Design

### Q: What is single-table design? Why is it the most important DynamoDB concept?

**Answer:**

Single-table design stores **multiple entity types in one table** using generic partition and sort keys. Instead of separate tables for users, orders, and products, you store them all in one table with carefully designed keys.

**Why single-table:**

1. **Fewer round trips** -- retrieve related entities in a single query
2. **Transactions** -- atomically write across entity types within one table
3. **Simpler operations** -- one table to manage (backups, monitoring, capacity)
4. **Cost efficiency** -- one set of GSIs serves multiple entity types

**The design process:**

1. **List ALL access patterns first** (this is mandatory -- DynamoDB cannot do ad-hoc queries efficiently)
2. Design PK/SK to satisfy the most common patterns
3. Add GSIs only for patterns that the base table cannot serve

---

### Q: Walk through a complete single-table design for an e-commerce system.

**Answer:**

**Step 1: List access patterns**

| # | Access Pattern | Frequency |
|---|---------------|-----------|
| 1 | Get user profile | Very high |
| 2 | Get user's orders (newest first) | High |
| 3 | Get order details | High |
| 4 | Get order items | High |
| 5 | Get product info | Very high |
| 6 | Get product reviews | Medium |
| 7 | Get orders by status (for admin) | Medium |
| 8 | Get user by email (login) | High |

**Step 2: Design the table**

```
Table: MainTable

| PK              | SK                 | GSI1PK           | GSI1SK           | Data                                          |
|-----------------|--------------------|------------------|------------------|-----------------------------------------------|
| USER#123        | PROFILE            | fazle@email.com  | USER#123         | { name, email, phone, createdAt }             |
| USER#123        | ORDER#2025-001     | ORDER#2025-001   | USER#123         | { total: 7650, status: "shipped", date: ... } |
| USER#123        | ORDER#2025-002     | ORDER#2025-002   | USER#123         | { total: 3200, status: "pending", date: ... } |
| ORDER#2025-001  | ITEM#PROD-A1       |                  |                  | { name: "Keyboard", qty: 1, price: 7650 }    |
| ORDER#2025-001  | ITEM#PROD-B2       |                  |                  | { name: "Mouse", qty: 2, price: 800 }        |
| PRODUCT#A1      | METADATA           |                  |                  | { name, price, stock, category }              |
| PRODUCT#A1      | REVIEW#USER#123    |                  |                  | { rating: 5, comment: "Great!", date: ... }   |
| PRODUCT#A1      | REVIEW#USER#456    |                  |                  | { rating: 4, comment: "Good", date: ... }     |

GSI1: PK = GSI1PK, SK = GSI1SK
GSI2: PK = status, SK = createdAt  (for admin: get orders by status)
```

**Step 3: Satisfy access patterns**

```typescript
// Pattern 1: Get user profile
// PK = "USER#123", SK = "PROFILE"
await docClient.send(new GetCommand({
  TableName: 'MainTable',
  Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
}));

// Pattern 2: Get user's orders (newest first)
// PK = "USER#123", SK begins_with "ORDER#"
await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `USER#${userId}`,
    ':sk': 'ORDER#',
  },
  ScanIndexForward: false, // Descending (newest first)
  Limit: 20,
}));

// Pattern 3: Get order details
// GSI1: PK = "ORDER#2025-001"
await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :pk',
  ExpressionAttributeValues: { ':pk': `ORDER#${orderId}` },
}));

// Pattern 4: Get order items
// PK = "ORDER#2025-001", SK begins_with "ITEM#"
await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `ORDER#${orderId}`,
    ':sk': 'ITEM#',
  },
}));

// Pattern 5: Get product info
// PK = "PRODUCT#A1", SK = "METADATA"
await docClient.send(new GetCommand({
  TableName: 'MainTable',
  Key: { PK: `PRODUCT#${productId}`, SK: 'METADATA' },
}));

// Pattern 6: Get product reviews
// PK = "PRODUCT#A1", SK begins_with "REVIEW#"
await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': `PRODUCT#${productId}`,
    ':sk': 'REVIEW#',
  },
}));

// Pattern 7: Get orders by status (admin) -- uses GSI2
await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  IndexName: 'GSI2',
  KeyConditionExpression: '#s = :status AND createdAt > :date',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: {
    ':status': 'pending',
    ':date': '2025-01-01',
  },
}));

// Pattern 8: Get user by email (login) -- uses GSI1
await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :email',
  ExpressionAttributeValues: { ':email': email },
}));
```

**Interview tip:** "When I design a DynamoDB table, I always start by listing every access pattern the application needs. Then I work backwards to design keys that satisfy those patterns. If I can't list the access patterns upfront, I might not want DynamoDB -- MongoDB or PostgreSQL would be more flexible for ad-hoc queries."

---

## Q10: DynamoDB Indexes & Query Patterns

### Q: Explain LSI vs GSI in DynamoDB.

**Answer:**

**Local Secondary Index (LSI):**

```
Base table:  PK = userId,  SK = orderId
LSI:         PK = userId,  SK = createdAt  (same PK, different SK)
```

| Aspect | LSI |
|--------|-----|
| Partition Key | Same as base table |
| Sort Key | Different from base table |
| Creation time | Must be created at table creation (cannot add later) |
| Max per table | 5 |
| Throughput | Shares RCU/WCU with base table |
| Consistency | Supports strongly consistent reads |
| Size limit | 10GB per partition key value |
| Use case | Alternative sort orders within the same partition |

**Global Secondary Index (GSI):**

```
Base table:  PK = userId,  SK = orderId
GSI:         PK = status,  SK = createdAt  (completely different keys)
```

| Aspect | GSI |
|--------|-----|
| Partition Key | Can be any attribute |
| Sort Key | Can be any attribute (optional) |
| Creation time | Can be added anytime |
| Max per table | 20 |
| Throughput | Has its own RCU/WCU (separate provisioned capacity) |
| Consistency | Eventually consistent only (cannot do strong reads) |
| Size limit | No limit |
| Use case | Alternative access patterns with different PK |

**GSI Overloading:**

Use generic attribute names for GSI keys so different entity types can reuse the same index:

```
| PK          | SK            | GSI1PK           | GSI1SK      |
|-------------|---------------|------------------|-------------|
| USER#123    | PROFILE       | fazle@email.com  | USER        |  ← email lookup
| USER#123    | ORDER#001     | 2025-01-15       | ORDER       |  ← date lookup
| PRODUCT#A1  | METADATA      | Electronics      | PRODUCT     |  ← category lookup
```

One GSI, three different query patterns.

---

### Q: Query vs Scan -- why does this matter?

**Answer:**

| Aspect | Query | Scan |
|--------|-------|------|
| How it works | Finds items by PK (+ optional SK condition) | Reads EVERY item in the table |
| Performance | O(matched items) | O(total items in table) |
| Cost | Reads only matching items | Reads all items, pays for all |
| When to use | Always (design your keys for this) | Almost never in production |

```typescript
// QUERY: efficient, reads only matching items
const orders = await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': 'USER#123',
    ':sk': 'ORDER#',
  },
}));
// Reads: ~20 items (only this user's orders)
// Cost: ~20 items worth of RCU

// SCAN: inefficient, reads everything then filters
const orders = await docClient.send(new ScanCommand({
  TableName: 'MainTable',
  FilterExpression: 'userId = :uid',
  ExpressionAttributeValues: { ':uid': 'USER#123' },
}));
// Reads: ALL items in table (could be millions)
// Cost: entire table worth of RCU
// FilterExpression is applied AFTER reading -- you still pay for scanning everything
```

**When Scan is acceptable:**
- Data migration / one-time jobs
- Analytics on small tables
- Export to data warehouse (with parallel scan)

```typescript
// Parallel scan for data export (divides table into segments)
const promises = Array.from({ length: 4 }, (_, i) =>
  docClient.send(new ScanCommand({
    TableName: 'MainTable',
    Segment: i,
    TotalSegments: 4,
  }))
);
const results = await Promise.all(promises);
```

---

### Q: Explain filter expressions, projection expressions, and condition expressions.

**Answer:**

```typescript
// FILTER EXPRESSION: applied AFTER read, reduces returned items but NOT consumed RCU
await docClient.send(new QueryCommand({
  TableName: 'MainTable',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  FilterExpression: '#s = :status AND total > :minTotal',  // Filter after read
  ExpressionAttributeNames: { '#s': 'status' },  // 'status' is a reserved word
  ExpressionAttributeValues: {
    ':pk': 'USER#123',
    ':sk': 'ORDER#',
    ':status': 'delivered',
    ':minTotal': 1000,
  },
}));
// IMPORTANT: FilterExpression does NOT reduce RCU cost. DynamoDB still reads all
// matching items from the key condition, then discards non-matching ones.

// PROJECTION EXPRESSION: return only specific attributes (reduces network bandwidth)
await docClient.send(new GetCommand({
  TableName: 'MainTable',
  Key: { PK: 'USER#123', SK: 'PROFILE' },
  ProjectionExpression: '#n, email, phone',
  ExpressionAttributeNames: { '#n': 'name' },  // 'name' is reserved
}));

// CONDITION EXPRESSION: conditional write (fails if condition not met)
await docClient.send(new PutCommand({
  TableName: 'MainTable',
  Item: { PK: 'USER#123', SK: 'PROFILE', name: 'Fazle', email: 'fazle@example.com' },
  ConditionExpression: 'attribute_not_exists(PK)',  // Only insert if not exists
}));
// Throws ConditionalCheckFailedException if item already exists
// This is how you implement "create if not exists" (idempotent writes)
```

---

## Q11: DynamoDB Advanced Features

### Q: How do DynamoDB transactions work?

**Answer:**

DynamoDB supports ACID transactions across multiple items and tables (up to 100 items per transaction).

```typescript
import { TransactWriteCommand, TransactGetCommand } from '@aws-sdk/lib-dynamodb';

// TRANSACTIONAL WRITE: Place an order (all-or-nothing)
async function placeOrder(userId: string, orderId: string, items: any[]) {
  const transactItems = [
    // 1. Create order
    {
      Put: {
        TableName: 'MainTable',
        Item: {
          PK: `USER#${userId}`,
          SK: `ORDER#${orderId}`,
          status: 'confirmed',
          total: items.reduce((sum, i) => sum + i.subtotal, 0),
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(PK)', // Idempotent
      },
    },
    // 2. Create order items
    ...items.map((item) => ({
      Put: {
        TableName: 'MainTable',
        Item: {
          PK: `ORDER#${orderId}`,
          SK: `ITEM#${item.productId}`,
          name: item.name,
          qty: item.qty,
          price: item.price,
        },
      },
    })),
    // 3. Decrement inventory
    ...items.map((item) => ({
      Update: {
        TableName: 'MainTable',
        Key: { PK: `PRODUCT#${item.productId}`, SK: 'METADATA' },
        UpdateExpression: 'SET stock = stock - :qty',
        ConditionExpression: 'stock >= :qty', // Ensure enough stock
        ExpressionAttributeValues: { ':qty': item.qty },
      },
    })),
    // 4. Increment user's order count
    {
      Update: {
        TableName: 'MainTable',
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        UpdateExpression: 'SET orderCount = orderCount + :inc',
        ExpressionAttributeValues: { ':inc': 1 },
      },
    },
  ];

  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (error) {
    if (error.name === 'TransactionCanceledException') {
      // Check which condition failed
      const reasons = error.CancellationReasons;
      reasons.forEach((reason, index) => {
        if (reason.Code === 'ConditionalCheckFailed') {
          console.error(`Condition failed at index ${index}`);
        }
      });
    }
    throw error;
  }
}

// TRANSACTIONAL READ: Get user profile and their latest order atomically
async function getUserWithLatestOrder(userId: string, orderId: string) {
  const result = await docClient.send(new TransactGetCommand({
    TransactItems: [
      { Get: { TableName: 'MainTable', Key: { PK: `USER#${userId}`, SK: 'PROFILE' } } },
      { Get: { TableName: 'MainTable', Key: { PK: `USER#${userId}`, SK: `ORDER#${orderId}` } } },
    ],
  }));
  return { user: result.Responses[0].Item, order: result.Responses[1].Item };
}
```

**Transaction limits and costs:**

| Aspect | Detail |
|--------|--------|
| Max items | 100 per transaction |
| Max size | 4MB total |
| Cost | 2x WCU for writes, 2x RCU for reads |
| Isolation | Serializable |
| Scope | Can span multiple tables |
| Idempotency | Use `ClientRequestToken` for idempotent transactions |

---

### Q: What are DynamoDB Streams? How do they enable event-driven architectures?

**Answer:**

DynamoDB Streams captures a time-ordered sequence of item-level changes (inserts, updates, deletes) in a DynamoDB table.

```
DynamoDB Table ──► DynamoDB Stream ──► Lambda Function ──► Side Effects

Stream Record:
{
  eventName: "MODIFY",
  dynamodb: {
    Keys: { PK: { S: "USER#123" }, SK: { S: "PROFILE" } },
    OldImage: { name: { S: "Old Name" }, ... },
    NewImage: { name: { S: "New Name" }, ... },
  }
}
```

**Stream view types:**

| View Type | What's Captured | Use Case |
|-----------|-----------------|----------|
| `KEYS_ONLY` | Only the key attributes | Lightweight triggers |
| `NEW_IMAGE` | Entire item after the change | Replicate to search index |
| `OLD_IMAGE` | Entire item before the change | Audit logging |
| `NEW_AND_OLD_IMAGES` | Both before and after | Change detection, conflict resolution |

**Common use cases with Lambda:**

```typescript
// Lambda function triggered by DynamoDB Stream
export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    switch (record.eventName) {
      case 'INSERT':
        // New order created → send confirmation email
        if (record.dynamodb.NewImage.SK.S.startsWith('ORDER#')) {
          await sendOrderConfirmationEmail(record.dynamodb.NewImage);
        }
        break;

      case 'MODIFY':
        // Order status changed → notify user
        const oldStatus = record.dynamodb.OldImage?.status?.S;
        const newStatus = record.dynamodb.NewImage?.status?.S;
        if (oldStatus !== newStatus) {
          await sendStatusUpdateNotification(record.dynamodb.NewImage, newStatus);
        }
        break;

      case 'REMOVE':
        // Item deleted → clean up related data
        await cleanupRelatedData(record.dynamodb.Keys);
        break;
    }
  }
};
```

**Architecture patterns with Streams:**

```
DynamoDB ──► Stream ──► Lambda ──► OpenSearch (search index sync)
                              ──► SNS (notifications)
                              ──► SQS (downstream processing queue)
                              ──► Another DynamoDB table (aggregation)
                              ──► S3 (archive to data lake)
```

---

### Q: Explain Global Tables and TTL in DynamoDB.

**Answer:**

**Global Tables (multi-region replication):**

```
Singapore (ap-southeast-1)      Frankfurt (eu-west-1)
┌──────────────────────┐       ┌──────────────────────┐
│   DynamoDB Table     │◄─────►│   DynamoDB Table     │
│   (read/write)       │  sync │   (read/write)       │
└──────────────────────┘       └──────────────────────┘
         ▲                              ▲
         │                              │
   BD/SEA users                    EU users
```

| Feature | Detail |
|---------|--------|
| Replication | Multi-active (all regions can write) |
| Latency | Replication typically < 1 second |
| Conflict resolution | Last-writer-wins (based on timestamp) |
| Cost | Pay for replication WCU in each region |
| Use case | Global apps, disaster recovery, low-latency reads worldwide |

**TTL (Time to Live):**

```typescript
// Set TTL on a session item
await docClient.send(new PutCommand({
  TableName: 'MainTable',
  Item: {
    PK: `SESSION#${sessionId}`,
    SK: 'DATA',
    userId: 'USER#123',
    token: 'jwt-token-here',
    ttl: Math.floor(Date.now() / 1000) + 86400, // Expires in 24 hours (Unix timestamp)
  },
}));

// DynamoDB automatically deletes expired items (within ~48 hours of TTL)
// No RCU/WCU consumed for TTL deletions
// Deleted items appear in DynamoDB Streams (if enabled) for cleanup
```

**TTL use cases:**
- Session tokens (expire after 24h)
- OTP codes (expire after 5 minutes)
- Temporary carts (expire after 7 days)
- Log entries (expire after 90 days)
- Rate limit counters (expire after window period)

**Important:** TTL deletions are not instantaneous. Items may persist for up to 48 hours after the TTL timestamp. Always add a filter in your application to check if the item has expired.

```typescript
async getSession(sessionId: string) {
  const result = await docClient.send(new GetCommand({
    TableName: 'MainTable',
    Key: { PK: `SESSION#${sessionId}`, SK: 'DATA' },
  }));

  const item = result.Item;
  if (!item) return null;

  // Double-check TTL in application (item may not be deleted yet)
  if (item.ttl && item.ttl < Math.floor(Date.now() / 1000)) {
    return null; // Expired but not yet cleaned up
  }

  return item;
}
```

---

## Q12: DynamoDB with Node.js & NestJS

### Q: How do you build a DynamoDB service in NestJS with AWS SDK v3?

**Answer:**

```typescript
// dynamo.module.ts
import { Module, Global } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const DYNAMO_CLIENT = 'DYNAMO_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: DYNAMO_CLIENT,
      useFactory: () => {
        const client = new DynamoDBClient({
          region: process.env.AWS_REGION || 'ap-southeast-1',
          ...(process.env.NODE_ENV === 'development' && {
            endpoint: 'http://localhost:8000', // DynamoDB Local
            credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
          }),
        });

        return DynamoDBDocumentClient.from(client, {
          marshallOptions: {
            removeUndefinedValues: true,
            convertEmptyValues: false,
          },
        });
      },
    },
  ],
  exports: [DYNAMO_CLIENT],
})
export class DynamoModule {}
```

```typescript
// user.repository.ts
import { Injectable, Inject } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'MainTable';

@Injectable()
export class UserRepository {
  constructor(
    @Inject('DYNAMO_CLIENT') private docClient: DynamoDBDocumentClient,
  ) {}

  // CREATE user
  async createUser(user: CreateUserDto): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${user.id}`,
        SK: 'PROFILE',
        GSI1PK: user.email,
        GSI1SK: `USER#${user.id}`,
        name: user.name,
        email: user.email,
        phone: user.phone,
        orderCount: 0,
        createdAt: new Date().toISOString(),
        entityType: 'USER',
      },
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwrite
    }));
  }

  // READ user by ID
  async getUserById(userId: string): Promise<User | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    }));
    return result.Item as User || null;
  }

  // READ user by email (GSI)
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    }));
    return result.Items?.[0] as User || null;
  }

  // UPDATE user (partial update)
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    // Dynamically build UpdateExpression
    const expressionParts: string[] = [];
    const expressionValues: Record<string, any> = {};
    const expressionNames: Record<string, string> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      expressionParts.push(`${attrName} = ${attrValue}`);
      expressionNames[attrName] = key;
      expressionValues[attrValue] = value;
    });

    expressionParts.push('#updatedAt = :updatedAt');
    expressionNames['#updatedAt'] = 'updatedAt';
    expressionValues[':updatedAt'] = new Date().toISOString();

    const result = await this.docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes as User;
  }

  // PAGINATION with cursor
  async getUserOrders(
    userId: string,
    limit = 20,
    lastEvaluatedKey?: Record<string, any>,
  ): Promise<{ orders: Order[]; nextCursor?: string }> {
    const result = await this.docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'ORDER#',
      },
      ScanIndexForward: false,
      Limit: limit,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    }));

    return {
      orders: result.Items as Order[],
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
    };
  }

  // BATCH WRITE (max 25 items per batch)
  async batchCreateUsers(users: CreateUserDto[]): Promise<void> {
    const BATCH_SIZE = 25;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      await this.docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((user) => ({
            PutRequest: {
              Item: {
                PK: `USER#${user.id}`,
                SK: 'PROFILE',
                name: user.name,
                email: user.email,
                entityType: 'USER',
              },
            },
          })),
        },
      }));
    }
  }

  // DELETE with condition
  async deleteUser(userId: string): Promise<void> {
    await this.docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      ConditionExpression: 'attribute_exists(PK)', // Only delete if exists
    }));
  }
}
```

---

### Q: How do you handle errors and retries with DynamoDB?

**Answer:**

```typescript
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  ProvisionedThroughputExceededException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';

@Injectable()
export class DynamoDBService {
  // Exponential backoff with jitter
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        // Only retry throttling errors
        if (
          error instanceof ProvisionedThroughputExceededException &&
          attempt < maxRetries
        ) {
          const baseDelay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
          const jitter = Math.random() * baseDelay;
          await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
          continue;
        }

        // Handle specific errors
        if (error instanceof ConditionalCheckFailedException) {
          throw new ConflictException('Item already exists or condition not met');
        }

        if (error instanceof TransactionCanceledException) {
          const reasons = error.CancellationReasons?.map((r) => r.Code).join(', ');
          throw new BadRequestException(`Transaction failed: ${reasons}`);
        }

        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  async safeCreateUser(user: CreateUserDto) {
    return this.withRetry(() => this.createUser(user));
  }
}
```

**Common errors and how to handle them:**

| Error | Cause | Solution |
|-------|-------|----------|
| `ProvisionedThroughputExceededException` | Exceeded RCU/WCU | Exponential backoff + retry, or switch to on-demand |
| `ConditionalCheckFailedException` | ConditionExpression not met | Expected in optimistic locking -- handle in app logic |
| `TransactionCanceledException` | One or more conditions in transaction failed | Check CancellationReasons, retry if transient |
| `ValidationException` | Invalid request (bad key, missing required fields) | Fix the request -- do not retry |
| `ResourceNotFoundException` | Table or index does not exist | Check table name, check if GSI is active |
| `ItemCollectionSizeLimitExceededException` | LSI partition exceeds 10GB | Redesign data model or use GSI instead |

---

## Q13: MongoDB vs DynamoDB -- When to Use Which

### Q: Compare MongoDB and DynamoDB. How do you decide which to use?

**Answer:**

**Detailed comparison:**

| Feature | MongoDB | DynamoDB |
|---------|---------|----------|
| **Query flexibility** | Very flexible -- ad-hoc queries, any field | Limited -- must design for access patterns upfront |
| **Scaling** | Manual sharding (complex) | Automatic, seamless, infinite |
| **Cost model** | Server-based (Atlas or self-hosted) | Pay-per-request or provisioned capacity |
| **Transactions** | Multi-document ACID (full featured) | TransactWriteItems (up to 100 items, 2x cost) |
| **Aggregation** | Rich pipeline ($group, $lookup, $facet, etc.) | Very limited (mostly client-side) |
| **Indexing** | Flexible -- any field, any time | GSI/LSI -- must plan ahead, max 20 GSIs |
| **Schema** | Flexible, validation optional | Flexible, no built-in validation |
| **Hosting** | Self-managed, Atlas (multi-cloud), DocumentDB | AWS only |
| **Latency** | 1-10ms (depends on setup) | Single-digit ms at any scale |
| **Max item size** | 16MB | 400KB |
| **Full-text search** | Built-in text indexes + Atlas Search | None (use OpenSearch) |
| **Streams/CDC** | Change Streams | DynamoDB Streams |
| **Backups** | mongodump, Atlas continuous backup | On-demand + PITR (point-in-time recovery) |
| **Learning curve** | Moderate (familiar JSON model) | Steep (single-table design, key design) |
| **Ops burden** | Moderate to high (if self-hosted) | Zero (fully managed) |
| **Community** | Very large, extensive tooling | AWS ecosystem |

**Decision framework:**

```
START
  │
  ├── Need flexible/ad-hoc queries?
  │     YES → MongoDB
  │     NO  ↓
  │
  ├── Serverless AWS architecture?
  │     YES → DynamoDB (tight Lambda integration)
  │     NO  ↓
  │
  ├── Need complex aggregations / analytics?
  │     YES → MongoDB (aggregation pipeline is far superior)
  │     NO  ↓
  │
  ├── Predictable access patterns at massive scale?
  │     YES → DynamoDB (infinite scale, zero ops)
  │     NO  ↓
  │
  ├── Need full-text search built-in?
  │     YES → MongoDB (Atlas Search or text indexes)
  │     NO  ↓
  │
  ├── Startup on a budget?
  │     YES → MongoDB Atlas free tier (512MB) or self-hosted
  │     NO  ↓
  │
  ├── Multi-cloud / avoid vendor lock-in?
  │     YES → MongoDB (runs anywhere)
  │     NO  ↓
  │
  └── Already heavily on AWS?
        YES → DynamoDB
        NO  → MongoDB (safer default choice)
```

**Real-world polyglot example (Daraz/Shopify-like e-commerce):**

| Data | Database | Why |
|------|----------|-----|
| Product catalog | MongoDB | Flexible attributes per category, full-text search, rich aggregations for analytics |
| Orders & payments | PostgreSQL | ACID transactions critical for money |
| User sessions | Redis | Sub-ms latency, auto-expire with TTL |
| Activity logs / events | DynamoDB | Massive write throughput, auto-scaling, cheap at scale |
| Recommendations | Neo4j or Neptune | Graph traversal for "customers who bought X also bought Y" |
| Search | OpenSearch | Full-text search with relevance scoring |

**Interview tip:** "I don't pick a database first and force the problem into it. I analyze the access patterns, consistency requirements, scale expectations, and team expertise, then choose the right tool. In production systems, I often use polyglot persistence -- different databases for different concerns."

---

## Q14: NoSQL Data Modeling Best Practices

### Q: What are the key principles of NoSQL data modeling?

**Answer:**

#### 1. Model for access patterns, NOT for normalized schema

```
SQL mindset:    "What entities do I have? How are they related?"
NoSQL mindset:  "What queries does my application need? Design the data to answer them."
```

#### 2. Denormalization is normal (and expected)

In SQL, you normalize to avoid duplication. In NoSQL, you denormalize intentionally for read performance.

```typescript
// SQL approach (normalized): 3 queries to render an order page
// SELECT * FROM orders WHERE id = 1;
// SELECT * FROM users WHERE id = orders.user_id;
// SELECT * FROM products WHERE id IN (SELECT product_id FROM order_items WHERE order_id = 1);

// MongoDB approach (denormalized): 1 query
const order = await db.orders.findOne({ _id: orderId });
// Returns: { user: { name, email }, items: [{ productName, price, qty }], total, status }
```

#### 3. Think about read-to-write ratio

| Ratio | Strategy |
|-------|----------|
| Read-heavy (100:1) | Aggressively denormalize, pre-compute aggregations |
| Write-heavy (1:100) | Normalize more, avoid large documents that require full rewrites |
| Balanced (10:1) | Moderate denormalization, use computed pattern |

#### 4. Plan for data growth

```typescript
// BAD: Unbounded array (will eventually hit 16MB limit or degrade performance)
{
  userId: "123",
  activityLog: [
    { action: "login", date: "2025-01-01" },
    { action: "purchase", date: "2025-01-02" },
    // ... grows forever
  ]
}

// GOOD: Separate collection with bounded documents (bucket pattern)
{
  userId: "123",
  month: "2025-01",
  activities: [
    { action: "login", date: "2025-01-01" },
    { action: "purchase", date: "2025-01-02" },
  ],
  count: 2
}
```

#### 5. Version your schema

```typescript
{
  _id: ObjectId("..."),
  schemaVersion: 2,
  name: "Fazle Rabbi",
  email: "fazle@example.com",
  // schemaVersion 2 added 'phone' field
  phone: "+880171XXXXXXX"
}

// Application handles both versions
function normalizeUser(doc: any): User {
  switch (doc.schemaVersion) {
    case 1:
      return { ...doc, phone: null }; // v1 didn't have phone
    case 2:
      return doc;
    default:
      throw new Error(`Unknown schema version: ${doc.schemaVersion}`);
  }
}
```

#### 6. Handle eventual consistency in application code

```typescript
// After creating an order, don't immediately query for it from a secondary
// Instead, either:
// a) Use the returned document from the write operation
// b) Read from primary (readPreference: primary)
// c) Use "read your own writes" pattern

async createAndReturn(orderData: any): Promise<Order> {
  // MongoDB: use the saved document directly
  const order = await this.orderModel.create(orderData);
  return order; // Don't do another find() -- this IS the latest version

  // DynamoDB: use ReturnValues
  const result = await docClient.send(new PutCommand({
    TableName: 'MainTable',
    Item: { PK: `ORDER#${orderId}`, SK: 'DETAILS', ...orderData },
    ReturnValues: 'ALL_OLD', // or use the Item you just put
  }));
}
```

#### 7. Use TTL for temporary data

Both MongoDB and DynamoDB support TTL:

```typescript
// MongoDB: TTL index
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Document: { userId: "123", token: "...", expiresAt: new Date("2025-02-01") }

// DynamoDB: TTL attribute (Unix timestamp in seconds)
// Item: { PK: "SESSION#abc", SK: "DATA", ttl: 1738368000 }
```

---

### Q: "Design a schema for X" -- how do you approach this in an interview?

**Answer:**

This is the most common NoSQL interview question. Follow this framework:

**Step 1: Ask clarifying questions**
- What are the main entities?
- What are the access patterns (reads and writes)?
- What is the read-to-write ratio?
- What is the expected scale (items, requests/sec)?
- What are the consistency requirements?
- Is there a time dimension to the data?

**Step 2: List access patterns explicitly**

```
1. Get user by ID
2. Get user by email
3. Get user's recent orders (last 20)
4. Get order details with items
5. Search products by category
6. Get product reviews (paginated)
...
```

**Step 3: Choose embedding vs referencing for each relationship**

| Relationship | Decision | Why |
|--------------|----------|-----|
| User → Address | Embed | 1:few, always needed with user |
| User → Orders | Reference | 1:many, grows over time |
| Order → Items | Embed | 1:few (bounded), always accessed together |
| Product → Reviews | Reference | 1:many, grows unbounded |

**Step 4: Design keys (DynamoDB) or collections (MongoDB)**

**Step 5: Add indexes for remaining access patterns**

**Step 6: Consider edge cases**
- What happens with viral/hot data?
- How do you handle schema evolution?
- What about data archival?

---

## Quick Reference

### MongoDB Index Types Cheat Sheet

| Index | When to Use | Watch Out |
|-------|-------------|-----------|
| Single field | Query on one field | Direction matters for sort |
| Compound | Query on multiple fields | Field ORDER matters (ESR rule) |
| Multikey | Query on array elements | Cannot compound two multikey fields |
| Text | Full-text search | One text index per collection |
| 2dsphere | Geospatial queries | Requires GeoJSON format |
| Hashed | Shard key | No range queries |
| TTL | Auto-expire documents | Single field, must be Date type |
| Partial | Reduce index size | Only indexes matching documents |
| Wildcard | Dynamic field paths | Higher write cost |

### DynamoDB Capacity Calculation Table

| Operation | Item Size | Calculation | Result |
|-----------|-----------|-------------|--------|
| 1 strongly consistent read/sec | 4KB | 1 RCU | 1 RCU |
| 1 eventually consistent read/sec | 4KB | 0.5 RCU | 0.5 RCU |
| 1 strongly consistent read/sec | 8KB | ceil(8/4) = 2 RCU | 2 RCU |
| 1 write/sec | 1KB | 1 WCU | 1 WCU |
| 1 write/sec | 3KB | ceil(3/1) = 3 WCU | 3 WCU |
| 1 transactional write/sec | 1KB | 2 WCU | 2 WCU |
| 100 eventually consistent reads/sec | 6KB | ceil(6/4) * 100 / 2 = 100 RCU | 100 RCU |

### Single-Table Design Template

```
| PK                | SK                  | GSI1PK          | GSI1SK          | Attributes        |
|-------------------|---------------------|-----------------|-----------------|-------------------|
| ENTITY#id         | METADATA            | alt_lookup_key  | ENTITY#id       | name, email, ...  |
| ENTITY#id         | RELATION#child_id   |                 |                 | child data        |
| PARENT#id         | CHILD#child_id      | CHILD#child_id  | PARENT#id       | child data        |

Design rules:
1. PK = entity type + ID (e.g., USER#123)
2. SK = purpose or related entity (e.g., PROFILE, ORDER#001)
3. GSI for inverse lookups (e.g., look up parent from child)
4. Overload GSI keys with generic names for multi-purpose indexes
```

### MongoDB vs DynamoDB Decision Matrix

| Scenario | Winner |
|----------|--------|
| Need ad-hoc queries during development | MongoDB |
| Serverless / Lambda-based architecture | DynamoDB |
| Complex aggregation and analytics | MongoDB |
| Infinite auto-scaling with zero ops | DynamoDB |
| Full-text search built-in | MongoDB |
| Multi-region active-active | DynamoDB (Global Tables) |
| Budget-constrained startup | MongoDB (Atlas free tier) |
| Event-driven with change capture | Both (Change Streams vs Streams) |
| Vendor-agnostic / multi-cloud | MongoDB |
| Already heavily on AWS | DynamoDB |
| Item size > 400KB | MongoDB (16MB limit) |
| Need strong consistency + transactions | MongoDB (more flexible) |

### Common Interview Questions -- Short Answers

**Q: What is the maximum document size in MongoDB?**
A: 16MB. Use GridFS for larger files.

**Q: What is the maximum item size in DynamoDB?**
A: 400KB. Store large objects in S3, reference by key.

**Q: Can DynamoDB do joins?**
A: No. Design your data model to avoid joins (single-table design, denormalization).

**Q: How does MongoDB handle transactions?**
A: Multi-document ACID transactions since v4.0. Requires replica set. Uses snapshot isolation.

**Q: How many GSIs can a DynamoDB table have?**
A: 20 per table (soft limit, can request increase).

**Q: What happens when a MongoDB primary goes down?**
A: Automatic election within ~12 seconds. A secondary with the most recent oplog entry becomes the new primary.

**Q: How does DynamoDB handle hot partitions?**
A: Adaptive capacity automatically isolates hot items. Since 2018, DynamoDB can "burst" to handle non-uniform access patterns. Still, good key design is critical.

**Q: When would you use MongoDB's $lookup vs denormalization?**
A: Use `$lookup` for rarely-run analytical queries. For frequently-read data, denormalize (embed or extended reference pattern). `$lookup` is expensive and does not use indexes on the joined collection's non-key fields.

**Q: How do you handle pagination in DynamoDB?**
A: Cursor-based pagination using `LastEvaluatedKey` / `ExclusiveStartKey`. Never use offset-based pagination (no SKIP equivalent). Encode the cursor as base64 for the client.

**Q: What is the difference between `w: "majority"` and `j: true` in MongoDB?**
A: `w: "majority"` waits for the write to be acknowledged by a majority of replica set members (in memory). `j: true` waits for the write to be committed to the journal on disk. Use both for maximum durability: `{ w: "majority", j: true }`.
