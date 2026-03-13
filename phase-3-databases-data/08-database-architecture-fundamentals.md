# Database Architecture Fundamentals - Interview Q&A

## Table of Contents
1. [CAP & PACELC Theorems](#cap--pacelc-theorems)
2. [Sharding vs. Partitioning](#sharding-vs-partitioning)
3. [Read Replica Lag](#read-replica-lag)
4. [MVCC (Multi-Version Concurrency Control)](#mvcc-multi-version-concurrency-control)

---

## CAP & PACELC Theorems

### Q1: Explain the CAP Theorem and how it applies to modern databases.

**Answer:**
The CAP Theorem states that a distributed system can only provide two of the following three guarantees simultaneously:
- **Consistency (C):** Every read receives the most recent write or an error.
- **Availability (A):** Every request receives a (non-error) response, without the guarantee that it contains the most recent write.
- **Partition Tolerance (P):** The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

Because network partitions (P) are inevitable in distributed systems, we must choose between Consistency (CP) and Availability (AP) during a partition.

- **CP Databases:** MongoDB (with strict settings), HBase, Redis (in wait-for-sync config). If a partition occurs, they will refuse writes/reads to ensure data isn't corrupted or stale.
- **AP Databases:** Cassandra, DynamoDB, Riak. They will always accept reads/writes, resolving conflicts later (Eventual Consistency).
- **CA Databases:** Traditional Single-Node RDBMS (PostgreSQL/MySQL). They cannot tolerate network partitions (if the machine goes down, it's down).

### Q2: What is the PACELC Theorem?

**Answer:**
PACELC extends CAP by addressing what happens when the system is *running normally* (no partition).

**P**artition: If there is a partition, how does the system trade off **A**vailability and **C**onsistency.
**E**lse (when running normally): How does the system trade off **L**atency and **C**onsistency.

- **DynamoDB/Cassandra:** PA/EL. (If partitioned, choose Availability over Consistency. Else, choose Latency over Consistency).
- **MongoDB:** PC/EC. (If partitioned, choose Consistency. Else, choose Consistency over Latency).

---

## Sharding vs. Partitioning

### Q3: What is the difference between Partitioning and Sharding?

**Answer:**

**Partitioning (Vertical / Horizontal inside a single node):**
Dividing a large table into smaller, more manageable pieces within the *same* database instance.
- *Example:* A massive `logs` table is partitioned by month (e.g., `logs_jan`, `logs_feb`).
- *Pros:* Improves query performance (query planner can skip partitions), easier data lifecycle management (drop an old partition instantly instead of slow DELETEs).

**Sharding (Horizontal across multiple nodes):**
Distributing data across *multiple independent database instances/servers*. Each instance is a "shard" and holds a subset of the total data.
- *Example:* Users with IDs 1-1M are on Server A, Users 1M-2M are on Server B.
- *Pros:* Horizontally scales read/write capacity and storage beyond a single machine's limits.
- *Cons:* Extremely complex. Operational overhead, joins across shards are difficult or impossible, transactions across shards require Two-Phase Commit (2PC) which is slow.

### Q4: Explain common Sharding Routing Algorithms.

**Answer:**
1. **Hash-based Sharding (Algorithmic):**
   - `Shard_ID = Hash(ShardKey) % Number_of_Shards`
   - *Pros:* Uniform data distribution.
   - *Cons:* Adding/removing a shard requires massive data migration (resharding). Using Consistent Hashing mitigates this.
2. **Range-based Sharding:**
   - Values 1-100 to Shard 1, 101-200 to Shard 2.
   - *Pros:* Good for range queries.
   - *Cons:* Prone to data hotspots (e.g., if sorting by timestamp, all new writes hit exactly one shard).
3. **Directory/Lookup Sharding:**
   - A mapping table stores which ShardKey belongs to which Shard.
   - *Pros:* Highly flexible. Shards can be added dynamically.
   - *Cons:* The lookup table becomes a single point of failure and bottleneck.

---

## Read Replica Lag

### Q5: How do you handle Read Replica Lag in a Master-Slave database architecture?

**Answer:**
Read Replica Lag happens when the replica database is slightly behind the primary master database (usually due to async replication).

**The Problem:**
User updates profile on Master -> System redirects to profile page -> Page reads from Replica -> User sees old data (because the replica hasn't caught up yet).

**Solutions (Senior/Lead Focus):**
1. **Read-Your-Own-Writes Consistency:**
   - When a user performs a write, set a cache/cookie/session flag for that user (e.g., `just_wrote_profile: true`).
   - For the next *N* seconds, route all of that specific user's reads to the *Master* instead of the Replica. Other users still read from the Replica.
2. **Synchronous Replication:**
   - Master won't return success until the Replica acknowledges the write.
   - *Con:* Drastically increases write latency and kills availability if the replica goes down. Rarely used.
3. **Version/Timestamp Checking:**
   - Pass the version/timestamp of the data updated to the client.
   - On read, the client sends this version. If the Replica's data is older than the requested version, the request is actively routed to the Master.
4. **Cache as the buffer:**
   - Write to DB *and* Cache. Read from Cache. The cache naturally stays up to date, shielding the user from replica lag.

---

## MVCC (Multi-Version Concurrency Control)

### Q6: What is MVCC and how does it solve Concurrency issues?

**Answer:**
MVCC allows a database to provide high concurrency without strict locking.
"Readers don't block Writers, and Writers don't block Readers."

Instead of locking a row when someone is updating it (which prevents others from reading it), the database creates a *new version* of the row.

- Every transaction sees a "snapshot" of the database at the time it started.
- If Tx1 is updating Row A, it writes a new version (Row A_v2).
- If Tx2 reads Row A simultaneously, it is simply served the old version (Row A_v1) from the snapshot. No locks required for the read.
- This is heavily used in PostgreSQL (via `xmin`/`xmax` system columns) to implement isolation levels like `Read Committed` and `Repeatable Read`.
- *Side Effect:* MVCC generates dead tuples (old versions of rows). Processes like PostgreSQL's `VACUUM` are required to periodically clean up these dead tuples to reclaim disk space.
