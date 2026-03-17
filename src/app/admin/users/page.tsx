import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";

type StreakRow = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

type DailyActivityRow = {
  user_id: string;
  activity_date: string;
  total_duration_minutes: number;
};

type ActivityTypeRow = {
  user_id: string;
  activity_date: string;
  activity_type: string;
};

const DAY_COUNT = 30;

function getDateKeys(dayCount: number) {
  const keys: string[] = [];
  const today = new Date();

  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(d.toISOString().split("T")[0]);
  }

  return keys;
}

function formatDayHeader(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

function calculateConsecutiveStreak(
  userId: string,
  dateKeys: string[],
  durationByUserDate: Map<string, number>
) {
  let streak = 0;

  for (let i = dateKeys.length - 1; i >= 0; i--) {
    const key = `${userId}|${dateKeys[i]}`;
    const duration = durationByUserDate.get(key) ?? 0;

    if (duration >= 30) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin();

  const dateKeys = getDateKeys(DAY_COUNT);
  const startDate = dateKeys[0];

  const [profilesResult, streaksResult, dailyResult, activityTypesResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, username, avatar_url, is_public, role, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("streaks")
        .select("user_id, current_streak, longest_streak, last_activity_date"),
      supabase
        .from("daily_activities")
        .select("user_id, activity_date, total_duration_minutes")
        .gte("activity_date", startDate),
      supabase
        .from("activities")
        .select("user_id, activity_date, activity_type")
        .gte("activity_date", startDate),
    ]);

  const profiles = profilesResult.data ?? [];
  const streaks = (streaksResult.data ?? []) as StreakRow[];
  const dailyActivities = (dailyResult.data ?? []) as DailyActivityRow[];
  const activityTypes = (activityTypesResult.data ?? []) as ActivityTypeRow[];

  const streakByUser = new Map(streaks.map((s) => [s.user_id, s]));

  const durationByUserDate = new Map<string, number>();
  for (const row of dailyActivities) {
    durationByUserDate.set(
      `${row.user_id}|${row.activity_date}`,
      row.total_duration_minutes ?? 0
    );
  }

  const typeByUserDate = new Map<string, Set<string>>();
  for (const row of activityTypes) {
    const key = `${row.user_id}|${row.activity_date}`;
    const existing = typeByUserDate.get(key) ?? new Set<string>();
    existing.add(row.activity_type);
    typeByUserDate.set(key, existing);
  }

  return (
    <Card className="border border-gray-300 shadow">
      <CardHeader>
        <CardTitle>Users Activity Table</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-400 text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-semibold">Email</th>
                <th className="p-2 text-left font-semibold">Username</th>
                <th className="p-2 text-left font-semibold">Role</th>
                <th className="p-2 text-left font-semibold">Public</th>
                <th className="p-2 text-left font-semibold">Calc Streak</th>
                <th className="p-2 text-left font-semibold">Stored Streak</th>
                <th className="p-2 text-left font-semibold">Longest</th>
                <th className="p-2 text-left font-semibold">Created</th>
                {dateKeys.map((dateKey) => (
                  <th key={dateKey} className="p-2 text-left font-semibold whitespace-nowrap">
                    {formatDayHeader(dateKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const streak = streakByUser.get(profile.id);
                const calculatedStreak = calculateConsecutiveStreak(
                  profile.id,
                  dateKeys,
                  durationByUserDate
                );

                return (
                  <tr key={profile.id} className="border-b align-top">
                    <td className="p-2 whitespace-nowrap">{profile.email}</td>
                    <td className="p-2 whitespace-nowrap">{profile.username ?? "-"}</td>
                    <td className="p-2 whitespace-nowrap capitalize">{profile.role}</td>
                    <td className="p-2 whitespace-nowrap">{profile.is_public ? "Yes" : "No"}</td>
                    <td className="p-2 whitespace-nowrap font-semibold">{calculatedStreak}</td>
                    <td className="p-2 whitespace-nowrap">{streak?.current_streak ?? 0}</td>
                    <td className="p-2 whitespace-nowrap">{streak?.longest_streak ?? 0}</td>
                    <td className="p-2 whitespace-nowrap">
                      {new Date(profile.created_at).toLocaleDateString("en-US")}
                    </td>
                    {dateKeys.map((dateKey) => {
                      const key = `${profile.id}|${dateKey}`;
                      const duration = durationByUserDate.get(key) ?? 0;
                      const typeSet = typeByUserDate.get(key);
                      const types = typeSet ? Array.from(typeSet).join(", ") : "-";

                      return (
                        <td key={key} className="p-2 whitespace-nowrap">
                          <div className="font-medium">{duration}m</div>
                          <div className="text-xs text-muted-foreground">{types}</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
