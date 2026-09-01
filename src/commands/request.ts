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

export async function request<T>(
  connection: Connection,
  path: string,
  options: RequestOptions,
): Promise<T> {
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

  return response.json() as Promise<T>;
}
