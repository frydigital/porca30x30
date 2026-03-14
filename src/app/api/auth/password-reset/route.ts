import { createClient } from "@/lib/supabase/server";
import { resolveSiteUrl } from "@/lib/supabase/site-url";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { email } = await request.json();

    if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const siteUrl = resolveSiteUrl(request);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
