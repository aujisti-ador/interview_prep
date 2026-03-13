# Project 7: Production Monitoring & Alerting Setup

> **Stack**: Prometheus + Grafana + Loki + AlertManager + NestJS + Docker Compose
> **Relevance**: Senior/Lead engineers MUST understand observability. "If you can't measure it, you can't manage it."
> **Estimated Build Time**: 5-6 hours

---

## What You'll Learn

- Prometheus for metrics collection (pull-based model)
- Grafana dashboards for visualization
- Loki for log aggregation (like CloudWatch Logs but self-hosted)
- AlertManager for routing alerts (Slack, PagerDuty, email)
- NestJS custom metrics (RED metrics: Rate, Errors, Duration)
- SLI/SLO monitoring and error budgets
- On-call alerting workflow and incident response

---

## System Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  NestJS App  │     │  PostgreSQL  │     │    Redis     │
│  /metrics    │     │  (exporter)  │     │  (exporter)  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │    Prometheus scrapes /metrics every 15s │
       │                    │                     │
       ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────┐
│                   Prometheus                         │
│   (Time-series DB, collects & stores metrics)        │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┼────────┐
              │                 │
       ┌──────▼──────┐  ┌──────▼───────┐
       │   Grafana   │  │ AlertManager │
       │ (Dashboards)│  │  (Alerting)  │
       └─────────────┘  └──────┬───────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
               ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
               │ Slack  │ │PagerDuty│ │ Email │
               └────────┘ └────────┘ └────────┘

Logs Flow:
┌──────────────┐     ┌─────────┐     ┌──────────┐
│  NestJS App  │────▶│ Promtail│────▶│   Loki   │───▶ Grafana
│  (stdout)    │     │ (agent) │     │ (log DB) │
└──────────────┘     └─────────┘     └──────────┘
```

**Key concepts:**

- **Prometheus** pulls metrics from each service's `/metrics` endpoint on a 15-second interval
- **Exporters** sit beside databases (PostgreSQL, Redis) and translate DB-internal stats into Prometheus-compatible format
- **Loki** is a log aggregation system; Promtail is its agent that ships container stdout/stderr to Loki
- **Grafana** is the single pane of glass: dashboards from Prometheus metrics + Loki logs side by side
- **AlertManager** handles deduplication, grouping, silencing, and routing of alerts from Prometheus

---

## Docker Compose (Pseudo Config)

```yaml
# docker-compose.yml
version: "3.8"

services:
  # ─── The Application Being Monitored ───
  api:
    build: ./nestjs-app
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/appdb
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    labels:
      logging: "promtail"    # Promtail picks up containers with this label
    # Exposes /metrics endpoint on port 3000

  # ─── Databases ───
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appdb
      POSTGRES_PASSWORD: password
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  # ─── Database Exporters ───
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: postgresql://postgres:password@postgres:5432/appdb?sslmode=disable
    depends_on:
      - postgres
    # Translates pg_stat_* views into Prometheus metrics

  redis-exporter:
    image: oliver006/redis_exporter
    ports:
      - "9121:9121"
    environment:
      REDIS_ADDR: redis://redis:6379
    depends_on:
      - redis
    # Translates Redis INFO command output into Prometheus metrics

  # ─── Host & Container Metrics ───
  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--path.rootfs=/rootfs"
    # Exposes host-level CPU, memory, disk, network metrics

  cadvisor:
    image: gcr.io/cadvisor/cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    # Exposes per-container CPU, memory, network, I/O metrics

  # ─── Prometheus (Metrics Engine) ───
  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alert.rules.yml:/etc/prometheus/alert.rules.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"         # Keep 30 days of metrics
      - "--web.enable-lifecycle"                     # Allow config reload via API
    depends_on:
      - api
      - postgres-exporter
      - redis-exporter
      - node-exporter
      - cadvisor

  # ─── AlertManager (Alert Routing) ───
  alertmanager:
    image: prom/alertmanager:v0.27.0
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml

  # ─── Grafana (Visualization) ───
  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning    # Auto-provisions datasources + dashboards
      - ./grafana/grafana.ini:/etc/grafana/grafana.ini
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
      - loki

  # ─── Loki (Log Aggregation) ───
  loki:
    image: grafana/loki:2.9.4
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki

  # ─── Promtail (Log Shipper) ───
  promtail:
    image: grafana/promtail:2.9.4
    volumes:
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log                                    # Host logs
      - /var/lib/docker/containers:/var/lib/docker/containers:ro  # Container logs
      - /var/run/docker.sock:/var/run/docker.sock            # Docker API for labels
    depends_on:
      - loki

volumes:
  pg_data:
  prometheus_data:
  grafana_data:
  loki_data:
```

**Why each service matters:**

| Service | Role | Port |
|---------|------|------|
| api | The app you are monitoring | 3000 |
| postgres-exporter | Exposes pg_stat metrics as Prometheus scrape target | 9187 |
| redis-exporter | Exposes Redis INFO metrics as Prometheus scrape target | 9121 |
| node-exporter | Host-level CPU, memory, disk | 9100 |
| cAdvisor | Per-container resource usage | 8080 |
| Prometheus | Scrapes all targets, stores time-series, evaluates alert rules | 9090 |
| AlertManager | Routes triggered alerts to Slack/PagerDuty/email | 9093 |
| Grafana | Dashboards for metrics (Prometheus) + logs (Loki) | 3001 |
| Loki | Stores logs, queryable via LogQL | 3100 |
| Promtail | Tails container logs and ships to Loki | - |

---

## NestJS Application Metrics

### Exposing the /metrics Endpoint

The NestJS app uses the `prom-client` library to expose a Prometheus-compatible `/metrics` endpoint.

**Conceptual setup:**

1. Install `prom-client` in the NestJS project
2. Create a `MetricsModule` that initializes the Prometheus registry
3. Register default metrics (process CPU, memory, event loop lag, GC stats)
4. Define custom metrics as injectable services
5. Expose a `GET /metrics` controller that returns `register.metrics()`

**Custom metrics to register:**

| Metric Name | Type | Labels | Purpose |
|-------------|------|--------|---------|
| `http_requests_total` | Counter | method, route, status | Total requests (the "R" in RED) |
| `http_request_duration_seconds` | Histogram | method, route | Request latency (the "D" in RED) |
| `http_requests_in_progress` | Gauge | method | Concurrent requests right now |
| `db_query_duration_seconds` | Histogram | operation, table | Database query performance |
| `cache_hits_total` | Counter | cache_name | Cache effectiveness numerator |
| `cache_misses_total` | Counter | cache_name | Cache effectiveness denominator |
| `queue_jobs_total` | Counter | queue, status | Bull queue jobs processed/failed |
| `active_websocket_connections` | Gauge | - | Real-time connection count |

**Histogram buckets for HTTP duration:**

```
buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
```

These represent seconds. Prometheus will count how many requests fell into each bucket, enabling percentile calculations (p50, p95, p99).

### NestJS Interceptor for Metrics (Pseudo Logic)

```
MetricsInterceptor (applied globally via APP_INTERCEPTOR):

  intercept(context, next):
    1. Extract method, route from the request context
    2. Increment http_requests_in_progress gauge (+1)
    3. Record startTime = process.hrtime()
    4. Call next.handle() (execute the actual handler)
    5. On response:
       - Calculate duration = hrtime diff in seconds
       - Extract status code from response
       - Increment http_requests_total counter with labels {method, route, status}
       - Observe duration in http_request_duration_seconds histogram with labels {method, route}
       - Decrement http_requests_in_progress gauge (-1)
    6. On error:
       - Same as above but status = error code (500, 400, etc.)
       - Decrement in_progress gauge
```

**Why an interceptor and not middleware?**

- Interceptors have access to the execution context (controller name, handler name) which gives you the actual route pattern (`/api/users/:id`) instead of the resolved path (`/api/users/123`)
- This prevents high-cardinality label explosions (thousands of unique label combinations = Prometheus memory bomb)

### Sample /metrics Output

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/users",status="200"} 15234
http_requests_total{method="POST",route="/api/orders",status="201"} 892
http_requests_total{method="POST",route="/api/orders",status="400"} 23

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/users",le="0.1"} 14500
http_request_duration_seconds_bucket{method="GET",route="/api/users",le="0.5"} 15100
http_request_duration_seconds_bucket{method="GET",route="/api/users",le="1.0"} 15230
http_request_duration_seconds_bucket{method="GET",route="/api/users",le="+Inf"} 15234
http_request_duration_seconds_sum{method="GET",route="/api/users"} 1893.5
http_request_duration_seconds_count{method="GET",route="/api/users"} 15234

# HELP http_requests_in_progress Current in-flight requests
# TYPE http_requests_in_progress gauge
http_requests_in_progress{method="GET"} 12

# HELP db_query_duration_seconds Database query duration
# TYPE db_query_duration_seconds histogram
db_query_duration_seconds_bucket{operation="SELECT",table="users",le="0.01"} 89200
db_query_duration_seconds_bucket{operation="SELECT",table="users",le="0.1"} 91000
db_query_duration_seconds_sum{operation="SELECT",table="users"} 4521.3
db_query_duration_seconds_count{operation="SELECT",table="users"} 91234

# HELP cache_hits_total Total cache hits
# TYPE cache_hits_total counter
cache_hits_total{cache_name="user_sessions"} 45230
cache_misses_total{cache_name="user_sessions"} 2100
```

**Reading histogram data:**

- `le="0.1"` bucket has 14500 requests: 95.2% of requests completed in under 100ms
- `_sum / _count` = average duration: 1893.5 / 15234 = 124ms
- Prometheus uses these buckets to calculate `histogram_quantile(0.95, ...)` for p95

---

## Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s          # How often Prometheus scrapes targets
  evaluation_interval: 15s      # How often Prometheus evaluates alert rules
  scrape_timeout: 10s           # Timeout per scrape request

# Alert rules location
rule_files:
  - /etc/prometheus/alert.rules.yml

# AlertManager endpoint
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# ─── Scrape Configs ───
scrape_configs:
  # The NestJS application
  - job_name: "nestjs-api"
    metrics_path: /metrics
    static_configs:
      - targets: ["api:3000"]
        labels:
          service: "api"
          environment: "production"

  # PostgreSQL metrics via exporter
  - job_name: "postgresql"
    static_configs:
      - targets: ["postgres-exporter:9187"]
        labels:
          service: "postgresql"

  # Redis metrics via exporter
  - job_name: "redis"
    static_configs:
      - targets: ["redis-exporter:9121"]
        labels:
          service: "redis"

  # Host-level metrics (CPU, memory, disk, network)
  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]
        labels:
          service: "host"

  # Container-level metrics
  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
        labels:
          service: "containers"

  # Prometheus monitoring itself
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
```

**How scraping works:**

1. Every 15 seconds, Prometheus sends HTTP GET to each target's metrics_path
2. Target responds with plain text in Prometheus exposition format
3. Prometheus parses and stores each metric as a time-series with timestamp
4. Labels (job, instance, plus any custom) are attached to each time-series
5. Data is stored in Prometheus's TSDB (on-disk, compressed)

---

## Alert Rules

```yaml
# prometheus/alert.rules.yml
groups:
  # ═══════════════════════════════════════
  # APPLICATION ALERTS
  # ═══════════════════════════════════════
  - name: api-alerts
    rules:
      # ── High Error Rate ──
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected ({{ $value | humanizePercentage }})"
          description: "More than 5% of requests are returning 5xx for the last 5 minutes"
          runbook: "https://wiki.internal/runbooks/high-error-rate"

      # ── High Latency ──
      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 2
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "P95 latency is {{ $value | humanizeDuration }}"
          description: "95th percentile response time exceeds 2 seconds for 5 minutes"

      # ── API Down (No Traffic) ──
      - alert: APINoTraffic
        expr: |
          sum(rate(http_requests_total[2m])) == 0
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "API is receiving zero requests"
          description: "No HTTP requests recorded for 2 minutes — service may be down"

      # ── Potential DDoS ──
      - alert: HighRequestRate
        expr: |
          sum(rate(http_requests_total[1m])) > 1000
        for: 2m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Unusually high request rate: {{ $value | humanize }} req/s"

  # ═══════════════════════════════════════
  # INFRASTRUCTURE ALERTS
  # ═══════════════════════════════════════
  - name: infrastructure-alerts
    rules:
      # ── High CPU ──
      - alert: HighCPUUsage
        expr: |
          100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
          team: infra
        annotations:
          summary: "CPU usage above 80% for 10 minutes ({{ $value | humanize }}%)"

      # ── High Memory ──
      - alert: HighMemoryUsage
        expr: |
          (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
        for: 5m
        labels:
          severity: warning
          team: infra
        annotations:
          summary: "Memory usage above 85% ({{ $value | humanize }}%)"

      # ── Low Disk Space ──
      - alert: LowDiskSpace
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 20
        for: 5m
        labels:
          severity: warning
          team: infra
        annotations:
          summary: "Disk space below 20% ({{ $value | humanize }}% remaining)"

      # ── Container Crash Looping ──
      - alert: ContainerCrashLooping
        expr: |
          increase(container_restart_count[10m]) > 3
        for: 1m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Container {{ $labels.name }} restarted {{ $value }} times in 10 minutes"

  # ═══════════════════════════════════════
  # DATABASE ALERTS
  # ═══════════════════════════════════════
  - name: database-alerts
    rules:
      # ── PostgreSQL Connection Pool Exhaustion ──
      - alert: PostgreSQLHighConnections
        expr: |
          pg_stat_activity_count / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "PostgreSQL connection pool >80% utilized"

      # ── PostgreSQL Slow Queries ──
      - alert: PostgreSQLSlowQueries
        expr: |
          pg_stat_activity_max_tx_duration{state="active"} > 5
        for: 2m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "PostgreSQL has queries running longer than 5 seconds"

      # ── PostgreSQL Replication Lag ──
      - alert: PostgreSQLReplicationLag
        expr: |
          pg_replication_lag > 10
        for: 5m
        labels:
          severity: critical
          team: infra
        annotations:
          summary: "PostgreSQL replication lag is {{ $value | humanizeDuration }}"

      # ── Redis High Memory ──
      - alert: RedisHighMemory
        expr: |
          redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Redis memory usage above 80%"

      # ── Redis Too Many Clients ──
      - alert: RedisTooManyClients
        expr: |
          redis_connected_clients > 1000
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Redis has {{ $value }} connected clients"

  # ═══════════════════════════════════════
  # BUSINESS / SLO ALERTS
  # ═══════════════════════════════════════
  - name: slo-alerts
    rules:
      # ── Error Budget Burn Rate (Multi-Window) ──
      # SLO: 99.9% availability = 0.1% error budget over 30 days
      # If we burn error budget 14.4x faster than expected, alert immediately
      - alert: ErrorBudgetHighBurnRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) > (14.4 * 0.001)
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Error budget burning 14.4x faster than allowed"
          description: "At this rate, the 30-day error budget will be exhausted in ~2 days"

      # ── Order Processing SLO ──
      - alert: OrderProcessingLatencySLO
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket{route="/api/orders"}[10m])) by (le)
          ) > 1.0
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Order processing p95 latency exceeds 1s SLO"

      # ── Payment Failure Rate ──
      - alert: HighPaymentFailureRate
        expr: |
          sum(rate(http_requests_total{route="/api/payments",status=~"5.."}[10m]))
          /
          sum(rate(http_requests_total{route="/api/payments"}[10m]))
          > 0.01
        for: 5m
        labels:
          severity: critical
          team: payments
        annotations:
          summary: "Payment failure rate exceeds 1% ({{ $value | humanizePercentage }})"
```

---

## AlertManager Configuration

```yaml
# alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: "https://hooks.slack.com/services/T00/B00/XXXX"
  pagerduty_url: "https://events.pagerduty.com/v2/enqueue"

# ─── Route Tree ───
# Routes determine WHERE alerts go based on labels
route:
  receiver: "slack-backend-info"        # Default receiver (fallback)
  group_by: ["alertname", "service"]    # Group related alerts together
  group_wait: 30s                       # Wait 30s to batch initial alerts
  group_interval: 5m                    # Wait 5m between batched notifications
  repeat_interval: 4h                   # Re-send unresolved alerts every 4h

  routes:
    # Critical alerts -> PagerDuty (pages on-call engineer)
    - match:
        severity: critical
      receiver: "pagerduty-critical"
      repeat_interval: 30m              # Re-page every 30 min if unresolved
      continue: true                    # Also send to next matching route

    # Critical also goes to Slack for visibility
    - match:
        severity: critical
      receiver: "slack-backend-alerts"

    # Warnings -> Slack alerts channel
    - match:
        severity: warning
      receiver: "slack-backend-alerts"
      repeat_interval: 4h

    # Info -> Slack info channel (low noise)
    - match:
        severity: info
      receiver: "slack-backend-info"
      repeat_interval: 12h

# ─── Receivers ───
receivers:
  - name: "pagerduty-critical"
    pagerduty_configs:
      - service_key: "<pagerduty-integration-key>"
        severity: "critical"
        description: "{{ .CommonAnnotations.summary }}"
        details:
          firing: "{{ .Alerts.Firing | len }}"
          resolved: "{{ .Alerts.Resolved | len }}"

  - name: "slack-backend-alerts"
    slack_configs:
      - channel: "#backend-alerts"
        send_resolved: true
        title: '{{ if eq .Status "firing" }}ALERT{{ else }}RESOLVED{{ end }}: {{ .CommonLabels.alertname }}'
        text: "{{ .CommonAnnotations.summary }}\n{{ .CommonAnnotations.description }}"
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'

  - name: "slack-backend-info"
    slack_configs:
      - channel: "#backend-info"
        send_resolved: true
        title: "INFO: {{ .CommonLabels.alertname }}"
        text: "{{ .CommonAnnotations.summary }}"

  - name: "email-fallback"
    email_configs:
      - to: "backend-team@company.com"
        from: "alertmanager@company.com"
        smarthost: "smtp.company.com:587"

# ─── Inhibition Rules ───
# Prevent noisy duplicate alerts
inhibit_rules:
  # If a critical alert fires, suppress warnings for the same alertname
  - source_match:
      severity: "critical"
    target_match:
      severity: "warning"
    equal: ["alertname", "service"]

  # If APINoTraffic fires (service is down), suppress HighLatency (meaningless when down)
  - source_match:
      alertname: "APINoTraffic"
    target_match:
      alertname: "HighLatencyP95"
    equal: ["service"]
```

**Route tree decision flow:**

```
Alert comes in with labels {severity: "critical", alertname: "HighErrorRate", service: "api"}
  |
  ├─ Match severity=critical? YES -> pagerduty-critical (continue: true)
  ├─ Match severity=critical? YES -> slack-backend-alerts
  └─ Done (first full match without continue stops)
```

---

## Grafana Dashboards

### Dashboard 1: API Overview (RED Metrics)

**Panels and their PromQL queries:**

| Panel | Type | PromQL |
|-------|------|--------|
| Request Rate | Time Series | `sum(rate(http_requests_total[5m]))` |
| Error Rate % | Time Series | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100` |
| Latency p50 | Time Series | `histogram_quantile(0.5, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` |
| Latency p95 | Time Series | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` |
| Latency p99 | Time Series | `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` |
| Status Code Distribution | Pie Chart | `sum by (status) (increase(http_requests_total[1h]))` |
| Top 10 Slowest Endpoints | Table | `topk(10, histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)))` |
| Active Connections | Gauge | `http_requests_in_progress` |
| Rate by Endpoint | Stacked Bar | `sum by (route) (rate(http_requests_total[5m]))` |

**Layout:** 3 big numbers at the top (Rate, Error %, p95), full-width time series below, tables at the bottom.

### Dashboard 2: Infrastructure

| Panel | PromQL |
|-------|--------|
| CPU per Container | `rate(container_cpu_usage_seconds_total[5m]) * 100` |
| Memory per Container | `container_memory_usage_bytes / 1024 / 1024` (MB) |
| Network RX/TX | `rate(container_network_receive_bytes_total[5m])` |
| Disk Usage | `(1 - node_filesystem_avail_bytes/node_filesystem_size_bytes) * 100` |
| Container Restarts | `increase(container_restart_count[1h])` |

### Dashboard 3: Database

**PostgreSQL panels:**

| Panel | PromQL |
|-------|--------|
| Active Connections | `pg_stat_activity_count` |
| Query Rate | `rate(pg_stat_database_xact_commit[5m]) + rate(pg_stat_database_xact_rollback[5m])` |
| Cache Hit Ratio | `pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read)` |
| Replication Lag | `pg_replication_lag` |

**Redis panels:**

| Panel | PromQL |
|-------|--------|
| Memory Usage | `redis_memory_used_bytes / redis_memory_max_bytes * 100` |
| Connected Clients | `redis_connected_clients` |
| Commands/sec | `rate(redis_commands_processed_total[5m])` |
| Cache Hit Ratio | `rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))` |
| Evictions | `rate(redis_evicted_keys_total[5m])` |

### Dashboard 4: SLO Dashboard

| Panel | Type | PromQL / Logic |
|-------|------|----------------|
| Availability SLI | Stat (big number) | `1 - (sum(rate(http_requests_total{status=~"5.."}[30d])) / sum(rate(http_requests_total[30d])))` Target: 99.9% |
| Latency SLI | Stat | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[30d])) by (le)) < 0.5` as percentage. Target: 95% under 500ms |
| Error Budget Remaining | Gauge (0-100%) | `1 - (error_rate_30d / 0.001)` where 0.001 is the allowed error rate for 99.9% SLO |
| Error Budget Burn Rate | Time Series | `sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h])) / 0.001` (1.0 = nominal burn, >1 = burning faster than budget allows) |
| 30-Day SLO Compliance | Stat | Green if SLI >= SLO target, Red if below |

**Error budget explained:**

- SLO: 99.9% availability over 30 days
- Error budget: 0.1% = 43.2 minutes of downtime per month
- Burn rate 1.0 = using budget evenly over 30 days (nominal)
- Burn rate 14.4 = will exhaust budget in 2 days (alert!)
- Burn rate 0.0 = no errors (saving budget)

---

## Loki + Promtail for Logs

### Loki Configuration

```yaml
# loki/loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v12
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 30d          # Keep logs for 30 days
  max_query_series: 500

# Key concept: Loki does NOT index log content (unlike Elasticsearch)
# It only indexes labels. This makes it extremely lightweight and cheap.
# Tradeoff: full-text search is slower (grep over chunks) but storage is 10x cheaper
```

### Promtail Configuration

```yaml
# promtail/promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml    # Tracks where Promtail left off reading

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      # Use container name as a label
      - source_labels: ["__meta_docker_container_name"]
        target_label: "container"
      # Use compose service name
      - source_labels: ["__meta_docker_compose_service"]
        target_label: "service"

    pipeline_stages:
      # Parse JSON logs from NestJS
      - json:
          expressions:
            level: level
            message: message
            timestamp: timestamp
            context: context

      # Set log level as a label (for filtering: {level="error"})
      - labels:
          level:

      # Set timestamp from the log entry (not ingestion time)
      - timestamp:
          source: timestamp
          format: "2006-01-02T15:04:05.000Z"

      # Format the output line
      - output:
          source: message
```

**Pipeline flow:**

```
Container stdout → Promtail reads → JSON parse → Extract labels → Ship to Loki
```

### LogQL Examples (Grafana Explore)

```
# Find all error logs from the API service
{service="api"} |= "error"

# Parse JSON logs and filter by level
{service="api"} | json | level="error"

# Format output to show only the message field
{service="api"} | json | level="error" | line_format "{{.message}}"

# Count error rate over time (useful for dashboards)
rate({service="api"} |= "error" [5m])

# Find logs containing a specific trace/request ID
{service="api"} |= "req-id-abc123"

# Find slow database queries logged by the app
{service="api"} | json | message=~".*query took.*" | duration > 1s

# Top 10 most frequent error messages
topk(10, sum by (message) (count_over_time({service="api"} | json | level="error" [1h])))
```

### Correlating Metrics with Logs

This is the killer workflow:

1. See a spike in the error rate on the Grafana dashboard (Prometheus metric)
2. Click on the spike timestamp
3. Grafana opens Loki Explore with the time range pre-filled
4. Query: `{service="api"} | json | level="error"` for that exact time window
5. See the actual error messages and stack traces
6. Correlate: "Ah, ConnectionRefused errors to PostgreSQL started at 14:32"

This is why Grafana + Prometheus + Loki is so powerful: metrics tell you WHAT is wrong, logs tell you WHY.

---

## Grafana Datasource Provisioning

```yaml
# grafana/provisioning/datasources/datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
    jsonData:
      derivedFields:
        # Clicking a trace ID in logs opens the trace (if you add Tempo later)
        - datasourceUid: tempo
          matcherRegex: "traceId=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
```

---

## Directory Structure

```
monitoring-project/
├── docker-compose.yml               # All 10 services defined above
├── prometheus/
│   ├── prometheus.yml               # Scrape targets and global config
│   └── alert.rules.yml              # All alert rules with PromQL
├── alertmanager/
│   └── alertmanager.yml             # Route tree, receivers, inhibition rules
├── grafana/
│   ├── provisioning/
│   │   ├── dashboards/
│   │   │   ├── dashboard.yml        # Dashboard provider config
│   │   │   ├── api-overview.json    # RED metrics dashboard
│   │   │   ├── infrastructure.json  # Host + container metrics
│   │   │   ├── database.json        # PostgreSQL + Redis panels
│   │   │   └── slo.json             # SLO/error budget dashboard
│   │   └── datasources/
│   │       └── datasources.yml      # Prometheus + Loki auto-configured
│   └── grafana.ini                  # Auth, org, anonymous access settings
├── loki/
│   └── loki-config.yml              # Storage, retention, schema
├── promtail/
│   └── promtail-config.yml          # Docker SD, pipeline stages, labels
└── nestjs-app/
    ├── src/
    │   ├── metrics/
    │   │   ├── metrics.module.ts    # prom-client setup
    │   │   ├── metrics.service.ts   # Custom metric definitions
    │   │   └── metrics.controller.ts # GET /metrics endpoint
    │   ├── interceptors/
    │   │   └── metrics.interceptor.ts # Global HTTP metrics collection
    │   └── main.ts
    ├── Dockerfile
    └── package.json
```

---

## On-Call Workflow

```
1. Alert fires: HighErrorRate > 5% for 5 minutes
       │
2. Prometheus evaluates rule → sends to AlertManager
       │
3. AlertManager matches severity=critical
       │
       ├──→ PagerDuty: pages on-call engineer (phone call + push notification)
       └──→ Slack #backend-alerts: team visibility
       │
4. On-call engineer acknowledges page (within 15 min SLA)
       │
5. Opens Grafana API Overview dashboard
       │
       ├── Sees: error rate spiked from 0.1% to 8% at 14:32
       ├── Sees: latency p95 also spiked from 120ms to 5s
       └── Sees: request rate is normal (not a traffic spike)
       │
6. Clicks on error spike → jumps to Loki logs for 14:30-14:35
       │
       └── Finds: "ECONNREFUSED 10.0.2.15:5432" repeated thousands of times
       │
7. Checks PostgreSQL dashboard
       │
       └── Finds: active connections = 100/100 (maxed out)
       │
8. Root cause identified: connection pool exhaustion
       │
9. Fix applied: increase max_connections OR fix connection leak in app
       │
10. Monitor recovery on dashboard: error rate drops back to 0.1%
       │
11. Resolve alert in PagerDuty
       │
12. Write postmortem:
    - Impact: 8% error rate for 12 minutes, ~180 users affected
    - Root cause: unclosed DB connections in new batch job (deployed at 14:28)
    - Timeline: 14:28 deploy → 14:32 connections exhausted → 14:44 fix deployed
    - Action items:
      [ ] Add connection pool monitoring to batch job
      [ ] Set up alert for connection pool usage > 70% (warning)
      [ ] Add circuit breaker for DB connections
      [ ] Load test batch job before next deploy
```

---

## BD Context

- **Cost**: Prometheus + Grafana + Loki are all open source (FREE to self-host)
- **Alternative**: AWS CloudWatch is simpler but costs $0.30/custom metric/month + $0.50/GB log ingestion
- **For BD startups**: self-hosted Prometheus stack on a $10-20/month VPS beats CloudWatch costs significantly once you have 50+ custom metrics
- **International context**: SOC 2 Type II compliance requires centralized logging, alerting, and audit trails -- this setup satisfies those requirements
- **Managed alternatives**: Grafana Cloud free tier gives 10K metrics + 50GB logs/month -- excellent for small teams
- **When to use CloudWatch instead**: if you are all-in on AWS and the team is small, CloudWatch is simpler to operate (no infrastructure to maintain)

---

## Interview Talking Points

### "How do you monitor a production system?"

Walk through the architecture: instrumentation (metrics endpoint) -> collection (Prometheus scrapes) -> visualization (Grafana dashboards) -> alerting (AlertManager routes to PagerDuty/Slack). Mention the importance of covering all three pillars: metrics, logs, and traces.

### RED vs USE Metrics Framework

- **RED** (for request-driven services): Rate, Errors, Duration -- what we implemented for the NestJS API
- **USE** (for resource-driven systems): Utilization, Saturation, Errors -- what node-exporter and cAdvisor provide for CPU, memory, disk, network
- Use RED for your APIs, USE for your infrastructure

### SLI / SLO / SLA Differences

- **SLI** (Service Level Indicator): the metric itself. "99.95% of requests returned 2xx in the last 30 days"
- **SLO** (Service Level Objective): the target. "We aim for 99.9% availability"
- **SLA** (Service Level Agreement): the contract with consequences. "If availability drops below 99.5%, customer gets service credit"
- SLI measures reality, SLO sets the goal, SLA defines the penalty

### Why Prometheus Pull Model vs Push (Datadog, CloudWatch)

- **Pull**: Prometheus scrapes targets. Advantages: simpler target config, Prometheus controls the rate, easy to detect if a target is down (scrape fails), no client-side buffering needed
- **Push**: Clients send metrics to the collector. Advantages: works behind firewalls, works for short-lived batch jobs, simpler client implementation
- Prometheus supports both (Pushgateway for batch jobs) but prefers pull

### "How do you debug a production latency spike?"

1. Check the dashboard -- is it all endpoints or specific ones?
2. Check error rates -- is latency high because of retries/errors?
3. Check infrastructure -- CPU, memory, network (USE metrics)
4. Check database dashboards -- slow queries, connection pool, replication lag
5. Correlate with logs at the spike timestamp
6. Check recent deployments -- did someone deploy at that time?
7. Check external dependencies -- third-party API latency

### Alerting Fatigue: Good Alert vs Noisy Alert

- **Good alert**: actionable, urgent, requires human judgment. "Error rate > 5% for 5 minutes" -- you need to investigate
- **Noisy alert**: not actionable or auto-resolves. "CPU spike to 81% for 30 seconds" -- the system handles it
- Rules: every alert should have a runbook, alerts that fire and auto-resolve frequently should be tuned or removed, use severity levels to distinguish "wake someone up" from "check tomorrow"

---

## What to Practice

1. **Set up the full stack**: `docker-compose up` and verify all services are healthy
2. **Create a custom dashboard**: build the API Overview dashboard from scratch in Grafana
3. **Write PromQL queries**: practice rate(), histogram_quantile(), sum by(), topk() in the Prometheus UI
4. **Simulate an incident**: add artificial delays or errors in the NestJS app, watch alerts fire, follow the debugging workflow
5. **Explain the architecture**: draw the system diagram on a whiteboard and walk through data flow from metric generation to alert notification
6. **Configure a new alert**: add an alert for a custom business metric (e.g., failed payments > threshold)
7. **Correlate metrics and logs**: practice the workflow of spotting a metric anomaly and drilling down into Loki logs
