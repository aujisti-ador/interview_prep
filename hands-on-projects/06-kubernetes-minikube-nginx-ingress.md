# Project 6: Kubernetes Cluster with Minikube + NGINX Ingress

> **Stack**: Minikube + kubectl + Helm + NGINX Ingress + NestJS + PostgreSQL + Redis
> **Relevance**: K8s is expected knowledge for Senior/Lead roles at international companies. Hands-on understanding beats theory.
> **Estimated Build Time**: 6-8 hours

---

## What You'll Learn

- Setting up a local K8s cluster with Minikube
- Deploying a NestJS app with Deployments and Services
- ConfigMaps and Secrets for configuration
- NGINX Ingress Controller for routing
- Horizontal Pod Autoscaler (HPA)
- Helm charts for reusable deployments
- Rolling updates and rollbacks
- Persistent storage with StatefulSets (PostgreSQL)
- K8s troubleshooting skills

---

## System Architecture

```
┌───────────────────────────────────────────────────┐
│                  Minikube Cluster                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │         NGINX Ingress Controller            │  │
│  │   api.local --> api-service                 │  │
│  │   admin.local --> admin-service             │  │
│  └──────────┬──────────────────┬───────────────┘  │
│             │                  │                   │
│  ┌──────────▼──────┐  ┌───────▼──────────┐       │
│  │   API Service   │  │  Admin Service   │       │
│  │  (3 replicas)   │  │  (2 replicas)    │       │
│  └────────┬────────┘  └────────┬─────────┘       │
│           │                    │                   │
│  ┌────────▼────────────────────▼─────────┐        │
│  │   PostgreSQL     │      Redis         │        │
│  │  (StatefulSet)   │   (Deployment)     │        │
│  └───────────────────────────────────────┘        │
└───────────────────────────────────────────────────┘
```

**Traffic flow**: External request hits the NGINX Ingress Controller, which inspects the `Host` header. Based on routing rules, it forwards to the correct ClusterIP Service, which load-balances across healthy pods. API pods talk to PostgreSQL (via headless service DNS) and Redis (via ClusterIP service DNS) within the cluster network.

---

## Step-by-Step Setup Flow

### Step 1: Minikube Setup

Start a local cluster with enough resources for the full stack:

```
minikube start --cpus=4 --memory=8192 --driver=docker
```

Enable required addons:

```
minikube addons enable ingress          # NGINX Ingress Controller
minikube addons enable metrics-server   # Required for HPA
minikube addons enable dashboard        # Web UI for visual debugging
```

Verify the cluster is running:

```
kubectl cluster-info
kubectl get nodes
minikube dashboard                      # Opens browser UI
```

**Why these addons matter**: The ingress addon installs a full NGINX Ingress Controller as a pod in the `ingress-nginx` namespace. The metrics-server collects CPU/memory data from kubelets, which the HPA reads to make scaling decisions.

---

### Step 2: Namespace Setup

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    env: development
```

Apply a ResourceQuota to prevent runaway resource consumption:

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: development
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

**Why namespaces**: Isolation between environments (dev/staging/prod on same cluster), scoped RBAC policies, resource quotas per team or environment, and cleaner `kubectl get` output when filtered by namespace.

---

### Step 3: ConfigMap and Secrets

**ConfigMap** -- non-sensitive configuration injected as environment variables:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: development
data:
  NODE_ENV: "production"
  PORT: "3000"
  DB_HOST: "postgresql"
  DB_PORT: "5432"
  DB_NAME: "myapp"
  REDIS_HOST: "redis"
  REDIS_PORT: "6379"
  LOG_LEVEL: "info"
```

**Secret** -- sensitive values, base64-encoded at rest:

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: development
type: Opaque
data:
  DB_PASSWORD: cGFzc3dvcmQxMjM=     # password123
  JWT_SECRET: bXlfc3VwZXJfc2VjcmV0   # my_super_secret
  REDIS_PASSWORD: cmVkaXNwYXNz        # redispass
```

**Key distinction**: ConfigMaps are for non-sensitive config. Secrets are base64-encoded (not encrypted by default). In production, use an external secrets operator to pull from AWS Secrets Manager, HashiCorp Vault, etc. Never commit real secrets to version control.

---

### Step 4: PostgreSQL StatefulSet

```yaml
# postgresql/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: development
spec:
  serviceName: "postgresql"       # Must match headless service name
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      initContainers:
        - name: run-migrations
          image: api-service:latest
          command: ["npm", "run", "migration:run"]
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secrets
      containers:
        - name: postgresql
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: api-config
                  key: DB_NAME
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: DB_PASSWORD
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
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
          volumeMounts:
            - name: pg-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: pg-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
```

Headless service for stable DNS:

```yaml
# postgresql/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: development
spec:
  clusterIP: None               # Headless -- pods get stable DNS names
  selector:
    app: postgresql
  ports:
    - port: 5432
      targetPort: 5432
```

**Why StatefulSet for databases**:
- Stable, predictable pod names (`postgresql-0`, `postgresql-1`)
- Stable network identity via headless service (`postgresql-0.postgresql.development.svc.cluster.local`)
- PVCs are not deleted when pods are rescheduled -- data survives restarts
- Ordered startup/shutdown (critical for primary-replica setups)

A Deployment, by contrast, creates pods with random names, does not guarantee ordering, and shares PVCs across replacements in unpredictable ways.

---

### Step 5: Redis Deployment

```yaml
# redis/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          args: ["--requirepass", "$(REDIS_PASSWORD)"]
          ports:
            - containerPort: 6379
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: REDIS_PASSWORD
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"
          livenessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 10
            periodSeconds: 10
```

```yaml
# redis/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: development
spec:
  type: ClusterIP
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

**Why Deployment for Redis (not StatefulSet)**: When Redis is used purely as a cache (no persistence), losing data on restart is acceptable. A Deployment is simpler. If you need Redis persistence (AOF/RDB), switch to a StatefulSet with a PVC.

---

### Step 6: NestJS API Deployment

```yaml
# api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: development
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1            # Create 1 extra pod during update
      maxUnavailable: 0      # Never drop below desired count
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        version: v1
    spec:
      containers:
        - name: api
          image: api-service:latest        # Built via minikube docker-env
          imagePullPolicy: Never           # Use local image, don't pull from registry
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secrets
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
```

```yaml
# api/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: development
spec:
  type: ClusterIP
  selector:
    app: api-service
  ports:
    - port: 3000
      targetPort: 3000
```

**Building images for Minikube**: Run `eval $(minikube docker-env)` first so that `docker build` pushes the image directly into Minikube's Docker daemon. Set `imagePullPolicy: Never` to prevent K8s from trying to pull from a remote registry.

**Probe semantics**:
- **Liveness**: "Is the process alive?" If it fails `failureThreshold` times, K8s kills and restarts the container. Higher `initialDelaySeconds` to avoid killing during startup.
- **Readiness**: "Can it serve traffic?" If it fails, the pod is removed from the Service's endpoint list. Lower `initialDelaySeconds` because you want to start routing quickly once ready.

**Rolling update zero-downtime flow**:
1. K8s creates 1 new pod (maxSurge: 1), so 4 pods exist temporarily
2. New pod starts, passes readiness probe, joins the Service
3. K8s terminates 1 old pod
4. Repeat until all 3 pods are running the new version
5. At no point are fewer than 3 pods serving traffic (maxUnavailable: 0)

---

### Step 7: NGINX Ingress

```yaml
# api/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: development
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/rate-limit: "10"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  rules:
    - host: api.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 3000
    - host: admin.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 3001
  tls:
    - hosts:
        - api.local
      secretName: api-tls-secret
```

**Local DNS setup** -- add to `/etc/hosts`:

```
<minikube-ip>  api.local
<minikube-ip>  admin.local
```

Get the IP with `minikube ip`.

**Annotation breakdown**:
- `rewrite-target: /` -- strips matched path prefix before forwarding to the backend
- `rate-limit` + `rate-limit-window` -- basic rate limiting at the ingress level (10 req/min)
- `cors-allow-origin` -- sets CORS headers on responses
- `proxy-body-size` -- max request body (important for file uploads)

**How Ingress works internally**: The Ingress resource is just a declarative config. The NGINX Ingress Controller pod watches for Ingress resources and dynamically generates `nginx.conf` entries. When a request arrives, NGINX routes it based on `Host` and `path` to the correct ClusterIP Service, which distributes across healthy pods.

---

### Step 8: Horizontal Pod Autoscaler (HPA)

```yaml
# api/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: development
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300    # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 25                      # Scale down max 25% at a time
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0      # Scale up immediately
      policies:
        - type: Pods
          value: 2                       # Add max 2 pods at a time
          periodSeconds: 60
```

**How HPA works**:
1. metrics-server collects CPU/memory from kubelets every 15 seconds
2. HPA controller queries metrics-server every 15 seconds (configurable)
3. Formula: `desiredReplicas = ceil(currentReplicas * (currentMetric / targetMetric))`
4. If 3 pods are at 90% CPU with a 70% target: `ceil(3 * 90/70) = ceil(3.86) = 4` replicas

**Testing autoscaling** -- generate artificial load:

```
kubectl run load-test --image=busybox --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://api-service:3000/health; done"
```

Watch the HPA respond:

```
kubectl get hpa -w -n development
```

**Scale-down stabilization (300s)**: Prevents "flapping" where pods are rapidly created and destroyed during fluctuating load. The HPA waits 5 minutes after the last scale-up before scaling down.

---

### Step 9: Helm Chart

Helm wraps raw manifests into reusable, parameterized templates.

**Directory structure**:

```
helm-chart/
├── Chart.yaml                # Chart metadata (name, version, description)
├── values.yaml               # Default values
├── values-staging.yaml       # Staging overrides
├── values-production.yaml    # Production overrides
└── templates/
    ├── deployment.yaml       # Deployment template with {{ .Values.x }} refs
    ├── service.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── configmap.yaml
    ├── secret.yaml
    └── _helpers.tpl          # Reusable template snippets (labels, names)
```

**values.yaml** -- the single source of configurable parameters:

```yaml
# values.yaml
replicaCount: 3

image:
  repository: api-service
  tag: latest
  pullPolicy: Never

resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"

ingress:
  enabled: true
  host: api.local
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "10"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 8
  targetCPUUtilization: 70

postgresql:
  enabled: true
  storage: 5Gi

redis:
  enabled: true

env:
  NODE_ENV: production
  LOG_LEVEL: info
```

**Environment-specific overrides**:

```yaml
# values-staging.yaml (only overrides what differs)
replicaCount: 1
autoscaling:
  enabled: false
resources:
  limits:
    cpu: "250m"
    memory: "256Mi"
```

```yaml
# values-production.yaml
replicaCount: 5
image:
  pullPolicy: Always
  repository: 123456789.dkr.ecr.us-east-1.amazonaws.com/api-service
ingress:
  host: api.example.com
autoscaling:
  minReplicas: 5
  maxReplicas: 20
```

**Helm commands**:

```
# First install
helm install api ./helm-chart -f values-staging.yaml -n development

# Upgrade (applies changes)
helm upgrade api ./helm-chart -f values-production.yaml -n production

# Rollback to a previous revision
helm rollback api 1

# See revision history
helm history api -n development

# Dry-run to see rendered YAML without applying
helm template api ./helm-chart -f values-staging.yaml
```

**Why Helm over raw manifests**: Templating avoids copy-paste across environments. `helm rollback` provides instant version revert. `helm history` tracks every deployment. Charts can be packaged and shared via Helm repositories.

---

## Common Operations

### Rolling Update Flow

```
1. Update image tag in values.yaml (or pass --set image.tag=v2)
2. helm upgrade api ./helm-chart
3. K8s creates new pods with the new image
4. New pods pass readiness check, join Service endpoints
5. Old pods are terminated gracefully (receive SIGTERM, then SIGKILL after 30s)
6. Zero downtime achieved throughout
```

### Rollback

```
kubectl rollout undo deployment/api-service              # Undo last rollout
kubectl rollout undo deployment/api-service --to-revision=3  # Specific revision

# Or via Helm
helm rollback api 1                                      # Rollback to revision 1

kubectl rollout status deployment/api-service            # Watch progress
```

### Scaling

```
# Manual
kubectl scale deployment api-service --replicas=5

# Automatic via HPA (no manual intervention needed)
# HPA adjusts replicas based on CPU/memory metrics
```

### Debugging Cheat Sheet

```
kubectl get pods -n development                          # Pod status overview
kubectl describe pod <name> -n development               # Events, conditions, details
kubectl logs <pod> -f -n development                     # Stream logs
kubectl logs <pod> --previous -n development             # Logs from crashed container
kubectl exec -it <pod> -n development -- sh              # Shell into a running pod
kubectl top pods -n development                          # CPU/memory usage (needs metrics-server)
kubectl get events --sort-by=.lastTimestamp -n development  # Recent cluster events
kubectl port-forward svc/api-service 3000:3000 -n development  # Local access without ingress
```

**Common failure patterns and fixes**:

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `CrashLoopBackOff` | App crashing on startup | Check logs, verify env vars, check DB connectivity |
| `ImagePullBackOff` | Image not found | Verify `minikube docker-env`, check `imagePullPolicy` |
| `Pending` | Insufficient resources | Check ResourceQuota, node capacity, reduce requests |
| `0/1 Ready` | Readiness probe failing | Check probe path/port, verify app startup time |
| `OOMKilled` | Memory limit exceeded | Increase `limits.memory` or fix memory leak |

---

## Directory Structure

```
k8s-project/
├── manifests/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── postgresql/
│   │   ├── statefulset.yaml
│   │   └── service.yaml
│   ├── redis/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── api/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── ingress.yaml
│   └── admin/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
├── helm-chart/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-staging.yaml
│   ├── values-production.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── hpa.yaml
│       ├── configmap.yaml
│       ├── secret.yaml
│       └── _helpers.tpl
├── Dockerfile
├── docker-compose.yml          # Local dev without K8s
└── Makefile                    # Command shortcuts
```

---

## Makefile (Command Shortcuts)

```makefile
cluster-start:
	minikube start --cpus=4 --memory=8192

cluster-stop:
	minikube stop

build:
	eval $$(minikube docker-env) && docker build -t api-service:latest .

deploy:
	kubectl apply -f manifests/ -R -n development

helm-deploy:
	helm upgrade --install api ./helm-chart -n development

logs:
	kubectl logs -f -l app=api-service -n development

port-forward:
	kubectl port-forward svc/api-service 3000:3000 -n development

status:
	kubectl get all -n development

clean:
	kubectl delete -f manifests/ -R -n development
```

---

## Production Differences (EKS vs Minikube)

| Aspect | Minikube | EKS (Production) |
|--------|----------|-------------------|
| Nodes | Single node | Multi-node, multi-AZ |
| Storage | hostPath | EBS volumes (gp3) |
| Ingress | Minikube addon | AWS ALB Ingress Controller |
| Secrets | K8s Secrets (base64) | External Secrets Operator --> AWS Secrets Manager |
| TLS | Self-signed | ACM (free, auto-renewed certificates) |
| DNS | /etc/hosts | Route 53 with ExternalDNS controller |
| Monitoring | metrics-server | Prometheus + Grafana + CloudWatch |
| Autoscaling | HPA only | HPA + Cluster Autoscaler + Karpenter |
| Networking | Single-node bridge | VPC CNI, security groups per pod |
| CI/CD | Manual kubectl apply | ArgoCD / Flux (GitOps) |

**Migration path from Minikube to EKS**: The manifests stay nearly identical. The main changes are: (1) swap `imagePullPolicy: Never` for ECR image URIs, (2) replace Minikube ingress with AWS ALB annotations, (3) add External Secrets for secret management, (4) configure storage classes for EBS, (5) set up Cluster Autoscaler for node scaling.

---

## Interview Talking Points

- **Requests vs Limits**: Requests are guaranteed resources (used for scheduling). Limits are hard caps (exceed memory limit and the container is OOMKilled). Setting requests too high wastes cluster resources. Setting limits too low causes unexpected kills.

- **Why StatefulSet for databases**: Stable network identity, persistent volumes bound to specific pods, ordered startup/shutdown. Deployments have none of these guarantees.

- **Ingress controller role**: Acts as a reverse proxy inside the cluster. Without it, every service would need a LoadBalancer (expensive in cloud, one LB per service). Ingress consolidates routing behind a single entry point.

- **Helm vs raw manifests**: Raw manifests are fine for small projects. Helm shines when you deploy the same app to multiple environments, need rollback history, or want to share charts across teams.

- **Rolling update zero-downtime**: maxSurge creates new pods before killing old ones. Readiness probes ensure traffic only hits healthy pods. Graceful shutdown (SIGTERM handling) ensures in-flight requests complete.

- **"How would you migrate from Minikube to EKS?"**: Answer covers image registry change, ingress controller swap, external secrets, storage classes, VPC networking, and GitOps deployment.

- **"How do you handle database migrations in K8s?"**: Init containers run before the main container starts. Or use K8s Jobs triggered before deployment. Or Helm pre-upgrade hooks.

---

## What to Practice

- Deploy the full stack from scratch in 30 minutes
- Break things intentionally and fix them:
  - Delete a pod mid-request (observe self-healing)
  - Misconfigure a readiness probe (observe traffic routing)
  - Set memory limit to 10Mi (observe OOMKilled and CrashLoopBackOff)
  - Point ConfigMap to wrong DB host (observe connection errors in logs)
- Draw the full K8s architecture from memory on a whiteboard
- Explain pod lifecycle: Pending --> ContainerCreating --> Running --> Terminating
- Explain health check mechanics and how they differ
- Discuss resource planning: how to right-size requests/limits using metrics
- Practice `kubectl` without looking up flags -- muscle memory matters in interviews
