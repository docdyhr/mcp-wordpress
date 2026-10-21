/**
 * System Tools
 *
 * Provides system-level utilities: version checking and plugin/theme inspection
 */

import { WordPressClient } from "@/client/api.js";
import { preserveToolError } from "@/utils/error.js";
import { htmlToPlainText } from "@/utils/htmlText.js";
import { CHECK_VERSION_TOOL, handleCheckVersion } from "./version.js";

/** A REST field that is either a plain string or WordPress's { raw, rendered } pair. */
type TextField = string | { raw?: string | undefined; rendered?: string | undefined } | undefined;

interface WordPressPluginItem {
  plugin?: string | undefined;
  status?: string | undefined;
  name?: string | undefined;
  version?: string | undefined;
  author?: string | undefined;
  requires_wp?: string | undefined;
  requires_php?: string | undefined;
}

interface WordPressThemeItem {
  stylesheet?: string | undefined;
  template?: string | undefined;
  status?: string | undefined;
  name?: TextField;
  version?: string | undefined;
  author?: TextField;
  is_block_theme?: boolean | undefined;
  requires_wp?: string | undefined;
  requires_php?: string | undefined;
  tags?: { raw?: string[] | undefined } | undefined;
}

/** Theme tags are WordPress's "features" list; long lists are cut so one theme cannot flood the response. */
const MAX_FEATURES = 12;

function plainText(field: TextField): string {
  if (typeof field === "string") return htmlToPlainText(field);
  return htmlToPlainText(field?.raw?.trim()) || htmlToPlainText(field?.rendered);
}

function requirements(item: { requires_wp?: string | undefined; requires_php?: string | undefined }): string {
  const parts = [item.requires_wp && `WP ${item.requires_wp}`, item.requires_php && `PHP ${item.requires_php}`];
  const known = parts.filter(Boolean);
  return known.length > 0 ? ` · requires ${known.join(" / ")}` : "";
}

export function formatPlugins(plugins: WordPressPluginItem[]): string {
  if (plugins.length === 0) return "No plugins are installed.";

  const line = (p: WordPressPluginItem) => {
    const author = htmlToPlainText(p.author);
    const network = p.status === "network-active" ? " · network-active" : "";
    return (
      `- **${htmlToPlainText(p.name) || p.plugin}** (\`${p.plugin}\`) — v${p.version || "?"}` +
      `${author ? ` · by ${author}` : ""}${network}${requirements(p)}`
    );
  };
  const active = plugins.filter((p) => p.status === "active" || p.status === "network-active");
  const inactive = plugins.filter((p) => !active.includes(p));

  let response = `🔌 **Plugins**: ${plugins.length} installed (${active.length} active, ${inactive.length} inactive)\n`;
  if (active.length > 0) response += `\n### Active (${active.length})\n${active.map(line).join("\n")}\n`;
  if (inactive.length > 0) response += `\n### Inactive (${inactive.length})\n${inactive.map(line).join("\n")}\n`;
  return response;
}

export function formatThemes(themes: WordPressThemeItem[]): string {
  if (themes.length === 0) return "No themes are installed.";

  const nameOf = (stylesheet: string | undefined) => {
    const theme = themes.find((t) => t.stylesheet === stylesheet);
    return theme ? plainText(theme.name) || stylesheet : stylesheet;
  };
  const isChild = (t: WordPressThemeItem) => !!t.template && t.template !== t.stylesheet;
  const active = themes.find((t) => t.status === "active");
  const ordered = active ? [active, ...themes.filter((t) => t !== active)] : themes;

  let response = `🎨 **Themes**: ${themes.length} installed\n`;
  if (active) {
    response += `**Active theme**: ${plainText(active.name) || active.stylesheet} (\`${active.stylesheet}\`)`;
    response += isChild(active) ? ` — child theme of ${nameOf(active.template)} (\`${active.template}\`)\n` : "\n";
  }
  response += "\n";

  response += ordered
    .map((t) => {
      const author = plainText(t.author);
      const role = active && isChild(active) && t.stylesheet === active.template ? " (parent of the active theme)" : "";
      let line = `- **${plainText(t.name) || t.stylesheet}** (\`${t.stylesheet}\`) — ${t.status || "unknown"}${role}`;
      line += ` · v${t.version || "?"}${author ? ` · by ${author}` : ""}`;
      if (isChild(t)) line += ` · child of \`${t.template}\``;
      if (t.is_block_theme) line += " · block theme";
      line += requirements(t);

      const features = t.tags?.raw ?? [];
      if (features.length > 0) {
        const shown = features.slice(0, MAX_FEATURES).join(", ");
        const more = features.length > MAX_FEATURES ? ` (+${features.length - MAX_FEATURES} more)` : "";
        line += `\n  Features: ${shown}${more}`;
      }
      return line;
    })
    .join("\n");

  return response + "\n";
}

export async function handleListPlugins(client: WordPressClient): Promise<string> {
  try {
    return formatPlugins(await client.get<WordPressPluginItem[]>("plugins"));
  } catch (error) {
    preserveToolError("Failed to list plugins", error);
  }
}

export async function handleListThemes(client: WordPressClient): Promise<string> {
  try {
    return formatThemes(await client.get<WordPressThemeItem[]>("themes"));
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
