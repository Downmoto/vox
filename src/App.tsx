import { useEffect, useState } from "react";
import "./App.css";

type Workspace = {
  name: string;
  path: string;
};

function isWorkspace(value: unknown): value is Workspace {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "path" in value &&
    typeof value.path === "string"
  );
}

function App() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadWorkspaces() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error(`Ethos returned ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isWorkspace)) {
        throw new Error("Ethos returned invalid workspace data");
      }

      const nextWorkspaces = data;
      setWorkspaces(nextWorkspaces);
      setSelected((current) =>
        nextWorkspaces.some(({ name }) => name === current)
          ? current
          : (nextWorkspaces[0]?.name ?? ""),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach Ethos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  return (
    <main>
      <h1>Vox</h1>
      <p className={error ? "status error" : "status"} role="status">
        {loading ? "Connecting to Ethos…" : error || "Connected to Ethos"}
      </p>

      <label htmlFor="workspace">Workspace</label>
      <div className="controls">
        <select
          id="workspace"
          value={selected}
          onChange={(event) => setSelected(event.currentTarget.value)}
          disabled={loading || workspaces.length === 0}
        >
          {workspaces.length === 0 && <option value="">No workspaces</option>}
          {workspaces.map((workspace) => (
            <option key={workspace.name} value={workspace.name}>
              {workspace.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={loadWorkspaces} disabled={loading}>
          Reload
        </button>
      </div>

      {selected && (
        <p className="path">
          {workspaces.find(({ name }) => name === selected)?.path}
        </p>
      )}
    </main>
  );
}

export default App;
