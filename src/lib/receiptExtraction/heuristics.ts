import type { ExtractedFields } from "./types";

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const DATE_KEYWORDS = ["date", "issued", "receipt", "order"];
const AMOUNT_KEYWORDS = ["total", "amount due", "grand total", "balance"];

function pad2(n: string | number) {
  return String(n).padStart(2, "0");
}

function lineContainsAny(line: string, keywords: string[]) {
  const lower = line.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function isValidDate(y: string, mo: string, d: string) {
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100;
}

const DATE_PATTERNS: { re: RegExp; toIso: (m: RegExpExecArray) => string | null }[] = [
  {
    // YYYY-MM-DD
    re: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    toIso: (m) => (isValidDate(m[1], m[2], m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null),
  },
  {
    // DD/MM/YYYY
    re: /\b(\d{2})\/(\d{2})\/(\d{4})\b/g,
    toIso: (m) => (isValidDate(m[3], m[2], m[1]) ? `${m[3]}-${m[2]}-${m[1]}` : null),
  },
  {
    // "3 August 2026" / "3rd Aug 2026"
    re: /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{4})\b/gi,
    toIso: (m) => {
      const mo = MONTHS[m[2].toLowerCase()];
      return mo && isValidDate(m[3], mo, m[1]) ? `${m[3]}-${mo}-${pad2(m[1])}` : null;
    },
  },
];

// Distinct ISO dates found, each flagged for whether its line also
// carries one of the "this is probably the receipt date" keywords.
function findDates(text: string): { iso: string; nearKeyword: boolean }[] {
  const found = new Map<string, boolean>();

  for (const line of text.split(/\r?\n/)) {
    const near = lineContainsAny(line, DATE_KEYWORDS);
    for (const { re, toIso } of DATE_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line))) {
        const iso = toIso(m);
        if (!iso) continue;
        found.set(iso, (found.get(iso) ?? false) || near);
      }
    }
  }

  return [...found.entries()].map(([iso, nearKeyword]) => ({ iso, nearKeyword }));
}

function pickDate(text: string): string | null {
  const dates = findDates(text);
  if (dates.length === 0) return null;
  if (dates.length === 1) return dates[0].iso;
  const near = dates.filter((d) => d.nearKeyword);
  // A single clear winner near a date-ish keyword; otherwise ambiguous.
  return near.length === 1 ? near[0].iso : null;
}

function findAmounts(text: string): { amount: number; nearKeyword: boolean }[] {
  const found = new Map<number, boolean>();
  const re = /£\s?([\d,]+\.\d{2})/g;

  for (const line of text.split(/\r?\n/)) {
    const near = lineContainsAny(line, AMOUNT_KEYWORDS);
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const amount = Number(m[1].replace(/,/g, ""));
      if (!Number.isFinite(amount)) continue;
      found.set(amount, (found.get(amount) ?? false) || near);
    }
  }

  return [...found.entries()].map(([amount, nearKeyword]) => ({ amount, nearKeyword }));
}

function pickAmount(text: string): number | null {
  const amounts = findAmounts(text);
  if (amounts.length === 0) return null;
  if (amounts.length === 1) return amounts[0].amount;
  const near = amounts.filter((a) => a.nearKeyword);
  return near.length === 1 ? near[0].amount : null;
}

// These strings are exactly PRESET_CATEGORIES (src/lib/categories.ts) —
// duplicated as literals rather than imported so a future rename there
// can't silently break this fallback matching without a compile error
// pointing at both places.
function guessCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("court") || lower.includes("badminton")) return "Court Hire";
  if (lower.includes("insurance")) return "Public Liability Insurance";
  if (lower.includes("dbs")) return "Basic DBS Checks";
  if (
    lower.includes("racket") ||
    lower.includes("racquet") ||
    lower.includes("shuttlecock") ||
    lower.includes("net")
  ) {
    return "Equipment (rackets, shuttlecocks, nets)";
  }
  return "Other";
}

function guessVendor(text: string): string {
  const firstSubstantial = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length >= 3);
  return firstSubstantial ? firstSubstantial.slice(0, 60) : "";
}

// Low-confidence, code-only pass — zero API calls. Returns null (never
// a partial guess) the moment date or amount can't be pinned down with
// confidence, so a bad guess never silently reaches the review form —
// the confidence gate abandons the whole tier, not just the weak field.
export function runHeuristicExtraction(text: string): ExtractedFields | null {
  const date = pickDate(text);
  const amount = pickAmount(text);
  if (!date || amount === null) return null;

  return {
    date,
    amount,
    category: guessCategory(text),
    vendor: guessVendor(text),
    // Best-effort line-item summarization is fragile enough to fabricate
    // something specific-sounding but wrong — leaving it blank for the
    // user to fill in is the honest fallback the spec calls for.
    note: "",
  };
}
