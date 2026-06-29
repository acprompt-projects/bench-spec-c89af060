# ADR 004: Eventing Transport — CloudEvents over NATS

## Status

Accepted

## Context

Benchmark runs produce progress events (started, progress, completed, failed) that prompt-viz displays in real time. We need an eventing transport that supports pub/sub, is lightweight to operate, delivers low latency for dashboard updates, and interops well with potential future cloud deployments.

## Decision

We adopt **NATS JetStream** as the eventing transport, with all events formatted as **CloudEvents v1.0** (JSON encoding).

### Why NATS Over Alternatives

| Option | Rejected Because |
|---|---|
| Kafka | Operational complexity too high for our scale; designed for high-throughput log, not low-latency fan-out |
| Redis Pub/Sub | No persistence/delivery guarantees; cross-datacenter replication is fragile |
| RabbitMQ | Routing flexibility is overkill; heavier operational footprint |
| Webhooks | Requires each consumer to expose an HTTP endpoint; poor fit for browser-based viz |

### CloudEvents Envelope

Every event conforms to:

```json
{
  "specversion": "1.0",
  "type": "com.bench-spec.run.completed",
  "source": "/runs/abc-123",
  "id": "f3b39527-2c1a-4c28-...",
  "time": "2025-01-15T10:30:00Z",
  "datacontenttype": "application/json",
  "data": { ... }
}
```

### Event Types

| Type | Produced By | Description |
|---|---|---|
| `run.started` | prompt-bench | Benchmark run initiated |
| `run.progress` | prompt-bench | Iteration/metric progress update |
| `run.completed` | prompt-bench | Final results available |
| `run.failed` | prompt-bench | Run terminated with error |
| `results.published` | prompt-bench | Results written to store |

### Stream Configuration

- Stream name: `BENCH_EVENTS`, subjects: `bench.run.>`
- Retention: 72 hours, then discard.
- Replicas: 3 in production; 1 in dev.
- prompt-viz subscribes via durable consumer with `deliver-all` on connect for missed events.

### Client Delivery to Browsers

NATS → WebSocket bridge (nats.ws) serves browser clients directly; no intermediate message broker needed.

## Consequences

- Single binary deployment (nats-server) simplifies operations.
- CloudEvents format permits future migration to different transports without consumer changes.
- 72-hour retention limits replay window; consumers must checkpoint positions.
- WebSocket bridge is a single point of failure; deploy with fallback reconnect and load balancing.