"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setLoading(false);
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md border border-gray-300 shadow">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">30x30</CardTitle>
          <CardDescription>
            Login
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
                Click the link in the email to sign in.
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
            <form onSubmit={handleLogin} className="space-y-8">
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
                    Logging In...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    New here?
                  </span>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full shadow-none" asChild>
                <Link href="/signup">
                  Create an account
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
