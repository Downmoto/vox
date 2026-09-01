/** Streaming message command and event wire types. */

import { type Connection, stream } from "./request.ts";

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  reasoning_tokens_estimated: boolean;
};

type EventContext = {
  workspace: string;
  session_id: string;
};

export type MessageChunk = EventContext & {
  kind: "chunk";
  text: string;
  text_kind: "answer" | "reasoning";
  usage: Usage | null;
  done: boolean;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Approval = EventContext & {
  kind: "approval";
  approval_id: string;
  call_id: string;
  tool_name: string;
  arguments: { [key: string]: JsonValue };
  effect: "read" | "write";
  reason: string;
  created_at: string;
};

export type ToolOutput = EventContext & {
  kind: "tool_output";
  call_id: string;
  tool_name: string;
  stream: "stdout" | "stderr";
  text: string;
};

export type MessageEvent = MessageChunk | Approval | ToolOutput;

export function send(
  connection: Connection,
  workspace: string,
  sessionId: string,
  prompt: string,
) {
  return stream<MessageEvent>(
    connection,
    `/workspaces/${encodeURIComponent(workspace)}/sessions/${encodeURIComponent(sessionId)}/messages`,
    { method: "POST", body: { prompt } },
  );
}
