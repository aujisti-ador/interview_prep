# Webhooks & Third-Party Integration Reliability

> Ubiquitous backend work that almost nobody has a guide for. Every payment gateway, every
> Slack app, every CI system, every MFS provider in Bangladesh talks to you this way.
>
> It is also a favourite interview topic, because a webhook endpoint is a small surface that
> exposes everything you know about idempotency, security and failure handling.

## In 60 seconds

1. **A webhook is a reversed API call.** Instead of you polling "has the payment completed
   yet?", they call you when it does. You are now running a public endpoint for someone else's
   retry logic.
2. **Assume every webhook arrives more than once.** Providers retry on timeout, and a timeout
   does not mean you did not process it. **Your handler must be idempotent** — this is the
   single most important sentence in this guide.
3. **Verify the signature before you trust anything.** An unsigned webhook endpoint is a public
   API that mutates your database. Anyone who guesses the URL can mark orders as paid.
4. **Acknowledge fast, process later.** Return `200` in milliseconds and push the work to a
   queue. If you do the work inline, a slow database turns into a provider retry storm.
5. **Webhooks arrive out of order.** `payment.refunded` can land before `payment.succeeded`.
   Use the event's own timestamp or version, never arrival order.
6. **When you send them, you are the unreliable party.** Retries with backoff, a dead-letter
   path, signed payloads, and a way for customers to replay — that is the minimum.

**The interview trap to expect:** *"a customer's payment webhook was delivered twice and they
were charged twice — walk me through preventing it."* The answer is an idempotency key stored
with a **unique constraint**, so the database rejects the second insert. Saying "I'd check if
we've seen the id before" is the shallow half — the check and the write must be atomic, or two
concurrent deliveries both pass the check.

## Key terms in this guide

| Term | Plain meaning |
|---|---|
| **Webhook** | They call your URL when something happens, instead of you polling |
| **Provider / consumer** | The system sending the webhook · the system receiving it |
| **Event id** | A unique id for this event. Your deduplication key |
| **Idempotent handler** | Processing the same event twice has the same effect as once |
| **Signature verification** | Proving the request really came from the provider |
| **HMAC** | A hash of the payload plus a shared secret. The usual signing method |
| **Replay attack** | Capturing a valid request and sending it again later |
| **Timestamp tolerance** | Rejecting requests older than N minutes, to bound replay |
| **Fast ack** | Returning 200 immediately, doing the work asynchronously |
| **Retry storm** | A provider's retries piling up because you are responding slowly |
| **Exponential backoff** | Waiting longer after each failed delivery |
| **Dead letter** | Where events that never succeed are parked for inspection |
| **Out-of-order delivery** | Events arriving in a different order than they happened |
| **Reconciliation** | Periodically comparing your state against the provider's, to catch what you missed |
| **Polling fallback** | Fetching missed events via the provider's API when webhooks fail |
| **SSRF** | Tricking your server into calling an internal address. The risk when *you* send webhooks |

---

## Table of Contents

1. [Receiving: the five rules](#1-receiving-the-five-rules)
2. [Signature verification](#2-signature-verification)
3. [Idempotency, done properly](#3-idempotency-done-properly)
4. [Fast ack, async processing](#4-fast-ack-async-processing)
5. [Out-of-order and missing events](#5-out-of-order-and-missing-events)
6. [Reconciliation — the safety net](#6-reconciliation--the-safety-net)
7. [Sending webhooks](#7-sending-webhooks)
8. [Testing and debugging](#8-testing-and-debugging)
9. [Interview questions](#9-interview-questions)

---

## 1. Receiving: the five rules

### Q1: Design a webhook endpoint. What does it have to do?

**Answer:**

Five things, in this order. Each one is a common production incident when missed.

```
  provider ──▶  1. verify signature       ← reject forgeries
                2. check timestamp        ← bound replay attacks
                3. dedupe by event id     ← the same event WILL arrive twice
                4. persist raw + enqueue  ← store first, process later
                5. return 200 fast        ← under ~1 second
                        │
                        ▼
                   queue worker ──▶ actual business logic
```

```ts
@Post('webhooks/payments')
@HttpCode(200)
async receive(@Req() req: RawBodyRequest<Request>, @Headers() headers: Record<string, string>) {
  // 1. Signature — on the RAW body. Parsed-then-restringified JSON will not
  //    match the provider's hash: key order and whitespace differ.
  if (!verifySignature(req.rawBody, headers['x-signature'], process.env.WEBHOOK_SECRET)) {
    throw new UnauthorizedException();
  }

  // 2. Timestamp — a valid signature is valid forever without this.
  const age = Date.now() - Number(headers['x-timestamp']) * 1000;
  if (age > 5 * 60_000) throw new BadRequestException('stale');

  const event = JSON.parse(req.rawBody.toString());

  // 3 + 4. Dedupe and persist in one step. The unique constraint IS the
  //        deduplication — no read-then-write race is possible.
  try {
    await this.prisma.webhookEvent.create({
      data: { id: event.id, provider: 'payments', payload: event, status: 'pending' },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { received: true };   // already have it. Done.
    throw e;
  }

  await this.queue.add('process-payment-event', { eventId: event.id });

  // 5. Return immediately. The work happens in the worker.
  return { received: true };
}
```

**Why this shape, specifically:**

- **Raw body for the signature.** The most common signature bug: your framework parses JSON,
  you re-stringify it to hash, and the bytes differ. In NestJS you must enable `rawBody`.
- **Persist before processing.** If the worker crashes, the event is still on disk and can be
  retried. If you only queued it, a queue failure loses it silently.
- **The unique constraint does the deduplication.** No `findFirst` then `create` — that has a
  race window where two concurrent deliveries both find nothing.

---

## 2. Signature verification

### Q2: How do you verify a webhook actually came from the provider?

**Answer:**

The provider computes `HMAC(secret, timestamp + body)` and sends it in a header. You compute the
same thing and compare.

```ts
import { createHmac, timingSafeEqual } from 'crypto';

function verifySignature(rawBody: Buffer, header: string, secret: string): boolean {
  const [timestamp, received] = parseSignatureHeader(header);

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(rawBody)                    // the exact bytes received
    .digest();

  const receivedBuf = Buffer.from(received, 'hex');

  // Length check first — timingSafeEqual throws on mismatched lengths.
  if (receivedBuf.length !== expected.length) return false;

  // Constant-time comparison. A normal === leaks information through timing:
  // it returns faster the earlier the first differing byte is, which is
  // enough to reconstruct a valid signature byte by byte.
  return timingSafeEqual(receivedBuf, expected);
}
```

**The three details interviewers probe:**

| Detail | Why it matters |
|---|---|
| **Raw bytes, not parsed JSON** | Re-serialising changes key order and whitespace. The hash will never match |
| **`timingSafeEqual`, not `===`** | A timing side-channel genuinely allows signature forgery, one byte at a time |
| **Timestamp in the signed payload** | Without it, a captured request replays forever. With it, you can reject anything older than a few minutes |

**Secret rotation** is the follow-up question. Accept **two** secrets during a rotation window —
try the new one, fall back to the old — then remove the old one. Otherwise rotating means
dropping every in-flight webhook.

**If a provider offers no signatures at all** (some regional gateways do not), your options are
mutual TLS, IP allowlisting, or a secret in the URL path. All are weaker; say so, and
compensate by treating the webhook purely as a *hint* to go and fetch the truth from their API.

---

## 3. Idempotency, done properly

### Q3: The same webhook arrives twice. What stops a double charge?

**Answer:**

**The database's unique constraint, not your application code.**

```sql
CREATE TABLE webhook_events (
  id          text PRIMARY KEY,          -- the provider's event id
  provider    text NOT NULL,
  payload     jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
```

```ts
// ❌ The bug that ships: a race window between the check and the write.
const seen = await db.webhookEvent.findUnique({ where: { id: event.id } });
if (seen) return;                       // ← two concurrent deliveries both
await db.webhookEvent.create({ ... });  //   get here and both proceed

// ✅ Let the database decide. It is the only thing that can do this atomically.
try {
  await db.webhookEvent.create({ data: { id: event.id, ... } });
} catch (e) {
  if (isUniqueViolation(e)) return;     // second delivery, already handled
  throw e;
}
```

**Idempotency at the second layer too.** Deduplicating the *event* is not enough — the worker
may crash halfway and be retried. Make the business operation itself idempotent:

```ts
// Not "add 500 to the balance" — that is wrong if it runs twice.
// Instead, record the transfer with a unique key and derive the balance,
// or make the write conditional on current state:
await db.order.updateMany({
  where: { id, status: 'pending' },      // ← only transitions from pending
  data:  { status: 'paid', paidAt: new Date() },
});
// Running this twice changes nothing the second time.
```

**The general principle worth stating:** *"I make the operation idempotent rather than trying to
guarantee exactly-once delivery, because exactly-once across a network is not achievable — but
at-least-once plus an idempotent consumer is."*

Same idea as [04-event-driven-architecture.md](04-event-driven-architecture.md).

---

## 4. Fast ack, async processing

### Q4: Why not just do the work in the handler?

**Answer:**

Because the provider is holding a connection open and running a timer.

```
   ❌ Inline processing
   provider ──▶ your endpoint ──▶ DB write ──▶ email ──▶ third-party call ──▶ 200
                                                              (4 seconds)
   provider timed out at 3s → retries → now you are doing it twice, concurrently
   → retry storm → your database gets worse → more timeouts → cascade

   ✅ Fast ack
   provider ──▶ verify + persist + enqueue ──▶ 200          (30 ms)
                                  │
                                  └──▶ worker: the actual work, with its own retries
```

**Typical provider timeouts are 3–10 seconds**, and the retry schedules are aggressive. Stripe,
GitHub and most gateways retry with exponential backoff for hours or days.

**The rule:** the handler does verification, deduplication, persistence and enqueue. Nothing
else. No emails, no third-party calls, no report generation.

**When you must return a non-200:** return `4xx` for "this event is invalid, never send it
again" and `5xx` for "I am broken, please retry." Getting this backwards means either losing
events permanently or being retried forever on a malformed payload you will never accept.

---

## 5. Out-of-order and missing events

### Q5: `payment.refunded` arrives before `payment.succeeded`. Now what?

**Answer:**

This happens, and more often than people expect — retries reorder things, and providers often
make no ordering guarantee at all.

**Never rely on arrival order.** Three strategies, in increasing robustness:

**1. Use the event's own timestamp or version.**

```ts
// Ignore anything older than what we already applied.
await db.order.updateMany({
  where: { id: orderId, lastEventAt: { lt: event.createdAt } },
  data:  { status: newStatus, lastEventAt: event.createdAt },
});
```

**2. Model it as a state machine and reject illegal transitions.**

```ts
const ALLOWED: Record<string, string[]> = {
  pending:   ['paid', 'failed', 'cancelled'],
  paid:      ['refunded', 'disputed'],
  refunded:  [],                          // terminal
};
if (!ALLOWED[current].includes(next)) {
  // Not an error — park it and re-evaluate when the earlier event lands.
  await this.parkOutOfOrder(event);
  return;
}
```

**3. Treat the webhook as a notification, not as data.** The most robust pattern: the webhook
tells you *something changed*; you then call the provider's API for the current truth.

```ts
// The webhook says "payment 91 changed". We don't trust its body for state.
const truth = await paymentsApi.get(event.data.paymentId);
await this.applyState(truth);      // ordering stops mattering entirely
```

That third one costs an API call and removes a whole class of bug. For anything financial, it
is usually the right trade.

### Q6: What if a webhook never arrives at all?

**Answer:**

It happens: your service was down, the provider had an incident, a deploy dropped in-flight
requests. **Design for it — do not assume delivery.**

That is what reconciliation is for.

---

## 6. Reconciliation — the safety net

### Q7: How do you catch events you never received?

**Answer:**

A scheduled job that compares your state against the provider's and fixes the difference.

```ts
// Runs every 15 minutes. Not glamorous; catches everything webhooks miss.
@Cron('*/15 * * * *')
async reconcilePayments() {
  // Anything stuck in a non-terminal state longer than it should be
  const stuck = await this.db.payment.findMany({
    where: { status: 'pending', createdAt: { lt: subMinutes(new Date(), 30) } },
    take: 500,
  });

  for (const local of stuck) {
    const remote = await this.paymentsApi.get(local.providerId);
    if (remote.status !== local.status) {
      this.logger.warn({ event: 'reconciliation.drift', id: local.id,
                         local: local.status, remote: remote.status });
      await this.applyState(remote);        // same idempotent path as the webhook
    }
  }
}
```

**Two things to say about this in an interview:**

1. **It uses the same code path as the webhook handler.** If reconciliation has its own logic,
   you now have two implementations of the same state transition and they will diverge.
2. **The drift count is a metric worth alerting on.** A sudden rise means webhook delivery is
   broken — and that is otherwise invisible, because a webhook that never arrives generates no
   error anywhere in your system.

**This is the answer that separates people who have run a payment integration from people who
have built one.** Webhooks are best-effort; reconciliation is what makes the system correct.

---

## 7. Sending webhooks

### Q8: Now you are the provider. What do you owe your customers?

**Answer:**

Everything above, from the other side — plus one security concern that is easy to miss.

**The delivery pipeline:**

```
  domain event ──▶ outbox ──▶ queue ──▶ delivery worker ──▶ customer URL
                                              │
                                     fail ────┤
                                              ▼
                                   retry with backoff (1m, 5m, 30m, 2h, 12h)
                                              │
                                     exhausted│
                                              ▼
                                     dead letter + notify + disable endpoint
```

| Obligation | Detail |
|---|---|
| **Sign every payload** | HMAC with a per-customer secret, and let them rotate it |
| **Include a unique event id** | So *they* can deduplicate. You are the source of the duplicates |
| **Include a timestamp** | Inside the signed payload, so replay can be bounded |
| **Retry with backoff** | Escalating, over hours. Say the schedule in your docs |
| **Set a short timeout** | 5–10 seconds. A slow customer must not block your worker pool |
| **Dead-letter and notify** | After N failures, stop and tell them. Do not retry forever |
| **Auto-disable dead endpoints** | An endpoint failing for a week is gone. Keep retrying and you are DDoSing someone |
| **Provide a replay UI/API** | They will have bugs. Let them re-request the last 24 hours |
| **Publish a delivery log** | "We sent this, at this time, you returned 500." Ends most support arguments |

**The security issue people miss: SSRF.**

Your customer supplies the URL. If you fetch it naively, they can point it at your own
infrastructure.

```ts
// A customer sets their webhook URL to http://169.254.169.254/latest/meta-data/
// (the AWS instance metadata endpoint) and your server happily fetches it —
// and, if you log response bodies, hands them your IAM credentials.

function assertSafeWebhookUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('https required');

  // Resolve the DNS name and check the ACTUAL address — a hostname can
  // resolve to a private IP, and can change between your check and the fetch.
  const { address } = await dns.lookup(url.hostname);
  if (isPrivateAddress(address)) throw new Error('private address not allowed');
}
```

Block private ranges (`10.x`, `192.168.x`, `172.16–31.x`), loopback, link-local (`169.254.x`),
and IPv6 equivalents. Do the check against the **resolved IP**, and ideally re-check at
connection time — DNS rebinding attacks exploit the gap between the two.

Depth: [../phase-4-cloud-infrastructure/06-security-compliance.md](../phase-4-cloud-infrastructure/06-security-compliance.md).

---

## 8. Testing and debugging

| Need | Tool / approach |
|---|---|
| Receive webhooks on localhost | `ngrok`, `cloudflared tunnel`, or the provider's CLI (`stripe listen`) |
| Test signature verification | Unit test with a known payload and a known secret. Include the failure case |
| Test idempotency | **Send the same event twice in a test and assert one side effect.** Most codebases have no such test |
| Test out-of-order | Send events in reverse and assert the final state is correct |
| Inspect what a provider sends | `webhook.site` or a request-bin, before you write any code |
| Reproduce production issues | Store the raw payload — this is why the handler persists before processing |

```ts
// The test almost nobody writes, and the one that catches the real bug:
it('charges once when the same webhook is delivered twice', async () => {
  const event = paymentSucceeded({ id: 'evt_1', orderId: 'ord_9' });

  await Promise.all([                     // concurrent, not sequential —
    post('/webhooks/payments', event),    // sequential passes even when the
    post('/webhooks/payments', event),    // code has a race
  ]);
  await drainQueue();

  const order = await db.order.findUnique({ where: { id: 'ord_9' } });
  expect(order.status).toBe('paid');
  expect(await db.payment.count({ where: { orderId: 'ord_9' } })).toBe(1);
});
```

**Sending them concurrently is the point.** A sequential double-delivery test passes against
code with a check-then-write race. The concurrent one fails, which is what you want.

---

## 9. Interview questions

**Q: Design a webhook endpoint for a payment provider.**
> Verify the HMAC signature on the raw body, check the timestamp is recent, insert the event id
> with a unique constraint to deduplicate, enqueue, return 200 in under a second. The worker
> does the business logic idempotently — conditional updates rather than increments. Plus a
> reconciliation job, because webhooks are best-effort.

**Q: Why not process it inline?**
> Providers time out at a few seconds and then retry. Slow inline processing turns one event
> into a retry storm that makes the underlying slowness worse.

**Q: The customer was charged twice. What went wrong?**
> Almost certainly a check-then-write race in the deduplication — two deliveries both found no
> existing record. The fix is a unique constraint so the database rejects the second insert
> atomically, plus making the state transition conditional so replaying it is harmless.

**Q: How do you know if webhooks stopped arriving?**
> You cannot detect it from the absence of requests, so reconciliation is the detector. I'd
> alert on the drift count — how many records reconciliation had to correct — because a rise
> there means delivery is broken.

**Q: A customer says they never received a webhook.**
> Check the delivery log: what we sent, when, and their HTTP response. Usually they returned a
> 500, or timed out, or the endpoint had been auto-disabled after repeated failures. Then let
> them replay from the dashboard.

**Q: What is the security risk in letting customers configure a webhook URL?**
> SSRF. They can point it at internal addresses like the cloud metadata endpoint. I validate
> the resolved IP against private ranges rather than validating the hostname, because a
> hostname can resolve to anything and can change between check and fetch.

---

## Related

- [04-event-driven-architecture.md](04-event-driven-architecture.md) — outbox, idempotency, DLQs
- [02-rest-api-best-practices.md](02-rest-api-best-practices.md) — idempotency keys, status code semantics
- [../phase-0-online-assessments/03c-nodejs-async-and-simulation-tasks.md](../phase-0-online-assessments/03c-nodejs-async-and-simulation-tasks.md) — retry with backoff, idempotency store
- [../phase-4-cloud-infrastructure/06-security-compliance.md](../phase-4-cloud-infrastructure/06-security-compliance.md) — SSRF and secrets
- [../phase-3-databases-data/01-postgresql-deep-dive.md](../phase-3-databases-data/01-postgresql-deep-dive.md) — unique constraints and conditional updates
