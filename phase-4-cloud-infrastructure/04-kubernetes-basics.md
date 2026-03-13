# Kubernetes (K8s) — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical YAML examples and kubectl commands
> **Last Updated:** 2026-03-13

---

## Table of Contents

1. [What is Kubernetes & Why Use It](#q1-what-is-kubernetes--why-use-it)
2. [Pods — The Smallest Unit](#q2-pods--the-smallest-unit)
3. [Deployments & ReplicaSets](#q3-deployments--replicasets)
4. [Services — Networking](#q4-services--networking)
5. [ConfigMaps & Secrets](#q5-configmaps--secrets)
6. [Namespaces](#q6-namespaces)
7. [StatefulSets](#q7-statefulsets)
8. [HPA, VPA & KEDA](#q8-horizontal-pod-autoscaler-hpa--vertical-pod-autoscaler-vpa)
9. [Helm — Package Manager for K8s](#q9-helm--package-manager-for-k8s)
10. [Ingress & Ingress Controllers](#q10-ingress--ingress-controllers)
11. [K8s Deployment Strategies](#q11-k8s-deployment-strategies)
12. [Service Mesh (Istio/Linkerd Basics)](#q12-service-mesh-istiolinkerd-basics)
13. [K8s Troubleshooting](#q13-k8s-troubleshooting)
14. [K8s on AWS (EKS)](#q14-k8s-on-aws-eks)
15. [Quick Reference](#quick-reference)

---

## Q1: What is Kubernetes & Why Use It

### Q: What is Kubernetes and what problem does it solve?

**A:** Kubernetes (K8s) is an open-source container orchestration platform originally developed by Google (based on their internal system called Borg). It automates the deployment, scaling, and management of containerized applications.

**Core problems it solves:**

- **Scheduling:** Deciding which machine runs which container
- **Scaling:** Automatically adding/removing container instances based on load
- **Self-healing:** Restarting crashed containers, replacing unhealthy nodes
- **Service discovery & load balancing:** Containers find and talk to each other
- **Rolling updates & rollbacks:** Deploy new versions without downtime
- **Secret & configuration management:** Securely manage app config

### Q: How does Kubernetes compare to alternatives?

| Feature | Kubernetes | Docker Swarm | HashiCorp Nomad |
|---|---|---|---|
| **Learning curve** | Steep | Gentle | Moderate |
| **Scalability** | Thousands of nodes | Hundreds of nodes | Thousands of nodes |
| **Community/ecosystem** | Massive | Small (declining) | Growing |
| **Scheduling** | Advanced (affinity, taints) | Basic | Advanced |
| **Service mesh** | Istio, Linkerd | None built-in | Consul Connect |
| **Setup complexity** | High (use managed) | Low | Moderate |
| **Multi-container support** | Pods (native) | Single container | Task groups |
| **Best for** | Large-scale production | Simple Docker deployments | Multi-runtime (containers + VMs + raw binaries) |

### Q: When should you NOT use Kubernetes?

> **BD startup context:** "Don't use K8s for a 3-person team with 2 services. The operational overhead will eat you alive. Start with ECS Fargate or even a single EC2 instance with Docker Compose. Graduate to K8s when you have 10+ services and a team that can maintain it."

**Skip K8s when:**
- Small team (< 5 engineers) with few services (< 5)
- No dedicated DevOps/Platform engineer
- Simple workloads that ECS Fargate or Cloud Run can handle
- Budget constraints (K8s has a learning curve and operational cost)

**Use K8s when:**
- 10+ microservices
- Need advanced scheduling (GPU workloads, affinity rules)
- Multi-cloud or hybrid-cloud strategy
- Team has K8s expertise or you can afford managed K8s (EKS/GKE/AKS)
- Need advanced deployment strategies (canary, blue-green)

### Q: Managed K8s options comparison

| Feature | EKS (AWS) | GKE (Google) | AKS (Azure) |
|---|---|---|---|
| **Control plane cost** | $0.10/hr ($73/mo) | Free (Autopilot: pay per pod) | Free |
| **Easiest to start** | No (complex IAM) | Yes | Moderate |
| **Best integration** | AWS services | GCP services | Azure services |
| **Node management** | Managed node groups / Fargate | Autopilot / Standard | Virtual nodes / VMSS |
| **Default CNI** | VPC CNI (AWS IPs) | Calico / GKE native | Azure CNI |

### Q: Explain the Kubernetes architecture.

```
                    ┌─────────────────────────────────────────────┐
                    │              CONTROL PLANE                   │
                    │                                              │
                    │  ┌───────────┐  ┌──────┐  ┌───────────────┐│
                    │  │ API Server│  │ etcd │  │  Scheduler    ││
                    │  │  (kube-   │  │(key- │  │ (assigns pods ││
                    │  │ apiserver)│  │value │  │  to nodes)    ││
                    │  │           │  │store)│  │               ││
                    │  └─────┬─────┘  └──────┘  └───────────────┘│
                    │        │                                     │
                    │  ┌─────┴───────────────┐  ┌───────────────┐│
                    │  │ Controller Manager   │  │ Cloud         ││
                    │  │ (node, replication,  │  │ Controller    ││
                    │  │  endpoint, service   │  │ Manager       ││
                    │  │  account controllers)│  │               ││
                    │  └─────────────────────┘  └───────────────┘│
                    └─────────────────┬───────────────────────────┘
                                      │
                    ┌─────────────────┼───────────────────────────┐
                    │   WORKER NODE   │                            │
                    │                 │                            │
                    │  ┌──────────┐  ┌┴─────────┐  ┌───────────┐│
                    │  │ kubelet  │  │kube-proxy │  │ Container ││
                    │  │ (node    │  │(network   │  │ Runtime   ││
                    │  │  agent)  │  │ rules)    │  │(containerd││
                    │  └──────────┘  └──────────┘  │ / CRI-O)  ││
                    │                               └───────────┘│
                    │  ┌──────┐ ┌──────┐ ┌──────┐               │
                    │  │ Pod  │ │ Pod  │ │ Pod  │               │
                    │  └──────┘ └──────┘ └──────┘               │
                    └─────────────────────────────────────────────┘
```

**Control Plane components:**

| Component | Role |
|---|---|
| **API Server** | Front door for all K8s operations. kubectl talks to this. RESTful API. |
| **etcd** | Distributed key-value store. Stores ALL cluster state. Back this up! |
| **Scheduler** | Watches for unassigned pods, picks the best node based on resources, affinity, taints. |
| **Controller Manager** | Runs controllers (loops that watch state and reconcile). Node controller, ReplicaSet controller, etc. |
| **Cloud Controller Manager** | Integrates with cloud provider APIs (load balancers, volumes, routes). |

**Worker Node components:**

| Component | Role |
|---|---|
| **kubelet** | Agent on each node. Ensures containers are running in pods as declared. |
| **kube-proxy** | Maintains network rules (iptables/IPVS). Routes traffic to correct pods. |
| **Container Runtime** | Actually runs containers. containerd (standard), CRI-O (lightweight). Docker was deprecated as runtime in 1.24. |

### Q: What is the core philosophy of Kubernetes?

**Desired State vs Actual State Reconciliation:**

```
You declare:  "I want 3 replicas of my API running"
     ↓
K8s stores:   desired state in etcd
     ↓
Controller:   constantly compares desired vs actual
     ↓
If mismatch:  take action (create/delete/update pods)
```

This is a **declarative** model (you say WHAT you want, not HOW to get there). Every resource in K8s follows this pattern. The control loop never stops — it continuously reconciles.

---

## Q2: Pods — The Smallest Unit

### Q: What is a Pod?

**A:** A Pod is the smallest deployable unit in Kubernetes. It represents one or more containers that:

- Share the **same network namespace** (same IP, can communicate via `localhost`)
- Share the **same storage volumes** (can access the same mounted directories)
- Are **co-scheduled** on the same node
- Have a **shared lifecycle** (created and destroyed together)

```
┌─── Pod (10.244.1.5) ──────────────────────────┐
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   Main   │  │ Sidecar  │  │ Sidecar  │     │
│  │Container │  │ (logging)│  │ (proxy)  │     │
│  │ :3000    │  │ :9090    │  │ :15001   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│       ↕ localhost communication ↕               │
│                                                 │
│  ┌──────────────────────────────────────┐      │
│  │       Shared Volumes                  │      │
│  └──────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

### Q: Single-container vs multi-container pods — when use which?

**Single-container pod (90% of cases):**
- One application per pod
- Simple, easy to scale independently
- This is the standard pattern

**Multi-container pod patterns:**

| Pattern | Purpose | Example |
|---|---|---|
| **Sidecar** | Extend/enhance main container | Log collector (Fluentd), proxy (Envoy), file sync |
| **Ambassador** | Proxy connections to external services | Local Redis proxy, connection pooling |
| **Adapter** | Standardize output from main container | Transform logs to a common format, metrics exporter |

### Q: Explain Init Containers.

**Init containers** run **before** the main application containers start. They run to completion sequentially.

**Use cases:**
- Run database migrations before the app starts
- Wait for a dependent service to be available
- Clone a git repo or download config files
- Set up filesystem permissions

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-with-init
spec:
  initContainers:
    - name: wait-for-db
      image: busybox:1.36
      command: ['sh', '-c', 'until nc -z postgres-service 5432; do echo waiting for db; sleep 2; done']
    - name: run-migrations
      image: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/api:v1.2.3
      command: ['npx', 'prisma', 'migrate', 'deploy']
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
  containers:
    - name: api
      image: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/api:v1.2.3
      ports:
        - containerPort: 3000
```

### Q: Describe the Pod lifecycle.

```
  ┌─────────┐
  │ Pending  │  ← Pod accepted, waiting for scheduling/image pull
  └────┬─────┘
       │
  ┌────▼─────┐
  │ Running  │  ← At least one container is running
  └────┬─────┘
       │
  ┌────▼──────────┐     ┌──────────┐
  │  Succeeded    │     │  Failed  │  ← All containers exited
  │  (exit 0)     │     │(non-zero)│
  └───────────────┘     └──────────┘
```

**Pod conditions:**
- `PodScheduled` — assigned to a node
- `Initialized` — all init containers completed
- `ContainersReady` — all containers passed readiness probes
- `Ready` — pod is ready to serve traffic

### Q: Explain resource requests and limits.

```yaml
resources:
  requests:          # Guaranteed minimum — scheduler uses this
    memory: "256Mi"  # 256 mebibytes
    cpu: "250m"      # 250 millicores = 0.25 CPU core
  limits:            # Maximum allowed — container is killed/throttled if exceeded
    memory: "512Mi"  # OOMKilled if exceeded
    cpu: "500m"      # Throttled (not killed) if exceeded
```

**Key rules:**
- **Requests** are what the scheduler uses to place pods on nodes
- **Limits** are enforced at runtime
- If memory limit is exceeded → container is **OOMKilled** (hard kill)
- If CPU limit is exceeded → container is **throttled** (still runs, just slower)
- Best practice: set requests = expected usage, limits = 2x requests for memory
- **Never** set CPU limits in most cases (causes unnecessary throttling) — this is debated, but Google's recommendation

**QoS Classes (based on requests/limits):**

| Class | Condition | Eviction Priority |
|---|---|---|
| **Guaranteed** | requests == limits for all containers | Last to be evicted |
| **Burstable** | requests < limits (or only requests set) | Middle |
| **BestEffort** | No requests or limits set | First to be evicted |

### Q: Explain health probes in Kubernetes.

**Three types of probes:**

| Probe | Question It Answers | Action on Failure |
|---|---|---|
| **Liveness** | Is the container alive? | Restart the container |
| **Readiness** | Can it accept traffic? | Remove from Service endpoints (no traffic) |
| **Startup** | Has the app finished starting? | Keep checking (delays liveness/readiness) |

**Probe methods:**
- `httpGet` — HTTP GET request (most common for web apps)
- `tcpSocket` — TCP connection check
- `exec` — Run a command in the container
- `grpc` — gRPC health check (K8s 1.24+)

### Full Pod YAML Example: NestJS with Health Probes and Resource Limits

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nestjs-api
  labels:
    app: api-service
    version: v1.2.3
    team: backend
spec:
  containers:
    - name: api
      image: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/api:v1.2.3
      ports:
        - containerPort: 3000
          name: http
          protocol: TCP
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          # cpu limit intentionally omitted — avoid unnecessary throttling
      livenessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 15    # wait 15s before first check
        periodSeconds: 10          # check every 10s
        timeoutSeconds: 3          # timeout after 3s
        failureThreshold: 3        # restart after 3 consecutive failures
        successThreshold: 1        # 1 success to be considered alive
      readinessProbe:
        httpGet:
          path: /health/ready      # separate endpoint that checks DB, Redis, etc.
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3
        successThreshold: 1
      startupProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 0
        periodSeconds: 5
        failureThreshold: 30       # 30 * 5s = 150s max startup time
      env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: redis-url
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}
  restartPolicy: Always
```

**NestJS health check controller (for reference):**

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: MicroserviceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  liveness() {
    // Basic liveness — just return 200
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    // Readiness — check all dependencies
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis', { transport: Transport.REDIS }),
    ]);
  }
}
```

---

## Q3: Deployments & ReplicaSets

### Q: What is a Deployment and how does it relate to ReplicaSets?

**A:** A Deployment is a higher-level abstraction that manages ReplicaSets, which in turn manage Pods.

```
Deployment (manages rollouts/rollbacks)
  └── ReplicaSet (ensures N replicas)
        ├── Pod 1
        ├── Pod 2
        └── Pod 3
```

**Hierarchy:**
- **Deployment** — declares desired state, manages rollout strategy
- **ReplicaSet** — ensures the specified number of pod replicas are running
- **Pod** — the actual running container(s)

You almost never create ReplicaSets directly. Deployments create and manage them automatically.

### Q: Explain rolling update vs recreate strategies.

**Rolling Update (default):**

```
Time 0:  [v1] [v1] [v1]           ← 3 old pods
Time 1:  [v1] [v1] [v1] [v2]     ← 1 new pod starting (maxSurge: 1)
Time 2:  [v1] [v1] [v2]          ← 1 old pod terminated
Time 3:  [v1] [v1] [v2] [v2]     ← another new pod starting
Time 4:  [v1] [v2] [v2]          ← another old pod terminated
Time 5:  [v1] [v2] [v2] [v2]     ← last new pod starting
Time 6:  [v2] [v2] [v2]          ← all updated, zero downtime
```

**Recreate (with downtime):**

```
Time 0:  [v1] [v1] [v1]           ← 3 old pods
Time 1:  (empty)                   ← ALL old pods killed
Time 2:  [v2] [v2] [v2]          ← ALL new pods started
```

| Parameter | Description | Default |
|---|---|---|
| `maxSurge` | Max pods above desired count during update | 25% |
| `maxUnavailable` | Max pods that can be unavailable during update | 25% |

**Zero-downtime config:** `maxSurge: 1, maxUnavailable: 0` (always have at least N pods running)

### Full Deployment YAML for NestJS App

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  labels:
    app: api-service
    team: backend
  annotations:
    kubernetes.io/change-cause: "Deploy v1.2.3 - add user profile endpoint"
spec:
  replicas: 3
  revisionHistoryLimit: 10          # keep 10 old ReplicaSets for rollback
  selector:
    matchLabels:
      app: api-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                   # allow 1 extra pod during update
      maxUnavailable: 0             # never have fewer than 3 pods
  template:
    metadata:
      labels:
        app: api-service
        version: v1.2.3
    spec:
      affinity:
        podAntiAffinity:            # spread pods across nodes
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - api-service
                topologyKey: kubernetes.io/hostname
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/api:v1.2.3
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: NODE_ENV
              value: "production"
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
                # Allow time for load balancer to deregister pod
                # before SIGTERM is sent to the process
```

### Q: How do you rollback a deployment?

```bash
# Check rollout status
kubectl rollout status deployment/api-service

# View rollout history
kubectl rollout history deployment/api-service

# View details of a specific revision
kubectl rollout history deployment/api-service --revision=3

# Rollback to previous version
kubectl rollout undo deployment/api-service

# Rollback to a specific revision
kubectl rollout undo deployment/api-service --to-revision=2

# Pause a rollout (for canary-like manual control)
kubectl rollout pause deployment/api-service

# Resume a paused rollout
kubectl rollout resume deployment/api-service
```

### Q: Explain Blue-Green and Canary deployments in K8s context.

**Blue-Green Deployment:**

```yaml
# Two deployments exist simultaneously
# api-service-blue (current, serving traffic)
# api-service-green (new version, waiting)

# Service points to blue:
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api-service
    slot: blue          # ← switch to "green" to flip traffic
  ports:
    - port: 80
      targetPort: 3000
```

Switch traffic by updating the selector from `slot: blue` to `slot: green`. Instant rollback by switching back.

**Canary Deployment (native K8s — limited):**

```bash
# Run 3 replicas of v1 and 1 replica of v2 (25% traffic to canary)
# Both deployments have the same label "app: api-service"
# Service sends traffic to all pods matching the label
```

For proper canary with percentage-based routing, use Istio or Argo Rollouts (covered in Q11).

---

## Q4: Services — Networking

### Q: What is a Kubernetes Service and why do you need it?

**A:** Pods are ephemeral — they get new IP addresses when recreated. A Service provides a stable network endpoint (DNS name + IP) that routes traffic to the right set of Pods, even as they come and go.

### Q: Explain the four Service types.

```
                        EXTERNAL TRAFFIC
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                  │
     ┌──────▼──────┐  ┌──────▼──────┐          │
     │ LoadBalancer │  │  NodePort   │          │
     │ (cloud LB)  │  │ (30000-     │          │
     │              │  │  32767)     │          │
     └──────┬───────┘  └──────┬──────┘          │
            │                 │                  │
            └────────┬────────┘                  │
                     │                           │
              ┌──────▼──────┐          ┌─────────▼──────┐
              │  ClusterIP  │          │  ExternalName  │
              │ (internal)  │          │  (DNS CNAME)   │
              └──────┬──────┘          └────────────────┘
                     │
              ┌──────▼──────┐
              │    Pods     │
              └─────────────┘
```

| Type | Access | Use Case | Example |
|---|---|---|---|
| **ClusterIP** | Internal only | Service-to-service communication | API → Database |
| **NodePort** | External via node IP:port | Development, testing | Quick external access without LB |
| **LoadBalancer** | External via cloud LB | Production external services | Public-facing API |
| **ExternalName** | DNS alias | Point to external service | Map `db` to `mydb.us-east-1.rds.amazonaws.com` |

### Service YAML Examples

**ClusterIP (default — internal only):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
spec:
  type: ClusterIP             # default, can be omitted
  selector:
    app: api-service          # routes to pods with this label
  ports:
    - name: http
      port: 80                # port the Service listens on
      targetPort: 3000        # port on the container
      protocol: TCP
```

**NodePort:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service-nodeport
spec:
  type: NodePort
  selector:
    app: api-service
  ports:
    - port: 80
      targetPort: 3000
      nodePort: 30080         # optional: specify port (30000-32767)
```

**LoadBalancer (cloud provider creates actual LB):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service-lb
  annotations:
    # AWS-specific annotations for NLB
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: api-service
  ports:
    - port: 80
      targetPort: 3000
```

**ExternalName:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database
spec:
  type: ExternalName
  externalName: mydb.abc123.us-east-1.rds.amazonaws.com
  # No selector — this is just a DNS alias
```

### Q: How does K8s service discovery work?

**DNS-based discovery (primary method):**

```
<service-name>.<namespace>.svc.cluster.local

Examples:
  api-service.production.svc.cluster.local     → full FQDN
  api-service.production                        → within the cluster
  api-service                                   → within the same namespace
```

Every Service gets a DNS entry automatically via CoreDNS. Pods can access services by name.

```typescript
// In NestJS app running in "production" namespace:
// Access a service in the same namespace:
const redisUrl = 'redis://redis-service:6379';

// Access a service in a different namespace:
const loggingUrl = 'http://log-aggregator.monitoring:8080';
```

### Q: What are Headless Services?

**A:** A headless service (ClusterIP: None) does not get a virtual IP. Instead, DNS returns the individual pod IPs directly. Used with StatefulSets.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None              # ← this makes it headless
  selector:
    app: postgres
  ports:
    - port: 5432
```

**DNS resolution for headless service:**
```
postgres-headless.default.svc.cluster.local → returns A records for ALL pods
postgres-0.postgres-headless.default.svc.cluster.local → specific pod
postgres-1.postgres-headless.default.svc.cluster.local → specific pod
```

### Decision Table: Which Service Type?

| Scenario | Service Type |
|---|---|
| Backend API called only by other services | ClusterIP |
| Quick dev/test external access | NodePort |
| Production public-facing service | LoadBalancer (or ClusterIP + Ingress) |
| Point to external database (RDS) | ExternalName |
| StatefulSet direct pod access | Headless (ClusterIP: None) |
| HTTP routing with path/host rules | ClusterIP + Ingress Controller |

---

## Q5: ConfigMaps & Secrets

### Q: What are ConfigMaps and how do you use them?

**A:** ConfigMaps store non-sensitive configuration data as key-value pairs. They decouple configuration from container images.

**Creating ConfigMaps:**

```bash
# From literal values
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=REDIS_URL=redis://redis-service:6379

# From a file
kubectl create configmap nginx-config --from-file=nginx.conf

# From a .env file
kubectl create configmap env-config --from-env-file=.env.production
```

**ConfigMap YAML:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  LOG_LEVEL: "info"
  REDIS_URL: "redis://redis-service:6379"
  MAX_CONNECTIONS: "100"
  # Multi-line config file
  config.json: |
    {
      "features": {
        "enableNewUI": true,
        "maxUploadSize": "10MB"
      }
    }
```

**Using ConfigMap as environment variables:**

```yaml
spec:
  containers:
    - name: api
      image: api:v1.2.3
      env:
        # Individual keys
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL
      envFrom:
        # All keys as env vars at once
        - configMapRef:
            name: app-config
```

**Using ConfigMap as mounted files (supports hot-reload):**

```yaml
spec:
  containers:
    - name: api
      volumeMounts:
        - name: config-volume
          mountPath: /app/config
          readOnly: true
  volumes:
    - name: config-volume
      configMap:
        name: app-config
        items:
          - key: config.json
            path: config.json    # creates /app/config/config.json
```

> **Hot reload:** When ConfigMap is mounted as a volume, K8s updates the file automatically (within ~1 minute). Your app needs to watch for file changes to pick up the update. Environment variables do NOT hot-reload — pod restart required.

### Q: How do Secrets work? Are they actually secure?

**A:** Secrets store sensitive data. They are base64-encoded (NOT encrypted by default). This is a common interview gotcha.

```bash
# Base64 is encoding, not encryption:
echo -n "my-password" | base64
# bXktcGFzc3dvcmQ=

echo "bXktcGFzc3dvcmQ=" | base64 -d
# my-password        ← anyone can decode this!
```

**Secret YAML:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
data:
  # base64 encoded values
  username: cG9zdGdyZXM=              # "postgres"
  password: c3VwZXItc2VjcmV0LXB3ZA==  # "super-secret-pwd"
  url: cG9zdGdyZXNxbDovL3Bvc3RncmVzOnN1cGVyLXNlY3JldC1wd2RAcG9zdGdyZXMtc2VydmljZTo1NDMyL215ZGI=
```

**Using stringData (plain text, auto-encoded):**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:                            # K8s encodes this for you
  username: postgres
  password: super-secret-pwd
  url: postgresql://postgres:super-secret-pwd@postgres-service:5432/mydb
```

**Secret Types:**

| Type | Use Case |
|---|---|
| `Opaque` | Generic secret (default) |
| `kubernetes.io/dockerconfigjson` | Docker registry credentials |
| `kubernetes.io/tls` | TLS certificate and key |
| `kubernetes.io/basic-auth` | Username/password |

**Mounting secrets:**

```yaml
spec:
  containers:
    - name: api
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
      # Or mount as files:
      volumeMounts:
        - name: tls-certs
          mountPath: /etc/tls
          readOnly: true
  volumes:
    - name: tls-certs
      secret:
        secretName: tls-secret
```

### Q: How do you properly manage secrets in production?

**Problem:** K8s secrets are just base64 — not safe for GitOps.

**Solution 1: External Secrets Operator**

```yaml
# ExternalSecret syncs AWS Secrets Manager → K8s Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials           # K8s secret to create
  data:
    - secretKey: url               # key in K8s secret
      remoteRef:
        key: production/db-url     # key in AWS Secrets Manager
```

**Solution 2: Sealed Secrets (for GitOps)**

```bash
# Encrypt a secret so it can be safely committed to git
kubeseal --format=yaml < my-secret.yaml > sealed-secret.yaml

# Only the Sealed Secrets controller in the cluster can decrypt it
```

**Best Practices:**
- Never commit plain Secrets to git
- Use External Secrets Operator with AWS Secrets Manager / HashiCorp Vault
- Enable etcd encryption at rest (EKS does this by default)
- Use RBAC to restrict Secret access
- Rotate secrets regularly
- Use `stringData` in dev, external secret management in prod

---

## Q6: Namespaces

### Q: What are namespaces and how do you use them?

**A:** Namespaces are virtual clusters within a physical K8s cluster. They provide isolation for resources, names, and access control.

**Default namespaces:**

| Namespace | Purpose |
|---|---|
| `default` | Where resources go if no namespace specified |
| `kube-system` | K8s system components (CoreDNS, kube-proxy, metrics-server) |
| `kube-public` | Publicly readable (cluster info), rarely used |
| `kube-node-lease` | Node heartbeat tracking |

**Common namespace strategies:**

```bash
# By environment
kubectl create namespace development
kubectl create namespace staging
kubectl create namespace production

# By team
kubectl create namespace team-backend
kubectl create namespace team-frontend

# By both
kubectl create namespace backend-production
kubectl create namespace backend-staging
```

### Q: How do you set resource quotas per namespace?

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"           # total CPU requests across all pods
    requests.memory: "20Gi"      # total memory requests
    limits.cpu: "20"             # total CPU limits
    limits.memory: "40Gi"        # total memory limits
    pods: "50"                   # max number of pods
    services: "20"               # max number of services
    persistentvolumeclaims: "10" # max PVCs
    secrets: "50"
    configmaps: "50"
```

### Q: What is a LimitRange?

**A:** LimitRange sets default resource requests/limits for pods that don't specify them.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - type: Container
      default:                    # default limits
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:             # default requests
        cpu: "100m"
        memory: "128Mi"
      max:                        # maximum allowed
        cpu: "2"
        memory: "4Gi"
      min:                        # minimum allowed
        cpu: "50m"
        memory: "64Mi"
```

### Q: How do Network Policies restrict traffic between namespaces?

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-other-namespaces
  namespace: production
spec:
  podSelector: {}                  # apply to all pods in namespace
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: production     # only allow traffic from production namespace
        - namespaceSelector:
            matchLabels:
              name: monitoring     # and monitoring namespace
```

**Common kubectl namespace commands:**

```bash
# List namespaces
kubectl get namespaces

# Set default namespace for kubectl
kubectl config set-context --current --namespace=production

# Run command in specific namespace
kubectl get pods -n production

# Get resources across all namespaces
kubectl get pods --all-namespaces   # or -A
```

---

## Q7: StatefulSets

### Q: What is a StatefulSet and how is it different from a Deployment?

| Feature | Deployment | StatefulSet |
|---|---|---|
| **Pod names** | Random (api-7d8f6c-xk2q) | Ordered (postgres-0, postgres-1, postgres-2) |
| **Pod identity** | Interchangeable | Stable, persistent |
| **Storage** | Shared or ephemeral | Each pod gets its own PVC |
| **Scaling order** | All at once | Sequential (0→1→2 up, 2→1→0 down) |
| **DNS** | Via Service only | Individual pod DNS |
| **Use case** | Stateless apps | Databases, Kafka, ZooKeeper, Redis Cluster |

### Q: StatefulSet YAML Example — PostgreSQL

```yaml
# 1. Headless Service (required for StatefulSet)
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: production
spec:
  clusterIP: None                   # headless — no virtual IP
  selector:
    app: postgres
  ports:
    - port: 5432
      name: postgres
---
# 2. StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless    # must match headless service name
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
              name: postgres
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          livenessProbe:
            exec:
              command: ["pg_isready", "-U", "postgres"]
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "postgres"]
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:              # each pod gets its own PVC
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3        # AWS EBS gp3
        resources:
          requests:
            storage: 50Gi
```

**What happens with 3 replicas:**

```
postgres-0 → PVC: postgres-data-postgres-0 (50Gi)
             DNS: postgres-0.postgres-headless.production.svc.cluster.local
postgres-1 → PVC: postgres-data-postgres-1 (50Gi)
             DNS: postgres-1.postgres-headless.production.svc.cluster.local
postgres-2 → PVC: postgres-data-postgres-2 (50Gi)
             DNS: postgres-2.postgres-headless.production.svc.cluster.local
```

**Scaling behavior:**
- Scale up: creates postgres-3, then postgres-4 (sequential)
- Scale down: deletes postgres-4 first, then postgres-3 (reverse order)
- PVCs are NOT deleted when pods are deleted (data preservation)

> **BD context:** In most cases, you should NOT run databases on K8s. Use managed services (RDS, Cloud SQL, Atlas). StatefulSets are complex and require backup/recovery expertise. Use StatefulSets for truly distributed systems like Kafka, Elasticsearch, or Redis Cluster.

---

## Q8: Horizontal Pod Autoscaler (HPA) & Vertical Pod Autoscaler (VPA)

### Q: How does the Horizontal Pod Autoscaler work?

**A:** HPA automatically adjusts the number of pod replicas based on observed metrics.

```
Metrics Server → HPA Controller → Checks every 15s → Scale Deployment
                                     │
                  CPU > 70%? ────────┤
                  Memory > 80%? ─────┤
                  Custom metric? ────┘
                                     │
                            Scale up/down replicas
```

**HPA YAML:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70     # target 70% CPU usage
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80     # target 80% memory usage
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60  # wait 60s before scaling up again
      policies:
        - type: Pods
          value: 4                    # add max 4 pods at a time
          periodSeconds: 60
        - type: Percent
          value: 100                  # or double the pods
          periodSeconds: 60
      selectPolicy: Max               # use whichever adds more
    scaleDown:
      stabilizationWindowSeconds: 300 # wait 5min before scaling down
      policies:
        - type: Pods
          value: 1                    # remove max 1 pod at a time
          periodSeconds: 60
```

**Key HPA concepts:**

```bash
# Check HPA status
kubectl get hpa
# NAME              REFERENCE                TARGETS   MINPODS   MAXPODS   REPLICAS
# api-service-hpa   Deployment/api-service   45%/70%   3         20        5

# Detailed view
kubectl describe hpa api-service-hpa
```

**Scaling formula:**
```
desiredReplicas = ceil(currentReplicas * (currentMetricValue / desiredMetricValue))

Example: 5 replicas at 90% CPU, target 70%
desiredReplicas = ceil(5 * (90/70)) = ceil(6.43) = 7
```

### Q: Explain the Vertical Pod Autoscaler.

**A:** VPA adjusts pod resource requests and limits (not replica count).

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  updatePolicy:
    updateMode: "Auto"             # or "Off" for recommendation-only
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed:
          cpu: "100m"
          memory: "128Mi"
        maxAllowed:
          cpu: "2"
          memory: "4Gi"
```

**VPA modes:**

| Mode | Behavior |
|---|---|
| `Off` | Only provides recommendations (view with kubectl) |
| `Initial` | Sets resources only at pod creation |
| `Auto` | Evicts pods and recreates with new resources |

> **Important:** Do not use HPA and VPA on the same CPU/memory metric simultaneously. They will conflict. You can use HPA on CPU + VPA on memory, or use HPA for scaling and VPA in `Off` mode for sizing recommendations.

### Q: What is KEDA and when would you use it?

**A:** KEDA (Kubernetes Event-Driven Autoscaling) extends HPA to scale based on external event sources. Its killer feature is **scale to zero**.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor          # Deployment name
  minReplicaCount: 0               # scale to zero when idle!
  maxReplicaCount: 50
  cooldownPeriod: 300              # 5 min before scaling to zero
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.ap-southeast-1.amazonaws.com/123456789/orders
        queueLength: "5"           # scale up when > 5 messages per pod
        awsRegion: ap-southeast-1
      authenticationRef:
        name: aws-credentials
---
# KEDA with Kafka consumer lag
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: event-consumer
spec:
  scaleTargetRef:
    name: event-consumer
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-broker:9092
        consumerGroup: event-processor
        topic: events
        lagThreshold: "100"        # scale when lag > 100 per partition
```

**KEDA triggers include:** AWS SQS, Kafka, RabbitMQ, Redis, PostgreSQL, Cron, Prometheus metrics, HTTP request count, and 60+ more.

---

## Q9: Helm — Package Manager for K8s

### Q: What is Helm and why use it?

**A:** Helm is a package manager for Kubernetes. It packages related K8s manifests into reusable, configurable "charts."

**Without Helm:** You manage 10+ YAML files per service, copy-paste between environments, and manually track versions.

**With Helm:** One chart per service with configurable values per environment.

### Helm Chart Structure

```
my-api-chart/
├── Chart.yaml              # Chart metadata (name, version, description)
├── values.yaml             # Default configuration values
├── values-staging.yaml     # Environment-specific overrides
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl        # Template helper functions
│   ├── deployment.yaml     # Deployment template
│   ├── service.yaml        # Service template
│   ├── ingress.yaml        # Ingress template
│   ├── hpa.yaml            # HPA template
│   ├── configmap.yaml      # ConfigMap template
│   ├── secret.yaml         # Secret template (or ExternalSecret)
│   └── serviceaccount.yaml
└── charts/                 # Chart dependencies
```

**Chart.yaml:**

```yaml
apiVersion: v2
name: api-service
description: NestJS API Service Helm Chart
type: application
version: 0.1.0              # chart version
appVersion: "1.2.3"         # application version
dependencies:
  - name: redis
    version: "17.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: redis.enabled
```

**values.yaml (default):**

```yaml
replicaCount: 2

image:
  repository: 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/api
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilization: 70

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: api-tls
      hosts:
        - api.example.com

env:
  NODE_ENV: production
  LOG_LEVEL: info

secrets:
  externalSecretName: db-credentials

redis:
  enabled: false
```

**values-production.yaml (override):**

```yaml
replicaCount: 3

image:
  tag: "v1.2.3"

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  minReplicas: 3
  maxReplicas: 20

ingress:
  hosts:
    - host: api.mycompany.com
      paths:
        - path: /
          pathType: Prefix
```

**Template example (templates/deployment.yaml):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api-service.fullname" . }}
  labels:
    {{- include "api-service.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "api-service.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "api-service.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
```

### Essential Helm Commands

```bash
# Install a chart
helm install api-service ./my-api-chart \
  -f values-production.yaml \
  -n production

# Upgrade (deploy new version)
helm upgrade api-service ./my-api-chart \
  -f values-production.yaml \
  --set image.tag=v1.3.0 \
  -n production

# Rollback to previous release
helm rollback api-service 1 -n production

# List releases
helm list -n production

# Show release history
helm history api-service -n production

# Uninstall
helm uninstall api-service -n production

# Dry run — see what would be applied without applying
helm install api-service ./my-api-chart \
  -f values-production.yaml \
  --dry-run --debug

# Template — render templates locally
helm template api-service ./my-api-chart -f values-production.yaml

# Add a repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Search for charts
helm search repo nginx
```

### Helm vs Kustomize

| Feature | Helm | Kustomize |
|---|---|---|
| **Approach** | Templating (Go templates) | Patching (overlay-based) |
| **Complexity** | Higher (template syntax) | Lower (plain YAML) |
| **Reusability** | Charts are reusable packages | Overlays per environment |
| **Package management** | Yes (repositories, versions) | No |
| **Rollback** | Built-in (`helm rollback`) | Manual (reapply old config) |
| **Built into kubectl** | No (separate binary) | Yes (`kubectl apply -k`) |
| **Best for** | Shared/public charts, complex apps | Simple env-specific overrides |

> **Practical recommendation:** Use Helm for deploying third-party software (nginx, redis, postgres) and for your own services when you have many environments. Use Kustomize for simple overlay scenarios.

---

## Q10: Ingress & Ingress Controllers

### Q: What is an Ingress and why not just use LoadBalancer Services?

**A:** An Ingress provides HTTP/HTTPS routing rules. Without Ingress, each public service needs its own LoadBalancer (= its own cloud LB = expensive). With Ingress, one LoadBalancer serves as the entry point and routes traffic based on host/path.

```
Without Ingress (expensive):          With Ingress (efficient):

LB ($18/mo) → api-service             LB ($18/mo) → Ingress Controller
LB ($18/mo) → admin-service                            ├── /api  → api-service
LB ($18/mo) → web-service                              ├── /admin → admin-service
                                                        └── /     → web-service
= $54/month                           = $18/month
```

### Q: What is an Ingress Controller?

**A:** An Ingress resource is just a set of rules. The Ingress Controller is the actual implementation that reads those rules and configures the proxy accordingly.

**Popular Ingress Controllers:**

| Controller | Provider | Notes |
|---|---|---|
| **NGINX Ingress** | Community/NGINX | Most popular, battle-tested |
| **AWS ALB Ingress** | AWS | Ties directly to Application Load Balancer |
| **Traefik** | Traefik Labs | Auto-discovery, Let's Encrypt built-in |
| **Istio Gateway** | Istio | Part of Istio service mesh |
| **Kong Ingress** | Kong | API gateway features |

### NGINX Ingress YAML with Path-Based and Host-Based Routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
        - admin.example.com
      secretName: example-com-tls    # TLS cert stored as K8s secret
  rules:
    # Host-based routing
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 80
---
# Path-based routing on a single host
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api(/|$)(.*)       # /api/users → /users
            pathType: ImplementationSpecific
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /admin(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: admin-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
```

### AWS ALB Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-alb-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip           # required for Fargate
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/group.name: my-app        # share ALB across ingresses
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

**Key difference:** NGINX Ingress runs as pods inside your cluster and you put a cloud LB in front. AWS ALB Ingress Controller creates an actual AWS ALB that routes directly to pod IPs (no extra proxy hop).

---

## Q11: K8s Deployment Strategies

### Q: Compare deployment strategies in Kubernetes.

| Strategy | Downtime | Risk | Rollback Speed | Complexity | Resource Cost |
|---|---|---|---|---|---|
| **Rolling Update** | None | Medium | Minutes | Low | +25% temporarily |
| **Recreate** | Yes | Low (all or nothing) | Minutes | Low | None |
| **Blue-Green** | None | Low | Instant | Medium | 2x resources |
| **Canary** | None | Very Low | Instant | High | +5-10% |
| **A/B Testing** | None | Very Low | Instant | High | +5-10% |

### Rolling Update (Native K8s)

Already covered in Q3. This is the default and handles most use cases.

### Blue-Green with Native K8s

```bash
# 1. Deploy green (new version) alongside blue (current)
kubectl apply -f deployment-green.yaml

# 2. Wait for green to be ready
kubectl rollout status deployment/api-green

# 3. Switch service selector to green
kubectl patch service api-service -p '{"spec":{"selector":{"slot":"green"}}}'

# 4. Verify, then scale down blue
kubectl scale deployment api-blue --replicas=0
```

### Canary with Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-service
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
        - name: api
          image: api:v1.3.0
          ports:
            - containerPort: 3000
  strategy:
    canary:
      steps:
        - setWeight: 5             # 5% traffic to canary
        - pause: { duration: 5m }  # observe for 5 minutes
        - setWeight: 20            # increase to 20%
        - pause: { duration: 5m }
        - setWeight: 50            # 50/50
        - pause: { duration: 5m }
        - setWeight: 80
        - pause: { duration: 2m }
        # 100% — promotion
      canaryService: api-canary
      stableService: api-stable
      trafficRouting:
        nginx:
          stableIngress: api-ingress
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2            # start analysis at step 2
        args:
          - name: service-name
            value: api-canary
---
# Analysis template — auto-rollback if error rate > 5%
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      interval: 60s
      successCondition: result[0] >= 0.95
      failureLimit: 3
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status=~"2.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
```

### Decision Matrix

| Scenario | Recommended Strategy |
|---|---|
| Standard web API deployment | Rolling Update |
| Database schema change with breaking changes | Blue-Green (instant switch) |
| High-traffic service, need to validate new version | Canary with Argo Rollouts |
| Feature flag testing with specific user segments | A/B Testing (Istio) |
| Batch processing / workers (brief downtime OK) | Recreate |
| Startup with 2 services, keep it simple | Rolling Update |
| Enterprise with SLAs, complex microservices | Canary + automated analysis |

---

## Q12: Service Mesh (Istio/Linkerd Basics)

### Q: What is a service mesh and what problems does it solve?

**A:** A service mesh is a dedicated infrastructure layer that handles service-to-service communication. It provides networking features without changing application code.

```
Without service mesh:                 With service mesh (Istio):

┌───────┐    HTTP     ┌───────┐      ┌───────┐  ┌───────┐    ┌───────┐  ┌───────┐
│  App  │ ──────────→ │  App  │      │  App  │→ │ Envoy │ →  │ Envoy │→ │  App  │
│   A   │             │   B   │      │   A   │  │ Proxy │    │ Proxy │  │   B   │
└───────┘             └───────┘      └───────┘  └───────┘    └───────┘  └───────┘
                                                   ↑               ↑
No encryption, no retries,                    mTLS, retries, circuit breaking,
no observability, manual config               tracing, metrics — automatically
```

**What a service mesh provides:**

| Feature | Description |
|---|---|
| **mTLS** | Automatic mutual TLS encryption between all services |
| **Traffic Management** | Canary deployments, fault injection, retries, timeouts |
| **Observability** | Distributed tracing, metrics, service topology map |
| **Circuit Breaking** | Prevent cascade failures |
| **Rate Limiting** | Control traffic per service |
| **Access Control** | Fine-grained authorization policies |

### Q: Explain the sidecar proxy pattern.

Every pod gets an Envoy proxy container injected automatically (sidecar injection). All inbound and outbound traffic flows through the proxy.

```yaml
# Istio sidecar injection — just add a label to the namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    istio-injection: enabled    # all pods in this namespace get Envoy sidecar
```

### Q: Istio traffic management example — Canary routing

```yaml
# VirtualService — route 90% to v1, 10% to v2
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
            subset: v1
          weight: 90
        - destination:
            host: api-service
            subset: v2
          weight: 10
      retries:
        attempts: 3
        perTryTimeout: 2s
      timeout: 10s
---
# DestinationRule — define subsets and circuit breaking
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:              # circuit breaking
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### Q: When do you need a service mesh vs when is it overkill?

> **BD context:** "For most BD companies with <20 services, a service mesh adds complexity. Start with simple K8s services + NGINX ingress. Add a service mesh when you actually need mTLS, advanced traffic management, or distributed tracing across many services."

**Skip service mesh when:**
- Fewer than 10 microservices
- Team is not experienced with K8s yet
- Simple request patterns (no canary, no fault injection)
- Can handle observability with simpler tools (Datadog APM, basic Prometheus)

**Consider service mesh when:**
- 20+ microservices
- Strict security requirements (mTLS everywhere, zero-trust)
- Need advanced traffic management (canary by header, fault injection)
- Complex service topology needing deep observability
- Compliance requirements (audit trails for service communication)

**Istio vs Linkerd:**

| Feature | Istio | Linkerd |
|---|---|---|
| **Complexity** | High | Low |
| **Resource overhead** | Higher | Lower |
| **Features** | Full-featured | Focused on core features |
| **Learning curve** | Steep | Gentle |
| **Community** | Large | Smaller but growing |
| **Best for** | Enterprise, complex needs | Simpler setups, getting started |

---

## Q13: K8s Troubleshooting

### Essential kubectl Commands

```bash
# ─── Pod Status ───
kubectl get pods -n production                   # list pods
kubectl get pods -n production -o wide           # show node, IP
kubectl get pods -n production -w                # watch for changes

# ─── Pod Details ───
kubectl describe pod api-service-7d8f6c-xk2q -n production
# Shows: events, conditions, container status, resource usage

# ─── Logs ───
kubectl logs api-service-7d8f6c-xk2q -n production
kubectl logs api-service-7d8f6c-xk2q -n production -f           # follow/stream
kubectl logs api-service-7d8f6c-xk2q -n production --previous   # crashed container logs
kubectl logs api-service-7d8f6c-xk2q -n production -c sidecar   # specific container
kubectl logs -l app=api-service -n production                    # all pods with label

# ─── Interactive Shell ───
kubectl exec -it api-service-7d8f6c-xk2q -n production -- sh
kubectl exec -it api-service-7d8f6c-xk2q -n production -- /bin/bash

# ─── Resource Usage ───
kubectl top pods -n production                   # CPU/memory per pod
kubectl top nodes                                 # CPU/memory per node

# ─── Events (crucial for debugging) ───
kubectl get events -n production --sort-by=.lastTimestamp
kubectl get events -n production --field-selector type=Warning

# ─── Service/Networking ───
kubectl get svc -n production
kubectl get endpoints api-service -n production  # see which pods back the service
kubectl get ingress -n production

# ─── Deployments ───
kubectl get deployments -n production
kubectl rollout status deployment/api-service -n production
kubectl rollout history deployment/api-service -n production

# ─── General Debugging ───
kubectl get all -n production                    # everything in namespace
kubectl api-resources                            # list all resource types
kubectl explain deployment.spec.strategy         # inline docs for any field
```

### Common Issues and Diagnosis

#### CrashLoopBackOff

```
STATUS: CrashLoopBackOff
MEANING: Container crashes immediately after starting, K8s keeps restarting it
         (with exponential backoff: 10s, 20s, 40s, ... up to 5min)
```

**Diagnosis:**

```bash
# 1. Check logs from the crashed container
kubectl logs <pod> --previous

# 2. Check events
kubectl describe pod <pod>

# Common causes:
# - App throws error on startup (missing env var, can't connect to DB)
# - Liveness probe fails too quickly (increase initialDelaySeconds)
# - Out of memory (check resource limits)
# - Missing config file or secret
# - Permission issue (wrong user, read-only filesystem)
```

#### ImagePullBackOff

```
STATUS: ImagePullBackOff / ErrImagePull
MEANING: K8s cannot pull the container image
```

```bash
# Check events for details
kubectl describe pod <pod>

# Common causes:
# - Image name typo: "api:v1.2.3" vs "api:v1.2.4"
# - Private registry without imagePullSecret
# - ECR token expired (need to refresh)
# - Image doesn't exist (not built/pushed yet)

# Fix: Check image name, add imagePullSecret
kubectl create secret docker-registry ecr-secret \
  --docker-server=123456789.dkr.ecr.ap-southeast-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password)
```

#### Pending Pod

```
STATUS: Pending
MEANING: Pod cannot be scheduled to any node
```

```bash
# Check events
kubectl describe pod <pod>

# Common causes:
# - Insufficient resources: "0/3 nodes are available: 3 Insufficient memory"
#   → Scale up node group or reduce resource requests
# - Node selector/affinity mismatch: pod requires GPU node, none available
# - PVC not bound: storage class doesn't exist or no capacity
# - Taints and tolerations: node is tainted, pod doesn't tolerate it

# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"
kubectl top nodes
```

#### OOMKilled

```
STATUS: OOMKilled (Exit Code 137)
MEANING: Container exceeded its memory limit
```

```bash
# Check previous container status
kubectl describe pod <pod>
# Look for: "Last State: Terminated, Reason: OOMKilled"

# Fixes:
# - Increase memory limit
# - Fix memory leak in app (Node.js: check for event listener leaks, unbounded caches)
# - Set proper NODE_OPTIONS for Node.js:
#   NODE_OPTIONS="--max-old-space-size=384"  (for 512Mi limit)
```

#### Service Not Accessible

```bash
# 1. Check service exists and has endpoints
kubectl get svc api-service -n production
kubectl get endpoints api-service -n production
# If endpoints are empty → labels don't match

# 2. Verify pod labels match service selector
kubectl get pods -n production --show-labels
kubectl get svc api-service -n production -o yaml | grep selector -A 5

# 3. Test from inside the cluster
kubectl run debug --image=busybox -it --rm -- sh
  > wget -qO- http://api-service.production:80/health
  > nslookup api-service.production

# 4. Check if pods are Ready
kubectl get pods -n production
# If not Ready → readiness probe is failing
```

#### DNS Resolution Failure

```bash
# Check CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Test DNS from a debug pod
kubectl run debug --image=busybox:1.36 -it --rm -- sh
  > nslookup kubernetes.default
  > nslookup api-service.production.svc.cluster.local

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns
```

### Troubleshooting Flowchart

```
Pod not working?
├── Status: Pending
│   └── Check: kubectl describe pod → Events
│       ├── Insufficient resources → scale nodes or reduce requests
│       ├── No matching node → check nodeSelector/affinity
│       └── PVC pending → check StorageClass
│
├── Status: ImagePullBackOff
│   └── Check: image name, registry access, imagePullSecrets
│
├── Status: CrashLoopBackOff
│   └── Check: kubectl logs --previous
│       ├── App error → fix code/config
│       ├── OOMKilled → increase memory limit
│       └── Probe fails → adjust probe timing
│
├── Status: Running but not Ready
│   └── Check: readiness probe
│       └── Dependency not available → check dependent services
│
└── Status: Running + Ready but no traffic
    └── Check: Service endpoints, Ingress config, DNS
```

---

## Q14: K8s on AWS (EKS)

### Q: What is Amazon EKS?

**A:** Amazon Elastic Kubernetes Service (EKS) is a managed Kubernetes control plane. AWS manages the API server, etcd, scheduler, and controller manager. You manage the worker nodes (or use Fargate for serverless).

### Q: Explain EKS node options.

| Option | Description | Best For |
|---|---|---|
| **Managed Node Groups** | AWS manages EC2 instances, auto-updates | Standard workloads |
| **Self-Managed Nodes** | You manage EC2 instances fully | Custom AMIs, GPU, specific instance types |
| **Fargate Profiles** | Serverless — no nodes to manage | Batch jobs, variable workloads, small clusters |

**EKS + Fargate:**

```yaml
# Fargate Profile: run pods in this namespace serverlessly
apiVersion: eks.amazonaws.com/v1
kind: FargateProfile
metadata:
  name: production-profile
spec:
  selectors:
    - namespace: production
      labels:
        compute: fargate          # only pods with this label go to Fargate
  podExecutionRoleArn: arn:aws:iam::123456789:role/fargate-role
  subnets:
    - subnet-abc123
    - subnet-def456
```

**Fargate considerations:**
- No DaemonSets (no node concept)
- No GPU workloads
- No privileged containers
- Each pod gets its own micro-VM (strong isolation)
- Slightly slower pod startup (~30-60s)
- Good for: batch jobs, dev/staging, cost optimization for intermittent workloads

### Q: Explain IAM Roles for Service Accounts (IRSA).

**Problem:** Pods need to access AWS services (S3, SQS, Secrets Manager). You don't want to hard-code credentials.

**Solution:** IRSA maps K8s service accounts to IAM roles.

```yaml
# 1. Create IAM Role with trust policy for EKS OIDC
# (usually done via Terraform or eksctl)

# 2. K8s ServiceAccount with IAM role annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-service-sa
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/api-service-role

# 3. Pod uses the ServiceAccount
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      serviceAccountName: api-service-sa    # ← pod gets IAM permissions
      containers:
        - name: api
          image: api:v1.2.3
          # AWS SDK automatically uses IRSA credentials
          # No AWS_ACCESS_KEY_ID needed!
```

**How it works:**
1. EKS has an OIDC provider
2. IAM role trusts the OIDC provider for specific service accounts
3. Kubelet injects a JWT token into the pod
4. AWS SDK exchanges the token for temporary IAM credentials
5. Pod can now call AWS APIs with the role's permissions

### Q: eksctl for cluster management

```bash
# Create a cluster
eksctl create cluster \
  --name my-cluster \
  --region ap-southeast-1 \
  --version 1.29 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed

# Create Fargate profile
eksctl create fargateprofile \
  --cluster my-cluster \
  --name production \
  --namespace production

# Enable IRSA (creates OIDC provider)
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --approve

# Create service account with IAM role
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --name api-service-sa \
  --namespace production \
  --attach-policy-arn arn:aws:iam::123456789:policy/api-service-policy \
  --approve

# Update kubeconfig
aws eks update-kubeconfig --name my-cluster --region ap-southeast-1

# Scale node group
eksctl scale nodegroup \
  --cluster my-cluster \
  --name workers \
  --nodes 5
```

### Q: EKS vs ECS — which to choose?

| Feature | EKS | ECS |
|---|---|---|
| **Orchestrator** | Kubernetes | AWS proprietary |
| **Learning curve** | Steep | Moderate |
| **Portability** | Multi-cloud (K8s standard) | AWS only |
| **Ecosystem** | Massive (Helm, Istio, Argo, etc.) | Limited to AWS integrations |
| **Control plane cost** | $73/month | Free |
| **Fargate support** | Yes | Yes |
| **Complexity** | High | Lower |
| **Team size needed** | Medium-large | Small-medium |
| **Best for** | Multi-cloud, large teams, complex needs | AWS-only, smaller teams, simpler needs |

> **BD context:** "For most BD startups, ECS Fargate is the right choice. Simpler to operate, no control plane cost, deep AWS integration. Move to EKS when you need multi-cloud, have 15+ services, or need K8s-specific tooling (Argo, Istio, Helm ecosystem)."

### EKS Cost Breakdown

```
EKS Control Plane:        $0.10/hr  = $73/month

Worker Nodes (example for 3x t3.medium):
  On-Demand:              3 x $0.0416/hr = $90/month
  Reserved (1yr):         3 x $0.026/hr  = $57/month
  Spot:                   3 x ~$0.012/hr = $26/month

Fargate (per pod):
  vCPU:                   $0.04048/hr per vCPU
  Memory:                 $0.004445/hr per GB
  Example pod (0.5 vCPU, 1GB): ~$0.025/hr = $18/month

NAT Gateway (if using private subnets):
  $0.045/hr + $0.045/GB   = $33/month + data transfer

Total (small cluster):     ~$200-400/month
```

---

## Quick Reference

### kubectl Commands Cheat Sheet

```bash
# ─── CONTEXT & CONFIG ───
kubectl config get-contexts                      # list all contexts
kubectl config use-context my-cluster            # switch context
kubectl config set-context --current --namespace=prod  # set default namespace

# ─── CREATE / APPLY ───
kubectl apply -f deployment.yaml                 # create or update
kubectl apply -f ./k8s/                          # apply entire directory
kubectl apply -f deployment.yaml --dry-run=client -o yaml  # preview

# ─── GET / LIST ───
kubectl get pods,svc,deploy -n production        # multiple resource types
kubectl get pods -o wide                         # extra columns
kubectl get pods -o yaml                         # full YAML output
kubectl get pods --sort-by=.status.startTime     # sort by start time
kubectl get pods -l app=api-service              # filter by label

# ─── DESCRIBE / DEBUG ───
kubectl describe pod <name>                      # detailed info + events
kubectl logs <pod> -f --tail=100                 # last 100 lines, follow
kubectl exec -it <pod> -- sh                     # shell into pod
kubectl port-forward svc/api-service 3000:80     # local port forwarding

# ─── UPDATE / SCALE ───
kubectl set image deploy/api-service api=api:v2  # update image
kubectl scale deploy/api-service --replicas=5    # manual scale
kubectl rollout restart deploy/api-service       # restart all pods

# ─── DELETE ───
kubectl delete pod <name>                        # delete specific pod
kubectl delete -f deployment.yaml                # delete from file
kubectl delete pod <name> --grace-period=0 --force  # force delete (use carefully)
```

### K8s Resource Types Summary

| Resource | Short Name | Purpose |
|---|---|---|
| Pod | `po` | Smallest unit, runs containers |
| Deployment | `deploy` | Manages ReplicaSets, rolling updates |
| ReplicaSet | `rs` | Ensures N pod replicas |
| StatefulSet | `sts` | Stateful apps with stable identity |
| DaemonSet | `ds` | One pod per node (monitoring, logging) |
| Job | `job` | Run-to-completion task |
| CronJob | `cj` | Scheduled jobs |
| Service | `svc` | Stable network endpoint |
| Ingress | `ing` | HTTP/HTTPS routing |
| ConfigMap | `cm` | Non-sensitive configuration |
| Secret | `secret` | Sensitive data |
| PersistentVolumeClaim | `pvc` | Storage request |
| Namespace | `ns` | Virtual cluster |
| ServiceAccount | `sa` | Pod identity |
| HorizontalPodAutoscaler | `hpa` | Auto-scale pod count |
| NetworkPolicy | `netpol` | Network access control |
| Node | `no` | Worker machine |

### Deployment Strategies Comparison

```
Rolling Update:  [v1][v1][v1] → [v1][v1][v2] → [v1][v2][v2] → [v2][v2][v2]
                 Zero downtime, gradual, built-in rollback

Recreate:        [v1][v1][v1] → [  ][  ][  ] → [v2][v2][v2]
                 Brief downtime, simple, good for breaking changes

Blue-Green:      [v1][v1][v1]  +  [v2][v2][v2]  →  switch traffic instantly
                 Zero downtime, instant rollback, 2x resources

Canary:          [v1][v1][v1]  +  [v2]  →  monitor  →  gradual shift to v2
                 Zero downtime, lowest risk, complex setup
```

### Common Interview Questions — Short Answers

**Q: What happens when you run `kubectl apply -f deployment.yaml`?**
A: kubectl sends the YAML to the API Server → API Server validates and stores in etcd → Controller Manager detects new Deployment → creates ReplicaSet → Scheduler assigns pods to nodes → kubelet on each node pulls image and starts containers.

**Q: How does K8s handle a node failure?**
A: Node controller notices missed heartbeats (40s timeout) → marks node as `NotReady` → after 5 minutes, evicts pods → ReplicaSet controller detects missing replicas → schedules new pods on healthy nodes.

**Q: What is the difference between a Deployment and a StatefulSet?**
A: Deployment is for stateless apps (pods are interchangeable, random names). StatefulSet is for stateful apps (pods have stable identities like pod-0, ordered scaling, each pod gets its own persistent storage).

**Q: How do you do zero-downtime deployments?**
A: Use Rolling Update strategy with `maxUnavailable: 0`, proper readiness probes, and a `preStop` lifecycle hook with a sleep to allow load balancer deregistration before the pod starts shutting down.

**Q: What is a sidecar container? Give an example.**
A: A helper container running alongside the main container in the same pod. Examples: Envoy proxy for service mesh, Fluentd for log collection, CloudSQL proxy for database connection. They share the same network namespace and can communicate via localhost.

**Q: How do you handle secrets in K8s?**
A: K8s Secrets are only base64-encoded, not encrypted. In production, use External Secrets Operator to sync from AWS Secrets Manager or HashiCorp Vault. Enable etcd encryption at rest. Use RBAC to restrict access. Never commit secrets to git — use Sealed Secrets for GitOps workflows.

---

> **Study tip:** Set up a local K8s cluster with `minikube` or `kind` and practice every YAML example in this guide. The best way to learn K8s is by breaking things and fixing them.
