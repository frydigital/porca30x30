"use client";

import { useState } from "react";

type WinnerUser = {
  id: string;
  label: string;
  email: string;
  calcStreak: number;
};

export default function RandomWinnerClient({ users }: { users: WinnerUser[] }) {
  const [winner, setWinner] = useState<WinnerUser | null>(null);

  const pickWinner = () => {
    if (users.length === 0) {
      setWinner(null);
      return;
    }

    const randomIndex = Math.floor(Math.random() * users.length);
    setWinner(users[randomIndex]);
  };

  return (
    <div className="mb-4 rounded-md border border-gray-300 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={pickWinner}
          className="h-9 rounded-md bg-foreground px-4 text-sm text-background"
          disabled={users.length === 0}
        >
          Select Random Winner From Selection
        </button>
        <span className="text-sm text-muted-foreground">
          {users.length} eligible user{users.length === 1 ? "" : "s"}
        </span>
      </div>
      {winner && (
        <div className="mt-2 rounded-md bg-muted/50 p-2 text-sm">
          <p>
            Winner: <span className="font-semibold">{winner.label}</span>
          </p>
          <p className="text-muted-foreground">Email: {winner.email}</p>
          <p className="text-muted-foreground">Calc Streak: {winner.calcStreak}</p>
        </div>
      )}
    </div>
  );
}
