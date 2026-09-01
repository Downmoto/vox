import assert from "node:assert/strict";
import test from "node:test";

import * as messages from "./messages.ts";

const events = [
  {
    kind: "chunk",
    text: "Hello",
    text_kind: "answer",
    usage: null,
    done: false,
    workspace: "my workspace",
    session_id: "session/id",
  },
  {
    kind: "approval",
    approval_id: "approval/id",
    call_id: "call/id",
    tool_name: "write_file",
    arguments: { path: "notes.txt" },
    effect: "write",
    reason: "Writes a file",
    created_at: "2026-09-01T12:00:00Z",
    workspace: "my workspace",
    session_id: "session/id",
  },
];

test("message command mirrors the Ethos SSE endpoint", async (context) => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (input, init) => {
    request = new Request(input, init);
    const encoded = new TextEncoder().encode(
      events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    );
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoded.slice(0, 17));
          controller.enqueue(encoded.slice(17));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const received = [];
  for await (const event of messages.send(
    { endpoint: "http://localhost:8000" },
    "my workspace",
    "session/id",
    "Say hello",
  )) {
    received.push(event);
  }

  assert.equal(request.method, "POST");
  assert.equal(
    request.url,
    "http://localhost:8000/workspaces/my%20workspace/sessions/session%2Fid/messages",
  );
  assert.equal(request.headers.get("Content-Type"), "application/json");
  assert.deepEqual(await request.json(), { prompt: "Say hello" });
  assert.deepEqual(received, events);
});
