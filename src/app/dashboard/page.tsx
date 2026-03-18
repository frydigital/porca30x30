import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function getDateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return toDateKey(new Date());
  }

  return `${year}-${month}-${day}`;
}

function getDefaultChallengeRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(today),
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/login");
  }

  const { data: challengeSettings } = await supabase
    .from("challenge_settings")
    .select("start_date, end_date, timezone, activity_types")
    .eq("id", 1)
    .single();

  const defaults = getDefaultChallengeRange();
  const challengeTimezone = challengeSettings?.timezone ?? "UTC";
  const timezoneToday = getDateInTimezone(challengeTimezone);

  const challengeStartDate = challengeSettings?.start_date ?? defaults.startDate;
  const configuredEndDate = challengeSettings?.end_date ?? defaults.endDate;
  const challengeEndDate = configuredEndDate;
  const manualEntryEndDate = configuredEndDate < timezoneToday ? configuredEndDate : timezoneToday;
  const challengeActivityTypes =
    challengeSettings?.activity_types?.filter((type: string | null) => typeof type === "string" && type.trim().length > 0)
      ?? ["Ride", "Trailwork"];

  // Get streak data
  const { data: streak } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Get recent daily activities
  const { data: dailyActivities } = await supabase
    .from("daily_activities")
    .select("*")
    .eq("user_id", user.id)
    .gte("activity_date", challengeStartDate)
    .lte("activity_date", challengeEndDate)
    .order("activity_date", { ascending: false });

  // Get individual activities for the activity list
  const { data: recentActivities } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .order("activity_date", { ascending: false })
    .limit(50);

 

  return (
    <DashboardClient
      streak={streak}
      dailyActivities={dailyActivities || []}
      activities={recentActivities || []}
      challengeStartDate={challengeStartDate}
      challengeEndDate={challengeEndDate}
      manualEntryEndDate={manualEntryEndDate}
      challengeActivityTypes={challengeActivityTypes}
    />
  );
}
