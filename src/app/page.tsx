import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <section className="h-full flex px-4 text-center bg-muted">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-xl font-semibold py-8">Active Challenges</h1>

          {!user && (
            <Card>
              <CardHeader>
                <CardTitle>PORCA</CardTitle>
                <CardDescription>Pemberton BC</CardDescription>
                <CardAction>
                  <Button asChild>
                    <Link href="/signup">Join</Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent></CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Leaderboard */}

    </>
  );
}
