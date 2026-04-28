const KEEP_UPPER = new Set([
  "AM",
  "PM",
  "EU",
  "USA",
  "UK",
  "VIP",
  "AI",
  "ID",
  "GMT",
  "EST",
  "CET",
  "BST",
  "IST",
  "DST",
  "SKY",
  "DJ",
  "VR",
  "AR",
  "TV",
  "I",
  "I'M",
  "I'LL",
  "I'VE",
  "I'D",
]);

function stripPunct(word: string): string {
  return word.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
}

function looksMostlyTitleCase(text: string): boolean {
  const words = text.trim().split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length < 2) return false;
  const titled = words.filter((w) => /^[A-Z][a-z]/.test(stripPunct(w))).length;
  // For short strings (2-3 words) require all words title-cased; for longer, >60%.
  if (words.length < 4) return titled === words.length;
  return titled / words.length > 0.6;
}

interface SentenceCaseOptions {
  /** Words from this string are preserved with their original capitalization (e.g. CE name). */
  preserve?: string;
}

export function toSentenceCase(
  input: string | null | undefined,
  options: SentenceCaseOptions = {},
): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  // If it doesn't look mostly Title Case, leave it alone (likely already sentence case).
  if (!looksMostlyTitleCase(trimmed)) return trimmed;

  const preserveMap = new Map<string, string>();
  if (options.preserve) {
    for (const w of options.preserve.split(/\s+/)) {
      const bare = stripPunct(w);
      if (bare) preserveMap.set(bare.toLowerCase(), bare);
    }
  }

  const tokens = trimmed.split(/(\s+)/);
  let firstWordHandled = false;
  return tokens
    .map((tok) => {
      if (/^\s+$/.test(tok) || tok === "") return tok;
      // Skip purely non-letter tokens (e.g. leading emoji) for first-word logic.
      if (!/[\p{L}]/u.test(tok)) return tok;
      const isFirst = !firstWordHandled;
      firstWordHandled = true;

      const bare = stripPunct(tok);
      const upper = bare.toUpperCase();

      if (KEEP_UPPER.has(upper)) {
        // Replace the bare portion with its preserved-upper form, keep punctuation.
        return tok.replace(bare, upper);
      }
      if (/^[A-Z]{2,}$/.test(bare)) return tok; // acronym
      if (/[A-Z].*[A-Z]/.test(bare)) return tok; // mixed caps mid-word
      if (preserveMap.has(bare.toLowerCase())) {
        return tok.replace(bare, preserveMap.get(bare.toLowerCase())!);
      }

      const lowerTok = tok.toLowerCase();
      if (isFirst) {
        // capitalize first letter of the bare portion
        const idx = lowerTok.search(/[\p{L}]/u);
        if (idx === -1) return tok;
        return (
          lowerTok.slice(0, idx) +
          lowerTok.charAt(idx).toUpperCase() +
          lowerTok.slice(idx + 1)
        );
      }
      return lowerTok;
    })
    .join("");
}
