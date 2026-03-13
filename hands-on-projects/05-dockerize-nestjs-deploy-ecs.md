# Project 5: Dockerize NestJS App & Deploy to AWS ECS

> **Stack**: NestJS + Docker + ECR + ECS Fargate + ALB + RDS + ElastiCache + GitHub Actions
> **Relevance**: Production deployment pattern used by most companies. Essential for Senior/Lead roles.
> **Estimated Build Time**: 6-8 hours

---

## What You'll Learn

- Multi-stage Docker builds for Node.js
- Docker Compose for local development
- AWS ECR (container registry)
- ECS Fargate (serverless containers)
- ALB (Application Load Balancer) with health checks
- RDS PostgreSQL + ElastiCache Redis in private subnets
- CI/CD with GitHub Actions -> ECR -> ECS
- Blue-green deployment with zero downtime

---

## System Architecture

### Local Development

```
┌─────────────────────────────────────────┐
│            Docker Compose                │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ NestJS   │ │PostgreSQL│ │  Redis  │ │
│  │ :3000    │ │ :5432    │ │ :6379   │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│           Docker Network                 │
└─────────────────────────────────────────┘
```

All three services live inside a single Docker Compose stack. The NestJS container connects to Postgres and Redis via Docker DNS (service names as hostnames). Source code is volume-mounted for hot reload during development.

### Production (AWS)

```
Internet --> Route 53 --> ALB (public subnet)
                            │
                       ┌────┼────┐
                       ▼         ▼
                 ┌──────────┐┌──────────┐
                 │ECS Task 1││ECS Task 2│  (private subnet)
                 │(NestJS)  ││(NestJS)  │
                 └────┬─────┘└────┬─────┘
                      │           │
                 ┌────▼───────────▼────┐
                 │  RDS PostgreSQL     │  (private subnet)
                 │  (Multi-AZ)        │
                 └────────────────────┘
                 ┌────────────────────┐
                 │  ElastiCache Redis │  (private subnet)
                 └────────────────────┘
```

Key design decisions:
- ECS tasks in **private subnets** -- no public IPs, traffic enters only through the ALB
- RDS and Redis in a **separate private subnet tier** -- only reachable from the ECS security group
- Multi-AZ for the ALB and ECS tasks, Multi-AZ standby for RDS
- NAT Gateway in the public subnet so ECS tasks can pull images from ECR and reach external APIs

---

## Dockerfile (Multi-Stage Build)

### Strategy

The Dockerfile uses two stages to keep the production image minimal and secure.

**Stage 1 -- "builder"**
- Base image: `node:20-alpine`
- Copy `package.json` and `package-lock.json` first (layer caching)
- Run `npm ci` to install all dependencies (including devDependencies for the build)
- Copy source code
- Run `npm run build` to compile TypeScript into `dist/`

**Stage 2 -- "production"**
- Fresh `node:20-alpine` base (no build tools carried over)
- Copy only `dist/` and `node_modules/` (production deps) from the builder stage
- Run `npm ci --only=production` so devDependencies are excluded
- Create and switch to a non-root user (`node`) for security
- Expose port 3000
- Add a `HEALTHCHECK` instruction: `CMD curl -f http://localhost:3000/health || exit 1`
- Set `NODE_ENV=production`
- Entry point: `node dist/main.js`

### .dockerignore

```
node_modules
dist
.git
.env
*.md
test
coverage
```

### Image Size Comparison

```
Approach                    Image Size
─────────────────────────────────────────
Naive (node:20 + all deps)  ~1.2 GB
Multi-stage (alpine + prod) ~150 MB
```

The 8x reduction comes from: alpine base (~50MB vs ~350MB), no devDependencies, no TypeScript source, no build tools.

---

## Docker Compose (Local Dev)

### docker-compose.yml -- Structure

```
services:
  api:
    build: .  (with target: builder for dev)
    ports: 3000:3000
    volumes: ./src:/app/src  (hot reload)
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/mydb
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    networks: [app-network]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: pg_isready -U user
      interval: 5s, retries: 5
    networks: [app-network]

  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
    healthcheck:
      test: redis-cli ping
      interval: 5s, retries: 5
    networks: [app-network]

volumes:
  pgdata:
  redisdata:

networks:
  app-network:
    driver: bridge
```

### Key Points

- **Volume mounts** for `src/` enable hot reload without rebuilding the image
- **Named volumes** (`pgdata`, `redisdata`) persist data across container restarts
- **Health checks with depends_on conditions** ensure Postgres and Redis are ready before the API starts
- **Bridge network** gives each service a DNS name matching its service key

---

## Docker Compose (Integration Tests)

### docker-compose.test.yml -- Structure

```
services:
  postgres-test:
    image: postgres:16-alpine
    environment: (test credentials)
    # NO volumes -- ephemeral, destroyed after tests
    tmpfs: /var/lib/postgresql/data  (RAM-backed, fast)
    healthcheck: pg_isready

  redis-test:
    image: redis:7-alpine
    # NO volumes -- ephemeral

  test-runner:
    build: .
    command: npm run test:e2e
    environment:
      DATABASE_URL: pointing to postgres-test
      REDIS_URL: pointing to redis-test
    depends_on:
      postgres-test: { condition: service_healthy }
      redis-test: { condition: service_healthy }
```

### Usage in CI

```
docker compose -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from test-runner
```

The exit code of the `test-runner` container becomes the exit code of the command, so CI fails if tests fail. All containers are destroyed after.

---

## AWS Infrastructure

### VPC Design

```
VPC: 10.0.0.0/16
├── Public Subnets (2 AZs):
│   ├── 10.0.1.0/24 (AZ-a) --> ALB, NAT Gateway
│   └── 10.0.2.0/24 (AZ-b) --> ALB
├── Private Subnets - App (2 AZs):
│   ├── 10.0.3.0/24 (AZ-a) --> ECS Tasks
│   └── 10.0.4.0/24 (AZ-b) --> ECS Tasks
└── Private Subnets - Data (2 AZs):
    ├── 10.0.5.0/24 (AZ-a) --> RDS Primary, Redis
    └── 10.0.6.0/24 (AZ-b) --> RDS Standby
```

Three-tier subnet architecture:
1. **Public** -- Internet-facing resources (ALB, NAT Gateway)
2. **Private App** -- Compute layer (ECS tasks), outbound via NAT
3. **Private Data** -- Storage layer (RDS, ElastiCache), no internet access needed

### Security Groups

```
ALB-SG:        Inbound 80/443 from 0.0.0.0/0
ECS-SG:        Inbound 3000 from ALB-SG only
RDS-SG:        Inbound 5432 from ECS-SG only
Redis-SG:      Inbound 6379 from ECS-SG only
```

Each layer can only be reached by the layer directly above it. This is **defense in depth** -- even if an attacker compromises the ALB, they cannot reach the database directly because RDS-SG only allows traffic from ECS-SG.

### ECR Repository

- **Repository name**: `my-company/api-service`
- **Image tagging strategy**: every build is tagged with the git SHA (`abc123f`) plus `latest`
- **Lifecycle policy**: keep last 10 tagged images, expire untagged images after 7 days
- **Image scanning**: enabled on push (detect CVEs in base images)

Why git SHA tags: exact traceability from running container back to the commit that produced it. Never deploy `latest` in production -- always pin to the SHA.

### ECS Task Definition (Pseudo)

```
Family: api-service
CPU: 512 (0.5 vCPU)
Memory: 1024 (1 GB)
Network Mode: awsvpc
Requires Compatibilities: FARGATE

Container Definitions:
  - Name: api-service
    Image: <account-id>.dkr.ecr.<region>.amazonaws.com/my-company/api-service:<git-sha>
    Port Mappings: containerPort 3000
    Environment (from Secrets Manager / SSM Parameter Store):
      DATABASE_URL: arn:aws:secretsmanager:...:db-credentials
      REDIS_URL: arn:aws:ssm:...:redis-url
      JWT_SECRET: arn:aws:secretsmanager:...:jwt-secret
    Health Check:
      command: CMD-SHELL, curl -f http://localhost:3000/health || exit 1
      interval: 30s
      timeout: 5s
      retries: 3
      startPeriod: 60s
    Log Configuration:
      logDriver: awslogs
      options:
        awslogs-group: /ecs/api-service
        awslogs-region: ap-southeast-1
        awslogs-stream-prefix: ecs

Task Role: ecs-api-task-role
  Permissions: Secrets Manager (read), S3 (read/write), SES (send)

Execution Role: ecs-api-execution-role
  Permissions: ECR (pull images), CloudWatch Logs (create/write), Secrets Manager (read for env injection)
```

Important distinction: **Task Role** = what the running app can do. **Execution Role** = what ECS needs to launch the task.

### ECS Service

```
Service Name: api-service
Launch Type: FARGATE
Desired Count: 2  (minimum for high availability)
Platform Version: LATEST

Network Configuration:
  Subnets: private-app-a, private-app-b
  Security Groups: ECS-SG
  Assign Public IP: DISABLED

Load Balancer:
  Target Group: api-service-tg
  Container Name: api-service
  Container Port: 3000

Deployment Configuration:
  Type: Rolling Update
  Minimum Healthy Percent: 100%  (never go below desired count)
  Maximum Percent: 200%          (spin up new before killing old)

Auto Scaling:
  Target Tracking:
    - CPU utilization > 70% --> scale out
    - CPU utilization < 30% --> scale in
  Min Capacity: 2
  Max Capacity: 10
  Scale-in Cooldown: 300s
  Scale-out Cooldown: 60s
```

Rolling update with min 100% / max 200% means: ECS starts 2 new tasks first, waits for them to pass health checks, then drains the 2 old tasks. Zero downtime.

### ALB Configuration

```
Listener Rules:
  - HTTPS (443) --> Forward to api-service-tg
  - HTTP (80)   --> Redirect to HTTPS (301)

SSL Certificate: ACM certificate for api.mycompany.com

Target Group: api-service-tg
  Protocol: HTTP
  Port: 3000
  Target Type: ip (required for Fargate awsvpc)
  Health Check:
    Path: /health
    Interval: 15s
    Healthy Threshold: 2
    Unhealthy Threshold: 3
    Timeout: 5s
  Deregistration Delay: 30s  (matches graceful shutdown timeout)
  Stickiness: DISABLED       (API is stateless, sessions in Redis)
```

The `/health` endpoint should check DB connectivity and Redis connectivity, returning 200 only if both are reachable. This way, a task with a broken DB connection gets deregistered automatically.

---

## CI/CD Pipeline (GitHub Actions)

### Pipeline Overview

```
Trigger: push to main branch

Jobs:

1. test:
   - Checkout code
   - Start docker-compose.test.yml (ephemeral Postgres + Redis)
   - Run: npm test (unit tests)
   - Run: npm run test:e2e (integration tests against real DB)
   - Upload coverage report as artifact
   - Fail fast: if tests fail, pipeline stops here

2. build-and-push:
   - Needs: test (must pass)
   - Configure AWS credentials via OIDC federation (no static keys!)
   - Login to ECR: aws ecr get-login-password | docker login
   - Build Docker image (multi-stage, production target)
   - Tag: $ECR_URI:$GITHUB_SHA
   - Tag: $ECR_URI:latest
   - Push both tags to ECR

3. deploy:
   - Needs: build-and-push
   - Fetch current task definition from ECS
   - Update image field to new $ECR_URI:$GITHUB_SHA
   - Register new task definition revision
   - Update ECS service to use new task definition
   - Wait for stability: aws ecs wait services-stable --cluster prod --services api-service
   - On success: notify Slack channel with commit info and deploy time
   - On failure: notify Slack with error details and link to CloudWatch logs
```

### OIDC for AWS Credentials

Instead of storing AWS access keys as GitHub secrets (which can leak):
1. Create an IAM OIDC provider for `token.actions.githubusercontent.com`
2. Create an IAM role with trust policy for your GitHub org/repo
3. In the workflow, use `aws-actions/configure-aws-credentials` with `role-to-assume`
4. GitHub generates a short-lived JWT, exchanges it for temporary AWS credentials
5. No long-lived secrets stored anywhere

### Database Migrations in CI/CD

```
Option A: Migration as a separate ECS task
  - After build-and-push, before deploy
  - Run a one-off ECS task: npx typeorm migration:run
  - If migration fails, pipeline stops (no deploy)

Option B: Migration on app startup
  - App runs migrations in onModuleInit()
  - Simpler, but risky if multiple tasks start simultaneously
  - Use advisory locks to prevent concurrent migrations

Recommended: Option A for production (explicit, auditable, reversible)
```

---

## Blue-Green Deployment (Alternative)

```
1. Current state: Target Group "blue" serving all traffic via ALB listener
2. Deploy new version to Target Group "green" (new ECS tasks register here)
3. ALB runs health checks against "green" targets
4. All "green" targets healthy --> ALB listener rule switches to "green"
5. Monitor for 10 minutes (error rates, latency, logs)
6. If OK  --> deregister "blue" tasks, "green" becomes the new "blue"
7. If issues --> switch ALB listener back to "blue" (instant rollback, < 1 second)
```

### Blue-Green vs Rolling Update

```
                    Rolling Update          Blue-Green
──────────────────────────────────────────────────────────
Rollback Speed      Minutes (redeploy)     Seconds (ALB switch)
Resource Usage      Up to 2x during deploy  2x during deploy
Complexity          Low (ECS built-in)      Medium (two target groups)
Cost                Lower                   Higher (double tasks briefly)
Database Changes    Tricky                  Tricky (same problem)
Best For            Most workloads          Mission-critical APIs
```

---

## Monitoring & Observability

### CloudWatch Container Insights
- Per-task metrics: CPU utilization, memory utilization, network I/O
- Cluster-level aggregation: total running tasks, pending tasks
- Dashboard: single pane of glass for all ECS services

### ALB Metrics
- `RequestCount`: traffic volume
- `TargetResponseTime`: P50, P95, P99 latency
- `HTTPCode_Target_5XX_Count`: server errors from your app
- `HealthyHostCount` / `UnHealthyHostCount`: target health

### Custom Application Metrics
- Push to CloudWatch via `aws-sdk` or a metrics library
- API response time histogram (per endpoint)
- Database query duration
- Cache hit/miss ratio
- Business metrics (signups/hour, orders/hour)

### Alarms

```
Alarm                     Threshold              Action
──────────────────────────────────────────────────────────
High 5xx Rate             > 1% of requests       SNS --> PagerDuty
High CPU                  > 80% for 5 min        Auto-scale + alert
High Memory               > 80% for 5 min        Alert (potential leak)
Unhealthy Targets         < desired count         Alert
High Latency (P95)        > 500ms for 5 min       Alert
Zero Healthy Targets      == 0                    Critical --> PagerDuty
```

### X-Ray Tracing
- Instrument the NestJS app with AWS X-Ray SDK
- Traces flow: Client --> ALB --> ECS --> RDS / Redis
- Identify slow DB queries, cache misses, downstream API latency
- Service map shows dependencies and error rates between components

---

## Graceful Shutdown

When ECS stops a task (during deployment, scale-in, or manual stop):

```
1. ECS sends SIGTERM to the container process
2. ALB deregistration begins (30s drain period)
   - ALB stops sending NEW requests to this target
   - Existing in-flight requests continue
3. App receives SIGTERM:
   a. Stop accepting new connections (server.close())
   b. Wait for in-flight requests to complete
   c. Close database connection pool
   d. Close Redis connection
   e. Flush any buffered logs/metrics
   f. Process exits with code 0
4. If process hasn't exited after stopTimeout (30s), ECS sends SIGKILL
```

### NestJS Implementation Approach

The app module's `onModuleDestroy` lifecycle hook handles cleanup:
- `app.close()` triggers NestJS shutdown hooks
- TypeORM connection is closed via its `destroy()` method
- Redis client calls `quit()` for clean disconnect
- A timeout guard ensures the process exits even if cleanup hangs

The `enableShutdownHooks()` call in `main.ts` is required for NestJS to listen for SIGTERM.

**Critical**: Set the ECS `stopTimeout` (default 30s) to match or slightly exceed the ALB deregistration delay. If the app exits before ALB finishes draining, some requests get 502 errors.

---

## Cost Estimation

```
Resource                                      Monthly Cost
──────────────────────────────────────────────────────────
ECS Fargate (2 tasks, 0.5 vCPU, 1GB each)
  2 x ($0.04048/hr x 730h)                    $59

RDS PostgreSQL (db.t3.micro, Multi-AZ)         $29

ElastiCache Redis (cache.t3.micro)              $12

ALB (fixed hourly + LCU usage)                  $21

ECR (10GB storage)                              $1

CloudWatch Logs (10GB ingestion)                $5

NAT Gateway (fixed + data processing)           $35
──────────────────────────────────────────────────────────
Total                                          ~$162/month
```

### Cost Optimization for BD Startups

- Start with **single-AZ RDS** (~$15/month) -- switch to Multi-AZ when you have paying customers
- Use a single **NAT Gateway** instead of one per AZ (~$35 vs ~$70)
- Use **Fargate Spot** for non-critical workloads (up to 70% savings, but tasks can be interrupted)
- Consider **single ECS task** during early stage (accept brief downtime during deploys)
- Use **t3.micro** for Redis -- sufficient for < 10K requests/second
- Set up **AWS Budgets** alert at $100/month to avoid surprise bills
- When revenue justifies it, scale to Multi-AZ everything for production resilience

---

## Interview Talking Points

- **Multi-stage Docker builds**: Why two stages? What goes in each? How does it affect image size and security?
- **VPC architecture**: Draw the three-tier subnet design from memory. Explain why each tier exists.
- **Security group chaining**: Why does RDS-SG reference ECS-SG instead of a CIDR range?
- **ECS Fargate vs EC2 launch type**: Fargate = no server management, per-second billing. EC2 = cheaper at scale, more control (GPU, custom AMI).
- **Blue-green vs rolling deployment**: When would you pick one over the other? What about canary?
- **Graceful shutdown**: What happens to in-flight requests during a deploy? How do SIGTERM, ALB draining, and app cleanup coordinate?
- **OIDC for CI/CD**: Why is this better than storing AWS access keys in GitHub secrets?
- **Cost optimization**: How would you reduce the $162/month bill for a pre-revenue startup?
- **"Walk me through a deployment from code push to production"**: Describe the full flow -- push to main, tests run, Docker build, ECR push, task definition update, rolling deploy, health checks, ALB traffic shift.

---

## What to Practice

- [ ] Draw the VPC + ECS architecture from memory on a whiteboard
- [ ] Explain the CI/CD pipeline step by step without looking at notes
- [ ] Describe security group rules and why each exists
- [ ] Calculate costs for different traffic levels (10 RPS vs 100 RPS vs 1000 RPS)
- [ ] Discuss how to handle database migrations during zero-downtime deployment
- [ ] Explain the difference between ECS Task Role and Execution Role
- [ ] Walk through what happens when a container fails health checks
- [ ] Describe how auto-scaling decisions are made and the role of cooldown periods
