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
};

export default function AdminOptionsClient({
  initialSettings,
}: {
  initialSettings: ChallengeSettings;
}) {
  const [startDate, setStartDate] = useState(initialSettings.start_date);
  const [endDate, setEndDate] = useState(initialSettings.end_date);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update challenge settings" });
      } else {
        setStartDate(data.settings.start_date);
        setEndDate(data.settings.end_date);
        setMessage({ type: "success", text: "Challenge dates updated" });
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

        <Button onClick={handleSave} disabled={saving || !startDate || !endDate || startDate > endDate}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Challenge Dates
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
