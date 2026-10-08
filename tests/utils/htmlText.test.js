import { decodeHtmlEntities, htmlToPlainText, countWords } from "@/utils/htmlText.js";

describe("decodeHtmlEntities", () => {
  it("decodes the entities WordPress emits in rendered titles and excerpts", () => {
    expect(decodeHtmlEntities("It&#8217;s &#8220;quoted&#8221; &amp; more &#038; more")).toBe(
      "It’s “quoted” & more & more",
    );
    expect(decodeHtmlEntities("Read more&hellip; &raquo; a&nbsp;b &#8211; c &mdash; d")).toBe(
      "Read more… » a b – c — d",
    );
  });

  // WordPress stores author-typed entities as typed, so rendered fields can contain any HTML 4 name.
  it("decodes the Latin-1 named entities, not just the common punctuation ones", () => {
    expect(decodeHtmlEntities("Caf&eacute; &Uuml;ber &szlig; ma&ntilde;ana &yuml; &AElig;on &THORN;")).toBe(
      "Caf\u00e9 \u00dcber \u00df ma\u00f1ana \u00ff \u00c6on \u00de",
    );
    expect(decodeHtmlEntities("&iexcl;Hola&iquest; &frac12; &sup2; &micro; &shy;")).toBe(
      "\u00a1Hola\u00bf \u00bd \u00b2 \u00b5 \u00ad",
    );
  });

  // Regression: names were looked up on a plain object, so "&constructor;" resolved to Object's
  // inherited function and was replaced by its source text.
  it("leaves references that match inherited Object properties untouched", () => {
    expect(decodeHtmlEntities("&constructor; &toString; &valueOf; &hasOwnProperty;")).toBe(
      "&constructor; &toString; &valueOf; &hasOwnProperty;",
    );
  });

  it("decodes hexadecimal numeric references", () => {
    expect(decodeHtmlEntities("&#x2019; &#X41;")).toBe("’ A");
  });

  // Regression: sanitizeHtml escaped the '&' of already-encoded entities, giving "&amp;#8217;".
  it("decodes exactly once — an escaped entity stays an entity", () => {
    expect(decodeHtmlEntities("&amp;#8217;")).toBe("&#8217;");
    expect(decodeHtmlEntities("&amp;amp;")).toBe("&amp;");
    expect(decodeHtmlEntities("&amp;lt;b&amp;gt;")).toBe("&lt;b&gt;");
  });

  it("leaves unknown, malformed and out-of-range references untouched", () => {
    expect(decodeHtmlEntities("&notarealentity; &#; &#xZZ; &amp")).toBe("&notarealentity; &#; &#xZZ; &amp");
    expect(decodeHtmlEntities("&#0; &#1114112; &#55357;")).toBe("&#0; &#1114112; &#55357;");
  });

  it("returns an empty string for non-string input", () => {
    expect(decodeHtmlEntities(undefined)).toBe("");
    expect(decodeHtmlEntities(null)).toBe("");
    expect(decodeHtmlEntities(42)).toBe("");
  });
});

describe("htmlToPlainText", () => {
  it("strips tags and decodes entities (the wp_list_posts excerpt case)", () => {
    const rendered = "<p>Don&#8217;t miss the &#8220;big&#8221; news &amp; more [&hellip;]</p>\n";
    expect(htmlToPlainText(rendered)).toBe("Don’t miss the “big” news & more […]");
  });

  it("keeps paragraph and line-break boundaries as spaces so words do not run together", () => {
    expect(htmlToPlainText("<p>one</p><p>two</p>one<br>three<br/>four<li>five</li>")).toBe(
      "one two one three four five",
    );
  });

  it("does not insert spaces for inline tags", () => {
    expect(htmlToPlainText("<strong>bo</strong>ld and <em>ital</em>ic")).toBe("bold and italic");
  });

  it("removes HTML comments, including Gutenberg block delimiters", () => {
    expect(htmlToPlainText("<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->")).toBe("Hello");
  });

  it("drops script and style elements together with their contents", () => {
    expect(htmlToPlainText("a<script>alert('x > y')</script>b<STYLE>p{color:red}</STYLE>c")).toBe("abc");
  });

  // Regression: closing tags were found by prefix, so "</scripture>" ended a <script> element early.
  it("only ends script/style at a real closing tag, not at a longer tag name", () => {
    expect(htmlToPlainText('<script>const x="</scripture>"; leak();</script>visible')).toBe("visible");
    expect(htmlToPlainText("<STYLE>a{}</stylesheet>b{}</STYLE >after")).toBe("after");
  });

  // Regression: offsets found in a lowercased copy were applied to the original, but toLowerCase() can
  // change length ("\u0130" becomes two code units), so the visible tail was cut off.
  it("keeps the visible text after a script when earlier text changes length under lowercasing", () => {
    const dotted = "\u0130".repeat(10);
    expect(htmlToPlainText(`${dotted}<script>x</script>visible tail`)).toBe(`${dotted}visible tail`);
  });

  it("handles a '>' inside a quoted attribute value", () => {
    expect(htmlToPlainText('<a title="a > b" href="/x">link</a> text')).toBe("link text");
  });

  it("keeps a literal '<' that does not start a tag", () => {
    expect(htmlToPlainText("1 < 2 and 3 > 2")).toBe("1 < 2 and 3 > 2");
  });

  it("does not turn encoded markup back into tags", () => {
    expect(htmlToPlainText("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("<script>alert(1)</script>");
  });

  it("drops an unterminated tag or comment instead of leaking its markup", () => {
    expect(htmlToPlainText("text <a href='x")).toBe("text");
    expect(htmlToPlainText("text <!-- never closed")).toBe("text");
    expect(htmlToPlainText("text <script>never closed")).toBe("text");
  });

  it("converts non-breaking spaces and collapses whitespace", () => {
    expect(htmlToPlainText("<p>a&nbsp;&nbsp;b \n\t c</p>")).toBe("a b c");
  });

  it("returns an empty string for empty or non-string input", () => {
    expect(htmlToPlainText("")).toBe("");
    expect(htmlToPlainText(undefined)).toBe("");
    expect(htmlToPlainText("<p></p>")).toBe("");
  });

  it("truncates to maxLength on a character boundary and marks the cut", () => {
    expect(htmlToPlainText("<p>abcdefghij</p>", { maxLength: 5 })).toBe("abcde…");
    expect(htmlToPlainText("<p>abcde</p>", { maxLength: 5 })).toBe("abcde");
  });

  // Regression: the length check used UTF-16 units while the cut used code points, so text of exactly
  // maxLength visible characters containing an emoji got a false ellipsis.
  it("counts code points, not UTF-16 units, when deciding whether to truncate", () => {
    const emoji = "\u{1F600}";
    expect(htmlToPlainText(`<p>${"a".repeat(149)}${emoji}</p>`, { maxLength: 150 })).toBe(`${"a".repeat(149)}${emoji}`);
    expect(htmlToPlainText(emoji.repeat(3), { maxLength: 3 })).toBe(emoji.repeat(3));
    expect(htmlToPlainText(emoji.repeat(4), { maxLength: 3 })).toBe(`${emoji.repeat(3)}\u2026`);
  });

  it("does not cut an entity in half when truncating", () => {
    // 4 characters after decoding: truncating the raw string at 5 would split "&#8217;"
    expect(htmlToPlainText("ab&#8217;c&#8217;d", { maxLength: 4 })).toBe("ab’c…");
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("The quick brown fox")).toBe(4);
  });

  it("does not count stand-alone punctuation as words", () => {
    expect(countWords("Hello — world !")).toBe(2);
  });

  // Regression: "中文测试" was counted as a single whitespace-delimited word.
  it("counts each CJK character as a word", () => {
    expect(countWords("中文测试")).toBe(4);
  });

  it("counts mixed CJK and Latin text without double-counting", () => {
    expect(countWords("Hello 中文测试 world")).toBe(6);
    expect(countWords("WordPress插件")).toBe(3);
  });

  it("counts Japanese kana and Korean hangul as characters too", () => {
    expect(countWords("こんにちは")).toBe(5);
    expect(countWords("한국어")).toBe(3);
  });

  it("counts numbers and accented words", () => {
    expect(countWords("café 2026 naïve")).toBe(3);
  });

  it("returns 0 for empty or non-string input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });
});
