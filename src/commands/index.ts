/** Commands bound to one Ethos connection. */

import { capabilityCommands } from "./capabilities.ts";
import { messageCommands } from "./messages.ts";
import { personaCommands } from "./personas.ts";
import { providerCommands } from "./provider.ts";
import type { Connection } from "./request.ts";
import { sessionCommands } from "./sessions.ts";
import { workspaceCommands } from "./workspaces.ts";

export type { Connection } from "./request.ts";

export function createCommands(connection: Connection) {
  return {
    workspaces: workspaceCommands(connection),
    personas: personaCommands(connection),
    provider: providerCommands(connection),
    capabilities: capabilityCommands(connection),
    sessions: sessionCommands(connection),
    messages: messageCommands(connection),
  };
}
