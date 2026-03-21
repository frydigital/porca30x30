import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardEntry } from "@/lib/types";
import Link from "next/link";
import LeaderboardTableClient, { SortableLeaderboardEntry } from "./leaderboard-table-client";

type PublicProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type DailyValidityRow = {
  user_id: string;
  activity_date: string;
  total_duration_minutes: number;
  is_valid: boolean;
};

function toDateKey(date: Date) {
  return date.toISOString().split("T")[0];
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

function getDateKeysInRange(from: string, to: string) {
  if (from > to) {
    return [];
  }

  const keys: string[] = [];
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (let t = start; t <= end; t += ONE_DAY_MS) {
    keys.push(new Date(t).toISOString().split("T")[0]);
  }

  return keys;
}

function calculateStreakFromChallengeStart(validDates: Set<string>, dateKeys: string[]) {
  let streak = 0;

  for (const dateKey of dateKeys) {
    if (!validDates.has(dateKey)) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export default async function Leaderboard() {
  const supabase = await createClient();
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  const { data: challengeSettings } = await supabase
    .from("challenge_settings")
    .select("start_date, end_date, timezone")
    .eq("id", 1)
    .single();

  const defaults = getDefaultChallengeRange();
  const challengeStartDate = challengeSettings?.start_date ?? defaults.startDate;
  const configuredChallengeEnd = challengeSettings?.end_date ?? defaults.endDate;
  const challengeTimezone = challengeSettings?.timezone ?? "UTC";
  const timezoneToday = getDateInTimezone(challengeTimezone);
  const streakWindowEnd = configuredChallengeEnd < timezoneToday
    ? configuredChallengeEnd
    : timezoneToday;
  const dateKeys = getDateKeysInRange(challengeStartDate, streakWindowEnd);

  const [profilesResult, dailyRowsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("is_public", true)
      .limit(500),
    supabase
      .from("daily_activities")
      .select("user_id, activity_date, total_duration_minutes, is_valid")
      .gte("activity_date", challengeStartDate)
      .lte("activity_date", streakWindowEnd),
  ]);

  const profiles = (profilesResult.data ?? []) as PublicProfileRow[];
  const dailyRows = (dailyRowsResult.data ?? []) as DailyValidityRow[];

  const statsByUser = new Map<string, {
    totalMinutes: number;
    totalValidDays: number;
    validDates: Set<string>;
  }>();

  for (const row of dailyRows) {
    const existing = statsByUser.get(row.user_id) ?? {
      totalMinutes: 0,
      totalValidDays: 0,
      validDates: new Set<string>(),
    };

    if (row.is_valid) {
      existing.totalMinutes += row.total_duration_minutes ?? 0;
      existing.totalValidDays += 1;
      existing.validDates.add(row.activity_date);
    }

    statsByUser.set(row.user_id, existing);
  }

  const rankedLeaderboard: LeaderboardEntry[] = profiles
    .map((profile) => {
      const stats = statsByUser.get(profile.id) ?? {
        totalMinutes: 0,
        totalValidDays: 0,
        validDates: new Set<string>(),
      };

      return {
      user_id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      total_minutes: stats.totalMinutes,
      total_valid_days: stats.totalValidDays,
      current_streak: calculateStreakFromChallengeStart(
        stats.validDates,
        dateKeys
      ),
      };
    })
    .sort((a, b) => {
      if (b.current_streak !== a.current_streak) {
        return b.current_streak - a.current_streak;
      }

      if (b.total_minutes !== a.total_minutes) {
        return b.total_minutes - a.total_minutes;
      }

      return b.total_valid_days - a.total_valid_days;
    })
    .slice(0, 200);

  const challengeWindowDays = Math.max(dateKeys.length, 1);
  const leaderboard: SortableLeaderboardEntry[] = rankedLeaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    average_minutes: Number((entry.total_minutes / challengeWindowDays).toFixed(1)),
  }));

    return(
        <section className="py-12 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
      <Card className="w-full border border-gray-300 shadow">
            <CardContent>
              {leaderboard.length > 0 ? (
                <LeaderboardTableClient leaderboard={leaderboard} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No participants yet. Be the first to join!
                  </p>
                  {!user && (
                    <Button asChild>
                      <Link href="/login">Get Started</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          
        </div>
      </section>      
    )
}