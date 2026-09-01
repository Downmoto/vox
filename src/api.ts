export type Connection = {
  endpoint: string;
  token: string;
};

export function normaliseEndpoint(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Ethos endpoint must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Ethos endpoint must not contain credentials, a query, or a fragment");
  }
  return url.toString().replace(/\/$/, "");
}

export function apiFetch(
  connection: Connection,
  path: string,
  init: RequestInit = {},
) {
  const base = `${connection.endpoint.replace(/\/+$/, "")}/`;
  const url = new URL(path.replace(/^\/+/, ""), base);
  const headers = new Headers(init.headers);
  if (connection.token) {
    headers.set("Authorization", `Bearer ${connection.token}`);
  }
  return fetch(url, { ...init, headers });
}

export async function responseError(response: Response) {
  let detail = "";
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
    ) {
      detail = `: ${body.detail}`;
    }
  } catch {
    // The status remains useful when the error body is empty or not JSON.
  }
  return new Error(`Ethos returned ${response.status}${detail}`);
}
