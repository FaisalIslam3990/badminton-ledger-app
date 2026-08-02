import { getCurrentRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import { AddEntryForm } from "@/components/AddEntryForm";

export default async function AddEntryPage() {
  const { role } = await getCurrentRole();
  if (role !== "admin") {
    redirect("/");
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold text-ink">Add Entry</h1>
      <AddEntryForm />
    </div>
  );
}
