import assert from "node:assert/strict";
import test from "node:test";

import * as capabilities from "./capabilities.ts";

const skills = {
  name: "skills",
  scope: "global",
  workspace: null,
  configured: {
    enabled: true,
    max_skill_file_bytes: 102400,
    max_skills: 200,
    max_resource_file_bytes: 102400,
    max_resources: 200,
  },
  effective: {
    enabled: true,
    max_skill_file_bytes: 102400,
    max_skills: 200,
    max_resource_file_bytes: 102400,
    max_resources: 200,
  },
};

test("global capability commands mirror the Ethos REST API", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json(skills);
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const connection = { endpoint: "http://localhost:8000" };

  await capabilities.list(connection);
  await capabilities.show(connection, "skills");
  await capabilities.configure(connection, {
    capability: "skills",
    settings: { max_skills: 100 },
  });

  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ["GET", "http://localhost:8000/capabilities"],
      ["GET", "http://localhost:8000/capabilities/skills"],
      ["PUT", "http://localhost:8000/capabilities/skills"],
    ],
  );
  assert.deepEqual(await requests[2].json(), {
    settings: { max_skills: 100 },
  });
});
