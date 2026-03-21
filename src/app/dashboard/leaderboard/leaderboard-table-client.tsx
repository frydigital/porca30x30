"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaderboardEntry } from "@/lib/types";
import { ArrowDownUp, Award, Flame, Medal, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

export type SortableLeaderboardEntry = LeaderboardEntry & {
  rank: number;
  average_minutes: number;
};

type SortKey = "current_streak" | "total_minutes" | "average_minutes" | "total_valid_days";
type SortDirection = "asc" | "desc";

function getRankIcon(rank: number) {
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
}

export default function LeaderboardTableClient({
  leaderboard,
}: {
  leaderboard: SortableLeaderboardEntry[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("current_streak");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedLeaderboard = useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) {
        return a.rank - b.rank;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      }

      return aValue < bValue ? 1 : -1;
    });

    return sorted;
  }, [leaderboard, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  };

  const renderSortHeader = (label: string, key: SortKey, align: "left" | "center" = "center") => (
    <button
      type="button"
      onClick={() => handleSort(key)}
      className={`inline-flex items-center gap-1 font-medium ${align === "center" ? "justify-center" : ""}`}
    >
      {label}
      <ArrowDownUp className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-15 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
        <div className="col-span-1">Rank</div>
        <div className="col-span-4">User</div>
        <div className="col-span-2 text-center">{renderSortHeader("Consecutive Days", "current_streak")}</div>
        <div className="col-span-2 text-center">{renderSortHeader("Total Minutes", "total_minutes")}</div>
        <div className="col-span-3 text-center">{renderSortHeader("Average Minutes", "average_minutes")}</div>
        <div className="col-span-3 text-center">{renderSortHeader("Total Days", "total_valid_days")}</div>
      </div>

      {sortedLeaderboard.map((entry) => (
        <div
          key={entry.user_id}
          className={`grid grid-cols-15 gap-4 px-4 py-3 rounded-lg ${entry.rank <= 3 ? "bg-muted/50" : ""}`}
        >
          <div className="col-span-1 flex items-center">{getRankIcon(entry.rank)}</div>
          <div className="col-span-4 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={entry.avatar_url || undefined} />
              <AvatarFallback>
                {(entry.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium truncate">{entry.username || "Anonymous"}</span>
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
          <div className="col-span-3 flex items-center justify-center">
            <span className="text-muted-foreground">{entry.average_minutes.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          </div>
          <div className="col-span-3 flex items-center justify-center">
            <span className="text-muted-foreground">{entry.total_valid_days}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
