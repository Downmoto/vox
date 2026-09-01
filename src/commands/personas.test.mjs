import assert from "node:assert/strict";
import test from "node:test";

import * as personas from "./personas.ts";

const persona = {
  id: "writer",
  name: "Writer",
  instructions: "Write clearly.",
  enabled: true,
  workspace: null,
  model_name: null,
  effective_model_name: "model",
  reasoning_effort: null,
  effective_reasoning_effort: "none",
  capabilities: null,
  effective_capabilities: ["skills", "file_system", "shell"],
};

test("persona commands mirror the Ethos REST API", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return Response.json(persona);
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const connection = { endpoint: "http://localhost:8000" };

  await personas.showDefault(connection);
  await personas.configureDefault(connection, { persona: "writer" });
  await personas.create(connection, {
    id: "writer",
    settings: { name: "Writer", instructions: "Write clearly." },
  });
  await personas.list(connection, { workspace: "my workspace" });
  await personas.show(connection, {
    persona: "review writer",
    workspace: "my workspace",
  });
  await personas.configure(connection, {
    persona: "writer",
    settings: { enabled: false },
  });
  const removed = await personas.remove(connection, { persona: "old writer" });
  await personas.showWorkspace(connection, { workspace: "my workspace" });
  await personas.assignWorkspace(connection, {
    workspace: "my workspace",
    persona: "writer",
  });

  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ["GET", "http://localhost:8000/personas/default"],
      ["PUT", "http://localhost:8000/personas/default"],
      ["POST", "http://localhost:8000/personas"],
      ["GET", "http://localhost:8000/personas?workspace=my+workspace"],
      [
        "GET",
        "http://localhost:8000/personas/review%20writer?workspace=my+workspace",
      ],
      ["PUT", "http://localhost:8000/personas/writer"],
      ["DELETE", "http://localhost:8000/personas/old%20writer"],
      ["GET", "http://localhost:8000/workspaces/my%20workspace/persona"],
      ["PUT", "http://localhost:8000/workspaces/my%20workspace/persona"],
    ],
  );

  assert.deepEqual(await requests[1].json(), { persona: "writer" });
  assert.deepEqual(await requests[2].json(), {
    id: "writer",
    settings: { name: "Writer", instructions: "Write clearly." },
  });
  assert.deepEqual(await requests[5].json(), {
    settings: { enabled: false },
  });
  assert.deepEqual(await requests[8].json(), { persona: "writer" });
  assert.deepEqual(removed, persona);
});
