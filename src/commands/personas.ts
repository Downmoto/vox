/** Persona and workspace-assignment REST commands and wire types. */

import type { CapabilityName } from "./capabilities.ts";
import type { ReasoningEffort } from "./provider.ts";
import { type Connection, request } from "./request.ts";

export type Persona = {
  id: string;
  name: string;
  instructions: string;
  enabled: boolean;
  workspace: string | null;
  model_name: string | null;
  effective_model_name: string | null;
  reasoning_effort: ReasoningEffort | null;
  effective_reasoning_effort: ReasoningEffort | null;
  capabilities: CapabilityName[] | null;
  effective_capabilities: CapabilityName[];
};

export type PersonaAssignment = {
  workspace: string;
  assigned_persona: string;
  effective_persona: string;
  fallback: boolean;
};

/** Sparse settings accepted when an existing persona is configured. */
export type PersonaSettings = {
  name?: string;
  instructions?: string;
  enabled?: boolean;
  model_name?: string | null;
  reasoning_effort?: ReasoningEffort | null;
  capabilities?: CapabilityName[] | null;
};

export type CreatePersona = {
  id: string;
  settings: PersonaSettings & {
    name: string;
    instructions: string;
  };
};

export type ListPersonas = {
  workspace?: string;
};

export type ShowPersona = {
  persona: string;
  workspace?: string;
};

export type ConfigurePersona = {
  persona: string;
  settings: PersonaSettings;
};

export type PersonaId = {
  persona: string;
};

export type WorkspacePersona = {
  workspace: string;
};

export type AssignWorkspacePersona = WorkspacePersona & PersonaId;

function workspaceQuery(workspace: string | undefined) {
  if (workspace === undefined) return "";
  return `?${new URLSearchParams({ workspace })}`;
}

export function showDefault(connection: Connection) {
  return request<Persona>(connection, "/personas/default", { method: "GET" });
}

export function configureDefault(connection: Connection, input: PersonaId) {
  return request<Persona>(connection, "/personas/default", {
    method: "PUT",
    body: input,
  });
}

export function create(connection: Connection, input: CreatePersona) {
  return request<Persona>(connection, "/personas", {
    method: "POST",
    body: input,
  });
}

export function list(connection: Connection, input: ListPersonas) {
  return request<Persona[]>(
    connection,
    `/personas${workspaceQuery(input.workspace)}`,
    { method: "GET" },
  );
}

export function show(connection: Connection, input: ShowPersona) {
  return request<Persona>(
    connection,
    `/personas/${encodeURIComponent(input.persona)}${workspaceQuery(input.workspace)}`,
    { method: "GET" },
  );
}

export function configure(connection: Connection, input: ConfigurePersona) {
  return request<Persona>(
    connection,
    `/personas/${encodeURIComponent(input.persona)}`,
    { method: "PUT", body: { settings: input.settings } },
  );
}

export function remove(connection: Connection, input: PersonaId) {
  return request<Persona>(
    connection,
    `/personas/${encodeURIComponent(input.persona)}`,
    { method: "DELETE" },
  );
}

export function showWorkspace(connection: Connection, input: WorkspacePersona) {
  return request<PersonaAssignment>(
    connection,
    `/workspaces/${encodeURIComponent(input.workspace)}/persona`,
    { method: "GET" },
  );
}

export function assignWorkspace(
  connection: Connection,
  input: AssignWorkspacePersona,
) {
  return request<PersonaAssignment>(
    connection,
    `/workspaces/${encodeURIComponent(input.workspace)}/persona`,
    { method: "PUT", body: { persona: input.persona } },
  );
}
