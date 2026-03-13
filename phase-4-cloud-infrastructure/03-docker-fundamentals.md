# Docker Fundamentals - Interview Q&A

## Table of Contents
1. [What is Docker & Containerization](#what-is-docker--containerization)
2. [Docker Images & Dockerfile](#docker-images--dockerfile)
3. [Docker Networking](#docker-networking)
4. [Docker Volumes & Data Persistence](#docker-volumes--data-persistence)
5. [Docker Compose](#docker-compose)
6. [Docker Security Best Practices](#docker-security-best-practices)
7. [Docker for Development vs Production](#docker-for-development-vs-production)
8. [Container Orchestration Overview](#container-orchestration-overview)
9. [Docker Image Registry & CI/CD](#docker-image-registry--cicd)
10. [Docker Troubleshooting & Common Issues](#docker-troubleshooting--common-issues)
11. [Quick Reference](#quick-reference)

---

## What is Docker & Containerization

### Q1: What is Docker and how does containerization differ from virtualization?

**Answer:**
Docker is an open-source platform that automates the deployment, scaling, and management of applications using containerization. A container packages an application with all its dependencies (code, runtime, libraries, system tools) into a single, lightweight, portable unit that runs consistently across any environment.

**Containers vs Virtual Machines:**

| Feature | Containers | Virtual Machines |
|---|---|---|
| **Architecture** | Share host OS kernel | Each VM runs its own full OS |
| **Size** | Megabytes (10-200 MB typical) | Gigabytes (1-20 GB typical) |
| **Startup time** | Seconds (< 5s) | Minutes (30s-3min) |
| **Isolation** | Process-level (namespaces, cgroups) | Hardware-level (hypervisor) |
| **Resource usage** | Minimal overhead | Significant overhead (OS per VM) |
| **Density** | 100s of containers per host | 10s of VMs per host |
| **Portability** | Highly portable (OCI standard) | Portable but heavy |
| **Performance** | Near-native | ~5-10% overhead from hypervisor |

```
    Virtual Machines                    Containers

┌─────┐ ┌─────┐ ┌─────┐      ┌─────┐ ┌─────┐ ┌─────┐
│App A│ │App B│ │App C│      │App A│ │App B│ │App C│
├─────┤ ├─────┤ ├─────┤      ├─────┤ ├─────┤ ├─────┤
│Bins/│ │Bins/│ │Bins/│      │Bins/│ │Bins/│ │Bins/│
│Libs │ │Libs │ │Libs │      │Libs │ │Libs │ │Libs │
├─────┤ ├─────┤ ├─────┤      └──┬──┘ └──┬──┘ └──┬──┘
│Guest│ │Guest│ │Guest│         │       │       │
│ OS  │ │ OS  │ │ OS  │      ┌──┴───────┴───────┴──┐
└──┬──┘ └──┬──┘ └──┬──┘      │   Container Runtime  │
   │       │       │         │   (Docker Engine)     │
┌──┴───────┴───────┴──┐      ├─────────────────────┤
│     Hypervisor       │      │      Host OS         │
├─────────────────────┤      ├─────────────────────┤
│      Host OS         │      │     Hardware         │
├─────────────────────┤      └─────────────────────┘
│     Hardware         │
└─────────────────────┘
```

**Docker Architecture:**

Docker uses a client-server architecture with three core components:

```
┌──────────────────────────────────────────────────────┐
│                    Docker Host                         │
│                                                        │
│  ┌──────────┐     ┌───────────────────────────────┐  │
│  │ Docker    │────>│       Docker Daemon            │  │
│  │ CLI       │     │       (dockerd)                │  │
│  │           │     │                                │  │
│  │ docker    │     │  ┌──────────┐ ┌──────────┐   │  │
│  │ build     │     │  │Container │ │Container │   │  │
│  │ docker    │     │  │    1     │ │    2     │   │  │
│  │ run       │     │  └──────────┘ └──────────┘   │  │
│  │ docker    │     │                                │  │
│  │ pull      │     │  ┌──────────┐                 │  │
│  └──────────┘     │  │ Images   │                 │  │
│                    │  └──────────┘                 │  │
│                    └───────────────────────────────┘  │
│                              │                         │
└──────────────────────────────┼─────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Docker Registry    │
                    │   (Docker Hub, ECR)  │
                    └─────────────────────┘
```

1. **Docker CLI** — the command-line client that sends commands to the daemon via REST API
2. **Docker Daemon (dockerd)** — the background service that manages images, containers, networks, and volumes
3. **Docker Registry** — stores Docker images (Docker Hub is the default public registry; AWS ECR for private)

**Container Lifecycle:**

```
   create        start         (running)        stop          remove
┌─────────┐  ┌─────────┐  ┌─────────────┐  ┌─────────┐  ┌─────────┐
│ Created │─>│ Starting │─>│   Running   │─>│ Stopped │─>│ Removed │
└─────────┘  └─────────┘  └─────────────┘  └─────────┘  └─────────┘
                                │                  │
                                │   kill/OOM       │  restart
                                └──────────────────┘
```

- `docker create` — creates container from image (filesystem + config), but does not start it
- `docker start` — starts the created container
- `docker run` — shorthand for create + start (most common)
- `docker stop` — sends SIGTERM, waits grace period, then SIGKILL
- `docker rm` — removes the stopped container

**OCI (Open Container Initiative) Standards:**

OCI defines industry standards so containers are not locked to Docker:
- **Runtime Specification** — how to run a container (implemented by runc, crun)
- **Image Specification** — how container images are structured (layers, manifest, config)
- **Distribution Specification** — how images are pushed/pulled from registries

This means you can build with Docker but run with Podman, containerd, or CRI-O — they all follow OCI standards.

**Why containers matter for backend engineers:**

1. **Consistent environments** — "works on my machine" is eliminated; dev, staging, and production all run the same container
2. **CI/CD enablement** — build once, test, push to registry, deploy the same artifact everywhere
3. **Microservices isolation** — each service runs in its own container with its own dependencies, no conflicts
4. **Rapid scaling** — spin up new container instances in seconds vs. minutes for VMs
5. **Infrastructure as code** — Dockerfile and docker-compose.yml are version-controlled alongside application code

**Interview tip — "Explain containerization to a non-technical stakeholder":**

> "Think of shipping containers in the real world. Before standardized containers, loading a cargo ship was chaotic — different shapes, sizes, and handling requirements. Standardized containers solved this: pack anything inside, and it fits on any ship, truck, or train. Docker containers do the same for software. We package our application with everything it needs into a standard container. That container runs identically on a developer's laptop, in our test environment, and in production. This eliminates 'it works on my machine' problems, speeds up our deployment process, and makes scaling as simple as running more copies of the same container."

---

## Docker Images & Dockerfile

### Q2: How do Docker images work and what are the best practices for writing Dockerfiles for Node.js/NestJS applications?

**Answer:**

**What Docker Images Are:**

A Docker image is a read-only template that contains a layered filesystem with everything needed to run an application. Each layer represents a Dockerfile instruction, and layers are stacked using a union filesystem (OverlayFS).

```
┌─────────────────────────────────────────┐
│         Container Layer (R/W)            │  ← Writable; lost when container removed
├─────────────────────────────────────────┤
│  Layer 5: CMD ["node", "dist/main"]     │  ← Metadata only (no filesystem change)
├─────────────────────────────────────────┤
│  Layer 4: COPY . .                       │  ← Application source code
├─────────────────────────────────────────┤
│  Layer 3: RUN npm ci                     │  ← node_modules installed
├─────────────────────────────────────────┤
│  Layer 2: COPY package*.json ./          │  ← package.json + package-lock.json
├─────────────────────────────────────────┤
│  Layer 1: FROM node:20-alpine            │  ← Base OS + Node.js runtime (~180 MB)
└─────────────────────────────────────────┘
```

**Image Layers and Caching:**

- Each `RUN`, `COPY`, or `ADD` instruction creates a new layer
- Layers are cached — if a layer and all layers before it are unchanged, Docker reuses the cache
- Cache is invalidated from the first changed layer downward — **order matters**
- This is why we copy `package.json` before source code: dependencies change less frequently than code

**Dockerfile Instructions Reference:**

| Instruction | Purpose | Example |
|---|---|---|
| `FROM` | Base image | `FROM node:20-alpine` |
| `RUN` | Execute command during build | `RUN npm ci --production` |
| `COPY` | Copy files from host to image | `COPY . .` |
| `ADD` | Like COPY but extracts archives and fetches URLs | `ADD archive.tar.gz /app/` |
| `WORKDIR` | Set working directory | `WORKDIR /app` |
| `ENV` | Set environment variable (persists at runtime) | `ENV NODE_ENV=production` |
| `ARG` | Build-time variable (not available at runtime) | `ARG NODE_VERSION=20` |
| `EXPOSE` | Document which port the container listens on | `EXPOSE 3000` |
| `CMD` | Default command (overridable at `docker run`) | `CMD ["node", "dist/main"]` |
| `ENTRYPOINT` | Fixed command (not easily overridden) | `ENTRYPOINT ["node"]` |
| `USER` | Set the user to run as | `USER nestjs` |
| `HEALTHCHECK` | Define health check command | `HEALTHCHECK CMD wget -qO- ...` |
| `VOLUME` | Declare mount point for external storage | `VOLUME ["/data"]` |

**CMD vs ENTRYPOINT:**

```dockerfile
# CMD — provides defaults that can be overridden
CMD ["node", "dist/main"]
# docker run myapp                    → runs: node dist/main
# docker run myapp node dist/worker   → runs: node dist/worker (CMD overridden)

# ENTRYPOINT — fixed command, CMD becomes arguments
ENTRYPOINT ["node"]
CMD ["dist/main"]
# docker run myapp                    → runs: node dist/main
# docker run myapp dist/worker        → runs: node dist/worker (CMD overridden)
# docker run --entrypoint sh myapp    → runs: sh (ENTRYPOINT overridden with flag)
```

**Rule of thumb:** Use `CMD` for general applications. Use `ENTRYPOINT` + `CMD` when the container should always run a specific executable and you want to parameterize its arguments.

**COPY vs ADD:**

```dockerfile
# COPY — simple, predictable, preferred
COPY package*.json ./
COPY src/ ./src/

# ADD — extra features (usually unnecessary)
ADD https://example.com/file.tar.gz /app/    # Fetches URL (use curl/wget in RUN instead)
ADD archive.tar.gz /app/                       # Auto-extracts archives
```

**Best practice:** Always use `COPY` unless you specifically need archive extraction. `ADD` has implicit behavior that can cause surprises.

**.dockerignore File:**

```
# .dockerignore
node_modules
npm-debug.log
dist
.git
.gitignore
.env
.env.*
Dockerfile
docker-compose*.yml
.dockerignore
coverage
.nyc_output
.vscode
.idea
*.md
test
tests
```

This prevents unnecessary files from being sent to the Docker build context, speeding up builds and reducing image size.

**Multi-Stage Build for Production NestJS:**

```dockerfile
# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (layer caching optimization)
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Build the NestJS application
RUN npm run build

# Prune devDependencies after build
RUN npm prune --production

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Security: add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

# Copy only what's needed from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Set environment
ENV NODE_ENV=production

# Switch to non-root user
USER nestjs

# Document the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/main"]
```

**Why this Dockerfile is optimized:**

| Optimization | Benefit |
|---|---|
| `node:20-alpine` base | ~180 MB vs ~1 GB for `node:20` (Debian) |
| Multi-stage build | Build tools, TypeScript, devDependencies excluded from final image |
| `npm ci` instead of `npm install` | Deterministic installs from lockfile, faster |
| `COPY package*.json` before `COPY . .` | Layer caching: dependencies rebuild only when package files change |
| `npm prune --production` | Removes devDependencies before copying to production stage |
| Non-root `USER` | Security: container does not run as root |
| `HEALTHCHECK` | Enables container orchestrators to detect unhealthy instances |
| `--chown` flag on COPY | Sets file ownership without extra `RUN chown` layer |

**Build Arguments vs Environment Variables:**

```dockerfile
# ARG — available only during build
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

ARG BUILD_DATE
LABEL build-date=${BUILD_DATE}

# ENV — available during build AND at runtime
ENV NODE_ENV=production
ENV PORT=3000

# Usage: docker build --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) .
```

**Image Size Comparison for a typical NestJS app:**

| Approach | Image Size |
|---|---|
| `node:20` (Debian) + no multi-stage | ~1.2 GB |
| `node:20-alpine` + no multi-stage | ~400 MB |
| `node:20-alpine` + multi-stage | ~150-200 MB |
| `node:20-alpine` + multi-stage + prune | ~100-150 MB |

---

## Docker Networking

### Q3: How does Docker networking work and how do containers communicate with each other?

**Answer:**

Docker networking enables containers to communicate with each other and the outside world. Docker provides several network drivers, each suited for different use cases.

**Network Drivers:**

| Driver | Scope | Use Case |
|---|---|---|
| **bridge** | Single host | Default. Containers on same host communicate via internal network |
| **host** | Single host | Container uses host's network stack directly (no isolation) |
| **overlay** | Multi-host | Containers across multiple Docker hosts (Swarm/K8s) |
| **macvlan** | Single host | Container gets its own MAC address, appears as physical device on network |
| **none** | Single host | No networking. Container is completely isolated |

**Bridge Network (Default):**

```
┌─────────────────────────────────────────────────┐
│                  Docker Host                      │
│                                                   │
│  ┌──────────┐         ┌──────────┐              │
│  │Container │         │Container │              │
│  │  App     │         │  DB      │              │
│  │ 172.17.  │         │ 172.17.  │              │
│  │ 0.2:3000 │         │ 0.3:5432 │              │
│  └────┬─────┘         └────┬─────┘              │
│       │                     │                    │
│  ┌────┴─────────────────────┴────┐              │
│  │       docker0 bridge           │              │
│  │       172.17.0.1               │              │
│  └──────────────┬────────────────┘              │
│                  │                                │
│  ┌──────────────┴────────────────┐              │
│  │     Host Network Interface     │              │
│  │     eth0 / en0                 │              │
│  └──────────────┬────────────────┘              │
└─────────────────┼───────────────────────────────┘
                  │
              Internet
```

- Default bridge (`docker0`): containers can communicate via IP but NOT by container name
- Custom bridge: containers can resolve each other by container name via Docker's built-in DNS

**Host Network:**

```bash
# Container shares the host's network — no port mapping needed
docker run --network host my-nestjs-app
# App listening on port 3000 is directly accessible at host:3000

# Use case: maximum network performance (no NAT overhead)
# Downside: no network isolation, port conflicts possible
```

**Custom Bridge Networks (Recommended):**

```bash
# Create custom network
docker network create backend-network

# Run containers on the same network
docker run -d --name api --network backend-network my-nestjs-app
docker run -d --name db --network backend-network postgres:16-alpine

# Now 'api' container can reach 'db' container by name:
# postgresql://postgres:password@db:5432/mydb
#                                  ^^
#                        Container name as hostname
```

**Why custom bridge over default bridge:**

| Feature | Default Bridge | Custom Bridge |
|---|---|---|
| DNS resolution by name | No (IP only) | Yes |
| Automatic isolation | All containers share it | Only explicitly connected containers |
| Container linking | Legacy `--link` needed | Automatic |
| Hot connect/disconnect | No | Yes (`docker network connect/disconnect`) |

**Port Mapping:**

```bash
# -p hostPort:containerPort
docker run -p 3000:3000 my-nestjs-app      # Map to specific port
docker run -p 8080:3000 my-nestjs-app      # Host 8080 → Container 3000
docker run -p 127.0.0.1:3000:3000 my-app   # Bind to localhost only (not external)
docker run -P my-nestjs-app                 # Map all EXPOSE'd ports to random host ports
```

**Docker Compose with Custom Network:**

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    networks:
      - backend
      - frontend   # Can be on multiple networks

  db:
    image: postgres:16-alpine
    networks:
      - backend    # Only accessible from backend network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend   # Can reach api, but NOT db

networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge
```

In this setup, `nginx` can reach `api` (both on `frontend`), `api` can reach `db` (both on `backend`), but `nginx` cannot directly reach `db` — achieving network segmentation.

**Container DNS Resolution:**

Docker runs an embedded DNS server at `127.0.0.11` for custom networks. When container `api` tries to reach `db:5432`, the DNS server resolves `db` to the container's IP on the shared network.

```
api container                    Docker DNS              db container
     │                          (127.0.0.11)                  │
     │── resolve "db" ──────────>│                             │
     │<── 172.18.0.3 ───────────│                             │
     │                                                         │
     │── TCP connect 172.18.0.3:5432 ─────────────────────────>│
     │<── connection established ───────────────────────────────│
```

---

## Docker Volumes & Data Persistence

### Q4: How do you handle data persistence in Docker containers?

**Answer:**

By default, all data written inside a container is stored in the container's writable layer and is **lost when the container is removed**. Docker provides three mechanisms for persistent storage:

**Volume Types:**

```
┌───────────────────────────────────────────────────────────┐
│                      Docker Host                           │
│                                                            │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────┐   │
│  │  Named Volume   │  │  Bind Mount    │  │  tmpfs   │   │
│  │                 │  │                 │  │          │   │
│  │ Docker manages  │  │ Host directory  │  │ In-memory│   │
│  │ /var/lib/docker │  │ mapped into     │  │ only     │   │
│  │ /volumes/...    │  │ container       │  │          │   │
│  │                 │  │                 │  │ Lost on  │   │
│  │ Persistent      │  │ Host-dependent  │  │ stop     │   │
│  │ Portable        │  │ Great for dev   │  │          │   │
│  └────────────────┘  └────────────────┘  └──────────┘   │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

| Type | Managed By | Persistence | Use Case |
|---|---|---|---|
| **Named Volume** | Docker | Survives container removal | Databases, persistent app data |
| **Bind Mount** | Host filesystem | Depends on host path | Development (live code reload) |
| **tmpfs** | RAM | Lost when container stops | Sensitive data, temporary caches |

**Named Volumes:**

```bash
# Create a named volume
docker volume create postgres_data

# Use it in a container
docker run -d \
  --name db \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:16-alpine

# List volumes
docker volume ls

# Inspect a volume
docker volume inspect postgres_data
# Output: { "Mountpoint": "/var/lib/docker/volumes/postgres_data/_data", ... }

# Remove unused volumes
docker volume prune
```

**Bind Mounts (Development):**

```bash
# Mount current directory into container
docker run -d \
  --name api-dev \
  -v $(pwd):/app \
  -v /app/node_modules \
  -p 3000:3000 \
  my-nestjs-dev

# The anonymous volume for /app/node_modules prevents the host's
# node_modules from overriding the container's installed modules
```

**Why `-v /app/node_modules` matters:**

```
Without anonymous volume:           With anonymous volume:
Host ./             → /app          Host ./             → /app
Host ./node_modules → /app/node_modules  (empty or wrong platform)
                                    Docker node_modules → /app/node_modules (correct)
```

Native modules (like `bcrypt`, `sharp`) are compiled for the container's OS (Linux). If you bind-mount the host's `node_modules` (macOS), they will crash inside the Linux container. The anonymous volume masks the host's `node_modules` with the container's own copy.

**tmpfs Mounts:**

```bash
# In-memory storage — fast but not persistent
docker run -d \
  --name api \
  --tmpfs /app/tmp:rw,noexec,nosuid,size=100m \
  my-nestjs-app

# Use case: temp files, session data, secrets that shouldn't touch disk
```

**PostgreSQL with Persistent Volume (Production):**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d  # Run SQL scripts on first start
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

**NestJS Development with Bind Mount + Hot Reload:**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app                  # Bind mount for live code changes
      - /app/node_modules       # Anonymous volume to protect container's modules
    ports:
      - "3000:3000"
      - "9229:9229"             # Debug port
    command: npm run start:dev   # NestJS watch mode
```

**Data Backup Strategy:**

```bash
# Backup a named volume
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restore from backup
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/postgres_backup_20260313.tar.gz"
```

---

## Docker Compose

### Q5: How does Docker Compose work and how would you set up a full development environment for a NestJS microservices project?

**Answer:**

Docker Compose is a tool for defining and running multi-container applications. You describe your entire application stack (services, networks, volumes) in a single YAML file, then bring everything up with one command.

**docker-compose.yml Structure:**

```yaml
version: '3.8'          # Compose file format version (optional in Compose V2)

services:                # Container definitions
  service_name:
    image: ...           # or build: ...
    ports: [...]
    volumes: [...]
    environment: [...]
    depends_on: [...]
    networks: [...]

networks:                # Custom network definitions
  network_name:
    driver: bridge

volumes:                 # Named volume definitions
  volume_name:
    driver: local
```

**Complete Development Stack — NestJS + PostgreSQL + Redis + Kafka:**

```yaml
version: '3.8'

services:
  # ─────────────────────────────────────────
  # NestJS API Application
  # ─────────────────────────────────────────
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"        # Node.js debugger
    volumes:
      - .:/app
      - /app/node_modules  # Protect container's node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - backend
    restart: unless-stopped

  # ─────────────────────────────────────────
  # PostgreSQL Database
  # ─────────────────────────────────────────
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  # ─────────────────────────────────────────
  # Redis Cache
  # ─────────────────────────────────────────
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - backend

  # ─────────────────────────────────────────
  # Kafka + Zookeeper (Event Streaming)
  # ─────────────────────────────────────────
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - backend

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    depends_on:
      - zookeeper
    healthcheck:
      test: ["CMD", "kafka-topics", "--bootstrap-server", "localhost:9092", "--list"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - backend

  # ─────────────────────────────────────────
  # Kafka UI (Optional — for debugging)
  # ─────────────────────────────────────────
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    depends_on:
      - kafka
    profiles:
      - debug       # Only starts with: docker compose --profile debug up
    networks:
      - backend

volumes:
  postgres_data:
  redis_data:

networks:
  backend:
    driver: bridge
```

**depends_on with Health Checks:**

```yaml
# Without health checks — just waits for container to start (not ready)
depends_on:
  - db

# With health checks — waits for container to be healthy
depends_on:
  db:
    condition: service_healthy    # Wait until healthcheck passes
  redis:
    condition: service_started   # Just wait for container start
  kafka:
    condition: service_healthy
```

This is critical for NestJS apps that connect to databases on startup — without health checks, the app might crash because PostgreSQL is still initializing.

**Environment Variables and .env Files:**

```yaml
# Option 1: Inline
environment:
  - NODE_ENV=production
  - DATABASE_URL=postgresql://...

# Option 2: From .env file
env_file:
  - .env
  - .env.local    # Overrides .env values

# Option 3: Variable substitution from shell or .env
environment:
  - DATABASE_URL=${DATABASE_URL}        # From shell env or .env file
  - API_KEY=${API_KEY:-default_value}   # With default
```

Docker Compose automatically reads `.env` in the same directory for variable substitution in the YAML file:

```
# .env
POSTGRES_PASSWORD=mysecretpassword
NODE_ENV=development
```

**Override Files:**

```
docker-compose.yml               # Base configuration
docker-compose.override.yml      # Auto-loaded in development (git-ignored)
docker-compose.prod.yml          # Production overrides
```

```bash
# Development (auto-loads override)
docker compose up

# Production (explicit file selection)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Profiles for Optional Services:**

```yaml
services:
  kafka-ui:
    profiles: ["debug"]       # Only with --profile debug

  pgadmin:
    profiles: ["debug"]

  prometheus:
    profiles: ["monitoring"]
```

```bash
docker compose up                               # Core services only
docker compose --profile debug up               # Core + debug tools
docker compose --profile debug --profile monitoring up  # Everything
```

**Compose V2 vs V1:**

| Feature | V1 (`docker-compose`) | V2 (`docker compose`) |
|---|---|---|
| Binary | Separate Python tool | Built into Docker CLI |
| Command | `docker-compose up` | `docker compose up` |
| Performance | Slower | Faster (Go native) |
| `version:` key | Required | Optional |
| Status | Deprecated (EOL June 2023) | Current standard |

**Essential Compose Commands:**

```bash
docker compose up -d                  # Start all services in background
docker compose up -d --build          # Rebuild images before starting
docker compose down                   # Stop and remove containers + networks
docker compose down -v                # Also remove volumes (fresh start)
docker compose logs -f api            # Follow logs for api service
docker compose exec api sh            # Shell into running api container
docker compose ps                     # List running services
docker compose restart api            # Restart specific service
docker compose pull                   # Pull latest images
docker compose config                 # Validate and view final composed config
```

---

## Docker Security Best Practices

### Q6: What are the critical Docker security best practices for production deployments?

**Answer:**

Docker security is a layered concern — from the image you build to how the container runs. Here are the essential practices for production:

**1. Run as Non-Root User:**

```dockerfile
# Create a dedicated user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Set file ownership
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Switch to non-root user
USER nestjs
```

By default, containers run as root. If an attacker escapes the container, they're root on the host. Running as non-root limits the blast radius.

**2. Use Official/Verified Base Images:**

```dockerfile
# Good — official, specific version, minimal
FROM node:20-alpine

# Bad — unverified, could contain malware
FROM some-random-user/node-custom

# Better for maximum security — distroless (no shell, no package manager)
FROM gcr.io/distroless/nodejs20-debian12
```

**3. Scan Images for Vulnerabilities:**

```bash
# Docker Scout (built-in)
docker scout cves my-nestjs-app:latest

# Trivy (popular open-source scanner)
trivy image my-nestjs-app:latest

# Snyk
snyk container test my-nestjs-app:latest

# In CI pipeline (fail build if critical vulnerabilities found)
trivy image --exit-code 1 --severity CRITICAL my-nestjs-app:latest
```

**4. Never Store Secrets in Images:**

```dockerfile
# BAD — secret is baked into image layer (even if deleted later, it's in layer history)
ENV DATABASE_PASSWORD=mysecretpassword
COPY .env /app/.env

# GOOD — pass secrets at runtime
# docker run -e DATABASE_PASSWORD=mysecret my-app
# Or use Docker secrets / external vault (HashiCorp Vault, AWS Secrets Manager)
```

```yaml
# Docker Compose — use secrets
services:
  api:
    secrets:
      - db_password
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt    # Development
    # external: true                   # Production (from Docker Swarm / K8s)
```

**5. Minimize Image Surface Area:**

```dockerfile
# Alpine — minimal Linux distribution (~5 MB base)
FROM node:20-alpine

# Distroless — no shell, no package manager, no utilities
# Attackers can't exec into the container or install tools
FROM gcr.io/distroless/nodejs20-debian12

# Remove unnecessary packages after installing
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm ci --production && \
    apk del .build-deps
```

**6. Read-Only Filesystem:**

```bash
# Container filesystem is read-only — prevents malicious writes
docker run --read-only \
  --tmpfs /tmp \
  --tmpfs /app/tmp \
  -v logs:/app/logs \
  my-nestjs-app
```

```yaml
# docker-compose.yml
services:
  api:
    read_only: true
    tmpfs:
      - /tmp
      - /app/tmp
    volumes:
      - logs:/app/logs
```

**7. Resource Limits:**

```bash
# Prevent container from consuming all host resources
docker run \
  --memory=512m \
  --memory-swap=512m \
  --cpus=1.0 \
  --pids-limit=100 \
  my-nestjs-app
```

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

Without limits, a memory leak in one container can crash the entire host.

**8. Pin Image Versions:**

```dockerfile
# BAD — :latest can change at any time, breaking your build
FROM node:latest
FROM postgres:latest

# GOOD — specific version, reproducible builds
FROM node:20.11.1-alpine3.19
FROM postgres:16.2-alpine3.19

# ACCEPTABLE — major version pinned, auto-patches
FROM node:20-alpine
FROM postgres:16-alpine
```

**9. No Privileged Mode in Production:**

```bash
# NEVER in production — gives container full host access
docker run --privileged my-app

# Instead, grant only specific capabilities needed
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE my-app
```

**10. Docker Content Trust (Image Signing):**

```bash
# Enable content trust — only pull/run signed images
export DOCKER_CONTENT_TRUST=1

# Sign and push
docker trust sign my-registry/my-app:1.0.0
```

**Security Checklist:**

```
[ ] Non-root USER in Dockerfile
[ ] Official base images with pinned versions
[ ] Multi-stage build (no build tools in production)
[ ] .dockerignore excludes .env, .git, node_modules
[ ] No secrets in Dockerfile or image layers
[ ] Image vulnerability scanning in CI/CD
[ ] Resource limits (memory, CPU, PIDs)
[ ] Read-only filesystem where possible
[ ] No --privileged flag
[ ] Drop all capabilities, add only what's needed
[ ] Health checks defined
[ ] Logging to stdout/stderr (not files inside container)
```

---

## Docker for Development vs Production

### Q7: How should Docker configurations differ between development and production for a NestJS application?

**Answer:**

Development and production have fundamentally different requirements. Development prioritizes speed and debugging; production prioritizes security, performance, and reliability.

**Comparison:**

| Aspect | Development | Production |
|---|---|---|
| **Base image** | Standard (node:20-alpine) | Minimal (alpine, distroless) |
| **Build** | Single stage | Multi-stage |
| **Source code** | Bind mount (live reload) | Copied into image |
| **Dependencies** | All (including devDependencies) | Production only |
| **User** | Root (convenient) | Non-root (secure) |
| **Ports** | App + debug (3000 + 9229) | App only (3000) |
| **Logging** | Verbose / debug level | Structured JSON, info level |
| **Health check** | Optional | Required |
| **Resource limits** | None | Memory + CPU limits |
| **Restart policy** | No | `unless-stopped` or `always` |

**Development Dockerfile (Dockerfile.dev):**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source (will be overridden by bind mount, but needed for initial setup)
COPY . .

# Expose app port + debug port
EXPOSE 3000 9229

# Start in watch mode with debugger
CMD ["npm", "run", "start:debug"]
```

**Production Dockerfile (Dockerfile):**

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001 -G nodejs
WORKDIR /app
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
ENV NODE_ENV=production
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main"]
```

**Development Compose (docker-compose.yml):**

```yaml
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
      - "9229:9229"          # Debugger port
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - LOG_LEVEL=debug
    command: npm run start:debug

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password    # Simple password OK for dev
    ports:
      - "5432:5432"                  # Exposed for local DB tools
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Production Compose (docker-compose.prod.yml):**

```yaml
version: '3.8'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}    # From environment/secrets
      - LOG_LEVEL=info
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    # No ports exposed externally in production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 1G

volumes:
  postgres_data:
```

**Hot Reload Setup for NestJS:**

NestJS uses `@nestjs/cli` with `start:dev` or `start:debug` commands that leverage `ts-node` and file watchers. With bind mounts, file changes on the host immediately propagate into the container:

```json
// package.json scripts
{
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug 0.0.0.0:9229 --watch"
}
```

The `0.0.0.0:9229` binding is crucial — inside Docker, binding to `localhost:9229` would not be accessible from the host. You must bind to all interfaces.

**Debugging Node.js in Docker:**

1. Expose debug port in docker-compose: `"9229:9229"`
2. Start with `--debug 0.0.0.0:9229`
3. Configure VS Code:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker: Attach to NestJS",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app",
      "restart": true,
      "sourceMaps": true,
      "protocol": "inspector"
    }
  ]
}
```

---

## Container Orchestration Overview

### Q8: When do you need container orchestration and how does it compare to Docker Compose?

**Answer:**

Container orchestration automates the deployment, scaling, management, and networking of containers across multiple hosts.

**Why Orchestration:**

| Need | Docker Compose | Orchestration (K8s/ECS) |
|---|---|---|
| **Multi-host** | Single host only | Multiple hosts in a cluster |
| **Auto-scaling** | Manual (change replica count) | Automatic based on CPU/memory/custom metrics |
| **Self-healing** | Restart policy per container | Replaces failed containers, reschedules to healthy nodes |
| **Rolling updates** | Stop all, start new | Zero-downtime rolling deployments |
| **Service discovery** | Docker DNS (single host) | Cluster-wide DNS + load balancing |
| **Secret management** | .env files | Built-in encrypted secrets |
| **Load balancing** | Manual (nginx) | Built-in service load balancing |

**When Docker Compose Is Enough:**

- Development environments (local setup)
- Small production deployments (single server, < 10 containers)
- Internal tools with no HA requirement
- CI/CD pipelines (spin up test dependencies)
- Personal projects, MVPs, early startups

**When You Need Orchestration:**

- Multiple server nodes (horizontal scaling)
- High availability requirements (99.9%+)
- Auto-scaling based on traffic patterns
- Zero-downtime deployments
- Complex microservices with service mesh needs

**Docker Swarm vs Kubernetes:**

| Feature | Docker Swarm | Kubernetes |
|---|---|---|
| **Complexity** | Simple, built into Docker | Complex, steep learning curve |
| **Setup** | `docker swarm init` | Cluster setup required (kubeadm, kops, EKS) |
| **Scaling** | Basic auto-scaling | Advanced HPA, VPA, cluster autoscaler |
| **Ecosystem** | Limited | Massive (Helm, Istio, Argo, etc.) |
| **Adoption** | Declining | Industry standard |
| **Best for** | Small teams, simple workloads | Production at scale |

**AWS Container Services:**

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Container Services                     │
│                                                               │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  ECS on EC2  │   │ ECS Fargate  │   │      EKS        │  │
│  │              │   │              │   │                  │  │
│  │ You manage   │   │ Serverless   │   │ Managed          │  │
│  │ EC2 instances│   │ No servers   │   │ Kubernetes       │  │
│  │              │   │              │   │                  │  │
│  │ More control │   │ Pay per task │   │ Full K8s API     │  │
│  │ Lower cost   │   │ Less ops     │   │ Ecosystem access │  │
│  │ at scale     │   │              │   │                  │  │
│  └─────────────┘   └──────────────┘   └─────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    App Runner                             ││
│  │  Fully managed — push code/image, AWS handles everything ││
│  │  Best for: simple web apps, APIs, quick deployments      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**ECS Fargate — Serverless Containers:**

Fargate removes the need to manage EC2 instances. You define a Task (container config) and a Service (desired count, load balancer), and AWS runs your containers.

```
ECS Concepts:

Cluster → Service → Task → Container

┌─────────────────────────────────────────┐
│               ECS Cluster                │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │           ECS Service               │ │
│  │  Desired count: 3                   │ │
│  │  Load Balancer: ALB                 │ │
│  │                                     │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ │ │
│  │  │ Task 1 │ │ Task 2 │ │ Task 3 │ │ │
│  │  │┌──────┐│ │┌──────┐│ │┌──────┐│ │ │
│  │  ││NestJS││ ││NestJS││ ││NestJS││ │ │
│  │  ││:3000 ││ ││:3000 ││ ││:3000 ││ │ │
│  │  │└──────┘│ │└──────┘│ │└──────┘│ │ │
│  │  └────────┘ └────────┘ └────────┘ │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Fargate vs EC2 Launch Type:**

| Aspect | Fargate | EC2 |
|---|---|---|
| **Server management** | None (serverless) | You manage EC2 instances |
| **Pricing** | Per vCPU + memory per second | EC2 instance cost (can use Reserved/Spot) |
| **Scaling** | Task-level only | Instance + task-level |
| **Cost at small scale** | Higher | Lower (small instances) |
| **Cost at large scale** | Higher | Lower (reserved instances, spot) |
| **Ops overhead** | Minimal | Patching, AMI updates, capacity planning |
| **Best for** | Teams without dedicated DevOps, variable workloads | Predictable workloads, cost optimization |

**Decision Tree:**

```
Need containers?
├── Development / CI only → Docker Compose
├── Single server, simple prod → Docker Compose + systemd
├── Multi-server, AWS, small team → ECS Fargate
├── Multi-server, need control → ECS on EC2
└── Multi-server, multi-cloud, complex → EKS (Kubernetes)
```

---

## Docker Image Registry & CI/CD

### Q9: How do Docker registries work and how do you integrate Docker into a CI/CD pipeline?

**Answer:**

A Docker registry is a storage and distribution system for Docker images. When you `docker push`, the image layers are uploaded. When you `docker pull`, only missing layers are downloaded.

**Registry Options:**

| Registry | Type | Key Features |
|---|---|---|
| **Docker Hub** | Public/Private | Default registry, 1 free private repo |
| **AWS ECR** | Private | Integrated with ECS/EKS, IAM auth, scanning |
| **GitHub Container Registry** | Public/Private | Integrated with GitHub Actions, GHCR |
| **Google Artifact Registry** | Private | Integrated with GKE, Cloud Build |
| **Self-hosted (Harbor)** | Private | Full control, on-premise |

**AWS ECR (Elastic Container Registry):**

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.ap-southeast-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name my-nestjs-app

# Tag and push
docker tag my-nestjs-app:latest 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/my-nestjs-app:1.0.0
docker push 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/my-nestjs-app:1.0.0
```

**ECR Features:**

- **Image scanning** — automatic vulnerability scanning on push
- **Lifecycle policies** — auto-delete old/untagged images to save cost
- **Cross-region replication** — replicate images to other regions for multi-region deployments
- **Cross-account access** — share images across AWS accounts via ECR policies
- **Immutable tags** — prevent image tags from being overwritten

**ECR Lifecycle Policy Example:**

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 tagged images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Delete untagged images older than 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": { "type": "expire" }
    }
  ]
}
```

**Image Tagging Strategies:**

```bash
# Semantic versioning — clear, human-readable
docker tag app:latest my-registry/app:1.2.3
docker tag app:latest my-registry/app:1.2
docker tag app:latest my-registry/app:1

# Git SHA — traceable to exact commit
docker tag app:latest my-registry/app:$(git rev-parse --short HEAD)

# Combined — best of both worlds
docker tag app:latest my-registry/app:1.2.3-abc1234

# Environment-based
docker tag app:latest my-registry/app:staging
docker tag app:latest my-registry/app:production

# NEVER use :latest in production — it's mutable and non-deterministic
```

**CI/CD Pipeline — GitHub Actions (Build + Push to ECR + Deploy to ECS):**

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

env:
  AWS_REGION: ap-southeast-1
  ECR_REPOSITORY: my-nestjs-app
  ECS_CLUSTER: production
  ECS_SERVICE: api-service
  ECS_TASK_DEFINITION: .aws/task-definition.json

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write      # For OIDC auth with AWS
      contents: read

    steps:
      # ─── Checkout ───
      - name: Checkout code
        uses: actions/checkout@v4

      # ─── Configure AWS ───
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::role/github-actions-deploy
          aws-region: ${{ env.AWS_REGION }}

      # ─── Login to ECR ───
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # ─── Build & Push ───
      - name: Build, tag, and push image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build \
            --cache-from $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            -t $ECR_REGISTRY/$ECR_REPOSITORY:latest \
            .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      # ─── Run Tests ───
      - name: Run tests in container
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker run --rm $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG npm run test

      # ─── Scan Image ───
      - name: Scan image for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.build-image.outputs.image }}
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'

      # ─── Deploy to ECS ───
      - name: Update ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION }}
          container-name: api
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

**Layer Caching in CI/CD:**

CI environments start fresh each time, so Docker layer caching needs explicit setup:

```yaml
# Option 1: --cache-from (pull previous image as cache source)
- run: |
    docker pull $REGISTRY/$REPO:latest || true
    docker build --cache-from $REGISTRY/$REPO:latest -t $REGISTRY/$REPO:$TAG .

# Option 2: BuildKit cache mount (faster, more granular)
- run: |
    DOCKER_BUILDKIT=1 docker build \
      --build-arg BUILDKIT_INLINE_CACHE=1 \
      -t $REGISTRY/$REPO:$TAG .

# Option 3: GitHub Actions cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

## Docker Troubleshooting & Common Issues

### Q10: How do you troubleshoot Docker containers and what are the most common issues in production?

**Answer:**

**Essential Debug Commands:**

```bash
# ─── Container Logs ───
docker logs <container>               # View all logs
docker logs -f <container>            # Follow logs (tail -f)
docker logs --tail 100 <container>    # Last 100 lines
docker logs --since 30m <container>   # Last 30 minutes
docker compose logs -f api            # Compose service logs

# ─── Execute into Running Container ───
docker exec -it <container> sh        # Shell into container
docker exec -it <container> /bin/bash # If bash is available
docker exec <container> env           # View environment variables
docker exec <container> cat /etc/hosts # Check DNS entries

# ─── Container Info ───
docker inspect <container>            # Full container config as JSON
docker inspect --format='{{.State.Health.Status}}' <container>  # Health status
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>

# ─── Resource Usage ───
docker stats                          # Live CPU/memory/network per container
docker stats --no-stream              # Snapshot (not live)
docker system df                      # Disk usage by images, containers, volumes

# ─── Network Debug ───
docker network ls                     # List all networks
docker network inspect bridge         # Inspect specific network
docker exec <container> nslookup db   # Check DNS resolution inside container
docker exec <container> wget -qO- http://db:5432  # Test connectivity

# ─── Image Debug ───
docker history <image>                # Show layers and sizes
docker image inspect <image>          # Full image metadata
```

**Common Issues and Solutions:**

**Issue 1: "Cannot connect to database"**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Root causes and fixes:**
- App tries `localhost` but DB is in another container — use service name: `db:5432`
- DB container not ready yet — add `depends_on` with `condition: service_healthy`
- Containers on different networks — ensure both are on the same Docker network
- DB not accepting connections yet — add healthcheck with `pg_isready`

```yaml
# Fix: use service name + health check
services:
  api:
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb  # "db" not "localhost"
    depends_on:
      db:
        condition: service_healthy

  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10
```

**Issue 2: Out of Memory (OOM Killed)**

```
Container killed: OOM (Out of Memory)
```

```bash
# Check if container was OOM killed
docker inspect <container> --format='{{.State.OOMKilled}}'

# Fix: increase memory limit
docker run --memory=1g my-app

# Or: investigate memory leak in the app
docker stats  # Watch memory grow over time

# In Node.js — set max heap
CMD ["node", "--max-old-space-size=450", "dist/main"]
# Set to ~75-80% of container memory limit (leave room for non-heap memory)
```

**Issue 3: Permission Denied**

```
Error: EACCES: permission denied, open '/app/logs/app.log'
```

```dockerfile
# Fix: ensure the non-root user owns required directories
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs
USER nestjs
```

```bash
# For bind mounts: host file permissions must match container user UID
# Container user UID: 1001 → host files must be readable by UID 1001
chown -R 1001:1001 ./data
```

**Issue 4: Image Too Large**

```bash
# Diagnose: see what's taking up space
docker history my-app --human --format "{{.Size}}\t{{.CreatedBy}}"

# Common culprits:
# 1. node_modules with devDependencies → multi-stage build + npm prune --production
# 2. No .dockerignore → .git, test files, docs copied into image
# 3. Heavy base image → switch from node:20 (Debian, ~1 GB) to node:20-alpine (~180 MB)
# 4. Unnecessary RUN commands creating layers → chain commands with &&
```

```dockerfile
# BAD — 3 layers, no cleanup
RUN apt-get update
RUN apt-get install -y python3 make g++
RUN npm ci

# GOOD — 1 layer, with cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    npm ci && \
    apt-get purge -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*
```

**Issue 5: "Port already in use"**

```
Error: Bind for 0.0.0.0:3000 failed: port is already allocated
```

```bash
# Find what's using the port
lsof -i :3000                           # macOS/Linux
docker ps --format "{{.Ports}}"         # Check other containers

# Fix: use a different host port
docker run -p 3001:3000 my-app          # Map to host port 3001 instead

# Or stop the conflicting process/container
docker stop <conflicting-container>
```

**Issue 6: Slow Builds**

```bash
# Diagnose: look at build times per step
DOCKER_BUILDKIT=1 docker build --progress=plain .

# Fixes:
# 1. Layer caching — copy package.json before source code
# 2. .dockerignore — exclude unnecessary files from build context
# 3. Multi-stage — don't install build tools in every layer
# 4. BuildKit — enable for parallel layer building

DOCKER_BUILDKIT=1 docker build .
```

**Log Drivers:**

By default, Docker stores logs as JSON files on disk. In production, configure a log driver:

```bash
# JSON file (default) — logs at /var/lib/docker/containers/<id>/<id>-json.log
docker run --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 my-app

# AWS CloudWatch
docker run --log-driver awslogs \
  --log-opt awslogs-region=ap-southeast-1 \
  --log-opt awslogs-group=/ecs/my-app \
  my-app
```

```yaml
# docker-compose.yml
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

Without `max-size`, log files grow unbounded and can fill the disk — a common production incident.

---

## Quick Reference

### Essential Docker Commands

```bash
# ─── Images ───
docker build -t name:tag .            # Build image from Dockerfile
docker images                          # List local images
docker rmi image:tag                   # Remove image
docker image prune -a                  # Remove all unused images
docker pull image:tag                  # Pull from registry
docker push image:tag                  # Push to registry
docker tag source:tag target:tag       # Create alias for image

# ─── Containers ───
docker run -d --name n -p 3000:3000 img  # Run detached with port mapping
docker ps                              # List running containers
docker ps -a                           # List all containers (including stopped)
docker stop <container>                # Graceful stop (SIGTERM → SIGKILL)
docker kill <container>                # Immediate stop (SIGKILL)
docker rm <container>                  # Remove stopped container
docker rm -f <container>               # Force remove (stop + remove)
docker container prune                 # Remove all stopped containers

# ─── Debugging ───
docker logs -f <container>             # Follow container logs
docker exec -it <container> sh         # Shell into container
docker inspect <container>             # Full container details
docker stats                           # Live resource usage
docker top <container>                 # Processes inside container

# ─── System ───
docker system df                       # Disk usage summary
docker system prune -a                 # Remove ALL unused resources
docker info                            # Docker system information
```

### Dockerfile Best Practices Checklist

```
[ ] Use specific base image version (node:20-alpine, not node:latest)
[ ] Use multi-stage builds for production images
[ ] Copy package.json/package-lock.json before source code (layer caching)
[ ] Use npm ci instead of npm install (deterministic, faster)
[ ] Include .dockerignore (exclude node_modules, .git, .env, etc.)
[ ] Run as non-root user (USER directive)
[ ] Set NODE_ENV=production
[ ] Include HEALTHCHECK instruction
[ ] Use COPY, not ADD (unless you need archive extraction)
[ ] Chain RUN commands with && to minimize layers
[ ] Clean up after apt-get/apk (remove cache, build tools)
[ ] Set --chown on COPY to avoid extra chown layer
[ ] EXPOSE the application port
[ ] Use exec form for CMD: CMD ["node", "dist/main"] (not shell form)
```

### Docker Compose Cheat Sheet

```bash
docker compose up -d                   # Start all services (detached)
docker compose up -d --build           # Rebuild and start
docker compose down                    # Stop and remove containers + networks
docker compose down -v                 # Also remove volumes
docker compose logs -f [service]       # Follow logs
docker compose exec [service] sh       # Shell into service
docker compose ps                      # List running services
docker compose restart [service]       # Restart service
docker compose pull                    # Pull latest images
docker compose config                  # Validate compose file
docker compose build --no-cache        # Build without cache
docker compose run --rm api npm test   # Run one-off command
```

### Image Optimization Checklist

```
[ ] Start with alpine-based image (~5 MB base vs ~130 MB Debian)
[ ] Use multi-stage builds (exclude build tools from final image)
[ ] Run npm prune --production in build stage
[ ] Include comprehensive .dockerignore
[ ] Chain RUN commands to reduce layers
[ ] Remove build dependencies after compilation
[ ] Use --no-install-recommends with apt-get
[ ] Consider distroless for maximum minimalism
[ ] Verify final image size: docker images my-app
[ ] Check layer sizes: docker history my-app
```

### Common Interview Questions — Quick Answers

**Q: What happens when you run `docker run`?**
Docker CLI sends request to daemon → daemon checks if image exists locally (pulls if not) → creates container (filesystem, namespaces, cgroups) → starts process defined by CMD/ENTRYPOINT.

**Q: How do containers achieve isolation?**
Linux kernel features: **namespaces** (PID, network, mount, user, UTS — isolate what a process can see) and **cgroups** (limit CPU, memory, I/O — isolate what a process can use).

**Q: What's the difference between `docker stop` and `docker kill`?**
`stop` sends SIGTERM, waits 10s grace period, then SIGKILL. `kill` sends SIGKILL immediately. Always prefer `stop` to allow graceful shutdown (close DB connections, finish requests).

**Q: How would you reduce a Node.js Docker image from 1.2 GB to 150 MB?**
1. Switch from `node:20` (Debian) to `node:20-alpine` (~1 GB savings)
2. Multi-stage build — build in stage 1, copy only `dist/` and `node_modules` to stage 2
3. `npm prune --production` — remove devDependencies
4. `.dockerignore` — exclude .git, tests, docs from build context

**Q: Why should you not use :latest in production?**
`:latest` is mutable — it changes with every new push. Two deployments of the "same" tag can run different code. Use immutable tags (semantic version + git SHA) for reproducibility and rollback ability.

**Q: How do containers in Docker Compose communicate?**
Docker Compose creates a custom bridge network for all services. Containers resolve each other by service name via Docker's built-in DNS server. Example: service `api` connects to `postgresql://db:5432` where `db` is the service name.

**Q: What's the difference between COPY and ADD?**
Both copy files into the image. `COPY` is simple and predictable. `ADD` can auto-extract tar archives and fetch URLs. Always prefer `COPY` — `ADD` has implicit behavior that can surprise you.

**Q: How do you handle secrets in Docker?**
Never store secrets in Dockerfiles, ENV instructions, or image layers (visible in `docker history`). At runtime, pass via environment variables, Docker secrets (Swarm), Kubernetes secrets, or external vaults (AWS Secrets Manager, HashiCorp Vault).

**Q: Explain the container lifecycle.**
`create` (allocate filesystem + config) → `start` (run process) → `running` (active, executing CMD) → `stop` (SIGTERM → SIGKILL) → `exited` (process ended) → `rm` (remove container). `docker run` = `create` + `start`.

**Q: How would you debug a container that keeps crashing?**
1. `docker logs <container>` — check application logs for errors
2. `docker inspect <container>` — check State.ExitCode, OOMKilled status
3. `docker run -it <image> sh` — start container with shell instead of app
4. `docker events` — watch Docker events in real time
5. Check health check if defined: `docker inspect --format='{{json .State.Health}}' <container>`