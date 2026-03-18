import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdminUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { supabase, user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user, error: null };
}

export async function GET() {
  const adminContext = await requireAdminUser();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { supabase } = adminContext;

  const { data, error } = await supabase
    .from("challenge_settings")
    .select("start_date, end_date, timezone, activity_types")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(request: Request) {
  const adminContext = await requireAdminUser();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { supabase, user } = adminContext;

  try {
    const body = await request.json();
    const startDate = body.start_date as string | undefined;
    const endDate = body.end_date as string | undefined;
    const timezone = body.timezone as string | undefined;
    const activityTypes = Array.isArray(body.activity_types)
      ? body.activity_types
          .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
          .filter((item: string) => item.length > 0)
      : [];

    if (!startDate || !endDate || !timezone) {
      return NextResponse.json({ error: "Start date, end date, and timezone are required" }, { status: 400 });
    }

    if (activityTypes.length === 0) {
      return NextResponse.json({ error: "At least one activity type is required" }, { status: 400 });
    }

    const hasInvalidTimezone = (() => {
      try {
        Intl.DateTimeFormat("en-US", { timeZone: timezone });
        return false;
      } catch {
        return true;
      }
    })();

    if (hasInvalidTimezone) {
      return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: "Start date must be before or equal to end date" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("challenge_settings")
      .update({
        start_date: startDate,
        end_date: endDate,
        timezone,
        activity_types: Array.from(new Set(activityTypes)),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("start_date, end_date, timezone, activity_types")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data, success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
