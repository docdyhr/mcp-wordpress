/**
 * System Tools
 *
 * Provides system-level utilities like version checking
 */

import { WordPressClient } from "@/client/api.js";
import { CHECK_VERSION_TOOL, handleCheckVersion } from "./version.js";

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
    ];
  }
}
