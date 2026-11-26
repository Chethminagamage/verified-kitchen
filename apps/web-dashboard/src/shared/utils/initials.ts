/**
 * Up to two initials for an avatar: "Kitchen Operator" -> "KO", "nimal" -> "N",
 * "ops@kitchen.lk" -> "O". Falls back to "?" when there is nothing usable.
 */
export function initials(name: string | null | undefined, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0]?.trim() || "";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0][0] : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}
