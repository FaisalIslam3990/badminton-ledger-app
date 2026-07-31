import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { NextResponse } from "next/server";

const EDITABLE_FIELDS = ["date", "type", "category", "vendor", "note", "amount", "paid"] as const;

// PATCH /api/entries/[id] — admin can edit any field; viewers may only
// send { paid }. The DB trigger enforces this too, but we narrow the
// payload here for a clean error instead of a raw SQL exception.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getCurrentRole();

  if (role !== "admin" && role !== "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  let update: Record<string, unknown>;

  if (role === "viewer") {
    if (!("paid" in body) || typeof body.paid !== "boolean" || Object.keys(body).length !== 1) {
      return NextResponse.json({ error: "Viewers may only update paid" }, { status: 403 });
    }
    update = { paid: body.paid };
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
