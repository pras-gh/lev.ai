import { INTEGRATION_PROVIDERS, type IntegrationProviderId } from "@/lib/integration-catalog";
import { SimulatedProviderAdapter, ADAPTER_SEEDS } from "@/lib/connectors/adapters/simulated-adapter";
import type { ProviderAdapter } from "@/lib/connectors/types";

const registry = new Map<IntegrationProviderId, ProviderAdapter>();

for (const provider of INTEGRATION_PROVIDERS) {
  registry.set(
    provider.id,
    new SimulatedProviderAdapter({
      provider: provider.id,
      scopes:
        provider.id === "whatsapp"
          ? ["messages:write", "contacts:read"]
          : ["transactions:read", "balances:read"],
      seeds: ADAPTER_SEEDS[provider.id]
    })
  );
}

export function getProviderAdapter(provider: IntegrationProviderId): ProviderAdapter {
  const adapter = registry.get(provider);
  if (!adapter) {
    throw new Error(`No provider adapter registered for ${provider}`);
  }

  return adapter;
}
