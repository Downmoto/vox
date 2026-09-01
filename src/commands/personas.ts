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

function workspaceQuery(workspace: string | undefined) {
  if (workspace === undefined) return "";
  return `?${new URLSearchParams({ workspace })}`;
}

export function personaCommands(connection: Connection) {
  return {
    showDefault() {
      return request<Persona>(connection, "/personas/default", {
        method: "GET",
      });
    },
    configureDefault(persona: string) {
      return request<Persona>(connection, "/personas/default", {
        method: "PUT",
        body: { persona },
      });
    },
    create(input: CreatePersona) {
      return request<Persona>(connection, "/personas", {
        method: "POST",
        body: input,
      });
    },
    list(workspace?: string) {
      return request<Persona[]>(
        connection,
        `/personas${workspaceQuery(workspace)}`,
        { method: "GET" },
      );
    },
    show(persona: string, workspace?: string) {
      return request<Persona>(
        connection,
        `/personas/${encodeURIComponent(persona)}${workspaceQuery(workspace)}`,
        { method: "GET" },
      );
    },
    configure(persona: string, settings: PersonaSettings) {
      return request<Persona>(
        connection,
        `/personas/${encodeURIComponent(persona)}`,
        { method: "PUT", body: { settings } },
      );
    },
    remove(persona: string) {
      return request<Persona>(
        connection,
        `/personas/${encodeURIComponent(persona)}`,
        { method: "DELETE" },
      );
    },
    showWorkspace(workspace: string) {
      return request<PersonaAssignment>(
        connection,
        `/workspaces/${encodeURIComponent(workspace)}/persona`,
        { method: "GET" },
      );
    },
    assignWorkspace(workspace: string, persona: string) {
      return request<PersonaAssignment>(
        connection,
        `/workspaces/${encodeURIComponent(workspace)}/persona`,
        { method: "PUT", body: { persona } },
      );
    },
  };
}
