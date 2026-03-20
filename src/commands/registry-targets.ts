import type { McpTarget, TargetOptions } from "../utils/targets.js";
import { resolveSingleTarget } from "./single-target.js";

export async function resolveSingleRegistryTarget(
  options: TargetOptions,
): Promise<McpTarget | null> {
  return resolveSingleTarget(options, "Choose registry target:");
}
