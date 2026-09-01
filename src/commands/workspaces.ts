/** Workspace REST commands and their Ethos wire types. */

import { type Connection, request } from "./request.ts";

export type Workspace = {
  name: string;
  path: string;
  assigned_persona: string;
  effective_persona: string;
  persona_fallback: boolean;
};

export type CreateWorkspace = {
  name: string;
  persona?: string | null;
};

export type ShowWorkspace = {
  workspace: string;
};

export function create(connection: Connection, input: CreateWorkspace) {
  return request<Workspace>(connection, "/workspaces", {
    method: "POST",
    body: input,
  });
}

export function list(connection: Connection) {
  return request<Workspace[]>(connection, "/workspaces", { method: "GET" });
}

export function show(connection: Connection, input: ShowWorkspace) {
  return request<Workspace>(
    connection,
    `/workspaces/${encodeURIComponent(input.workspace)}`,
    { method: "GET" },
  );
}
