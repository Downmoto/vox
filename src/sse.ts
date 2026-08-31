type EventContext = {
  workspace: string;
  session_id: string;
};

export type ChatEvent = EventContext &
  (
    | {
        kind: "chunk";
        text: string;
        text_kind: "answer" | "reasoning";
        done: boolean;
      }
    | {
        kind: "tool_output";
        call_id: string;
        tool_name: string;
        stream: string;
        text: string;
      }
    | {
        kind: "approval";
        approval_id: string;
        call_id: string;
        tool_name: string;
        arguments: Record<string, unknown>;
        effect: string;
        reason: string;
      }
  );

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChatEvent(value: unknown): value is ChatEvent {
  if (
    !isRecord(value) ||
    typeof value.workspace !== "string" ||
    typeof value.session_id !== "string"
  ) {
    return false;
  }
  if (value.kind === "chunk") {
    return (
      typeof value.text === "string" &&
      (value.text_kind === "answer" || value.text_kind === "reasoning") &&
      typeof value.done === "boolean"
    );
  }
  if (value.kind === "tool_output") {
    return (
      typeof value.call_id === "string" &&
      typeof value.tool_name === "string" &&
      typeof value.stream === "string" &&
      typeof value.text === "string"
    );
  }
  return (
    value.kind === "approval" &&
    typeof value.approval_id === "string" &&
    typeof value.call_id === "string" &&
    typeof value.tool_name === "string" &&
    isRecord(value.arguments) &&
    typeof value.effect === "string" &&
    typeof value.reason === "string"
  );
}

function parseFrame(frame: string): ChatEvent | undefined {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return;

  const event: unknown = JSON.parse(data);
  if (!isChatEvent(event)) throw new Error("Ethos returned an invalid event");
  return event;
}

export async function* readSse(response: Response): AsyncGenerator<ChatEvent> {
  if (!response.ok) throw new Error(`Ethos returned ${response.status}`);
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
        const event = parseFrame(frame);
        if (event) yield event;
      }
      if (done) {
        complete = true;
        break;
      }
    }

    if (buffer.trim()) {
      const event = parseFrame(buffer);
      if (event) yield event;
    }
  } finally {
    if (!complete) await reader.cancel();
    reader.releaseLock();
  }
}
