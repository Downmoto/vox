import assert from "node:assert/strict";
import test from "node:test";

import { createCommands } from "./index.ts";

const configuredProvider = {
  name: "openai",
  model_name: "model",
  reasoning_effort: "none",
  ollama_base_url: null,
  credential_configured: true,
};

test("provider commands mirror the Ethos REST API", async (context) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json(configuredProvider);
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const connection = { endpoint: "http://localhost:8000" };
  const provider = createCommands(connection).provider;

  await provider.show();
  await provider.check({ api_key: "secret" });
  await provider.configure({
    name: "ollama",
    ollama_base_url: "http://localhost:11434",
  });

  assert.deepEqual(
    requests.map(({ method, url }) => [method, url]),
    [
      ["GET", "http://localhost:8000/provider"],
      ["POST", "http://localhost:8000/provider/check"],
      ["PUT", "http://localhost:8000/provider"],
    ],
  );
  assert.deepEqual(await requests[1].json(), {
    settings: { api_key: "secret" },
  });
  assert.deepEqual(await requests[2].json(), {
    settings: { name: "ollama", ollama_base_url: "http://localhost:11434" },
  });
});
