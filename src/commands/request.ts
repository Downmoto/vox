/** Shared HTTP transport for Ethos commands. */

/** Connection details supplied to commands instead of retained globally. */
export type Connection = {
  endpoint: string;
  bearerToken?: string;
};

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: object;
};

type ErrorResponse = {
  detail?: string;
};

async function send(
  connection: Connection,
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const base = `${connection.endpoint.replace(/\/+$/, "")}/`;
  const url = new URL(path.replace(/^\/+/, ""), base);
  const headers = new Headers();

  if (connection.bearerToken) {
    headers.set("Authorization", `Bearer ${connection.bearerToken}`);
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as ErrorResponse;
      if (typeof body.detail === "string") {
        detail = `: ${body.detail}`;
      }
    } catch {
      // The status remains useful when the body is empty or not JSON.
    }
    throw new Error(`Ethos returned ${response.status}${detail}`);
  }

  return response;
}

export async function request<T>(
  connection: Connection,
  path: string,
  options: RequestOptions,
): Promise<T> {
  const response = await send(connection, path, options);

  // Resource modules own the wire types; this boundary trusts Ethos to honour them.
  return response.json() as Promise<T>;
}

function parseFrame<T>(frame: string): T | undefined {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return;
  return JSON.parse(data) as T;
}

export async function* stream<T>(
  connection: Connection,
  path: string,
  options: RequestOptions,
): AsyncGenerator<T> {
  const response = await send(connection, path, options);
  if (!response.body) throw new Error("Ethos returned an empty stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const event = parseFrame<T>(frame);
        if (event !== undefined) yield event;
      }
      if (done) {
        complete = true;
        break;
      }
    }

    if (buffer.trim()) {
      const event = parseFrame<T>(buffer);
      if (event !== undefined) yield event;
    }
  } finally {
    if (!complete) await reader.cancel();
    reader.releaseLock();
  }
}
