"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

type Props = {
  hasActiveFilters: boolean;
  from: string;
  to: string;
  minCalcStreak: string;
  maxCalcStreak: string;
  activityType: string;
  verified: string;
  requireStartDay: boolean;
  sortBy: string;
  sortDir: string;
  availableActivityTypes: string[];
};

export default function FiltersModalClient({
  hasActiveFilters,
  from,
  to,
  minCalcStreak,
  maxCalcStreak,
  activityType,
  verified,
  requireStartDay,
  sortBy,
  sortDir,
  availableActivityTypes,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={hasActiveFilters ? "default" : "outline"} onClick={() => setOpen(true)}>
        Filters{hasActiveFilters ? " (Active)" : ""}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-md border border-gray-300 bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
              <h2 className="text-sm font-semibold">Filter Users</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-input px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <form method="get" action="/admin/users" className="grid gap-3 p-4 md:grid-cols-3">
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
                  defaultValue={minCalcStreak}
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
                  defaultValue={maxCalcStreak}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="activityType" className="text-xs text-muted-foreground">Activity Type</label>
                <select
                  id="activityType"
                  name="activityType"
                  defaultValue={activityType}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  {availableActivityTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="verified" className="text-xs text-muted-foreground">Verified</label>
                <select
                  id="verified"
                  name="verified"
                  defaultValue={verified}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  <option value="1">Verified</option>
                  <option value="0">Unverified</option>
                </select>
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <input
                  id="requireStartDay"
                  type="checkbox"
                  name="requireStartDay"
                  value="1"
                  defaultChecked={requireStartDay}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="requireStartDay" className="text-sm">Must Start On First Day</label>
              </div>

              <input type="hidden" name="sortBy" value={sortBy} />
              <input type="hidden" name="sortDir" value={sortDir} />

              <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                <a href="/admin/users" className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm">
                  Reset
                </a>
                <Button type="submit">Apply</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
