import { type FormEvent, useEffect, useState } from "react";
import "./App.css";
import { readSse, type ChatEvent } from "./sse";

type Workspace = {
  name: string;
  path: string;
};

type Session = {
  id: string;
  message_count: number;
};

type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "reasoning"; text: string }
  | { kind: "tool_call"; call_id: string; name: string; arguments_json: string }
  | {
      kind: "tool_result";
      call_id: string;
      name: string;
      content: string;
      is_error: boolean;
    };

type Message = {
  role: "system" | "user" | "assistant" | "tool";
  parts: MessagePart[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWorkspace(value: unknown): value is Workspace {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.path === "string"
  );
}

function isSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.message_count === "number"
  );
}

function isMessagePart(value: unknown): value is MessagePart {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "text" || value.kind === "reasoning") {
    return typeof value.text === "string";
  }
  if (value.kind === "tool_call") {
    return (
      typeof value.call_id === "string" &&
      typeof value.name === "string" &&
      typeof value.arguments_json === "string"
    );
  }
  return (
    value.kind === "tool_result" &&
    typeof value.call_id === "string" &&
    typeof value.name === "string" &&
    typeof value.content === "string" &&
    typeof value.is_error === "boolean"
  );
}

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    ["system", "user", "assistant", "tool"].includes(String(value.role)) &&
    Array.isArray(value.parts) &&
    value.parts.every(isMessagePart)
  );
}

function MessagePartView({ part }: { part: MessagePart }) {
  if (part.kind === "text") return <p>{part.text}</p>;
  if (part.kind === "reasoning") {
    return <p className="reasoning">{part.text}</p>;
  }
  if (part.kind === "tool_call") {
    return <pre>{`${part.name} ${part.arguments_json}`}</pre>;
  }
  return (
    <pre className={part.is_error ? "tool-error" : ""}>
      {`${part.name}: ${part.content}`}
    </pre>
  );
}

function StreamEventView({
  event,
  disabled,
  onResolve,
}: {
  event: ChatEvent;
  disabled: boolean;
  onResolve: (
    approvalId: string,
    decision: "approve" | "deny",
  ) => Promise<void>;
}) {
  if (event.kind === "chunk") {
    return event.text ? (
      <span className={event.text_kind}>{event.text}</span>
    ) : null;
  }
  if (event.kind === "tool_output") {
    return (
      <pre>{`${event.tool_name} (${event.stream}): ${event.text}`}</pre>
    );
  }
  return (
    <div className="approval">
      <strong>Approval required: {event.tool_name}</strong>
      <p>{event.reason}</p>
      <pre>{JSON.stringify(event.arguments, null, 2)}</pre>
      <div className="controls">
        <button
          type="button"
          onClick={() => void onResolve(event.approval_id, "approve")}
          disabled={disabled}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => void onResolve(event.approval_id, "deny")}
          disabled={disabled}
        >
          Deny
        </button>
      </div>
    </div>
  );
}

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [streamEvents, setStreamEvents] = useState<ChatEvent[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [chatError, setChatError] = useState("");

  async function loadWorkspaces() {
    setWorkspaceLoading(true);
    setWorkspaceError("");

    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error(`Ethos returned ${response.status}`);

      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isWorkspace)) {
        throw new Error("Ethos returned invalid workspace data");
      }

      setWorkspaces(data);
      setSelectedWorkspace((current) =>
        data.some(({ name }) => name === current)
          ? current
          : (data[0]?.name ?? ""),
      );
    } catch (cause) {
      setWorkspaceError(
        cause instanceof Error ? cause.message : "Could not reach Ethos",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  useEffect(() => {
    if (!selectedWorkspace) {
      setSessions([]);
      setSelectedSession("");
      setSessionLoading(false);
      return;
    }

    const controller = new AbortController();
    async function loadSessions() {
      setSessions([]);
      setSelectedSession("");
      setSessionLoading(true);
      setSessionError("");
      try {
        const workspace = encodeURIComponent(selectedWorkspace);
        const response = await fetch(`/api/workspaces/${workspace}/sessions`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Ethos returned ${response.status}`);

        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.every(isSession)) {
          throw new Error("Ethos returned invalid session data");
        }

        setSessions(data);
        setSelectedSession((current) =>
          data.some(({ id }) => id === current)
            ? current
            : (data[0]?.id ?? ""),
        );
      } catch (cause) {
        if (!controller.signal.aborted) {
          setSessionError(
            cause instanceof Error ? cause.message : "Could not load sessions",
          );
        }
      } finally {
        if (!controller.signal.aborted) setSessionLoading(false);
      }
    }

    void loadSessions();
    return () => controller.abort();
  }, [selectedWorkspace]);

  async function loadHistory(signal?: AbortSignal) {
    if (!selectedWorkspace || !selectedSession) return false;

    setHistoryLoading(true);
    setSessionError("");
    try {
      const workspace = encodeURIComponent(selectedWorkspace);
      const session = encodeURIComponent(selectedSession);
      const response = await fetch(
        `/api/workspaces/${workspace}/sessions/${session}/history`,
        { signal },
      );
      if (!response.ok) throw new Error(`Ethos returned ${response.status}`);

      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isMessage)) {
        throw new Error("Ethos returned invalid session history");
      }
      setMessages(data);
      setSessions((current) =>
        current.map((sessionItem) =>
          sessionItem.id === selectedSession
            ? { ...sessionItem, message_count: data.length }
            : sessionItem,
        ),
      );
      return true;
    } catch (cause) {
      if (!signal?.aborted) {
        setSessionError(
          cause instanceof Error ? cause.message : "Could not load history",
        );
      }
      return false;
    } finally {
      if (!signal?.aborted) setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedWorkspace || !selectedSession) {
      setMessages([]);
      setStreamEvents([]);
      setHistoryLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, [selectedWorkspace, selectedSession]);

  async function createSession() {
    setSessionLoading(true);
    setSessionError("");
    try {
      const workspace = encodeURIComponent(selectedWorkspace);
      const response = await fetch(`/api/workspaces/${workspace}/sessions`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Ethos returned ${response.status}`);

      const data: unknown = await response.json();
      if (!isSession(data)) throw new Error("Ethos returned invalid session data");

      setSessions((current) => [data, ...current]);
      setSelectedSession(data.id);
    } catch (cause) {
      setSessionError(
        cause instanceof Error ? cause.message : "Could not create session",
      );
    } finally {
      setSessionLoading(false);
    }
  }

  async function consume(response: Response) {
    let paused = false;
    for await (const event of readSse(response)) {
      if (
        event.workspace !== selectedWorkspace ||
        event.session_id !== selectedSession
      ) {
        throw new Error("Ethos returned an event for another session");
      }
      if (event.kind === "approval") paused = true;
      setStreamEvents((current) => [...current, event]);
    }
    return paused;
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = prompt.trim();
    if (!submitted || streaming) return;

    setStreaming(true);
    setChatError("");
    setStreamEvents([]);
    setPrompt("");
    setMessages((current) => [
      ...current,
      { role: "user", parts: [{ kind: "text", text: submitted }] },
    ]);

    let accepted = false;
    try {
      const workspace = encodeURIComponent(selectedWorkspace);
      const session = encodeURIComponent(selectedSession);
      const response = await fetch(
        `/api/workspaces/${workspace}/sessions/${session}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: submitted }),
        },
      );
      if (!response.ok) throw new Error(`Ethos returned ${response.status}`);
      accepted = true;
      const paused = await consume(response);
      const refreshed = await loadHistory();
      setStreamEvents((current) =>
        paused
          ? current.filter(({ kind }) => kind !== "chunk")
          : refreshed
            ? []
            : current,
      );
    } catch (cause) {
      if (!accepted) setPrompt(submitted);
      setChatError(
        cause instanceof Error ? cause.message : "Could not send message",
      );
      await loadHistory();
    } finally {
      setStreaming(false);
    }
  }

  async function resolveApproval(
    approvalId: string,
    decision: "approve" | "deny",
  ) {
    setStreaming(true);
    setChatError("");
    try {
      const workspace = encodeURIComponent(selectedWorkspace);
      const session = encodeURIComponent(selectedSession);
      const approval = encodeURIComponent(approvalId);
      const response = await fetch(
        `/api/workspaces/${workspace}/sessions/${session}/approvals/${approval}/${decision}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error(`Ethos returned ${response.status}`);
      const paused = await consume(response);
      const refreshed = await loadHistory();
      setStreamEvents((current) => {
        const remaining = current.filter(
          (event) =>
            event.kind !== "approval" || event.approval_id !== approvalId,
        );
        return paused
          ? remaining.filter(({ kind }) => kind !== "chunk")
          : refreshed
            ? []
            : remaining;
      });
    } catch (cause) {
      setChatError(
        cause instanceof Error ? cause.message : "Could not resolve approval",
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main>
      <h1>Vox</h1>
      <p
        className={workspaceError ? "status error" : "status"}
        role="status"
      >
        {workspaceLoading
          ? "Connecting to Ethos…"
          : workspaceError || "Connected to Ethos"}
      </p>

      <label htmlFor="workspace">Workspace</label>
      <div className="controls">
        <select
          id="workspace"
          value={selectedWorkspace}
          onChange={(event) => {
            setSelectedSession("");
            setSelectedWorkspace(event.currentTarget.value);
          }}
          disabled={workspaceLoading || streaming || workspaces.length === 0}
        >
          {workspaces.length === 0 && <option value="">No workspaces</option>}
          {workspaces.map((workspace) => (
            <option key={workspace.name} value={workspace.name}>
              {workspace.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadWorkspaces}
          disabled={workspaceLoading || streaming}
        >
          Reload
        </button>
      </div>

      {selectedWorkspace && (
        <p className="path">
          {
            workspaces.find(({ name }) => name === selectedWorkspace)?.path
          }
        </p>
      )}

      {selectedWorkspace && (
        <section>
          <label htmlFor="session">Session</label>
          <div className="controls">
            <select
              id="session"
              value={selectedSession}
              onChange={(event) => setSelectedSession(event.currentTarget.value)}
              disabled={sessionLoading || streaming || sessions.length === 0}
            >
              {sessions.length === 0 && <option value="">No sessions</option>}
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.id.slice(0, 8)} · {session.message_count} messages
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={createSession}
              disabled={sessionLoading || streaming}
            >
              New
            </button>
          </div>
          {sessionError && (
            <p className="error" role="alert">
              {sessionError}
            </p>
          )}
        </section>
      )}

      {selectedSession && (
        <section className="history" aria-busy={historyLoading}>
          <div className="history-heading">
            <h2>History</h2>
            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={historyLoading || streaming}
            >
              Reload history
            </button>
          </div>
          {historyLoading && <p>Loading…</p>}
          {!historyLoading &&
            messages.length === 0 &&
            streamEvents.length === 0 && <p>No messages yet.</p>}
          {messages.map((message, messageIndex) => (
            <article className={`message ${message.role}`} key={messageIndex}>
              <strong>{message.role}</strong>
              {message.parts.map((part, partIndex) => (
                <MessagePartView part={part} key={partIndex} />
              ))}
            </article>
          ))}
          {streamEvents.length > 0 && (
            <article className="message assistant live" aria-live="polite">
              <strong>assistant</strong>
              <div className="stream">
                {streamEvents.map((event, index) => (
                  <StreamEventView
                    event={event}
                    disabled={streaming}
                    onResolve={resolveApproval}
                    key={index}
                  />
                ))}
              </div>
            </article>
          )}

          <form className="composer" onSubmit={sendMessage}>
            <label htmlFor="prompt">Message</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              disabled={streaming}
              rows={3}
            />
            <button type="submit" disabled={streaming || !prompt.trim()}>
              {streaming ? "Sending…" : "Send"}
            </button>
          </form>
          {chatError && (
            <p className="error" role="alert">
              {chatError}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
