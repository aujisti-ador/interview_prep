# Observability & Reliability — Interview Preparation Guide

> **Target Role:** Senior / Lead Backend Engineer
> **Format:** Q&A with practical TypeScript/Node.js examples
> **Last Updated:** 2026-03-13

---

## Table of Contents

1. [Three Pillars of Observability](#q1-three-pillars-of-observability)
2. [Structured Logging](#q2-structured-logging)
3. [Metrics & Monitoring](#q3-metrics--monitoring)
4. [Distributed Tracing](#q4-distributed-tracing)
5. [SLIs, SLOs, and SLAs](#q5-slis-slos-and-slas)
6. [Alerting Strategies](#q6-alerting-strategies)
7. [Incident Management](#q7-incident-management)
8. [Health Checks & Graceful Shutdown](#q8-health-checks--graceful-shutdown)
9. [Chaos Engineering](#q9-chaos-engineering)
10. [Quick Reference](#quick-reference)

---

## Q1: Three Pillars of Observability

### Q: What are the three pillars of observability and why do you need all three?

**A:** Observability is the ability to understand the internal state of a system by examining its external outputs. The three pillars are:

| Pillar | What It Tells You | Format | Example |
|---|---|---|---|
| **Logs** | What happened (discrete events) | Structured text (JSON) | `{"level":"error","msg":"Payment failed","orderId":"abc123","reason":"timeout"}` |
| **Metrics** | How much / how often (aggregated numbers) | Numeric time-series | `http_request_duration_seconds{method="POST",path="/api/orders"} 0.245` |
| **Traces** | Where in the system (request flow) | Trace → Spans tree | `API Gateway → Order Service → Payment Service → DB (total: 1.2s)` |

**Why all three are needed — each answers a different question:**

- **Metrics** tell you: "The p99 latency of `/api/orders` jumped from 200ms to 2s at 14:30."
- **Traces** tell you: "The slow requests are spending 1.8s in the Payment Service's call to Stripe."
- **Logs** tell you: "Stripe is returning `429 Too Many Requests` because we exceeded our rate limit."

No single pillar gives you the full picture. Metrics detect the problem, traces narrow down where, and logs explain why.

### Q: What is the difference between observability and monitoring?

**A:**

| Aspect | Monitoring | Observability |
|---|---|---|
| **Question** | "Is something wrong?" (WHEN) | "Why is it wrong?" (WHY) |
| **Approach** | Predefined dashboards & alerts | Explore and query ad-hoc |
| **Failure modes** | Known failure modes | Unknown/novel failure modes |
| **Analogy** | Car dashboard warning lights | Mechanic's diagnostic tools |

> **Interview tip:** If asked "How would you debug a slow API endpoint in a microservices system?", structure your answer across all three pillars:
> 1. **Metrics** — Check the latency dashboard. Identify when it started and which endpoints are affected.
> 2. **Traces** — Pull a sample of slow traces. Identify which downstream service/span is the bottleneck.
> 3. **Logs** — Filter logs for that service with the trace/correlation ID. Find the root cause (timeout, retry storm, bad query, etc.).

---

## Q2: Structured Logging

### Q: Why use structured (JSON) logging over plain text?

**A:**

**Plain text (bad for production):**
```
[2024-03-15 14:30:22] ERROR - Payment failed for order abc123 user u456 timeout after 30s
```

**Structured JSON (good for production):**
```json
{
  "timestamp": "2024-03-15T14:30:22.456Z",
  "level": "error",
  "message": "Payment failed",
  "orderId": "abc123",
  "userId": "u456",
  "reason": "timeout",
  "duration": 30000,
  "service": "order-service",
  "correlationId": "req-789xyz"
}
```

**Why structured wins:**

| Aspect | Plain Text | Structured JSON |
|---|---|---|
| **Searching** | Regex/string matching (fragile) | Query by field: `orderId = "abc123"` |
| **Aggregation** | Nearly impossible | `COUNT(*) WHERE level = "error" GROUP BY reason` |
| **Parsing** | Custom parsers per format | Universal JSON parsing |
| **Dashboards** | Manual setup | Auto-field detection in Kibana/CloudWatch |
| **Cross-service** | No standard format | Consistent fields across services |

### Q: Compare Winston vs Pino for Node.js logging.

**A:**

| Feature | Winston | Pino |
|---|---|---|
| **Performance** | ~3,500 logs/sec | ~30,000 logs/sec (10x faster) |
| **Output format** | Configurable (JSON, text) | JSON-native |
| **Transports** | Built-in (file, console, HTTP) | Separate worker thread (non-blocking) |
| **Ecosystem** | Large (older, more plugins) | Growing (modern, fast) |
| **Best for** | General purpose | High-throughput production services |
| **NestJS integration** | `nestjs-winston` | `nestjs-pino` (recommended) |

> **Recommendation:** Use Pino for production services. Its worker-thread transport model means logging never blocks your event loop.

### Q: What are log levels and when should you use each?

**A:**

| Level | When to Use | Example |
|---|---|---|
| **error** | Something failed and needs attention | Database connection lost, payment failed |
| **warn** | Something unexpected but handled | Retry succeeded after 2 attempts, cache miss fallback |
| **info** | Normal business operations | Order created, user logged in, deployment started |
| **debug** | Developer troubleshooting detail | SQL query executed, cache hit/miss, request payload |
| **trace** | Very verbose, rarely used in production | Function entry/exit, variable values |

**Production:** `info` and above. **Staging:** `debug` and above. **Local:** `trace` and above.

### Q: What should you log and what should you NEVER log?

**A:**

**Always log:**
- Correlation ID / Request ID (trace across services)
- User ID (who triggered it)
- Operation name (what happened)
- Duration (how long it took)
- Error details with stack traces (what went wrong)
- HTTP method, path, status code (API context)

**NEVER log (GDPR / security compliance):**
- Passwords or password hashes
- Auth tokens, API keys, JWT tokens
- Credit card numbers, CVV
- PII: full names, emails, phone numbers, addresses (mask or omit)
- Health or financial data

### Q: How do you implement correlation IDs to trace requests across services?

**A:** A correlation ID (also called request ID or trace ID) is a unique identifier that follows a request across all services.

**NestJS Logging Interceptor with Correlation IDs:**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Store correlation ID for the entire request lifecycle
export const correlationStorage = new AsyncLocalStorage<string>();

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Reuse incoming correlation ID or generate a new one
    const correlationId = request.headers['x-correlation-id'] || uuid();
    request.correlationId = correlationId;

    // Set it on the response header so the caller can see it
    response.setHeader('x-correlation-id', correlationId);

    const { method, url } = request;
    const start = Date.now();

    return correlationStorage.run(correlationId, () =>
      next.handle().pipe(
        tap({
          next: () => {
            const duration = Date.now() - start;
            this.logger.log({
              correlationId,
              method,
              url,
              statusCode: response.statusCode,
              duration,
              userId: request.user?.id,
            });
          },
          error: (error) => {
            const duration = Date.now() - start;
            this.logger.error({
              correlationId,
              method,
              url,
              statusCode: error.status || 500,
              duration,
              userId: request.user?.id,
              error: error.message,
              stack: error.stack,
            });
          },
        }),
      ),
    );
  }
}
```

**Propagating correlation ID to downstream HTTP calls:**

```typescript
import { Injectable, HttpService } from '@nestjs/common';
import { correlationStorage } from './logging.interceptor';

@Injectable()
export class PaymentService {
  constructor(private readonly http: HttpService) {}

  async processPayment(orderId: string, amount: number) {
    const correlationId = correlationStorage.getStore();

    return this.http.post('http://payment-service/api/charge', {
      orderId,
      amount,
    }, {
      headers: {
        'x-correlation-id': correlationId, // Propagate to downstream service
      },
    });
  }
}
```

### Q: What log aggregation tools are commonly used?

**A:**

| Tool | Type | Best For | Cost Model |
|---|---|---|---|
| **ELK Stack** (Elasticsearch + Logstash + Kibana) | Self-hosted / Elastic Cloud | Full-text search, custom dashboards | Per node / by ingestion |
| **CloudWatch Logs** | AWS managed | AWS-native services, Lambda | Per GB ingested + stored |
| **Grafana Loki** | Self-hosted / Grafana Cloud | Cost-efficient, label-based queries | Per stream (no full-text index) |
| **Datadog** | SaaS | All-in-one observability | Per GB ingested (expensive) |

> **Banglalink context:** CloudWatch Logs with Log Insights for Lambda-based services. For high-volume services (41M users), Grafana Loki is more cost-effective than ELK because it only indexes labels, not full log content.

**Structured logging in Lambda with Powertools:**

```typescript
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'notification-service',
  logLevel: 'INFO',
  persistentLogAttributes: {
    environment: process.env.STAGE,
    version: process.env.APP_VERSION,
  },
});

export const handler = async (event: any) => {
  // Automatically adds Lambda context (requestId, functionName, etc.)
  logger.addContext(event);

  logger.info('Processing notification batch', {
    batchSize: event.Records.length,
    source: 'SQS',
  });

  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    logger.appendKeys({ notificationId: message.id, userId: message.userId });

    try {
      await sendNotification(message);
      logger.info('Notification sent successfully');
    } catch (error) {
      logger.error('Failed to send notification', error as Error);
    } finally {
      logger.removeKeys(['notificationId', 'userId']);
    }
  }
};
```

### Q: How do you manage log retention and costs?

**A:**

| Environment | Retention | Reason |
|---|---|---|
| **Production (error/warn)** | 90 days | Incident investigation, compliance |
| **Production (info)** | 30 days | Operational visibility |
| **Production (debug)** | 7 days (if enabled temporarily) | Active troubleshooting only |
| **Staging** | 14 days | Testing validation |
| **Development** | 3 days | Developer convenience |

**Cost management strategies:**
- **Sampling:** Log 100% of errors, 10% of successful requests
- **Log levels in production:** Never run `debug` in production unless temporarily for investigation
- **Archive to S3:** Move old logs from CloudWatch/Elasticsearch to S3 for long-term storage at ~90% cost reduction
- **Drop noisy logs:** Filter out health check logs, readiness probe logs at the collector level

---

## Q3: Metrics & Monitoring

### Q: What types of metrics exist?

**A:**

| Type | Description | Example | Use Case |
|---|---|---|---|
| **Counter** | Monotonically increasing value | `http_requests_total` | Request count, error count |
| **Gauge** | Value that goes up and down | `active_connections` | Memory usage, queue depth |
| **Histogram** | Distribution of values in buckets | `http_request_duration_seconds` | Latency percentiles (p50, p95, p99) |
| **Summary** | Like histogram but calculates quantiles client-side | `request_duration_summary` | Rarely used (prefer histogram) |

> **Key insight:** Use **counters** for things that only increase (requests, errors). Use **gauges** for things that fluctuate (connections, memory). Use **histograms** for anything where you care about percentiles (latency, payload size).

### Q: Explain the RED, USE, and Four Golden Signals methodologies.

**A:**

**RED Method (for request-driven services like APIs):**

| Signal | What to Measure | Example |
|---|---|---|
| **R**ate | Requests per second | `rate(http_requests_total[5m])` |
| **E**rrors | Failed requests per second | `rate(http_requests_total{status=~"5.."}[5m])` |
| **D**uration | Latency distribution | `histogram_quantile(0.99, http_request_duration_seconds)` |

**USE Method (for infrastructure resources like CPU, memory, disk):**

| Signal | What to Measure | Example |
|---|---|---|
| **U**tilization | % of resource in use | CPU at 85% |
| **S**aturation | Work queued/waiting | 50 requests waiting in queue |
| **E**rrors | Error events | Disk I/O errors |

**Four Golden Signals (Google SRE — the industry standard):**

| Signal | Definition | How to Measure |
|---|---|---|
| **Latency** | Time to serve a request | p50, p95, p99 of response time (separate success vs error latency!) |
| **Traffic** | Demand on the system | Requests per second, messages per second |
| **Errors** | Rate of failed requests | 5xx rate, business logic error rate |
| **Saturation** | How "full" the system is | CPU%, memory%, queue depth, thread pool usage |

> **Interview tip:** When asked "What metrics would you set up for a new service?", answer with the Four Golden Signals. It shows you think like an SRE.

### Q: How do you implement Prometheus metrics in Node.js/NestJS?

**A:**

**NestJS Prometheus Metrics Middleware:**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as client from 'prom-client';

// Collect default Node.js metrics (memory, CPU, event loop lag, GC)
client.collectDefaultMetrics({ prefix: 'node_' });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
});

const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
});

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Skip metrics endpoint itself to avoid recursion
    if (req.path === '/metrics') return next();

    activeConnections.inc();
    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
      const path = this.normalizePath(req.route?.path || req.path);
      const labels = {
        method: req.method,
        path,
        status_code: res.statusCode.toString(),
      };

      end(labels);
      httpRequestsTotal.inc(labels);
      activeConnections.dec();
    });

    next();
  }

  // Normalize paths to avoid high-cardinality labels
  // /api/users/123 → /api/users/:id
  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:uuid')
      .replace(/\/\d+/g, '/:id');
  }
}

// Metrics endpoint controller
@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  }
}
```

> **Critical gotcha:** Always normalize path labels. If you use raw paths like `/api/users/123`, `/api/users/456`, etc., you create a new time-series per user. This is called "cardinality explosion" and it will crash Prometheus.

### Q: How do you track custom business metrics?

**A:**

```typescript
import * as client from 'prom-client';

// Business metrics
const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['payment_method', 'region'],
});

const notificationDeliveryDuration = new client.Histogram({
  name: 'notification_delivery_duration_seconds',
  help: 'Time to deliver a notification to the end user',
  labelNames: ['channel', 'priority'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

const notificationQueueDepth = new client.Gauge({
  name: 'notification_queue_depth',
  help: 'Number of notifications waiting to be sent',
  labelNames: ['channel'],
});

// Usage in services
@Injectable()
export class OrderService {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepository.save(dto);

    ordersCreated.inc({
      payment_method: dto.paymentMethod,
      region: dto.region,
    });

    return order;
  }
}

@Injectable()
export class NotificationService {
  async sendNotification(notification: Notification): Promise<void> {
    const end = notificationDeliveryDuration.startTimer({
      channel: notification.channel,
      priority: notification.priority,
    });

    try {
      await this.deliveryProvider.send(notification);
    } finally {
      end(); // Records duration regardless of success/failure
    }
  }
}
```

### Q: How do you use CloudWatch custom metrics and embedded metric format?

**A:**

```typescript
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';

// Embedded Metric Format — write metrics as structured logs
// CloudWatch automatically extracts them as metrics (no API calls needed)
export const handler = async (event: any) => {
  const metrics = createMetricsLogger();

  metrics.setNamespace('NotificationService');
  metrics.setDimensions({ Service: 'notification', Environment: 'production' });

  metrics.putMetric('NotificationsSent', event.Records.length, Unit.Count);
  metrics.putMetric('BatchProcessingTime', processingTime, Unit.Milliseconds);

  // These become searchable properties (not metrics)
  metrics.setProperty('batchId', batchId);
  metrics.setProperty('channel', 'sms');

  await metrics.flush();
};
```

> **Why embedded metric format?** Traditional CloudWatch `putMetricData` API calls cost money and add latency. Embedded metrics are free — they piggyback on log ingestion.

---

## Q4: Distributed Tracing

### Q: What is distributed tracing and why is it essential for microservices?

**A:** Distributed tracing follows a single request as it flows through multiple services, databases, queues, and external APIs. Each unit of work is called a **span**, and the collection of spans forms a **trace**.

```
Trace: "POST /api/orders"
├── Span: API Gateway (12ms)
│   ├── Span: Auth middleware (3ms)
│   └── Span: Order Service (450ms)
│       ├── Span: Validate inventory → Inventory Service (80ms)
│       │   └── Span: PostgreSQL query (15ms)
│       ├── Span: Process payment → Payment Service (300ms)
│       │   ├── Span: Stripe API call (250ms)  ← BOTTLENECK
│       │   └── Span: PostgreSQL insert (10ms)
│       └── Span: Send confirmation → Notification Service (50ms)
│           └── Span: SQS publish (8ms)
```

**Key concepts:**

| Concept | Description |
|---|---|
| **Trace** | The entire journey of a request, identified by a trace ID |
| **Span** | A single operation within a trace (e.g., one HTTP call, one DB query) |
| **SpanContext** | The metadata propagated between services (trace ID, span ID, flags) |
| **Parent-child** | Spans form a tree. The API Gateway span is parent of the Order Service span |
| **Baggage** | User-defined key-value pairs propagated across all spans (e.g., tenant ID) |

### Q: How does trace context propagation work?

**A:** When Service A calls Service B, it must pass the trace context in HTTP headers so Service B can continue the same trace.

**W3C Trace Context (industry standard):**
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
              │  │                                │                  │
              │  │                                │                  └── Flags (01 = sampled)
              │  │                                └── Parent Span ID
              │  └── Trace ID
              └── Version
```

**B3 Headers (Zipkin-style, older but common):**
```
X-B3-TraceId: 4bf92f3577b34da6a3ce929d0e0e4736
X-B3-SpanId: 00f067aa0ba902b7
X-B3-Sampled: 1
```

### Q: How do you set up OpenTelemetry with NestJS?

**A:** OpenTelemetry (OTel) is the vendor-neutral observability framework that has become the industry standard. It provides a single set of APIs, SDKs, and tools for logs, metrics, and traces.

**Architecture:**
```
Your App (OTel SDK) → OTel Collector → Backend (Jaeger / X-Ray / Datadog / Tempo)
```

**Step 1: Instrumentation file (loaded BEFORE NestJS bootstrap):**

```typescript
// tracing.ts — must be imported FIRST, before any other imports
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'order-service',
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
    'deployment.environment': process.env.STAGE || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instruments: HTTP, Express, NestJS, pg, mysql, redis, ioredis, kafka, grpc
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});

export default sdk;
```

**Step 2: Import in main.ts:**

```typescript
import './tracing'; // MUST be first import
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

**Step 3: Add custom spans for business logic:**

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service');

@Injectable()
export class OrderService {
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    // Create a custom span for business logic
    return tracer.startActiveSpan('order.create', async (span) => {
      try {
        span.setAttribute('order.payment_method', dto.paymentMethod);
        span.setAttribute('order.item_count', dto.items.length);

        // Each of these calls creates child spans automatically (via auto-instrumentation)
        const inventory = await this.inventoryService.checkAvailability(dto.items);
        const payment = await this.paymentService.charge(dto.amount);
        const order = await this.orderRepository.save({ ...dto, paymentId: payment.id });

        span.setAttribute('order.id', order.id);
        span.setStatus({ code: SpanStatusCode.OK });
        return order;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

### Q: How do you use AWS X-Ray for tracing?

**A:** AWS X-Ray is Amazon's native distributed tracing service. It integrates tightly with Lambda, API Gateway, ECS, and other AWS services.

**Key X-Ray concepts:**

| Concept | Description |
|---|---|
| **Segment** | Equivalent to a span — represents work done by a service |
| **Subsegment** | Nested work within a segment (DB call, HTTP call) |
| **Annotations** | Indexed key-value pairs — used for filtering traces (max 50) |
| **Metadata** | Non-indexed data — used for detailed debugging |
| **Service Map** | Visual diagram of all services and their connections |

> **Banglalink/Right Tracks context:** X-Ray is valuable for tracing Lambda → SQS → Lambda chains and API Gateway → Lambda → DynamoDB flows. The service map gives instant visibility into which service is the bottleneck.

**X-Ray with OpenTelemetry (recommended approach):**

```typescript
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  textMapPropagator: new AWSXRayPropagator(),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces', // Collector exports to X-Ray
  }),
  idGenerator: new AWSXRayIdGenerator(),
  // ... rest of config
});
```

### Q: How do you trace across async message systems (Kafka, SQS, RabbitMQ)?

**A:** The key challenge is that message brokers break the direct call chain. You must inject trace context into message headers and extract it on the consumer side.

```typescript
import { trace, context, propagation } from '@opentelemetry/api';

// PRODUCER: Inject trace context into Kafka message headers
@Injectable()
export class OrderEventProducer {
  async publishOrderCreated(order: Order): Promise<void> {
    const span = trace.getTracer('order-service').startSpan('kafka.produce', {
      attributes: { 'messaging.system': 'kafka', 'messaging.destination': 'order-events' },
    });

    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);

    await this.kafka.send({
      topic: 'order-events',
      messages: [{
        key: order.id,
        value: JSON.stringify(order),
        headers: carrier, // Trace context injected here
      }],
    });

    span.end();
  }
}

// CONSUMER: Extract trace context from Kafka message headers
@Injectable()
export class OrderEventConsumer {
  async handleMessage(message: KafkaMessage): Promise<void> {
    // Extract parent context from message headers
    const parentContext = propagation.extract(context.active(), message.headers);

    // Create a new span linked to the producer span
    const tracer = trace.getTracer('notification-service');
    context.with(parentContext, () => {
      tracer.startActiveSpan('kafka.consume', async (span) => {
        span.setAttribute('messaging.system', 'kafka');
        span.setAttribute('messaging.operation', 'process');

        await this.processOrder(JSON.parse(message.value.toString()));
        span.end();
      });
    });
  }
}
```

### Q: What trace sampling strategies exist?

**A:**

| Strategy | Description | When to Use |
|---|---|---|
| **Always On** | Trace 100% of requests | Development, low-traffic services |
| **Probability** | Trace X% of requests (e.g., 10%) | High-traffic production services |
| **Rate Limiting** | Trace N requests per second | Predictable cost regardless of traffic |
| **Parent-based** | Follow the parent's sampling decision | Consistent end-to-end traces |
| **Tail-based** | Decide after the trace completes (keep errors, slow requests) | Best quality, most complex |

> **Production recommendation:** Use **tail-based sampling** at the OTel Collector level. Keep 100% of error traces, 100% of slow traces (>2s), and 5% of successful traces. This gives you full visibility into problems while keeping costs manageable.

---

## Q5: SLIs, SLOs, and SLAs

### Q: Explain SLIs, SLOs, and SLAs with examples.

**A:**

| Term | Definition | Who Cares | Example |
|---|---|---|---|
| **SLI** (Service Level Indicator) | The metric you **measure** | Engineering | "p99 latency of `POST /api/orders`" |
| **SLO** (Service Level Objective) | The target you **aim for** | Engineering + Product | "p99 latency < 500ms over 30 days" |
| **SLA** (Service Level Agreement) | The contract with **consequences** | Business + Customer | "99.9% uptime or 10% credit refund" |

**Relationship:** SLI is the raw measurement. SLO is the internal goal (set tighter than SLA). SLA is the external promise.

```
SLA:  99.9% availability  (external promise, violating = $$$)
SLO:  99.95% availability (internal target, tighter to give safety margin)
SLI:  successful_requests / total_requests (the actual measurement)
```

### Q: What are common SLIs for backend services?

**A:**

| SLI Category | How to Measure | Good SLO Example |
|---|---|---|
| **Availability** | `(total_requests - 5xx_errors) / total_requests` | 99.95% over 30 days |
| **Latency** | p50, p95, p99 of response time | p99 < 500ms, p50 < 100ms |
| **Throughput** | Requests per second | Sustain 10,000 RPS |
| **Error rate** | `5xx_responses / total_responses` | < 0.1% over 30 days |
| **Correctness** | Business logic validation checks | 99.99% of calculations are correct |
| **Freshness** | Time since last data update | Data < 60 seconds stale |

### Q: What is an error budget and how does it work?

**A:** Error budget = `100% - SLO`. It represents the acceptable amount of unreliability.

| SLO | Error Budget | Downtime per Month | Downtime per Year |
|---|---|---|---|
| 99% | 1% | 7.3 hours | 3.65 days |
| 99.9% | 0.1% | 43.8 minutes | 8.76 hours |
| 99.95% | 0.05% | 21.9 minutes | 4.38 hours |
| 99.99% | 0.01% | 4.38 minutes | 52.6 minutes |
| 99.999% | 0.001% | 26.3 seconds | 5.26 minutes |

**How to use error budget:**

```
If error budget is healthy (>50% remaining):
  → Ship features fast, take risks, experiment
  → Deploy multiple times per day

If error budget is low (<25% remaining):
  → Slow down feature work
  → Focus on reliability improvements
  → More thorough testing before deploys

If error budget is exhausted (0% remaining):
  → Feature freeze
  → All engineering effort on reliability
  → No deploys except reliability fixes
```

> **Banglalink context:** "At Banglalink, our notification service SLO was 99.95% delivery within 30 seconds for 41M users. That gave us ~21.9 minutes of error budget per month. With burst traffic during festivals (Eid, New Year), we had to be very intentional about when we deployed."

### Q: What is burn rate alerting and why is it better than threshold alerts?

**A:**

**Threshold alerting (traditional):** "Alert if error rate > 1% for 5 minutes."
- Problem: A brief spike triggers an alert, but it might not actually threaten your SLO.

**Burn rate alerting (SLO-based):** "Alert if we are consuming error budget X times faster than normal."
- A burn rate of **1x** means you will exactly exhaust your error budget by the end of the window.
- A burn rate of **10x** means you will exhaust it in 1/10th the time.

**Multi-window burn rate alerts (Google SRE recommended):**

| Severity | Burn Rate | Long Window | Short Window | Time to Exhaust Budget |
|---|---|---|---|---|
| **P1 (page)** | 14.4x | 1 hour | 5 minutes | ~3 days |
| **P2 (ticket)** | 6x | 6 hours | 30 minutes | ~5 days |
| **P3 (slack)** | 1x | 3 days | 6 hours | 30 days (on track to exhaust) |

**SLO tracking metrics example:**

```typescript
import * as client from 'prom-client';

const sloAvailability = new client.Gauge({
  name: 'slo_availability_ratio',
  help: 'Current SLO availability ratio over 30-day window',
  labelNames: ['service'],
});

const errorBudgetRemaining = new client.Gauge({
  name: 'error_budget_remaining_ratio',
  help: 'Remaining error budget as a ratio (1.0 = full, 0.0 = exhausted)',
  labelNames: ['service'],
});

// Calculate periodically (e.g., every minute)
function updateSLOMetrics() {
  const totalRequests = getTotalRequestsLast30Days();
  const failedRequests = getFailedRequestsLast30Days();
  const successRatio = (totalRequests - failedRequests) / totalRequests;

  const sloTarget = 0.9995; // 99.95%
  const errorBudgetTotal = 1 - sloTarget; // 0.0005
  const errorBudgetConsumed = 1 - successRatio;
  const budgetRemaining = Math.max(0, 1 - (errorBudgetConsumed / errorBudgetTotal));

  sloAvailability.set({ service: 'order-service' }, successRatio);
  errorBudgetRemaining.set({ service: 'order-service' }, budgetRemaining);
}
```

---

## Q6: Alerting Strategies

### Q: What is alert fatigue and how do you prevent it?

**A:** Alert fatigue happens when a team receives so many alerts that they start ignoring them — including the critical ones. It is the #1 operational risk for on-call teams.

**Causes of alert fatigue:**
- Alerting on causes instead of symptoms (e.g., "CPU > 80%" instead of "latency > SLO")
- Too-sensitive thresholds (flapping alerts)
- No deduplication (same issue triggers 10 alerts)
- Non-actionable alerts (nothing you can do about it at 3 AM)
- Missing severity levels (everything pages)

**Alert design principles:**

| Principle | Bad Example | Good Example |
|---|---|---|
| **Alert on symptoms, not causes** | "CPU > 80%" | "p99 latency > 500ms for 5 min" |
| **Alert on SLO breaches** | "Error rate > 1%" | "Error budget burn rate > 14x for 5 min" |
| **Every alert must be actionable** | "Disk at 60%" | "Disk at 90% — run log cleanup runbook" |
| **Include runbook link** | "Service X is down" | "Service X is down — runbook: [link]" |
| **Deduplicate** | 50 alerts for same issue | 1 alert with count and affected scope |

### Q: How should you classify alert severity?

**A:**

| Severity | Response | Channel | Example |
|---|---|---|---|
| **P1 — Critical** | Immediate page, wake up at night | PagerDuty/OpsGenie phone call | Customer-facing outage, data loss, SLA breach |
| **P2 — High** | Respond within 1 hour (business hours) | PagerDuty/OpsGenie + Slack | Degraded performance, partial outage, error budget burning fast |
| **P3 — Medium** | Respond within 1 business day | Slack alert channel | Minor degradation, single instance unhealthy, approaching thresholds |
| **P4 — Low/Info** | Review in next sprint | Email digest / dashboard | Informational, capacity planning, non-urgent maintenance needed |

**Escalation policy:**

```
P1 Alert fired
  └── 0 min: Primary on-call engineer notified (phone + SMS + push)
      └── 15 min: If no acknowledgement → Secondary on-call notified
          └── 30 min: If no acknowledgement → Engineering Manager notified
              └── 60 min: If unresolved → VP Engineering notified
```

### Q: What should a good runbook look like?

**A:**

```markdown
# Runbook: High API Latency (P2)

## Alert Condition
p99 latency > 500ms for 5 consecutive minutes on order-service

## Impact
Users experience slow checkout. Cart abandonment increases.

## Quick Diagnosis (< 5 minutes)
1. Check Grafana dashboard: [link]
   - Is latency high on ALL endpoints or specific ones?
   - Did traffic spike? (Check RPS graph)
2. Check downstream dependencies:
   - Database: Check slow query log in CloudWatch
   - Redis: Check connection count and memory
   - Payment service: Check its latency dashboard
3. Check recent deployments: `kubectl rollout history deployment/order-service`

## Common Causes & Fixes

### Database slow queries
- **Check:** CloudWatch RDS → Performance Insights → Top SQL
- **Fix (immediate):** Kill long-running queries: `SELECT pg_terminate_backend(pid);`
- **Fix (permanent):** Add missing index, optimize query

### Connection pool exhaustion
- **Check:** Metric `db_pool_active_connections` near `db_pool_max`
- **Fix (immediate):** Restart pods: `kubectl rollout restart deployment/order-service`
- **Fix (permanent):** Increase pool size or fix connection leaks

### Downstream service degradation
- **Check:** Trace dashboard for slow spans
- **Fix (immediate):** Enable circuit breaker / return cached response
- **Fix (permanent):** Add timeout + retry + fallback

## Escalation
If not resolved within 30 minutes, escalate to P1 and page the database team.
```

---

## Q7: Incident Management

### Q: Walk me through the incident management lifecycle.

**A:**

```
Detect → Triage → Mitigate → Resolve → Review
```

| Phase | Actions | Duration Target |
|---|---|---|
| **Detect** | Alert fires, customer reports, monitoring catches it | < 5 minutes (via automated alerting) |
| **Triage** | Assess severity, assign incident commander, open war room | < 10 minutes |
| **Mitigate** | Stop the bleeding (rollback, scale up, failover, feature flag off) | < 30 min for P1 |
| **Resolve** | Fix the root cause, verify recovery, close incident | Hours to days |
| **Review** | Blameless postmortem, action items, share learnings | Within 5 business days |

### Q: What are the incident roles?

**A:**

| Role | Responsibility |
|---|---|
| **Incident Commander (IC)** | Owns the incident. Makes decisions, delegates tasks, manages communication. Does NOT debug directly. |
| **Technical Lead** | Leads investigation and debugging. Coordinates between teams. Implements the fix. |
| **Communications Lead** | Posts status updates to stakeholders, customers, status page. Shields the tech team from interruptions. |
| **Scribe** | Records timeline, actions taken, decisions made. Feeds into the postmortem. |

> **Interview tip:** If asked "Walk me through a production incident you handled," structure your answer as: **Detect** (how you found out) → **Impact** (who was affected, severity) → **Mitigate** (what you did to stop the bleeding) → **Root Cause** (what actually went wrong) → **Learnings** (what changed as a result).

### Q: What is a blameless postmortem?

**A:** A blameless postmortem focuses on **systems and processes**, not individuals. The goal is to make the system more resilient, not to find someone to blame.

**Postmortem template:**

```markdown
# Incident Postmortem: Order Service Outage
**Date:** 2024-03-15
**Duration:** 47 minutes (14:22 - 15:09 UTC)
**Severity:** SEV1 (customer-facing outage)
**Incident Commander:** [Name]

## Summary
The order service experienced a complete outage for 47 minutes due to a
database connection pool exhaustion caused by a missing index on the
`orders.created_at` column after a schema migration.

## Impact
- 100% of order creation requests failed (HTTP 500)
- ~12,000 users affected
- Estimated revenue loss: $45,000
- SLO impact: Error budget for March consumed 68%

## Timeline (all times UTC)
| Time | Event |
|---|---|
| 14:15 | Deploy v2.3.1 with new reporting query |
| 14:22 | P1 alert: order-service error rate > 50% |
| 14:25 | IC assigned, war room opened |
| 14:30 | Root cause identified: all DB connections blocked by slow query |
| 14:35 | Mitigation: killed blocking queries, restarted order-service pods |
| 14:42 | Service partially recovered |
| 14:55 | Added missing index on orders.created_at |
| 15:09 | Full recovery confirmed, incident closed |

## Root Cause
The v2.3.1 deploy included a new reporting query that performed a full
table scan on the `orders` table (2.3M rows). This query held connections
for 30+ seconds, exhausting the connection pool (max: 20). All subsequent
requests queued and timed out.

## Five Whys
1. Why did the service go down? → Connection pool exhausted
2. Why was the pool exhausted? → A slow query held connections for 30+ seconds
3. Why was the query slow? → Missing index on orders.created_at
4. Why was the index missing? → Schema migration review did not include query plan analysis
5. Why was there no query plan review? → No automated check in CI/CD pipeline

## Action Items
| Action | Owner | Priority | Due |
|---|---|---|---|
| Add missing index | @backend-team | P0 | Done |
| Add query plan analysis to CI | @platform-team | P1 | 2024-03-22 |
| Set per-query timeout to 5s | @backend-team | P1 | 2024-03-20 |
| Add connection pool exhaustion alert | @sre-team | P2 | 2024-03-25 |
| Separate read replicas for reporting queries | @backend-team | P2 | 2024-04-01 |

## Lessons Learned
- Schema changes MUST include query plan verification
- Reporting queries should run against read replicas, not the primary
- Connection pool monitoring was missing — now added
```

---

## Q8: Health Checks & Graceful Shutdown

### Q: What is the difference between liveness and readiness checks?

**A:**

| Check | Question It Answers | If It Fails... | Example Failure |
|---|---|---|---|
| **Liveness** | "Is the process alive and not deadlocked?" | Kubernetes **restarts** the pod | Infinite loop, deadlock, memory leak crash |
| **Readiness** | "Can it handle traffic right now?" | Kubernetes **removes it from load balancer** (no restart) | DB connection lost, warming cache, not ready yet |
| **Startup** | "Has it finished starting up?" | Kubernetes waits (no liveness check until startup passes) | Slow initialization, loading large dataset |

**Critical distinction:** A failed liveness check kills the pod. A failed readiness check just stops sending traffic to it. Getting this wrong causes cascading restarts.

> **Common mistake:** Making the liveness check depend on the database. If the DB goes down, all pods restart simultaneously. Now you have no pods AND no database. The liveness check should only verify the process is alive (simple HTTP 200). Database connectivity belongs in the readiness check.

### Q: How do you implement health checks in NestJS?

**A:**

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  // LIVENESS: Is the process alive? Keep this simple.
  @Get('live')
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      // Only check process-level health
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB max heap
    ]);
  }

  // READINESS: Can it handle traffic?
  @Get('ready')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.redis.checkHealth('redis'),
      () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
    ]);
  }

  // FULL: Detailed check for dashboards (not used by K8s probes)
  @Get()
  @HealthCheck()
  full(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.redis.checkHealth('redis'),
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
      () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
    ]);
  }
}
```

**Custom Redis health indicator:**

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: Redis) {
    super();
  }

  async checkHealth(key: string): Promise<HealthIndicatorResult> {
    try {
      const result = await this.redis.ping();
      if (result !== 'PONG') throw new Error(`Unexpected response: ${result}`);
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false, { error: error.message }));
    }
  }
}
```

**Kubernetes deployment with health probes:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
        - name: order-service
          image: order-service:latest
          ports:
            - containerPort: 3000
          startupProbe:          # Wait for app to start
            httpGet:
              path: /health/live
              port: 3000
            failureThreshold: 30  # 30 * 10s = 5 minutes to start
            periodSeconds: 10
          livenessProbe:         # Restart if deadlocked
            httpGet:
              path: /health/live
              port: 3000
            periodSeconds: 15
            timeoutSeconds: 3
            failureThreshold: 3   # 3 consecutive failures = restart
          readinessProbe:        # Remove from LB if not ready
            httpGet:
              path: /health/ready
              port: 3000
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2   # 2 consecutive failures = stop traffic
```

### Q: How do you implement graceful shutdown in NestJS?

**A:** Graceful shutdown ensures in-flight requests complete before the process exits. Without it, users get connection resets mid-request during deployments.

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks (listens for SIGTERM, SIGINT)
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
```

**Service-level shutdown logic:**

```typescript
import { Injectable, OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Injectable()
export class AppShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger('Shutdown');

  constructor(
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly dbConnection: DatabaseService,
    private readonly redisClient: RedisService,
    private readonly httpServer: HttpServerService,
  ) {}

  async onApplicationShutdown(signal: string): Promise<void> {
    this.logger.warn(`Received ${signal}. Starting graceful shutdown...`);

    // Order matters! Shutdown in reverse dependency order.

    // 1. Stop accepting new messages from Kafka
    this.logger.log('Disconnecting Kafka consumer...');
    await this.kafkaConsumer.disconnect();

    // 2. Wait for in-flight HTTP requests to complete (NestJS handles this)
    this.logger.log('Waiting for in-flight requests...');
    await this.waitForInflightRequests(10_000); // 10s max wait

    // 3. Close Redis connections
    this.logger.log('Closing Redis connections...');
    await this.redisClient.disconnect();

    // 4. Close database connections (last, since other shutdown steps might need it)
    this.logger.log('Closing database connections...');
    await this.dbConnection.close();

    this.logger.log('Graceful shutdown complete.');
  }

  private async waitForInflightRequests(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, timeoutMs);
      // In practice, check active connection count
      // For simplicity, just wait for the timeout
      clearTimeout(timeout);
      resolve();
    });
  }
}
```

**Kubernetes graceful shutdown integration:**

```yaml
spec:
  terminationGracePeriodSeconds: 60  # Give pod 60s to shut down
  containers:
    - name: order-service
      lifecycle:
        preStop:
          exec:
            # Give the load balancer time to remove this pod from endpoints
            # before the app starts rejecting connections
            command: ["sh", "-c", "sleep 5"]
```

**Zero-downtime deployment flow:**

```
1. K8s sends SIGTERM to old pod
2. preStop hook runs (sleep 5) — LB removes pod from endpoints
3. NestJS shutdown hooks fire:
   a. Stop accepting new Kafka messages
   b. Finish in-flight HTTP requests
   c. Close DB/Redis connections
4. Pod terminates
5. If pod hasn't terminated by terminationGracePeriodSeconds → SIGKILL
```

---

## Q9: Chaos Engineering

### Q: What is chaos engineering and why is it important at the senior/lead level?

**A:** Chaos engineering is the practice of intentionally injecting failures into a system to discover weaknesses before they cause real outages. It is not about breaking things randomly — it follows a scientific method.

**The chaos engineering process:**

```
1. Define "steady state" — What does normal look like?
   (e.g., p99 latency < 200ms, error rate < 0.1%)

2. Hypothesize — "If we kill one pod, the system should continue operating
   within SLO because of auto-scaling and load balancing."

3. Inject failure — Kill the pod.

4. Observe — Did the system behave as expected?

5. Learn — If it didn't, fix the weakness. If it did, try harder failures.
```

**Principles:**

| Principle | Description |
|---|---|
| **Start small** | Begin with non-production, then staging, then production |
| **Minimize blast radius** | Limit the scope (one pod, one AZ, not the whole cluster) |
| **Run in production** | That is where it matters. Non-prod environments lie to you. |
| **Automate** | Manual experiments do not scale. Run them continuously. |
| **Have a rollback plan** | Know how to stop the experiment instantly |

### Q: What are common chaos experiments?

**A:**

| Experiment | What It Tests | Expected Outcome |
|---|---|---|
| **Kill a pod/container** | Auto-healing, load balancing | Traffic routes to healthy pods, K8s restarts the pod |
| **Network latency injection** | Timeout handling, circuit breakers | Circuit breaker opens, fallback response served |
| **Fail database connection** | Connection retry, read replica failover | App serves cached data or returns graceful error |
| **CPU/memory exhaustion** | Auto-scaling, resource limits | HPA scales up pods, OOM-killed pods get restarted |
| **Kill an entire AZ** | Multi-AZ redundancy | Traffic shifts to remaining AZs |
| **DNS failure** | Service discovery resilience | Cached DNS entries used, graceful degradation |
| **Kafka/SQS unavailable** | Message buffering, retry logic | Messages queue locally, retry when broker returns |

### Q: What tools are available for chaos engineering?

**A:**

| Tool | Platform | Best For |
|---|---|---|
| **AWS FIS** (Fault Injection Simulator) | AWS | EC2, ECS, EKS, RDS, network experiments |
| **Litmus Chaos** | Kubernetes | K8s-native experiments, CRDs, CI/CD integration |
| **Chaos Monkey** (Netflix) | Any | Random instance termination |
| **Gremlin** | Any (SaaS) | Enterprise chaos engineering platform |
| **Toxiproxy** (Shopify) | Any | Network-level failure simulation (latency, down, bandwidth) |
| **k6** (with fault injection) | Any | Load testing + chaos |

**AWS FIS example — inject latency into ECS service:**

```json
{
  "description": "Inject 500ms latency to order-service",
  "targets": {
    "orderService": {
      "resourceType": "aws:ecs:task",
      "selectionMode": "COUNT(1)",
      "resourceTags": { "service": "order-service" }
    }
  },
  "actions": {
    "injectLatency": {
      "actionId": "aws:ecs:task-network-latency",
      "parameters": {
        "duration": "PT5M",
        "delayMilliseconds": "500",
        "jitterMilliseconds": "100"
      },
      "targets": { "Tasks": "orderService" }
    }
  },
  "stopConditions": [{
    "source": "aws:cloudwatch:alarm",
    "value": "arn:aws:cloudwatch:...:alarm:order-service-error-rate-critical"
  }],
  "roleArn": "arn:aws:iam::...:role/fis-role"
}
```

### Q: What is a Game Day?

**A:** A Game Day is a scheduled, team-wide chaos engineering exercise. Think of it as a fire drill for your production systems.

**Game Day structure:**

```
Before (1 week prior):
  - Choose scenario (e.g., "Primary database failover")
  - Define steady state and success criteria
  - Brief the team, ensure runbooks exist
  - Set up monitoring dashboards
  - Get management approval

During (2-4 hours):
  - Inject failure at scheduled time
  - Observe system behavior
  - Incident Commander practices leading
  - On-call engineer practices diagnosing
  - Document everything in real-time

After (within 1 week):
  - Review findings
  - Write postmortem-style document
  - Create action items for weaknesses found
  - Schedule next Game Day
```

> **BD context:** "Test what happens when the internet goes down for 5 minutes — this is common in Bangladesh, especially in rural areas. Does the mobile app queue requests and retry? Do the backend services buffer messages? For a service handling 41M users at Banglalink, intermittent connectivity is not an edge case — it is the normal case."

---

## Quick Reference

### Observability Tools Comparison

| Tool | Logs | Metrics | Traces | Self-hosted | SaaS | Cost |
|---|---|---|---|---|---|---|
| **ELK Stack** | Yes | Via Elasticsearch | Via APM | Yes | Elastic Cloud | Medium-High |
| **Grafana Stack** (Loki + Prometheus + Tempo) | Yes | Yes | Yes | Yes | Grafana Cloud | Low-Medium |
| **Datadog** | Yes | Yes | Yes | No | Yes | High |
| **AWS Native** (CloudWatch + X-Ray) | Yes | Yes | Yes | No | Yes | Pay-per-use |
| **New Relic** | Yes | Yes | Yes | No | Yes | Medium-High |

> **Recommendation for BD startups:** Start with AWS CloudWatch + X-Ray (already included if you use AWS). Graduate to Grafana Stack (Loki + Prometheus + Tempo) when you need more power. Avoid Datadog until you have the budget.

### SLI / SLO / SLA Cheat Sheet

```
SLI = What you MEASURE        (p99 latency, error rate, availability)
SLO = What you AIM FOR         (p99 < 500ms, error rate < 0.1%, 99.95% availability)
SLA = What you PROMISE          (99.9% uptime or refund)

Error Budget = 100% - SLO
  99.9%  SLO → 43.8 min/month budget
  99.95% SLO → 21.9 min/month budget
  99.99% SLO → 4.38 min/month budget

Burn Rate = how fast you're consuming error budget
  1x  = on pace to exactly exhaust it
  14x = P1 page — you'll exhaust it in ~3 days
```

### Alert Severity Matrix

| Severity | Response Time | Channel | Who | Example |
|---|---|---|---|---|
| **P1** | Immediate | Phone call | On-call | Full outage, data loss |
| **P2** | 1 hour | Push notification + Slack | On-call | Degraded, error budget burning |
| **P3** | 1 business day | Slack | Team | Minor degradation, threshold approaching |
| **P4** | Next sprint | Email | Team lead | Capacity planning, maintenance |

### Health Check Implementation Checklist

```
[ ] Liveness endpoint (/health/live)
    - Simple process check only
    - Do NOT check external dependencies
    - Returns 200 if process is alive

[ ] Readiness endpoint (/health/ready)
    - Check database connectivity
    - Check Redis connectivity
    - Check critical downstream services
    - Returns 200 if ready for traffic

[ ] Startup probe configured (K8s)
    - Prevents premature liveness checks during slow startup

[ ] Graceful shutdown implemented
    - enableShutdownHooks() in NestJS
    - preStop hook in K8s (sleep 5)
    - terminationGracePeriodSeconds set (30-60s)
    - Close connections in correct order

[ ] Zero-downtime deployment verified
    - Rolling update strategy
    - maxUnavailable: 0
    - maxSurge: 1 (or 25%)
```

### Common Interview Questions

| Question | Key Points to Cover |
|---|---|
| "How would you debug a slow API in microservices?" | Metrics → Traces → Logs (three pillars approach) |
| "How do you set up monitoring for a new service?" | Four Golden Signals + RED method + health checks |
| "What SLOs would you define for a payment service?" | Availability 99.99%, p99 latency < 1s, error rate < 0.01% |
| "How do you handle alert fatigue?" | Symptom-based, SLO-driven, severity levels, runbooks |
| "Walk me through a production incident" | Detect → Impact → Mitigate → Root Cause → Learnings |
| "What is your approach to chaos engineering?" | Hypothesis → Small blast radius → Observe → Learn → Automate |
| "How do you ensure zero-downtime deployments?" | Health checks + graceful shutdown + rolling updates + preStop hook |
| "How would you implement distributed tracing?" | OpenTelemetry + auto-instrumentation + context propagation + sampling |
| "How do you manage observability costs at scale?" | Sampling, log levels, retention policies, tail-based sampling, Loki over ELK |
| "What is an error budget and how do you use it?" | 100% - SLO, burn rate alerts, feature freeze when exhausted |
