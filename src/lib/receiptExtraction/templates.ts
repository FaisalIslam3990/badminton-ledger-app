import type { ExtractedFields } from "./types";

export type ReceiptTemplate = {
  id: string;
  // ALL of these must appear in the extracted text for the template to match.
  matchText: string[];
  category: string;
  vendor: string;
  // Returns null if the matched template's own field regexes don't hold
  // (malformed/unexpected variant of an otherwise-matching email) — that
  // falls through to the next template, then to Tier 2, rather than
  // saving a broken guess.
  extract: (text: string) => { date: string; amount: number; note: string } | null;
};

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

// New template = one new object here, no changes to matching logic.
const RECEIPT_TEMPLATES: ReceiptTemplate[] = [
  {
    id: "better-admission-receipt",
    matchText: ["noreply@better-comms.org.uk", "Receipt for your Better purchase"],
    category: "Court Hire",
    vendor: "Better (East Ham Leisure Centre)",
    extract(text) {
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}/);
      const amountMatch = text.match(/Sub-Total\s*£([\d,]+\.\d{2})/i);
      const qtyMatch = text.match(/(\d+)\s*@\s*£[\d.]+/);
      if (!dateMatch || !amountMatch || !qtyMatch) return null;

      return {
        date: dateMatch[1],
        amount: parseAmount(amountMatch[1]),
        note: `Racquet admission, ${qtyMatch[1]} players`,
      };
    },
  },
  {
    id: "better-booking-confirmation",
    matchText: ["noreply@better-comms.org.uk", "Your bookings are confirmed"],
    category: "Court Hire",
    vendor: "Better (East Ham Leisure Centre)",
    extract(text) {
      // Header payment date, e.g. "03/08/2026 22:10" — NOT the play
      // date shown later in the email (e.g. "Sun 9 August 2026").
      const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}/);
      if (!dateMatch) return null;
      const [, dd, mm, yyyy] = dateMatch;

      const bookingCount = (text.match(/Badminton 40min/g) ?? []).length;
      if (bookingCount === 0) return null;

      const totalMatch = text.match(/(?:Online|In [Cc]entre|Card)\s*£([\d,]+\.\d{2})/i);
      let amount: number;
      if (totalMatch) {
        amount = parseAmount(totalMatch[1]);
      } else {
        const vatIndex = text.indexOf("VAT SUMMARY");
        const scope = vatIndex === -1 ? text : text.slice(0, vatIndex);
        const lineAmounts = [...scope.matchAll(/Badminton 40min[\s\S]{0,80}?£([\d,]+\.\d{2})/g)];
        if (lineAmounts.length === 0) return null;
        amount = lineAmounts.reduce((sum, m) => sum + parseAmount(m[1]), 0);
      }

      return {
        date: `${yyyy}-${mm}-${dd}`,
        amount,
        note: `${bookingCount}x badminton court bookings, 40min each`,
      };
    },
  },
];

export function matchReceiptTemplate(text: string): ExtractedFields | null {
  for (const template of RECEIPT_TEMPLATES) {
    if (!template.matchText.every((needle) => text.includes(needle))) continue;
    const fields = template.extract(text);
    if (!fields) continue;
    return { category: template.category, vendor: template.vendor, ...fields };
  }
  return null;
}
