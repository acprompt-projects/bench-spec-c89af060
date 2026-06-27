===
const Assert = require("assert");

class Contract {
  constructor(name) {
    this.name = name;
    this.interactions = [];
  }

  uponReceiving(desc) {
    const interaction = { description: desc, providerState: null, request: {}, response: {} };
    this.interactions.push(interaction);
    const b = {
      given(state) { interaction.providerState = state; return b; },
      withRequest(req) { interaction.request = req; return b; },
      willRespondWith(res) { interaction.response = res; return b; },
    };
    return b;
  }

  toJSON() {
    return { provider: this.name, interactions: this.interactions };
  }
}

class ProviderVerifier {
  constructor({ providerBaseUrl, contract }) {
    this.baseUrl = providerBaseUrl;
    this.contract = typeof contract === "string" ? JSON.parse(contract) : contract;
  }

  async verify() {
    const results = [];
    for (const ix of this.contract.interactions) {
      const { request, response, description, providerState } = ix;
      const url = `${this.baseUrl}${request.path || "/"}`;
      const fetchOpts = { method: request.method || "GET", headers: request.headers || {} };
      if (request.body) { fetchOpts.body = JSON.stringify(request.body); fetchOpts.headers["Content-Type"] = "application/json"; }
      let res;
      try { res = await fetch(url, fetchOpts); } catch (e) { results.push({ description, ok: false, error: `fetch failed: ${e.message}` }); continue; }
      const actualStatus = res.status;
      const expectedStatus = response.status || 200;
      if (actualStatus !== expectedStatus) { results.push({ description, ok: false, error: `status ${actualStatus} !== ${expectedStatus}` }); continue; }
      const ct = res.headers.get("content-type") || "";
      let body;
      try { body = ct.includes("json") ? await res.json() : await res.text(); } catch { body = null; }
      const schema = response.schema;
      if (schema) {
        const err = validateSchema(body, schema);
        if (err) { results.push({ description, ok: false, error: `schema: ${err}` }); continue; }
      }
      results.push({ description, ok: true });
    }
    return results;
  }
}

class ConsumerStub {
  constructor(contract) {
    this.contract = typeof contract === "string" ? JSON.parse(contract) : contract;
  }

  mockInteraction(index = 0) {
    const ix = this.contract.interactions[index];
    if (!ix) throw new Error(`No interaction at index ${index}`);
    return { request: ix.request, response: ix.response };
  }

  async request(index = 0) {
    const { request, response } = this.mockInteraction(index);
    return { sent: request, expected: response };
  }
}

function validateSchema(value, schema) {
  if (!schema) return null;
  if (schema.type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) return `expected object, got ${typeof value}`;
  if (schema.type === "array" && !Array.isArray(value)) return `expected array, got ${typeof value}`;
  if (schema.type === "string" && typeof value !== "string") return `expected string, got ${typeof value}`;
  if (schema.type === "number" && typeof value !== "number") return `expected number, got ${typeof value}`;
  if (schema.type === "boolean" && typeof value !== "boolean") return `expected boolean, got ${typeof value}`;
  if (schema.required && schema.type === "object") {
    for (const k of schema.required) { if (!(k in value)) return `missing required key "${k}"`; }
  }
  if (schema.properties && schema.type === "object") {
    for (const [k, sub] of Object.entries(schema.properties)) {
      if (k in value) { const e = validateSchema(value[k], sub); if (e) return `.${k}: ${e}`; }
    }
  }
  if (schema.items && schema.type === "array") {
    for (let i = 0; i < value.length; i++) { const e = validateSchema(value[i], schema.items); if (e) return `[${i}]: ${e}`; }
  }
  return null;
}

module.exports = { Contract, ProviderVerifier, ConsumerStub, validateSchema };
===