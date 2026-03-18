import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardEntry } from "@/lib/types";
import { Award, Flame, Medal, Trophy } from "lucide-react";
import Link from "next/link";

type PublicLeaderboardRow = Omit<LeaderboardEntry, "current_streak">;

type DailyValidityRow = {
  user_id: string;
  activity_date: string;
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

  const [leaderboardBaseResult, validDaysResult] = await Promise.all([
    supabase
      .from("public_leaderboard")
      .select("user_id, username, avatar_url, total_minutes, total_valid_days")
      .limit(500),
    supabase
      .from("daily_activities")
      .select("user_id, activity_date")
      .eq("is_valid", true)
      .gte("activity_date", challengeStartDate)
      .lte("activity_date", streakWindowEnd),
  ]);

  const leaderboardBase = (leaderboardBaseResult.data ?? []) as PublicLeaderboardRow[];
  const validDays = (validDaysResult.data ?? []) as DailyValidityRow[];

  const validDatesByUser = new Map<string, Set<string>>();
  for (const row of validDays) {
    const existing = validDatesByUser.get(row.user_id) ?? new Set<string>();
    existing.add(row.activity_date);
    validDatesByUser.set(row.user_id, existing);
  }

  const leaderboard: LeaderboardEntry[] = leaderboardBase
    .map((entry) => ({
      ...entry,
      current_streak: calculateStreakFromChallengeStart(
        validDatesByUser.get(entry.user_id) ?? new Set<string>(),
        dateKeys
      ),
    }))
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">{rank}</span>;
    }
  };
    return(
        <section className="py-12 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
      <Card className="w-full border border-gray-300 shadow">
            <CardContent>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-5">User</div>
                    <div className="col-span-2 text-center">Consecutive</div>
                    <div className="col-span-2 text-center">Minutes</div>
                    <div className="col-span-2 text-center">Days</div>
                  </div>
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg ${
                        index < 3 ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="col-span-1 flex items-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <div className="col-span-5 flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback>
                            {(entry.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">
                          {entry.username || "Anonymous"}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="font-bold">{entry.current_streak}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-muted-foreground">{entry.total_minutes.toLocaleString()}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-muted-foreground">{entry.total_valid_days}</span>
                      </div>
                    </div>
                  ))}
                </div>
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