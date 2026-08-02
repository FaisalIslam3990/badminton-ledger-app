// Suggested categories shown in the Add Entry form. `category` is stored
// as free text, so this list is a starting point, not a constraint.
export const PRESET_CATEGORIES = [
  "Court Hire",
  "Equipment (rackets, shuttlecocks, nets)",
  "Public Liability Insurance",
  "Basic DBS Checks",
  "Other",
] as const;

export function categoryEmoji(category: string | null): string {
  if (!category) return "📌";
  const c = category.toLowerCase();
  if (c.startsWith("court hire")) return "🏸";
  if (c.startsWith("equipment")) return "🎯";
  if (c.startsWith("public liability")) return "🛡️";
  if (c.startsWith("basic dbs") || c.startsWith("dbs")) return "🪪";
  return "📌";
}
