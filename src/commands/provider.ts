/** Provider REST commands and their Ethos wire types. */

import { type Connection, request } from "./request.ts";

export type ProviderName = "openai" | "google" | "ollama";
export type ReasoningEffort = "none" | "low" | "medium" | "high";

type ProviderConfiguration = {
  name: ProviderName;
  model_name: string;
  reasoning_effort: ReasoningEffort;
  ollama_base_url: string;
};

/** Public provider state; credentials are represented only by their presence. */
export type Provider = Omit<ProviderConfiguration, "ollama_base_url"> & {
  ollama_base_url: string | null;
  credential_configured: boolean;
};

/** Sparse provider changes; a null API key clears the stored credential. */
export type ProviderSettings = Partial<ProviderConfiguration> & {
  api_key?: string | null;
};

export function providerCommands(connection: Connection) {
  return {
    show() {
      return request<Provider>(connection, "/provider", { method: "GET" });
    },
    check(settings: ProviderSettings) {
      return request<Provider>(connection, "/provider/check", {
        method: "POST",
        body: { settings },
      });
    },
    configure(settings: ProviderSettings) {
      return request<Provider>(connection, "/provider", {
        method: "PUT",
        body: { settings },
      });
    },
  };
}
