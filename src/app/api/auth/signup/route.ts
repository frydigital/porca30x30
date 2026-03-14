import { createClient } from "@/lib/supabase/server";
import { resolveSiteUrl } from "@/lib/supabase/site-url";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const { email, password, username } = await request.json();

    if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createClient();
    const siteUrl = resolveSiteUrl(request);

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
            data: {
                username
            }
        },
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
