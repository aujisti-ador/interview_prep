# MCQ Bank — DevOps, Cloud, Linux & Git

> **Format:** TestGorilla ("Docker", "Kubernetes", "AWS", "Git", "Linux"), iMocha, HackerRank MCQ section, Mettl, and the rapid-fire technical-verification portion of Karat/Turing interviews.
> **Budget:** 45 seconds each. **Deep dives:** [Docker](../phase-4-cloud-infrastructure/03-docker-fundamentals.md) · [Kubernetes](../phase-4-cloud-infrastructure/04-kubernetes-basics.md) · [AWS Serverless](../phase-4-cloud-infrastructure/02-aws-serverless-deep-dive.md) · [NGINX](../phase-4-cloud-infrastructure/01-nginx-deep-dive.md) · [CI/CD](../phase-4-cloud-infrastructure/08-cicd-devops.md) · [Observability](../phase-4-cloud-infrastructure/05-observability-reliability.md)

## Sections
1. [Docker](#1-docker) (D1–D14)
2. [Kubernetes](#2-kubernetes) (K1–K14)
3. [Linux & Shell](#3-linux--shell) (L1–L12)
4. [Git](#4-git) (G1–G12)
5. [CI/CD](#5-cicd) (C1–C8)
6. [AWS](#6-aws) (A1–A12)
7. [Networking, NGINX & TLS](#7-networking-nginx--tls) (N1–N10)
8. [Observability](#8-observability) (O1–O8)
9. [Answer-Speed Drill](#answer-speed-drill)

---

## In 60 seconds — how to use this bank

1. **This is the bank most backend candidates neglect, which is exactly why it is worth
   drilling.** Infrastructure questions are finite and factual — unlike design questions, there
   is a right answer to memorise.
2. **Docker questions cluster on three things:** layer caching (why `COPY package.json` comes
   first), multi-stage builds, and the difference between `CMD` and `ENTRYPOINT`.
3. **Kubernetes questions are mostly probes and resources.** Liveness restarts you; readiness
   removes you from traffic. Requests are guaranteed; limits kill you (`OOMKilled`).
4. **Git questions are almost always about recovery:** `revert` vs `reset`, what `rebase` does
   to history, and how to recover a commit with `reflog`.
5. **AWS questions favour a few comparisons:** Security Group (stateful, instance-level) vs NACL
   (stateless, subnet-level); SQS vs SNS; and how Lambda is billed.
6. **Linux triage questions are practical:** which command shows what is using a port, what
   `df` vs `du` tell you, and how to find the process eating memory.

**Answer every question.** No negative marking means an educated guess is always better than a
blank — and on this bank, elimination usually narrows four options to two.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Layer** | One cached step of a Docker image |
| **Multi-stage build** | Build in one stage, copy only the output into a small final image |
| **`CMD` vs `ENTRYPOINT`** | Default arguments · the command that always runs |
| **Exit code** | Why a container stopped. `137` = killed (usually OOM), `0` = clean |
| **Liveness probe** | Fails → the container is **restarted** |
| **Readiness probe** | Fails → the Pod is **removed from the Service** |
| **Request / Limit** | Guaranteed resources · the hard ceiling |
| **`OOMKilled`** | Killed for exceeding its memory limit |
| **QoS class** | Guaranteed / Burstable / BestEffort — decides who gets evicted first |
| **`git revert`** | A new commit undoing an old one. Safe on shared branches |
| **`git reset`** | Moves the branch pointer. Rewrites history — dangerous if pushed |
| **`git rebase`** | Replays your commits on top of another branch. Cleaner history, rewritten hashes |
| **`git reflog`** | The log of where HEAD has been. How you recover "lost" commits |
| **Security Group** | Stateful firewall on an instance. Return traffic is automatic |
| **NACL** | Stateless firewall on a subnet. You must allow return traffic explicitly |
| **SQS vs SNS** | A queue one consumer reads · a broadcast to many subscribers |
| **DORA metrics** | Deploy frequency, lead time, change failure rate, time to restore |
| **TLS handshake** | The negotiation establishing an encrypted connection |
| **mTLS** | Both sides present certificates |
| **`df` vs `du`** | Disk free by filesystem · disk used by directory |

---

## 1. Docker

**D1.** Difference between an image and a container?
<details><summary>Answer</summary>An **image** is an immutable, layered, read-only template. A **container** is a running (or stopped) instance of an image with a thin writable layer on top. Many containers, one image.</details>

---

**D2.** Which Dockerfile instructions create a new layer?
A) All of them  B) `RUN`, `COPY`, `ADD`  C) Only `RUN`  D) None

<details><summary>Answer</summary>**B.** `RUN`, `COPY`, and `ADD` create filesystem layers. `ENV`, `EXPOSE`, `CMD`, `LABEL`, `WORKDIR`, `USER` only add metadata. This is why chaining `RUN apt-get update && apt-get install … && rm -rf /var/lib/apt/lists/*` in one instruction shrinks the image — deleting in a *later* layer doesn't reclaim the space.</details>

---

**D3.** `CMD` vs `ENTRYPOINT`?
<details><summary>Answer</summary>

`ENTRYPOINT` sets the executable; `CMD` supplies default arguments. `docker run img foo` **replaces `CMD`** but is *appended* to `ENTRYPOINT`.

Idiomatic: `ENTRYPOINT ["node", "dist/main.js"]` + `CMD []`, or `ENTRYPOINT ["./entrypoint.sh"]`. Always use the **exec form** (`["a","b"]`) — the shell form (`CMD node app.js`) wraps the process in `/bin/sh -c`, so your app becomes PID 2 and **never receives `SIGTERM`**, breaking graceful shutdown.
</details>

---

**D4.** Why is this Dockerfile order wrong?
```dockerfile
FROM node:20-alpine
COPY . .
RUN npm ci
```
<details><summary>Answer</summary>**It destroys layer caching.** Any source-file change invalidates the `COPY`, so `npm ci` re-runs on every build. Correct order: `COPY package*.json ./` → `RUN npm ci` → `COPY . .`. Also missing a `.dockerignore` (`node_modules`, `.git`, `.env`).</details>

---

**D5.** What does a multi-stage build achieve?
<details><summary>Answer</summary>

Build with the full toolchain in one stage, then `COPY --from=builder` only the artefacts into a slim runtime stage. Result: smaller image, no compilers/dev-dependencies in production, and **no build-time secrets baked into the final layers**.

```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./ && RUN npm ci
COPY . . && RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
USER node
CMD ["node", "dist/main.js"]
```
</details>

---

**D6.** `docker run -v /host/path:/container/path` — what kind of mount is this?
A) Named volume  B) Bind mount  C) tmpfs  D) Overlay

<details><summary>Answer</summary>**B) Bind mount** — maps a host path directly (great for local dev, dependent on host layout). A **named volume** (`-v mydata:/var/lib/postgresql/data`) is Docker-managed, portable, and the right choice for stateful data.</details>

---

**D7.** Data written inside a container without a volume — what happens on `docker rm`?
<details><summary>Answer</summary>**It's gone.** The writable layer is deleted with the container. Containers are ephemeral by design; anything durable belongs in a volume or an external store.</details>

---

**D8.** Two containers on the same user-defined bridge network — how does one reach the other?
<details><summary>Answer</summary>By **container/service name** — Docker's embedded DNS resolves it (`http://api:3000`). This does **not** work on the legacy default bridge, which needs `--link`. In Compose, the service name is the hostname.</details>

---

**D9.** Which are true about `EXPOSE 3000`? *(Select all.)*
1. It publishes the port to the host
2. It's documentation/metadata
3. `-P` uses it to publish to random host ports
4. Without it, container-to-container traffic on the same network fails

<details><summary>Answer</summary>**2 and 3.** `EXPOSE` publishes nothing by itself — you need `-p 3000:3000`. Containers on a shared network reach each other on any port regardless of `EXPOSE`.</details>

---

**D10.** Why run as a non-root user in a container?
<details><summary>Answer</summary>Container root is (by default) host root namespaced — a container escape or a writable bind mount becomes host-level compromise. `USER node` (or a numeric UID for Kubernetes `runAsNonRoot`) limits the blast radius. Add `readOnlyRootFilesystem`, dropped capabilities, and no `--privileged`.</details>

---

**D11.** Image is 1.2 GB. Fastest wins to shrink it? *(Select all.)*
A) Multi-stage build  B) Alpine/distroless base  C) `--omit=dev`  D) `docker system prune`

<details><summary>Answer</summary>**A, B, C.** D cleans your *local disk*, not the image. Note the Alpine caveat: musl libc breaks some native modules and can hurt performance — `node:20-slim` (Debian) is often the safer trade.</details>

---

**D12.** What does `docker-compose.yml`'s `depends_on` guarantee?
A) The dependency is ready to accept connections
B) Only start **order**, not readiness

<details><summary>Answer</summary>**B.** Postgres accepting TCP ≠ Postgres ready. Use `depends_on: { condition: service_healthy }` with a `healthcheck`, or make your app retry its connection — which it should do anyway.</details>

---

**D13.** Container is `Exited (137)`. What happened?
<details><summary>Answer</summary>**137 = 128 + 9 (SIGKILL)** — almost always the **OOM killer** hitting the memory limit. Check `docker inspect --format '{{.State.OOMKilled}}'`. For Node, set `--max-old-space-size` below the container limit. (`Exited (143)` = 128 + 15 = SIGTERM, i.e. a normal stop.)</details>

---

**D14.** Where should application logs go in a container?
A) A file inside the container  B) `stdout`/`stderr`  C) A mounted log directory  D) Syslog

<details><summary>Answer</summary>**B.** The 12-factor rule: treat logs as an event stream on stdout and let the platform (Docker driver, Fluent Bit, CloudWatch, Loki) collect and route them. Files inside containers vanish and can fill the disk.</details>

---

## 2. Kubernetes

**K1.** Smallest deployable unit in Kubernetes?
A) Container  B) Pod  C) Deployment  D) Node

<details><summary>Answer</summary>**B) Pod** — one or more containers sharing a network namespace (same `localhost` and IP) and volumes.</details>

---

**K2.** Liveness vs readiness vs startup probe?
<details><summary>Answer</summary>

- **Liveness** — "is it wedged?" Failure → **restart** the container.
- **Readiness** — "can it serve traffic *right now*?" Failure → **removed from the Service endpoints**, not restarted.
- **Startup** — "has it finished booting?" Suspends the other two until it passes; for slow-starting apps.

**The classic production bug:** pointing liveness at an endpoint that checks the database. The DB blips → every pod fails liveness → the whole deployment restart-loops → outage. Liveness should check only the process; **dependencies belong in readiness**.
</details>

---

**K3.** Deployment vs StatefulSet vs DaemonSet vs Job?
<details><summary>Answer</summary>

- **Deployment** — stateless replicas, interchangeable, random names, rolling updates.
- **StatefulSet** — stable ordinal identities (`db-0`, `db-1`), stable per-pod storage, ordered start/stop. For databases, Kafka, Zookeeper.
- **DaemonSet** — one pod per node. For log collectors, node exporters, CNI agents.
- **Job / CronJob** — run to completion / on a schedule.
</details>

---

**K4.** Service types — ClusterIP, NodePort, LoadBalancer, ExternalName?
<details><summary>Answer</summary>

- **ClusterIP** (default) — internal-only virtual IP.
- **NodePort** — opens a port (30000–32767) on every node.
- **LoadBalancer** — provisions a cloud LB (one per Service — expensive, hence Ingress).
- **ExternalName** — a CNAME to an external DNS name, no proxying.

**Ingress** is not a Service type; it's an L7 HTTP router in front of ClusterIP Services, so many hostnames/paths share one load balancer.
</details>

---

**K5.** ConfigMap vs Secret?
<details><summary>Answer</summary>Both are key/value objects mounted as env vars or files. A Secret is only **base64-encoded, not encrypted**, by default — enable encryption at rest (`EncryptionConfiguration`), restrict RBAC, and prefer an external store (AWS Secrets Manager via the External Secrets Operator, or Vault). Neither hot-reloads env vars: a change requires a pod restart (mounted *files* do update, eventually).</details>

---

**K6.** Requests vs limits?
<details><summary>Answer</summary>

**Request** = guaranteed reservation, used by the **scheduler** to place the pod. **Limit** = hard ceiling enforced at runtime.

- CPU over limit → **throttled** (slower, not killed).
- Memory over limit → **OOMKilled**.

QoS classes: `Guaranteed` (requests == limits), `Burstable` (requests < limits), `BestEffort` (neither) — and eviction happens in reverse order. Common practice: set memory request == limit, and set a CPU request but no CPU limit to avoid needless throttling.
</details>

---

**K7.** Default rolling-update behaviour for a Deployment?
<details><summary>Answer</summary>`maxUnavailable: 25%`, `maxSurge: 25%`. New ReplicaSet scales up while the old scales down; `kubectl rollout undo` reverts. For zero-downtime you also need readiness probes that are honest, `terminationGracePeriodSeconds` longer than your drain, and a `preStop` sleep so endpoints propagate before the process exits.</details>

---

**K8.** Pod is `Pending`. Most likely causes? *(Select all.)*
A) Insufficient CPU/memory on any node  B) No node matches nodeSelector/affinity/taints  C) PVC unbound  D) Image pull failure

<details><summary>Answer</summary>**A, B, C.** An image pull failure shows as `ImagePullBackOff`/`ErrImagePull` with the pod already **scheduled**. Diagnose with `kubectl describe pod` and read the **Events** section — that's where the reason always is.</details>

---

**K9.** `CrashLoopBackOff` — first three commands?
<details><summary>Answer</summary>

```bash
kubectl describe pod <p>                 # events, exit code, probe failures
kubectl logs <p> --previous              # logs from the crashed instance (the key flag)
kubectl get events --sort-by=.lastTimestamp
```
Usual causes: bad config/missing env var, failing liveness probe, OOMKill (exit 137), or a missing dependency at boot.
</details>

---

**K10.** HPA scales on what by default, and what does KEDA add?
<details><summary>Answer</summary>HPA scales on CPU/memory (and custom/external metrics via the metrics adapters). **KEDA** scales on event sources — Kafka consumer lag, SQS queue depth, Redis list length, cron — and can scale **to zero**. For a queue-backed worker, lag-based scaling beats CPU-based scaling because CPU is often idle while the backlog grows.</details>

---

**K11.** What is a Namespace for?
<details><summary>Answer</summary>Logical isolation within a cluster: scoped names, RBAC boundaries, ResourceQuota and LimitRange, and NetworkPolicy targets. It is **not** a security boundary by itself — pods in different namespaces can talk unless a NetworkPolicy forbids it.</details>

---

**K12.** How does a pod reach `payments-svc` in namespace `prod`?
<details><summary>Answer</summary>`payments-svc.prod.svc.cluster.local` (or just `payments-svc` from within `prod`). CoreDNS resolves it to the Service's ClusterIP; kube-proxy (iptables/IPVS) load-balances to a ready endpoint.</details>

---

**K13.** What does a service mesh (Istio/Linkerd) give you that Kubernetes doesn't?
<details><summary>Answer</summary>Automatic **mTLS** between services, L7 traffic management (canary splits, retries, timeouts, circuit breaking) without code changes, and uniform golden-signal telemetry. Costs: a sidecar per pod (latency + memory), significant operational complexity, and another failure domain. For a handful of services, library-level resilience is usually the better trade.</details>

---

**K14.** How do you achieve zero-downtime deploys in Kubernetes? *(Select all.)*
A) Readiness probes  B) `preStop` hook with a short sleep  C) PodDisruptionBudget  D) `terminationGracePeriodSeconds` > drain time  E) Graceful `SIGTERM` handling in the app

<details><summary>Answer</summary>**All five.** They're interdependent: without the app handling `SIGTERM` (E), the grace period (D) does nothing; without the `preStop` sleep (B), the pod can stop before endpoint removal propagates to every node's kube-proxy, producing a burst of 502s; the PDB (C) protects you during node drains and cluster upgrades.</details>

---

## 3. Linux & Shell

**L1.** Find which process is listening on port 3000.
<details><summary>Answer</summary>`ss -ltnp | grep :3000` (modern) or `lsof -i :3000` / `netstat -tlnp | grep 3000`.</details>

---

**L2.** Server is slow. First four commands?
<details><summary>Answer</summary>

```bash
uptime            # load average vs core count
top / htop        # per-process CPU & memory, and %wa (I/O wait)
free -h           # memory, and whether swap is being used
df -h && df -i    # disk space AND inodes (a full inode table looks like a full disk)
```
Then `iostat -x 1`, `vmstat 1`, `dmesg -T | tail` (look for OOM-killer lines).
</details>

---

**L3.** What does `chmod 755 file` mean?
<details><summary>Answer</summary>`rwxr-xr-x` — owner read/write/execute, group and others read/execute. 4 = read, 2 = write, 1 = execute. `644` = `rw-r--r--` for a normal file; `600` for secrets/keys.</details>

---

**L4.** Difference between `>`, `>>`, and `2>&1`?
<details><summary>Answer</summary>Overwrite stdout to a file · append · redirect stderr to wherever stdout currently points. `cmd > out.log 2>&1` captures both; **order matters** — `2>&1 > out.log` sends stderr to the *old* stdout (the terminal).</details>

---

**L5.** Count occurrences of "ERROR" per hour in a log.
<details><summary>Answer</summary>

```bash
grep ERROR app.log | awk '{print $1, substr($2,1,2)}' | sort | uniq -c | sort -rn
```
The `sort | uniq -c | sort -rn` idiom is asked constantly. Bonus: `grep -c` for a plain count, `zgrep` for gzipped logs, `jq -r '.level'` for JSON logs.
</details>

---

**L6.** Difference between `kill`, `kill -9`, and `kill -15`?
<details><summary>Answer</summary>`kill` defaults to **15 (SIGTERM)** — catchable, allows cleanup. `kill -9` (**SIGKILL**) cannot be caught or ignored; the process dies immediately with no cleanup, leaving temp files, unflushed buffers, and un-acked messages. Always try 15 first.</details>

---

**L7.** What is a zombie process?
<details><summary>Answer</summary>A finished child whose exit status the parent hasn't `wait()`ed for. It holds only a PID entry. Many zombies means a buggy parent. **Relevant to Docker:** a process running as PID 1 doesn't reap orphans by default — use `docker run --init` or `tini`.</details>

---

**L8.** `curl` a health endpoint and show only the status code.
<details><summary>Answer</summary>`curl -s -o /dev/null -w '%{http_code}\n' https://api.example.com/health`. Also useful: `-w '%{time_total}'`, `-I` (headers only), `-L` (follow redirects), `-X POST -d @body.json -H 'Content-Type: application/json'`.</details>

---

**L9.** Disk shows 100% full, but deleting files doesn't free space. Why?
<details><summary>Answer</summary>A process still holds an **open file descriptor** to a deleted file, so the inode isn't released. Find it with `lsof +L1` (or `lsof | grep deleted`) and restart the holder. Second possibility: **inodes** are exhausted (`df -i`) — millions of tiny files, common with unrotated logs or session files.</details>

---

**L10.** What does `nohup cmd &` do, and what's the better modern alternative?
<details><summary>Answer</summary>Runs `cmd` in the background, immune to `SIGHUP` when the shell exits, with output to `nohup.out`. Better: a **systemd unit** (restart policy, logging, dependencies) — or, in this stack, a container managed by ECS/Kubernetes.</details>

---

**L11.** How do you see environment variables of a running process?
<details><summary>Answer</summary>`cat /proc/<pid>/environ | tr '\0' '\n'`. Which is also the security lesson: **any user who can read that proc entry can read your secrets from env vars** — one argument for mounting secrets as files with tight permissions.</details>

---

**L12.** What's in `/etc/hosts` vs DNS resolution order?
<details><summary>Answer</summary>`/etc/hosts` is a static name→IP map consulted according to `/etc/nsswitch.conf` (typically `files dns`), so it overrides DNS. Handy for testing before a cutover; a common cause of "works on my machine" when someone left an entry behind.</details>

---

## 4. Git

**G1.** `git merge` vs `git rebase`?
<details><summary>Answer</summary>`merge` creates a merge commit and preserves true history (non-destructive). `rebase` replays your commits on top of the target, producing linear history but **rewriting commit hashes**. Golden rule: **never rebase a branch other people have pulled.**</details>

---

**G2.** `git reset --soft` vs `--mixed` vs `--hard`?
<details><summary>Answer</summary>

| Flag | HEAD | Index/staging | Working tree |
|---|---|---|---|
| `--soft` | moves | unchanged (changes stay staged) | unchanged |
| `--mixed` (default) | moves | reset | unchanged |
| `--hard` | moves | reset | **reset — work is destroyed** |

`--hard` is the only one that loses uncommitted work. Committed work is still recoverable via `git reflog`.
</details>

---

**G3.** Undo a commit that's already pushed to a shared branch?
<details><summary>Answer</summary>`git revert <sha>` — creates a new commit that inverts the change, so shared history stays intact. `git reset` + force-push rewrites history that others have based work on, and is the wrong answer here.</details>

---

**G4.** `git fetch` vs `git pull`?
<details><summary>Answer</summary>`fetch` downloads remote refs without touching your working tree. `pull` = `fetch` + `merge` (or `rebase` with `--rebase`). Fetch-then-inspect is the safer habit.</details>

---

**G5.** What is `git cherry-pick` for?
<details><summary>Answer</summary>Applying a specific commit onto the current branch — typically hot-fixing a release branch with one commit from `main` without dragging along everything else.</details>

---

**G6.** You committed a secret. What now?
<details><summary>Answer</summary>

1. **Rotate the secret immediately** — assume it's compromised the moment it was pushed.
2. Purge it from history (`git filter-repo`, or BFG) and force-push, coordinating with the team.
3. Add it to `.gitignore`; add a pre-commit secret scanner (gitleaks, trufflehog) and enable push protection on the host.

Deleting the file in a new commit does nothing — it's still in history. **Rotation is step one**; candidates who skip it fail this question.
</details>

---

**G7.** What does `git stash` do, and how do you recover a dropped stash?
<details><summary>Answer</summary>Saves uncommitted changes and cleans the working tree. `git stash list` / `pop` / `apply` / `drop`. A dropped stash is still reachable for a while: `git fsck --unreachable | grep commit` then `git stash apply <sha>`.</details>

---

**G8.** Difference between `.gitignore` and `.git/info/exclude`?
<details><summary>Answer</summary>`.gitignore` is committed and shared; `.git/info/exclude` is local and private (and `core.excludesFile` is global per-user). Note that neither affects files **already tracked** — you need `git rm --cached`.</details>

---

**G9.** What is a fast-forward merge?
<details><summary>Answer</summary>When the target branch hasn't diverged, Git just moves the pointer forward — no merge commit. `--no-ff` forces a merge commit to preserve the fact that a feature branch existed, which many teams require for traceability.</details>

---

**G10.** Trunk-based development vs Git Flow — pick one for a team shipping daily.
<details><summary>Answer</summary>

**Trunk-based:** short-lived branches (< 1 day), merge to `main` continuously, incomplete work hidden behind **feature flags**, release from `main`. Optimises for continuous delivery and small, safe changes.

**Git Flow** (`develop`, `release/*`, `hotfix/*`) suits versioned, infrequently-released software (desktop apps, on-prem installs). For a daily-deploying web backend, Git Flow's long-lived branches create painful merges — say that explicitly.
</details>

---

**G11.** `git bisect` — what's it for?
<details><summary>Answer</summary>Binary search over history to find the commit that introduced a bug: `git bisect start`, `git bisect bad`, `git bisect good <sha>`, then test each proposed commit (or automate with `git bisect run npm test`). Finds a culprit in ~log₂(n) steps — 10 tests over 1,000 commits.</details>

---

**G12.** What makes a good commit message?
<details><summary>Answer</summary>Imperative subject ≤ 50 chars ("Fix race in payment retry"), blank line, body explaining **why** rather than what, and a reference to the ticket. Conventional Commits (`feat:`, `fix:`, `chore:`) additionally enable automated semantic versioning and changelogs.</details>

---

## 5. CI/CD

**C1.** Continuous Delivery vs Continuous Deployment?
<details><summary>Answer</summary>**Delivery** — every change is automatically built, tested, and made *releasable*; a human approves the push to production. **Deployment** — that final step is automatic too. Both require Continuous Integration underneath.</details>

---

**C2.** Order the stages of a sensible backend pipeline.
<details><summary>Answer</summary>lint + typecheck → unit tests → build → **security scan (SAST + dependency audit)** → build & scan image → integration tests (testcontainers) → push image → deploy to staging → smoke/E2E tests → deploy to production (canary or blue-green) → post-deploy verification (SLO burn check) → auto-rollback on failure.

Fail fast and cheap: the 20-second lint runs before the 8-minute integration suite.
</details>

---

**C3.** Blue-green vs canary vs rolling?
<details><summary>Answer</summary>

- **Rolling** — replace instances gradually. Cheapest; both versions serve traffic simultaneously, so the DB schema must be compatible with both.
- **Blue-green** — two full environments, switch traffic at once. Instant rollback; costs 2× infrastructure.
- **Canary** — route 1% → 5% → 50% → 100% while watching error rate and latency. Smallest blast radius; needs good metrics and traffic-splitting.
</details>

---

**C4.** What are the four DORA metrics?
<details><summary>Answer</summary>**Deployment frequency**, **lead time for change**, **change failure rate**, and **time to restore service** (MTTR). The first two measure throughput, the last two stability — the research point being that elite teams score well on both, so "we deploy slowly to be safe" is a false trade-off.</details>

---

**C5.** Why is `npm ci` preferred over `npm install` in CI?
<details><summary>Answer</summary>Deterministic (installs exactly the lock file), fails on lock/manifest drift, faster (skips resolution), and removes `node_modules` first so there's no stale state. See [Q30 in the Node bank](02-mcq-bank-nodejs-backend.md).</details>

---

**C6.** Where do secrets belong in a GitHub Actions pipeline?
<details><summary>Answer</summary>Encrypted repo/org/environment secrets, injected as env vars at step scope — never in the workflow YAML, never echoed. Better still: **OIDC federation** to assume an AWS role, so no long-lived cloud credentials exist at all. Also protect production with an **environment** requiring manual approval.</details>

---

**C7.** What is Infrastructure as Code, and what does `terraform plan` give you?
<details><summary>Answer</summary>Declarative, version-controlled infrastructure — reviewable, reproducible, and drift-detectable. `terraform plan` shows the diff between desired state and real state before applying; in CI you post the plan on the PR so infrastructure changes get reviewed like code. Keep state remote (S3 + DynamoDB lock) so concurrent applies can't corrupt it.</details>

---

**C8.** What is GitOps?
<details><summary>Answer</summary>Git is the single source of truth for the desired cluster state; an in-cluster agent (ArgoCD, Flux) continuously reconciles reality toward it. Benefits: pull-based (no CI credentials into the cluster), automatic drift correction, and rollback = `git revert`.</details>

---

## 6. AWS

**A1.** EC2 vs ECS vs Fargate vs Lambda — pick one for a steady-traffic API and defend it.
<details><summary>Answer</summary>

**ECS on Fargate** for most teams: containers without managing EC2 instances, per-second billing, integrates with ALB/IAM/CloudWatch. **Lambda** wins for spiky or low-volume workloads and event glue but pays cold-start and 15-minute limits. **EC2** when you need specific instance types, GPUs, or long-lived stateful processes. **EKS** when you need Kubernetes portability and have the ops capacity.

The scoring criterion is that you name the trade-off (cost model, cold starts, ops burden), not which one you pick.
</details>

---

**A2.** Security Group vs NACL?
<details><summary>Answer</summary>

- **Security Group** — instance/ENI level, **stateful** (return traffic auto-allowed), allow rules only.
- **NACL** — subnet level, **stateless** (you must allow both directions), allow *and* deny rules, evaluated by rule number.

"Stateful vs stateless" is the answer they're listening for.
</details>

---

**A3.** Public vs private subnet — what actually makes the difference?
<details><summary>Answer</summary>The **route table**. A public subnet has a route to an **Internet Gateway**; a private subnet routes outbound through a **NAT Gateway** (and has no inbound route from the internet). Databases go in private subnets; only the ALB lives in public ones. Cost note: NAT Gateways are billed hourly *and* per GB — VPC endpoints for S3/DynamoDB avoid that charge.</details>

---

**A4.** S3 storage classes — which for infrequently accessed backups?
<details><summary>Answer</summary>`S3 Standard-IA` (or `Glacier Instant/Flexible/Deep Archive` for true archives). `S3 Intelligent-Tiering` auto-moves objects based on access patterns — the safe default when you don't know the pattern. Use **lifecycle policies** to transition and expire automatically.</details>

---

**A5.** How do you give a Lambda access to a DynamoDB table? *(Best practice.)*
A) Hardcode access keys  B) Store keys in env vars  C) An IAM execution role with least-privilege policy  D) Make the table public

<details><summary>Answer</summary>**C.** IAM roles provide short-lived, automatically rotated credentials. Scope the policy to specific actions **and** the specific table ARN — `dynamodb:*` on `*` is the most common real-world finding in an AWS audit.</details>

---

**A6.** SQS standard vs FIFO?
<details><summary>Answer</summary>

**Standard**: nearly unlimited throughput, **at-least-once** delivery, best-effort ordering. **FIFO**: exact ordering within a message group and exactly-once *processing* (with deduplication), capped throughput (300 TPS, or 3,000 with batching, per API action).

Either way your consumer should be **idempotent** — with Standard it's mandatory.
</details>

---

**A7.** What is an SQS visibility timeout, and what's the classic bug?
<details><summary>Answer</summary>After a consumer receives a message it becomes invisible to others for the visibility timeout. **The bug:** processing takes longer than the timeout, so the message reappears and is processed **twice** (sometimes forever). Fix: set the timeout above p99 processing time, extend the heartbeat for long jobs, and configure a **DLQ** with a `maxReceiveCount` so poison messages don't loop indefinitely.</details>

---

**A8.** SNS vs SQS vs EventBridge?
<details><summary>Answer</summary>**SNS** = pub/sub fan-out (push to many subscribers). **SQS** = durable queue with one logical consumer group (pull). **EventBridge** = event bus with content-based routing rules, schema registry, third-party SaaS sources, and scheduling. The classic pattern is **SNS → multiple SQS queues** so each consumer gets its own durable buffer and retry behaviour.</details>

---

**A9.** What does CloudFront give you beyond caching? *(Select all.)*
A) Edge TLS termination closer to users  B) DDoS protection with AWS Shield  C) WAF integration  D) Origin request shielding/collapsing

<details><summary>Answer</summary>**All four.** For a Bangladesh-based origin serving international users (or vice versa), edge TLS termination alone often cuts hundreds of milliseconds off first byte, before any caching benefit.</details>

---

**A10.** Reduce a Lambda bill — which levers? *(Select all.)*
A) Right-size memory (which also scales CPU)  B) Shrink the deployment package / use ARM Graviton  C) Reduce invocation count via batching  D) Increase the timeout

<details><summary>Answer</summary>**A, B, C.** Timeout doesn't affect cost (you pay for actual duration) — but a high timeout does increase the cost of a hung invocation. Memory is the key lever: **more memory can be cheaper** because it proportionally increases CPU and can cut duration by more than the price increase. Use AWS Lambda Power Tuning to find the optimum.</details>

---

**A11.** RDS Multi-AZ vs Read Replicas?
<details><summary>Answer</summary>**Multi-AZ** = synchronous standby in another AZ for **high availability**; automatic failover; the standby serves **no traffic**. **Read replicas** = asynchronous copies for **read scaling**; they lag, so reads-after-write can be stale. Different problems — a surprising number of candidates conflate them.</details>

---

**A12.** What's the cheapest meaningful AWS cost optimisation for a small BD startup?
<details><summary>Answer</summary>In practical order: (1) turn off non-production environments outside working hours; (2) right-size over-provisioned instances using CloudWatch data; (3) S3 lifecycle policies + Intelligent-Tiering; (4) eliminate idle NAT Gateways and unattached EBS volumes/EIPs; (5) Savings Plans / Reserved Instances once the baseline is stable; (6) set **budgets and anomaly alerts** so surprises are caught in days, not at month end.</details>

---

## 7. Networking, NGINX & TLS

**N1.** What happens when you type a URL and hit enter? (30-second version.)
<details><summary>Answer</summary>DNS resolution (cache → resolver → root → TLD → authoritative) → TCP handshake (SYN/SYN-ACK/ACK) → TLS handshake (ClientHello, certificate, key exchange; 1-RTT in TLS 1.3) → HTTP request → server/app/DB processing → response → render. Name the layer where you'd add a CDN, a load balancer, and a cache, and you've answered the senior version.</details>

---

**N2.** TCP vs UDP — and which does HTTP/3 use?
<details><summary>Answer</summary>TCP: connection-oriented, ordered, retransmitted, congestion-controlled. UDP: fire-and-forget, no ordering guarantees, lower latency. **HTTP/3 runs on QUIC, which is built on UDP** — it moves reliability and congestion control into userspace and eliminates TCP head-of-line blocking across streams.</details>

---

**N3.** L4 vs L7 load balancing?
<details><summary>Answer</summary>**L4** (AWS NLB) routes on IP/port — fast, protocol-agnostic, preserves the client IP, no visibility into content. **L7** (ALB, NGINX) understands HTTP — path/host routing, header manipulation, TLS termination, sticky sessions, request-level retries. L7 costs more CPU and adds a hop.</details>

---

**N4.** NGINX `proxy_pass` — what does the trailing slash change?
<details><summary>Answer</summary>

```nginx
location /api/ { proxy_pass http://backend/; }   # /api/users -> /users   (path replaced)
location /api/ { proxy_pass http://backend; }    # /api/users -> /api/users (path preserved)
```
A slash means "replace the matched location prefix"; no slash means "append". This one line causes an enormous number of production 404s.
</details>

---

**N5.** Which headers must NGINX forward for the app to see the real client?
<details><summary>Answer</summary>

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```
And the app must **trust** them (`app.set('trust proxy', 1)` in Express) — otherwise rate limiting keys on the proxy IP and blocks everyone at once. Only trust these headers from your own proxy; they're client-spoofable otherwise.
</details>

---

**N6.** Configure NGINX for WebSockets.
<details><summary>Answer</summary>

```nginx
location /ws/ {
  proxy_pass http://app;
  proxy_http_version 1.1;                    # required
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 3600s;                  # default 60s kills idle sockets
}
```
Missing `proxy_http_version 1.1` or the default read timeout is the cause of nearly every "my WebSocket disconnects after a minute" report.
</details>

---

**N7.** 502 vs 504 from NGINX — what's the difference in root cause?
<details><summary>Answer</summary>**502 Bad Gateway** — the upstream refused the connection or returned garbage (app crashed, wrong port, upstream restarted). **504 Gateway Timeout** — the upstream accepted but didn't respond within `proxy_read_timeout` (slow query, blocked event loop, deadlock). One means "it's down", the other means "it's slow".</details>

---

**N8.** What does HSTS do?
<details><summary>Answer</summary>`Strict-Transport-Security: max-age=31536000; includeSubDomains` tells browsers to use HTTPS for this domain for the next year, eliminating the initial plaintext request that an SSL-strip attack targets. Deploy carefully — it's hard to unwind, and `includeSubDomains` can break an HTTP-only subdomain.</details>

---

**N9.** What is mTLS and where do you use it?
<details><summary>Answer</summary>Mutual TLS — **both** sides present certificates, so the server authenticates the client cryptographically rather than by a shared bearer token. Used for service-to-service auth inside a mesh (SPIFFE identities), partner/bank integrations, and any zero-trust internal network. Cost: certificate issuance, rotation, and revocation infrastructure.</details>

---

**N10.** Where do you terminate TLS, and what's the trade-off?
<details><summary>Answer</summary>At the edge (CDN/ALB) for performance and simple certificate management, but then internal traffic is plaintext unless you re-encrypt. **End-to-end TLS** (re-encrypt at each hop, or mTLS everywhere) is required for regulated data — the trade-off is CPU, certificate management, and losing L7 inspection at intermediate hops.</details>

---

## 8. Observability

**O1.** The three pillars, and which answers "why is *this specific* request slow"?
<details><summary>Answer</summary>**Metrics** (aggregate, cheap, alertable — "is something wrong?"), **logs** (discrete events, rich context — "what happened?"), **traces** (causal request path across services — "**where** is the time going?"). Only traces answer the per-request latency question, which is why distributed tracing matters the moment you have more than two services.</details>

---

**O2.** The four golden signals?
<details><summary>Answer</summary>**Latency, Traffic, Errors, Saturation.** (USE method for resources: Utilisation, Saturation, Errors. RED for services: Rate, Errors, Duration.)</details>

---

**O3.** Why alert on percentiles rather than averages?
<details><summary>Answer</summary>An average hides the tail: 99 requests at 10 ms and 1 at 5 s averages ~60 ms and looks healthy, while 1% of users had a terrible experience. Alert on **p95/p99**, and remember that averages of percentiles across instances are mathematically meaningless — aggregate from histograms (`histogram_quantile` over `_bucket` series).</details>

---

**O4.** What is metric cardinality and why does it matter?
<details><summary>Answer</summary>Every unique label-value combination is a separate time series. Adding `user_id` or a raw URL path as a label creates millions of series, which explodes memory and cost and can take Prometheus down. Keep labels **bounded** (method, route *template*, status class); put high-cardinality identifiers in **logs and traces**, not metrics.</details>

---

**O5.** SLI vs SLO vs SLA vs error budget?
<details><summary>Answer</summary>**SLI** — the measurement (e.g. % of requests < 300 ms). **SLO** — your internal target (99.9%). **SLA** — the contractual promise with financial consequences, always looser than the SLO. **Error budget** — `100% − SLO`; the amount of unreliability you're allowed to spend. Burning it fast should pause feature releases — that's the mechanism that makes SLOs more than decoration.</details>

---

**O6.** What is burn-rate alerting and why is it better than a threshold alert?
<details><summary>Answer</summary>Alert on how fast you're consuming the error budget rather than on a raw error rate — typically a **multi-window, multi-burn-rate** rule (fast burn: 14.4× over 1 h, page immediately; slow burn: 3× over 6 h, ticket). It catches both sudden outages and slow degradation while producing far fewer false pages than a static "errors > 1%" threshold.</details>

---

**O7.** What makes a log line useful in production?
<details><summary>Answer</summary>**Structured JSON**, a level, a timestamp, a **correlation/trace id**, the tenant/user id (hashed if PII-sensitive), the operation name, and the outcome — with no secrets, tokens, card numbers, or full request bodies. Sample high-volume info logs; never sample errors.</details>

---

**O8.** What is OpenTelemetry?
<details><summary>Answer</summary>A vendor-neutral standard (APIs, SDKs, and the Collector) for generating and exporting traces, metrics, and logs. The value is that instrumentation is written **once** and the backend (Jaeger, Tempo, Datadog, X-Ray) becomes a configuration choice — no re-instrumentation when you switch vendors.</details>

---

## Answer-Speed Drill

Ten minutes, out loud:

1. Why does `COPY . .` before `npm ci` hurt?
2. `CMD` vs `ENTRYPOINT`, and why the exec form matters for `SIGTERM`.
3. Exit code 137 — what happened?
4. Liveness vs readiness, and the classic outage caused by confusing them.
5. Requests vs limits; what happens when you exceed each.
6. Five things needed for zero-downtime K8s deploys.
7. Pod is Pending — where do you look?
8. Security Group vs NACL.
9. SQS visibility timeout bug.
10. Multi-AZ vs read replica.
11. `git revert` vs `git reset` on a shared branch.
12. You committed a secret — first action?
13. Blue-green vs canary.
14. The four DORA metrics.
15. NGINX 502 vs 504.
16. Why the `proxy_pass` trailing slash matters.
17. Metric cardinality — why not label by user id?
18. SLI/SLO/SLA/error budget in one sentence each.

**Target: 16/18.**
