"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2, Mail, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function findCurrentEnv() {
  let envUrl
  const vercel = process.env.VERCEL!

  if (vercel) {
    envUrl = `https://` + process.env.VERCEL_URL
  } else {
    envUrl = window.location.origin
  }

  return envUrl
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const envUrl = findCurrentEnv()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
      emailRedirectTo: `${envUrl}/auth/callback`,
      data: {
        username: username || null,
      },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
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
                We&apos;ve sent a magic link to <strong>{email}</strong>
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
                <Label className="text-muted-foreground" htmlFor="username">Username (optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 shadow-none"
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
                    placeholder="min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 shadow-none"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email}
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
