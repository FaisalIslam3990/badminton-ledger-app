import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/roles";
import { NextResponse } from "next/server";
import type { Entry } from "@/lib/summary";

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(entries: Entry[], receiptZipPaths: Map<string, string>) {
  const header = [
    "Date",
    "Type",
    "Category",
    "Vendor",
    "Note",
    "Amount",
    "Paid (Sent)",
    "Paid Date",
    "Payment Reference",
    "Received (Confirmed)",
    "Received Date",
    "Receipt File",
  ];
  const rows = entries.map((e) => [
    e.date,
    e.type,
    e.category ?? "",
    e.vendor ?? "",
    e.note ?? "",
    e.amount.toFixed(2),
    e.paid ? "yes" : "no",
    e.paid_at ?? "",
    e.payment_reference ?? "",
    e.received ? "yes" : "no",
    e.received_at ?? "",
    receiptZipPaths.get(e.id) ?? "",
  ]);
  return [header, ...rows].map((row) => row.map((v) => csvEscape(String(v))).join(",")).join("\n");
}

// Every receipt file lives under its own entry-id folder in Storage, so
// names never collide there — but flattened into one zip folder for the
// export they can (two receipts both named "Receipt.pdf"), so de-dupe
// on the way in and record the final in-zip path per entry for the CSV.
function uniqueFileName(baseName: string, used: Set<string>) {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }
  const dot = baseName.lastIndexOf(".");
  const stem = dot === -1 ? baseName : baseName.slice(0, dot);
  const ext = dot === -1 ? "" : baseName.slice(dot);
  let i = 2;
  let candidate = `${stem} (${i})${ext}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${stem} (${i})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export async function GET() {
  // Any signed-in role can export — viewers can read every entries row
  // already (entries_viewer_select), so this just matches what they can
  // already see, not a new permission.
  const { role } = await getCurrentRole();
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (entries ?? []) as Entry[];
  const zip = new JSZip();
  const receiptsFolder = zip.folder("receipts")!;
  const usedNames = new Set<string>();
  const receiptZipPaths = new Map<string, string>();

  for (const entry of rows) {
    if (!entry.receipt_file_url) continue;

    const { data: blob, error: downloadError } = await supabase.storage.from("receipts").download(entry.receipt_file_url);
    if (downloadError || !blob) {
      console.error("Export: failed to download receipt", entry.receipt_file_url, downloadError);
      continue;
    }

    const ext = entry.receipt_file_url.split(".").pop() || "bin";
    const baseName = `${entry.receipt_file_name ?? "Receipt"}.${ext}`;
    const fileName = uniqueFileName(baseName, usedNames);

    receiptsFolder.file(fileName, await blob.arrayBuffer());
    receiptZipPaths.set(entry.id, `receipts/${fileName}`);
  }

  zip.file("ledger.csv", buildCsv(rows, receiptZipPaths));

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const zipBlob = new Blob([zipBuffer], { type: "application/zip" });

  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="badminton-ledger-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
