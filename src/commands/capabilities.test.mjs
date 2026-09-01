import assert from "node:assert/strict";
import test from "node:test";

import { createCommands } from "./index.ts";

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
  const capabilities = createCommands(connection).capabilities;

  await capabilities.list();
  await capabilities.show("skills");
  await capabilities.configure({
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

test("workspace capability commands mirror the Ethos REST API", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json({
      ...skills,
      scope: "workspace",
      workspace: "my workspace",
      configured: { max_skills: 100 },
    });
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const connection = { endpoint: "http://localhost:8000" };
  const capabilities = createCommands(connection).capabilities;

  await capabilities.listWorkspace("my workspace");
  await capabilities.showWorkspace("my workspace", "skills");
  await capabilities.configureWorkspace("my workspace", {
    capability: "skills",
    settings: { max_skills: 100 },
  });
  await capabilities.resetWorkspace("my workspace", "skills");

  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ["GET", "http://localhost:8000/workspaces/my%20workspace/capabilities"],
      [
        "GET",
        "http://localhost:8000/workspaces/my%20workspace/capabilities/skills",
      ],
      [
        "PUT",
        "http://localhost:8000/workspaces/my%20workspace/capabilities/skills",
      ],
      [
        "DELETE",
        "http://localhost:8000/workspaces/my%20workspace/capabilities/skills",
      ],
    ],
  );
  assert.deepEqual(await requests[2].json(), {
    settings: { max_skills: 100 },
  });
});
