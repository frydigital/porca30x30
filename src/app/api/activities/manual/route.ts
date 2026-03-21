import { updateDailyActivity } from "@/lib/activities/utils";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const SAFE_TEXT_REGEX = /^[A-Za-z0-9 -]+$/;
const MAX_ACTIVITY_NAME_LENGTH = 80;
const MAX_NOTES_LENGTH = 240;

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
    return new Date().toISOString().split("T")[0];
  }

  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { activity_date, duration_minutes, activity_type, activity_name, notes } = body;
    const activityDate = typeof activity_date === "string" ? activity_date : "";
    const activityType = typeof activity_type === "string" ? activity_type.trim() : "";
    const activityName = sanitizeText(activity_name);
    const notesText = sanitizeText(notes);
    const numericDuration = Number(duration_minutes);

    // Validate required fields
    if (!activityDate || !activityType || !activityName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
      return NextResponse.json({ error: "Invalid activity date format" }, { status: 400 });
    }

    // Validate duration
    if (!Number.isFinite(numericDuration) || numericDuration <= 0 || numericDuration > 1440) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    if (
      activityName.length > MAX_ACTIVITY_NAME_LENGTH ||
      !SAFE_TEXT_REGEX.test(activityName)
    ) {
      return NextResponse.json(
        { error: "Activity name can only include letters, numbers, spaces, and hyphens" },
        { status: 400 }
      );
    }

    if (
      notesText.length > MAX_NOTES_LENGTH ||
      (notesText.length > 0 && !SAFE_TEXT_REGEX.test(notesText))
    ) {
      return NextResponse.json(
        { error: "Notes can only include letters, numbers, spaces, and hyphens" },
        { status: 400 }
      );
    }

    // Validate date against configured challenge range when available
    const { data: challengeSettings } = await supabase
      .from("challenge_settings")
      .select("start_date, end_date, timezone, activity_types")
      .eq("id", 1)
      .single();

    const configuredTypes = (challengeSettings?.activity_types || [])
      .filter((type: string | null): type is string => typeof type === "string")
      .map((type: string) => type.trim())
      .filter((type: string) => type.length > 0);

    if (configuredTypes.length > 0 && !configuredTypes.includes(activityType)) {
      return NextResponse.json(
        { error: `Activity type must be one of: ${configuredTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const timezone = challengeSettings?.timezone || "UTC";
    const todayInTimezone = getDateInTimezone(timezone);

    if (challengeSettings?.start_date && challengeSettings?.end_date) {
      const challengeStart =
        challengeSettings.start_date <= challengeSettings.end_date
          ? challengeSettings.start_date
          : challengeSettings.end_date;
      const configuredEnd =
        challengeSettings.start_date <= challengeSettings.end_date
          ? challengeSettings.end_date
          : challengeSettings.start_date;
      const challengeEnd = configuredEnd > todayInTimezone ? configuredEnd : todayInTimezone;

      if (activityDate < challengeStart) {
        return NextResponse.json(
          { error: `Challenge does not start until ${challengeStart} (${timezone})` },
          { status: 400 }
        );
      }

      if (activityDate > challengeEnd) {
        return NextResponse.json(
          { error: `Challenge finished on ${challengeEnd} (${timezone})` },
          { status: 400 }
        );
      }

    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoKey = thirtyDaysAgo.toISOString().split("T")[0];

      if (activityDate > todayInTimezone) {
        return NextResponse.json({ error: "Cannot log future activities" }, { status: 400 });
      }
      if (activityDate < thirtyDaysAgoKey) {
        return NextResponse.json({ error: "Cannot log activities older than 30 days" }, { status: 400 });
      }
    }

    // Insert manual activity
    const { data: activity, error: insertError } = await supabase
      .from("activities")
      .insert({
        user_id: user.id,
        source: "manual",
        external_activity_id: null,
        activity_date: activityDate,
        duration_minutes: Math.round(numericDuration),
        activity_type: activityType,
        activity_name: activityName,
        notes: notesText || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting activity:", insertError);
      return NextResponse.json({ error: "Failed to add activity" }, { status: 500 });
    }

    // Update daily activities
    await updateDailyActivity(supabase, user.id, activityDate);

    // Update streak
    await supabase.rpc("update_user_streak", { p_user_id: user.id });

    return NextResponse.json({ success: true, activity });
  } catch (err) {
    console.error("Manual activity error:", err);
    return NextResponse.json({ error: "Failed to add activity" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("id");

    if (!activityId) {
      return NextResponse.json({ error: "Activity ID required" }, { status: 400 });
    }

    // Get activity to check ownership and get date for recalculation
    const { data: activity, error: fetchError } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activityId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Delete the activity
    const { error: deleteError } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
    }

    // Update daily activities for that date
    await updateDailyActivity(supabase, user.id, activity.activity_date);

    // Update streak
    await supabase.rpc("update_user_streak", { p_user_id: user.id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete activity error:", err);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
