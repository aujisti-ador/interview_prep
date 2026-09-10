# Networking Fundamentals for Backend Engineers

> The layer under everything else in this phase. You do not need to be a network engineer — you
> need to explain why a request took 900ms when the handler took 12ms, and why your connection
> pool matters.
>
> This is also the material that makes "the API is slow" debuggable rather than mysterious.

## In 60 seconds

1. **Every request pays a setup cost before your code runs.** DNS lookup, TCP handshake, TLS
   handshake — that is easily 200–400ms on a fresh connection to a distant server, before a
   single byte of your response exists.
2. **Which is why connection reuse is the single biggest network win available.** Keep-alive
   turns three round trips into zero. If your HTTP client creates a new connection per request,
   you are paying that tax on every call.
3. **Latency is governed by physics, bandwidth by money.** Dhaka→Frankfurt is ~120ms round trip
   and no amount of engineering changes that. **Reduce the number of round trips**, not their
   speed.
4. **TCP guarantees delivery by retransmitting**, which is why a lossy mobile network feels slow
   rather than broken — and why UDP is right for live media, where a late packet is worthless.
5. **HTTP/2 fixed the "six connections per host" limit** with multiplexing; **HTTP/3 fixed
   head-of-line blocking** by moving to UDP. Both matter most on poor networks — which is most
   of your users.
6. **`ECONNRESET`, `ETIMEDOUT` and `EAI_AGAIN` mean different things**, and knowing which is
   which turns a mystery into a diagnosis.

**The interview trap to expect:** *"a request to your API takes 900ms but your handler logs 12ms
— where did the time go?"* Answer in layers: DNS, TCP handshake, TLS handshake, queueing at the
load balancer, connection-pool wait, the handler, then serialisation and transfer. Naming the
layers is the answer; guessing "the database" is not.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **RTT** | Round-trip time — one message there and back |
| **Latency** | Delay. Governed by distance and hops |
| **Bandwidth** | How much data per second. You can buy more; you cannot buy less latency |
| **DNS** | Turning a hostname into an IP address |
| **TTL (DNS)** | How long a resolver may cache that answer |
| **TCP handshake** | The three-message exchange that opens a connection (SYN, SYN-ACK, ACK) |
| **TLS handshake** | Negotiating encryption. 1–2 extra round trips |
| **Keep-alive** | Reusing an open connection for more requests. The big win |
| **Connection pool** | A set of reusable connections your client holds |
| **Head-of-line blocking** | One stuck item blocking everything behind it |
| **Multiplexing** | Many logical streams over one connection |
| **MTU** | The largest packet size a link accepts. Usually 1500 bytes |
| **Nagle's algorithm** | TCP batching small writes. Adds latency; `TCP_NODELAY` disables it |
| **Backlog** | The queue of connections waiting to be accepted |
| **Ephemeral ports** | The client-side port range. You can genuinely run out |
| **TIME_WAIT** | A closed connection held briefly. Thousands of these is a symptom |
| **Anycast** | One IP address served from many locations. How CDNs and public DNS work |

---

## Table of Contents

1. [Where the time actually goes](#1-where-the-time-actually-goes)
2. [DNS](#2-dns)
3. [TCP](#3-tcp)
4. [TLS](#4-tls)
5. [HTTP/1.1 vs HTTP/2 vs HTTP/3](#5-http11-vs-http2-vs-http3)
6. [Connection management in Node](#6-connection-management-in-node)
7. [Timeouts, and getting them right](#7-timeouts-and-getting-them-right)
8. [Reading network errors](#8-reading-network-errors)
9. [Diagnosing a slow request](#9-diagnosing-a-slow-request)
10. [Interview questions](#10-interview-questions)

---

## 1. Where the time actually goes

A first request to a fresh HTTPS endpoint, from Dhaka to a European server:

```
  DNS lookup                    ~20-120ms   (0 if cached)
  TCP handshake                 ~120ms      (1 RTT)
  TLS 1.3 handshake             ~120ms      (1 RTT; TLS 1.2 needs 2)
  ─────────────────────────────────────
  before your request is even sent:  ~260-360ms
  
  request travel                ~60ms       (½ RTT)
  server processing             ~12ms       ← the only part you usually measure
  response travel               ~60ms
  ─────────────────────────────────────
  total                         ~400-500ms
```

**Your handler is 3% of it.** That single observation reframes most "the API is slow" questions.

**On the second request over the same connection**, DNS is cached and both handshakes are
already done — so the same call costs ~130ms. **Connection reuse is a 3× improvement for free.**

**The rule that follows:** optimise the *number of round trips*, not the speed of each one.
Batch requests, reuse connections, put a CDN closer to the user, and collapse chatty call
sequences.

---

## 2. DNS

Turning `api.example.com` into `52.x.x.x`. Cached at several layers, which is both the
performance story and the debugging story.

```
  your app → OS resolver cache → /etc/hosts → configured resolver
           → recursive resolver (ISP or 8.8.8.8) → root → TLD → authoritative
```

**What matters for backend work:**

| Issue | Detail |
|---|---|
| **TTL controls failover speed** | A 3600s TTL means an hour before clients notice your new IP. Lower it *before* a planned migration |
| **Node caches DNS badly by default** | Node does not cache resolutions between requests. Under load this means a lookup per connection |
| **`EAI_AGAIN` is DNS failing**, not your service | A very common and very confusing production error |
| **Round-robin DNS is not load balancing** | No health checking. A dead server stays in rotation until you edit the record |
| **In Kubernetes, DNS is a real bottleneck** | Every service call is a lookup; `ndots:5` causes several failed lookups first. Tune `dnsConfig` |

```ts
// Node does not cache DNS across requests. At high request rates this
// becomes measurable. A caching lookup is a cheap, large win.
import { Agent } from 'undici';
import CacheableLookup from 'cacheable-lookup';

const cacheable = new CacheableLookup();
const agent = new Agent({ connect: { lookup: cacheable.lookup } });
```

---

## 3. TCP

**The handshake** is three messages, so **one round trip** before any data moves:

```
   client ──── SYN ──────▶ server
   client ◀─── SYN-ACK ─── server
   client ──── ACK ──────▶ server        now data can flow
```

**What backend engineers actually hit:**

**Slow start.** A new connection does not begin at full speed — it ramps up, doubling roughly
each round trip. So a fresh connection is slow for the first several packets. **Another reason
connection reuse matters**, especially for large responses.

**Nagle's algorithm** batches small writes to avoid tiny packets. Combined with delayed
acknowledgements, it can add ~40ms to small request/response pairs. Most HTTP libraries set
`TCP_NODELAY` already; if you write a raw protocol, you must.

**Ephemeral port exhaustion.** Each outbound connection consumes a client-side port, and the
range is finite (~28k by default). A service making thousands of short-lived outbound
connections per second will exhaust them, and connections start failing.

```bash
# The symptom: a huge number of connections in TIME_WAIT
ss -s
netstat -an | grep TIME_WAIT | wc -l
```

**The fix is connection pooling, not tuning kernel parameters.** If you find yourself raising
`net.ipv4.ip_local_port_range`, you are treating a symptom.

**Backlog.** Connections arrive faster than your process accepts them and queue up. Overflow
means dropped connections — which appear to the client as a timeout, with nothing in your
application logs. In Node this is the `backlog` argument to `listen()`.

---

## 4. TLS

Encryption, at the cost of round trips.

| Version | Handshake cost | Notes |
|---|---|---|
| TLS 1.2 | 2 RTT | Still common. Slower |
| **TLS 1.3** | **1 RTT** | Fewer options, faster, better. Use it |
| TLS 1.3 + 0-RTT | 0 RTT on resume | Fast, but replayable — never for non-idempotent requests |

**Session resumption** lets a returning client skip most of the handshake. Requires either a
shared session cache or session tickets across your servers — **if you terminate TLS on several
load balancers without sharing tickets, every reconnect pays full price.**

**What to know for interviews:**

- **Certificate chains.** Your cert plus intermediates. Forgetting the intermediate is the
  classic misconfiguration: works in your browser (which caches intermediates), fails for
  `curl` and mobile clients.
- **SNI** lets one IP serve many certificates — how virtual hosting works with TLS.
- **mTLS** means both sides present certificates. Common between internal services and a
  frequent service-mesh question.
- **Where you terminate matters.** At the load balancer is simplest; end-to-end to the pod is
  needed for zero-trust and for compliance regimes that require encryption in transit
  internally.

---

## 5. HTTP/1.1 vs HTTP/2 vs HTTP/3

```
  HTTP/1.1   one request at a time per connection
             → browsers open ~6 connections per host to compensate
             → each one pays its own handshake and slow start

  HTTP/2     many streams multiplexed over ONE TCP connection
             → header compression, server push (largely abandoned)
             → BUT: one lost TCP packet stalls every stream
                    (TCP head-of-line blocking)

  HTTP/3     the same multiplexing, over QUIC on UDP
             → a lost packet stalls only its own stream
             → connection survives an IP change (WiFi → mobile)
             → handshake and encryption combined: fewer round trips
```

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP | **UDP (QUIC)** |
| Concurrency | ~6 connections | Multiplexed streams | Multiplexed streams |
| Head-of-line blocking | Per connection | **At TCP layer** | Solved |
| Survives network change | No | No | **Yes** |
| Best on | Anything | Good networks | **Poor/mobile networks** |

**The practical takeaways:**

- **HTTP/2 is the default worth having** at your edge. Enable it at the load balancer or NGINX;
  the origin connection can stay HTTP/1.1.
- **HTTP/3's benefit is largest exactly where your users are** — mobile networks with packet
  loss and changing connections. The connection-migration property is genuinely valuable when
  someone walks out of WiFi range mid-request.
- **Multiplexing does not remove the need for batching.** 100 multiplexed requests still cost
  100 round trips of latency for their responses.

---

## 6. Connection management in Node

The most common real performance bug in Node services, and easy to get right.

```ts
// ❌ Default global agent: keep-alive is not enabled in older Node, and
//    the default pool is small. Every call may pay a fresh handshake.
await fetch('https://api.provider.com/v1/orders');

// ✅ An explicit, reused agent with keep-alive
import { Agent, setGlobalDispatcher } from 'undici';

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 60_000,      // hold idle connections for a minute
  keepAliveMaxTimeout: 600_000,
  connections: 128,              // per origin — size to your concurrency
  pipelining: 1,
}));
```

**Sizing the pool.** Too small and requests queue behind each other invisibly — the request looks
slow, your handler looks fast, and the wait is in the pool. Too large and you exhaust ports or
overwhelm the upstream. Start at roughly your peak concurrent outbound requests per origin and
measure.

**The database connection pool is the same problem** and hits harder, because Postgres
connections are genuinely expensive. A pool of 10 with 50 concurrent requests means 40 requests
waiting — and the wait is usually invisible unless you instrument it.

```ts
// Instrument the wait. Without this, pool exhaustion looks like
// "the database is slow" and you optimise the wrong thing.
metrics.gauge('db.pool.waiting', pool.waitingCount);
metrics.gauge('db.pool.idle', pool.idleCount);
```

**In serverless this inverts.** A thousand concurrent Lambdas each holding a pool will exhaust
Postgres. That is what RDS Proxy exists for — see
[02-aws-serverless-deep-dive.md](02-aws-serverless-deep-dive.md).

---

## 7. Timeouts, and getting them right

**Every network call needs a timeout. Every one.** A call without one is a resource leak waiting
for a bad day upstream.

**The timeouts that exist, and are different:**

| Timeout | What it bounds |
|---|---|
| **DNS** | Resolution |
| **Connect** | TCP + TLS handshake. Should be short — 2–5s |
| **Idle / socket** | Silence between bytes |
| **Overall / request** | The whole thing. **The one people forget** |

A generous socket timeout with no overall timeout means a server dribbling one byte every 9
seconds keeps your connection alive indefinitely.

**Timeout budgets must decrease down the chain:**

```
   client        30s
     └─ gateway  25s
         └─ your service   20s
             └─ database        5s
             └─ third-party    10s
```

If your service waits 30s on a dependency while the caller gives up at 25s, you are doing work
nobody will read — and holding a connection while you do it.

**Pair every timeout with a retry policy**, and every retry with jitter. Retrying a timeout is
only safe if the operation is idempotent, because a timeout does not mean it did not happen —
see [../phase-2-apis-realtime-systems/08-webhooks-and-integrations.md](../phase-2-apis-realtime-systems/08-webhooks-and-integrations.md).

---

## 8. Reading network errors

Knowing what each means turns a mystery into a diagnosis.

| Error | Meaning | Usually caused by |
|---|---|---|
| **`ECONNREFUSED`** | Nothing is listening on that port | Service down, wrong port, not started yet |
| **`ECONNRESET`** | The peer closed abruptly mid-connection | Upstream crashed, load balancer idle timeout, keep-alive mismatch |
| **`ETIMEDOUT`** | No response in the allowed time | Overloaded upstream, or a firewall silently dropping |
| **`EAI_AGAIN`** | **DNS resolution failed** | Resolver down, network config, k8s DNS overload |
| **`EHOSTUNREACH`** | No route to that host | Routing/VPC/security group |
| **`EPIPE`** | You wrote to a closed connection | Client gave up before you finished |
| **`EMFILE`** | Out of file descriptors | Leaked sockets — you are not closing connections |
| **`ENOTFOUND`** | Hostname does not exist | Typo, or a service name that only resolves inside the cluster |

**`ECONNRESET` deserves its own note** because it is so common and so often misdiagnosed. The
frequent cause is a **keep-alive mismatch**: your client holds a connection for 60s, the upstream
load balancer closes idle ones at 30s, and your next request goes down a dead socket. **Set your
client's keep-alive timeout lower than the upstream's idle timeout.**

`EMFILE` almost always means a leak — a client created per request and never closed. It shows up
gradually and then all at once.

---

## 9. Diagnosing a slow request

The method, in order. Each step eliminates a layer.

```
1. Is it slow for everyone, or one client/region?
      one region → network path or DNS
      everyone   → your service or a dependency

2. Is it slow on the FIRST request only?
      → handshakes. Connection reuse is not happening

3. Split the time:
      curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/health
```

```
# curl-format.txt — the fastest way to see where time goes
      dns:  %{time_namelookup}s
  connect:  %{time_connect}s
      tls:  %{time_appconnect}s
 ttfb:      %{time_starttransfer}s
    total:  %{time_total}s
```

```
4. Compare TTFB against your handler's own timing.
      big gap → queueing, pool wait, or serialisation

5. Check the pool:  is anything waiting?
6. Check the upstream: is your dependency's p99 the real story?
```

**The most common finding, in order of frequency:** connection pool exhaustion, no keep-alive,
a slow dependency without a timeout, DNS not cached, and TLS renegotiating because session
tickets are not shared.

**Tools worth knowing by name:** `curl -w`, `dig`, `ss -s`, `tcpdump` (rarely, but knowing when
you would reach for it is a signal), and distributed tracing — which is the real answer at scale
and is covered in
[05-observability-reliability.md](05-observability-reliability.md).

---

## 10. Interview questions

**Q: A request takes 900ms; your handler logs 12ms. Where is the time?**
> I'd split it by layer: DNS, TCP handshake, TLS handshake, load-balancer queueing,
> connection-pool wait, handler, serialisation, transfer. `curl -w` gives me the first four in
> one command. Most often it turns out to be a fresh connection per request — no keep-alive — or
> waiting on an exhausted pool.

**Q: Why is connection reuse such a big deal?**
> A new HTTPS connection costs a DNS lookup plus two round trips of handshake, and then TCP
> slow start means it is not at full speed immediately. On a Dhaka-to-Europe path that is 250ms+
> before your request is sent. Reuse makes it zero.

**Q: What is head-of-line blocking?**
> One item stuck at the front blocking everything behind it. In HTTP/1.1 it is per connection.
> HTTP/2 multiplexes streams but they share one TCP connection, so a single lost packet stalls
> all of them. HTTP/3 moves to QUIC over UDP so loss only affects its own stream.

**Q: You are seeing intermittent `ECONNRESET` to an internal service.**
> Most likely a keep-alive mismatch — my client holds connections longer than the upstream's
> idle timeout, so it reuses a socket the other side already closed. The fix is setting my
> keep-alive timeout below theirs. I would also check whether the upstream is restarting under
> load.

**Q: Your service runs out of file descriptors after a few hours.**
> A socket leak — a client or connection created per request and never closed. It accumulates
> slowly then fails suddenly. I'd look for a client instantiated inside a handler rather than
> once at module scope.

**Q: How do you set timeouts across a call chain?**
> As a decreasing budget: each layer's timeout is shorter than its caller's, so nobody does work
> that has already been abandoned. And every timeout needs a matching retry policy with jitter —
> plus idempotency, because a timeout does not tell you whether the work happened.

---

## Related

- [01-nginx-deep-dive.md](01-nginx-deep-dive.md) — TLS termination, keep-alive, proxy timeouts
- [05-observability-reliability.md](05-observability-reliability.md) — tracing, which is how you do §9 at scale
- [07-performance-engineering.md](07-performance-engineering.md) — the wider method
- [02-aws-serverless-deep-dive.md](02-aws-serverless-deep-dive.md) — connection exhaustion in Lambda
- [../phase-2-apis-realtime-systems/08-webhooks-and-integrations.md](../phase-2-apis-realtime-systems/08-webhooks-and-integrations.md) — timeouts, retries and idempotency together
- [../phase-1-core-programming/02-nodejs-fundamentals.md](../phase-1-core-programming/02-nodejs-fundamentals.md) — the event loop under all of this
