import { createClient } from "@/lib/supabase/server";
import { resolveSiteUrl } from "@/lib/supabase/site-url";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z0-9 _-]+$/;
const MIN_PASSWORD_LENGTH = 10;

function sanitizeText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function validatePassword(password: string) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return "Password must include uppercase, lowercase, number, and special character.";
    }

    return null;
}

export async function POST(request: Request) {
    const body = await request.json();
    const email = sanitizeText(body?.email).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    const name = sanitizeText(body?.name);
    const acceptTerms = body?.acceptTerms === true;

    if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (name && (name.length < 2 || name.length > 40 || !NAME_REGEX.test(name))) {
        return NextResponse.json(
            { error: "Name must be 2-40 characters and can only include letters, numbers, spaces, hyphens, and underscores." },
            { status: 400 }
        );
    }

    if (!acceptTerms) {
        return NextResponse.json({ error: "You must accept the terms to create an account." }, { status: 400 });
    }

    const supabase = await createClient();
    const siteUrl = resolveSiteUrl(request);

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
            data: {
                username: name || null
            }
        },
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
