export interface RegexPartLiteral {
  literal: string;
  capture?: never;
  values?: never;
  number?: never;
}

export interface RegexPartCapture {
  capture: string;
  literal?: never;
  values?: string[];
  number?: boolean;
}

export type RegexPart = RegexPartLiteral | RegexPartCapture;

export function tooltipRegexBuilder(parts: RegexPart[]): RegExp {
  // Helper to escape regex metacharacters in literal strings.
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Pattern for matching a number token.
  // This will match either:
  //   - A parenthesized group: e.g., "(2/4/6/8)", "(+30%/+40%)", "(1x/2x)"
  //   - A standalone number: e.g., "42", "-3.14", "+30%", "1x"
  const numberPattern =
    "(?:\\((?:[+\\-]?\\d+(?:\\.\\d+)?(?:[x%])?(?:\\/[+\\-]?\\d+(?:\\.\\d+)?(?:[x%])?)+)\\)|[+\\-]?\\d+(?:\\.\\d+)?(?:[x%])?)";

  // Build the full regex string piece by piece.
  let regexStr = "^";
  for (const part of parts) {
    if (part.literal) {
      // A literal piece is simply escaped.
      regexStr += escapeRegex(part.literal);
    } else if (part.capture) {
      let innerPattern = "";
      if (part.values && Array.isArray(part.values)) {
        // If allowed values are provided, join them with | (after escaping)
        innerPattern = "(?:" + part.values.map(escapeRegex).join("|") + ")";
      } else if (part.number) {
        // Use our number matcher
        innerPattern = numberPattern;
      } else {
        // If no specific pattern is provided, use a non-greedy wildcard. Matches multiple words.
        innerPattern = ".+?";
      }
      // Create a named capture group using the provided capture name.
      regexStr += `(?<${part.capture}>${innerPattern})`;
    }
  }
  regexStr += "$"; // End of string
  return new RegExp(regexStr, "i"); // Using case-insensitive flag
}
