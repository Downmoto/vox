/** Global and workspace capability REST commands and wire types. */

import { type Connection, request } from "./request.ts";

export type CapabilityName = "skills" | "file_system" | "shell";

export type SkillsSettings = {
  enabled: boolean;
  max_skill_file_bytes: number;
  max_skills: number;
  max_resource_file_bytes: number;
  max_resources: number;
};

export type FileSystemSettings = {
  enabled: boolean;
  max_read_file_bytes: number;
  max_write_file_bytes: number;
  max_file_entries: number;
  max_search_matches: number;
  max_search_result_bytes: number;
  max_patch_bytes: number;
  max_patch_files: number;
};

export type ShellSettings = {
  enabled: boolean;
  max_command_bytes: number;
  max_command_seconds: number;
  max_output_bytes: number;
};

type GlobalCapability<
  Name extends CapabilityName,
  Settings extends object,
> = {
  name: Name;
  scope: "global";
  workspace: null;
  configured: Settings;
  effective: Settings;
};

export type Capability =
  | GlobalCapability<"skills", SkillsSettings>
  | GlobalCapability<"file_system", FileSystemSettings>
  | GlobalCapability<"shell", ShellSettings>;

/** Workspace writes may use null to remove one configured override. */
type WorkspaceSettings<Settings extends object> = {
  [Field in keyof Settings]?: Settings[Field] | null;
};

type WorkspaceCapabilityView<
  Name extends CapabilityName,
  Settings extends object,
> = {
  name: Name;
  scope: "workspace";
  workspace: string;
  configured: Partial<Settings>;
  effective: Settings;
};

export type WorkspaceCapability =
  | WorkspaceCapabilityView<"skills", SkillsSettings>
  | WorkspaceCapabilityView<"file_system", FileSystemSettings>
  | WorkspaceCapabilityView<"shell", ShellSettings>;

export type ConfigureCapability =
  | { capability: "skills"; settings: Partial<SkillsSettings> }
  | { capability: "file_system"; settings: Partial<FileSystemSettings> }
  | { capability: "shell"; settings: Partial<ShellSettings> };

export type ConfigureWorkspaceCapability =
  | { capability: "skills"; settings: WorkspaceSettings<SkillsSettings> }
  | {
      capability: "file_system";
      settings: WorkspaceSettings<FileSystemSettings>;
    }
  | { capability: "shell"; settings: WorkspaceSettings<ShellSettings> };

export function list(connection: Connection) {
  return request<Capability[]>(connection, "/capabilities", { method: "GET" });
}

export function show(connection: Connection, input: CapabilityName) {
  return request<Capability>(
    connection,
    `/capabilities/${encodeURIComponent(input)}`,
    { method: "GET" },
  );
}

export function configure(connection: Connection, input: ConfigureCapability) {
  return request<Capability>(
    connection,
    `/capabilities/${encodeURIComponent(input.capability)}`,
    { method: "PUT", body: { settings: input.settings } },
  );
}

export function listWorkspace(connection: Connection, workspace: string) {
  return request<WorkspaceCapability[]>(
    connection,
    `/workspaces/${encodeURIComponent(workspace)}/capabilities`,
    { method: "GET" },
  );
}

export function showWorkspace(
  connection: Connection,
  workspace: string,
  capability: CapabilityName,
) {
  return request<WorkspaceCapability>(
    connection,
    `/workspaces/${encodeURIComponent(workspace)}/capabilities/${encodeURIComponent(capability)}`,
    { method: "GET" },
  );
}

export function configureWorkspace(
  connection: Connection,
  workspace: string,
  input: ConfigureWorkspaceCapability,
) {
  return request<WorkspaceCapability>(
    connection,
    `/workspaces/${encodeURIComponent(workspace)}/capabilities/${encodeURIComponent(input.capability)}`,
    { method: "PUT", body: { settings: input.settings } },
  );
}

export function resetWorkspace(
  connection: Connection,
  workspace: string,
  capability: CapabilityName,
) {
  return request<WorkspaceCapability>(
    connection,
    `/workspaces/${encodeURIComponent(workspace)}/capabilities/${encodeURIComponent(capability)}`,
    { method: "DELETE" },
  );
}
