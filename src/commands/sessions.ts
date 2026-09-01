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
