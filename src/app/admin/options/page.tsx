import { requireAdmin } from "@/lib/auth/admin";
import AdminOptionsClient from "./options-client";

export default async function AdminOptionsPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("challenge_settings")
    .select("start_date, end_date, timezone, activity_types")
    .eq("id", 1)
    .single();

  return (
    <AdminOptionsClient
      initialSettings={{
        start_date: data?.start_date ?? new Date().toISOString().split("T")[0],
        end_date: data?.end_date ?? new Date().toISOString().split("T")[0],
        timezone: data?.timezone ?? "UTC",
        activity_types: data?.activity_types ?? ["Ride", "Trailwork"],
      }}
    />
  );
}
