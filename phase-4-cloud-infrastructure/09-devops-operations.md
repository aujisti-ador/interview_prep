# DevOps Operations — Scaling, Backup & Production Monitoring

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with production war stories, real numbers, and runnable commands
> **Last Updated:** 2026-08-11

This file covers the **"run it in production"** half of DevOps — the questions that come after CI/CD has already deployed your code. Every section is anchored to a real incident shape you can retell in an interview.

> **How to use the war stories:** each one is written as *situation → numbers → what we did → what we changed permanently*. That is exactly the shape an interviewer wants back. Never tell a scaling story without a number in it.

---

## Table of Contents

1. [Scaling Fundamentals & Autoscaling in Production](#q1-scaling-fundamentals--autoscaling-in-production)
2. [Scaling the Stateful Layer (Database, Cache, Queue)](#q2-scaling-the-stateful-layer-database-cache-queue)
3. [Backup Strategy](#q3-backup-strategy)
4. [Disaster Recovery & Failover](#q4-disaster-recovery--failover)
5. [Monitoring That Works in Production](#q5-monitoring-that-works-in-production)
6. [Alerting, On-Call & Incident Operations](#q6-alerting-on-call--incident-operations)
7. [Capacity Planning & Cost Control](#q7-capacity-planning--cost-control)
8. [Safe Deploys, Migrations & Rollbacks](#q8-safe-deploys-migrations--rollbacks)
9. [Operational Hygiene (Secrets, Certs, Logs, Patching)](#q9-operational-hygiene-secrets-certs-logs-patching)
10. [Rapid-Fire Scenario Drills](#q10-rapid-fire-scenario-drills)
11. [Quick Reference](#quick-reference)

---

## Q1: Scaling Fundamentals & Autoscaling in Production

### Q: Vertical vs horizontal scaling — how do you actually choose?

**A:**

| | Vertical (scale up) | Horizontal (scale out) |
|---|---|---|
| **What** | Bigger instance (`t3.medium` → `m6i.2xlarge`) | More instances behind a load balancer |
| **Downtime** | Usually a restart (RDS: 1–3 min failover) | None |
| **Ceiling** | Hard — largest instance type | Soft — limited by shared bottlenecks |
| **Cost curve** | Superlinear (2x CPU often > 2x price at the top end) | Roughly linear |
| **Requires** | Nothing | Statelessness, sticky-session removal, distributed cache/session store |
| **Best for** | Databases, single-writer components, quick relief | Web/API tiers, workers, consumers |

**The honest rule:** scale **vertically first** because it takes an afternoon, and scale **horizontally** because it's the only thing that keeps working. In practice you do both — the app tier scales out, the database scales up (until you shard).

**What interviewers are really testing:** do you know *what stops you* from scaling horizontally?

1. **In-memory session state** → move to Redis.
2. **Local file uploads** → move to S3.
3. **In-process cron/schedulers** → every replica fires the job. Move to a leader-elected job or a scheduler service.
4. **Local rate-limit counters** → 10 replicas = 10x the limit. Move to Redis.
5. **Database connections** → 40 replicas × 20 pool size = 800 connections against a Postgres tuned for 200. This is the one that bites people.

---

### Q: Explain Kubernetes HPA and the mistakes people make with it.

**A:** The HPA loop runs every 15s and computes:

```
desiredReplicas = ceil( currentReplicas × ( currentMetric / targetMetric ) )
```

Example: 4 pods averaging 80% CPU with a 50% target → `ceil(4 × 80/50)` = **7 pods**.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: orders-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders-api
  minReplicas: 4          # NOT 1 — see "scale-to-near-zero" below
  maxReplicas: 40
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    # Scale on what users actually feel, not just CPU
    - type: Pods
      pods:
        metric:
          name: http_requests_inflight
        target:
          type: AverageValue
          averageValue: "30"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0     # react immediately
      policies:
        - type: Percent
          value: 100                    # allowed to double
          periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300   # wait 5 min of calm before shrinking
      policies:
        - type: Percent
          value: 20                     # shrink slowly — 20% per minute
          periodSeconds: 60
```

**The five classic mistakes:**

| Mistake | What happens | Fix |
|---|---|---|
| No `resources.requests` set | HPA has no denominator; utilization is meaningless and scaling never triggers | Always set requests; that's the number HPA divides by |
| Symmetric scale-up/scale-down | Traffic dips for 60s, HPA halves the fleet, traffic returns, latency spikes — "flapping" | Fast up, slow down (`behavior` block above) |
| `minReplicas: 1` | Cold start on the first request after a quiet period; one pod = no redundancy during a node drain | `minReplicas: 2+` for anything user-facing |
| CPU-only target on an I/O-bound service | Service is blocked on DB, CPU sits at 15%, latency is 4s, HPA does nothing | Scale on in-flight requests, queue depth, or p95 latency (KEDA / custom metrics) |
| No Cluster Autoscaler headroom | HPA creates pods, they sit `Pending` for 3–5 min while a node boots | Over-provision with low-priority "balloon" pods that get evicted instantly |

**Real-time example — the scale-up lag chain.** During a campaign launch, traffic went from 400 → 3,800 rps in about 90 seconds. The HPA reacted correctly, but users still saw errors for 4 minutes. The chain was:

```
metrics-server scrape (15s) → HPA loop (15s) → pod scheduled → node Pending (0s if capacity)
  → image pull (45s, 900MB image) → app boot + JIT warm (25s) → readiness probe passes (2 × 10s)
  ≈ 2 min best case, 6 min when a new node had to boot
```

Fixes, in order of payoff:
1. **Pre-scale on a schedule** — a `CronJob` bumping `minReplicas` 15 min before known events (campaign start, 8 PM peak). Deterministic beats reactive.
2. **Shrink the image** — 900MB → 180MB multi-stage build cut the pull to ~8s, and pre-pulled it to nodes via a DaemonSet.
3. **Balloon pods** — 3 low-priority pause pods holding a node's worth of resources; real pods preempt them instantly while the autoscaler boots a replacement node.

Result: scale-up time went from ~6 min to ~40s.

---

### Q: What is KEDA and when do you need it instead of plain HPA?

**A:** HPA scales on CPU/memory (and custom metrics, with plumbing). **KEDA** scales on *external* systems — queue depth, stream lag, cron, database rows — and can scale **to zero**.

Use KEDA when the correct signal lives outside the pod:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: invoice-worker
spec:
  scaleTargetRef:
    name: invoice-worker
  minReplicaCount: 0        # scale to zero between batches
  maxReplicaCount: 50
  cooldownPeriod: 300
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.ap-southeast-1.amazonaws.com/1234/invoices
        queueLength: "20"   # 1 pod per 20 visible messages
        awsRegion: ap-southeast-1
    - type: cron            # pre-warm before the nightly run
      metadata:
        timezone: Asia/Dhaka
        start: "50 22 * * *"
        end: "30 2 * * *"
        desiredReplicas: "10"
```

**Real-time example — the queue that never drained.** A nightly reconciliation job pushed ~120K messages to SQS at 23:00. CPU-based HPA saw idle workers (they were blocked on network I/O), kept 2 replicas, and the queue took 6 hours to drain — finishing after the morning reports ran. Switching the signal from CPU to **queue depth** let it burst to 45 workers and drain in 18 minutes. The metric was wrong, not the mechanism.

**Interview line:** *"Scale on the signal your users feel. For a web tier that's concurrency or latency; for a worker it's queue depth or consumer lag; CPU is a proxy that only works for CPU-bound work."*

---

### Q: How do you handle a traffic spike you knew about in advance (flash sale, ticket drop)?

**A:** Reactive autoscaling is the wrong tool for a known 20x spike. The playbook:

| Step | Action | Why |
|---|---|---|
| **T-7 days** | Load test at 2x expected peak with k6, against a prod-shaped environment | Find the real bottleneck (usually DB connections or a single slow query) |
| **T-1 day** | Raise `minReplicas`, pre-warm the ALB (or use a warm pool), bump RDS to a larger instance, raise connection-pool limits | Removes the boot-time chain from the critical path |
| **T-1 hour** | Freeze deploys. Verify caches are warm. Confirm all dashboards + on-call rotation | You do not want a deploy and a spike in the same 10-minute window |
| **T-0** | Queue/waiting-room for the hot path; shed non-essential traffic (recommendations, analytics writes) | Protect the checkout path — degrade everything else |
| **During** | Watch p99 + DB connections + error budget, not CPU | CPU is fine right until the pool is exhausted |
| **T+1 day** | Scale down deliberately; write down actual peak numbers | Next capacity plan uses measurements, not guesses |

**Load shedding beats collapsing.** When saturated, returning `503` with `Retry-After` for 10% of traffic keeps 90% healthy. Accepting all of it makes everyone's request time out, and the retries then double your load. This is the difference between degraded and down.

```javascript
// Express: shed load before the event loop is buried
const toobusy = require('toobusy-js');
toobusy.maxLag(120); // ms of event-loop lag we tolerate

app.use((req, res, next) => {
  // never shed the money path or health checks
  if (req.path.startsWith('/checkout') || req.path === '/healthz') return next();
  if (toobusy()) {
    res.set('Retry-After', '5');
    return res.status(503).json({ error: 'overloaded, retry shortly' });
  }
  next();
});
```

---

## Q2: Scaling the Stateful Layer (Database, Cache, Queue)

### Q: Your API pods scale to 40 and the database falls over. What happened and how do you fix it?

**A:** **Connection exhaustion.** This is the single most common self-inflicted scaling outage.

```
40 pods × 20 connections/pool = 800 connections
Postgres max_connections = 200
→ "FATAL: sorry, too many clients already"
```

Worse, Postgres allocates ~5–10MB per backend process, so even if you *raise* `max_connections` to 800 you burn 4–8GB of RAM on connection overhead and context switching destroys throughput.

**The fix is a connection pooler, not a bigger number.**

```
40 pods (20 conns each = 800)
        │
        ▼
   ┌─────────────┐   transaction pooling
   │  PgBouncer  │   800 client conns → 40 server conns
   └─────────────┘
        │
        ▼
   Postgres (max_connections = 200, comfortable)
```

```ini
# pgbouncer.ini
[databases]
appdb = host=prod-db.internal port=5432 dbname=appdb

[pgbouncer]
pool_mode = transaction        ; session mode wastes the whole benefit
max_client_conn = 2000         ; what the app tier may open
default_pool_size = 25         ; what actually reaches Postgres per db/user
reserve_pool_size = 5
server_idle_timeout = 600
```

**Transaction pooling caveats you must mention:** no session-level state — `SET`, `LISTEN/NOTIFY`, session-scoped temp tables, and prepared statements (unless the pooler supports protocol-level prepares) break. Advisory locks held across statements break too.

**Real-time example.** A Node service scaled from 6 → 30 pods on a Friday campaign. Postgres hit `max_connections` at 09:12, health checks (which query the DB) failed, Kubernetes killed the pods, they restarted, opened connections again — a **crash loop amplified by the orchestrator**. Two fixes shipped that day: PgBouncer in front of the DB, and a health check that stopped touching the database (liveness = process alive; readiness = dependencies, with a cached 5s result). Peak connections dropped from 800 to 38.

---

### Q: When do you add a read replica, and what breaks when you do?

**A:** Add one when **reads dominate** (typically >70% of query time) and the workload tolerates staleness.

```
              writes                    reads
   App ──────────────▶ Primary ──WAL──▶ Replica 1 ◀───── App (reports, lists)
                          │      stream
                          └──────────────▶ Replica 2 ◀─── analytics / BI
```

**What breaks: read-after-write.** User updates their profile, gets redirected, the read hits a replica 200ms behind, and they see the old value. They hit save again. Now you have a support ticket and a duplicate.

Mitigations, cheapest first:

1. **Route by intent** — anything in the same request/response cycle as a write goes to the primary.
2. **Sticky window** — after a user writes, pin that user to the primary for N seconds (store `lastWriteAt` in the session/Redis).
3. **LSN / GTID tracking** — capture the write position, and have the replica read wait until it has caught up (`pg_wal_lsn_diff`). Correct, but more plumbing.

```javascript
// Simple, effective: pin recent writers to the primary
const WRITE_STICKY_MS = 5000;

async function getClient(userId, { forWrite = false } = {}) {
  if (forWrite) {
    await redis.set(`w:${userId}`, Date.now(), 'PX', WRITE_STICKY_MS);
    return primary;
  }
  return (await redis.exists(`w:${userId}`)) ? primary : replica;
}
```

**Also monitor replication lag as a first-class SLI** — alert at >5s, page at >30s. A silently lagging replica serving stale data is worse than a replica that's down, because nothing errors.

---

### Q: How do you scale writes when a single primary isn't enough?

**A:** In order of cost and pain — do not jump to the bottom of this list:

| Option | Buys you | Cost |
|---|---|---|
| **Optimize** (indexes, batch writes, kill N+1, remove hot-row contention) | Often 5–10x | Days. Always do this first |
| **Vertical scale the primary** | 2–4x | Money + one failover window |
| **Offload** — move counters/sessions/logs to Redis, ClickHouse, S3 | Removes 40–70% of write volume in many apps | Weeks |
| **CQRS / async writes** — accept to a queue, apply in batches | Smooths spikes, adds eventual consistency | Weeks + consistency rethink |
| **Partition** (table partitioning by time/tenant) | Better vacuum, cheap archival, smaller indexes | Weeks |
| **Shard** (multiple primaries by shard key) | Near-linear | Months. Cross-shard joins/transactions become your problem forever |

**Real-time example — partitioning before sharding.** An events table hit 1.4B rows; writes were fine but `DELETE FROM events WHERE created_at < now() - interval '90 days'` ran for hours, held locks, and bloated the table. Converting to monthly partitions made retention `DROP TABLE events_2025_04` — instant, no bloat, and index sizes fell enough that p95 read latency dropped 60%. No sharding was needed. **Most "we need to shard" problems are retention and indexing problems.**

---

### Q: How do you scale a cache, and what goes wrong at scale?

**A:**

| Failure | Symptom | Fix |
|---|---|---|
| **Thundering herd / stampede** | One hot key expires; 5,000 requests hit the DB simultaneously | Lock-and-refresh (single flight): first miss takes a short lock and repopulates; others briefly serve stale |
| **Cache avalanche** | Thousands of keys expire in the same second (all written at deploy time) | Jitter TTLs: `ttl = base + random(0, base * 0.2)` |
| **Cache penetration** | Requests for non-existent keys always miss and hit the DB (often an attack) | Cache the negative result with a short TTL; bloom filter for high volume |
| **Hot key** | One key (a viral product) saturates a single Redis shard's CPU | Local in-process cache in front (2–5s TTL), or replicate the key as `key:0..9` |
| **Eviction storm** | `maxmemory` reached; useful keys evicted; hit rate collapses from 95% → 40%; DB load 10x | Alert on `evicted_keys` and hit-rate, not just memory |

```javascript
// Single-flight cache refresh — prevents the stampede
async function getWithLock(key, ttl, loader) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  const lockKey = `lock:${key}`;
  const gotLock = await redis.set(lockKey, '1', 'NX', 'PX', 5000);
  if (!gotLock) {
    await sleep(50);                       // someone else is loading it
    return getWithLock(key, ttl, loader);  // brief retry
  }
  try {
    const value = await loader();
    const jitter = Math.floor(Math.random() * ttl * 0.2);
    await redis.set(key, JSON.stringify(value), 'EX', ttl + jitter);
    return value;
  } finally {
    await redis.del(lockKey);
  }
}
```

**Real-time example — the 40% hit rate.** After a feature launch, API p95 tripled with no code change to the API. Redis memory was at `maxmemory` and `evicted_keys` was climbing 30K/min: a new feature had started caching large per-user payloads with a 24h TTL, pushing out the hot product catalog. Hit rate went 95% → 41% and every miss became a 300ms DB query. Fix: separate Redis logical DBs (or instances) per workload class so a low-value cache can never evict a high-value one, plus an alert on `hit_rate < 85% for 10m`.

---

## Q3: Backup Strategy

### Q: What is the 3-2-1 rule and what does it look like on AWS?

**A:** **3** copies of the data, on **2** different media/storage classes, with **1** off-site (different region/account).

```
Primary RDS (ap-southeast-1)
   ├── Automated snapshots + PITR  ....... copy 1  (same region, same account)
   ├── Nightly logical dump → S3 ......... copy 2  (different medium, Object Lock ON)
   └── Cross-region snapshot copy ........ copy 3  (ap-south-1, SEPARATE AWS ACCOUNT)
```

The modern addition is **3-2-1-1-0**: one copy **immutable/offline**, and **zero** errors on a verified restore test.

**Why a separate account matters:** if an attacker (or a bad script) has credentials in your primary account, snapshots in that account are deletable. A cross-account copy with a restrictive resource policy survives it. Same reason S3 **Object Lock in compliance mode** exists — even the root user cannot delete it before the retention period expires.

---

### Q: Full vs incremental vs differential vs continuous — and what does PITR actually do?

**A:**

| Type | What's stored | Restore | Trade-off |
|---|---|---|---|
| **Full** | Everything | Single file, fast | Slow to take, expensive to store |
| **Incremental** | Changes since the *last backup of any kind* | Full + every increment in order | Cheapest storage, longest restore, one broken link ruins the chain |
| **Differential** | Changes since the *last full* | Full + one differential | Middle ground |
| **Continuous / PITR** | Base backup + a stream of WAL/binlog | Restore base, replay logs to any second | Lowest RPO; needs log shipping and space |

**PITR in practice (Postgres):** a base backup plus archived WAL lets you restore to *any point* in the retention window. That is the only thing that saves you from a logical error — a bad `UPDATE` without a `WHERE`, or a migration that dropped a column. A snapshot from last night loses a day; PITR loses one second.

```bash
# RDS: restore to one second before the bad migration
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier prod-db \
  --target-db-instance-identifier prod-db-recovered \
  --restore-time 2026-08-11T09:14:59Z \
  --db-subnet-group-name prod-subnets

# Self-managed Postgres: base backup + WAL archive
pg_basebackup -h prod-db -D /backup/base -Ft -z -X stream -P
# postgresql.conf
#   archive_mode = on
#   archive_command = 'aws s3 cp %p s3://db-wal-archive/%f'
# recovery target in postgresql.auto.conf
#   restore_command = 'aws s3 cp s3://db-wal-archive/%f %p'
#   recovery_target_time = '2026-08-11 09:14:59+06'
```

**Important nuance:** never restore in place. Restore to a **new instance**, verify, then cut over. Restoring over the primary destroys your ability to try again.

---

### Q: Design a complete backup policy for a production system.

**A:** State it as a table — this is what a lead is expected to produce:

| Data | Method | Frequency | Retention | Off-site | RPO |
|---|---|---|---|---|---|
| Primary Postgres | RDS automated snapshot + PITR | Continuous | 35 days | Cross-region + cross-account copy, daily | ~5 min |
| Primary Postgres | `pg_dump` logical to S3 (Object Lock, 90d) | Nightly | 90 days (monthly kept 7 years) | Yes | 24h |
| Redis | RDB snapshot | 6h | 7 days | No — it's a cache | Acceptable to lose |
| S3 user uploads | Versioning + Cross-Region Replication | Continuous | Versions 90d, lifecycle to Glacier | Yes | ~15 min |
| Kafka | Tiered storage / MirrorMaker to DR region | Continuous | 7 days | Yes | Seconds |
| Secrets | Secrets Manager (replicated) + sealed backup in a break-glass vault | On change | Forever | Yes | 0 |
| Infra definition | Terraform in Git + remote state versioning | Every commit | Forever | Yes (Git remote) | 0 |
| **Prometheus metrics** | Usually **not** backed up | — | 15d local | Long-term to Thanos/Mimir if needed | — |

**Two things people forget every time:**

1. **The logical dump is not optional.** Snapshots are block-level: if a table is corrupted, the corruption is faithfully snapshotted. A `pg_dump` is a semantic copy and can be restored to a *different* major version or a different cloud. It's your escape hatch from both corruption and vendor lock-in.
2. **Back up the things that aren't the database** — secrets, DNS records, IAM policies, CI configuration, queue definitions, feature-flag state, and TLS certs. Interviewers notice when you mention these.

```bash
#!/usr/bin/env bash
# nightly-logical-backup.sh — with verification, not just upload
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
FILE="/tmp/appdb-${TS}.dump"

pg_dump -h "$PGHOST" -U "$PGUSER" -d appdb -Fc -Z6 -f "$FILE"

# 1. Verify the dump is readable BEFORE trusting it
pg_restore --list "$FILE" > /dev/null

# 2. Sanity-check size against yesterday (catches an empty/failed dump)
SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE")
LAST=$(aws s3api list-objects-v2 --bucket db-backups --prefix appdb- \
        --query 'sort_by(Contents,&LastModified)[-1].Size' --output text)
if [ "$LAST" != "None" ] && [ "$SIZE" -lt $((LAST / 2)) ]; then
  echo "FATAL: dump is less than half of yesterday's size" >&2; exit 1
fi

# 3. Upload with checksum + immutability
aws s3 cp "$FILE" "s3://db-backups/appdb-${TS}.dump" \
  --storage-class STANDARD_IA --checksum-algorithm SHA256

# 4. Emit a metric so a MISSING backup alerts (dead-man's switch)
curl -fsS --retry 3 "https://hc-ping.com/${HEALTHCHECK_UUID}"
rm -f "$FILE"
```

---

### Q: How do you know your backups actually work?

**A:** **You restore them on a schedule.** An untested backup is a belief, not a backup.

The monthly restore drill, automated in CI:

```yaml
# .github/workflows/restore-drill.yml
name: Monthly Restore Drill
on:
  schedule: [{ cron: '0 2 1 * *' }]   # 1st of the month, 02:00 UTC
  workflow_dispatch:

jobs:
  restore:
    runs-on: ubuntu-latest
    steps:
      - name: Restore latest dump into a throwaway Postgres
        run: |
          LATEST=$(aws s3api list-objects-v2 --bucket db-backups \
            --query 'sort_by(Contents,&LastModified)[-1].Key' --output text)
          aws s3 cp "s3://db-backups/$LATEST" ./restore.dump
          docker run -d --name drill -e POSTGRES_PASSWORD=x -p 5432:5432 postgres:16
          sleep 10
          time pg_restore -h localhost -U postgres -d postgres --no-owner ./restore.dump

      - name: Integrity assertions   # the part everyone skips
        run: |
          psql -h localhost -U postgres -c "SELECT count(*) FROM orders;"   | tee out
          psql -h localhost -U postgres -c \
            "SELECT max(created_at) FROM orders;" | tee -a out
          # Fail if newest row is older than 26h → backup is stale, not just present
          python3 scripts/assert_freshness.py out

      - name: Record restore duration as the real RTO
        run: echo "restore_seconds=$SECONDS" >> $GITHUB_STEP_SUMMARY
```

**What the drill teaches you that nothing else does:** your *actual* RTO. Teams claim "RTO 1 hour" and discover the restore of a 400GB database takes 3h20m, plus 40 minutes rebuilding indexes, plus DNS propagation. Measure it, publish it, and if the number is unacceptable, change the architecture (smaller shards, warm standby) rather than the promise.

**Also monitor for the backup that silently stopped.** Use a **dead-man's switch** (Healthchecks.io, Prometheus `absent()`): alert when a backup *hasn't* happened, not when it fails. Failures page you; silence is what kills you.

```yaml
- alert: BackupMissing
  expr: time() - max(backup_last_success_timestamp_seconds) > 93600  # 26h
  for: 10m
  labels: { severity: page }
  annotations:
    summary: "No successful DB backup in 26 hours"
    runbook: "https://wiki/runbooks/backup-missing"
```

---

## Q4: Disaster Recovery & Failover

### Q: Define RPO and RTO, and how do they drive architecture?

**A:**

```
        ← RPO →              disaster              ← RTO →
   ─────┬───────────────────────┬───────────────────────┬─────▶ time
    last good                 outage                  service
     backup                   starts                  restored

   RPO = how much DATA you can lose      (backup frequency)
   RTO = how long you can be DOWN        (recovery mechanism)
```

Both are **business decisions**, not engineering preferences. The right move in an interview is to ask "what does an hour of downtime cost?" and let the answer pick the tier:

| Tier | RPO | RTO | Mechanism | Rough cost |
|---|---|---|---|---|
| **Backup & restore** | 24h | 4–24h | Snapshots in another region; rebuild via Terraform | ~2% of prod |
| **Pilot light** | ~15 min | 1–4h | DB replicating to DR; app infra defined but scaled to zero | ~10% |
| **Warm standby** | ~1 min | 5–30 min | Scaled-down but running copy; scale up + DNS switch | ~30–50% |
| **Active-active** | ~0 | seconds | Both regions serving; traffic shifts automatically | 200%+ |

**The trap question:** "we need RPO 0 and RTO 0." Answer: that requires synchronous cross-region replication, which adds the inter-region round trip (~60–90ms Singapore↔Mumbai) to **every write** and means a DR-region network problem stalls the primary. You're trading availability for durability. Ask what the actual regulatory or revenue requirement is — usually it's "we cannot lose a confirmed payment," which is solvable with a synchronously-replicated ledger and async everything else.

---

### Q: Walk through a real region failover.

**A:** Structure the answer as **detect → decide → execute → verify → fail back**.

```
Route 53 health check (30s interval, 3 failures = unhealthy)
        │
        ▼  90s to detect
   Incident commander declares failover  ← human decision, documented criteria
        │
        ▼
1. Promote DR database replica to primary        (RDS: ~2 min, aurora global: ~1 min)
2. Scale DR app tier from 2 → 30 pods            (2–4 min)
3. Flip Route 53 weighted record 100% → DR        (TTL 60s, so ~60–120s propagation)
4. Point async workers at the DR queue endpoints
5. Verify: synthetic checkout transaction passes  ← the only real proof
6. Freeze writes to the old region to prevent split-brain
```

**Split-brain is the thing to name.** If the old primary comes back and accepts writes while DR is also accepting them, you now have two divergent databases and a manual merge in your future. Prevention: fencing — the promotion process must revoke the old primary's ability to accept writes (security-group lockdown, `pg_ctl promote` with the old node demoted, or an orchestrator with a quorum lease).

**Fail-back is harder than fail-over** and no one plans it. The DR region now has 6 hours of writes the primary doesn't. You must reverse-replicate DR → primary, verify, then switch during a low-traffic window. Budget for it in the runbook.

**Real-time example — the DR that failed the drill.** A quarterly game-day promoted the DR replica successfully in 3 minutes… and the app in DR still couldn't start. Its secrets were in Secrets Manager in the *primary* region only, and the region was (in the drill) unreachable. Nothing in the database plan was wrong; the dependency graph was. That's the value of a game day: **DR is only as good as your least-replicated dependency** — secrets, container registry, DNS, CI, the IdP you log into to run the failover.

**Checklist of dependencies people forget in DR:**
- Container images (is ECR replicated to the DR region?)
- Secrets and KMS keys (KMS keys are regional — a multi-region key or a replica is required)
- TLS certificates (ACM certs are regional; CloudFront needs `us-east-1`)
- The queue/topic definitions and their consumer offsets
- Third-party allowlists — your payment gateway may allowlist only your primary NAT IPs
- The runbook itself (don't store it only in a wiki hosted in the failed region)

---

### Q: How do you run a game day?

**A:**

1. **Announce it** (chaos engineering ≠ surprise outages; announce until the org is mature).
2. **Write the hypothesis first:** "If we kill the primary AZ, requests continue with p99 < 800ms and zero errors after 90s."
3. **Define the abort condition** and who can call it.
4. **Inject the failure** — start small: kill one pod, then one node, then one AZ, then the DB.
5. **Measure against the hypothesis**, don't just watch.
6. **Every gap becomes a ticket with an owner and a date.** A game day without follow-up tickets was theatre.

```bash
# Escalating blast radius — do these in order across quarters
kubectl delete pod -l app=orders --field-selector spec.nodeName=node-3   # pod
aws ec2 terminate-instances --instance-ids i-0abc                        # node
aws rds failover-db-cluster --db-cluster-identifier prod                 # DB failover
# Latency injection is more revealing than failure injection:
# most systems handle "down" and melt on "slow"
```

> **Interview line:** *"Failures are easy — retries and health checks handle them. It's **slow** that kills you: a dependency at 8s instead of 80ms exhausts your thread/connection pool and the failure propagates upward. That's why I inject latency, not just kill things."*

---

## Q5: Monitoring That Works in Production

### Q: What do you actually put on a dashboard?

**A:** Start with the **four golden signals** per service, then add saturation of every finite resource.

| Signal | Metric | Alert shape |
|---|---|---|
| **Latency** | p50 / p95 / p99 — *split by success vs error* | p99 > SLO for 10m |
| **Traffic** | rps, or jobs/sec | Sudden drop is as alarming as a spike |
| **Errors** | 5xx rate, plus "successful" responses with wrong content | Error ratio > 1% for 5m |
| **Saturation** | The most constrained resource: connection pool, queue depth, event-loop lag, disk, memory | > 80% for 15m |

**Averages lie.** A 200ms average can be 90% of requests at 50ms and 10% at 1.5s. Always percentiles. And when you aggregate percentiles across instances, use histograms (`histogram_quantile` over a `_bucket` metric) — averaging p99s from 10 pods produces a number that means nothing.

```promql
# p99 latency by route, from a histogram — correct way
histogram_quantile(0.99,
  sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))
)

# Error ratio — the SLI you actually alert on
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# Node.js saturation signals that predict outages
nodejs_eventloop_lag_p99_seconds > 0.1
pg_pool_waiting_count > 0                 # requests queuing for a connection
```

**The dashboard hierarchy that works on-call:**

```
1. Service Health (one screen)  — SLO burn rate, error ratio, p99, traffic. 4 panels.
2. Dependencies                 — DB, cache, queue, each 3rd-party API's latency + error rate
3. Resources                    — CPU/mem/disk/connections/queue depth per component
4. Business                     — orders/min, payment success %, signups
```

Panel 4 is the one that catches what the others miss. **Real-time example:** every infrastructure metric was green — 200 OK, p99 at 140ms, no errors — but orders/min had fallen from 90 to 4. A third-party payment SDK was returning `200` with a body containing a validation failure. Nothing in the technical stack was "wrong". The business metric was the only signal. Since then, **every service ships one business metric**, and "orders/min drops >60% vs the same time last week" is a paging alert.

---

### Q: Logs, metrics, traces — what goes where, and how do you control the cost?

**A:**

| | Use for | Cardinality | Cost driver | Retention |
|---|---|---|---|---|
| **Metrics** | "Is it healthy? Trending?" | Low — never put user_id/order_id in a label | Number of series | 13–15 months (downsampled) |
| **Logs** | "What exactly happened in this request?" | Unbounded | Volume (GB ingested) | 7–30 days hot, then S3/Glacier |
| **Traces** | "Where did the 3 seconds go across 8 services?" | Per-request | Spans ingested | 3–7 days (sample) |

**Cardinality explosion is the #1 monitoring outage.** One label like `user_id` on a metric with 500K users creates 500K time series per metric name; Prometheus memory goes from 4GB to 40GB and the monitoring system dies during the incident it was supposed to help with.

```javascript
// WRONG — every unique value creates a permanent time series
httpDuration.labels(req.path, userId, orderId).observe(ms);   // /orders/98213 is unique too!

// RIGHT — bounded labels; identifiers belong in logs/traces
httpDuration.labels(req.route.path, req.method, String(res.statusCode)).observe(ms);
logger.info({ userId, orderId, route: req.route.path, ms }, 'request completed');
```

**Cost control, in order of impact:**

1. **Sample traces intelligently** — 1% of successes, **100% of errors and slow requests** (tail-based sampling). You need the bad ones, not the average ones.
2. **Drop the noise at the collector, not the bill** — health-check logs, `/metrics` scrapes, and debug logs from prod are typically 40%+ of volume.
3. **Tier your log storage** — 7 days hot/searchable, then compressed to S3 with Athena over it for the rare audit query.
4. **Kill unused metrics and dashboards** — audit which series are queried; most teams pay for thousands that nothing reads.

**Real-time example.** An observability bill went from $2.4K → $11K/month in one quarter. Breakdown: 58% of ingested log volume was ALB + Kubernetes health-check lines at 1/sec/pod across 120 pods, and a `debug` logger left on after an investigation. Dropping health checks at the OTel collector and enforcing `LOG_LEVEL=info` in prod via admission policy brought it to $3.1K with zero loss of diagnostic ability.

```yaml
# OpenTelemetry Collector — drop the noise before it costs money
processors:
  filter/healthchecks:
    logs:
      exclude:
        match_type: regexp
        record_attributes:
          - key: http.target
            value: '^/(healthz|readyz|metrics)$'
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: keep-all-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: keep-slow
        type: latency
        latency: { threshold_ms: 1000 }
      - name: sample-the-rest
        type: probabilistic
        probabilistic: { sampling_percentage: 1 }
```

---

### Q: How do you debug a latency problem across microservices?

**A:** **Distributed tracing with propagated context** — otherwise you're correlating timestamps by hand across 8 log streams.

```
POST /checkout                                        2,340ms  ← trace root
├── auth-service.verify                                  12ms
├── inventory.reserve                                    45ms
├── pricing.calculate                                 1,890ms  ← THE PROBLEM
│   ├── db.query "SELECT * FROM discounts"              8ms
│   ├── db.query "SELECT * FROM discounts"              8ms
│   └── ... 210 more identical queries                          ← N+1, in a loop
└── payment.charge                                      380ms
```

The trace makes an N+1 obvious in seconds; logs make it a two-hour investigation. Requirements:

- **W3C `traceparent` propagated** through every hop, including queues (put it in message headers, or async work is an orphan trace).
- **Trace ID in every log line** — then "show me the logs for this trace" is one query.
- **Span attributes that matter**: `db.statement` (normalized), `http.route`, tenant, and cache hit/miss.

**Real-time example.** Checkout p99 was 2.3s but every individual service reported p99 under 200ms — because each service measured only its own handler, and the 1.4s was spent in a retry loop against a dependency that was returning fast 500s. Each retry was "fast", so no service's dashboard was red. The trace showed 4 sequential retries with exponential backoff totalling 1.4s. Fix: retry budget capped at 2, and the retry duration was added to the parent span, making it visible on the dashboard.

---

## Q6: Alerting, On-Call & Incident Operations

### Q: What makes an alert good?

**A:** **An alert must be actionable, urgent, and about symptoms.** If the responder's action is "acknowledge and go back to sleep," the alert is a bug.

| Bad alert | Why | Good alert |
|---|---|---|
| `CPU > 80%` | Not a symptom. A healthy batch job is at 95% | `p99 latency > 1s for 10m` (users feel this) |
| `Pod restarted` | Kubernetes restarting a pod is normal | `Pod restart rate > 3 in 15m` (crash loop) |
| `Disk 75% full` | Fires for weeks with no action | `Disk will be full in < 4h` (predict_linear) |
| `Error in logs` | Noise | `Error ratio > 1% of requests for 5m` |

```promql
# Predict, don't observe — pages only when action is genuinely needed
- alert: DiskWillFillSoon
  expr: predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 4*3600) < 0
  for: 30m
  labels: { severity: page }

# Multi-window burn rate — the Google SRE standard for SLO alerting
# Pages on a fast burn, tickets on a slow one. 99.9% SLO → 0.1% error budget.
- alert: ErrorBudgetBurningFast
  expr: |
    (sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > 14.4 * 0.001
    and
    (sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))) > 14.4 * 0.001
  for: 2m
  labels: { severity: page }     # 14.4x burn = budget gone in 2 days
```

**Severity levels must map to human behaviour:**

| Level | Meaning | Response |
|---|---|---|
| **P1 / page** | Users are broadly affected, revenue is stopping | Wake someone, now, 24/7 |
| **P2 / page (business hours)** | Degraded, or will become P1 in hours | Respond within 30 min during the day |
| **P3 / ticket** | Needs attention this week | Jira ticket, no notification |
| **Info** | Dashboard only | Never notifies anyone |

**Real-time example — alert fatigue is a real outage cause.** A team's on-call received ~70 alerts/week; ~4 were actionable. A genuine database-connection-saturation alert at 02:40 was acknowledged and dismissed reflexively along with the noise, and the outage ran 50 minutes longer than it needed to. The fix was an **alert review ritual**: every week, each alert that fired is classified *actionable / not actionable*, and anything not actionable twice in a row is deleted or demoted to a ticket. Alert volume dropped to ~6/week within two months and MTTA improved from 14 min to 3 min. **Deleting alerts is real reliability work.**

---

### Q: How do you run an incident?

**A:** Named roles, one channel, a timeline, and communication on a fixed cadence.

| Role | Does | Does NOT |
|---|---|---|
| **Incident Commander** | Coordinates, decides, delegates, keeps the timeline | Debug. The IC's hands stay off the keyboard |
| **Ops/Investigation lead** | Actually debugs and executes changes | Talk to stakeholders |
| **Comms lead** | Updates status page + internal stakeholders every 30 min | Debug |
| **Scribe** | Timestamps every action and finding in the channel | — |

The response order that matters: **mitigate first, diagnose second.** Roll back, fail over, disable the feature flag, shed load. Understanding the root cause while users are down is an expensive luxury.

```
1. Detect      → alert or a customer report
2. Declare     → open the channel, name an IC. Declaring early is free; declaring late is costly
3. Mitigate    → rollback / flag off / failover / scale out. Restore service.
4. Diagnose    → now, with the pressure off
5. Resolve     → permanent fix
6. Postmortem  → blameless, within 48h while memory is fresh, with owned action items
```

**The first four questions the IC should ask:**
1. "What changed?" — deploys, flags, config, third-party, traffic. ~70% of incidents follow a change.
2. "What's the blast radius?" — all users or one tenant? All regions? Which endpoints?
3. "Is there a rollback?" — if yes, do it now and diagnose after.
4. "Who else needs to know?" — support, the affected customer, leadership.

**Real-time example — the mitigation-first discipline.** An outage at 21:10 was traced (eventually) to a subtle cache-key change in a release from 20:45. The team spent 35 minutes reading code before someone asked "can we just roll back?" They rolled back and service recovered in 4 minutes. The postmortem action item wasn't about the cache key — it was **"any incident with a deploy in the preceding 60 minutes: roll back first, investigate second,"** written into the runbook. MTTR for the following quarter halved.

---

### Q: What belongs in a runbook?

**A:** Runbooks are written for someone half-awake who did not build the system.

```markdown
# Runbook: Database Connection Pool Exhausted

**Alert:** `pg_pool_waiting_count > 0 for 5m`   **Severity:** P1
**Impact:** Requests queue then time out; checkout fails. Revenue-affecting.

## Verify (60 seconds)
1. Grafana → "Postgres / Connections" → is `active + waiting` near max_connections?
2. `kubectl get hpa orders-api` — did replicas just jump?

## Mitigate (pick the first that applies)
- **Replica count spiked** → `kubectl scale deploy/orders-api --replicas=12` (cap the fan-out)
- **A long-running query is holding connections** →
  ```sql
  SELECT pid, now()-query_start AS dur, left(query,80) FROM pg_stat_activity
   WHERE state='active' AND now()-query_start > interval '30s' ORDER BY dur DESC;
  SELECT pg_terminate_backend(<pid>);   -- verify it is not a migration first!
  ```
- **Connection leak in the app** → rolling restart: `kubectl rollout restart deploy/orders-api`

## Escalate
- 15 min without recovery → page the DBA on-call (@dba-oncall)
- Data corruption suspected → do NOT restart. Page the IC and preserve state.

## Related
- Dashboard: <link>   Postmortem of the 2026-03-11 occurrence: <link>
```

Rules: **one alert → one runbook**, linked from the alert annotation; every command is copy-pasteable; every destructive command carries a warning; and the runbook is updated *during* the incident that proved it wrong.

---

## Q7: Capacity Planning & Cost Control

### Q: How do you plan capacity for the next 12 months?

**A:** Measure a unit, project the unit, add headroom, verify with a load test.

```
1. Establish the unit cost:
   "1,000 orders/day consumes 2 vCPU-hours, 14GB DB storage, 40GB egress"

2. Get the growth number from the business, not from engineering:
   "Orders grow 12% MoM" → 12 months = 1.12^12 ≈ 3.9x

3. Project each resource separately — they don't scale together:
   CPU:      linear with traffic          → 3.9x
   DB size:  cumulative, never shrinks    → today + 12 months of inserts
   Memory:   often step-function (cache working set)
   Egress:   linear, and often the biggest surprise on the bill

4. Add headroom:
   Target steady-state utilization ≤ 50–60% so a 2x spike or an AZ loss is survivable.

5. Identify the first CEILING you'll hit, not just the average:
   "At 2.6x we exhaust the RDS instance's IOPS, at 3.1x the NAT gateway,
    at 4x the single-writer Postgres." → schedule the fix BEFORE the date.
```

**The output of capacity planning is a date, not a number:** *"On current growth we hit the RDS IOPS ceiling around March 2027; the sharding project must start by December 2026."* That sentence is what makes it a lead-level answer.

**Little's Law is the quick estimate** to do out loud in an interview:

```
Concurrency = Arrival rate × Average latency
e.g. 2,000 rps × 0.15s = 300 concurrent requests in flight
     → at 50 concurrent/pod → 6 pods minimum, 12 with 50% headroom
```

---

### Q: Where does cloud spend actually go, and how do you cut it without hurting reliability?

**A:** The typical breakdown for a mid-size product, and the lever for each:

| Line item | Typical share | Biggest lever |
|---|---|---|
| Compute (EC2/ECS/EKS) | 40–55% | Rightsizing + Savings Plans + Spot for stateless/batch |
| Database (RDS/Aurora) | 15–25% | Rightsize, reserved instances, kill idle non-prod, gp3 over io1 |
| Data transfer | 5–20% | **Cross-AZ chatter** and NAT Gateway — the invisible killer |
| Storage (S3/EBS) | 5–15% | Lifecycle policies, delete unattached EBS volumes and old snapshots |
| Observability | 3–10% | Sampling + log filtering (see Q5) |

**The order of operations that actually works:**

1. **Delete** — unattached EBS volumes, old snapshots, idle load balancers, dev environments running at 3 AM. Free, zero risk, usually 10–20%.
2. **Schedule** — non-prod off outside 08:00–20:00 weekdays = ~65% off those environments.
3. **Rightsize** — use real p95 utilization over 30 days, not the instance type someone picked in 2023.
4. **Commit** — Savings Plans / Reserved Instances only *after* rightsizing (committing to the wrong size locks in waste for 1–3 years).
5. **Re-architect** — Spot for batch, Graviton (~20% better price/perf for most Node.js workloads), serverless for spiky low-duty-cycle work.

**Real-time example — the NAT gateway bill.** A $3,100/month line item labelled "EC2-Other" turned out to be a NAT Gateway processing 60TB/month at $0.045/GB. The cause: pods in private subnets pulling container images and calling S3 *through the NAT*. Two changes — an **S3 VPC Gateway Endpoint** (free) and an **ECR Interface Endpoint** — cut it to ~$260/month. Second finding in the same audit: services were spread across 3 AZs and chatting freely, paying $0.01/GB *each way* for cross-AZ traffic; enabling topology-aware routing so pods prefer same-AZ endpoints saved another ~$800/month.

**Guardrails, so cost work doesn't become a reliability incident:**
- Never cut redundancy to save money without an explicit, written risk acceptance.
- Tag everything (`team`, `env`, `service`) and show each team its own bill — visibility changes behaviour faster than mandates.
- Budget alerts at 80% of forecast, and an anomaly detector for a >30% day-over-day jump (that's usually a runaway loop or a leaked credential mining crypto).

---

## Q8: Safe Deploys, Migrations & Rollbacks

### Q: How do you run a schema migration with zero downtime?

**A:** The **expand–migrate–contract** pattern. Never change a column in one step — code and schema must be compatible in *both* directions during the rollout.

```
Goal: rename `users.name` → `users.full_name`

Deploy 1 (EXPAND)   Add nullable full_name. Code writes BOTH, reads name.
                    → Old code still works. Safe to roll back.
Backfill            UPDATE in batches of 5,000 with a sleep. Never one big UPDATE.
Deploy 2 (SWITCH)   Code reads full_name, still writes both.
                    → Verify for a few days.
Deploy 3 (CONTRACT) Code stops writing name. Then, later, DROP COLUMN name.
```

```sql
-- Backfill in batches so you never hold a long lock or blow up replication lag
DO $$
DECLARE rows int;
BEGIN
  LOOP
    UPDATE users SET full_name = name
     WHERE id IN (SELECT id FROM users WHERE full_name IS NULL LIMIT 5000);
    GET DIAGNOSTICS rows = ROW_COUNT;
    EXIT WHEN rows = 0;
    COMMIT;
    PERFORM pg_sleep(0.2);   -- let replicas catch up
  END LOOP;
END $$;
```

**The locks that cause outages** (Postgres):

| Operation | Safe? | Do this instead |
|---|---|---|
| `ADD COLUMN` (nullable, no default) | Safe, instant | — |
| `ADD COLUMN ... NOT NULL DEFAULT x` | Safe in PG 11+, rewrites the table before that | Add nullable → backfill → set NOT NULL |
| `CREATE INDEX` | **Blocks writes** for the whole build | `CREATE INDEX CONCURRENTLY` |
| `ALTER COLUMN TYPE` | Rewrites + `ACCESS EXCLUSIVE` lock | New column + backfill + swap |
| `ADD FOREIGN KEY` | Locks both tables while validating | `ADD ... NOT VALID` then `VALIDATE CONSTRAINT` |
| Any DDL behind a slow query | Waits for a lock, and **queues every query behind it** | `SET lock_timeout = '3s'` before DDL, retry |

**Always set a lock timeout on migrations.** Without it, a DDL statement waiting on a lock silently blocks every subsequent query on that table — a full outage caused by a migration that "was just adding an index."

```sql
SET lock_timeout = '3s';
SET statement_timeout = '30s';
ALTER TABLE orders ADD COLUMN coupon_code text;  -- fails fast instead of blocking prod
```

---

### Q: What's your rollback strategy, and when can't you roll back?

**A:**

| Change type | Rollback | Time |
|---|---|---|
| Stateless app code | Redeploy previous image tag / `kubectl rollout undo` | 1–3 min |
| Feature behind a flag | Flip the flag off | Seconds |
| Config change | Revert the config, reload | Seconds–minutes |
| Additive schema change | No rollback needed — old code is compatible | — |
| **Destructive schema change** (`DROP`, type change) | **Cannot roll back** — restore from PITR | Hours |
| Data written in a new format | Rolling back the code orphans the data | Needs a migration back |

**The rule that follows:** *every deploy must be rollback-able, which means every schema change must be additive.* Destructive changes happen in their own deploy, days later, when you're certain.

```bash
kubectl rollout undo deploy/orders-api             # previous revision
kubectl rollout undo deploy/orders-api --to-revision=3
kubectl rollout status deploy/orders-api --timeout=120s
kubectl rollout history deploy/orders-api
```

**Automate the rollback decision** rather than relying on a human watching a graph:

```yaml
# Argo Rollouts — canary that aborts itself on a bad analysis
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 5m }
        - analysis:                        # promotes or ABORTS automatically
            templates: [{ templateName: success-rate }]
        - setWeight: 25
        - pause: { duration: 10m }
        - setWeight: 50
        - pause: { duration: 10m }
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata: { name: success-rate }
spec:
  metrics:
    - name: success-rate
      interval: 1m
      successCondition: result[0] >= 0.99
      failureLimit: 2                       # 2 bad samples → abort → auto-rollback
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{app="orders",status!~"5..",version="canary"}[2m]))
            / sum(rate(http_requests_total{app="orders",version="canary"}[2m]))
```

**Real-time example — the rollback that made it worse.** A release added a column and started writing JSON into it. Two hours later an unrelated bug forced a rollback; the old code choked on rows containing the new field, and the rollback caused a *second, larger* outage. The permanent fix was a rule enforced in code review: **new fields are written only after the reading code has been deployed and is tolerant of both shapes** (forward-compatible deserialization — ignore unknown fields, never fail on them).

---

## Q9: Operational Hygiene (Secrets, Certs, Logs, Patching)

### Q: How do you rotate secrets and certificates without an outage?

**A:** The rule for both: **overlap validity**. There must be a window where old and new are simultaneously valid.

```
Secrets (DB password):
  1. Create the NEW credential alongside the old (both valid)
  2. Roll the app to pick up the new one (rolling restart / hot reload)
  3. Verify zero auth errors for 24h
  4. THEN revoke the old
  → AWS Secrets Manager rotation does exactly this with its AWSCURRENT/AWSPREVIOUS staging labels
```

**Certificates:** automate or you *will* be paged at 03:00 on a holiday. cert-manager or ACM renews at ~2/3 of lifetime. Regardless, **monitor expiry independently of the renewal system** — the failure mode is "renewal silently broken for 60 days."

```promql
- alert: CertificateExpiringSoon
  expr: probe_ssl_earliest_cert_expiry - time() < 21 * 24 * 3600
  for: 1h
  labels: { severity: ticket }
- alert: CertificateExpiringCritical
  expr: probe_ssl_earliest_cert_expiry - time() < 7 * 24 * 3600
  labels: { severity: page }
```

**Real-time example.** An internal mTLS CA issued 1-year certs manually. The renewal owner had left the company; the calendar reminder went to their disabled account. Services began failing handshakes at 00:00 UTC on the expiry date — an outage with no deploy, no traffic change, and no obvious cause, which took 40 minutes to identify. The fix wasn't "set a better reminder": it was cert-manager with 90-day certs (short lifetimes force automation to be real) plus a blackbox-exporter probe alerting on *observed* expiry, independent of the issuing system.

---

### Q: How do you handle log retention and compliance?

**A:**

| Log class | Hot (searchable) | Warm | Cold / archive | Driver |
|---|---|---|---|---|
| Application logs | 7–14 days | 30 days (S3 + Athena) | Delete | Debugging |
| Access logs | 30 days | 90 days | 1 year Glacier | Security forensics |
| **Audit logs** (who did what to which record) | 90 days | 1 year | **7 years, immutable** | Legal/regulatory |
| Debug logs | Off in prod | — | — | — |

**Audit logs are a different product from application logs** — append-only, tamper-evident (S3 Object Lock), separate account, and containing actor, action, target, before/after, timestamp, source IP, request ID. Never store them only in the same system a compromised admin can delete from.

**Never log:** passwords, tokens, full card numbers, full national ID numbers, OTPs, session cookies, or full request bodies of auth endpoints. Enforce it with a redaction layer, not with discipline:

```javascript
const pino = require('pino');
const logger = pino({
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie',
      '*.password', '*.token', '*.otp', '*.cardNumber', '*.nid',
      'req.body.password', 'res.body.accessToken',
    ],
    censor: '[REDACTED]',
  },
});
```

> **BD/compliance context:** for local fintech or health data, expect a data-residency question. Know the answer shape: *"PII stays in-region (ap-southeast-1), the DR copy stays in an approved region, audit logs are retained 7 years with Object Lock, and access to production data requires a break-glass approval that itself generates an audit event."*

---

### Q: How do you keep hosts and images patched without a monthly panic?

**A:** Make patching a routine, boring, automated event:

1. **Immutable infrastructure** — never patch a running server. Build a new image, roll it out, terminate the old. `kubectl rollout restart` weekly on a schedule proves your service tolerates restarts.
2. **Base image on a schedule** — rebuild and redeploy every service weekly from a freshly-pulled base, even with no code change. This closes 90% of CVEs silently.
3. **Scan at build and at rest** — Trivy in CI (fail on `HIGH`/`CRITICAL` with a fixed version available) and a registry scan for images already deployed, because a CVE published after your build won't be caught by CI.
4. **Track a patch SLA** — critical CVEs in internet-facing services: 7 days; everything else: 30 days. A number makes it schedulable.

```yaml
- name: Scan image
  run: |
    trivy image --exit-code 1 --severity HIGH,CRITICAL \
      --ignore-unfixed "$IMAGE"    # don't block on CVEs with no fix available
```

---

## Q10: Rapid-Fire Scenario Drills

Practise answering each in ~2 minutes, out loud, with a number in it.

**1. "The site is slow. Go."**
Check the four golden signals first: is it *all* endpoints or one? All users or one tenant? Started when — does it align with a deploy, a flag, or a traffic change? Then walk the stack top-down using traces: LB → app (event-loop lag, GC) → cache (hit rate) → DB (slow queries, locks, connections) → third parties. Mitigate before you diagnose.

**2. "Disk on the database is 92% full and climbing."**
Immediate: find the consumer — `SELECT pg_size_pretty(pg_total_relation_size(...))` per table, check WAL accumulation (a stuck replication slot is a classic — it pins WAL forever), and check for a runaway log or a failed `VACUUM`. Mitigate: drop old partitions, archive, or grow the volume (gp3 grows online). Permanent: partitioning + retention + a `predict_linear` alert at 4h-to-full.

**3. "We lost an entire availability zone."**
If we're multi-AZ with `topologySpreadConstraints` and a Multi-AZ RDS: pods reschedule, RDS fails over in ~60–120s, service degrades briefly. What to verify: did we have capacity in the *remaining* AZs (if the fleet was sized exactly for 3 AZs, losing one at peak means we're 33% short — this is why headroom exists), and are there any single-AZ resources (a lone NAT, an EBS-bound StatefulSet) that didn't move?

**4. "Someone dropped a production table 20 minutes ago."**
Stop writes to prevent further divergence. Restore via PITR to a **new** instance at `T-1s`, extract just that table, and reconcile the 20 minutes of writes that happened after. Do not restore over the primary. Postmortem action: production DDL requires a reviewed migration through CI; humans get read-only credentials by default with break-glass elevation.

**5. "Our monitoring system went down during the incident."**
That's why you need an independent, external check — a synthetic monitor from outside your cloud (a different provider entirely) and a status-page path that doesn't depend on your own infrastructure. Also: never host alerting for a region *only* inside that region.

**6. "The queue has 2 million messages and is growing."**
Determine whether it's a producer spike or a consumer failure (consumer lag rate tells you). If consumers are erroring: is it a poison message blocking a partition? Check the DLQ. Mitigate: scale consumers on lag (KEDA), raise batch size, and if the work is idempotent, consider replaying from an offset after the fix rather than processing the backlog under pressure. Permanent: DLQ with alerting, lag-based autoscaling, and a per-message max-retry.

**7. "A dependency we call is now taking 8 seconds instead of 80ms."**
Slow is worse than down. Apply a timeout shorter than *your* SLO (e.g. 800ms), a circuit breaker that opens after N failures and serves a fallback, and a bulkhead so that dependency can only consume a fixed slice of your connection/thread pool. Without these, one slow dependency exhausts your pool and takes down endpoints that don't even use it.

**8. "Costs jumped 40% this month and nobody knows why."**
Cost Explorer grouped by service, then by usage type, then by tag, comparing week over week. The usual suspects: a new NAT/egress pattern, a forgotten load test environment, log volume, a runaway retry loop, cross-AZ traffic, or unattached storage. Then: tag enforcement, per-team budgets, and an anomaly alert so this is caught in a day, not a month.

---

## Quick Reference

### Commands

```bash
# ---- Kubernetes triage ----
kubectl top pods --sort-by=memory                 # who's eating RAM
kubectl get events --sort-by=.lastTimestamp | tail -30
kubectl describe pod <p> | sed -n '/Events/,$p'   # why is it Pending / CrashLooping
kubectl logs <p> --previous                       # logs from the crashed container
kubectl get hpa -A                                # current vs desired replicas
kubectl rollout undo deploy/<name>                # fastest mitigation there is

# ---- Postgres triage ----
SELECT count(*), state FROM pg_stat_activity GROUP BY state;          -- connections
SELECT pid, now()-query_start AS dur, left(query,60) FROM pg_stat_activity
  WHERE state='active' ORDER BY dur DESC LIMIT 10;                    -- slow queries
SELECT * FROM pg_stat_replication;                                    -- replica lag
SELECT slot_name, active, pg_size_pretty(
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) FROM pg_replication_slots; -- WAL pinned

# ---- Redis triage ----
redis-cli INFO stats | grep -E 'keyspace_hits|keyspace_misses|evicted_keys'
redis-cli --bigkeys
redis-cli INFO replication

# ---- AWS ----
aws rds describe-db-snapshots --db-instance-identifier prod-db --max-items 5
aws rds restore-db-instance-to-point-in-time --restore-time <ISO8601> ...
aws ce get-cost-and-usage --time-period Start=2026-07-01,End=2026-08-01 \
  --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE
```

### Numbers worth memorising

| Thing | Value |
|---|---|
| 99.9% availability | 43m 12s downtime/month |
| 99.95% | 21m 36s/month |
| 99.99% | 4m 19s/month |
| Cross-AZ data transfer | ~$0.01/GB each direction |
| NAT Gateway processing | ~$0.045/GB (+ hourly) |
| Postgres backend memory | ~5–10MB per connection |
| Typical p99 target, internal API | < 200ms |
| Human tolerance | 100ms instant, 1s flow unbroken, 10s attention lost |

### The one-line answers

- **Scaling:** scale on the signal users feel; fast up, slow down; the app tier scales out, the database is the ceiling.
- **Backup:** 3-2-1, cross-account and immutable, and **untested = nonexistent**.
- **DR:** RPO/RTO are business decisions; failover is easy, fail-back and split-brain are hard; the least-replicated dependency defines your real RTO.
- **Monitoring:** symptoms not causes, percentiles not averages, bounded label cardinality, and one business metric per service.
- **Alerting:** if it isn't actionable, delete it. Deleting alerts is reliability work.
- **Deploys:** every change must be rollback-able, therefore every schema change is additive.
- **Cost:** delete, schedule, rightsize, commit, re-architect — in that order.

---

**Related:** [Observability & Reliability](05-observability-reliability.md) · [CI/CD & DevOps](08-cicd-devops.md) · [Kubernetes Basics](04-kubernetes-basics.md) · [Performance Engineering](07-performance-engineering.md) · [Reliability, Security & Cost (Phase 5)](../phase-5-system-design/05-reliability-security-cost.md)
