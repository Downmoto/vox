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

export function workspaceCommands(connection: Connection) {
  return {
    create(input: CreateWorkspace) {
      return request<Workspace>(connection, "/workspaces", {
        method: "POST",
        body: input,
      });
    },
    list() {
      return request<Workspace[]>(connection, "/workspaces", {
        method: "GET",
      });
    },
    show(workspace: string) {
      return request<Workspace>(
        connection,
        `/workspaces/${encodeURIComponent(workspace)}`,
        { method: "GET" },
      );
    },
  };
}
