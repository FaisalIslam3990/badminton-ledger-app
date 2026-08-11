import { getCurrentRole } from "@/lib/roles";
import { PRESET_CATEGORIES } from "@/lib/categories";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { extractPdfText, hasSubstantialText } from "@/lib/receiptExtraction/pdfText";
import { matchReceiptTemplate } from "@/lib/receiptExtraction/templates";
import { runHeuristicExtraction } from "@/lib/receiptExtraction/heuristics";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Server-only route: the Anthropic API key never reaches the browser.
export async function POST(request: Request) {
  const { role } = await getCurrentRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large (10MB max)" }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Tiers 1 (known template) and 2 (generic heuristic) are pure
  // string/regex code — zero API calls — and only have anything to work
  // with on a PDF that has a real text layer. A scanned/image-only PDF
  // or a photo has no extractable text, so it skips straight to the AI
  // vision tier below. Whichever tier produces a result wins; later
  // tiers never run once an earlier one has.
  if (file.type === "application/pdf") {
    const text = await extractPdfText(bytes);
    if (hasSubstantialText(text)) {
      const templateMatch = matchReceiptTemplate(text);
      if (templateMatch) {
        return NextResponse.json({ extracted: templateMatch, extraction_method: "template" });
      }

      const heuristicMatch = runHeuristicExtraction(text);
      if (heuristicMatch) {
        return NextResponse.json({ extracted: heuristicMatch, extraction_method: "heuristic" });
      }
    }
  }

  // Tier 3 — Claude vision. The only tier that costs API tokens.
  const base64 = bytes.toString("base64");

  const contentBlock: Anthropic.Messages.ContentBlockParam =
    file.type === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: file.type as "image/jpeg" | "image/png" | "image/webp",
            data: base64,
          },
        };

  try {
    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: "This is a receipt for a badminton club's expenses. Extract the details and call record_receipt with what you find. If a field truly can't be determined, use your best reasonable guess for category/note and omit only what's illegible.",
            },
          ],
        },
      ],
      tools: [
        {
          name: "record_receipt",
          description: "Records extracted fields from a receipt image or PDF.",
          input_schema: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "Receipt date in YYYY-MM-DD format. Use your best guess if partially legible.",
              },
              vendor: {
                type: "string",
                description: "The merchant / vendor name on the receipt.",
              },
              amount: {
                type: "number",
                description: "Total amount paid, as a plain number (e.g. 39.50), no currency symbol.",
              },
              category: {
                type: "string",
                description: `Best-fit category. Prefer one of: ${PRESET_CATEGORIES.join(", ")}. Use "Other" if nothing fits.`,
              },
              note: {
                type: "string",
                description: "A short (under 8 words) description of the purchase.",
              },
            },
            required: ["date", "vendor", "amount", "category", "note"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_receipt" },
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
    }

    return NextResponse.json({ extracted: toolUse.input, extraction_method: "ai" });
  } catch (err) {
    console.error("Claude extraction error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
  }
}
