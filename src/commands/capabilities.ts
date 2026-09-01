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

export type ConfigureCapability =
  | { capability: "skills"; settings: Partial<SkillsSettings> }
  | { capability: "file_system"; settings: Partial<FileSystemSettings> }
  | { capability: "shell"; settings: Partial<ShellSettings> };

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
