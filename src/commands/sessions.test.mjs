import assert from "node:assert/strict";
import test from "node:test";

import { createCommands } from "./index.ts";

const session = {
  id: "session/id",
  workspace: "my workspace",
  created_at: "2026-09-01T12:00:00Z",
  archived_at: null,
  archived: false,
  message_count: 0,
  assigned_persona: "ethos",
  effective_persona: "ethos",
  persona_fallback: false,
};

test("session lifecycle commands mirror the Ethos REST API", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json(session);
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const connection = { endpoint: "http://localhost:8000" };
  const sessions = createCommands(connection).sessions;

  await sessions.create("my workspace");
  await sessions.list("my workspace");
  await sessions.show("my workspace", "session/id");
  await sessions.archive("my workspace", "session/id");
  await sessions.recover("my workspace", "session/id");

  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ["POST", "http://localhost:8000/workspaces/my%20workspace/sessions"],
      ["GET", "http://localhost:8000/workspaces/my%20workspace/sessions"],
      [
        "GET",
        "http://localhost:8000/workspaces/my%20workspace/sessions/session%2Fid",
      ],
      [
        "POST",
        "http://localhost:8000/workspaces/my%20workspace/sessions/session%2Fid/archive",
      ],
      [
        "POST",
        "http://localhost:8000/workspaces/my%20workspace/sessions/session%2Fid/recover",
      ],
    ],
  );
});

test("session history mirrors the Ethos REST API", async (context) => {
  const originalFetch = globalThis.fetch;
  const messages = [
    { role: "user", parts: [{ kind: "text", text: "Hello" }] },
    {
      role: "assistant",
      parts: [
        { kind: "reasoning", text: "Think" },
        { kind: "text", text: "Hi" },
      ],
    },
  ];
  let request;
  globalThis.fetch = async (input, init) => {
    request = new Request(input, init);
    return Response.json(messages);
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const sessions = createCommands({
    endpoint: "http://localhost:8000",
  }).sessions;
  const history = await sessions.history("my workspace", "session/id");

  assert.equal(request.method, "GET");
  assert.equal(
    request.url,
    "http://localhost:8000/workspaces/my%20workspace/sessions/session%2Fid/history",
  );
  assert.deepEqual(history, messages);
});
