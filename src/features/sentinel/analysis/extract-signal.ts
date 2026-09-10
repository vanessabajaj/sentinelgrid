/** Returns the first capture group of `pattern` in `content`, or null. */
export function firstMatch(content: string, pattern: RegExp): string | null {
  return content.match(pattern)?.[1] ?? null;
}
