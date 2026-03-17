import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";

type SearchParams = {
  from?: string;
  to?: string;
  minCalcStreak?: string;
  maxCalcStreak?: string;
};

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

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function getDefaultDateRangeFallback() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);

  return {
    from: toDateKey(start),
    to: toDateKey(today),
  };
}

function getDateKeysInRange(from: string, to: string) {
  const keys: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    keys.push(toDateKey(d));
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const { data: challengeSettings } = await supabase
    .from("challenge_settings")
    .select("start_date, end_date")
    .eq("id", 1)
    .single();

  const defaults = getDefaultDateRangeFallback();
  const defaultFrom = challengeSettings?.start_date ?? defaults.from;
  const defaultTo = challengeSettings?.end_date ?? defaults.to;

  const rawFrom = params.from || defaultFrom;
  const rawTo = params.to || defaultTo;

  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const minCalcStreak = params.minCalcStreak ? Number(params.minCalcStreak) : undefined;
  const maxCalcStreak = params.maxCalcStreak ? Number(params.maxCalcStreak) : undefined;

  const hasMinCalcStreak = Number.isFinite(minCalcStreak);
  const hasMaxCalcStreak = Number.isFinite(maxCalcStreak);

  const dateKeys = getDateKeysInRange(from, to);

  if (dateKeys.length === 0) {
    dateKeys.push(from);
  }

  const startDate = dateKeys[0];
  const endDate = dateKeys[dateKeys.length - 1];

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
        .gte("activity_date", startDate)
        .lte("activity_date", endDate),
      supabase
        .from("activities")
        .select("user_id, activity_date, activity_type")
        .gte("activity_date", startDate)
        .lte("activity_date", endDate),
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

  const filteredProfiles = profiles.filter((profile) => {
    const calculatedStreak = calculateConsecutiveStreak(
      profile.id,
      dateKeys,
      durationByUserDate
    );

    if (hasMinCalcStreak && calculatedStreak < (minCalcStreak as number)) {
      return false;
    }

    if (hasMaxCalcStreak && calculatedStreak > (maxCalcStreak as number)) {
      return false;
    }

    return true;
  });

  return (
    <Card className="border border-gray-300 shadow">
      <CardHeader>
        <CardTitle>Users Activity Table</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="mb-4 grid gap-3 rounded-md border border-gray-300 p-3 md:grid-cols-5">
          <div className="space-y-1">
            <label htmlFor="from" className="text-xs text-muted-foreground">From</label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="to" className="text-xs text-muted-foreground">To</label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="minCalcStreak" className="text-xs text-muted-foreground">Min Calc Streak</label>
            <input
              id="minCalcStreak"
              name="minCalcStreak"
              type="number"
              min="0"
              placeholder="0"
              defaultValue={params.minCalcStreak || ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="maxCalcStreak" className="text-xs text-muted-foreground">Max Calc Streak</label>
            <input
              id="maxCalcStreak"
              name="maxCalcStreak"
              type="number"
              min="0"
              placeholder="Any"
              defaultValue={params.maxCalcStreak || ""}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-9 rounded-md bg-foreground px-4 text-sm text-background">
              Apply
            </button>
            <a href="/admin/users" className="h-9 rounded-md border border-input px-4 py-2 text-sm">
              Reset
            </a>
          </div>
        </form>
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
              {filteredProfiles.map((profile) => {
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
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={8 + dateKeys.length} className="p-6 text-center text-muted-foreground">
                    No users matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
