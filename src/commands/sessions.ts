/** Session lifecycle and history REST commands and wire types. */

import { type Connection, request } from "./request.ts";

export type Session = {
  id: string;
  workspace: string;
  created_at: string;
  archived_at: string | null;
  archived: boolean;
  message_count: number;
  assigned_persona: string;
  effective_persona: string;
  persona_fallback: boolean;
};

export type TextPart = {
  kind: "text";
  text: string;
};

export type ReasoningPart = {
  kind: "reasoning";
  text: string;
};

export type ToolCallPart = {
  kind: "tool_call";
  call_id: string;
  name: string;
  arguments_json: string;
};

export type ToolResultPart = {
  kind: "tool_result";
  call_id: string;
  name: string;
  content: string;
  is_error: boolean;
};

type NonEmpty<Part> = [Part, ...Part[]];

/**
 * Canonical history messages preserve Ethos's permitted role/part pairings.
 * Tool messages contain exactly one result; every other message is non-empty.
 */
export type Message =
  | { role: "system" | "user"; parts: NonEmpty<TextPart> }
  | {
      role: "assistant";
      parts: NonEmpty<TextPart | ReasoningPart | ToolCallPart>;
    }
  | { role: "tool"; parts: [ToolResultPart] };

function sessionPath(workspace: string, sessionId?: string) {
  const sessions = `/workspaces/${encodeURIComponent(workspace)}/sessions`;
  return sessionId === undefined
    ? sessions
    : `${sessions}/${encodeURIComponent(sessionId)}`;
}

export function create(connection: Connection, workspace: string) {
  return request<Session>(connection, sessionPath(workspace), {
    method: "POST",
  });
}

export function list(connection: Connection, workspace: string) {
  return request<Session[]>(connection, sessionPath(workspace), {
    method: "GET",
  });
}

export function show(
  connection: Connection,
  workspace: string,
  sessionId: string,
) {
  return request<Session>(connection, sessionPath(workspace, sessionId), {
    method: "GET",
  });
}

export function history(
  connection: Connection,
  workspace: string,
  sessionId: string,
) {
  return request<Message[]>(
    connection,
    `${sessionPath(workspace, sessionId)}/history`,
    { method: "GET" },
  );
}

export function archive(
  connection: Connection,
  workspace: string,
  sessionId: string,
) {
  return request<Session>(
    connection,
    `${sessionPath(workspace, sessionId)}/archive`,
    { method: "POST" },
  );
}

export function recover(
  connection: Connection,
  workspace: string,
  sessionId: string,
) {
  return request<Session>(
    connection,
    `${sessionPath(workspace, sessionId)}/recover`,
    { method: "POST" },
  );
}
