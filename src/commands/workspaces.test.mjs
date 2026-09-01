import assert from "node:assert/strict";
import test from "node:test";

import * as workspaces from "./workspaces.ts";

const workspace = {
  name: "example",
  path: "/tmp/example",
  assigned_persona: "ethos",
  effective_persona: "ethos",
  persona_fallback: false,
};

test("workspace commands mirror the Ethos REST API", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json(workspace);
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const connection = {
    endpoint: "http://localhost:8000/",
    bearerToken: "secret",
  };

  await workspaces.list(connection);
  await workspaces.create(connection, { name: "example", persona: "writer" });
  await workspaces.show(connection, { workspace: "example space" });

  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].url, "http://localhost:8000/workspaces");
  assert.equal(requests[0].headers.get("Authorization"), "Bearer secret");
  assert.equal(requests[0].headers.get("Content-Type"), null);

  assert.equal(requests[1].method, "POST");
  assert.equal(requests[1].url, "http://localhost:8000/workspaces");
  assert.equal(requests[1].headers.get("Content-Type"), "application/json");
  assert.deepEqual(await requests[1].json(), {
    name: "example",
    persona: "writer",
  });

  assert.equal(requests[2].method, "GET");
  assert.equal(
    requests[2].url,
    "http://localhost:8000/workspaces/example%20space",
  );
});
