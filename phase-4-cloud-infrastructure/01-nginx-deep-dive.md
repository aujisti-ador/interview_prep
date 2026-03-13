# NGINX Deep Dive - Interview Q&A

## Table of Contents
1. [What is NGINX & How It Works](#what-is-nginx--how-it-works)
2. [NGINX as Reverse Proxy](#nginx-as-reverse-proxy)
3. [Load Balancing](#load-balancing)
4. [SSL/TLS Termination](#ssltls-termination)
5. [Rate Limiting & Throttling](#rate-limiting--throttling)
6. [Caching with NGINX](#caching-with-nginx)
7. [Security Headers & Hardening](#security-headers--hardening)
8. [NGINX for WebSocket & Real-Time](#nginx-for-websocket--real-time)
9. [NGINX with Docker & Kubernetes](#nginx-with-docker--kubernetes)
10. [NGINX Performance Tuning](#nginx-performance-tuning)
11. [NGINX Configuration Best Practices](#nginx-configuration-best-practices)
12. [NGINX as API Gateway](#nginx-as-api-gateway)
13. [Common NGINX Interview Questions](#common-nginx-interview-questions)
14. [Quick Reference](#quick-reference)

---

## What is NGINX & How It Works

### Q1: What is NGINX and how does its architecture work internally?

**Answer:**
NGINX (pronounced "engine-x") is a high-performance, open-source web server, reverse proxy, load balancer, and HTTP cache. It was created by Igor Sysoev in 2004 to solve the C10K problem (handling 10,000+ concurrent connections).

**Core Architecture: Event-Driven, Non-Blocking I/O**

NGINX uses an event-driven, asynchronous, non-blocking architecture — conceptually similar to how Node.js works with its event loop. Instead of spawning a thread or process per connection (like traditional Apache), NGINX uses a small number of worker processes that each run an event loop to handle thousands of connections concurrently.

```
                    NGINX Architecture (ASCII)

    ┌─────────────────────────────────────────────────┐
    │                  Master Process                  │
    │  - Reads config, binds ports, manages workers    │
    │  - Runs as root (to bind port 80/443)            │
    ├─────────────────────────────────────────────────┤
    │                                                   │
    │   ┌──────────┐  ┌──────────┐  ┌──────────┐      │
    │   │ Worker 1 │  │ Worker 2 │  │ Worker N │      │
    │   │          │  │          │  │          │      │
    │   │ Event    │  │ Event    │  │ Event    │      │
    │   │ Loop     │  │ Loop     │  │ Loop     │      │
    │   │          │  │          │  │          │      │
    │   │ ~1024+   │  │ ~1024+   │  │ ~1024+   │      │
    │   │ conns    │  │ conns    │  │ conns    │      │
    │   └──────────┘  └──────────┘  └──────────┘      │
    │                                                   │
    │   Uses epoll (Linux) / kqueue (macOS/BSD)        │
    │   for OS-level event notification                 │
    └─────────────────────────────────────────────────┘
```

**Master Process:**
- Reads and validates configuration
- Binds to ports (80, 443)
- Spawns and manages worker processes
- Handles graceful reloads (`nginx -s reload`) — starts new workers with new config, gracefully shuts down old workers

**Worker Processes:**
- Each worker is a single-threaded process running an event loop
- Each worker handles thousands of connections simultaneously
- Workers use OS-level event notification mechanisms: `epoll` (Linux), `kqueue` (macOS/BSD)
- No thread context switching overhead — this is why NGINX is fast
- Workers are independent — if one crashes, others continue serving

**Why NGINX is fast:**
1. **No thread-per-connection** — avoids thread creation/context-switching overhead
2. **Non-blocking I/O** — worker never waits; moves to next event while I/O completes
3. **Efficient memory usage** — each connection uses only a few KB (vs MB per thread in Apache)
4. **Zero-copy** — uses `sendfile()` to serve static files directly from kernel space
5. **Event-driven** — OS notifies NGINX when data is ready (epoll/kqueue), no polling

### Q2: How does NGINX compare to Apache? When would you choose one over the other?

**Answer:**

| Feature | NGINX | Apache |
|---|---|---|
| **Architecture** | Event-driven, non-blocking | Process/thread per connection |
| **Concurrency** | Handles 10K+ connections easily | Struggles above a few thousand |
| **Memory** | ~2.5 MB per 10K idle connections | ~2.5 MB per connection (thread) |
| **Static files** | Extremely fast (sendfile) | Slower, passes through module stack |
| **Dynamic content** | Proxies to app server (FastCGI, etc.) | Embeds interpreters (mod_php) |
| **Config** | Centralized config files | .htaccess per directory (flexible but slow) |
| **Modules** | Compiled at build time (mostly) | Dynamically loadable at runtime |
| **Use case** | Reverse proxy, LB, high concurrency | Shared hosting, .htaccess needed |

**When to choose NGINX:**
- High-concurrency workloads (APIs, microservices)
- Reverse proxy / load balancer in front of app servers
- Static file serving at scale
- You need an API gateway or SSL terminator

**When to choose Apache:**
- Shared hosting environments (need .htaccess)
- Legacy PHP apps with mod_php
- Need dynamic module loading without recompilation

### Q3: What are the primary use cases of NGINX?

**Answer:**

1. **Reverse Proxy** — sits in front of backend servers, forwards client requests
2. **Load Balancer** — distributes traffic across multiple backend instances
3. **Static File Server** — serves HTML, CSS, JS, images with extreme efficiency
4. **API Gateway** — routes requests to different microservices based on path/host
5. **SSL/TLS Terminator** — handles encryption/decryption, forwards plain HTTP to backend
6. **Caching Proxy** — caches backend responses to reduce load
7. **HTTP/2 Gateway** — accepts HTTP/2 from clients, proxies HTTP/1.1 to backend
8. **WebSocket Proxy** — proxies WebSocket connections to backend servers
9. **Rate Limiter** — protects backends from abuse and DDoS

**NGINX vs NGINX Plus:**

| Feature | NGINX (Open Source) | NGINX Plus (Commercial) |
|---|---|---|
| Reverse proxy & LB | Yes | Yes |
| Active health checks | No (passive only) | Yes |
| Session persistence | ip_hash only | Cookie-based, route-based |
| JWT validation | No | Yes |
| Dynamic reconfiguration | Reload required | API-based (no reload) |
| Monitoring dashboard | No | Yes (live activity monitoring) |
| Cost | Free | ~$2,500/year per instance |

---

## NGINX as Reverse Proxy

### Q4: What is a reverse proxy and why would you use NGINX as one?

**Answer:**

A **reverse proxy** sits between clients and backend servers, forwarding client requests to the appropriate backend. The client only communicates with the proxy — it never knows about the backend servers.

**Forward Proxy vs Reverse Proxy:**
- **Forward proxy**: client → proxy → internet (client knows it's using a proxy, e.g., corporate proxy)
- **Reverse proxy**: client → proxy → backend servers (client thinks the proxy IS the server)

**Why use NGINX as a reverse proxy:**
1. **Hide backend infrastructure** — clients see only the NGINX IP, not your app servers
2. **SSL termination** — handle TLS at NGINX, send plain HTTP to backend (less CPU on app servers)
3. **Load balancing** — distribute across multiple backends
4. **Caching** — cache responses to reduce backend load
5. **Compression** — gzip responses at NGINX level
6. **Security** — filter malicious requests before they reach your app
7. **Static file serving** — NGINX serves static assets, proxy only dynamic requests
8. **Protocol translation** — accept HTTP/2 from clients, proxy HTTP/1.1 to backend

### Q5: Show me a production-ready reverse proxy configuration for a NestJS application.

**Answer:**

```nginx
# /etc/nginx/conf.d/api.example.com.conf

# Rate limiting zone (defined outside server block)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    listen 80;
    server_name api.example.com;
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL (covered in detail in Q10)
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/api.access.log;
    error_log /var/log/nginx/api.error.log;

    # Max request body size (for file uploads)
    client_max_body_size 10m;

    # Proxy to NestJS application
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://localhost:3000;

        # Essential proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host $host;
        access_log off; # Don't clutter logs
    }

    # Static files (if served by NGINX directly)
    location /static/ {
        alias /var/www/api/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Q6: Explain the important proxy headers. What happens if you forget them?

**Answer:**

| Header | Directive | Purpose | What Happens If Missing |
|---|---|---|---|
| `Host` | `proxy_set_header Host $host;` | Original hostname the client requested | Backend sees proxy's hostname, virtual hosting breaks |
| `X-Real-IP` | `proxy_set_header X-Real-IP $remote_addr;` | Client's actual IP address | Backend sees NGINX's IP (127.0.0.1), logging/rate-limiting breaks |
| `X-Forwarded-For` | `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` | Chain of proxy IPs (client, proxy1, proxy2) | Backend can't trace request origin through multiple proxies |
| `X-Forwarded-Proto` | `proxy_set_header X-Forwarded-Proto $scheme;` | Original protocol (http or https) | Backend thinks request is HTTP even though client used HTTPS; redirect loops |

**Real-world impact — NestJS example:**
If you forget `X-Forwarded-For`, your NestJS `@Ip()` decorator or `request.ip` will always return `127.0.0.1`. Your rate limiting, geo-blocking, and audit logs are now useless.

In NestJS with Express, you also need to enable `app.set('trust proxy', 1)` to make Express read these headers.

### Q7: How do you configure proxy buffering and what are the trade-offs?

**Answer:**

**Proxy buffering** means NGINX reads the entire response from the backend into a buffer, then sends it to the client. Without buffering, NGINX passes chunks to the client as they arrive from the backend.

```nginx
location / {
    proxy_pass http://backend;

    # Enable/disable buffering (default: on)
    proxy_buffering on;

    # Size of the buffer for the first part of the response (headers + start of body)
    proxy_buffer_size 4k;

    # Number and size of buffers for the rest of the response
    proxy_buffers 8 4k;

    # If response doesn't fit in memory buffers, write to disk
    proxy_max_temp_file_size 1024m;
    proxy_temp_file_write_size 8k;
}
```

**With buffering ON (default):**
- NGINX reads entire backend response into buffer
- Backend connection is freed quickly (backend can handle next request)
- Client receives data at its own pace (slow clients don't block backend)
- Uses more memory on NGINX

**With buffering OFF:**
- Response is passed synchronously to client as it arrives
- Backend connection is held open until client finishes receiving
- Required for SSE (Server-Sent Events) and streaming responses
- Less memory on NGINX

```nginx
# Disable buffering for SSE/streaming endpoints
location /api/events {
    proxy_pass http://backend;
    proxy_buffering off;       # Don't buffer the response
    proxy_cache off;           # Don't cache streaming responses
    proxy_read_timeout 86400s; # Keep connection open for long-lived streams
}
```

### Q8: How do you configure proxy timeouts and when should you adjust them?

**Answer:**

```nginx
location / {
    proxy_pass http://backend;

    # Time to establish connection with backend (TCP handshake)
    # Default: 60s. Lower this to fail fast if backend is down.
    proxy_connect_timeout 5s;

    # Time between two successive write operations to backend
    # Default: 60s. Increase for large file uploads.
    proxy_send_timeout 60s;

    # Time between two successive read operations from backend
    # Default: 60s. Increase for slow API endpoints (reports, exports).
    proxy_read_timeout 300s;
}
```

**When to adjust:**
- `proxy_connect_timeout 5s` — Keep low. If backend doesn't respond to TCP handshake in 5s, it's down. Don't make clients wait 60s to find out.
- `proxy_read_timeout 300s` — Increase for endpoints that do heavy processing (report generation, CSV exports, batch operations).
- `proxy_send_timeout` — Increase if clients upload large files through the proxy.

**Common mistake:** Setting `proxy_read_timeout` too low for WebSocket or SSE connections. These are long-lived — set to `86400s` (24 hours) for those specific locations.

---

## Load Balancing

### Q9: How does NGINX load balancing work? Walk me through configuring it.

**Answer:**

NGINX distributes incoming requests across a group of backend servers defined in an `upstream` block. The upstream block lives in the `http` context (outside the `server` block).

```nginx
# /etc/nginx/conf.d/upstream.conf

# Define backend server group
upstream nestjs_app {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://nestjs_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

When a request comes in, NGINX selects one of the three servers according to the configured algorithm (default: round robin) and forwards the request.

### Q10: Explain all the load balancing algorithms NGINX supports. When would you use each one?

**Answer:**

**1. Round Robin (default) — Distributes requests evenly in order**

```nginx
upstream backend {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}
# Request 1 → server 1, Request 2 → server 2, Request 3 → server 3, Request 4 → server 1...
```

**When to use:** Default choice. Works well when backend servers have similar capacity and request processing times are roughly equal.

**2. Weighted Round Robin — Distribute proportionally based on capacity**

```nginx
upstream backend {
    server 10.0.1.10:3000 weight=5;  # Gets 5x the traffic
    server 10.0.1.11:3000 weight=3;  # Gets 3x the traffic
    server 10.0.1.12:3000 weight=1;  # Gets 1x the traffic
}
# Out of 9 requests: server1 gets 5, server2 gets 3, server3 gets 1
```

**When to use:** Servers have different capacities (e.g., one is a large EC2 instance, another is a small one). Common during rolling deployments when new servers are warming up.

**3. Least Connections — Send to server with fewest active connections**

```nginx
upstream backend {
    least_conn;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}
```

**When to use:** Request processing times vary significantly. If some API endpoints take 50ms and others take 5s, round robin can overload a server that's stuck processing slow requests. Least connections naturally routes to the least busy server.

**4. IP Hash — Same client IP always goes to same server (sticky sessions)**

```nginx
upstream backend {
    ip_hash;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}
```

**When to use:** Session affinity is needed — the application stores session state in memory (not recommended, but sometimes necessary for legacy apps). Also useful for WebSocket connections that need to stick to a specific backend.

**Caveat:** If many users share the same IP (corporate NAT), they all go to the same server, causing uneven distribution.

**5. Generic Hash — Hash on any custom key**

```nginx
upstream backend {
    hash $request_uri consistent;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}
```

**When to use:** Cache optimization — same URL always goes to same server, maximizing local cache hit rate. The `consistent` keyword uses a consistent hashing ring so adding/removing servers only remaps a fraction of keys (like consistent hashing in distributed caches).

**Other hash keys:** `$cookie_sessionid`, `$arg_user_id`, `$request_uri`

**6. Random — Random selection with optional two-choices**

```nginx
upstream backend {
    random two least_conn;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}
```

**When to use:** `random two least_conn` is the "power of two choices" algorithm. Picks two servers at random, then sends to the one with fewer connections. Good for large clusters where maintaining global state (like least_conn) is expensive. Provides near-optimal load distribution with minimal coordination.

**7. Least Time (NGINX Plus only) — Lowest average response time**

```nginx
upstream backend {
    least_time header;  # or 'last_byte'
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}
```

**When to use:** When you want the fastest response for each request. `header` considers time to receive the response header; `last_byte` considers time to receive the full response.

### Q11: How do health checks work in NGINX?

**Answer:**

**Passive Health Checks (Open Source NGINX):**

NGINX monitors responses from backends and marks a server as unhealthy if it fails repeatedly.

```nginx
upstream backend {
    server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:3000 max_fails=3 fail_timeout=30s;
}
```

- `max_fails=3` — after 3 failed requests, mark server as unhealthy
- `fail_timeout=30s` — two meanings:
  1. The 3 failures must occur within this 30-second window
  2. After being marked unhealthy, NGINX waits 30s before trying again

**What counts as a failure?** By default, connection errors and timeouts. You can expand this:
```nginx
location / {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_500 http_502 http_503;
    # Retry on the next server if current returns 500, 502, or 503
    proxy_next_upstream_tries 2;    # Max 2 retries
    proxy_next_upstream_timeout 10s; # Total retry time limit
}
```

**Active Health Checks (NGINX Plus only):**

```nginx
upstream backend {
    zone backend_zone 64k;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

server {
    location / {
        proxy_pass http://backend;
        health_check interval=5s fails=3 passes=2 uri=/health;
        # Every 5s, send GET /health to each backend
        # After 3 failures, mark unhealthy
        # After 2 successes, mark healthy again
    }
}
```

**Backup servers and server states:**

```nginx
upstream backend {
    server 10.0.1.10:3000;                     # Primary
    server 10.0.1.11:3000;                     # Primary
    server 10.0.1.12:3000 backup;              # Only used when all primaries are down
    server 10.0.1.13:3000 down;                # Permanently marked offline (for maintenance)
}
```

---

## SSL/TLS Termination

### Q12: What is SSL termination and why do it at NGINX?

**Answer:**

**SSL termination** means NGINX handles the TLS encryption/decryption. The client connects to NGINX over HTTPS (encrypted), and NGINX forwards the request to the backend over plain HTTP (unencrypted) within your private network.

```
Client ──── HTTPS (encrypted) ────→ NGINX ──── HTTP (plain) ────→ Backend
                                   (terminates SSL here)
```

**Why terminate SSL at NGINX:**
1. **CPU offloading** — TLS handshakes are CPU-intensive. Offload this from your app servers.
2. **Centralized certificate management** — One place to manage certs, not N backend servers.
3. **HTTP/2 support** — NGINX handles HTTP/2 with clients, proxies HTTP/1.1 to backend (many app servers don't support HTTP/2 natively).
4. **Simpler backend code** — Backend doesn't need to know about TLS at all.
5. **Performance** — NGINX is highly optimized for TLS with hardware acceleration support.

**Security concern:** Traffic between NGINX and backend is unencrypted. This is fine if:
- NGINX and backend are on the same host (localhost)
- They're on a private network (VPC)
- You use mTLS for internal communication (see below)

### Q13: Show me a production-grade SSL configuration.

**Answer:**

```nginx
# /etc/nginx/conf.d/ssl.conf

# SSL session cache — shared across all workers
# 1 MB stores ~4000 sessions
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;

# Disable session tickets for forward secrecy
# (or rotate ticket keys if you enable them)
ssl_session_tickets off;

# OCSP Stapling — NGINX fetches OCSP response and sends it to client
# Client doesn't need to contact CA separately (faster handshake)
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

server {
    listen 80;
    server_name api.example.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # Certificate and key
    ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Protocol versions — only TLS 1.2 and 1.3
    # TLS 1.0 and 1.1 are deprecated (RFC 8996)
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cipher suites — modern, secure ciphers only
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;

    # Let client choose preferred cipher (for TLS 1.3 this is always the case)
    ssl_prefer_server_ciphers off;

    # DH parameters for DHE ciphers (generate with: openssl dhparam -out dhparam.pem 2048)
    ssl_dhparam /etc/nginx/ssl/dhparam.pem;

    # HSTS — tell browsers to always use HTTPS for this domain
    # max-age=2 years, include subdomains, allow preload list submission
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Key configuration decisions explained:**

- **`ssl_session_cache shared:SSL:10m`** — Caches TLS session parameters in shared memory. Clients reconnecting within the timeout can resume sessions without a full handshake (much faster). 10 MB holds ~40K sessions.
- **`ssl_session_tickets off`** — Session tickets can compromise forward secrecy if ticket keys aren't rotated. Safer to disable.
- **`ssl_prefer_server_ciphers off`** — For TLS 1.3, the client always chooses. For TLS 1.2 with modern ciphers, letting the client choose is fine and can improve performance (client knows its hardware capabilities).
- **OCSP Stapling** — Without stapling, the client contacts the CA's OCSP responder to check if the cert is revoked (adds latency). With stapling, NGINX fetches and caches the OCSP response, sending it during the handshake.

### Q14: How do you set up Let's Encrypt with Certbot and NGINX?

**Answer:**

```bash
# Install Certbot with NGINX plugin
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (Certbot modifies NGINX config automatically)
sudo certbot --nginx -d api.example.com -d www.api.example.com

# Or obtain certificate only (manual NGINX config)
sudo certbot certonly --webroot -w /var/www/html -d api.example.com

# Auto-renewal (Certbot adds a systemd timer or cron job)
sudo certbot renew --dry-run

# Renewal hook to reload NGINX after cert renewal
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#!/bin/bash
nginx -t && systemctl reload nginx
```

**NGINX config for Certbot webroot challenge:**
```nginx
server {
    listen 80;
    server_name api.example.com;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Everything else redirects to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

### Q15: What is mTLS and when would you use it?

**Answer:**

**Mutual TLS (mTLS)** means both sides verify each other's certificates. In standard TLS, only the client verifies the server. In mTLS, the server also verifies the client.

```
Standard TLS:  Client verifies Server certificate ← (one-way)
Mutual TLS:    Client verifies Server certificate ← (both ways) → Server verifies Client certificate
```

**Use case:** Service-to-service authentication in microservices. Instead of API keys or tokens, each service has its own certificate. NGINX verifies the calling service's identity.

```nginx
server {
    listen 443 ssl;
    server_name internal-api.example.com;

    # Server certificate (normal SSL)
    ssl_certificate     /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    # mTLS: Require and verify client certificates
    ssl_client_certificate /etc/nginx/ssl/ca.crt;  # CA that signed client certs
    ssl_verify_client on;                           # Require client cert
    ssl_verify_depth 2;                             # Max cert chain depth

    location / {
        # Pass client cert info to backend
        proxy_set_header X-Client-Cert-DN $ssl_client_s_dn;
        proxy_set_header X-Client-Cert-Verify $ssl_client_verify;
        proxy_pass http://backend;
    }
}
```

---

## Rate Limiting & Throttling

### Q16: How does rate limiting work in NGINX? Explain the algorithm.

**Answer:**

NGINX uses the **leaky bucket algorithm** for rate limiting. Imagine a bucket with a hole at the bottom:
- Requests pour in from the top
- Requests drain out from the bottom at a fixed rate (the configured rate)
- If the bucket overflows (too many requests), excess requests are rejected (503)
- The `burst` parameter controls the bucket size (how many excess requests can queue)

```
    Incoming Requests
         │ │ │ │
         ▼ ▼ ▼ ▼
    ┌──────────────┐
    │  ┌─────────┐ │ ← burst buffer (queue)
    │  │ queued   │ │
    │  │ requests │ │
    │  └─────────┘ │
    │              │
    └──────┬───────┘
           │
           ▼
    Processed at fixed rate (e.g., 10r/s)

    If bucket is full → 503 Service Unavailable
```

### Q17: Show me practical rate limiting configurations for different scenarios.

**Answer:**

**Basic per-IP rate limiting:**

```nginx
# Define rate limiting zone in http context
# $binary_remote_addr = client IP (16 bytes, more efficient than $remote_addr)
# zone=api_limit:10m = 10 MB shared memory zone named "api_limit" (~160K IPs)
# rate=10r/s = allow 10 requests per second per IP

http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;
    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

    # Custom error page for rate-limited requests
    limit_req_status 429;

    server {
        listen 80;

        # General API — 10 req/s with burst of 20
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend;
        }

        # Login endpoint — strict: 1 req/s, small burst (brute force protection)
        location /api/auth/login {
            limit_req zone=login_limit burst=5;
            proxy_pass http://backend;
        }

        # File upload — 2 req/s, no burst
        location /api/upload {
            limit_req zone=upload_limit;
            proxy_pass http://backend;
        }
    }
}
```

**Understanding `burst` and `nodelay`:**

```nginx
# rate=10r/s means 1 request every 100ms

# WITHOUT burst:
limit_req zone=api_limit;
# Strictly 1 request per 100ms. Request at 0ms: OK. Request at 50ms: REJECTED.

# WITH burst=20 (no nodelay):
limit_req zone=api_limit burst=20;
# Up to 20 excess requests are QUEUED and processed one every 100ms.
# Client gets delayed responses (requests sit in queue).
# Good: smooth traffic. Bad: adds latency.

# WITH burst=20 nodelay:
limit_req zone=api_limit burst=20 nodelay;
# Up to 20 excess requests are processed IMMEDIATELY (no queue delay).
# But they consume "slots" in the bucket. Once 20 burst slots are used,
# new excess requests are rejected until slots refill at 10/s.
# Good: no added latency. Bad: allows short bursts of high traffic.

# WITH burst=20 delay=8:
limit_req zone=api_limit burst=20 delay=8;
# First 8 excess requests are immediate (no delay).
# Remaining 12 (burst minus delay) are queued.
# Best of both worlds: fast for moderate bursts, rate-limited for heavy bursts.
```

**Per-API-key rate limiting:**

```nginx
# Use a custom variable from a header or query parameter
# Map API key to a rate-limiting key
map $http_x_api_key $api_key_limit {
    default         $binary_remote_addr;  # Fall back to IP if no API key
    "~."            $http_x_api_key;       # Use API key if present
}

limit_req_zone $api_key_limit zone=api_key_zone:10m rate=100r/s;

server {
    location /api/ {
        limit_req zone=api_key_zone burst=50 nodelay;
        proxy_pass http://backend;
    }
}
```

**Concurrent connection limiting:**

```nginx
http {
    # Limit concurrent connections per IP
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        # Max 10 simultaneous connections per IP
        limit_conn conn_limit 10;

        # Max 1 MB/s download speed per connection
        limit_rate 1m;

        location /api/download/ {
            # More restrictive for downloads: 2 concurrent connections
            limit_conn conn_limit 2;
            limit_rate 500k;
            proxy_pass http://backend;
        }
    }
}
```

**Custom 429 response page:**

```nginx
server {
    error_page 429 /429.json;

    location = /429.json {
        internal;
        default_type application/json;
        return 429 '{"error": "Too Many Requests", "message": "Rate limit exceeded. Please retry after some time.", "status": 429}';
    }
}
```

**Adding rate limit headers (using headers-more module or Lua):**

```nginx
# With the headers-more-nginx-module:
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;

    # These require custom logic (Lua or application-level)
    # NGINX doesn't natively expose remaining count
    add_header X-RateLimit-Limit "10" always;
    add_header X-RateLimit-Burst "20" always;

    proxy_pass http://backend;
}
```

> **Note:** NGINX doesn't natively provide `X-RateLimit-Remaining` headers. For precise rate limit headers, implement rate limiting in your application layer (e.g., using Redis + NestJS `@nestjs/throttler`) or use NGINX's Lua module (OpenResty) or NGINX Plus.

---

## Caching with NGINX

### Q18: How does NGINX proxy caching work? Walk me through the configuration.

**Answer:**

NGINX can cache responses from backend servers on disk and serve them directly for subsequent requests, avoiding the backend entirely.

```
First request:  Client → NGINX → Backend → NGINX (stores in cache) → Client
Next requests:  Client → NGINX (serves from cache) → Client  (backend not hit!)
```

**Full caching configuration:**

```nginx
http {
    # Define cache storage
    # /var/cache/nginx = disk path for cache files
    # levels=1:2      = two-level directory hierarchy (better filesystem performance)
    # keys_zone=my_cache:10m = 10 MB shared memory for cache keys (~80K keys)
    # max_size=1g     = max 1 GB of cached content on disk
    # inactive=60m    = remove cached items not accessed for 60 minutes
    # use_temp_path=off = write cache files directly to cache path (faster)

    proxy_cache_path /var/cache/nginx
                     levels=1:2
                     keys_zone=my_cache:10m
                     max_size=1g
                     inactive=60m
                     use_temp_path=off;

    server {
        listen 80;

        location /api/ {
            proxy_pass http://backend;

            # Enable caching with the defined zone
            proxy_cache my_cache;

            # Cache successful responses for 10 minutes, 404s for 1 minute
            proxy_cache_valid 200 302 10m;
            proxy_cache_valid 404 1m;

            # Cache key — determines what makes a "unique" request
            proxy_cache_key "$scheme$request_method$host$request_uri";

            # Serve stale cache if backend is down or slow
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503;

            # Only one request populates the cache at a time (prevents thundering herd)
            proxy_cache_lock on;
            proxy_cache_lock_timeout 5s;

            # Add header to response indicating cache status
            add_header X-Cache-Status $upstream_cache_status always;
            # Values: MISS, HIT, EXPIRED, STALE, UPDATING, REVALIDATED, BYPASS
        }
    }
}
```

**Understanding `$upstream_cache_status` values:**

| Status | Meaning |
|---|---|
| `MISS` | Response not in cache, fetched from backend |
| `HIT` | Response served from cache |
| `EXPIRED` | Cache entry expired, new response fetched from backend |
| `STALE` | Stale cache served (backend is down, per `proxy_cache_use_stale`) |
| `UPDATING` | Stale cache served while cache is being updated in background |
| `REVALIDATED` | Cache revalidated with backend (304 Not Modified) |
| `BYPASS` | Cache bypassed per `proxy_cache_bypass` directive |

### Q19: How do you handle cache bypass and selective caching?

**Answer:**

```nginx
location /api/ {
    proxy_pass http://backend;
    proxy_cache my_cache;

    # Don't cache responses with Set-Cookie header (session-specific)
    proxy_no_cache $http_set_cookie;

    # Bypass cache if client sends Cache-Control: no-cache
    proxy_cache_bypass $http_cache_control;

    # Don't cache POST, PUT, DELETE requests
    proxy_cache_methods GET HEAD;

    # Don't cache authenticated requests
    proxy_no_cache $cookie_session $http_authorization;
    proxy_cache_bypass $cookie_session $http_authorization;

    # Custom bypass logic with map
    proxy_cache_bypass $no_cache;
}

# In http context: define bypass conditions
map $request_uri $no_cache {
    default          0;        # Cache by default
    ~*/admin/        1;        # Don't cache admin pages
    ~*/user/profile  1;        # Don't cache user-specific pages
    ~*\.json$        0;        # Cache JSON responses
}
```

### Q20: What is microcaching and when should you use it?

**Answer:**

**Microcaching** is caching dynamic responses for a very short time (typically 1 second). Even a 1-second cache can dramatically reduce backend load during traffic spikes.

```nginx
# Microcaching — cache everything for 1 second
proxy_cache_path /var/cache/nginx/micro
                 levels=1:2
                 keys_zone=micro_cache:5m
                 max_size=500m
                 inactive=1m;

server {
    location /api/ {
        proxy_pass http://backend;

        proxy_cache micro_cache;
        proxy_cache_valid 200 1s;  # Cache for just 1 second

        # Still serve stale during backend errors
        proxy_cache_use_stale error timeout updating;

        # Background update: serve stale immediately, update cache asynchronously
        proxy_cache_background_update on;

        # Only one request fills the cache (prevents thundering herd)
        proxy_cache_lock on;

        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

**Why microcaching is powerful:**
- 1000 requests/second to an endpoint → only 1 actually hits your backend
- Data is at most 1 second stale (acceptable for most APIs)
- Huge protection against traffic spikes

**When to use:** High-traffic public APIs where data can be 1 second stale (product listings, search results, dashboards, feeds).

**When NOT to use:** User-specific data (profiles, cart), authentication endpoints, payment processing — anything where stale data would be incorrect or dangerous.

### Q21: When should you cache at NGINX vs Redis vs CDN?

**Answer:**

| Layer | Best For | Characteristics |
|---|---|---|
| **CDN (CloudFront, Cloudflare)** | Static assets, public content | Geographically distributed, closest to user, great for images/CSS/JS |
| **NGINX Cache** | Dynamic API responses, frequently accessed endpoints | Single server, very fast (filesystem), good for microcaching |
| **Redis Cache** | Application-level data, session data, computed results | Shared across multiple app instances, fine-grained control, TTL per key |
| **Application Cache (in-memory)** | Hot data within a single process | Fastest, but per-process, lost on restart |

**A real-world caching strategy for a NestJS API:**
1. **CDN** — static assets (images, JS bundles)
2. **NGINX** — microcache for public API endpoints (1-5 seconds)
3. **Redis** — user session data, frequently queried database results, rate limit counters
4. **In-process** — configuration, feature flags, reference data that rarely changes

---

## Security Headers & Hardening

### Q22: What security headers should every NGINX server have? Explain each one.

**Answer:**

```nginx
server {
    # ──────────────────────────────────────────────
    # 1. Hide NGINX version from error pages and Server header
    # Without this, attackers know your exact NGINX version and can target known vulnerabilities
    server_tokens off;

    # ──────────────────────────────────────────────
    # 2. X-Frame-Options — Prevents clickjacking
    # DENY: page cannot be displayed in a frame/iframe at all
    # SAMEORIGIN: only frames from same origin allowed
    add_header X-Frame-Options "DENY" always;

    # ──────────────────────────────────────────────
    # 3. X-Content-Type-Options — Prevents MIME sniffing
    # Without this, browsers may "guess" the content type and execute
    # a .txt file as JavaScript if it looks like JS
    add_header X-Content-Type-Options "nosniff" always;

    # ──────────────────────────────────────────────
    # 4. X-XSS-Protection — Legacy XSS filter (for older browsers)
    # Modern browsers use CSP instead, but this helps with IE/Edge legacy
    add_header X-XSS-Protection "1; mode=block" always;

    # ──────────────────────────────────────────────
    # 5. Content-Security-Policy — Most powerful XSS prevention
    # Defines which sources the browser can load content from
    # This is for an API server (restrictive)
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none'" always;

    # For a web app serving HTML, you'd be more permissive:
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'" always;

    # ──────────────────────────────────────────────
    # 6. Referrer-Policy — Controls what referrer info is sent
    # 'strict-origin-when-cross-origin' sends origin (not full URL) for cross-origin requests
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ──────────────────────────────────────────────
    # 7. Permissions-Policy (formerly Feature-Policy)
    # Restricts which browser features the page can use
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

    # ──────────────────────────────────────────────
    # 8. HSTS — Force HTTPS (covered in SSL section)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
}
```

**Why `always` keyword?** Without `always`, headers are only added to successful responses (2xx, 3xx). With `always`, they're added to error responses too (4xx, 5xx). Security headers should always be present.

### Q23: How do you harden NGINX against common attacks?

**Answer:**

```nginx
# /etc/nginx/conf.d/security.conf

# ── 1. Request size limits ──
# Prevent large payload attacks
client_max_body_size 10m;          # Max upload size
client_body_buffer_size 128k;      # Buffer for request body
client_header_buffer_size 1k;      # Buffer for request headers
large_client_header_buffers 4 8k;  # For large headers (cookies, tokens)

# ── 2. Timeout limits (prevent slowloris attacks) ──
client_body_timeout 10s;           # Time to read request body
client_header_timeout 10s;         # Time to read request headers
send_timeout 10s;                  # Time between two write operations to client
keepalive_timeout 65s;             # Keep-alive connection timeout

# ── 3. IP whitelist/blacklist ──
# Restrict admin endpoints to specific IPs
location /admin/ {
    allow 10.0.0.0/8;       # Allow private network
    allow 192.168.1.100;    # Allow specific IP
    deny all;               # Deny everyone else
    proxy_pass http://backend;
}

# Block specific IPs
location / {
    deny 203.0.113.50;      # Block this specific IP
    deny 198.51.100.0/24;   # Block this subnet
    allow all;               # Allow everyone else
    proxy_pass http://backend;
}

# ── 4. Basic authentication ──
location /monitoring/ {
    auth_basic "Restricted Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://backend;
}
# Generate password file: htpasswd -c /etc/nginx/.htpasswd admin

# ── 5. Block bad bots ──
map $http_user_agent $bad_bot {
    default 0;
    ~*(?:bot|crawl|spider|scraper|wget|curl) 1;  # Block common bots
}

server {
    if ($bad_bot) {
        return 403;
    }
}

# ── 6. Prevent access to hidden files ──
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

# ── 7. Disable unwanted HTTP methods ──
if ($request_method !~ ^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$) {
    return 405;
}
```

**DDoS mitigation strategy at NGINX level:**
```nginx
http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=flood:10m rate=50r/s;

    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    server {
        # Max 50 req/s per IP with burst of 100
        limit_req zone=flood burst=100 nodelay;

        # Max 100 concurrent connections per IP
        limit_conn addr 100;

        # Close slow connections
        client_body_timeout 5s;
        client_header_timeout 5s;

        # Limit request body size
        client_max_body_size 1m;
    }
}
```

---

## NGINX for WebSocket & Real-Time

### Q24: How do you configure NGINX to proxy WebSocket connections?

**Answer:**

WebSocket starts as an HTTP request with an `Upgrade: websocket` header. The server responds with `101 Switching Protocols` and the connection is upgraded to a persistent WebSocket connection. NGINX must be configured to pass through this upgrade.

```nginx
# Upstream for WebSocket servers
upstream websocket_backend {
    # Use ip_hash for sticky sessions — WebSocket needs to stay on the same server
    ip_hash;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

# Map to handle the Connection header properly
# If client sends Upgrade header, set Connection to "upgrade"
# Otherwise, keep Connection as "close"
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name ws.example.com;

    # WebSocket endpoint
    location /ws/ {
        proxy_pass http://websocket_backend;

        # Required: Switch to HTTP/1.1 (WebSocket doesn't work with HTTP/2 proxy)
        proxy_http_version 1.1;

        # Required: Pass the Upgrade and Connection headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical: Long timeouts for WebSocket
        # Default 60s would close WebSocket after 1 minute of inactivity
        proxy_read_timeout 86400s;  # 24 hours
        proxy_send_timeout 86400s;  # 24 hours

        # Don't buffer WebSocket traffic
        proxy_buffering off;
    }

    # Regular HTTP API
    location /api/ {
        proxy_pass http://websocket_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Why each WebSocket-specific directive is required:**

| Directive | Why Required |
|---|---|
| `proxy_http_version 1.1` | WebSocket protocol requires HTTP/1.1. NGINX defaults to HTTP/1.0 for proxying, which doesn't support the Upgrade mechanism. |
| `proxy_set_header Upgrade $http_upgrade` | Passes the client's `Upgrade: websocket` header to the backend so the backend knows to switch protocols. |
| `proxy_set_header Connection $connection_upgrade` | NGINX normally strips hop-by-hop headers (like `Connection`). This explicitly sets it to `upgrade` when upgrading, `close` otherwise. |
| `proxy_read_timeout 86400s` | WebSocket connections are long-lived. The default 60s timeout would close idle connections. Set to 24 hours (or more). |
| `proxy_buffering off` | WebSocket messages should be delivered immediately, not buffered. |

### Q25: How do you proxy Server-Sent Events (SSE) through NGINX?

**Answer:**

SSE is a one-way streaming protocol (server to client) over regular HTTP. Unlike WebSocket, it doesn't require protocol upgrade — but it does require specific buffering settings.

```nginx
location /api/events {
    proxy_pass http://backend;

    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Critical for SSE:
    proxy_buffering off;          # Don't buffer — stream events immediately
    proxy_cache off;              # Don't cache streaming responses
    proxy_read_timeout 86400s;    # Keep connection open for long-lived streams

    # Chunked transfer encoding for streaming
    chunked_transfer_encoding on;

    # Disable gzip for SSE (breaks streaming in some browsers)
    gzip off;

    # HTTP/1.1 for chunked transfer
    proxy_http_version 1.1;
    proxy_set_header Connection '';  # Remove Connection header for keep-alive
}
```

**Key difference between WebSocket and SSE proxying:**
- WebSocket: needs `Upgrade` and `Connection` headers, bidirectional
- SSE: needs `proxy_buffering off` and no compression, unidirectional (server to client)

---

## NGINX with Docker & Kubernetes

### Q26: How do you set up NGINX with Docker for a NestJS application?

**Answer:**

**Dockerfile for custom NGINX:**
```dockerfile
# Dockerfile.nginx
FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/ /etc/nginx/conf.d/

# Create cache directory
RUN mkdir -p /var/cache/nginx

EXPOSE 80 443

# Run NGINX in foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose with NGINX + NestJS:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/ssl:ro
    depends_on:
      - api
    networks:
      - app_network
    restart: unless-stopped

  api:
    build: .
    expose:
      - "3000"    # Only exposed to other containers, not to host
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
    networks:
      - app_network
    deploy:
      replicas: 3  # Run 3 instances for load balancing
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - app_network

volumes:
  pgdata:

networks:
  app_network:
    driver: bridge
```

**NGINX config for Docker Compose (using Docker DNS):**
```nginx
# nginx/conf.d/api.conf
upstream nestjs_api {
    # Docker Compose DNS resolves "api" to all container IPs
    # When using replicas, Docker load-balances across all instances
    server api:3000;
}

server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://nestjs_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
```

### Q27: Explain the NGINX Ingress Controller in Kubernetes.

**Answer:**

In Kubernetes, an **Ingress Controller** is a reverse proxy that routes external traffic to internal Services based on rules defined in **Ingress** resources. The NGINX Ingress Controller is the most popular implementation.

```
    Internet
       │
       ▼
┌──────────────┐
│  Cloud LB    │  ← AWS ALB / NLB / GCP LB
│  (Layer 4)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   NGINX      │  ← Ingress Controller (Pod running NGINX)
│   Ingress    │     Watches for Ingress resources and reconfigures
│   Controller │
└──┬───┬───┬───┘
   │   │   │
   ▼   ▼   ▼
┌────┐┌────┐┌────┐
│Svc ││Svc ││Svc │  ← Kubernetes Services
│ A  ││ B  ││ C  │
└────┘└────┘└────┘
```

**Ingress resource — Path-based routing:**
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    # NGINX-specific annotations
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-burst: "200"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret  # K8s Secret containing TLS cert
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 3001
          - path: /api/orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 3002
          - path: /api/payments
            pathType: Prefix
            backend:
              service:
                name: payment-service
                port:
                  number: 3003
```

**Ingress resource — Host-based routing:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
spec:
  ingressClassName: nginx
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
                  number: 3000
    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 3001
    - host: ws.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: websocket-service
                port:
                  number: 3002
```

### Q28: NGINX vs Traefik vs HAProxy in Kubernetes — when to use each?

**Answer:**

| Feature | NGINX Ingress | Traefik | HAProxy |
|---|---|---|---|
| **Maturity** | Battle-tested, most widely used | Modern, growing adoption | Very mature (load balancing focus) |
| **Config** | Annotations + ConfigMap | Auto-discovery, labels | Manual, config file based |
| **Auto TLS** | Requires cert-manager | Built-in Let's Encrypt | Requires manual setup |
| **Dashboard** | No (use Prometheus/Grafana) | Built-in web UI | Built-in stats page |
| **TCP/UDP** | Yes (via ConfigMap) | Native support | Excellent TCP/UDP support |
| **Middleware** | Via annotations (limited) | First-class middleware chain | Advanced ACLs and routing |
| **Performance** | Excellent | Good (slightly lower) | Excellent (highest for raw TCP) |
| **Best for** | Most K8s deployments, familiar to ops teams | Dynamic environments, developer-friendly | High-performance TCP load balancing |

**Recommendation:** Use NGINX Ingress Controller as default choice. It's the most documented, most supported, and most ops teams already know NGINX. Use Traefik if you want auto-discovery and built-in Let's Encrypt without cert-manager. Use HAProxy for maximum TCP/UDP performance.

---

## NGINX Performance Tuning

### Q29: Walk me through optimizing NGINX for maximum performance.

**Answer:**

```nginx
# /etc/nginx/nginx.conf

# ── Worker Configuration ──
# One worker per CPU core (auto detects CPU count)
worker_processes auto;

# Max open files per worker (raise OS limit too: ulimit -n 65535)
worker_rlimit_nofile 65535;

events {
    # Max simultaneous connections per worker
    # Total max connections = worker_processes * worker_connections
    # e.g., 4 cores * 4096 = 16,384 concurrent connections
    worker_connections 4096;

    # Accept as many connections as possible at once
    multi_accept on;

    # Use the most efficient event method for the OS
    # Linux: epoll, FreeBSD/macOS: kqueue
    use epoll;  # (auto-selected, but explicit is fine)
}

http {
    # ── Basic Settings ──
    charset utf-8;
    sendfile on;          # Use kernel sendfile() for static files (zero-copy)
    tcp_nopush on;        # Send headers and beginning of file in one packet
    tcp_nodelay on;       # Disable Nagle's algorithm (send small packets immediately)
    server_tokens off;    # Hide NGINX version

    # ── MIME Types ──
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ── Keepalive (Client) ──
    keepalive_timeout 65s;     # How long to keep idle client connection open
    keepalive_requests 1000;   # Max requests per keepalive connection

    # ── Keepalive (Upstream) ──
    upstream backend {
        server 10.0.1.10:3000;
        server 10.0.1.11:3000;

        # Keep 32 idle connections to backend open per worker
        # Eliminates TCP handshake overhead for proxied requests
        keepalive 32;
        keepalive_requests 1000;
        keepalive_timeout 60s;
    }

    # ── Compression ──
    gzip on;
    gzip_vary on;                    # Add Vary: Accept-Encoding header
    gzip_proxied any;                # Compress for all proxied requests
    gzip_comp_level 4;               # 1-9, 4-6 is sweet spot (CPU vs compression ratio)
    gzip_min_length 256;             # Don't compress tiny responses
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/x-javascript
        image/svg+xml;

    # ── Buffer Tuning ──
    client_body_buffer_size 16k;       # Buffer for POST body
    client_header_buffer_size 1k;      # Buffer for request headers
    large_client_header_buffers 4 8k;  # For requests with large headers
    proxy_buffer_size 4k;              # Buffer for first part of proxy response
    proxy_buffers 8 8k;               # Buffers for proxy response body

    # ── Open File Cache ──
    # Caches file descriptors, file sizes, modification times
    # Huge speedup for static file serving
    open_file_cache max=10000 inactive=60s;
    open_file_cache_valid 60s;         # Revalidate cached entries every 60s
    open_file_cache_min_uses 2;        # File must be accessed 2x to be cached
    open_file_cache_errors on;         # Cache file-not-found errors too

    # ── Logging ──
    # Buffer log writes for better performance
    access_log /var/log/nginx/access.log combined buffer=32k flush=5s;

    # Disable access log for health checks and static assets
    location /health {
        access_log off;
        return 200 'OK';
    }

    # ── Upstream keepalive (in server/location context) ──
    server {
        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;                  # Required for keepalive
            proxy_set_header Connection "";           # Clear Connection header for keepalive
        }
    }
}
```

**Key tuning parameters explained:**

| Parameter | Default | Tuned | Why |
|---|---|---|---|
| `worker_processes` | 1 | `auto` (1 per CPU) | Utilize all CPU cores |
| `worker_connections` | 512 | 4096 | Handle more concurrent connections |
| `multi_accept` | off | on | Accept all pending connections at once |
| `sendfile` | off | on | Zero-copy file serving (kernel to socket directly) |
| `tcp_nopush` | off | on | Batch small packets into larger ones (reduces packet count) |
| `tcp_nodelay` | on | on | Send small packets immediately (complementary to tcp_nopush) |
| `gzip_comp_level` | 1 | 4 | Better compression, minimal CPU increase |
| `keepalive` (upstream) | none | 32 | Reuse backend connections (avoid TCP handshake per request) |
| `access_log buffer` | none | 32k | Batch log writes (fewer disk I/O operations) |

**Benchmarking your configuration:**
```bash
# wrk — modern HTTP benchmarking tool
wrk -t12 -c400 -d30s http://api.example.com/api/health
# -t12: 12 threads, -c400: 400 connections, -d30s: 30 second test

# Apache Bench (ab)
ab -n 10000 -c 100 http://api.example.com/api/health
# -n 10000: total requests, -c 100: concurrent connections

# k6 — more realistic load testing with scenarios
k6 run load-test.js
```

---

## NGINX Configuration Best Practices

### Q30: What does a well-organized NGINX configuration look like?

**Answer:**

```
/etc/nginx/
├── nginx.conf                    # Main config (worker settings, includes)
├── mime.types                    # MIME type mappings
├── conf.d/                       # Site-specific configs (included by nginx.conf)
│   ├── api.example.com.conf      # API server config
│   ├── admin.example.com.conf    # Admin panel config
│   └── default.conf              # Default/catch-all server
├── snippets/                     # Reusable config fragments
│   ├── ssl-params.conf           # SSL configuration
│   ├── proxy-params.conf         # Common proxy headers
│   ├── security-headers.conf     # Security headers
│   └── gzip.conf                 # Compression settings
├── ssl/                          # Certificates and keys
│   ├── dhparam.pem
│   └── api.example.com/
│       ├── fullchain.pem
│       └── privkey.pem
└── .htpasswd                     # Basic auth passwords
```

**Main config (nginx.conf):**
```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '$request_time $upstream_response_time';

    access_log /var/log/nginx/access.log main buffer=32k flush=5s;

    # Include reusable snippets
    include /etc/nginx/snippets/gzip.conf;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
    limit_req_status 429;

    # Include all site configs
    include /etc/nginx/conf.d/*.conf;
}
```

**Reusable snippet — proxy params:**
```nginx
# /etc/nginx/snippets/proxy-params.conf
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

**Reusable snippet — security headers:**
```nginx
# /etc/nginx/snippets/security-headers.conf
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
server_tokens off;
```

**Site config using snippets:**
```nginx
# /etc/nginx/conf.d/api.example.com.conf
upstream api_backend {
    least_conn;
    server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    include /etc/nginx/snippets/ssl-params.conf;
    include /etc/nginx/snippets/security-headers.conf;

    ssl_certificate /etc/nginx/ssl/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/api.example.com/privkey.pem;

    location / {
        include /etc/nginx/snippets/proxy-params.conf;
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # For upstream keepalive
    }

    location /api/auth/ {
        include /etc/nginx/snippets/proxy-params.conf;
        limit_req zone=auth burst=5;
        proxy_pass http://api_backend;
    }
}
```

### Q31: How do you test configuration and do zero-downtime reloads?

**Answer:**

```bash
# Test configuration syntax BEFORE reloading
sudo nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Graceful reload (zero-downtime)
sudo nginx -s reload
# What happens internally:
# 1. Master reads new config
# 2. Master spawns new worker processes with new config
# 3. Master tells old workers to stop accepting new connections
# 4. Old workers finish serving existing requests
# 5. Old workers exit
# Result: No dropped connections!

# Other signals:
sudo nginx -s stop     # Fast shutdown (terminate immediately)
sudo nginx -s quit     # Graceful shutdown (finish existing requests, then exit)
sudo nginx -s reopen   # Reopen log files (for log rotation)

# Full dump of resolved configuration (useful for debugging includes)
sudo nginx -T
# Shows the final merged configuration after all includes

# Test specific config file
sudo nginx -t -c /path/to/custom/nginx.conf
```

**Graceful reload in production deployment script:**
```bash
#!/bin/bash
# deploy.sh — Zero-downtime deployment

# 1. Copy new config
cp ./nginx/conf.d/* /etc/nginx/conf.d/

# 2. Test config (fail fast if syntax error)
nginx -t
if [ $? -ne 0 ]; then
    echo "NGINX config test failed! Aborting deployment."
    exit 1
fi

# 3. Graceful reload
nginx -s reload
echo "NGINX reloaded successfully."
```

### Q32: What are common NGINX configuration mistakes and how do you debug them?

**Answer:**

**Mistake 1: Trailing slash in proxy_pass changes URL behavior**

```nginx
# WITHOUT trailing slash: /api/users → backend receives /api/users
location /api/ {
    proxy_pass http://backend;   # No trailing slash
}

# WITH trailing slash: /api/users → backend receives /users
location /api/ {
    proxy_pass http://backend/;  # Trailing slash — strips /api prefix!
}
```

**Mistake 2: Location block not matching as expected**

```nginx
# NGINX location matching priority (highest to lowest):
# 1. Exact match:    location = /api/health { }
# 2. Priority prefix: location ^~ /static/ { }
# 3. Regex match:    location ~ \.php$ { }    (first match wins)
# 4. Prefix match:   location /api/ { }       (longest prefix wins)

# Example: Where does /api/users go?
location /api/ {          # Prefix — matches, but keeps checking
    proxy_pass http://backend_a;
}
location ~ ^/api/users {  # Regex — matches, takes priority over prefix
    proxy_pass http://backend_b;
}
location = /api/users {   # Exact — matches only /api/users (not /api/users/123)
    proxy_pass http://backend_c;
}

# /api/users       → backend_c (exact match, highest priority)
# /api/users/123   → backend_b (regex match, higher than prefix)
# /api/orders      → backend_a (prefix match, no regex matches)
```

**Mistake 3: Forgetting to set proxy_http_version for keepalive**

```nginx
upstream backend {
    server 10.0.1.10:3000;
    keepalive 32;  # This does nothing without the settings below!
}

server {
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;          # Required! Default is 1.0
        proxy_set_header Connection "";   # Required! Clear the Connection header
    }
}
```

**Mistake 4: add_header in nested location blocks**

```nginx
server {
    # These headers are inherited by location blocks...
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location /api/ {
        # BUT if you add ANY header here, the parent headers are NOT inherited!
        add_header X-Custom-Header "value" always;
        # Now X-Frame-Options and X-Content-Type-Options are GONE!

        # Fix: repeat all headers, or use include snippets
        include /etc/nginx/snippets/security-headers.conf;
        add_header X-Custom-Header "value" always;
    }
}
```

**Debugging commands:**
```bash
# Check error log (first thing to check)
tail -f /var/log/nginx/error.log

# Enable debug logging (for specific client IP to avoid noise)
error_log /var/log/nginx/error.log debug;
# Or for specific events block:
events {
    debug_connection 10.0.0.1;
}

# Check which config is loaded
nginx -T | grep "server_name"

# Check if NGINX is listening on expected ports
ss -tlnp | grep nginx
# or
netstat -tlnp | grep nginx

# Test specific URL routing
curl -v -H "Host: api.example.com" http://localhost/api/health

# Check upstream health
curl -I http://localhost/api/health
# Look for X-Cache-Status, upstream response headers
```

---

## NGINX as API Gateway

### Q33: How do you use NGINX as an API Gateway for microservices?

**Answer:**

NGINX can serve as a lightweight API gateway, routing requests to different microservices based on URL path, hostname, or headers.

```nginx
# /etc/nginx/conf.d/api-gateway.conf

# ── Define upstream services ──
upstream user_service {
    least_conn;
    server user-svc-1:3001 max_fails=3 fail_timeout=30s;
    server user-svc-2:3001 max_fails=3 fail_timeout=30s;
    keepalive 16;
}

upstream order_service {
    least_conn;
    server order-svc-1:3002 max_fails=3 fail_timeout=30s;
    server order-svc-2:3002 max_fails=3 fail_timeout=30s;
    keepalive 16;
}

upstream payment_service {
    server payment-svc-1:3003 max_fails=2 fail_timeout=30s;
    server payment-svc-2:3003 max_fails=2 fail_timeout=30s;
    keepalive 16;
}

upstream notification_service {
    server notification-svc:3004;
    keepalive 8;
}

# ── Rate limiting zones ──
limit_req_zone $binary_remote_addr zone=api_general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=api_auth:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=api_payment:10m rate=10r/s;

server {
    listen 443 ssl http2;
    server_name api.example.com;

    include /etc/nginx/snippets/ssl-params.conf;
    include /etc/nginx/snippets/security-headers.conf;

    # ── Request ID for tracing ──
    # Generate a unique ID if client doesn't provide one
    map $http_x_request_id $request_id_final {
        default $http_x_request_id;
        ''      $request_id;
    }

    # ── CORS handling at gateway level ──
    add_header Access-Control-Allow-Origin "https://app.example.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Request-ID" always;
    add_header Access-Control-Max-Age 86400 always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    # ── Common proxy settings ──
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-ID $request_id_final;

    # ── Route: User Service ──
    location /api/users/ {
        limit_req zone=api_general burst=20 nodelay;
        proxy_pass http://user_service/;
        proxy_read_timeout 30s;
    }

    location /api/auth/ {
        limit_req zone=api_auth burst=10;
        proxy_pass http://user_service/auth/;
        proxy_read_timeout 15s;
    }

    # ── Route: Order Service ──
    location /api/orders/ {
        limit_req zone=api_general burst=20 nodelay;
        proxy_pass http://order_service/;
        proxy_read_timeout 60s;  # Orders may take longer (DB writes)
    }

    # ── Route: Payment Service (stricter limits) ──
    location /api/payments/ {
        limit_req zone=api_payment burst=5;
        proxy_pass http://payment_service/;
        proxy_read_timeout 120s;  # Payment processing can be slow

        # Extra logging for payment routes
        access_log /var/log/nginx/payment.access.log;
    }

    # ── Route: Notification Service (WebSocket) ──
    location /api/notifications/ws {
        proxy_pass http://notification_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    # ── Health check endpoint ──
    location /health {
        access_log off;
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }

    # ── Default: 404 for unmatched routes ──
    location / {
        return 404 '{"error":"Not Found","message":"No service matches this route"}';
        add_header Content-Type application/json always;
    }
}
```

### Q34: How do you implement authentication at the NGINX gateway level using auth_request?

**Answer:**

The `auth_request` directive delegates authentication to a subrequest. NGINX sends the original request's headers to an auth service. If the auth service returns 2xx, the request proceeds; 401/403 means the request is denied.

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # ── Auth subrequest ──
    # For every request to protected locations, NGINX first sends a
    # subrequest to the auth service. Only if auth returns 200, the
    # original request is forwarded to the backend.
    location = /auth/validate {
        internal;  # Only accessible as a subrequest, not directly by clients

        proxy_pass http://user_service/auth/validate;

        # Pass original request info to auth service
        proxy_pass_request_body off;           # Don't send body (just headers)
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
        proxy_set_header X-Original-Method $request_method;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Cookie $http_cookie;

        # Cache auth responses for 5 minutes (reduce auth service load)
        proxy_cache auth_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key "$http_authorization";
    }

    # ── Protected routes ──
    location /api/orders/ {
        auth_request /auth/validate;

        # Capture auth response headers and pass to backend
        auth_request_set $auth_user_id $upstream_http_x_user_id;
        auth_request_set $auth_user_role $upstream_http_x_user_role;

        proxy_set_header X-User-ID $auth_user_id;
        proxy_set_header X-User-Role $auth_user_role;

        proxy_pass http://order_service/;
    }

    # ── Public routes (no auth) ──
    location /api/auth/login {
        proxy_pass http://user_service/auth/login;
    }

    location /api/auth/register {
        proxy_pass http://user_service/auth/register;
    }

    # ── Custom error for auth failures ──
    error_page 401 = @error_401;
    error_page 403 = @error_403;

    location @error_401 {
        default_type application/json;
        return 401 '{"error":"Unauthorized","message":"Invalid or missing authentication token"}';
    }

    location @error_403 {
        default_type application/json;
        return 403 '{"error":"Forbidden","message":"You do not have permission to access this resource"}';
    }
}
```

**How the flow works:**
1. Client sends `GET /api/orders/123` with `Authorization: Bearer <token>`
2. NGINX intercepts and sends subrequest to `GET /auth/validate` with the token
3. Auth service validates the token:
   - Returns `200 OK` with `X-User-ID: 42` and `X-User-Role: admin` headers
   - Or returns `401 Unauthorized` if token is invalid
4. If 200: NGINX forwards original request to order-service with `X-User-ID` and `X-User-Role` headers
5. If 401/403: NGINX returns error response to client (never reaches order-service)

### Q35: NGINX vs Kong vs AWS API Gateway — when to use each?

**Answer:**

| Feature | NGINX | Kong | AWS API Gateway |
|---|---|---|---|
| **Cost** | Free (open source) | Free (OSS) / $$$ (Enterprise) | Pay per request ($3.50/million) |
| **Deployment** | Self-managed | Self-managed or Kong Cloud | Fully managed (AWS) |
| **Auth** | auth_request (basic) | JWT, OAuth2, LDAP plugins | Cognito, Lambda authorizer |
| **Rate Limiting** | Built-in (basic) | Plugin (advanced, Redis-backed) | Built-in (per-stage, per-key) |
| **Monitoring** | External (Prometheus) | Built-in + plugins | CloudWatch (built-in) |
| **Plugins** | Lua modules, NGINX Plus | 100+ plugins (rich ecosystem) | Lambda, Step Functions |
| **Service Discovery** | Manual / DNS | DNS, Consul, K8s | AWS Service Discovery |
| **Developer Portal** | No | Kong Enterprise | Built-in |
| **WebSocket** | Yes | Yes | Yes (with limitations) |
| **Latency** | Lowest (~1ms overhead) | Low (~2-5ms) | Higher (~10-30ms, varies by region) |
| **Best for** | Cost-conscious teams, simple routing | Plugin-rich API management | AWS-native, serverless architectures |

**Decision framework:**
- **NGINX**: You want a free, fast, simple API gateway. Your team knows NGINX. You don't need a developer portal or advanced plugin ecosystem.
- **Kong**: You need advanced API management features (rate limiting per consumer, OAuth2, developer portal). Your API has many consumers with different access levels.
- **AWS API Gateway**: You're all-in on AWS. You use Lambda. You want zero operational overhead. Cost is acceptable at your scale.

---

## Common NGINX Interview Questions

### Q36: "Explain how NGINX handles 10,000 concurrent connections on a single server."

**Answer:**

NGINX can handle 10K+ connections because of its **event-driven, non-blocking architecture**:

1. **No thread per connection** — Traditional servers (Apache prefork) spawn a process/thread per connection. 10K connections = 10K threads = massive memory (each thread uses ~1-8 MB stack). NGINX uses a handful of worker processes (typically one per CPU core), and each worker handles thousands of connections via an event loop.

2. **Event-driven I/O with epoll/kqueue** — Each worker uses the OS kernel's event notification system (`epoll` on Linux, `kqueue` on BSD/macOS). Instead of checking each connection for activity (polling), the kernel tells NGINX exactly which connections have data ready. This is O(1) per event instead of O(n) per poll cycle.

3. **Non-blocking operations** — When NGINX sends a request to a backend and the backend hasn't responded yet, the worker doesn't block. It registers a callback and moves on to handle other connections. When the backend response arrives, the OS notifies the worker.

4. **Minimal memory per connection** — Each connection uses only a few kilobytes of memory (for buffers and state). 10K connections might use ~30 MB total. Compare to Apache where 10K threads would use ~10-80 GB.

5. **Configuration math:**
```
worker_processes 4;         # 4 CPU cores
worker_connections 4096;    # Per worker

# Max theoretical connections = 4 * 4096 = 16,384
# As reverse proxy, each client connection uses TWO file descriptors
# (one for client, one for backend), so effective limit = 8,192
# Still well above 10K with some headroom adjustments
```

### Q37: "How would you set up zero-downtime deployment with NGINX?"

**Answer:**

**Method 1: Graceful reload (simplest)**
```bash
# 1. Deploy new application version on backends
# 2. Health check passes on new version
# 3. NGINX config doesn't even need to change
#    (upstream servers are the same, running new code)

# If NGINX config changes:
nginx -t && nginx -s reload
# Master spawns new workers with new config
# Old workers finish existing requests, then exit
# Zero dropped connections
```

**Method 2: Blue-green deployment**
```nginx
# Blue environment (current production)
upstream backend_blue {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

# Green environment (new version)
upstream backend_green {
    server 10.0.2.10:3000;
    server 10.0.2.11:3000;
}

# Active environment variable (swap by changing and reloading)
upstream backend_active {
    server 10.0.2.10:3000;  # Point to green
    server 10.0.2.11:3000;
}

server {
    location / {
        proxy_pass http://backend_active;
    }
}
```

```bash
# Deploy flow:
# 1. Deploy new version to green servers
# 2. Test green servers directly
# 3. Update NGINX upstream to point to green
# 4. nginx -t && nginx -s reload
# 5. If something's wrong, swap back to blue and reload
```

**Method 3: Canary deployment with split_clients**
```nginx
# Route 10% of traffic to new version
split_clients "${remote_addr}" $backend_version {
    10%  backend_green;
    *    backend_blue;
}

server {
    location / {
        proxy_pass http://$backend_version;
    }
}
```

### Q38: "Your API is getting DDoS'd — what do you configure in NGINX?"

**Answer:**

**Immediate response (add to NGINX config and reload):**

```nginx
http {
    # 1. Aggressive rate limiting
    limit_req_zone $binary_remote_addr zone=ddos:20m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=ddos_conn:20m;

    server {
        # 2. Rate limit all requests
        limit_req zone=ddos burst=20 nodelay;

        # 3. Limit concurrent connections per IP
        limit_conn ddos_conn 20;

        # 4. Kill slow connections quickly (slowloris protection)
        client_body_timeout 5s;
        client_header_timeout 5s;
        send_timeout 5s;

        # 5. Limit request body size
        client_max_body_size 1m;

        # 6. Block specific IPs if attack source is identified
        # (Better: use a geo-block file or fail2ban integration)
        deny 203.0.113.0/24;
        deny 198.51.100.0/24;

        # 7. Block by user agent (many DDoS bots use default or no user agent)
        if ($http_user_agent = "") {
            return 444;  # NGINX special: close connection without response
        }

        # 8. Return 444 (close connection) for suspicious patterns
        # 444 is NGINX-specific: drops the connection immediately, saves bandwidth
    }
}
```

**Beyond NGINX (defense in depth):**
1. **CloudFlare/AWS Shield** — absorb volumetric attacks before they reach your server
2. **fail2ban** — automatically ban IPs that exceed rate limits in NGINX logs
3. **GeoIP blocking** — if your users are only in certain countries, block everything else
4. **WAF (Web Application Firewall)** — deeper inspection (SQL injection, XSS patterns)

### Q39: "How do you debug a 502 Bad Gateway error?"

**Answer:**

A **502 Bad Gateway** means NGINX received an invalid response from the upstream server. Debugging steps:

```bash
# 1. Check NGINX error log (FIRST thing to do)
tail -f /var/log/nginx/error.log
# Look for: "upstream prematurely closed connection"
#           "connect() failed (111: Connection refused)"
#           "no live upstreams"

# 2. Check if backend is actually running
curl -v http://localhost:3000/health
# If connection refused → backend is down

# 3. Check backend application logs
journalctl -u nestjs-app --since "5 minutes ago"
# or: docker logs api-container --tail 100

# 4. Check if backend ran out of memory
free -m
dmesg | grep -i "out of memory"
# OOM killer may have killed your Node.js process

# 5. Check if backend is overloaded (too many connections)
ss -s  # Socket statistics
# Look at the number of established connections

# 6. Check NGINX upstream config
nginx -T | grep upstream -A 10
# Ensure server addresses and ports are correct

# 7. Test proxy_pass directly
curl -H "Host: api.example.com" http://127.0.0.1/api/health -v
```

**Common 502 causes and fixes:**

| Cause | Fix |
|---|---|
| Backend is down | Restart backend, check for crash loops |
| Backend ran out of memory | Increase memory, fix memory leaks |
| Backend too slow (timeout) | Increase `proxy_read_timeout` |
| Wrong port in upstream | Fix port number in NGINX config |
| Backend closed connection early | Check backend keep-alive settings |
| Socket file permissions (PHP-FPM) | Fix ownership of unix socket |
| Too many open files | Increase `ulimit -n` and `worker_rlimit_nofile` |

### Q40: "Explain the difference between location /, location = /, and location ~ /"

**Answer:**

```nginx
# 1. location / { }
# PREFIX match — matches ANY URI that starts with /
# Since every URI starts with /, this matches everything
# It's the "catch-all" or "default" location
# Lowest priority among prefix matches (shortest prefix)
location / {
    proxy_pass http://default_backend;
}

# 2. location = / { }
# EXACT match — matches ONLY the URI "/"
# Does NOT match /about, /api, /favicon.ico
# Highest priority of all location types
location = / {
    proxy_pass http://homepage_backend;
}

# 3. location ~ / { }
# REGEX match (case-sensitive) — matches any URI containing /
# Since every URI contains /, this also matches everything
# Higher priority than prefix match, lower than exact match
location ~ / {
    proxy_pass http://regex_backend;
}

# 4. location ~* /api { }
# REGEX match (case-insensitive) — matches /api, /API, /Api
location ~* /api {
    proxy_pass http://api_backend;
}

# 5. location ^~ /static/ { }
# PRIORITY PREFIX match — if this prefix matches, skip regex matching
# Use for static files to avoid unnecessary regex evaluation
location ^~ /static/ {
    root /var/www;
}
```

**Complete priority order (highest to lowest):**

```
1. = /exact/path           → Exact match (highest priority)
2. ^~ /prefix/path         → Priority prefix (stops regex search)
3. ~ ^/regex/pattern       → Regex case-sensitive (first match in config order)
4. ~* ^/regex/pattern      → Regex case-insensitive (first match in config order)
5. /longest/prefix/match   → Standard prefix (longest match wins)
6. /shorter/prefix         → Standard prefix (shorter match, lower priority)
7. /                       → Default catch-all (shortest prefix)
```

**Practical example — how NGINX evaluates `GET /api/users/123`:**
```nginx
location = /api/users/123  { }  # Checked first: exact match? YES → use this, stop
location ^~ /api/           { }  # Checked second: priority prefix? YES → use this, skip regex
location ~ ^/api/users/     { }  # Checked third: regex match? YES (if no ^~ matched)
location /api/users/        { }  # Checked for prefix: matches, length=12
location /api/              { }  # Checked for prefix: matches, length=5 (shorter, lower priority)
location /                  { }  # Checked for prefix: matches, length=1 (catch-all)
```

---

## Quick Reference

### NGINX Directives Cheat Sheet

```
┌─────────────────────────────────────────────────────────────┐
│                    NGINX Quick Reference                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  COMMANDS                                                    │
│  ─────────                                                   │
│  nginx -t              Test configuration                    │
│  nginx -T              Test & dump full config               │
│  nginx -s reload       Graceful reload (zero-downtime)       │
│  nginx -s stop         Fast shutdown                         │
│  nginx -s quit         Graceful shutdown                     │
│  nginx -s reopen       Reopen log files                      │
│  nginx -V              Show version and compile options      │
│                                                              │
│  COMMON DIRECTIVES                                           │
│  ──────────────────                                          │
│  worker_processes auto;        # One per CPU core            │
│  worker_connections 4096;      # Per worker                  │
│  client_max_body_size 10m;     # Max upload size             │
│  server_tokens off;            # Hide version                │
│  sendfile on;                  # Zero-copy file serving      │
│  gzip on;                      # Enable compression          │
│  keepalive_timeout 65s;        # Client keep-alive           │
│                                                              │
│  PROXY HEADERS (always include these)                        │
│  ────────────────────────────────────                        │
│  proxy_set_header Host $host;                                │
│  proxy_set_header X-Real-IP $remote_addr;                    │
│  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for│
│  proxy_set_header X-Forwarded-Proto $scheme;                 │
│                                                              │
│  UPSTREAM KEEPALIVE (for performance)                        │
│  ────────────────────────────────────                        │
│  proxy_http_version 1.1;       # Required for keepalive     │
│  proxy_set_header Connection "";  # Required for keepalive   │
│                                                              │
│  WEBSOCKET (add to WS locations)                             │
│  ───────────────────────────────                             │
│  proxy_http_version 1.1;                                     │
│  proxy_set_header Upgrade $http_upgrade;                     │
│  proxy_set_header Connection "upgrade";                      │
│  proxy_read_timeout 86400s;                                  │
│                                                              │
│  STATUS CODES                                                │
│  ────────────                                                │
│  444  = Drop connection (NGINX-specific, no response)        │
│  497  = HTTP sent to HTTPS port                              │
│  499  = Client closed connection before server responded     │
│  502  = Backend unreachable or returned invalid response     │
│  503  = Service temporarily unavailable                      │
│  504  = Backend timed out                                    │
│                                                              │
│  DEBUGGING                                                   │
│  ─────────                                                   │
│  tail -f /var/log/nginx/error.log                            │
│  tail -f /var/log/nginx/access.log                           │
│  curl -v -H "Host: x.com" http://localhost/path              │
│  ss -tlnp | grep nginx                                      │
│  nginx -T | grep server_name                                 │
│                                                              │
│  VARIABLES                                                   │
│  ─────────                                                   │
│  $host              = Request Host header                    │
│  $remote_addr       = Client IP                              │
│  $request_uri       = Full URI with query string             │
│  $uri               = URI without query string               │
│  $scheme            = http or https                          │
│  $request_method    = GET, POST, etc.                        │
│  $http_<header>     = Any request header (lowercased, - → _) │
│  $upstream_cache_status = MISS, HIT, STALE, etc.            │
│  $request_id        = Unique 32-char hex request ID          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Location Block Matching Priority

```
Priority  Type                    Syntax              Behavior
────────  ──────────────────────  ──────────────────  ─────────────────────────────
1 (high)  Exact match             location = /path    Matches only exact URI, stops search
2         Priority prefix         location ^~ /path   If longest prefix, stops search (skips regex)
3         Regex (case-sensitive)  location ~ pattern  First regex match in config order wins
3         Regex (case-insensitive)location ~* pattern Same priority as ~, first match wins
4 (low)   Standard prefix         location /path      Longest prefix match wins (checked after regex)
```

### Production Configuration Template

```nginx
# /etc/nginx/conf.d/production-template.conf

upstream app {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

limit_req_zone $binary_remote_addr zone=app_limit:10m rate=20r/s;

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security
    server_tokens off;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Limits
    client_max_body_size 10m;
    client_body_timeout 10s;
    client_header_timeout 10s;

    # Logging
    access_log /var/log/nginx/app.access.log combined buffer=32k flush=5s;
    error_log /var/log/nginx/app.error.log warn;

    # API
    location / {
        limit_req zone=app_limit burst=40 nodelay;
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://app;
        proxy_set_header Host $host;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
    }
}
```

### Common Interview Questions — Quick Answers

| Question | Key Points |
|---|---|
| How does NGINX handle 10K connections? | Event-driven, non-blocking I/O, epoll/kqueue, few worker processes, minimal memory per connection |
| NGINX vs Apache? | Event-driven vs thread-per-connection; NGINX for high concurrency, Apache for .htaccess/shared hosting |
| What is a reverse proxy? | Client → NGINX → Backend; hides backend, enables SSL termination, caching, load balancing |
| How does rate limiting work? | Leaky bucket algorithm; `limit_req_zone` + `limit_req`; burst for overflow handling |
| 502 vs 504? | 502 = backend unreachable or invalid response; 504 = backend didn't respond in time (timeout) |
| Zero-downtime reload? | `nginx -s reload` spawns new workers, old workers finish existing requests then exit |
| WebSocket through NGINX? | `proxy_http_version 1.1`, `Upgrade` + `Connection` headers, long `proxy_read_timeout` |
| How to secure NGINX? | `server_tokens off`, security headers, rate limiting, `client_max_body_size`, timeout tuning |
| Caching strategy? | `proxy_cache_path` + `proxy_cache`; `proxy_cache_use_stale` for resilience; microcaching for dynamic APIs |
| NGINX as API gateway? | Path-based routing to upstream blocks; `auth_request` for auth; rate limiting per endpoint |
