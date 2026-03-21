import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/admin";
import RandomWinnerClient from "./random-winner-client";
import VerifiedToggleClient from "./verified-toggle-client";

type SearchParams = {
  from?: string;
  to?: string;
  minCalcStreak?: string;
  maxCalcStreak?: string;
  requireStartDay?: string;
  activityType?: string;
  sortBy?: string;
  sortDir?: string;
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

type VerificationRow = {
  user_id: string;
  verified: boolean;
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
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (let t = start; t <= end; t += ONE_DAY_MS) {
    keys.push(new Date(t).toISOString().split("T")[0]);
  }

  return keys;
}

function formatDayHeader(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", timeZone: "UTC" });
}

function calculateWindowValidDays(
  userId: string,
  dateKeys: string[],
  durationByUserDate: Map<string, number>
) {
  let validDays = 0;

  for (const dateKey of dateKeys) {
    const key = `${userId}|${dateKey}`;
    const duration = durationByUserDate.get(key) ?? 0;

    if (duration >= 30) {
      validDays += 1;
    }
  }

  return validDays;
}

function calculateWindowTotalMinutes(
  userId: string,
  dateKeys: string[],
  durationByUserDate: Map<string, number>
) {
  let totalMinutes = 0;

  for (const dateKey of dateKeys) {
    const key = `${userId}|${dateKey}`;
    totalMinutes += durationByUserDate.get(key) ?? 0;
  }

  return totalMinutes;
}

function hasValidFirstDay(
  userId: string,
  firstDateKey: string,
  durationByUserDate: Map<string, number>
) {
  const key = `${userId}|${firstDateKey}`;
  const duration = durationByUserDate.get(key) ?? 0;
  return duration >= 30;
}

function calculateChallengeStreak(
  userId: string,
  dateKeys: string[],
  durationByUserDate: Map<string, number>
) {
  const startsOnFirstDay = hasValidFirstDay(userId, dateKeys[0], durationByUserDate);
  if (!startsOnFirstDay) {
    return { calcStreak: 0, startsOnFirstDay };
  }

  const validDays = calculateWindowValidDays(userId, dateKeys, durationByUserDate);
  return { calcStreak: validDays, startsOnFirstDay };
}

function normalizeSortDirection(value: string | undefined) {
  return value === "asc" ? "asc" : "desc";
}

function getSortValue(
  profile: {
    id: string;
    email: string;
    username: string | null;
    role: string;
    is_public: boolean;
    created_at: string;
  },
  sortBy: string,
  calcStreak: number,
  totalMinutes: number,
  verified: boolean,
  durationByUserDate: Map<string, number>
) {
  if (sortBy === "email") return profile.email.toLowerCase();
  if (sortBy === "username") return (profile.username ?? "").toLowerCase();
  if (sortBy === "role") return profile.role.toLowerCase();
  if (sortBy === "public") return profile.is_public ? 1 : 0;
  if (sortBy === "verified") return verified ? 1 : 0;
  if (sortBy === "calcStreak") return calcStreak;
  if (sortBy === "totalMinutes") return totalMinutes;
  if (sortBy === "created") return profile.created_at;
  if (sortBy.startsWith("day:")) {
    const dateKey = sortBy.slice(4);
    return durationByUserDate.get(`${profile.id}|${dateKey}`) ?? 0;
  }

  return profile.created_at;
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
  const requireStartDay = params.requireStartDay === "1";
  const selectedActivityType = (params.activityType ?? "").trim();
  const sortBy = params.sortBy ?? "created";
  const sortDir = normalizeSortDirection(params.sortDir);

  const hasMinCalcStreak = Number.isFinite(minCalcStreak);
  const hasMaxCalcStreak = Number.isFinite(maxCalcStreak);

  const dateKeys = getDateKeysInRange(from, to);

  if (dateKeys.length === 0) {
    dateKeys.push(from);
  }

  const startDate = dateKeys[0];
  const endDate = dateKeys[dateKeys.length - 1];

  const [profilesResult, dailyResult, activityTypesResult, verificationsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, username, avatar_url, is_public, role, created_at")
        .order("created_at", { ascending: false }),
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
      supabase
        .from("participant_verifications")
        .select("user_id, verified"),
    ]);

  const profiles = profilesResult.data ?? [];
  const dailyActivities = (dailyResult.data ?? []) as DailyActivityRow[];
  const activityTypes = (activityTypesResult.data ?? []) as ActivityTypeRow[];
  const verifications = (verificationsResult.data ?? []) as VerificationRow[];

  const durationByUserDate = new Map<string, number>();
  for (const row of dailyActivities) {
    durationByUserDate.set(
      `${row.user_id}|${row.activity_date}`,
      row.total_duration_minutes ?? 0
    );
  }

  const typeByUserDate = new Map<string, Set<string>>();
  const availableTypeSet = new Set<string>();
  const userIdsByType = new Map<string, Set<string>>();
  for (const row of activityTypes) {
    const key = `${row.user_id}|${row.activity_date}`;
    const existing = typeByUserDate.get(key) ?? new Set<string>();
    existing.add(row.activity_type);
    typeByUserDate.set(key, existing);

    if (row.activity_type) {
      availableTypeSet.add(row.activity_type);
      const users = userIdsByType.get(row.activity_type) ?? new Set<string>();
      users.add(row.user_id);
      userIdsByType.set(row.activity_type, users);
    }
  }

  const availableActivityTypes = Array.from(availableTypeSet).sort((a, b) =>
    a.localeCompare(b)
  );

  const verifiedByUser = new Map<string, boolean>();
  for (const row of verifications) {
    verifiedByUser.set(row.user_id, Boolean(row.verified));
  }

  const filteredProfiles = profiles.filter((profile) => {
    const { calcStreak, startsOnFirstDay } = calculateChallengeStreak(
      profile.id,
      dateKeys,
      durationByUserDate
    );

    if (requireStartDay && !startsOnFirstDay) {
      return false;
    }

    if (hasMinCalcStreak && calcStreak < (minCalcStreak as number)) {
      return false;
    }

    if (hasMaxCalcStreak && calcStreak > (maxCalcStreak as number)) {
      return false;
    }

    if (selectedActivityType) {
      const matchingUsers = userIdsByType.get(selectedActivityType);
      if (!matchingUsers || !matchingUsers.has(profile.id)) {
        return false;
      }
    }

    return true;
  });

  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    const aCalcStreak = calculateChallengeStreak(a.id, dateKeys, durationByUserDate).calcStreak;
    const bCalcStreak = calculateChallengeStreak(b.id, dateKeys, durationByUserDate).calcStreak;
    const aTotalMinutes = calculateWindowTotalMinutes(a.id, dateKeys, durationByUserDate);
    const bTotalMinutes = calculateWindowTotalMinutes(b.id, dateKeys, durationByUserDate);
    const aVerified = verifiedByUser.get(a.id) ?? false;
    const bVerified = verifiedByUser.get(b.id) ?? false;

    const aValue = getSortValue(a, sortBy, aCalcStreak, aTotalMinutes, aVerified, durationByUserDate);
    const bValue = getSortValue(b, sortBy, bCalcStreak, bTotalMinutes, bVerified, durationByUserDate);

    if (aValue === bValue) {
      return a.email.localeCompare(b.email);
    }

    const directionMultiplier = sortDir === "asc" ? 1 : -1;
    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * directionMultiplier;
    }

    return String(aValue).localeCompare(String(bValue)) * directionMultiplier;
  });

  const winnerUsers = sortedProfiles.map((profile) => {
    const { calcStreak } = calculateChallengeStreak(
      profile.id,
      dateKeys,
      durationByUserDate
    );
    const totalMinutes = calculateWindowTotalMinutes(
      profile.id,
      dateKeys,
      durationByUserDate
    );

    return {
      id: profile.id,
      label: profile.username || profile.email,
      email: profile.email,
      calcStreak,
      totalMinutes,
    };
  });

  const baseQuery = new URLSearchParams();
  baseQuery.set("from", from);
  baseQuery.set("to", to);
  if (hasMinCalcStreak) baseQuery.set("minCalcStreak", String(minCalcStreak));
  if (hasMaxCalcStreak) baseQuery.set("maxCalcStreak", String(maxCalcStreak));
  if (requireStartDay) baseQuery.set("requireStartDay", "1");
  if (selectedActivityType) baseQuery.set("activityType", selectedActivityType);

  const sortHref = (column: string) => {
    const query = new URLSearchParams(baseQuery);
    const nextDir = sortBy === column && sortDir === "asc" ? "desc" : "asc";
    query.set("sortBy", column);
    query.set("sortDir", nextDir);
    return `/admin/users?${query.toString()}`;
  };

  const sortIndicator = (column: string) => {
    if (sortBy !== column) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <Card className="border border-gray-300 shadow">
      <CardHeader>
        <CardTitle>Users Activity Table</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="mb-4 grid gap-3 rounded-md border border-gray-300 p-3 md:grid-cols-7">
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
          <div className="space-y-1">
            <label htmlFor="activityType" className="text-xs text-muted-foreground">Activity Type</label>
            <select
              id="activityType"
              name="activityType"
              defaultValue={selectedActivityType}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="">All</option>
              {availableActivityTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="requireStartDay"
                value="1"
                defaultChecked={requireStartDay}
                className="h-4 w-4 rounded border-input"
              />
              Must Start On First Day
            </label>
          </div>
          <div className="flex items-end gap-2">
            <input type="hidden" name="sortBy" value={sortBy} />
            <input type="hidden" name="sortDir" value={sortDir} />
            <button type="submit" className="h-9 rounded-md bg-foreground px-4 text-sm text-background">
              Apply
            </button>
            <a href="/admin/users" className="h-9 rounded-md border border-input px-4 py-2 text-sm">
              Reset
            </a>
          </div>
        </form>
        <RandomWinnerClient
          users={winnerUsers}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-400 text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-semibold"><a href={sortHref("email")}>Email{sortIndicator("email")}</a></th>
                <th className="p-2 text-left font-semibold"><a href={sortHref("username")}>Username{sortIndicator("username")}</a></th>
                <th className="p-2 text-left font-semibold"><a href={sortHref("role")}>Role{sortIndicator("role")}</a></th>
                <th className="p-2 text-left font-semibold"><a href={sortHref("public")}>Public{sortIndicator("public")}</a></th>
                <th className="p-2 text-left font-semibold"><a href={sortHref("verified")}>Verified{sortIndicator("verified")}</a></th>
                <th className="p-2 text-left font-semibold"><a href={sortHref("calcStreak")}>Calc Streak{sortIndicator("calcStreak")}</a></th>
                <th className="p-2 text-left font-semibold"><a href={sortHref("totalMinutes")}>Total Minutes{sortIndicator("totalMinutes")}</a></th>
                <th className="p-2 text-left font-semibold"><a href={sortHref("created")}>Created{sortIndicator("created")}</a></th>
                {dateKeys.map((dateKey) => (
                  <th key={dateKey} title={dateKey} className="p-2 text-left font-semibold whitespace-nowrap">
                    <a href={sortHref(`day:${dateKey}`)}>
                      {formatDayHeader(dateKey)}{sortIndicator(`day:${dateKey}`)}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map((profile) => {
                const { calcStreak } = calculateChallengeStreak(
                  profile.id,
                  dateKeys,
                  durationByUserDate
                );
                const totalMinutes = calculateWindowTotalMinutes(
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
                    <td className="p-2 whitespace-nowrap">
                      <VerifiedToggleClient
                        userId={profile.id}
                        initialVerified={verifiedByUser.get(profile.id) ?? false}
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap font-semibold">{calcStreak}</td>
                    <td className="p-2 whitespace-nowrap">{totalMinutes}m</td>
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
              {sortedProfiles.length === 0 && (
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
