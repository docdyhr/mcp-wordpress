/**
 * Plain-text helpers for WordPress `rendered` fields (titles, excerpts, content).
 *
 * WordPress returns these as HTML with entities already encoded (`&#8217;`, `&amp;`, `&hellip;`) and often
 * wrapped in `<p>` tags or Gutenberg block comments. For display and counting we want plain text: strip the
 * markup, decode the entities exactly once. This is deliberately NOT a security sanitizer — the result is
 * plain text, never re-parsed as HTML. Anything that writes content back to WordPress must keep using the
 * validators in `src/security/InputValidator.ts` (see `src/utils/validation/security.ts`).
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  lsquo: "\u2018",
  rsquo: "\u2019",
  sbquo: "\u201a",
  ldquo: "\u201c",
  rdquo: "\u201d",
  bdquo: "\u201e",
  lsaquo: "\u2039",
  rsaquo: "\u203a",
  trade: "\u2122",
  bull: "\u2022",
  euro: "\u20ac",
};

/** HTML 4 Latin-1 entity names in code point order, U+00A0 through U+00FF. */
const LATIN1_ENTITY_NAMES = [
  "nbsp,iexcl,cent,pound,curren,yen,brvbar,sect,uml,copy,ordf,laquo,not,shy,reg,macr",
  "deg,plusmn,sup2,sup3,acute,micro,para,middot,cedil,sup1,ordm,raquo,frac14,frac12,frac34,iquest",
  "Agrave,Aacute,Acirc,Atilde,Auml,Aring,AElig,Ccedil,Egrave,Eacute,Ecirc,Euml,Igrave,Iacute,Icirc,Iuml",
  "ETH,Ntilde,Ograve,Oacute,Ocirc,Otilde,Ouml,times,Oslash,Ugrave,Uacute,Ucirc,Uuml,Yacute,THORN,szlig",
  "agrave,aacute,acirc,atilde,auml,aring,aelig,ccedil,egrave,eacute,ecirc,euml,igrave,iacute,icirc,iuml",
  "eth,ntilde,ograve,oacute,ocirc,otilde,ouml,divide,oslash,ugrave,uacute,ucirc,uuml,yacute,thorn,yuml",
].flatMap((row) => row.split(","));

LATIN1_ENTITY_NAMES.forEach((name, index) => {
  NAMED_ENTITIES[name] = String.fromCharCode(0xa0 + index);
});

/** Tags after which the text must not run into the next word ("one</p><p>two" is two words). */
const BREAKING_TAGS = new Set([
  "p",
  "br",
  "div",
  "li",
  "ul",
  "ol",
  "tr",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "figure",
  "figcaption",
  "section",
  "article",
  "hr",
]);

/** Elements whose contents are not text at all. */
const OPAQUE_TAGS = new Set(["script", "style"]);

const ENTITY_PATTERN = /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,31}));/g;

function codePointToString(codePoint: number): string | undefined {
  const isSurrogate = codePoint >= 0xd800 && codePoint <= 0xdfff;
  if (codePoint <= 0 || codePoint > 0x10ffff || isSurrogate) {
    return undefined;
  }
  return String.fromCodePoint(codePoint);
}

/**
 * Decode HTML character references in a single pass, so an escaped entity stays an entity
 * (`&amp;#8217;` becomes `&#8217;`, not a curly quote). Unknown or invalid references are left as written.
 */
export function decodeHtmlEntities(text: unknown): string {
  if (typeof text !== "string" || text.length === 0) {
    return "";
  }
  return text.replace(ENTITY_PATTERN, (match, decimal?: string, hex?: string, name?: string) => {
    if (decimal !== undefined) return codePointToString(parseInt(decimal, 10)) ?? match;
    if (hex !== undefined) return codePointToString(parseInt(hex, 16)) ?? match;
    // Own properties only: a plain object also answers for "constructor", "toString", ...
    const known = name !== undefined && Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name);
    return (known ? NAMED_ENTITIES[name] : undefined) ?? match;
  });
}

/** True when `<` at `index` opens a tag, closing tag, comment, doctype or processing instruction. */
function startsMarkup(html: string, index: number): boolean {
  const next = html[index + 1];
  return next !== undefined && /[A-Za-z/!?]/.test(next);
}

/**
 * Index of the next `</name` closing tag at or after `from`, or -1. Matched case-insensitively on the original
 * string (lowercasing a copy can change its length, which would shift every offset) and only when the name is
 * followed by a delimiter, so `</scripture>` does not end a `<script>`.
 */
function findClosingTag(html: string, name: string, from: number): number {
  const pattern = new RegExp(`</${name}(?=[\\s/>]|$)`, "gi");
  pattern.lastIndex = from;
  const match = pattern.exec(html);
  return match ? match.index : -1;
}

/** Index of the `>` that ends the tag starting at `start`, honouring quoted attribute values. */
function findTagEnd(html: string, start: number): number {
  let quote: string | undefined;
  for (let i = start + 1; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return i;
    }
  }
  return -1;
}

function tagName(tag: string): { name: string; closing: boolean } {
  const closing = tag.startsWith("</");
  const match = /^<\/?\s*([A-Za-z][A-Za-z0-9-]*)/.exec(tag);
  return { name: match?.[1]?.toLowerCase() ?? "", closing };
}

/**
 * Convert a WordPress HTML fragment to plain text: markup and comments removed (script/style content
 * dropped), entities decoded once, whitespace collapsed. Unterminated tags/comments are dropped rather
 * than leaked. `maxLength` truncates the *decoded* text and appends an ellipsis when it cuts.
 */
export function htmlToPlainText(html: unknown, options: { maxLength?: number } = {}): string {
  if (typeof html !== "string" || html.length === 0) {
    return "";
  }

  let text = "";
  let i = 0;

  while (i < html.length) {
    const char = html[i] as string;
    if (char !== "<" || !startsMarkup(html, i)) {
      text += char;
      i++;
      continue;
    }

    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      if (end === -1) break;
      i = end + 3;
      continue;
    }

    const end = findTagEnd(html, i);
    if (end === -1) break;

    const { name, closing } = tagName(html.slice(i, end + 1));
    i = end + 1;

    if (OPAQUE_TAGS.has(name) && !closing) {
      const close = findClosingTag(html, name, i);
      if (close === -1) break;
      const closeEnd = html.indexOf(">", close);
      if (closeEnd === -1) break;
      i = closeEnd + 1;
    } else if (BREAKING_TAGS.has(name)) {
      text += " ";
    }
  }

  // \s already matches the non-breaking space (U+00A0) that &nbsp; decodes to.
  const plain = decodeHtmlEntities(text).replace(/\s+/g, " ").trim();

  // Count and cut by code point so an emoji is one character on both sides of the comparison.
  const { maxLength } = options;
  if (maxLength !== undefined) {
    const characters = Array.from(plain);
    if (characters.length > maxLength) {
      return `${characters.slice(0, maxLength).join("")}\u2026`;
    }
  }
  return plain;
}

const CJK_CHARACTER = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

/**
 * Count words in plain text. Whitespace-delimited tokens count as one word, but Han, kana and hangul have
 * no word spacing, so each of those characters counts as one (the convention WordPress's own editor
 * counter uses for CJK locales). Stand-alone punctuation is not a word.
 */
export function countWords(text: unknown): number {
  if (typeof text !== "string" || text.trim().length === 0) {
    return 0;
  }
  let cjkCharacters = 0;
  const withoutCjk = text.replace(CJK_CHARACTER, () => {
    cjkCharacters++;
    return " ";
  });
  const tokens = withoutCjk.split(/\s+/).filter((token) => HAS_LETTER_OR_NUMBER.test(token));
  return cjkCharacters + tokens.length;
}
