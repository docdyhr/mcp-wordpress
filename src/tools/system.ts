/**
 * System Tools
 *
 * Provides system-level utilities like version checking
 */

import { WordPressClient } from "@/client/api.js";
import { preserveToolError } from "@/utils/error.js";
import { CHECK_VERSION_TOOL, handleCheckVersion } from "./version.js";

export async function handleListPlugins(client: WordPressClient): Promise<unknown[]> {
  try {
    return await client.get<unknown[]>("plugins");
  } catch (error) {
    preserveToolError("Failed to list plugins", error);
  }
}

export async function handleListThemes(client: WordPressClient): Promise<unknown[]> {
  try {
    return await client.get<unknown[]>("themes");
  } catch (error) {
    preserveToolError("Failed to list themes", error);
  }
}

export default class SystemTools {
  getTools() {
    return [
      {
        name: CHECK_VERSION_TOOL.name,
        description: CHECK_VERSION_TOOL.description,
        inputSchema: CHECK_VERSION_TOOL.inputSchema,
        handler: async (_client: WordPressClient, args: Record<string, unknown>) => {
          return await handleCheckVersion(args);
        },
      },
      {
        name: "wp_list_plugins",
        description:
          "Lists installed WordPress plugins with their active status, version, and author. Requires the activate_plugins capability.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        handler: async (client: WordPressClient) => await handleListPlugins(client),
      },
      {
        name: "wp_list_themes",
        description:
          "Lists installed WordPress themes with their active status, version, parent theme, and features. Requires the switch_themes capability.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        handler: async (client: WordPressClient) => await handleListThemes(client),
      },
    ];
  }
}
