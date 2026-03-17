"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type ChallengeSettings = {
  start_date: string;
  end_date: string;
  timezone: string;
  activity_types: string[];
};

export default function AdminOptionsClient({
  initialSettings,
}: {
  initialSettings: ChallengeSettings;
}) {
  const [startDate, setStartDate] = useState(initialSettings.start_date);
  const [endDate, setEndDate] = useState(initialSettings.end_date);
  const [timezone, setTimezone] = useState(initialSettings.timezone);
  const [activityTypesText, setActivityTypesText] = useState(initialSettings.activity_types.join("\n"));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activityTypes = activityTypesText
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/challenge-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          timezone,
          activity_types: activityTypes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update challenge settings" });
      } else {
        setStartDate(data.settings.start_date);
        setEndDate(data.settings.end_date);
        setTimezone(data.settings.timezone);
        setActivityTypesText((data.settings.activity_types || []).join("\n"));
        setMessage({ type: "success", text: "Challenge settings updated" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update challenge settings" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-gray-300 shadow">
      <CardHeader>
        <CardTitle>Admin Options</CardTitle>
        <CardDescription>Set the active challenge start and end dates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="challengeStartDate">Challenge Start Date</Label>
            <Input
              id="challengeStartDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="challengeEndDate">Challenge End Date</Label>
            <Input
              id="challengeEndDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="challengeTimezone">Challenge Timezone</Label>
          <Input
            id="challengeTimezone"
            type="text"
            placeholder="America/New_York"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Use an IANA timezone such as UTC, America/New_York, Europe/London.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="challengeActivityTypes">Valid Activity Types</Label>
          <textarea
            id="challengeActivityTypes"
            value={activityTypesText}
            onChange={(e) => setActivityTypesText(e.target.value)}
            rows={5}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={"Ride\nTrailwork"}
          />
          <p className="text-xs text-muted-foreground">
            Enter one activity type per line. These are enforced for new activity submissions.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !startDate || !endDate || startDate > endDate || !timezone.trim() || activityTypes.length === 0}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Challenge Settings
        </Button>

        {message && (
          <div className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}>
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
