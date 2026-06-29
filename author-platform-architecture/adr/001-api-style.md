# ADR 001: API Style — REST with OpenAPI

## Status

Accepted

## Context

prompt-bench and prompt-viz need a shared contract for benchmark configs and results. The two main options are REST (HTTP/JSON with OpenAPI specs) or gRPC (HTTP/2 with Protocol Buffers). The schema is JSON-native by project mandate, consumers are web-based (viz dashboards, CLI tools), and the primary workload is read-heavy config retrieval with occasional batch result writes.

## Decision

We adopt **REST over HTTP/1.1+ with JSON payloads**, documented via OpenAPI 3.1 specifications.

### Rationale

- **JSON-first alignment**: The bench-spec schema is defined as JSON Schema; REST avoids a protobuf-to-JSON translation layer.
- **Browser accessibility**: prompt-viz runs in browsers; gRPC-Web adds intermediary complexity that REST avoids.
- **Tooling maturity**: OpenAPI codegen, mock servers, and validation libraries are available in every target language.
- **Payload size**: Benchmark configs are small (<100 KB); gRPC's binary encoding advantage is negligible here.
- **Evolvability**: JSON + OpenAPI facilitates additive, non-breaking changes more intuitively for spec consumers.

### Constraints

- Endpoints MUST return `Content-Type: application/json`.
- Request/response shapes MUST reference the shared JSON Schema definitions in `bench-spec/schemas/`.
- Pagination MUST use cursor-based `?cursor=<token>&limit=<n>` parameters.
- Bulk operations use `POST /v1/.../batch` with array payloads limited to 500 items.

## Consequences

- Slightly higher per-request overhead vs gRPC, acceptable for our volume.
- No built-in bidirectional streaming; eventing is handled separately (see ADR 004).
- All sibling projects generate types from the OpenAPI spec rather than protobuf definitions.