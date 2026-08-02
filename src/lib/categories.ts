// Suggested categories shown in the Add Entry form. `category` is stored
// as free text, so this list is a starting point, not a constraint.
export const PRESET_CATEGORIES = [
  "Court Hire",
  "Equipment (rackets, shuttlecocks, nets)",
  "Public Liability Insurance",
  "Basic DBS Checks",
  "Other",
] as const;

// Fixed color pairs (dark-mode tuned: muted bg, bright readable text).
// A hash of the category name always lands on the same pair, so any
// free-text category gets a consistent badge with zero fallback logic
// — no per-category lookup table to keep in sync as new categories
// get typed in.
const CATEGORY_PALETTE = [
  { bg: "#1f6f5c", text: "#c6f24c" },
  { bg: "#3b2f63", text: "#c4b5fd" },
  { bg: "#5c3a1f", text: "#fbbf24" },
  { bg: "#1f3b5c", text: "#7dd3fc" },
  { bg: "#5c1f3b", text: "#fda4af" },
  { bg: "#1f5c3f", text: "#6ee7b7" },
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function categoryBadge(category: string | null): { letter: string; bg: string; text: string } {
  const label = (category ?? "").trim();
  const letter = label ? label.charAt(0).toUpperCase() : "?";
  const palette = CATEGORY_PALETTE[hashString(label || "?") % CATEGORY_PALETTE.length];
  return { letter, bg: palette.bg, text: palette.text };
}
