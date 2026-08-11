import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { NextResponse } from "next/server";

const VALID_EXTRACTION_METHODS = new Set(["template", "heuristic", "ai"]);

function sanitizeForPath(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// POST /api/entries — creates an expense claim. Every entry is an
// expense now; "income" is derived from confirmed reimbursements, not
// logged separately (see enforce_viewer_paid_only / the Status flow).
// May include a "receipt" file, uploaded to Storage and linked after
// the row is created (so the storage path can be namespaced by entry id).
export async function POST(request: Request) {
  const { role } = await getCurrentRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const date = String(formData.get("date") ?? "");
  const category = String(formData.get("category") ?? "") || null;
  const vendor = String(formData.get("vendor") ?? "") || null;
  const note = String(formData.get("note") ?? "") || null;
  const amountRaw = formData.get("amount");
  const receipt = formData.get("receipt");
  const extractionMethodRaw = formData.get("extraction_method");
  const extraction_method =
    typeof extractionMethodRaw === "string" && VALID_EXTRACTION_METHODS.has(extractionMethodRaw)
      ? extractionMethodRaw
      : null;

  const amount = Number(amountRaw);
  if (!date || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: entry, error: insertError } = await supabase
    .from("entries")
    .insert({ date, type: "expense", category, vendor, note, amount, extraction_method })
    .select()
    .single();

  if (insertError || !entry) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  if (receipt instanceof File && receipt.size > 0) {
    const ext = receipt.name.split(".").pop() || "bin";
    const displayName = `${category ?? "Receipt"} - £${amount.toFixed(2)} - ${date}`;
    const storagePath = `${entry.id}/${sanitizeForPath(displayName)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(storagePath, receipt, { contentType: receipt.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `Entry saved, but receipt upload failed: ${uploadError.message}` },
        { status: 207 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("entries")
      .update({ receipt_file_url: storagePath, receipt_file_name: displayName })
      .eq("id", entry.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ entry: updated }, { status: 201 });
  }

  return NextResponse.json({ entry }, { status: 201 });
}
