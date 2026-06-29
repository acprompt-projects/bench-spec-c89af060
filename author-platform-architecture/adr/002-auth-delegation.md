# ADR 002: Auth Delegation — Bearer Token with Scope-Based Claims

## Status

Accepted

## Context

prompt-bench (execution engine), prompt-viz (dashboard), and potential third-party consumers all need authenticated access to benchmark APIs. We need a model that allows each service to verify requests independently without coupling to a central session store, while supporting fine-grained access control separate from identity.

## Decision

We adopt **delegated authentication via opaque bearer tokens** issued by a trusted identity provider (IdP), with **scope-based authorization claims** embedded in the token's verifiable metadata (e.g., JWT or token introspection response).

### Token Flow

1. Client authenticates with the IdP and receives an access token.
2. Client sends `Authorization: Bearer <token>` on every request.
3. Resource server (prompt-bench API) validates the token via IdP introspection or local JWT verification.
4. Scopes in the token (e.g., `bench:read`, `bench:write`, `bench:admin`) determine authorized operations.

### Scope Definitions

| Scope | Allows |
|---|---|
| `bench:read` | GET configs, results, runs |
| `bench:write` | POST/PUT/PATCH configs, submit runs |
| `bench:admin` | DELETE resources, manage API keys |
| `viz:read` | Read aggregated metrics for dashboards |

### Rules

- Services MUST NOT issue their own tokens; all issuance is delegated to the IdP.
- Services MUST validate tokens on every request; no implicit trust between services.
- Token expiry MUST be ≤ 1 hour; refresh tokens handle renewal.
- Service-to-service calls use machine-to-machine client credentials grant with scoped tokens.

## Consequences

- Each service is stateless regarding auth; no shared session store required.
- Scope additions are backward-compatible (existing tokens without new scopes simply lack access).
- Requires an IdP (e.g., Auth0, Keycloak) as infrastructure dependency.
- Token introspection adds latency; cache introspection results for the token's TTL.