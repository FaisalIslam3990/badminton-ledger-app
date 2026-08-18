import pdfParse from "pdf-parse/lib/pdf-parse.js";

// A scanned/image-only PDF (or a corrupt one) has no real text layer —
// pdf-parse either throws or returns near-nothing. Anything under this
// threshold isn't real content to pattern-match against, so callers
// should skip straight to the AI vision tier instead of running regex
// against noise.
const MIN_SUBSTANTIAL_CHARS = 40;

export async function extractPdfText(bytes: Buffer): Promise<string> {
  try {
    const result = await pdfParse(bytes);
    return result.text ?? "";
  } catch (err) {
    console.error("pdf-parse failed:", err);
    return "";
  }
}

export function hasSubstantialText(text: string): boolean {
  return text.replace(/\s+/g, " ").trim().length >= MIN_SUBSTANTIAL_CHARS;
}
