"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type WinnerUser = {
  id: string;
  label: string;
  email: string;
  calcStreak: number;
  totalMinutes?: number;
};

export default function RandomWinnerClient({ users }: { users: WinnerUser[] }) {
  const [open, setOpen] = useState(false);
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
    <>
      <Button type="button" onClick={() => setOpen(true)} disabled={users.length === 0}>
        Random Winner
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-md border border-gray-300 bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
              <h2 className="text-sm font-semibold">Random Winner Selector</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-input px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="text-sm text-muted-foreground">
                {users.length} eligible user{users.length === 1 ? "" : "s"}
              </div>

              <Button type="button" onClick={pickWinner} disabled={users.length === 0}>
                Select Random Winner From Selection
              </Button>

              {winner && (
                <div className="rounded-md bg-muted/50 p-2 text-sm">
                  <p>
                    Winner: <span className="font-semibold">{winner.label}</span>
                  </p>
                  <p className="text-muted-foreground">Email: {winner.email}</p>
                  <p className="text-muted-foreground">Calc Streak: {winner.calcStreak}</p>
                  {typeof winner.totalMinutes === "number" && (
                    <p className="text-muted-foreground">Total Minutes: {winner.totalMinutes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
