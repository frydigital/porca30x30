"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, DailyActivity, Streak } from "@/lib/types";
import {
  Check,
  CheckCircle2,
  InfoIcon,
  Loader2,
  PlusCircle,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DashboardClientProps {
  streak: Streak | null;
  dailyActivities: DailyActivity[];
  activities: Activity[];
  challengeStartDate: string;
  challengeEndDate: string;
  manualEntryEndDate: string;
  challengeActivityTypes: string[];
}

export default function DashboardClient({
  dailyActivities,
  activities,
  challengeStartDate,
  challengeEndDate,
  manualEntryEndDate,
  challengeActivityTypes,
}: DashboardClientProps) {
  const router = useRouter();

  const todayKey = new Date().toISOString().split("T")[0];
  const minChallengeDate = challengeStartDate <= challengeEndDate ? challengeStartDate : challengeEndDate;
  const maxChallengeDate = challengeStartDate <= challengeEndDate ? challengeEndDate : challengeStartDate;
  const maxManualDate = manualEntryEndDate < minChallengeDate ? minChallengeDate : manualEntryEndDate;
  const defaultManualDate =
    todayKey < minChallengeDate
      ? minChallengeDate
      : todayKey > maxManualDate
        ? maxManualDate
        : todayKey;

  const activityTypes = challengeActivityTypes.filter((type) => type.trim().length > 0);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState(defaultManualDate);
  const [manualDuration, setManualDuration] = useState("");
  const [manualType, setManualType] = useState(challengeActivityTypes[0] || "Ride");
  const [manualName, setManualName] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<string | null>(null);

  const isManualDateValid =
    /^\d{4}-\d{2}-\d{2}$/.test(manualDate) &&
    manualDate >= minChallengeDate &&
    manualDate <= maxManualDate;
  const isManualTypeValid = activityTypes.includes(manualType);

  const handleManualEntryModal = () => {
    setMessage(null)
    setShowManualEntry(true)
  }

  const handleAddManualActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isManualDateValid) {
      setMessage({
        type: "error",
        text: `Date must be between ${minChallengeDate} and ${maxManualDate}.`,
      });
      return;
    }

    if (!isManualTypeValid) {
      setMessage({
        type: "error",
        text: "Please choose a valid activity type.",
      });
      return;
    }

    setAddingManual(true);
    setMessage(null);

    try {
      const response = await fetch("/api/activities/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_date: manualDate,
          duration_minutes: parseInt(manualDuration),
          activity_type: manualType,
          activity_name: manualName || `${manualType} - ${manualDate}`,
          notes: manualNotes,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Activity added!" });
        setShowManualEntry(false);
        setManualDuration("");
        setManualName("");
        setManualNotes("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add activity" });
    }
    setAddingManual(false);
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    setDeletingActivity(activityId);
    setMessage(null);

    try {
      const response = await fetch(`/api/activities/manual?id=${activityId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Activity deleted" });
        router.refresh();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete activity" });
    }
    setDeletingActivity(null);
  };

  // Generate activity calendar for the configured challenge window
  const generateCalendar = () => {
    const days = [];
    const start = new Date(`${minChallengeDate}T00:00:00Z`).getTime();
    const end = new Date(`${maxChallengeDate}T00:00:00Z`).getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    for (let t = start; t <= end; t += ONE_DAY_MS) {
      const date = new Date(t);
      const dateStr = date.toISOString().split("T")[0];
      const utcDate = new Date(`${dateStr}T00:00:00Z`);

      const activity = dailyActivities.find(a => a.activity_date === dateStr);
      days.push({
        date: dateStr,
        dayOfWeek: utcDate.toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }),
        dayOfMonth: utcDate.getUTCDate(),
        minutes: activity?.total_duration_minutes || 0,
        isValid: activity?.is_valid || false,
      });
    }

    return days;
  };

  const calendar = generateCalendar();


  return (
    <div className="container mx-auto px-4 py-8 space-y-8">



      <Card className="border-none bg-muted shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-2">

            <p className="text-3xl font-bold text-muted-foreground">
              {dailyActivities.filter(a => a.is_valid).length} / {calendar.length}
            </p>
            <p className="text-3xl font-bold text-muted-foreground">
              {dailyActivities.reduce((sum, a) => sum + (a.total_duration_minutes || 0), 0)} min
            </p>

          </div>
        </CardContent>
      </Card>

      {/* Activity Calendar */}

      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-15 gap-1">
        {calendar.map((day, i) => (
          <div
            key={i}
            className={`aspect-square rounded flex flex-col items-center justify-center text-xs ${day.isValid
              ? "bg-green-500 text-white"
              : day.minutes > 0
                ? "bg-yellow-200 dark:bg-yellow-800"
                : "bg-background"
              }`}
            title={`${day.date}: ${day.minutes} min`}
          >
            <span className="font-medium">{day.dayOfMonth}</span>
            {day.isValid && <Check className="w-3 h-3" />}
            {day.minutes > 0 && !day.isValid && <span className="text-[10px]">{day.minutes}m</span>}
          </div>
        ))}
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} >
          {message.type === "error" ? (
            <InfoIcon />
          ) : (
            <CheckCircle2 />
          )}
          <AlertTitle className="uppercase">
            {message.type}
          </AlertTitle>
          <AlertDescription>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-dashed border-2 border-gray-300 bg-muted shadow-none">
        <CardContent className="p-0">
          <Button variant="ghost" className="w-full h-full p-8" onClick={() => handleManualEntryModal()}>
            <div className="flex flex-col items-center justify-center text-2xl font-semibold text-gray-500">
              <PlusCircle className="w-8! h-8!" />
              Add Activity
            </div>
          </Button>
        </CardContent>
      </Card>

      {showManualEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg border border-gray-300 shadow-xl">
            <CardHeader>
              <CardTitle className="font-semibold">Add Activity</CardTitle>
              <CardDescription>Record your daily activities.</CardDescription>
              {message && message.type === "error" && (
                <Alert variant="destructive">
                  <InfoIcon />
                  <AlertTitle className="uppercase">
                    Error Submitting Activity
                  </AlertTitle>
                  <AlertDescription>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddManualActivity} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualDate">Date</Label>
                    <Input
                      id="manualDate"
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      min={minChallengeDate}
                      max={maxManualDate}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualDuration">Duration (minutes)</Label>
                    <Input
                      id="manualDuration"
                      type="number"
                      placeholder="30"
                      value={manualDuration}
                      onChange={(e) => setManualDuration(e.target.value)}
                      min="1"
                      max="1440"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualType">Activity Type</Label>
                    <select
                      id="manualType"
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value)}
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {activityTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualName">Activity Name</Label>
                    <Input
                      id="manualName"
                      type="text"
                      placeholder="Morning ride"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualNotes">Notes (optional)</Label>
                  <Input
                    id="manualNotes"
                    type="text"
                    placeholder="Add any notes..."
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowManualEntry(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addingManual || !manualDuration || !isManualDateValid || !isManualTypeValid}>
                    {addingManual && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Activity
                  </Button>
                </div>
              </form>
            </CardContent>

          </Card>
        </div>
      )}

      {activities.length > 0 ? (
        <div className="space-y-2">
          {activities.slice(0, 10).map((activity) => (
            <Card className="w-full border border-gray-300 shadow"
              key={activity.id}
            >
              <CardContent className="flex items-center justify-between p-8">
                <p className="font-medium">{activity.activity_name}</p>
                <p className="text-sm text-muted-foreground">
                  {activity.activity_date} • {activity.duration_minutes} min • {activity.activity_type}
                </p>
                {activity.source === 'manual' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteActivity(activity.id)}
                    disabled={deletingActivity === activity.id}
                  >
                    {deletingActivity === activity.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-destructive" />
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          No activities yet.
        </p>
      )}
    </div>
  );
}
