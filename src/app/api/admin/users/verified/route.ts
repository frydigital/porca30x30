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

export async function PUT(request: Request) {
  const adminContext = await requireAdminUser();
  if (adminContext.error) {
    return adminContext.error;
  }

  const { supabase, user } = adminContext;

  try {
    const body = await request.json();
    const userId = typeof body.user_id === "string" ? body.user_id : "";
    const verified = body.verified === true;

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("participant_verifications")
      .upsert(
        {
          user_id: userId,
          verified,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
