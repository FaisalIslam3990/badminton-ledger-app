import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { NextResponse } from "next/server";

const EDITABLE_FIELDS = [
  "date",
  "type",
  "category",
  "vendor",
  "note",
  "amount",
  "paid",
  "paid_at",
  "payment_reference",
] as const;

// A viewer may only ever touch the payment-tracking fields — the claim
// itself (date/amount/category/etc.) is locked. This is a convenience
// check for a clean 403 instead of a raw SQL error; the actual security
// boundary is the enforce_viewer_paid_only trigger in Supabase, which
// blocks this at the database level regardless of what hits this route.
const VIEWER_EDITABLE_FIELDS = ["paid", "paid_at", "payment_reference"] as const;

// PATCH /api/entries/[id] — admin can edit any field; viewers may only
// send paid / paid_at / payment_reference.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getCurrentRole();

  if (role !== "admin" && role !== "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  let update: Record<string, unknown>;

  if (role === "viewer") {
    const keys = Object.keys(body);
    if (keys.length === 0 || !keys.every((k) => (VIEWER_EDITABLE_FIELDS as readonly string[]).includes(k))) {
      return NextResponse.json(
        { error: "Viewers may only update paid, paid_at, and payment_reference" },
        { status: 403 },
      );
    }
    update = body;
  } else {
    update = Object.fromEntries(
      Object.entries(body).filter(([key]) => (EDITABLE_FIELDS as readonly string[]).includes(key)),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("entries").update(update).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

// DELETE /api/entries/[id] — admin only (also removes the receipt file).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getCurrentRole();

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: entry } = await supabase.from("entries").select("receipt_file_url").eq("id", id).single();

  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (entry?.receipt_file_url) {
    await supabase.storage.from("receipts").remove([entry.receipt_file_url]);
  }

  return NextResponse.json({ ok: true });
}
