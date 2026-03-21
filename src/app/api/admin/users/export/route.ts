import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

type ProfileRow = {
  id: string;
  email: string;
  username: string | null;
  role: string;
  is_public: boolean;
  created_at: string;
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

function normalizeSortDirection(value: string | null) {
  return value === "asc" ? "asc" : "desc";
}

function getSortValue(
  profile: ProfileRow,
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

function csvEscape(value: string | number | boolean | null | undefined) {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

async function requireAdminUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { supabase, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, error: null };
}

export async function GET(request: Request) {
  const adminContext = await requireAdminUser();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { supabase } = adminContext;
  const { searchParams } = new URL(request.url);

  const { data: challengeSettings } = await supabase
    .from("challenge_settings")
    .select("start_date, end_date")
    .eq("id", 1)
    .single();

  const defaults = getDefaultDateRangeFallback();
  const defaultFrom = challengeSettings?.start_date ?? defaults.from;
  const defaultTo = challengeSettings?.end_date ?? defaults.to;

  const rawFrom = searchParams.get("from") || defaultFrom;
  const rawTo = searchParams.get("to") || defaultTo;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;

  const minCalcStreakRaw = searchParams.get("minCalcStreak");
  const maxCalcStreakRaw = searchParams.get("maxCalcStreak");
  const minCalcStreak = minCalcStreakRaw ? Number(minCalcStreakRaw) : undefined;
  const maxCalcStreak = maxCalcStreakRaw ? Number(maxCalcStreakRaw) : undefined;
  const hasMinCalcStreak = Number.isFinite(minCalcStreak);
  const hasMaxCalcStreak = Number.isFinite(maxCalcStreak);

  const requireStartDay = searchParams.get("requireStartDay") === "1";
  const selectedActivityType = (searchParams.get("activityType") ?? "").trim();
  const verifiedFilter = searchParams.get("verified") === "1" || searchParams.get("verified") === "0"
    ? (searchParams.get("verified") as "1" | "0")
    : "";
  const sortBy = searchParams.get("sortBy") ?? "created";
  const sortDir = normalizeSortDirection(searchParams.get("sortDir"));

  const dateKeys = getDateKeysInRange(from, to);
  if (dateKeys.length === 0) {
    dateKeys.push(from);
  }

  const startDate = dateKeys[0];
  const endDate = dateKeys[dateKeys.length - 1];

  const [profilesResult, dailyResult, activityTypesResult, verificationsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, username, role, is_public, created_at")
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

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const dailyActivities = (dailyResult.data ?? []) as DailyActivityRow[];
  const activityTypes = (activityTypesResult.data ?? []) as ActivityTypeRow[];
  const verifications = (verificationsResult.data ?? []) as VerificationRow[];

  const durationByUserDate = new Map<string, number>();
  for (const row of dailyActivities) {
    durationByUserDate.set(`${row.user_id}|${row.activity_date}`, row.total_duration_minutes ?? 0);
  }

  const typeByUserDate = new Map<string, Set<string>>();
  const userIdsByType = new Map<string, Set<string>>();
  for (const row of activityTypes) {
    const key = `${row.user_id}|${row.activity_date}`;
    const existing = typeByUserDate.get(key) ?? new Set<string>();
    existing.add(row.activity_type);
    typeByUserDate.set(key, existing);

    if (row.activity_type) {
      const users = userIdsByType.get(row.activity_type) ?? new Set<string>();
      users.add(row.user_id);
      userIdsByType.set(row.activity_type, users);
    }
  }

  const verifiedByUser = new Map<string, boolean>();
  for (const row of verifications) {
    verifiedByUser.set(row.user_id, Boolean(row.verified));
  }

  const filteredProfiles = profiles.filter((profile) => {
    const { calcStreak, startsOnFirstDay } = calculateChallengeStreak(profile.id, dateKeys, durationByUserDate);

    if (requireStartDay && !startsOnFirstDay) return false;
    if (hasMinCalcStreak && calcStreak < (minCalcStreak as number)) return false;
    if (hasMaxCalcStreak && calcStreak > (maxCalcStreak as number)) return false;

    if (selectedActivityType) {
      const matchingUsers = userIdsByType.get(selectedActivityType);
      if (!matchingUsers || !matchingUsers.has(profile.id)) return false;
    }

    const isVerified = verifiedByUser.get(profile.id) ?? false;
    if (verifiedFilter === "1" && !isVerified) return false;
    if (verifiedFilter === "0" && isVerified) return false;

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

  const header = [
    "email",
    "username",
    "role",
    "public",
    "verified",
    "calc_streak",
    "total_minutes",
    "created",
    ...dateKeys,
  ];

  const rows = sortedProfiles.map((profile) => {
    const { calcStreak } = calculateChallengeStreak(profile.id, dateKeys, durationByUserDate);
    const totalMinutes = calculateWindowTotalMinutes(profile.id, dateKeys, durationByUserDate);
    const verified = verifiedByUser.get(profile.id) ?? false;

    const base = [
      profile.email,
      profile.username ?? "",
      profile.role,
      profile.is_public,
      verified,
      calcStreak,
      totalMinutes,
      new Date(profile.created_at).toLocaleDateString("en-US"),
    ];

    const dayValues = dateKeys.map((dateKey) => {
      const key = `${profile.id}|${dateKey}`;
      const minutes = durationByUserDate.get(key) ?? 0;
      const types = typeByUserDate.get(key);
      const typeText = types ? Array.from(types).join("|") : "";
      return typeText ? `${minutes}m ${typeText}` : `${minutes}m`;
    });

    return [...base, ...dayValues];
  });

  const csvLines = [
    header.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];

  const filename = `admin-users-${from}-to-${to}.csv`;

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
