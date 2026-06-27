===
const { Contract, ProviderVerifier, ConsumerStub, validateSchema } = require("../src/contract-test");
const Assert = require("assert");

const BENCH_SPEC_SCHEMA = {
  type: "object",
  required: ["id", "name", "prompts", "metrics"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    version: { type: "string" },
    prompts: { type: "array", items: { type: "object", required: ["text"], properties: { text: { type: "string" }, vars: { type: "object" } } } },
    metrics: { type: "array", items: { type: "object", required: ["name"], properties: { name: { type: "string" }, weight: { type: "number" } } } },
    metadata: { type: "object" },
  },
};

function buildSampleContract() {
  const c = new Contract("prompt-bench");
  c.uponReceiving("a request for a benchmark config")
    .given("benchmark 'latency-v1' exists")
    .withRequest({ method: "GET", path: "/benchmarks/latency-v1", headers: { Accept: "application/json" } })
    .willRespondWith({ status: 200, schema: BENCH_SPEC_SCHEMA });
  c.uponReceiving("a request for a non-existent benchmark")
    .given("benchmark 'missing' does not exist")
    .withRequest({ method: "GET", path: "/benchmarks/missing" })
    .willRespondWith({ status: 404, schema: { type: "object", required: ["error"], properties: { error: { type: "string" } } } });
  return c;
}

async function main() {
  console.log("=== Contract Test Suite ===\n");

  console.log("1. Contract creation");
  const contract = buildSampleContract();
  const json = contract.toJSON();
  Assert.strictEqual(json.provider, "prompt-bench");
  Assert.strictEqual(json.interactions.length, 2);
  Assert.strictEqual(json.interactions[0].description, "a request for a benchmark config");
  console.log("   PASS: contract built with 2 interactions\n");

  console.log("2. Schema validation (positive)");
  const validBody = { id: "latency-v1", name: "Latency Benchmark", prompts: [{ text: "Hello" }], metrics: [{ name: "p95", weight: 1.0 }] };
  Assert.strictEqual(validateSchema(validBody, BENCH_SPEC_SCHEMA), null);
  console.log("   PASS: valid body passes schema\n");

  console.log("3. Schema validation (negative - missing required)");
  const invalidBody = { id: "x", name: "y" };
  const err = validateSchema(invalidBody, BENCH_SPEC_SCHEMA);
  Assert.ok(err.includes("prompts"), `expected 'prompts' in error, got: ${err}`);
  console.log("   PASS: missing required field caught:", err, "\n");

  console.log("4. Consumer stub");
  const stub = new ConsumerStub(json);
  const mock0 = stub.mockInteraction(0);
  Assert.strictEqual(mock0.request.method, "GET");
  Assert.strictEqual(mock0.response.status, 200);
  console.log("   PASS: consumer stub returns correct mock\n");

  console.log("5. Provider verifier against mock server (unit-level)");
  const { createServer } = require("http");
  const handler = (req, res) => {
    if (req.url === "/benchmarks/latency-v1") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(validBody));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    }
  };
  const server = createServer(handler);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const verifier = new ProviderVerifier({ providerBaseUrl: `http://127.0.0.1:${port}`, contract: json });
  const results = await verifier.verify();
  server.close();
  for (const r of results) { Assert.ok(r.ok, `FAIL: ${r.description} - ${r.error}`); }
  console.log("   PASS: all provider interactions verified\n");

  console.log("=== All tests passed ===");
}

main().catch(e => { console.error(e); process.exit(1); });
===