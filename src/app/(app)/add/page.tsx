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
      <h1 className="font-serif text-2xl text-ink mb-4">Add Entry</h1>
      <AddEntryForm />
    </div>
  );
}
