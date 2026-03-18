"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z0-9 _-]+$/;
const MIN_PASSWORD_LENGTH = 10;

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

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState('');
  const [name, setName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = {
    length: password.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/dashboard");
        router.refresh();
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const passwordError = validatePassword(password);

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (normalizedName && (normalizedName.length < 2 || normalizedName.length > 40 || !NAME_REGEX.test(normalizedName))) {
      setError("Name must be 2-40 characters and can only include letters, numbers, spaces, hyphens, and underscores.");
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError("You must accept the terms to create an account.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          name: normalizedName,
          acceptTerms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create account.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md border border-gray-300 shadow">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">30x30</CardTitle>
          <CardDescription>
            Join
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-lg font-medium">Check your email!</h3>
              <p className="text-muted-foreground">
                We&apos;ve sent a confirmation link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Click the link in the email to create your account.
              </p>
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="mt-4"
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-8">
              <div className="space-y-2">
                <Label className="text-muted-foreground" htmlFor="name">Name (optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 shadow-none"
                    minLength={2}
                    maxLength={40}
                    pattern="[A-Za-z0-9 _-]+"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to display your name on the leaderboard
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground" htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 shadow-none"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground" htmlFor="password">Password</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 10 chars, upper/lower/number/symbol"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 shadow-none"
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <p className={passwordChecks.length ? "text-green-600" : "text-muted-foreground"}>At least 10 characters</p>
                  <p className={passwordChecks.uppercase ? "text-green-600" : "text-muted-foreground"}>Contains an uppercase letter</p>
                  <p className={passwordChecks.lowercase ? "text-green-600" : "text-muted-foreground"}>Contains a lowercase letter</p>
                  <p className={passwordChecks.number ? "text-green-600" : "text-muted-foreground"}>Contains a number</p>
                  <p className={passwordChecks.symbol ? "text-green-600" : "text-muted-foreground"}>Contains a symbol</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input"
                  disabled={loading}
                  required
                />
                <Label htmlFor="acceptTerms" className="text-muted-foreground leading-5">
                  I accept the Terms and Privacy Policy.
                </Label>
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password || !acceptTerms}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Already have an account?
                  </span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full shadow-none" asChild>
                <Link href="/login">
                  Sign in instead
                </Link>
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
